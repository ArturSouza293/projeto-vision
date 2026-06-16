"""IRPF — golden verificado (tabela) + estrutural (redutor modelado)."""

from __future__ import annotations

from datetime import date
from decimal import Decimal

from hypothesis import given
from hypothesis import strategies as st

from core.money import brl
from params.loader import load_params
from tax import irpf

P = load_params("irpf", date(2026, 6, 1)).dados


def test_faixa_isenta() -> None:
    assert irpf.irpf_mensal(Decimal("2000"), P) == 0


def test_tabela_crua_base_3000() -> None:
    # tabela progressiva PURA (sem redutor): 3000*15% − 394,16 = 55,84
    faixas = P["mensal"]["faixas"]
    assert brl(irpf._imposto_tabela(Decimal("3000"), faixas)) == Decimal("55.84")
    # com o redutor da Lei 15.270, renda ≤ 5.000 é EFETIVAMENTE isenta:
    assert irpf.irpf_mensal(Decimal("3000"), P) == 0


def test_isencao_efetiva_ate_5000() -> None:
    assert irpf.irpf_mensal(Decimal("4500"), P) == 0
    assert irpf.irpf_mensal(Decimal("5000"), P) == 0


def test_tabela_cheia_acima_de_7350() -> None:
    # 7350 (fim do redutor): tabela cheia 7350*27,5% − 908,73 = 1112,52
    assert brl(irpf.irpf_mensal(Decimal("7350"), P)) == Decimal("1112.52")
    # 10000: 10000*27,5% − 908,73 = 1841,27
    assert brl(irpf.irpf_mensal(Decimal("10000"), P)) == Decimal("1841.27")


def test_redutor_continuo_e_monotonico() -> None:
    # estrutural (modelo do redutor): 0 no piso, cresce, cheio no topo.
    bases = ["5001", "5500", "6000", "6800", "7350"]
    vals = [irpf.irpf_mensal(Decimal(b), P) for b in bases]
    assert all(a <= b for a, b in zip(vals, vals[1:], strict=False))  # não-decrescente
    assert Decimal(0) <= vals[0] <= Decimal(1)  # logo acima de 5.000: ~0 (contínuo)
    # na faixa de transição, fica entre 0 e a tabela cheia
    cheio_6000 = Decimal("6000") * Decimal("0.275") - Decimal("908.73")
    assert Decimal(0) < irpf.irpf_mensal(Decimal("6000"), P) < cheio_6000


def test_anual_e_12x_mensal() -> None:
    assert irpf.irpf_anual(Decimal("120000"), P) == irpf.irpf_mensal(Decimal("10000"), P) * 12


@given(st.integers(min_value=0, max_value=200000).map(Decimal))
def test_ir_nunca_negativo(base: Decimal) -> None:
    assert irpf.irpf_mensal(base, P) >= 0
