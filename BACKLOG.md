# BACKLOG — melhorias identificadas e NÃO implementadas (regra da Fase B)

> Durante a integração do engine é proibido melhorar UI/UX. Tudo que foi notado
> e ficou de fora entra aqui, para priorização futura.

- **goals-step usa retorno hardcoded de 4%** no `goalFundedPct` (goals-step.tsx:55),
  divergindo do retorno do cenário selecionado no workspace. A integração preserva
  o comportamento atual (paridade); unificar a fonte do retorno é melhoria futura.
- **`probabilityOfSuccess` é uma logística determinística** (ratio capital/necessário),
  não um Monte Carlo. Candidato a v2 do engine (C7 já documenta a calibração
  μ_geo ≈ μ_arit − σ²/2 para quando isso vier).
- **CET de financiamentos** fora do escopo (engine rotula "juros efetivos, sem CET").
- **Modo nominal de exibição** — o engine já suporta `modoProjecao: "nominal"`;
  expor um toggle real/nominal na UI é melhoria futura.
- **TVM BEG/END na UI** — o engine suporta timing "begin"; a UI sempre usa "end".
- **`returnCheckpoints` reprojeta ~44× por render** (bisseção 2×22 iterações chamando
  a projeção inteira). Com o engine a <0,4 ms isso é barato, mas memoizar por
  (plan, assumptions) continua sendo uma melhoria limpa.
