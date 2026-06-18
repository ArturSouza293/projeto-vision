/**
 * Fatos macro para EXIBIÇÃO (Selic, IPCA, teto INSS, …) — fonte única, com
 * **fonte + data**. NUNCA derivados de texto livre da BIA.
 *
 * Regra Zero (macro): um LLM sem ferramenta de dados ao vivo devolve valor
 * macro desatualizado/errado (foi o caso da "Selic de hoje vindo errada"). Todo
 * número macro exibido vem DAQUI; a BIA só lê/classifica/propõe estrutura.
 *
 * NOTA: estes valores são de EXIBIÇÃO e independem do motor determinístico
 * (`engine/assumptions.ts`), que continua a fonte dos CÁLCULOS — por isso este
 * módulo não altera `golden:check`. Valores marcados `confirmar` precisam de
 * verificação antes de produção (mesma disciplina de "não fabricar parâmetro").
 */

export interface MacroFact {
  /** chave estável (i18n / lookup) */
  key: string;
  /** rótulo curto (fallback pt-BR; a UI prefere i18n `macro.<key>`) */
  label: string;
  /** valor já formatado para exibição (ex.: "14,50% a.a.") */
  display: string;
  /** valor numérico bruto, quando aplicável (fração p/ taxas) */
  value: number | null;
  fonte: string;
  /** competência/data da fonte (ISO ou "YYYY-MM") */
  data: string;
  /** true = ainda não confirmado oficialmente (não usar em produção) */
  confirmar?: boolean;
}

/**
 * Fonte única dos macro para exibição. Selic alinhada ao param do motor
 * (`macro@2026-06`: selic_meta 14,50%). IPCA/teto INSS marcados p/ confirmar.
 */
export const MACRO_FACTS: Record<string, MacroFact> = {
  selic: {
    key: "selic",
    label: "Selic meta",
    display: "14,50% a.a.",
    value: 0.145,
    fonte: "Copom / Banco Central",
    data: "2026-06",
  },
  ipca12m: {
    key: "ipca12m",
    label: "IPCA (12 meses)",
    display: "≈ 4,8% a.a.",
    value: 0.048,
    fonte: "IBGE / Focus",
    data: "2026-06",
    confirmar: true,
  },
  cdi: {
    key: "cdi",
    label: "CDI",
    display: "14,40% a.a.",
    value: 0.144,
    fonte: "B3 / CETIP",
    data: "2026-06",
  },
  tetoINSS: {
    key: "tetoINSS",
    label: "Teto INSS",
    display: "R$ 8.157,41",
    value: 8157.41,
    fonte: "Portaria INSS",
    data: "2025-01",
    confirmar: true,
  },
};

/** Termos macro que NUNCA podem vir de texto livre da BIA (guarda de exibição). */
const MACRO_TERMS = [
  "selic",
  "ipca",
  "cdi",
  "igp-m",
  "igpm",
  "teto do inss",
  "teto inss",
  "inpc",
];

const PCT_OR_MONEY = /(\d{1,3}(?:[.,]\d+)?\s*%)|(r\$\s*[\d.,]+)/i;

/**
 * Detecta se um texto (tipicamente saída livre da BIA) AFIRMA um número macro
 * — ex.: "a Selic hoje é 15%". Usado para BLOQUEAR/sinalizar macro vindo da IA
 * antes de exibir. Macro deve sair de {@link MACRO_FACTS}, não da BIA.
 */
export function containsMacroClaim(text: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return MACRO_TERMS.some((term) => {
    const i = lower.indexOf(term);
    if (i < 0) return false;
    // janela de ~40 chars após o termo: há um % ou R$ afirmado junto?
    const janela = lower.slice(i, i + 40);
    return PCT_OR_MONEY.test(janela);
  });
}

/**
 * Higieniza texto da BIA para exibição: se afirma macro, substitui pela
 * orientação de consultar a fonte oficial (a UI mostra o macro de MACRO_FACTS).
 */
export function stripMacroClaims(text: string): string {
  if (!containsMacroClaim(text)) return text;
  return text.replace(
    new RegExp(`([^.]*\\b(?:${MACRO_TERMS.join("|")})\\b[^.]*\\.)`, "gi"),
    (frase) => (PCT_OR_MONEY.test(frase) ? "[valor macro consultado na fonte oficial] " : frase),
  );
}
