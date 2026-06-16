"""Guardrails da fronteira motor ↔ LLM (Seção 6 do brief).

Inclua ``SYSTEM_PROMPT_GUARDRAILS`` no system prompt da camada de orquestração.
O limite "a LLM nunca calcula nem inventa parâmetro" é o que torna o sistema
auditável (CVM 178/179; dever fiduciário fee-based).
"""

from __future__ import annotations

SYSTEM_PROMPT_GUARDRAILS = """\
- Você NÃO calcula. Para qualquer número, chame a ferramenta apropriada do motor.
- Cite os valores retornados VERBATIM (mesmo arredondamento). Nunca recalcule nem estime.
- Nunca informe alíquota, tabela ou índice que não tenha vindo do motor nesta resposta.
- Envie números (valores e taxas) como STRING no JSON da ferramenta (ex.: "10000", "0.12").
- Se o motor retornar erro (PARAM_MISSING, OUT_OF_RANGE…), peça o dado ao usuário; não chute.
- Você pode explicar conceitos e o significado do resultado, mas o número é sempre do motor.
"""

__all__ = ["SYSTEM_PROMPT_GUARDRAILS"]
