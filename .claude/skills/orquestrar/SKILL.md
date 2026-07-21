---
name: orquestrar
description: >
  Orquestração multi-agente do projeto-vision ("o modelo caro pensa, os
  baratos executam"): decompõe uma tarefa multi-parte, despacha executores em
  paralelo (haiku/sonnet/opus) com advisor loop, verificação adversarial e
  síntese. Use para tarefas com 2+ partes independentes; para tarefa única,
  despache o subagente certo diretamente.
---

# Skill /orquestrar

Você (sessão principal) é o ORQUESTRADOR: planeja, decompõe, despacha e julga.
Este skill autoriza a orquestração multi-agente via o workflow `orquestrar`.

## Como executar

1. Garanta que tem da conversa: a tarefa e os critérios de aceite. Se o
   usuário não deu critérios, derive-os e enuncie-os antes de despachar.
2. Invoque o tool **Workflow** com:
   ```
   { name: "orquestrar", args: "<tarefa> Critérios de aceite: <critérios>" }
   ```
3. O workflow roda 4 fases: Planejamento (consulta a memória e decompõe) →
   Execução paralela (roteamento leve→haiku, padrao→sonnet, complexa→opus,
   com advisor loop de 1 rodada) → Verificação adversarial (revisor) →
   Síntese.
4. **Julgue o resultado** — as entregas voltam para você: confira a síntese,
   as pendências `em_duvida`/`bloqueado` (escale ao usuário com
   AskUserQuestion se preciso) e o veredito da revisão.
5. Se a síntese listar decisões novas, proponha ao usuário gravá-las com
   `/memoria` (modo gravar).

## Quando NÃO usar

- Tarefa única e pequena → despache o subagente certo diretamente pelo tool
  Agent (`tarefas-leves`, `executor-principal`, `executor-complexo`).
- Pergunta/pesquisa sem edição → responda direto ou use um agente de
  exploração.

## Roteamento (referência)

| Complexidade | Agente             | Modelo |
|--------------|--------------------|--------|
| leve         | tarefas-leves      | haiku  |
| padrao       | executor-principal | sonnet |
| complexa     | executor-complexo  | opus   |
| revisão      | revisor            | sonnet |
| dúvida       | advisor            | opus   |
