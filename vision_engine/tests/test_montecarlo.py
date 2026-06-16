"""Monte Carlo — determinismo (seed) + invariantes de distribuição."""

from __future__ import annotations

from decimal import Decimal

from risk.montecarlo import simular_acumulacao


def test_determinismo_mesma_seed() -> None:
    kw = dict(vp_inicial="10000", aporte_mensal="1000", mu_real_aa="0.05", sigma_aa="0.12", anos=10)
    a = simular_acumulacao(**kw, seed=42, n_simulacoes=1500)  # type: ignore[arg-type]
    b = simular_acumulacao(**kw, seed=42, n_simulacoes=1500)  # type: ignore[arg-type]
    assert (a.p5, a.p50, a.p95, a.media) == (b.p5, b.p50, b.p95, b.media)


def test_seeds_diferentes_divergem() -> None:
    kw = dict(vp_inicial="10000", aporte_mensal="1000", mu_real_aa="0.05", sigma_aa="0.12", anos=10)
    a = simular_acumulacao(**kw, seed=1, n_simulacoes=1500)  # type: ignore[arg-type]
    b = simular_acumulacao(**kw, seed=2, n_simulacoes=1500)  # type: ignore[arg-type]
    assert a.media != b.media


def test_percentis_ordenados() -> None:
    res = simular_acumulacao("0", "1000", "0.06", "0.10", 15, seed=7, n_simulacoes=2000)
    assert res.p5 <= res.p50 <= res.p95
    assert res.meses == 180


def test_prob_meta_em_0_1() -> None:
    res = simular_acumulacao(
        "10000", "1000", "0.05", "0.12", 10, seed=42, n_simulacoes=2000, meta="150000"
    )
    assert res.prob_atingir_meta is not None
    assert Decimal(0) <= res.prob_atingir_meta <= Decimal(1)


def test_sem_meta_prob_none() -> None:
    res = simular_acumulacao("0", "500", "0.04", "0.08", 5, seed=3, n_simulacoes=1000)
    assert res.prob_atingir_meta is None
