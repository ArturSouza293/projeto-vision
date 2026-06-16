"""API HTTP (FastAPI) sobre o tool registry do motor — para o app consumir.

Servidor FINO: só transporte. O cálculo continua puro e determinístico no motor;
a rede não entra no caminho de cálculo. Auth opcional por header ``X-Engine-Key``
(igual a ``ENGINE_API_KEY`` no ambiente). Saída = envelope auditável ou erro
estruturado (422).

Deploy (Railway/qualquer host):  uvicorn api:app --host 0.0.0.0 --port $PORT
"""

from __future__ import annotations

import os
from typing import Any

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel

import contract as _contract  # noqa: F401  (importa p/ registrar as ferramentas)
from contract.errors import EngineError
from contract.registry import call_tool, list_tools, tool_schemas

app = FastAPI(title="Vision Engine API", version="0.1.0")


def _check_key(x_engine_key: str | None) -> None:
    esperada = os.environ.get("ENGINE_API_KEY")
    if esperada and x_engine_key != esperada:
        raise HTTPException(status_code=401, detail="chave inválida")


@app.get("/health")
def health() -> dict[str, Any]:
    return {"status": "ok", "tools": len(list_tools())}


@app.get("/tools")
def tools() -> dict[str, Any]:
    return {"tools": list_tools(), "schemas": tool_schemas()}


class CallBody(BaseModel):
    payload: dict[str, Any]


@app.post("/call/{name}")
def call(
    name: str,
    body: CallBody,
    x_engine_key: str | None = Header(default=None),
) -> dict[str, Any]:
    _check_key(x_engine_key)
    try:
        envelope = call_tool(name, body.payload)
    except EngineError as e:
        # erro estruturado do motor -> 422 (a LLM/app pergunta, não chuta)
        raise HTTPException(status_code=422, detail=e.to_dict()) from e
    return {"ok": True, "envelope": envelope.model_dump(mode="json")}
