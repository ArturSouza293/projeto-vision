# PARITY_NOTES — deltas legítimos da migração anual → mensal (Fase B)

> Tolerância de paridade: ±R$ 1,00 ou ±0,1% (o maior). Os desvios abaixo são
> **esperados e corretos** — consequência do motor projetar com capitalização
> MENSAL (C1/C2, convenção CFP) onde o app v2 usava um loop ANUAL. Cada um está
> pinado em `golden/accepted-deltas.json`: o teste de paridade continua
> guardando esses caminhos contra regressões FUTURAS (o valor novo vira a
> referência, não um cheque em branco).
>
> Tudo que NÃO está nesta lista bateu dentro da tolerância — em particular:
> probabilidade de sucesso, duração da aposentadoria, espólio, objetivos
> atingíveis, checkpoints 70/100 e o Plano Ideal heurístico.

## Causa 1 — aportes capitalizam mês a mês (antes: aporte anual no fim do ano)

O loop v2 fazia `wealth = wealth×(1+r) + aporteAnual` (aporte único no
fim do ano). O motor adiciona o aporte TODO MÊS (END), que rende os meses
restantes do ano — FV maior, como numa carteira real.

| Caminho | Antigo (anual) | Novo (mensal) | Δ |
|---|---|---|---|
| `simples.kpis.wealthAtRetirement` | 1.244.179 | 1.254.547 | +0,83% |
| `simples.curve.y5.wealth` | 316.740 | 317.900 | +0,37% |
| `simples.curve.y10.wealth` | 437.360 | 439.717 | +0,54% |
| `simples.curve.atRetirement.wealth` | 1.152.826 | 1.161.040 | +0,71% |
| `simples.kpis.incomeGap` | −5.764 | −5.714 | derivado do patrimônio acima |

## Causa 2 — saques mensais na desacumulação (antes: saque anual único)

O v2 sacava o gap do ano inteiro de uma vez, depois do rendimento anual. O
motor saca 1/12 do gap por mês — o dinheiro sai mais cedo, rende menos dentro
do ano (e é como a renda de aposentadoria funciona de verdade).

| Caminho | Antigo | Novo | Δ |
|---|---|---|---|
| `completo.curve.atRetirement.wealth` | 121.329 | 118.148 | −2,6% |
| `sobra-negativa.curve.atRetirement.income` | 900 | 868 | saque limitado pelo patrimônio, que esgota um pouco antes no fluxo mensal |

## O que foi preservado de propósito (zero delta)

- KPIs de anuidade (probabilidade, lacuna de renda, % de objetivo financiado)
  mantêm a convenção ANUAL do v2 — a aritmética migrou para o
  `engine/mathcore` (mesma fórmula, mesma resposta), só a fonte mudou.
- Eventos de vida continuam aplicados no FIM do ano (adapter manda `mes: 12`),
  espelhando o v2.
- A linha de renda/necessidades do gráfico segue a semântica de exibição do v2
  (renda constante na acumulação; eventos não poluem a linha).
- Passivos seguem fora da curva de patrimônio (como no v2); o serviço de
  dívida continua entrando na sobra mensal.
