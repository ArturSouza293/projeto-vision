<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Arquitetura de agentes — "o modelo caro pensa, os baratos executam"

Referência completa: `docs/ARQUITETURA_AGENTES.md`.

## Regra Zero (inegociável para todo agente)

A LLM nunca faz aritmética financeira. Todo número exibido vem do motor
(`engine/`, validado por `engine/validator.ts`). Ver `docs/ENGINE_SPEC.md` §10.

## Roteamento de modelos

| Tarefa                                  | Agente                       | Modelo |
|-----------------------------------------|------------------------------|--------|
| Planejar, decompor, despachar, julgar   | sessão principal (orquestrador) | modelo forte da sessão |
| Implementação padrão (app/, lib/, components/) | `executor-principal`  | sonnet |
| Motor financeiro, algoritmos, multi-arquivo | `executor-complexo`      | opus   |
| Revisão adversarial / frontend (read-only) | `revisor`                 | sonnet |
| Mecânica: i18n, docs, renomes, buscas   | `tarefas-leves`              | haiku  |
| Dúvida de executor                      | `advisor`                    | opus   |

## Como operar

- **Tarefa multi-parte**: invoque `/orquestrar` (workflow `orquestrar`:
  planejamento → execução paralela → verificação adversarial → síntese).
- **Tarefa única**: despache o subagente certo diretamente.
- **Início de tarefa relevante**: consulte o segundo cérebro —
  `node .claude/skills/memoria/memoria.mjs query --texto "..."` (skill `/memoria`).
- **Fim de tarefa com decisão nova**: grave com `/memoria` (modo gravar).
  Somente a sessão principal grava no grafo; subagentes apenas consultam.
- **Advisor**: executor em dúvida retorna `STATUS: em_duvida`; a sessão
  principal consulta o subagente `advisor` e redespacha com a orientação —
  subagente não chama subagente. Máximo 1 rodada; persistiu a dúvida,
  escale ao usuário.

## Verificações padrão

`npm run lint` · `npx tsc --noEmit` · `npm run test` ·
`npm run golden:check` (obrigatório se tocar `engine/`)
