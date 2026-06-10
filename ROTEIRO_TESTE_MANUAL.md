# ROTEIRO_TESTE_MANUAL — Vision Engine (≈10 min, no localhost)

> Pré-requisito: `npm run build && npx next start -p 3010` (ou `npm run dev`)
> e abrir **http://localhost:3010**. Se o app já estiver aberto de uma sessão
> antiga, faça logout (ícone no canto superior direito) para começar limpo.
> Dica: troque o idioma para **PT** no seletor EN/PT do topo.

## Bloco 1 — Entrada e case existente

1. **Login**: digite seu nome e entre. Deve abrir a tela "Por que planejar?".
2. Expanda 2 cards do accordion e clique em **"Abrir personas"**.
3. Abra **Camila & Diego**. O workspace deve carregar com a curva, os 6 KPIs e
   a timeline embaixo do gráfico. ✅ *Esperado: nenhum "NaN", patrimônio na
   aposentadoria ≈ **R$ 1,25 mi** (era 1,24 — o motor mensal rende um pouco
   mais; ver PARITY_NOTES.md).*

## Bloco 2 — Os dois cenários-assinatura

4. **Compra de casa, 2 anos antes**: na paleta "Adicionar evento", clique em
   **Compra de imóvel** (chip cai em 2031) e feche o editor (✕). Arraste o
   chip para ~2040 e solte. Agora arraste **2 anos para a esquerda** (2038),
   devagar. ✅ *Esperado: uma curva-fantasma tracejada acompanha o arrasto EM
   TEMPO REAL e o vale do caixa se desloca; ao soltar, a curva firme assume e
   os KPIs atualizam.*
5. **Aposentadoria 10 anos antes**: arraste o marcador vermelho
   **"Aposentadoria · 2057"** para ~2047 e solte. ✅ *Esperado: recálculo ao
   vivo durante o arrasto; ao soltar, "Renda dura", "Probabilidade" e
   "Patrimônio na aposentadoria" pioram visivelmente (aposentar mais cedo
   custa caro).*
6. Arraste a aposentadoria de volta para ~2057. ✅ *KPIs voltam ao patamar
   anterior.*

## Bloco 3 — Plano Ideal (Regra Zero)

7. No cartão "Parâmetros de planejamento", clique **"✨ Plano Ideal com a
   BIA"**. ✅ *Esperado: loading com etapas → os sliders se movem sozinhos →
   card "Racional da BIA" com um texto que cita sobra, alocações por objetivo,
   IPCA+x% e idade — **todos os números vêm do motor** (a IA só propôs a
   estrutura).*
8. Confira: o **Aporte mensal** aplicado nunca excede a sobra, e o **Saldo
   livre** não fica negativo.
9. Clique **"Gerar novamente"** uma vez — deve produzir um plano consistente
   de novo (pode variar a estrutura, nunca estourar a sobra).

## Bloco 4 — Cliente novo do zero

10. Abra o menu ☰ → **"Criar do zero"** (ou feche o plano e use o botão da
    tela inicial). O wizard "Dados do cliente" abre no Perfil.
11. Preencha nome (ex.: "Maria Teste"), avance para **Renda** e adicione uma
    renda de **R$ 12.000**; em **Despesas**, adicione **R$ 7.000** (essencial);
    em **Patrimônio**, um ativo líquido de **R$ 50.000**. Avance até
    **Objetivos**. ✅ *Esperado: os 3 obrigatórios (Reserva 🔒, Aposentadoria 🔒,
    Sucessão 🔒) já estão lá com cadeado; os tiles mostram Sobra ≈ R$ 5.000.*
12. Adicione um objetivo **Educação** pelo dropdown e clique **Concluir**.
    ✅ *Workspace abre com curva e KPIs coerentes (sem NaN).*
13. **Abandono sem perda**: reabra **Dados**, mude o nome, FECHE no meio (✕ ou
    Esc), reabra. ✅ *O dado editado persistiu.*

## Bloco 5 — Robustez

14. Abra **Marcos** (endividado). ✅ *Sobra mensal NEGATIVA exibida em
    vermelho com o alerta de déficit; nada quebra.*
15. Em qualquer evento da timeline, abra o editor e digite um valor absurdo
    (999999999). ✅ *A curva se ajusta, sem NaN; remova o evento depois.*
16. Adicione ~10 eventos seguidos pela paleta e arraste um deles. ✅ *O arrasto
    continua fluido (medimos 61 fps com 24 eventos).*
17. Pressione **F12 → Console** e repita um arrasto. ✅ *Nenhum erro vermelho.*
18. Troque **EN ↔ PT** no topo. ✅ *Tudo traduzido, incluindo o racional da BIA
    (é template — regenerar no outro idioma).*

## Bloco 6 — v5: Peer insights + Comparação de planos

19. Com a **Camila** aberta, clique **"+ Evento customizado"** na paleta.
    ✅ *Abre um modal grande na aba "Sugestões para você", com chips do SEU
    caso (30–40 anos, renda ≈ R$ 16,8 mil/mês, casal, Prime) e um carrossel de
    cards com estatística-âncora ("1 em 8"…) e valores personalizados.*
20. Selecione **2 cards** e clique **"Adicionar ao plano (2)"**. ✅ *Dois
    eventos pré-preenchidos surgem na timeline e a curva reage na hora; os
    eventos são editáveis como qualquer outro.*
21. Abra **Dados → Renda** e aumente o salário em R$ 5.000; reabra o modal de
    evento customizado. ✅ *Os valores sugeridos dos cards MUDARAM (cálculo
    local sobre a renda do caso).* Na aba **"Criar do zero"**, crie um evento
    com mês específico e duração. ✅ *Entra na timeline normalmente.*
22. Clique **"Duplicar como plano"** (cria A + B), arraste a aposentadoria do
    plano B uns 10 anos para a esquerda e duplique de novo (C). Alterne entre
    A/B/C pelos chips coloridos. ✅ *Cada plano guarda seu próprio estado.*
23. Clique **"Comparar planos"**. ✅ *Modal "Resumo dos Planos" com colunas
    lado a lado: patrimônio na aposentadoria (com "esgota em YYYY" em vermelho
    quando aplicável), renda média/mês e gap essencial com deltas ▲/▼ vs a
    referência (A ★), herança, e "Próximos passos" derivados do conteúdo de
    cada plano (+ adição manual). Selo de valores ilustrativos no rodapé.*

## Bloco 7 — v6: Timeline redesenhada + Gate de senha

24. **Gate**: abra o site numa janela anônima. ✅ *Tela 100% preta com
    "Projeto Vision · Acesso restrito" e um único campo. Senha errada → "Senha
    incorreta" sutil; senha correta ("horizonte") → o protótipo carrega no
    login do advisor. As APIs também ficam atrás do gate.*
25. **Lanes**: com a Camila aberta, adicione 6+ eventos pela paleta. ✅ *Os
    chips se empilham em camadas SEM nenhuma sobreposição de nome; a faixa
    cresce em altura; cada chip tem ícone temático colorido, ano e seta de
    direção (verde ↓ entrada, laranja ↗ saída); conectores finos descem até o
    ponto no eixo; régua de anos adapta o passo e marca "hoje".*
26. **Reorganização ao vivo**: arraste um chip lentamente pela faixa. ✅ *Os
    chips trocam de camada suavemente DURANTE o arrasto (transição de 180ms)
    e a curva-fantasma reage junto, como sempre.*
27. **Painel inline**: clique num chip (sem arrastar). ✅ *Painel abre abaixo
    da faixa com cabeçalho colorido pelo tipo: nome, toggle Saída/Entrada,
    valor, Recorrente + duração, e ANO com slider + campo numérico
    SINCRONIZADOS; "Remover" em vermelho-claro exclui na hora.*
28. **Marco**: o badge vermelho "Aposentadoria · YYYY" no topo continua
    arrastável com recálculo ao vivo (âncora real); clique nele → painel do
    marco com slider de idade. ✅ *Limites de idade respeitados.*
29. **Pós-aposentadoria (novo)**: arraste um evento para DEPOIS do marco da
    aposentadoria. ✅ *O evento é aceito (o horizonte vai até a longevidade) e
    a fase de usufruto reage — saída acelera o consumo, entrada estende.*

## Se algo falhar

Anote o passo + o que apareceu (print ajuda) e me mande. **Nenhum push ou
deploy acontece antes do seu OK** — o fluxo combinado é: você aprova →
push da branch (gera Preview do Vercel, produção intocada) → você valida o
preview → merge para main só se você pedir.
