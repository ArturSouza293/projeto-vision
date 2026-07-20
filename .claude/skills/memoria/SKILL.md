---
name: memoria
description: >
  Segundo cérebro do projeto — grafo de memória local em
  .claude/memory/graph.json (projetos, decisões, reuniões, notas e relações).
  Use para consultar contexto histórico antes de tarefas relevantes e para
  gravar decisões importantes ao final. Modos: consultar (default) e gravar.
---

# Skill /memoria

Toda operação passa pelo CLI `memoria.mjs` neste diretório — NUNCA edite
`graph.json` diretamente.

```
node .claude/skills/memoria/memoria.mjs <comando> [opções]
```

Comandos: `query` · `add-node` · `add-edge` · `vizinhos` · `resumo` · `validate`

## Modo consultar (default)

1. Interprete o pedido do usuário como filtros.
2. Rode: `node .claude/skills/memoria/memoria.mjs query --texto "<termo>" [--tipo projeto|decisao|reuniao|nota] [--tag x] [--desde AAAA-MM-DD]`
3. Se um nó parecer central, expanda com `vizinhos --id <id> [--profundidade 2]`.
4. Responda citando os ids dos nós (ex.: `[dec-memoria-local]`), para o usuário poder referenciá-los depois.

## Modo gravar

Use quando o usuário pedir para registrar algo, ou ao final de uma tarefa que
produziu uma decisão de arquitetura/produto nova.

1. Redija `titulo` (curto) e `corpo` (autossuficiente — será lido sem contexto da conversa).
2. Rode: `add-node --tipo decisao|reuniao|nota|projeto --titulo "..." --corpo "..." --tags a,b`
   (o id é gerado automaticamente com prefixo do tipo; use `--id` só para forçar um slug específico).
3. Conecte ao grafo: SEMPRE crie ao menos uma aresta com
   `add-edge --de <novo-id> --para <id-existente> --relacao <relacao>`.
   Nó órfão é memória perdida.
4. Rode `validate` e mostre ao usuário o nó criado.

## Convenções

- ids: slug prefixado por tipo — `proj-`, `dec-`, `reun-`, `nota-`.
- Vocabulário de relações sugerido: `pertence_a`, `decidiu_sobre`, `substitui`, `referencia`, `resultou_de`.
- Uma decisão que reverte outra: aresta `{de: nova, para: antiga, relacao: "substitui"}` — não apague a antiga.
- O grafo é versionado no git: commits que gravam memória devem incluir `.claude/memory/graph.json`.
- Somente a sessão principal grava (via este skill); subagentes executores apenas consultam — evita escrita concorrente.
