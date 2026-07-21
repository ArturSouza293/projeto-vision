export const meta = {
  name: 'orquestrar',
  description:
    'Decompõe uma tarefa em subtarefas, roteia cada uma para o executor/modelo certo (haiku/sonnet/opus), executa em paralelo com advisor loop, verificação adversarial e síntese.',
  whenToUse:
    'Tarefas multi-parte no projeto-vision. args = descrição da tarefa + critérios de aceite.',
  phases: [
    { title: 'Planejamento', detail: 'consulta memória e decompõe em subtarefas roteadas' },
    { title: 'Execução', detail: 'executores em paralelo + advisor loop' },
    { title: 'Verificação', detail: 'revisão adversarial das entregas' },
    { title: 'Síntese', detail: 'julgamento final e decisões para a memória' },
  ],
}

const ROTEAMENTO = {
  leve: 'tarefas-leves',
  padrao: 'executor-principal',
  complexa: 'executor-complexo',
}

const SCHEMA_PLANO = {
  type: 'object',
  properties: {
    memoria_relevante: { type: 'array', items: { type: 'string' } },
    subtarefas: {
      type: 'array',
      minItems: 1,
      maxItems: 5,
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          descricao: { type: 'string' },
          criterios: { type: 'string' },
          complexidade: { type: 'string', enum: ['leve', 'padrao', 'complexa'] },
        },
        required: ['id', 'descricao', 'criterios', 'complexidade'],
      },
    },
  },
  required: ['subtarefas'],
}

const SCHEMA_ENTREGA = {
  type: 'object',
  properties: {
    status: { type: 'string', enum: ['concluido', 'em_duvida', 'bloqueado'] },
    arquivos: { type: 'array', items: { type: 'string' } },
    resumo: { type: 'string' },
    duvida: { type: 'string' },
  },
  required: ['status', 'resumo'],
}

const SCHEMA_REVISAO = {
  type: 'object',
  properties: {
    veredito: { type: 'string', enum: ['aprovado', 'reprovado'] },
    achados: { type: 'array', items: { type: 'string' } },
  },
  required: ['veredito'],
}

if (!args || typeof args !== 'string' || !args.trim()) {
  throw new Error('args obrigatório: descrição da tarefa + critérios de aceite')
}

// ---------- FASE 1: PLANEJAMENTO (o caro pensa) ----------
phase('Planejamento')
const plano = await agent(
  `Você é o planejador do projeto-vision. Tarefa do usuário:\n${args}\n\n` +
    `1. Consulte o segundo cérebro: rode ` +
    `\`node .claude/skills/memoria/memoria.mjs query --texto "<termos da tarefa>"\` ` +
    `(e variações) e liste em memoria_relevante os ids/títulos de decisões que afetam esta tarefa.\n` +
    `2. Decomponha a tarefa em 1 a 5 subtarefas INDEPENDENTES entre si (serão executadas em paralelo — ` +
    `sem dependência de ordem nem edição concorrente do mesmo arquivo).\n` +
    `3. Classifique cada subtarefa: "leve" (mecânica: i18n, docs, renomes), ` +
    `"padrao" (feature/refactor de escopo claro) ou "complexa" (motor financeiro, algoritmos, multi-arquivo).\n` +
    `Cada subtarefa precisa de criterios de aceite objetivos. Lembre a Regra Zero: ` +
    `nenhuma subtarefa pode pedir que a LLM calcule números financeiros — cálculos vêm do motor engine/.`,
  { label: 'decompor', phase: 'Planejamento', schema: SCHEMA_PLANO },
)

log(`plano: ${plano.subtarefas.length} subtarefa(s) — ` +
  plano.subtarefas.map((s) => `${s.id}(${s.complexidade})`).join(', '))

// ---------- FASE 2: EXECUÇÃO PARALELA + ADVISOR LOOP ----------
function executar(sub, orientacao) {
  const extra = orientacao
    ? `\n\nORIENTACAO DO ADVISOR (siga-a):\n${orientacao}`
    : ''
  return agent(
    `Subtarefa ${sub.id}: ${sub.descricao}\n` +
      `Critérios de aceite: ${sub.criterios}\n` +
      `Contexto da tarefa maior: ${args}${extra}`,
    {
      label: `exec:${sub.id}`,
      phase: 'Execução',
      agentType: ROTEAMENTO[sub.complexidade] ?? ROTEAMENTO.padrao,
      schema: SCHEMA_ENTREGA,
    },
  )
}

let entregas = await parallel(plano.subtarefas.map((sub) => () => executar(sub)))

// Advisor loop: no máximo UMA rodada de consulta + redespacho por subtarefa.
// Se persistir em_duvida, escala ao humano na síntese — nunca itera.
for (let i = 0; i < entregas.length; i++) {
  const entrega = entregas[i]
  if (!entrega || entrega.status !== 'em_duvida') continue
  const sub = plano.subtarefas[i]
  log(`advisor consultado para ${sub.id}: ${entrega.duvida ?? '(sem duvida explícita)'}`)
  const orientacao = await agent(
    `Dúvida de um executor na subtarefa "${sub.descricao}" ` +
      `(tarefa maior: ${args}):\n\n${entrega.duvida ?? entrega.resumo}`,
    { label: `advisor:${sub.id}`, phase: 'Execução', agentType: 'advisor' },
  )
  entregas[i] = await executar(sub, orientacao)
}

// ---------- FASE 3: VERIFICAÇÃO ADVERSARIAL ----------
phase('Verificação')
const revisao = await agent(
  `Revise adversarialmente as entregas abaixo da tarefa "${args}".\n` +
    `Entregas:\n${JSON.stringify(entregas, null, 2)}\n\n` +
    `Rode as verificações read-only (npx tsc --noEmit, npm run lint, npm run test) ` +
    `e cace violações da Regra Zero nos arquivos tocados. Cada achado no formato ` +
    `"[severidade] arquivo:linha — problema — correção sugerida".`,
  { label: 'revisao', phase: 'Verificação', agentType: 'revisor', schema: SCHEMA_REVISAO },
)

let correcao = null
if (revisao.veredito === 'reprovado' && (revisao.achados ?? []).length) {
  log(`revisão reprovou com ${revisao.achados.length} achado(s) — 1 rodada de correção`)
  correcao = await agent(
    `Corrija os achados da revisão adversarial (tarefa: ${args}):\n` +
      revisao.achados.map((a, i) => `${i + 1}. ${a}`).join('\n'),
    { label: 'correcao', phase: 'Verificação', agentType: 'executor-principal', schema: SCHEMA_ENTREGA },
  )
}

// ---------- FASE 4: SÍNTESE / JULGAMENTO ----------
phase('Síntese')
const sintese = await agent(
  `Sintetize para o usuário o resultado da orquestração da tarefa "${args}".\n` +
    `Plano: ${JSON.stringify(plano.subtarefas)}\n` +
    `Entregas: ${JSON.stringify(entregas)}\n` +
    `Revisão: ${JSON.stringify(revisao)}\n` +
    `Correção pós-revisão: ${JSON.stringify(correcao)}\n\n` +
    `Produza: (1) o que foi feito e arquivos tocados; (2) estado da verificação; ` +
    `(3) pendências — inclua toda subtarefa que terminou em_duvida ou bloqueado, ` +
    `com a pergunta a fazer ao humano; (4) se surgiram DECISÕES novas de ` +
    `arquitetura/produto, liste-as prontas para gravar com ` +
    `\`node .claude/skills/memoria/memoria.mjs add-node ...\` (mas NÃO grave — ` +
    `quem grava é a sessão principal, com aval do usuário).`,
  { label: 'julgamento', phase: 'Síntese' },
)

return { plano, entregas, revisao, correcao, sintese }
