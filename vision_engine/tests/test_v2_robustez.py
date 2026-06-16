"""V2 — robustez: erro estruturado, validação de domínio, produto, params vivos.

Cobre os achados da auditoria (P0–P5): nada de exceção crua / 500 opaco, nada
de número fabricado em silêncio, nada de produto/param mal classificado.
"""

from __future__ import annotations

from datetime import date
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient

from api import app
from core import cashflow as cf
from core.errors import OutOfRange, ParamMissing
from core.money import D
from params.loader import load_params
from risk import montecarlo as mc
from tax import ir_investimentos as iri
from tax import irpf
from tax import previdencia as prev

client = TestClient(app)


# ---------------------------------------------------------------- P0: erro estruturado
def test_data_fora_cobertura_vira_422_estruturado() -> None:
    """irpf@2018 (antes do YAML) → 422 PARAM_MISSING, não 500 opaco (detail:null)."""
    r = client.post(
        "/call/irpf_mensal",
        json={"payload": {"base": "10000", "data_referencia": "2018-01-01"}},
    )
    assert r.status_code == 422
    assert r.json()["detail"]["erro"] == "PARAM_MISSING"
    assert "2026-01-01" in r.json()["detail"]["detalhe"]


def test_load_params_passado_levanta_param_missing() -> None:
    with pytest.raises(ParamMissing):
        load_params("irpf", date(2018, 1, 1))


# ---------------------------------------------------------------- Tema D: não-finitos
def test_d_rejeita_nan_inf_e_lixo() -> None:
    for ruim in ("NaN", "Infinity", "inf", "-Infinity", "abc"):
        with pytest.raises(OutOfRange):
            D(ruim)


# ---------------------------------------------------------------- Tema B: fail-silent
def test_irr_vazio_e_mesmo_sinal_erram() -> None:
    with pytest.raises(OutOfRange):
        cf.irr([])
    with pytest.raises(OutOfRange):
        cf.irr(["-1000", "-100"])  # só saídas → não fabricar -99,99%


def test_mtir_sem_entradas_erra() -> None:
    with pytest.raises(OutOfRange):
        cf.mtir(["-1000", "-100"], "0.1", "0.08")


def test_irr_convencional_ainda_funciona() -> None:
    tir = cf.irr(["-1000", "600", "600"])
    assert Decimal("0.12") < tir < Decimal("0.14")


# ---------------------------------------------------------------- Tema C: divisões
def test_amortizacao_n_zero_erra() -> None:
    from core import amortizacao as am

    for f in (am.price, am.sac, am.americano):
        with pytest.raises(OutOfRange):
            f("1000", "0.01", 0)


def test_aporte_meses_zero_erra() -> None:
    from planning.objetivos import aporte_necessario_mensal

    with pytest.raises(OutOfRange):
        aporte_necessario_mensal(Decimal("1000000"), Decimal("0"), Decimal("0.04"), 0)


# ---------------------------------------------------------------- P2: produto
def test_classificar_produto() -> None:
    P = load_params("ir_investimentos", date(2026, 6, 1)).dados
    assert iri.classificar_produto("lci", P) == "isento"
    assert iri.classificar_produto("  CDB ", P) == "tributavel"
    for ruim in ("FOOBAR", "", "CRA2"):
        with pytest.raises(OutOfRange):
            iri.classificar_produto(ruim, P)


def test_tool_produto_desconhecido_422() -> None:
    r = client.post(
        "/call/ir_renda_fixa",
        json={"payload": {"produto": "FOOBAR", "rendimento": "1000",
                          "dias_corridos": 400, "data_referencia": "2026-06-16"}},
    )
    assert r.status_code == 422
    assert r.json()["detail"]["erro"] == "OUT_OF_RANGE"


def test_tool_isento_ainda_zero() -> None:
    r = client.post(
        "/call/ir_renda_fixa",
        json={"payload": {"produto": "LCI", "rendimento": "1000",
                          "dias_corridos": 400, "data_referencia": "2026-06-16"}},
    )
    assert r.status_code == 200
    assert r.json()["envelope"]["valor"] == "0.00"


# ---------------------------------------------------------------- P4: params vivos
def test_pgbl_deducao_12pct() -> None:
    P = load_params("previdencia", date(2026, 6, 1)).dados
    # contribuição acima do teto → limitada a 12% da renda bruta
    assert prev.base_deduzivel_pgbl(Decimal("10000"), Decimal("50000"), P) == Decimal("6000.00")
    # contribuição abaixo do teto → integral
    assert prev.base_deduzivel_pgbl(Decimal("3000"), Decimal("50000"), P) == Decimal("3000")


def test_previdencia_progressivo_usa_irpf() -> None:
    Pirpf = load_params("irpf", date(2026, 6, 1)).dados
    Pprev = load_params("previdencia", date(2026, 6, 1)).dados
    # IRRF na fonte 15%
    assert prev.irrf_fonte_progressivo(Decimal("10000"), Pprev) == Decimal("1500.0")
    # progressivo = tabela IRPF do benefício
    assert prev.ir_previdencia_progressivo(Decimal("10000"), Pirpf) == irpf.irpf_mensal(
        Decimal("10000"), Pirpf
    )


# ---------------------------------------------------------------- P1: tax guardas
def test_irpf_base_negativa_erra() -> None:
    P = load_params("irpf", date(2026, 6, 1)).dados
    with pytest.raises(OutOfRange):
        irpf.irpf_mensal(Decimal("-100"), P)


def test_irpf_envelope_traz_flag_calibracao() -> None:
    r = client.post(
        "/call/irpf_mensal",
        json={"payload": {"base": "6000", "data_referencia": "2026-06-16"}},
    )
    assert r.json()["envelope"]["premissas"]["redutor_calibrado"] == "false"


# ---------------------------------------------------------------- P5: Monte Carlo
def test_montecarlo_guardas() -> None:
    base = dict(vp_inicial="1000", aporte_mensal="100", mu_real_aa="0.05",
                sigma_aa="0.1", seed=42)
    with pytest.raises(OutOfRange):
        mc.simular_acumulacao(anos=0, **base)  # type: ignore[arg-type]
    with pytest.raises(OutOfRange):
        mc.simular_acumulacao(anos=1, n_simulacoes=0, **base)  # type: ignore[arg-type]
    with pytest.raises(OutOfRange):
        mc.simular_acumulacao(vp_inicial="1000", aporte_mensal="100", mu_real_aa="-1.5",
                              sigma_aa="0.1", anos=1, seed=42)


def test_montecarlo_valido_prob_quantizada() -> None:
    res = mc.simular_acumulacao(
        vp_inicial="1000", aporte_mensal="100", mu_real_aa="0.05", sigma_aa="0.1",
        anos=1, seed=42, n_simulacoes=200, meta="2000",
    )
    assert res.prob_atingir_meta is not None
    # quantizada a 4 casas (não vaza 28 dígitos)
    exp = res.prob_atingir_meta.as_tuple().exponent
    assert isinstance(exp, int) and exp >= -4
    assert res.p5 <= res.p50 <= res.p95
