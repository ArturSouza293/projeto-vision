/**
 * Dataset curado de peer insights (v5 — mock honesto para protótipo).
 *
 * ⚠️ ESTATÍSTICAS ILUSTRATIVAS — fontes a validar com compliance antes de
 * qualquer uso externo. Decisão de produto (jun/2026): por ora os casos são
 * FICTÍCIOS (referências genéricas de web); no futuro uma ÁREA DEDICADA DE
 * INTELIGÊNCIA do banco alimenta estes dados — trocar a fonte = implementar
 * outro PeerInsightsProvider (a UI não muda).
 *
 * Títulos/textos vêm do i18n (`peer.cards.<id>.*`); aqui ficam os DADOS.
 */
import type { PeerInsight } from "./types";

export const PEER_INSIGHTS_DATASET: PeerInsight[] = [
  {
    id: "protecao-renda",
    perguntaTitulo: "protecao-renda",
    icone: "ShieldAlert",
    relevancia: { statDestaque: "1 em 8", statTexto: "stat" },
    sugestao: {
      templateTexto: "sugestao",
      calculo: "pctRendaAnual",
      parametro: 0.65, // cobertura de renda = 65% do salário anual
      valorPorSegmento: { retail: 40000, prime: 95000, principal: 180000, private: 420000 },
    },
    provaSocial: { de10: 8 },
    eventoTemplate: { presetKey: "custom", kind: "outflow", anosAteEvento: 1, recurring: false },
  },
  {
    id: "doenca-grave",
    perguntaTitulo: "doenca-grave",
    icone: "HeartPulse",
    relevancia: { statDestaque: "1 em 6", statTexto: "stat" },
    sugestao: {
      templateTexto: "sugestao",
      calculo: "multiploRendaAnual",
      parametro: 4, // reserva-extra de doença grave = 4× a renda anual (spec v5)
      valorPorSegmento: { retail: 30000, prime: 70000, principal: 140000, private: 350000 },
    },
    provaSocial: { de10: 7 },
    eventoTemplate: { presetKey: "custom", kind: "outflow", anosAteEvento: 2, recurring: false },
    alvo: { faixas: ["30-40", "41-55", "56+"] },
  },
  {
    id: "viagem-sonhos",
    perguntaTitulo: "viagem-sonhos",
    icone: "Plane",
    relevancia: { statDestaque: "6 em 10", statTexto: "stat" },
    sugestao: {
      templateTexto: "sugestao",
      calculo: "valorDataset",
      parametro: 1,
      valorPorSegmento: { retail: 18000, prime: 45000, principal: 90000, private: 220000 },
    },
    provaSocial: { de10: 6 },
    eventoTemplate: { presetKey: "travel", kind: "outflow", anosAteEvento: 3, recurring: false },
  },
  {
    id: "intercambio-filhos",
    perguntaTitulo: "intercambio-filhos",
    icone: "GraduationCap",
    relevancia: { statDestaque: "7 em 10", statTexto: "stat" },
    sugestao: {
      templateTexto: "sugestao",
      calculo: "valorDataset",
      parametro: 1,
      valorPorSegmento: { retail: 60000, prime: 120000, principal: 220000, private: 400000 },
    },
    provaSocial: { de10: 7 },
    eventoTemplate: { presetKey: "education", kind: "outflow", anosAteEvento: 6, recurring: false },
    alvo: { composicoes: ["familia"] },
  },
  {
    id: "reforma-casa",
    perguntaTitulo: "reforma-casa",
    icone: "Wrench",
    relevancia: { statDestaque: "5 em 10", statTexto: "stat" },
    sugestao: {
      templateTexto: "sugestao",
      calculo: "valorDataset",
      parametro: 1,
      valorPorSegmento: { retail: 50000, prime: 110000, principal: 200000, private: 450000 },
    },
    provaSocial: { de10: 5 },
    eventoTemplate: { presetKey: "renovation", kind: "outflow", anosAteEvento: 4, recurring: false },
    alvo: { faixas: ["30-40", "41-55", "56+"] },
  },
  {
    id: "ano-sabatico",
    perguntaTitulo: "ano-sabatico",
    icone: "Compass",
    relevancia: { statDestaque: "3 em 10", statTexto: "stat" },
    sugestao: {
      templateTexto: "sugestao",
      calculo: "pctRendaAnual",
      parametro: 0.8, // ~80% da renda anual para 1 ano fora
      valorPorSegmento: { retail: 60000, prime: 150000, principal: 300000, private: 700000 },
    },
    provaSocial: { de10: 3 },
    eventoTemplate: { presetKey: "custom", kind: "outflow", anosAteEvento: 5, recurring: false },
    alvo: { faixas: ["18-29", "30-40", "41-55"] },
  },
  {
    id: "festa-casamento",
    perguntaTitulo: "festa-casamento",
    icone: "Heart",
    relevancia: { statDestaque: "4 em 10", statTexto: "stat" },
    sugestao: {
      templateTexto: "sugestao",
      calculo: "valorDataset",
      parametro: 1,
      valorPorSegmento: { retail: 45000, prime: 90000, principal: 160000, private: 350000 },
    },
    provaSocial: { de10: 4 },
    eventoTemplate: { presetKey: "wedding", kind: "outflow", anosAteEvento: 2, recurring: false },
    alvo: { composicoes: ["solteiro", "casal"], faixas: ["18-29", "30-40"] },
  },
  {
    id: "imovel-lazer",
    perguntaTitulo: "imovel-lazer",
    icone: "Home",
    relevancia: { statDestaque: "2 em 10", statTexto: "stat" },
    sugestao: {
      templateTexto: "sugestao",
      calculo: "valorDataset",
      parametro: 1,
      valorPorSegmento: { retail: 250000, prime: 500000, principal: 900000, private: 2200000 },
    },
    provaSocial: { de10: 2 },
    eventoTemplate: { presetKey: "property_buy", kind: "outflow", anosAteEvento: 7, recurring: false },
    alvo: { faixas: ["41-55", "56+"] },
  },
  {
    id: "reserva-oportunidade",
    perguntaTitulo: "reserva-oportunidade",
    icone: "Briefcase",
    relevancia: { statDestaque: "4 em 10", statTexto: "stat" },
    sugestao: {
      templateTexto: "sugestao",
      calculo: "pctRendaAnual",
      parametro: 0.5,
      valorPorSegmento: { retail: 35000, prime: 80000, principal: 160000, private: 400000 },
    },
    provaSocial: { de10: 4 },
    eventoTemplate: { presetKey: "business", kind: "outflow", anosAteEvento: 3, recurring: false },
    alvo: { faixas: ["30-40", "41-55"] },
  },
  {
    id: "carro-eletrico",
    perguntaTitulo: "carro-eletrico",
    icone: "Car",
    relevancia: { statDestaque: "5 em 10", statTexto: "stat" },
    sugestao: {
      templateTexto: "sugestao",
      calculo: "valorDataset",
      parametro: 1,
      valorPorSegmento: { retail: 120000, prime: 220000, principal: 350000, private: 600000 },
    },
    provaSocial: { de10: 5 },
    eventoTemplate: { presetKey: "car", kind: "outflow", anosAteEvento: 2, recurring: false },
  },
];
