"""API HTTP — endpoints, envelope serializado (valor como STRING) e auth."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from api import app

client = TestClient(app)


def test_health() -> None:
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_tools_schemas() -> None:
    r = client.get("/tools")
    body = r.json()
    assert "irpf_mensal" in body["schemas"]
    assert any(t["name"] == "cdb_liquido" for t in body["tools"])


def test_call_irpf_envelope_valor_string() -> None:
    r = client.post(
        "/call/irpf_mensal",
        json={"payload": {"base": "10000", "data_referencia": "2026-06-01"}},
    )
    assert r.status_code == 200
    env = r.json()["envelope"]
    assert env["valor"] == "1841.27"  # STRING (Decimal exato), não float
    assert env["parametros_versao"] == "irpf@2026-01-01"


def test_call_validacao_422() -> None:
    r = client.post(
        "/call/irpf_mensal",
        json={"payload": {"base": "-100", "data_referencia": "2026-06-01"}},
    )
    assert r.status_code == 422
    assert r.json()["detail"]["erro"] == "OUT_OF_RANGE"


def test_tool_inexistente_422() -> None:
    r = client.post("/call/nao_existe", json={"payload": {}})
    assert r.status_code == 422
    assert r.json()["detail"]["erro"] == "TOOL_NOT_FOUND"


def test_auth_por_chave(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("ENGINE_API_KEY", "segredo")
    base = {"payload": {"base": "5000", "data_referencia": "2026-06-01"}}
    assert client.post("/call/irpf_mensal", json=base).status_code == 401
    ok = client.post("/call/irpf_mensal", headers={"X-Engine-Key": "segredo"}, json=base)
    assert ok.status_code == 200
