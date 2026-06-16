# Motor Vision — Auditoria Live + Roadmap V2

**Data:** 2026-06-16 · **Alvo do teste live:** `https://aantonon.me/api/engine` (app → proxy → motor no Railway)
**Método:** (1) bateria live de capacidades e erros nas 5 ferramentas; (2) auditoria orquestrada de 33 arquivos `.py` em 10 grupos de módulos, com verificação adversarial; (3) confirmação manual dos achados de alta severidade lendo o código-fonte.

> **Nota de método:** a fase de verificação adversarial apanhou de *rate-limit* da API e vários veredictos não fecharam. Os achados **ALTA** e os **live-reachable** foram **reconfirmados manualmente** lendo o código (`money.py`, `tvm.py`, `cashflow.py`, `amortizacao.py`, `loader.py`, `objetivos.py`, `api.py`). As severidades abaixo são as **calibradas por mim**, não as brutas dos auditores.

---

## 1. Veredito executivo

**O motor está correto e robusto onde calcula.** Em toda a bateria live (IRPF, IR renda fixa, ganho de capital, CDB líquido, aporte) os números batem com a legislação BR, as fronteiras de faixa estão certas, e ele aguentou stress de 10¹² e 8.000 anos sem crash nem perda de precisão Decimal. **Não encontrei nenhum erro de cálculo tributário.**

Os achados são de **robustez, validação e cobertura** — não de matemática errada. Dois deles **afetam o app hoje** (chegam pela API); o resto é dívida de robustez de biblioteca que passa a importar conforme o motor cresce.

Um **tema sistêmico** concentra a maior parte do valor: **tratamento de erro**. Vários caminhos levantam exceções cruas do Python (`LookupError`, `DivisionByZero`, `KeyError`, `ValueError`) que **não** são `EngineError`, então viram **HTTP 500 opaco** (`detail:null`) em vez do erro estruturado 422 que o contrato promete. Um único ajuste (handler global + erros estruturados) elimina a maioria dos achados ALTA de uma vez.

---

## 2. Teste live no `aantonon.me` — capacidades ✅

| Ferramenta | Casos exercitados | Resultado |
|---|---|---|
| `irpf_mensal` | isenção ≤R$5k=0; 6k=473,41; 7,35k=1.112,52; 10k=1.841,27; 50k=12.841,27; base 1e9 | ✅ tabela + redutor + topo 27,5% coerentes, sem overflow |
| `ir_renda_fixa` | 22,5% (≤180d) / 20% (≤360) / 17,5% (≤720) / 15% (>720); LCI/LCA/poupança isentos | ✅ alíquota regressiva e isenção corretas |
| `ganho_capital` | 1M→150k (15%); 6M→925k; 40M→7,875M (progressivo marginal) | ✅ faixas 5/10/30M corretas |
| `cdb_liquido` | 100k/120%/2a→31.914,09; curto 20d com IOF | ✅ ordem IOF→IR correta |
| `aporte_objetivo` | normal=2.146,23; taxa=0→3.750 (limite); VP>VF→0 (clamp); meses=1 | ✅ defensivo nos limites |
| validação | base≤0, dias=0, campo extra, data malformada | ✅ erro estruturado `OUT_OF_RANGE` |
| forward-fill | data futura (2030) usa `irpf@2026-01-01` | ✅ recalcula o futuro corretamente |
| stress | base 1e9, valor 1e12, meses 100.000, rendimento 0,005 | ✅ sem crash, Decimal preciso |

**Conclusão da Parte 1:** capacidades e exatidão **aprovadas**.

---

## 3. Achados que **afetam o app hoje** (chegam pela API) — prioridade máxima

### 🔴 A1 — Data fora da cobertura vira erro opaco (`detail:null`) em vez de 422 estruturado
- **Reproduzido live:** `irpf_mensal` com `data_referencia=2025-12-31` e `cdb_liquido` em `2018` → `{"error":"engine-error","detail":null}`.
- **Raiz (confirmada):** `params/loader.py:61` levanta `raise LookupError(...)` — exceção **crua**. `api.py:55` só captura `EngineError` → tudo o mais vira **500 opaco**; o proxy traduz para `detail:null`.
- **Impacto:** qualquer data anterior ao YAML mais antigo (IRPF só tem vigência a partir de 2026-01) devolve um erro sem causa. O app/BIA não sabe *por que* falhou. (Datas futuras funcionam por forward-fill; data malformada já dá erro limpo — só o "passado sem parâmetro" vaza.)
- **Correção V2:** `load_params` levanta `ParamMissing` (subclasse de `EngineError`) nomeando o range disponível (ex.: *"sem parâmetros 'irpf' antes de 2026-01-01"*) → vira 422 estruturado. **Combina com A2.**

### 🔴 A2 — Sem handler global de exceção: qualquer erro não-`EngineError` vira 500 opaco
- **Raiz (confirmada):** `api.py:53-58` só mapeia `EngineError → 422`. Não há `@app.exception_handler` para o resto. Logo `LookupError`, `DivisionByZero`, `KeyError`, `ValueError` etc. escapam como 500 sem corpo estruturado.
- **Correção V2:** adicionar um handler global em `api.py` que capture `Exception`, logue, e responda **422/500 com envelope de erro padronizado** (`{erro, detalhe, tipo}`). É o **maior multiplicador**: sozinho transforma ~10 achados "exceção crua" em respostas estruturadas.

### 🟠 A3 — Produto de renda fixa desconhecido/typo é **tributado em silêncio**
- **Reproduzido live:** `produto="FOOBAR"`, `""`, `"CRA2"` → tributados a 17,5% **sem aviso**. (Case já é tratado: `lci`/`Lci`/`LCA`/`POUPANCA` → isento ✅.)
- **Raiz (confirmada):** `tax/ir_investimentos.py:32-34` — `is_isento_pf` é binário (`upper() in isentos_pf`); o caller faz `ir = 0 if isento else tributa`. **Não há terceira via** "produto desconhecido", nem whitelist de tributáveis. `contract/models.py:48` usa `produto: str` livre (contraste com `previdencia.py`, que usa `Literal["PGBL","VGBL"]` e **rejeita** desconhecido).
- **Risco real:** um isento digitado errado (`"LCI "`, `"LCA-IPCA"`, `"CRA2"`, `"debênture incentivada"`) é **tributado indevidamente** → recomendação errada ao cliente.
- **Correção V2:** trocar `produto` por `Literal[...]`/enum validado (como previdência), ou `classificar_produto → {isento|tributavel|raise PRODUTO_DESCONHECIDO}`. Normalizar `strip().upper()`. Conferir que a whitelist isenta cobre **CRI, CRA, LIG, debênture incentivada** (já estão no YAML — bom).

---

## 4. Achados **latentes** (funções de biblioteca / não expostas hoje) — por tema

Importam à medida que o motor expõe novas ferramentas. Agrupados pela causa-raiz.

### Tema B — *Fail-silent*: número fabricado sem erro (perigoso num motor "auditável")
| Achado | Arquivo | Sev. | Correção V2 |
|---|---|---|---|
| `irr([])` retorna **−99,9999%** como se fosse TIR válida | `core/cashflow.py:41` | média‑alta | exigir ≥2 fluxos com troca de sinal; senão `EngineError` |
| `mtir()` só com fluxos negativos retorna **−100%** | `core/cashflow.py:94` | média‑alta | guard simétrico `vf_positivos==0 → EngineError` |
| `americano(n=0/n<0)` devolve **tabela vazia** fingindo sucesso | `core/amortizacao.py:72` | média | validar `n≥1` nas três (price/sac/americano) |
| TIR real < −99,9999% é reportada como "não-convencional" (bracket só expande p/ cima) | `core/cashflow.py:44-49` | baixa | expandir limite inferior ou separar a mensagem de erro |

### Tema C — Tratamento de erro cru → 500 (some com o handler A2, mas ideal validar na origem)
| Achado | Arquivo | Sev. |
|---|---|---|
| `meses=0` → `DivisionByZero` cru (API barra por `gt=0`; alcançável internamente) | `planning/objetivos.py:28` | média |
| `pmt_de_vp`/`taxa_equivalente`/`taxa_real(infl=−1)` → `DivisionByZero`/`InvalidOperation` cru | `core/tvm.py` | média/baixa |
| `sac/price(n=0)` → `DivisionByZero` cru | `core/amortizacao.py:54` | média |
| `iof_aliquota` → `KeyError` se um dia faltar no YAML | `tax/iof.py:20` | baixa |
| `irr/mtir` usam `ValueError` genérico (não `EngineError`) | `core/cashflow.py` | baixa |

### Tema D — Valores não-finitos entram no caminho de cálculo
| Achado | Arquivo | Sev. | Correção V2 |
|---|---|---|---|
| `D("NaN")`/`D("inf")` **passam** (só `float` é barrado) → contaminam tudo | `core/money.py:31-33` | média* | `if not d.is_finite(): raise OutOfRange` |

\* As 5 ferramentas expostas estão protegidas porque o Pydantic (`gt=0`/`ge=0`) rejeita NaN/Inf; é gap de **biblioteca**.

### Tema E — Parâmetros declarados-mas-mortos (falsa sensação de cobertura)
| Achado | Arquivo | Sev. | Correção V2 |
|---|---|---|---|
| Dedução **PGBL 12%** está no YAML mas **não é usada** em código nenhum | `tax/previdencia.py` + `params/previdencia.yaml:20` | média | implementar `beneficio_deducao_pgbl(...)` **ou** marcar `ativo:false` |
| Regime **progressivo** de previdência (IRRF 15%) anunciado no docstring/YAML mas **não implementado** | `tax/previdencia.py` | média | implementar reusando `irpf_anual`, ou remover a menção |
| Redutor IRPF (Lei 15.270) — coeficiente **não verificado** oficialmente (curva linear é placeholder) | `tax/irpf.py:56-58` | info | expor `redutor_calibrado:false` no envelope; trocar só a curva quando a Receita publicar |

> *Nota: nem previdência (PGBL/VGBL/progressivo) está exposta como ferramenta hoje — então não há recomendação errada ativa; é dívida de cobertura/auditabilidade.*

### Tema F — Fragilidade dos YAML (correção depende de ordem manual, sem schema)
| Achado | Arquivo | Sev. | Correção V2 |
|---|---|---|---|
| Tabela regressiva de previdência depende de ordem crescente; reordenar → alíquota errada **silenciosa** | `tax/previdencia.py:20` | média | ordenar no loader ou validar monotonicidade |
| Tabela regressiva de IR idem (fallback `[-1]` mascara YAML mal-formado) | `tax/ir_investimentos.py:15-21` | baixa | validar `[180,360,720,null]` na carga |
| `_all_sets()` faz parse *eager* e **cacheia**: 1 YAML malformado quebra **todos** os tipos | `params/loader.py:49-52` | média | validar schema por arquivo + erro estruturado na ingestão |
| Sem detecção de `(tipo, vigência)` duplicado — `max()` desempata arbitrário | `params/loader.py:64` | baixa | rejeitar duplicado na carga |

### Tema G — Validação de domínio faltante nas funções puras (entradas absurdas passam)
Base negativa→0 silencioso (`irpf`), `anos_acumulacao<0`→faixa máxima (`previdência`), `principal/n` negativos→tabela sem sentido (`amortização`), `pct_cdi` sem teto, `corridos<úteis` no CDB sem checagem, renda/patrimônio negativos (`planning`). **Correção V2:** guardas explícitas (`OutOfRange`) nas funções puras — não confiar só no Pydantic da borda, pois são reutilizáveis como biblioteca e por outras funções internas.

### Tema H — Monte Carlo / precisão (menores)
`prob_atingir_meta` vaza Decimal de 28 dígitos não quantizado; `n_simulacoes=0`→`ZeroDivisionError`; `anos≤0`→distribuição degenerada; `mu_real≤−1`→número complexo; percentil sem interpolação (viés de rank); `prec=28` mutado no import (frágil sob threads). **Correção V2:** quantizar saída, validar `n_simulacoes≥1` e `anos≥1`, contexto Decimal explícito.

---

## 5. Roadmap V2 sugerido (priorizado por impacto × esforço)

| Prioridade | Ação | Mata quais achados | Esforço |
|---|---|---|---|
| **P0** | **Handler global de erro em `api.py`** + `load_params` → `ParamMissing` estruturado | A1, A2, todo o Tema C, parte do H | **Baixo** (1 arquivo + 1 exceção) — **maior ROI** |
| **P1** | **Validação de domínio nas funções puras** (rejeitar não-finito, negativos, `n/meses/anos≤0`) com `EngineError` uniforme | Tema B, C, D, G | Médio |
| **P2** | **`produto` como `Literal`/enum** + classificação tri-estado (isento/tributável/desconhecido) | A3 | Baixo |
| **P3** | **Schema-validação dos YAML na carga** (monotonicidade, sentinela `null`, dias IOF 1–29, duplicados) | Tema F | Médio |
| **P4** | **Resolver params mortos**: implementar PGBL 12% + previdência progressiva, **ou** marcar `ativo:false`; flag de calibração no envelope | Tema E | Médio/Alto |
| **P5** | **Polimentos**: contexto Decimal explícito, quantização do Monte Carlo, interpolação de percentil | Tema H | Baixo |

> **Recomendação:** fazer **P0 primeiro** — é barato e elimina o `detail:null` que você já viu ao vivo, deixando o motor "honesto" nos erros. P1+P2 fecham o grosso do risco. P3+ são maturidade.

---

## 6. O que está **sólido** (não mexer) ✅

- **Regra Zero:** `D()` rejeita `float`; `Decimal**float` também levanta `TypeError`. Caminho de cálculo é Decimal puro.
- **Arredondamento:** `brl()` com `ROUND_HALF_EVEN` (verificado: 2,675→2,68; 2,665→2,66).
- **Fronteiras tributárias corretas:** IR 180/360/720 com `<=`; IOF dia-30 (último tributado é o 29); ganho de capital 5/10/30M progressivo marginal.
- **Redutor IRPF** contínuo e monotônico nas duas bordas (R$5k→0; R$7,35k casa com a tabela cheia).
- **Limites bem tratados:** `i=0` e `VP>VF` no aporte; `g=i` no growing annuity; `i≤g` na perpetuidade.
- **Contrato:** `extra="forbid"`, `field_serializer` mantém `valor` como **string** (Decimal exato sobre JSON), `parametros_versao` auditável.
- **Forward-fill** de datas funciona; **auth** por `X-Engine-Key` ativa; previdência usa `Literal` e **rejeita** tipo inválido (padrão a replicar em `produto`).

---

## Apêndice — métricas da auditoria

- **Cobertura:** 33 arquivos `.py` + 6 YAML, em 10 grupos de módulos.
- **Orquestração:** 70 agentes (10 auditoria + verificações), ~2,3M tokens, ~5 min.
- **Achados:** ~45 (≈11 marcados ALTA pelos auditores; verificação adversarial e leitura manual recalibraram a maioria para média/baixa — só **A1/A2/A3** são live-reachable).
- **Caveat:** verificação adversarial parcial (rate-limit); ALTA e live-reachable reconfirmados manualmente no código.
