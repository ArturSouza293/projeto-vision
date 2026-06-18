# Changelog

## v10.1 — Notas do teste comercial: Cliente 360 enriquecido, aba Motores, usufruto/legado, próximo passo

Update grande nascido das anotações do time comercial. Toca as 3 abas + a base de
personas. **Branch `feature/v10-major-comercial`.** Disciplina mantida: commit por
bloco; régua verde a cada um (tsc + 192 testes + `golden:check` INALTERADO); **sem
push** (revisão local do diff). Parte de cálculo (motor) feita com **golden novos
pinados**; UI/seed não mexem no golden.

**PARTE 0 — transversais**
- Primitivos `InfoTip` (i), `SourceBadge` (via Open Finance/IR/cartão/simulado) e
  `FreshnessStamp` (última atualização + alerta de desatualizado).
- **Guarda anti-macro-da-BIA** (`lib/macro-facts.ts`): fonte única de macro com
  **fonte+data**; `containsMacroClaim`/`stripMacroClaims` impedem número macro vindo
  de texto livre da BIA (Regra Zero) — +teste. Terminologia "renda dura" → **"horizonte de renda"**.

**Motor (TS) — C8/C9 (golden-safe, pinado)**
- Usufruto **bidirecional** capital↔renda (`capitalParaRendaMensal`/`rendaSustentavelMensal`),
  horizonte customizável (renda além da morte do titular — "maior incapaz").
- Sucessão por **subtipo** (inventário/imóveis/legado). `engine/itcmd.ts` (ITCMD por UF, ilustrativo).
- C11 `nextStepFromVitalSign` (6 alavancas Prime Top Tier; magnitude SEMPRE do motor). Testes pinados.

**PARTE A — Cliente 360** (campos opcionais; personas atuais intactas)
- A1 perfil (como-chamar, aniversário, ★ assunto quente, réguas investimentos/banking,
  NPS, funcionário) + **árvore genealógica com realce** (vermelho/cinza = conta Bradesco;
  dourado = decisor). A2 posição internacional detalhada + histórico patrimonial.
  A3 IR "via IR" editável + cartão "via Open Finance" + insights. A4 seguros internos×externos
  com **modal no hover** + bens sem cobertura. `// TODO(Claude Design)` no perfil.

**PARTE B — nova aba "Motores de Cálculo e Simulações"** (front-end mock)
- 3ª aba; shells com inputs editáveis, **fórmula visível** e resultado em placeholder
  "backend a implementar" (Regra Zero: zero aritmética nova no componente). Motores:
  empréstimo com garantia (equilíbrio/antecipação, "não descapitaliza") + comparativo
  de taxas (CET × rentabilidade líquida). Comparar simulações + exportar p/ e-mail (mailto).

**PARTE C — Life Planning**
- Modelo C1/C2/C6/C7 (maior incapaz, seguro resgatável, renda stock options/periodicidade,
  despesa por dependente/convênio). **C11**: `NextStepCard` plugado na workspace (magnitudes
  por bisseção em `projectPlan`; CTA "simular este ajuste"). **C8**: `UsufrutoPanel` (toggle
  economicamente ativo + bidirecional renda↔capital + horizonte perpétuo/finito).
- **C10**: linha **real × desejável** sobreposta no gráfico de patrimônio, com toggle para
  mostrar/ocultar (`projecaoDesejavel` no `lib/next-step.ts` — projeção que zera a lacuna só
  com aporte, mesmo motor/Regra Zero; só aparece quando há lacuna). **Escala (eixos) em bold**
  nos números-chave para facilitar a leitura. `golden:check` INALTERADO.
- **C4**: **Cartão de crédito** (seção no plano) — planilha de gastos por **categoria** (via
  Open Finance, mock) na aba **Despesas** e no card de A3, reaproveitando uma `CartaoGastosTable`.
  Conecta com Despesas pela MESMA taxonomia `ExpenseCategory`; **informativo/read-only** — NÃO
  entra em `cashFlow.expenses` (sem dupla contagem ⇒ `golden:check` INALTERADO). Soma/ordenação
  em `lib/cartao.ts` (Regra Zero) + 5 testes. Mock: Camila & Diego e Sônia.

**PARTE D — diagnóstico**
- Persona **13 (Sônia, A Guardiã do Legado)**: seed completo + dossiê KYC v10 (maior incapaz
  Bernardo, decisora Letícia, sucessão=legado, imóveis SP). Caso-teste de C1/C8/C9/C11.
- **Health-check da BIA** (`GET /api/bia-health`): conectividade + teste da Selic (compara
  com a premissa). Achado: a BIA **conecta mas responde de memória** (sem dado ao vivo) →
  macro sempre de `macro-facts`, nunca da BIA.

**Como testar (rápido):** abrir a persona **Sônia** → aba **Cliente 360** (árvore com realces,
IR/cartão/seguros, histórico) · aba **Motores** (shells + exportar) · aba **Life Planning** →
num cenário com lacuna, o card **"Próximo passo"** + o **painel de usufruto** bidirecional.

**Escopo v10.1 completo:** PARTE 0 + A + B + C (C1–C11) + D entregues. `golden:check`
INALTERADO em toda a fase. Próximo passo de produto é review do diff + deploy sob ordem.

## v10 — Motor Python integrado ao app (híbrido, sob demanda)

O motor determinístico Python (`vision_engine/`) agora alimenta o app por API,
sem tocar no recálculo AO VIVO (que segue no motor TS, client-side).

- **`vision_engine/api.py`** (FastAPI) sobre o tool registry: `/health`, `/tools`,
  `/call/{tool}` → envelope auditável (`valor` como STRING = Decimal exato) ou erro
  estruturado (422); auth opcional por `X-Engine-Key`. `requirements.txt` +
  `Procfile` p/ deploy (Railway). Teste: 6/6.
- **`app/api/engine/route.ts`** — proxy **server-side** (o navegador não vê o host
  do motor → seguro pro corp); degrada com elegância sem `ENGINE_API_URL`.
- **Cliente 360** ganhou o card **"Motor de cálculo auditável"**: calcula SOB
  DEMANDA (botão, não no recálculo ao vivo) a renda fixa LÍQUIDA de impostos do
  cliente (bruto → IOF → IR) com `fórmula` + versão dos parâmetros. O simulador
  (Life Planning) continua recalculando ao vivo no TS — zero regressão.
- Verificado ponta a ponta: API 6/6, app→proxy→motor (Playwright), 165 testes,
  golden 33/33, tsc/build limpos.
- Deploy guiado em [`vision_engine/DEPLOY.md`](vision_engine/DEPLOY.md) (Railway +
  variáveis no Vercel: `ENGINE_API_URL`, `ENGINE_API_KEY`).
- chore(deploy): republicação forçada no Vercel p/ promover esta versão a
  produção (o auto-deploy não havia publicado o commit do v10).

## v9.2 — Cliente 360 + Life Planning: navegação em 2 abas no registro do cliente

Promove a Visão 360 do v8 de modal para **aba de primeira classe**. Ao abrir um
cliente, o registro passa a ter um tabset de 2 abas no topo:

- **Cliente 360** — dossiê em **página inteira** (`client-360-page.tsx`), nas 6
  seções do spec, nesta ordem: (1) Resumo da ficha, (2) Identificação +
  Share of Wallet, (3) Relacionamento (temas sensíveis em destaque), (4) Perfil
  pessoal e familiar, (5) Ativos, patrimônio e posição internacional, (6) Fluxo
  de caixa e alertas — com **despesas declarado-KYC × plano lado a lado** (número
  do plano vem do motor, `cashFlowTotals`). Bloco de Proteção (sucessão/seguros)
  preservado do v8. Rodapé com 4 KPIs do motor + atalho "Abrir Life Planning".
- **Life Planning** — o simulador inteiro (timeline, KPIs, Plano Ideal, Output,
  copilot), **movido como está, sem regressão**.

Detalhes:

- **Modal removido**: `client-360-modal.tsx` deletado; item "Visão 360" do menu e
  o estado/handlers de abertura removidos (sem código morto). O `data-testid`
  `client-360` foi preservado (agora na página).
- **Gate por presença de dados**: a aba "Cliente 360" só aparece quando o caso
  tem `kyc` (personas seed). Casos do zero mostram só "Life Planning". Default ao
  abrir um caso com KYC = Cliente 360 (contexto antes de simular).
- **Estado preservado entre abas**: os dois painéis ficam montados (toggle por
  `hidden`), então alternar não desmonta o simulador (cenário/timeline/edições
  intactos). O seletor de fase (Simular/Entrega) aparece só no Life Planning.
- **Aba lembrada por cliente**: `clientTabs[clientId]` no store (persistido).
- **A11y**: tablist com `role=tab`/`aria-selected`/roving tabindex/setas/Home/End,
  painéis `role=tabpanel`. i18n `clientTabs.*` (EN/PT).
- **Privacidade/Regra Zero intactas**: nenhuma chamada de API na aba 360; o teste
  da whitelist do payload da BIA (sem `kyc`) e o teste de Share of Wallet
  (Ricardo ≈ 23%) continuam verdes.
- **Automação atualizada** (sem link quebrado): golden/demo/screenshots trocam
  para a aba `tab-life-planning` ao precisar do simulador (as personas seed agora
  abrem na aba Cliente 360).

## v9.1 — Gate de acesso (proteção leve da PI, client-side)

Re-adiciona uma senha de acesso ao protótipo (**"horizonte"**), desenhada para
NÃO repetir os problemas do gate antigo (que derrubou o domínio no corp).

- **Client-side, sem POST**: a senha é validada por SHA-256 (Web Crypto) no
  próprio navegador contra um hash com salt — o texto puro não vai pro bundle, e
  não há POST com campo "senha" (era o que o DLP do banco bloqueava).
- **Branded, parece o app** (logo Bradesco + card): evita a "tela preta de
  senha" que o proxy corporativo classificava como phishing (PX022C).
- **Baixo atrito**: a liberação persiste no `localStorage` → o testador digita a
  senha **uma vez por dispositivo** e nunca mais vê o gate.
- `lib/gate.ts` (hash + verify + flag; senha trocável via `NEXT_PUBLIC_GATE_HASH`
  na Vercel, sem mexer no código), `components/app/gate.tsx`, integrado em
  `app/page.tsx` antes do login. i18n `gate.*` (EN/PT).
- Automação (demo + golden + screenshots): `golden/gate-helper.mjs` agora
  pré-libera o gate gravando a flag no `localStorage` via `addInitScript` — a
  demo continua sem a tela de senha e o QA roda direto.
- **Limite honesto**: por ser client-side, detém acesso casual/acidental, não um
  atacante técnico (devtools). É o equilíbrio com o atrito de teste; barreira
  real exigiria server-side, que reintroduz o risco de bloqueio no corp.

## v9 — Protótipo inteiramente responsivo (mobile-first, qualquer aparelho)

Varredura completa de responsividade (auditoria de 73 pontos em 7 grupos →
correções) para o app funcionar bem de um celular de 360px até desktop.
**Princípio:** toda mudança é no-op em `≥md` (768px) — o desktop renderiza
idêntico, então os golden screenshots (1920px) e o vídeo da demo não mudam.

- **Viewport** (`app/layout.tsx`): export `viewport` com `width=device-width`,
  `themeColor` Bradesco e `colorScheme: light`. Zoom continua habilitado
  (acessibilidade).
- **Primitivas compartilhadas** (corrigem várias telas de uma vez):
  - `Dialog`/`Sheet`: `max-h` + scroll interno — diálogos altos não cortam mais
    abaixo da dobra em telas baixas.
  - `Tabs`: lista com scroll horizontal quando há abas demais.
  - `Input`/`Select`: altura de toque 44px no celular (`h-11 md:h-9`),
    compacto no desktop.
  - `Button` (icon-sm/icon-xs): área de toque ~44px via pseudo-elemento
    invisível (fecha-diálogos), sem mudar o visual.
  - `Slider`: alvo do thumb maior no toque. `Popover`: `max-w` para não estourar.
- **Cabeçalho** (`engine-shell`): no celular as ações secundárias (Dados,
  Salvar, Visão 360, Sair) entram num menu "⋮"; o seletor de fase ganha uma
  linha própria; o "Sair" fica sempre acessível. Desktop inalterado.
- **Modais**: Resumo dos Planos empilha 1 coluna no celular (era scroll lateral
  forçado); carrossel de peers vira scroll-snap nativo com swipe; tabela do
  IRRF (Premissas) com scroll horizontal.
- **Timelines/gráficos**: faixa arrastável com área de toque maior nos chips
  (sem mexer na geometria/Regra Zero); alturas de gráfico reduzidas no celular.
- **Formulários** (cadastro): grids colapsam para 1 coluna no celular; editor
  de dependentes deixa de estourar; inputs inline com alvo de toque.
- **Workspace/saída**: KPIs, marcas do slider, trilha de variantes e payload
  reencaixados para o celular.

## Demo v4 — corte limpo 4K para narração ao vivo

- **`demo/clean.mjs`** (novo, `npm run demo:clean`): monta o vídeo da demo
  **sem legenda, sem texto, sem avatar e sem áudio** — para o apresentador
  narrar ao vivo. Mantém exatamente o ritmo da v3 narrada (linha do tempo
  áudio-first recalculada com as durações do TTS em cache); o fechamento
  (cap11) vira freeze do último frame + fade-out no lugar do card de texto.
- **Gravação em 4K real**: `demo/record.mjs --scale N` (deviceScaleFactor;
  scale 2 → 3840×2160). Coordenadas seguem em px CSS — nada muda nas cenas.
  Fluidez verificada: ~23 fps únicos durante o drag da timeline.
- **Roteiro `.txt` gerado** com janelas de tempo por bloco e o texto da
  narração EXATAMENTE igual à última versão narrada (campo `texto`).
- **Take cap2 atualizado**: mostra a **Visão 360** da persona (dossiê com
  perfil pessoal, família e relacionamento — v8) no lugar do wizard de perfil,
  casando com a fala "o consultor conhece quem importa".
- Cena do **gate removida do storyboard** (o gate não existe mais no app).
- Saídas: `demo_vision_v4_4K_sem_legenda.mp4` (3840×2160, 105s, H.264 yuv420p,
  sem trilha de áudio) + `demo_vision_v4_roteiro_narracao.txt`, copiadas para
  a pasta Project Vision do Desktop.

## v8.1 — Visão 360: drawer → modal centralizado (UX)

- A Visão 360 virou um **modal centralizado** (Dialog, igual aos demais modais
  do app) no lugar do drawer lateral — o drawer amassava em telas estreitas
  (cabeçalho colidia com o "X", os 4 KPIs do rodapé ficavam colados).
- Layout reencaixado: header de identidade (eyebrow + nome + chips, com folga
  para o botão de fechar), corpo rolável em grade 1/2 colunas (Relacionamento,
  Fluxo de caixa e Proteção em largura total), rodapé fixo com os 4 KPIs do
  motor bem espaçados + "Abrir plano completo". Responsivo (desktop 2 col,
  mobile 1 col + rodapé 2×2).
- Correção do estreitamento: `sm:max-w-4xl` (mesma variante) para o
  tailwind-merge sobrepor o `sm:max-w-sm` do DialogContent base.
- Double-check visual: as 9 categorias e todos os dados fictícios renderizam
  (verificado em 3 larguras). 163 testes, regressão 33/33, tsc/build limpos.

## v8 — Dossiês KYC + Visão 360 do cliente (em produção)

- **Dados** (`lib/types.ts` + `lib/mock/kyc.ts`): tipo `ClientKYC` com as 9
  categorias da proposta "Conheça seu Cliente"; 14 dossiês fictícios (um por
  persona seed) transcritos do anexo de `01_personas_PT.md`, com os nomes de
  cônjuge reconciliados ao cadastro do app. Anexados via `clientProfile.kyc` —
  **casos criados do zero nunca têm KYC**.
- **Botão "Visão 360"** no header do workspace, visível **só quando o caso ativo
  tem KYC** (gate por presença de dados); ausente em casos do zero.
- **Drawer "Cliente 360"** (`components/engine/client-360-drawer.tsx`):
  cabeçalho de identidade + share of wallet com leitura comercial; card de
  **Relacionamento em destaque** (temas sensíveis inconfundíveis); perfil
  pessoal/familiar, ativos & patrimônio, posição internacional, fluxo de caixa
  com **alertas por severidade**, proteção (com link para a Entrega); rodapé com
  **4 números do MOTOR** (mesma fonte do workspace). Resumos da BIA são mock com
  badge "exemplo ilustrativo" — **zero chamada de IA**.
- **Derivações** (`lib/kyc.ts` + teste): `shareOfWallet` = saldo no banco ÷
  patrimônio financeiro do caso (motor); âncora Ricardo ≈ 23%.
- **Regra Zero / privacidade**: o dossiê KYC **não entra no payload da BIA** — a
  whitelist de `buildPlanoIdealPayload` é por inclusão; teste novo varre todas
  as personas garantindo que nenhum campo/valor de KYC vaza.
- i18n EN/PT (namespace `vision360`, paridade de chaves); textos dos dossiês
  permanecem em PT (são dados, não UI). QA: 163 testes (+7), bench, golden
  inalterado, regressão 33/33, tsc/build limpos, verificação em browser
  (botão presente/ausente, drawer, KPIs, EN/PT). Despesas KYC × plano lado a
  lado ficaram para a v9 (decisão de escopo).

## Gate removido — teste de acesso no ambiente corporativo (branch `remove-gate`)

- **Contexto**: o filtro corporativo passou a bloquear a URL inteira
  (`projeto-vision.vercel.app`), não mais só o POST de login — assinatura de
  bloqueio por categoria/reputação de domínio. Hipótese a testar: a própria
  tela preta de senha (cara de página de phishing) pode ter sido o gatilho.
- **Mudança**: removido o gate por completo — `proxy.ts`, `app/gate/*`,
  `app/api/gate/route.ts`, `lib/gate-token.ts`. O app passa a abrir direto no
  login do advisor, sem tela preta. `GATE_PASSWORD` sai do `.env.local`; no
  Vercel a variável é apagada pelo usuário (o proxy já era fail-open, então a
  remoção da env por si só desarmaria o gate — tirar o código garante que a
  página de senha some do build).
- Os scripts de QA mantêm o import de `passGate`, que vira **no-op** sem
  `GATE_PASSWORD` (nenhuma edição necessária). `golden/v6-checks.mjs` (bateria
  específica do gate) fica obsoleta enquanto o gate estiver fora.
- Reversível: tudo preservado no histórico do git (basta reverter o commit).
- QA: app abre direto (sem gate), `/gate` e `/api/gate` → 404, regressão do
  núcleo intacta, tsc/build limpos.

## Gate — autenticação por hash (compatível com DLP corporativo), mesmo link

- **Problema**: em máquinas corporativas o gate acusava "senha incorreta" com a
  senha certa — filtros DLP/proxy bloqueiam POST com credencial em texto puro
  (campo `password`); o form mostrava erro para qualquer falha do POST.
- **Solução** (mesmo link, mesmo formulário, só muda o FORMATO do request):
  - A senha é hasheada **no cliente** (`gateToken` = SHA-256) — o corpo carrega
    só um token opaco (`{ h }`), sem campo "password", sem texto puro: o DLP
    não casa mais com a assinatura de exfiltração de credencial.
  - **Fallback automático** de formulário nativo: se o `fetch` falhar por
    rede/proxy (não por 401), o form envia um POST urlencoded só com o hash
    (sem XHR, que alguns proxies atrapalham); o servidor responde 303 →
    sucesso volta a `/`, erro a `/?e=1` (a tela mostra "Senha incorreta" e
    limpa a URL). 401 continua sendo senha errada de verdade.
  - `/api/gate` aceita os 3 formatos (JSON `{h}`, urlencoded `h`, e JSON
    `{password}` para os scripts de QA) — todos no mesmo cookie httpOnly 24h.
  - A abordagem do link mágico `/?k=` foi descartada (senha na URL).
- QA: fluxos HTTP no build local + e2e em browser (hash, fallback nativo, URL
  limpa, app abre) + regressão 33/33 + v6 17/17 + tsc/build limpos.

## Demo v3 narrado — voz neural + avatar Vera + cobertura F01–F14 (somente tooling)

- **Narração executiva PT-BR** (edge-tts `pt-BR-FranciscaNeural` +2%): 11 capítulos,
  1 TTS por frase (cache por hash), respiros determinísticos 400ms entre frases /
  700ms entre capítulos, loudnorm 2 passadas −16 LUFS. Áudio-first: o vídeo se
  ajusta à fala (freeze/cortes; aceleração leve ≤1,35× — NUNCA nos caps 5 e 8,
  timeline e Plano Ideal, onde o vídeo rege).
- **Avatar "Vera"** (apresentadora fictícia estilo private banker, 2D vetorial
  gerada em código — `demo/narrate/avatar_layers.mjs`): 4 bocas com lip-sync por
  envelope RMS (janela 40ms = 1 frame, média móvel 3, histerese nos limiares),
  piscadas a cada 3–5s e micro-inclinação por frase com `seed=42`; lower-third
  "Vera · Projeto Vision"; posição por capítulo (não cobre KPIs/curva/racional).
- **Legendas queimadas** = a própria frase narrada (o vídeo comunica sem som);
  card de fechamento com logo; H.264 CRF 19 + AAC 192k + faststart (PowerPoint).
- **Cobertura provada**: `docs/DEMO_COVERAGE.md` gerado com timestamps reais —
  14/14 features (F14 Motor coberto na narração do fechamento). 6 takes novos:
  perfil, vida financeira, KPIs/modal, cenário+premissas, EN↔PT+Recentes,
  aprovação+oportunidades. Critérios de aceite verificados no fim do build
  (duração ≤120s, loudness ±1, lip-sync fechado no fim das frases, streams).
- Scripts: `npm run demo:narrate` (sobre takes existentes) e `npm run demo:v3`
  (ponta a ponta). Saída: `demo/out/demo_vision_v3_narrado.mp4` (104,8s) — cópia
  em `OneDrive\Desktop\Project Vision`. O corte mudo v8 continua intacto.

## Demo v8 — vídeo atualizado com a jornada completa (somente tooling, sem mudança no app)

- `demo/storyboard.json` + `demo/record.mjs` reescritos: 10 cenas (~63s) cobrindo
  todas as features do backlog — gate de senha (digitação mascarada ao vivo),
  "Por que planejar?", wizard de dados, objetivos, timeline v6 (lanes + drag por
  pixels, a geometria antiga por rótulos de ano não existe mais), marco da
  aposentadoria, peer insights, planos A/B/C + Resumo dos Planos, Plano Ideal
  com a BIA e Entrega com cross-sell explicável (origem dos sinais).
- Cena do gate grava SEM cookie (demonstra o fluxo real); as demais autenticam
  via `golden/gate-helper.mjs` (senha só em env, nunca no repo).
- Saída: `demo/out/demo_vision.mp4` (1080p, 63,3s) — cópia em
  `OneDrive\Desktop\Project Vision`.

## v7 — Eventos da timeline → Oportunidades de cross-sell (merged em `main`, em produção)

- **Auditoria primeiro** (`docs/AUDIT_CROSS_SELL.md`): a matriz provou que a
  timeline era invisível para o cross-sell (14 fontes ausentes, 4 parciais);
  a implementação cobriu SÓ os gaps — as 10 regras existentes ficaram intactas
  (com testes de regressão novos).
- **B1 — eventos → sinais** (`lib/cross-sell-events.ts`, determinístico):
  entrada grande → alocação da entrada (+ sucessão quando herança × gap);
  saída planejável → poupança programada com aporte do MOTOR (TVM, rota do
  solveGoal) ou financiamento planejado/consórcio quando próximo e não cabe na
  sobra; educação consolida evento+objetivo numa oportunidade só (origens
  listadas); abrir negócio → funding + revisão de proteção; viagem → câmbio só
  acima do limiar; evento pós-aposentadoria → revisão de desacumulação citando
  `anoEsgotamento` do motor; custom nunca ignorado.
- **B2 — plano → sinais**: objetivo sem funding → aporte programado;
  esgotamento → renda vitalícia; suitability × alocação divergente →
  realocação; titularidade concentrada + sucessão → planejamento sucessório.
- **B3 — pertinência/ranqueamento** (`lib/cross-sell-config.ts`, confirmado
  com o negócio): limiar 20% da renda anual; janela de 5 anos com decaimento
  linear; score de evento explicável (fit + proximidade + valor relativo);
  consolidação por produto com origens mescladas; teto de exibição 5 +
  "ver todas"; lista vazia honesta preservada.
- **B4 — UI/payload**: cada card mostra a ORIGEM do sinal ("derivada do
  evento: Venda de imóvel · 2031" / "derivada do plano: gap de proteção");
  racionais viraram templates ICU com slots numéricos formatados por locale
  (EN/PT em paridade); o JSON do CRM ganhou `origemSinal` por oportunidade.
- QA: 19 testes nomeados por regra; 156 testes totais; golden INALTERADO
  (cross-sell não toca a projeção); 7/7 checks de navegador; grep de
  aritmética em components/ limpo. Bugfix pego pelos testes: dupla divisão
  por 12 no aporte programado (subestimava 12×).

## v6 — Timeline redesenhada + Gate de senha (branch `feature/v6-timeline-gate` — em validação, sem deploy)

### Parte A — Redesign da faixa de eventos (referência: timeline_vision.jsx)
- **Lanes**: eventos empacotados na primeira camada livre (gap 14px) — zero
  sobreposição de labels com 22+ eventos (verificado por colisão de bounding
  boxes); a faixa cresce em altura conforme as lanes; **reorganização AO VIVO
  durante o arrasto** com transição de 180ms (`prefers-reduced-motion`
  respeitado).
- **Chips ricos**: ícone temático em quadrado colorido (presets existentes) +
  nome + ano + seta de direção (entrada verde ↓ / saída laranja ↗); conectores
  SVG finos até o ponto no eixo, com realce no selecionado.
- **Marco**: badge vermelho Bradesco com bandeira e guia tracejada — a
  Aposentadoria continua sendo a ÂNCORA REAL (clamps retMin/retMax e
  recálculo ao vivo preservados); clique abre painel do marco com slider de
  idade.
- **Régua adaptativa** (passo 1/2/5/10 com ≥46px) + marca de "hoje" + **scroll
  horizontal honesto** (MIN_PX_PER_YEAR=16, ResizeObserver).
- **Painel de edição inline** no layout da referência (cabeçalho colorido,
  fechar no X, Remover em vermelho-claro): nome, toggle Saída/Entrada, valor,
  ano com range slider + input sincronizados, e os campos do protótipo
  preservados (Recorrente + duração).
- **Interações**: pointer capture com snap por ano; tap (≤4px) seleciona;
  teclado ←/→ ±1, Shift ±5, Enter/Espaço, Delete; aria-labels com valor
  formatado; foco visível.
- **VIS-607 habilitado**: o horizonte da faixa vai até a longevidade do caso e
  eventos podem viver na fase de usufruto (o motor já projetava ambas as
  fases; a trava da UI v1 foi removida).
- Dados/Regra Zero intactos: o JSX era referência de UI; eventos vêm do store,
  recálculo via motor por rAF (ghost), formatação pelo i18n do app, strings em
  `messages/*` com paridade EN/PT. Tipografia global mantida (ponto a
  confirmar nº 1 — Fraunces/Hanken só com decisão app-wide).

### Parte B — Gate de senha (tela preta antes de tudo)
- `proxy.ts` (Next 16 renomeou middleware → proxy): sem cookie, páginas são
  reescritas para `/gate` (nenhum HTML do protótipo servido) e TODAS as APIs
  respondem 401. Senha só em `GATE_PASSWORD` (env local + Vercel); cookie
  httpOnly/sameSite=lax/Secure-em-https com token SHA-256 não-reversível,
  24h. Sem a env o gate fica desarmado (fail-open documentado). Login do
  advisor permanece DEPOIS do gate (camadas distintas). **Gate de
  demonstração** — não é autenticação de produção (nota no README).
- Scripts de QA e da demo autenticam via `golden/gate-helper.mjs` (lê
  env/.env.local; a senha não existe hardcoded no repo).

### QA v6
- 17/17 checks novos (gate no navegador; zero-sobreposição com 22 chips;
  lane reorganizando DURANTE o drag; slider+input sincronizados; Remover;
  painel do marco; evento pós-aposentadoria sem NaN) + **zero regressão**:
  33/33 da bateria geral e 17/17 da v5 sobre a timeline nova; 137 testes;
  golden de paridade inalterado; bench 0,57 ms.

## v5 — Peer insights + Comparação de planos (branch `feature/v5-peers-cenarios` — em validação, sem deploy)

### Feature 1 — Modal de evento customizado com sugestões de peers
- "+ Evento customizado" agora abre um modal grande com duas abas (padrão ALTO):
  **Sugestões para você** (default) — "O que pessoas como você estão
  planejando?", chips derivados do caso real (faixa etária, renda, composição,
  segmento), carrossel de cards com estatística-âncora ILUSTRATIVA, proposta
  personalizada calculada LOCALMENTE sobre a renda do caso (65% do salário
  anual, 4× renda anual, valor típico do segmento), prova social do dataset e
  seleção múltipla → eventos pré-preenchidos na timeline (curva reage na hora);
  **Criar do zero** — formulário completo (nome, categoria, fluxo, valor com
  steppers e eco do total, único/recorrente, **ano + mês**, duração, vínculo a
  objetivo) com dica de peer por categoria, dismissível.
- Arquitetura honesta: `PeerInsightsProvider` atrás de interface;
  `MockPeerInsightsProvider` lê um dataset JSON curado (10 insights × valores
  por segmento) — trocar pela base anonimizada real não toca a UI. Tudo local;
  nenhum dado sai do app; **nenhuma chamada de IA nesta versão** (Regra Zero).
- Motor: eventos com `month` explícito fluem até o loop mensal (C1); default
  continua dezembro (paridade v2 — golden inalterado).

### Feature 2 — Planos A/B/C + modal "Resumo dos Planos"
- **Variantes de caso**: duplicar o caso vivo como plano colorido (A azul ★
  referência, B verde, C laranja, D roxo; limite 4), alternar pelos chips,
  editar cada um de forma independente (deep copy; sessão local — o save no
  banco continua levando só o plano ativo).
- **Motor**: `summarize(case)` → KPIs comparáveis (ano/patrimônio na
  aposentadoria, ano de esgotamento, renda média mensal no usufruto, gap anual
  vs despesas essenciais, herança na longevidade) e `compare(ref, outros)` com
  deltas — funções puras derivadas de `project()`, 7 testes novos.
- **Modal de comparação** (padrão Plan Summary da ALTO): colunas lado a lado
  com chip colorido e badge de referência; número grande do patrimônio com
  alerta vermelho "esgota em YYYY"; renda média e gap (verde "Sem gap" /
  vermelho) com deltas ▲/▼ vs referência; herança; **próximos passos derivados
  deterministicamente por templates de regra** (recebimento futuro,
  compromisso recorrente, gap, esgotamento, objetivo em risco + stress test
  padrão) com adição manual e checkboxes visuais; "definir como referência";
  selo de valores ilustrativos.
- QA: 17/17 checks novos de aceitação (incl. personalização provada: mesmo
  card → R$ 131k para Camila vs R$ 162k para Fernanda) + regressão 33/33 +
  137 testes + golden de paridade inalterado.

## Vision Engine + integração (branch `feature/vision-engine` — em validação, sem deploy)

### Fase A — motor de cálculo padrão CFP (`engine/`)
- Pacote TypeScript puro, zero dependência de UI: TVM 5 variáveis (BEG/END,
  bisseção robusta), conversões geométricas (BR — nunca nominal/12), Fisher
  exato, growing annuities (incl. g = r), projeção MENSAL com saída anual
  (eventos com ano+mês, 13º via `mesesPorAno`), regras Vision (reserva,
  sucessão, aposentadoria em 3 métodos com INSS abatendo a renda-alvo),
  `solveGoal` (PMT + ano viável), `idealPlan` determinístico, Price/SAC com
  taxa efetiva mensal, `CaseStore`. Premissas ilustrativas concentradas em
  `engine/assumptions.ts`.
- **Regra Zero**: a LLM não calcula nada. `engine/validator.ts` (whitelist,
  endurecido contra TOCTOU/prototype-poisoning/números em strings) só admite
  proposta ESTRUTURAL da BIA; 100% dos números exibidos saem do motor.
- 129 testes (âncoras HP-12C tol. 1e-6, invariantes, property-based 50 cases,
  validador com payloads maliciosos, regressões da revisão adversarial
  multi-agente — incl. 2 P0 reais corrigidos: serviço de dívida na
  desacumulação agora é sacado do patrimônio, e `mesesPorAno < 12` honrado).
  Bench: ~0,36 ms/projeção de 65 anos (gate < 5 ms).

### Fase B — integração invisível
- Toda aritmética de juros/projeção do front migrou para o engine via
  `lib/engine/adapter.ts` — os componentes seguem chamando as MESMAS funções
  (`projectPlan`, `goalFundedPct`, `annuityFactor`…), agora engine-backed.
- Paridade auditada por golden values (3 cases de referência): tudo dentro de
  ±R$1/±0,1% exceto 7 deltas legítimos da capitalização mensal, documentados
  (PARITY_NOTES.md) e pinados contra regressão (golden/accepted-deltas.json).
- "Plano Ideal com a BIA" agora cumpre a Regra Zero de ponta a ponta: a API
  devolve só estrutura → validador whitelist → `engine.idealPlan` → sliders; o
  racional virou template i18n interpolado com os números do motor (a única
  mudança de comportamento visível — exigida pelo spec).
- Entregues: INVENTORY.md, PARITY_NOTES.md, BACKLOG.md, golden/ (captura +
  paridade + smoke). Produção intocada — tudo local na branch.

## Demo-video pipeline (~36s, silent, PowerPoint-ready)
- `npm run demo` records the six storyboard scenes with Playwright (fresh context per
  scene seeded from localStorage fixtures, fake cursor overlay, slow human-like drags so
  the curve visibly reacts DURING the drag) and assembles `demo/out/demo_vision.mp4`
  with ffmpeg (per-scene cuts from timing marks, mild speed-up only on the tour scenes
  — wizard 2.1×, goals 1.65× — brand cards, 0.3s fades, 1080p H.264 `yuv420p`, no
  audio). Scenes: why-plan → pre-filled wizard → goals registration (3 mandatory locked
  goals + adding one from the menu) → live life-event drag → retirement drag → Plano
  Ideal. Each scene gets an executive caption overlay (texts in the storyboard's
  `caption` field, rendered to transparent PNGs at build time). All pacing lives in
  `demo/storyboard.json`. Invisible `data-testid`s were added to the components the
  script drives.

## v2 — Live timeline, "Plano Ideal" (BIA) & QA sweep

Evolves the FP prototype with the three demo-defining changes (dynamic event
timeline, the "Por que planejar?" opener, and the AI "Plano Ideal" button) plus
a full bug/UI pass and the transversal domain rule. Each phase is a reviewable
commit on `main` (auto-deploys to Vercel).

### Major change 1 — Dynamic life-events timeline
- New `LifeEvent` model (`outflow`/`inflow`, one-time or recurring) on
  `plan.lifeEvents`; the projection (`lib/calc.ts project()`) is now
  **event-aware** (a per-year inflow/outflow map). With no events the numbers are
  identical to before.
- `components/charts/wealth-timeline.tsx`: a draggable events track aligned to the
  wealth chart's x-axis. **Drag a chip → a dimmed ghost curve recomputes every
  animation frame → commit on drop.** A draggable **retirement anchor** shifts the
  accumulation→decumulation boundary live. Keyboard (←/→/Enter/Delete) + an inline
  editor (year / amount / direction / remove) for accessibility; a preset palette
  (buy property, car, trip, education, wedding, child, renovation, business, sell
  property, inheritance, bonus, + custom) to drop events.
- v1 scope: events live in the accumulation phase, so the success-probability and
  income-gap KPIs stay correct.

### Major change 2 — "Por que planejar?" opening screen
- New `components/engine/why-plan.tsx`, shown **once per session before the
  cadastro**. Four conversational accordion cards, a segment selector
  (Retail/Prime/Principal/Private) that retargets a **dynamic future-value
  example** (e.g. Prime R$1M at 65: start at 35 ≈ R$1.486/mo vs ≈ R$2.798/mo at
  45), and a CTA "Começar meu plano" that opens the wizard.
- Non-persisted `introSeen` store flag gates it.

### Major change 3 — "Plano Ideal com a BIA"
- One button calls Claude to set all four plan parameters to fund the goals,
  then **animates the sliders current→ideal** and shows a **"Racional da BIA"**
  card explaining the plan.
- New server route `app/api/plano-ideal/route.ts` on the most-capable **real**
  model `claude-opus-4-8` (env `PLANO_IDEAL_MODEL`). Note: the spec's
  `claude-fable-5` is only a local Claude Code alias — the API rejects it — so we
  use the model it points to.
- **Privacy:** `buildPlanoIdealPayload` sends only anonymized numbers (no name,
  CPF, e-mail, DOB — never anything identifiable).
- **Guardrails:** every model value is clamped to the real slider limits; the
  contribution cap is the **free** surplus (surplus − goal contributions) so the
  ideal plan never over-allocates; strict-JSON parse with one retry, then a
  deterministic **offline heuristic** fallback (labelled "modo offline").

### Domain rule — the 3 mandatory goals
- Emergency Reserve, Retirement and Succession can now **never be removed**, only
  parameterized: a store guard makes `removeGoal` a no-op for them, the delete
  control becomes a lock, they're removed from the "add goal" menu, and they
  **self-heal** (a deleted one is re-merged on the next Goals-step / workspace
  entry) without duplicating or wiping custom goals.

### QA sweep (no P0 found; P1 + quick P2 fixed)
- `ASSET_CLASSES` now covers all nine classes — vehicle/exterior/FGTS no longer
  turn the composition into `NaN` and vanish from the donut.
- Retirement-age slider no longer collapses when the usufruct age ≤ current age.
- Income/Expense/Net-worth steps select their store actions (no `getState()` in
  render); net-worth lists get empty states; engine calls are wrapped so a
  rejected projection can't become an unhandled rejection.
- Changing a suitability answer clears the stale computed profile/score/flags.

### Final review pass
A multi-agent adversarial review over the whole v2 diff confirmed the projection
is **byte-identical with no life events** (22,680-combo sweep, 0 diffs) and i18n
is at full EN/PT parity. Fixes from it: the timeline now tears down its drag
listeners + pending animation frame **on unmount** (plus a `pointercancel` path
and a tap-vs-drag guard on the retirement anchor so a click no longer forces a
custom scenario); the Plano Ideal tween cancels cleanly (no racing tweens, and
no redundant retry when the API key is absent); the ghost curve merges **by
year** (robust to a changing horizon); and the retirement marker derives from the
clamped age.

---

## Earlier — Server-side persistence on Neon
- Replaced the browser-side Supabase access with a **server-only Neon Postgres**
  layer (`/api/scenarios` + `lib/db/*`, raw SQL over `@neondatabase/serverless`).
  Fixes the opaque "Não foi possível salvar"; saved plans are scoped per user
  (the advisor's name), survive a refresh/redeploy, and no DB credential ships to
  the browser. See the README "Scenario persistence (Neon Postgres)" section.
