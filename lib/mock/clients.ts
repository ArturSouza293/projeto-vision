/**
 * Seed clients for Project Vision — fictitious but internally consistent
 * Brazilian personas drawn from the Vision persona set. Figures are illustrative
 * (BRL, monthly where noted). Extend or replace this file as the reference
 * database lands; the rest of the app only depends on the `Plan` shape.
 */

import type { Plan } from "@/lib/types";

/** Persona descriptor keys, resolved through the i18n catalogs. */
export const PERSONA_META: Record<string, { taglineKey: string }> = {
  marcos: { taglineKey: "persona.marcos.tagline" },
  aline: { taglineKey: "persona.aline.tagline" },
  "camila-diego": { taglineKey: "persona.camilaDiego.tagline" },
  fernanda: { taglineKey: "persona.fernanda.tagline" },
  "jose-carlos": { taglineKey: "persona.joseCarlos.tagline" },
  patricia: { taglineKey: "persona.patricia.tagline" },
};

const camilaDiego: Plan = {
  clientId: "camila-diego",
  clientProfile: {
    id: "camila-diego",
    firstName: "Camila",
    lastName: "Ribeiro",
    dateOfBirth: "1991-09-12",
    gender: "female",
    maritalStatus: "married",
    dependents: 0,
    hasPartner: true,
    partnerName: "Diego",
    employmentStatus: "clt",
    occupation: "Dual income — tech & marketing",
    email: "camila.ribeiro@example.com",
    phone: "+55 41 99876-1100",
    city: "Curitiba",
    state: "PR",
    taxResidency: "BR",
    cpfMasked: "***.***.214-**",
    pep: false,
    segment: "prime",
  },
  cashFlow: {
    incomes: [
      { id: "i1", label: "Salário líquido — Camila", monthly: 9000, kind: "salary" },
      { id: "i2", label: "Salário líquido — Diego", monthly: 7800, kind: "salary" },
    ],
    expenses: [
      { id: "e1", label: "Aluguel", monthly: 3000, category: "housing" },
      { id: "e2", label: "Custo de vida", monthly: 3000, category: "living" },
      { id: "e3", label: "Financiamento do carro (CDC)", monthly: 1200, category: "debt" },
      { id: "e4", label: "Estilo de vida e viagens", monthly: 3800, category: "lifestyle" },
    ],
  },
  netWorth: {
    assets: [
      { id: "a1", label: "Reserva — Fundo DI", value: 60000, assetClass: "cash", liquid: true },
      { id: "a2", label: "CDB / LCI", value: 60000, assetClass: "investments", liquid: true },
      { id: "a3", label: "Fundo Multimercado", value: 30000, assetClass: "investments", liquid: true },
      { id: "a4", label: "Previdência VGBL (casal)", value: 30000, assetClass: "pension", liquid: false },
      { id: "a5", label: "Fundo de Ações", value: 20000, assetClass: "investments", liquid: true },
    ],
    liabilities: [
      { id: "l1", label: "Financiamento do carro (CDC)", balance: 40000, kind: "auto", annualRate: 22 },
    ],
  },
  suitability: {
    answers: { horizon: 2, reaction: 2, experience: 1, stability: 2, objective: 2 },
    score: 60,
    profile: "moderate",
    flags: [],
  },
  goals: [
    { id: "g1", type: "property", label: "Apartamento próprio", targetAmount: 600000, targetYear: 2030, priority: "high", currentAmount: 60000, monthlyContribution: 2500 },
    { id: "g2", type: "emergency_reserve", targetAmount: 66000, targetYear: 2027, priority: "high", currentAmount: 60000, monthlyContribution: 0 },
    { id: "g3", type: "travel", label: "Viagem dos sonhos", targetAmount: 40000, targetYear: 2028, priority: "medium", currentAmount: 5000, monthlyContribution: 500 },
    { id: "g4", type: "retirement", label: "Independência financeira", targetAmount: 3000000, targetYear: 2050, priority: "medium", currentAmount: 80000, monthlyContribution: 2000 },
  ],
  scenarios: [],
  approvalStatus: "draft",
  events: [],
};

const fernanda: Plan = {
  clientId: "fernanda",
  clientProfile: {
    id: "fernanda",
    firstName: "Fernanda",
    lastName: "Azevedo",
    dateOfBirth: "1984-11-03",
    gender: "female",
    maritalStatus: "married",
    dependents: 2,
    hasPartner: true,
    partnerName: "Rafael",
    employmentStatus: "clt",
    occupation: "Médica",
    email: "fernanda.azevedo@example.com",
    phone: "+55 31 99712-4456",
    city: "Belo Horizonte",
    state: "MG",
    taxResidency: "BR",
    cpfMasked: "***.***.501-**",
    pep: false,
    segment: "principal",
  },
  cashFlow: {
    incomes: [
      { id: "i1", label: "Salário líquido — Fernanda", monthly: 14000, kind: "salary" },
      { id: "i2", label: "Salário líquido — Rafael", monthly: 6800, kind: "salary" },
    ],
    expenses: [
      { id: "e1", label: "Financiamento imobiliário (SAC)", monthly: 3000, category: "debt" },
      { id: "e2", label: "Plano de saúde + tratamento (filho)", monthly: 5000, category: "health" },
      { id: "e3", label: "Custo de vida", monthly: 5000, category: "living" },
      { id: "e4", label: "Escola (filho mais velho)", monthly: 2500, category: "education" },
      { id: "e5", label: "Estilo de vida", monthly: 3500, category: "lifestyle" },
    ],
  },
  netWorth: {
    assets: [
      { id: "a1", label: "Fundo DI / CDB", value: 80000, assetClass: "cash", liquid: true },
      { id: "a2", label: "CDB / LCI", value: 100000, assetClass: "investments", liquid: true },
      { id: "a3", label: "Previdência PGBL", value: 120000, assetClass: "pension", liquid: false },
      { id: "a4", label: "Fundo Multimercado", value: 60000, assetClass: "investments", liquid: true },
      { id: "a5", label: "Fundo de Ações", value: 40000, assetClass: "investments", liquid: true },
      { id: "a6", label: "Imóvel residencial (financiado)", value: 600000, assetClass: "real_estate", liquid: false },
    ],
    liabilities: [
      { id: "l1", label: "Financiamento imobiliário", balance: 350000, kind: "mortgage", annualRate: 10.5 },
    ],
  },
  suitability: {
    answers: { horizon: 2, reaction: 1, experience: 1, stability: 2, objective: 1 },
    score: 47,
    profile: "moderate",
    flags: ["flags.multipleDependents"],
  },
  goals: [
    { id: "g1", type: "protection", label: "Proteção: renda perpétua de saúde", targetAmount: 2000000, targetYear: 2026, priority: "high", currentAmount: 0, monthlyContribution: 0 },
    { id: "g2", type: "education", label: "Educação dos filhos", targetAmount: 800000, targetYear: 2034, priority: "high", currentAmount: 50000, monthlyContribution: 1500 },
    { id: "g3", type: "emergency_reserve", label: "Reserva (9 meses)", targetAmount: 171000, targetYear: 2028, priority: "high", currentAmount: 80000, monthlyContribution: 500 },
    { id: "g4", type: "retirement", label: "Aposentadoria", targetAmount: 4000000, targetYear: 2049, priority: "medium", currentAmount: 120000, monthlyContribution: 1000 },
  ],
  scenarios: [
    {
      id: "s1",
      name: "Cenário base",
      assumptions: { monthlyContribution: 1800, retirementAge: 60, expectedRealReturn: 4, inflation: 5, growthScenario: "custom" },
      createdAt: "2026-05-18T14:00:00.000Z",
    },
  ],
  selectedScenarioId: "s1",
  approvalStatus: "in_review",
  events: [],
};

const joseCarlos: Plan = {
  clientId: "jose-carlos",
  clientProfile: {
    id: "jose-carlos",
    firstName: "José Carlos",
    lastName: "Menezes",
    dateOfBirth: "1969-08-20",
    gender: "male",
    maritalStatus: "married",
    dependents: 0,
    hasPartner: true,
    partnerName: "Marta",
    employmentStatus: "clt",
    occupation: "Diretor (pré-aposentadoria)",
    email: "jc.menezes@example.com",
    phone: "+55 51 99654-7788",
    city: "Porto Alegre",
    state: "RS",
    taxResidency: "BR",
    cpfMasked: "***.***.330-**",
    pep: false,
    segment: "principal",
  },
  cashFlow: {
    incomes: [{ id: "i1", label: "Salário líquido", monthly: 22500, kind: "salary" }],
    expenses: [
      { id: "e1", label: "Custo de vida", monthly: 6000, category: "living" },
      { id: "e2", label: "Plano de saúde", monthly: 2500, category: "health" },
      { id: "e3", label: "Estilo de vida e viagens", monthly: 4500, category: "lifestyle" },
      { id: "e4", label: "Diversos", monthly: 2000, category: "other" },
    ],
  },
  netWorth: {
    assets: [
      { id: "a1", label: "Fundo DI / CDB", value: 225000, assetClass: "cash", liquid: true },
      { id: "a2", label: "CDB / LCI / Tesouro", value: 600000, assetClass: "investments", liquid: true },
      { id: "a3", label: "Previdência", value: 375000, assetClass: "pension", liquid: false },
      { id: "a4", label: "Fundo Multimercado", value: 225000, assetClass: "investments", liquid: true },
      { id: "a5", label: "Fundo de Ações", value: 75000, assetClass: "investments", liquid: true },
      { id: "a6", label: "Casa própria (quitada)", value: 900000, assetClass: "real_estate", liquid: false },
      { id: "a7", label: "Veículos", value: 120000, assetClass: "other", liquid: false },
    ],
    liabilities: [],
  },
  suitability: {
    answers: { horizon: 1, reaction: 1, experience: 2, stability: 3, objective: 1 },
    score: 53,
    profile: "moderate",
    flags: ["flags.shortHorizon"],
  },
  goals: [
    { id: "g1", type: "retirement", label: "Renda na aposentadoria", targetAmount: 3500000, targetYear: 2031, priority: "high", currentAmount: 1500000, monthlyContribution: 7000 },
    { id: "g2", type: "travel", label: "Viagens na aposentadoria", targetAmount: 150000, targetYear: 2032, priority: "medium", currentAmount: 20000, monthlyContribution: 1000 },
    { id: "g3", type: "legacy", label: "Herança para os filhos", targetAmount: 1000000, targetYear: 2050, priority: "low", currentAmount: 0, monthlyContribution: 0 },
  ],
  scenarios: [
    {
      id: "s1",
      name: "Aposentar aos 62",
      assumptions: { monthlyContribution: 7500, retirementAge: 62, expectedRealReturn: 4, inflation: 5, growthScenario: "custom" },
      createdAt: "2026-05-10T09:30:00.000Z",
    },
  ],
  selectedScenarioId: "s1",
  approvalStatus: "in_review",
  events: [],
};

const patricia: Plan = {
  clientId: "patricia",
  clientProfile: {
    id: "patricia",
    firstName: "Patrícia",
    lastName: "Fontana",
    dateOfBirth: "1979-10-05",
    gender: "female",
    maritalStatus: "divorced",
    dependents: 1,
    hasPartner: false,
    employmentStatus: "business_owner",
    occupation: "Empresária (pós-evento de liquidez)",
    email: "patricia.fontana@example.com",
    phone: "+55 48 99511-3322",
    city: "Florianópolis",
    state: "SC",
    taxResidency: "BR",
    cpfMasked: "***.***.876-**",
    pep: false,
    segment: "private",
  },
  cashFlow: {
    incomes: [
      { id: "i1", label: "Pró-labore + lucros", monthly: 50000, kind: "pro_labore" },
      { id: "i2", label: "Renda de investimentos", monthly: 12000, kind: "investments" },
    ],
    expenses: [
      { id: "e1", label: "Moradia", monthly: 6000, category: "housing" },
      { id: "e2", label: "Custo de vida", monthly: 9000, category: "living" },
      { id: "e3", label: "Financiamento (imóvel de investimento)", monthly: 2000, category: "debt" },
      { id: "e4", label: "Filho", monthly: 3000, category: "education" },
      { id: "e5", label: "Estilo de vida", monthly: 15000, category: "lifestyle" },
    ],
  },
  netWorth: {
    assets: [
      { id: "a1", label: "CDB / Fundo DI (caixa da venda)", value: 6300000, assetClass: "cash", liquid: true },
      { id: "a2", label: "LCI / LCA", value: 3600000, assetClass: "investments", liquid: true },
      { id: "a3", label: "Fundo Multimercado", value: 2700000, assetClass: "investments", liquid: true },
      { id: "a4", label: "Fundo de Ações", value: 1800000, assetClass: "investments", liquid: true },
      { id: "a5", label: "Previdência VGBL", value: 1800000, assetClass: "pension", liquid: false },
      { id: "a6", label: "Offshore (primeiro passo)", value: 1800000, assetClass: "investments", liquid: false },
      { id: "a7", label: "Participação na empresa", value: 12000000, assetClass: "business", liquid: false },
      { id: "a8", label: "Imóvel de investimento", value: 1500000, assetClass: "real_estate", liquid: false },
      { id: "a9", label: "Veículos", value: 500000, assetClass: "other", liquid: false },
    ],
    liabilities: [
      { id: "l1", label: "Financiamento (imóvel de investimento)", balance: 200000, kind: "mortgage", annualRate: 11 },
    ],
  },
  suitability: { answers: {}, flags: [] },
  goals: [],
  scenarios: [],
  approvalStatus: "draft",
  events: [],
};

const marcos: Plan = {
  clientId: "marcos",
  clientProfile: {
    id: "marcos",
    firstName: "Marcos",
    lastName: "Tavares",
    dateOfBirth: "1987-07-22",
    gender: "male",
    maritalStatus: "married",
    dependents: 1,
    hasPartner: true,
    partnerName: "Sandra",
    employmentStatus: "clt",
    occupation: "Operador logístico",
    email: "marcos.tavares@example.com",
    phone: "+55 11 99432-1200",
    city: "Guarulhos",
    state: "SP",
    taxResidency: "BR",
    cpfMasked: "***.***.118-**",
    pep: false,
    segment: "retail",
  },
  cashFlow: {
    incomes: [{ id: "i1", label: "Salário líquido", monthly: 4000, kind: "salary" }],
    expenses: [
      { id: "e1", label: "Aluguel", monthly: 1300, category: "housing" },
      { id: "e2", label: "Essenciais (mercado, transporte)", monthly: 1400, category: "living" },
      { id: "e3", label: "Serviço da dívida", monthly: 1200, category: "debt" },
      { id: "e4", label: "Estilo de vida", monthly: 300, category: "lifestyle" },
    ],
  },
  netWorth: {
    assets: [
      { id: "a1", label: "Conta / CDB (quase sempre zerado)", value: 300, assetClass: "cash", liquid: true },
    ],
    liabilities: [
      { id: "l1", label: "Rotativo do cartão", balance: 15000, kind: "card", annualRate: 300 },
      { id: "l2", label: "Cheque especial", balance: 5000, kind: "personal", annualRate: 130 },
      { id: "l3", label: "Consignado", balance: 15000, kind: "consigned", annualRate: 28 },
    ],
  },
  suitability: { answers: {}, flags: [] },
  goals: [],
  scenarios: [],
  approvalStatus: "draft",
  events: [],
};

const aline: Plan = {
  clientId: "aline",
  clientProfile: {
    id: "aline",
    firstName: "Aline",
    lastName: "Moreira",
    dateOfBirth: "1997-03-10",
    gender: "female",
    maritalStatus: "single",
    dependents: 0,
    hasPartner: false,
    employmentStatus: "clt",
    occupation: "Analista administrativa",
    email: "aline.moreira@example.com",
    phone: "+55 21 99765-4300",
    city: "Rio de Janeiro",
    state: "RJ",
    taxResidency: "BR",
    cpfMasked: "***.***.452-**",
    pep: false,
    segment: "retail",
  },
  cashFlow: {
    incomes: [{ id: "i1", label: "Salário líquido", monthly: 5900, kind: "salary" }],
    expenses: [
      { id: "e1", label: "Aluguel", monthly: 1600, category: "housing" },
      { id: "e2", label: "Custo de vida", monthly: 1500, category: "living" },
      { id: "e3", label: "Quitação da dívida", monthly: 900, category: "debt" },
      { id: "e4", label: "Estilo de vida", monthly: 500, category: "lifestyle" },
    ],
  },
  netWorth: {
    assets: [
      { id: "a1", label: "Reserva inicial", value: 1500, assetClass: "cash", liquid: true },
    ],
    liabilities: [
      { id: "l1", label: "Empréstimo pessoal (residual)", balance: 5000, kind: "personal", annualRate: 60 },
    ],
  },
  suitability: {
    answers: { horizon: 1, reaction: 0, experience: 0, stability: 1, objective: 0 },
    score: 13,
    profile: "conservative",
    flags: [],
  },
  goals: [
    { id: "g1", type: "emergency_reserve", label: "Reserva de emergência", targetAmount: 35000, targetYear: 2028, priority: "high", currentAmount: 1500, monthlyContribution: 1400 },
  ],
  scenarios: [],
  approvalStatus: "draft",
  events: [],
};

export const SEED_PLANS: Plan[] = [
  marcos,
  aline,
  camilaDiego,
  fernanda,
  joseCarlos,
  patricia,
];
