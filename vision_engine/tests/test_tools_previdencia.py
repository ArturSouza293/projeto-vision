"""Ferramentas novas expostas à LLM: pgbl_deducao e previdencia_progressiva."""

from __future__ import annotations

from fastapi.testclient import TestClient

from api import app

client = TestClient(app)

DT = "2026-06-16"


def test_tools_registradas() -> None:
    r = client.get("/tools")
    nomes = {t["name"] for t in r.json()["tools"]}
    assert {"pgbl_deducao", "previdencia_progressiva"} <= nomes
    assert client.get("/health").json()["tools"] == 7


def test_pgbl_deducao_limita_a_12pct() -> None:
    # contribuição acima do teto → limitada a 12% da renda; economia de IR > 0
    r = client.post(
        "/call/pgbl_deducao",
        json={"payload": {"contribuicao_ano": "30000",
                          "renda_bruta_tributavel_ano": "100000", "data_referencia": DT}},
    )
    assert r.status_code == 200
    env = r.json()["envelope"]
    assert env["valor"] == "12000.00"  # min(30000, 12% de 100000)
    assert env["detalhe"]["teto_12pct"] == "12000.00"
    assert float(env["detalhe"]["economia_ir_ano"]) > 0


def test_pgbl_deducao_abaixo_do_teto_integral() -> None:
    r = client.post(
        "/call/pgbl_deducao",
        json={"payload": {"contribuicao_ano": "8000",
                          "renda_bruta_tributavel_ano": "100000", "data_referencia": DT}},
    )
    assert r.json()["envelope"]["valor"] == "8000.00"


def test_pgbl_deducao_renda_zero_422() -> None:
    r = client.post(
        "/call/pgbl_deducao",
        json={"payload": {"contribuicao_ano": "1000",
                          "renda_bruta_tributavel_ano": "0", "data_referencia": DT}},
    )
    assert r.status_code == 422
    assert r.json()["detail"]["erro"] == "OUT_OF_RANGE"


def test_previdencia_progressiva_usa_tabela_irpf() -> None:
    r = client.post(
        "/call/previdencia_progressiva",
        json={"payload": {"beneficio_mensal": "10000", "data_referencia": DT}},
    )
    assert r.status_code == 200
    env = r.json()["envelope"]
    assert env["valor"] == "1841.27"  # IRPF mensal sobre 10.000 (mesma tabela)
    assert env["detalhe"]["irrf_fonte_15pct"] == "1500.00"  # 15% retido na fonte


def test_previdencia_progressiva_beneficio_zero_422() -> None:
    r = client.post(
        "/call/previdencia_progressiva",
        json={"payload": {"beneficio_mensal": "0", "data_referencia": DT}},
    )
    assert r.status_code == 422
