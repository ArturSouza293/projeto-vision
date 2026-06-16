"""Cobertura extra — funções menos exercitadas de tvm/cashflow/previdência."""

from __future__ import annotations

from datetime import date
from decimal import Decimal

import pytest

from core import cashflow as cf
from core import tvm
from params.loader import load_params
from tax import previdencia as prev


def test_vf_simples() -> None:
    # juros simples: 1000 * (1 + 1% * 12) = 1120
    assert tvm.vf_simples("1000", "0.01", 12) == Decimal("1120.00")


def test_taxa_equivalente_anual_para_mensal() -> None:
    diff = abs(tvm.taxa_equivalente("0.12", 1, 12) - tvm.anual_para_mensal("0.12"))
    assert diff <= Decimal("1e-18")


def test_fv_growing_annuity() -> None:
    # VF_growing = VP_growing * (1+i)^n (consistência interna)
    pv = tvm.pv_growing_annuity("100", "0.05", "0.03", 10)
    fv = tvm.fv_growing_annuity("100", "0.05", "0.03", 10)
    assert abs(fv - pv * (Decimal("1.05") ** 10)) <= Decimal("1e-6")


def test_perpetuidade_erro_i_menor_que_g() -> None:
    with pytest.raises(ValueError, match="i > g"):
        tvm.perpetuidade("100", "0.03", "0.05")


def test_mtir_sem_saidas_erro() -> None:
    with pytest.raises(ValueError):
        cf.mtir(["100", "200"], "0.10", "0.08")


def test_payback_nunca_recupera() -> None:
    assert cf.payback_simples(["-1000", "100", "100"]) is None


def test_payback_descontado() -> None:
    pb = cf.payback_descontado(["-1000", "600", "600"], "0.10")
    assert pb is not None and pb > 0


def test_prev_base_tipo_invalido() -> None:
    with pytest.raises(ValueError, match="PGBL|VGBL"):
        prev.base_tributavel(Decimal("1000"), Decimal("100"), "OUTRO")  # type: ignore[arg-type]


def test_prev_base_zero_ir_zero() -> None:
    P = load_params("previdencia", date(2026, 6, 1)).dados
    assert prev.ir_previdencia_regressivo(Decimal("0"), Decimal("0"), 11, "VGBL", P) == 0
