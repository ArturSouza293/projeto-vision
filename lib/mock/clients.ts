/**
 * Seed clients for Project Vision — fictitious but internally consistent
 * Brazilian personas drawn from the Vision persona set. Figures are illustrative
 * (BRL, monthly where noted). Extend or replace this file as the reference
 * database lands; the rest of the app only depends on the `Plan` shape.
 */

import type { Plan } from "@/lib/types";
import { KYC_DOSSIERS } from "@/lib/mock/kyc";

/** Persona descriptor keys, resolved through the i18n catalogs. */
export const PERSONA_META: Record<string, { taglineKey: string }> = {
  marcos: { taglineKey: "persona.marcos.tagline" },
  julia: { taglineKey: "persona.julia.tagline" },
  aline: { taglineKey: "persona.aline.tagline" },
  bruno: { taglineKey: "persona.bruno.tagline" },
  luana: { taglineKey: "persona.luana.tagline" },
  thiago: { taglineKey: "persona.thiago.tagline" },
  roberto: { taglineKey: "persona.roberto.tagline" },
  "camila-diego": { taglineKey: "persona.camilaDiego.tagline" },
  fernanda: { taglineKey: "persona.fernanda.tagline" },
  ricardo: { taglineKey: "persona.ricardo.tagline" },
  "jose-carlos": { taglineKey: "persona.joseCarlos.tagline" },
  helena: { taglineKey: "persona.helena.tagline" },
  patricia: { taglineKey: "persona.patricia.tagline" },
  antonio: { taglineKey: "persona.antonio.tagline" },
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

const julia: Plan = {
  clientId: "julia",
  clientProfile: {
    id: "julia", firstName: "Júlia", lastName: "Campos", dateOfBirth: "2003-11-15",
    gender: "female", maritalStatus: "single", dependents: 0, hasPartner: false,
    employmentStatus: "clt", occupation: "Primeiro emprego (CLT)", email: "julia.campos@example.com",
    phone: "+55 11 99120-7788", city: "São Paulo", state: "SP", taxResidency: "BR",
    cpfMasked: "***.***.009-**", pep: false, segment: "retail",
  },
  cashFlow: {
    incomes: [{ id: "i1", label: "Salário líquido", monthly: 2500, kind: "salary" }],
    expenses: [
      { id: "e1", label: "Contribuição em casa", monthly: 300, category: "living" },
      { id: "e2", label: "Vida e transporte", monthly: 400, category: "living" },
      { id: "e3", label: "Estilo de vida", monthly: 500, category: "lifestyle" },
    ],
  },
  netWorth: {
    assets: [
      { id: "a1", label: "Fundo DI / CDB", value: 3000, assetClass: "cash", liquid: true },
      { id: "a2", label: "CDB prazo", value: 1500, assetClass: "investments", liquid: true },
      { id: "a3", label: "Cripto", value: 500, assetClass: "other", liquid: true },
    ],
    liabilities: [],
  },
  suitability: { answers: { horizon: 3, reaction: 2, experience: 1, stability: 2, objective: 1 }, score: 60, profile: "moderate", flags: [] },
  goals: [
    { id: "g1", type: "emergency_reserve", label: "Reserva de emergência", targetAmount: 7200, targetYear: 2027, priority: "high", currentAmount: 5000, monthlyContribution: 800 },
    { id: "g2", type: "travel", label: "Viagem", targetAmount: 15000, targetYear: 2029, priority: "medium", currentAmount: 0, monthlyContribution: 300 },
  ],
  scenarios: [],
  approvalStatus: "draft",
  events: [],
};

const bruno: Plan = {
  clientId: "bruno",
  clientProfile: {
    id: "bruno", firstName: "Bruno", lastName: "Salgado", dateOfBirth: "1991-12-05",
    gender: "male", maritalStatus: "single", dependents: 0, hasPartner: false,
    employmentStatus: "clt", occupation: "CLT + transição de sucessão familiar", email: "bruno.salgado@example.com",
    phone: "+55 11 99880-4521", city: "São Paulo", state: "SP", taxResidency: "BR",
    cpfMasked: "***.***.343-**", pep: false, segment: "retail",
  },
  cashFlow: {
    incomes: [{ id: "i1", label: "Salário líquido", monthly: 6000, kind: "salary" }],
    expenses: [
      { id: "e1", label: "Moradia", monthly: 1500, category: "housing" },
      { id: "e2", label: "Custo de vida", monthly: 1500, category: "living" },
      { id: "e3", label: "Apoio aos pais", monthly: 1000, category: "other" },
      { id: "e4", label: "Estilo de vida", monthly: 500, category: "lifestyle" },
    ],
  },
  netWorth: {
    assets: [
      { id: "a1", label: "Fundo DI / CDB", value: 21000, assetClass: "cash", liquid: true },
      { id: "a2", label: "CDB / LCI", value: 9000, assetClass: "investments", liquid: true },
    ],
    liabilities: [{ id: "l1", label: "Cartão de crédito", balance: 2000, kind: "card", annualRate: 250 }],
  },
  suitability: { answers: { horizon: 1, reaction: 1, experience: 1, stability: 1, objective: 0 }, score: 27, profile: "conservative", flags: [] },
  goals: [
    { id: "g1", type: "emergency_reserve", label: "Reserva própria", targetAmount: 27000, targetYear: 2028, priority: "high", currentAmount: 15000, monthlyContribution: 800 },
    { id: "g2", type: "protection", label: "Proteger a renda dos pais", targetAmount: 500000, targetYear: 2027, priority: "high", currentAmount: 0, monthlyContribution: 0 },
    { id: "g3", type: "retirement", label: "Previdência própria", targetAmount: 1000000, targetYear: 2050, priority: "medium", currentAmount: 5000, monthlyContribution: 500 },
  ],
  scenarios: [],
  approvalStatus: "draft",
  events: [],
};

const luana: Plan = {
  clientId: "luana",
  clientProfile: {
    id: "luana", firstName: "Luana", lastName: "Andrade", dateOfBirth: "1987-09-20",
    gender: "female", maritalStatus: "single", dependents: 1, hasPartner: false,
    employmentStatus: "clt", occupation: "CLT — única provedora", email: "luana.andrade@example.com",
    phone: "+55 71 99344-2210", city: "Salvador", state: "BA", taxResidency: "BR",
    cpfMasked: "***.***.667-**", pep: false, segment: "prime",
  },
  cashFlow: {
    incomes: [{ id: "i1", label: "Salário líquido", monthly: 7200, kind: "salary" }],
    expenses: [
      { id: "e1", label: "Aluguel", monthly: 1800, category: "housing" },
      { id: "e2", label: "Filho (escola/cuidados)", monthly: 1500, category: "education" },
      { id: "e3", label: "Custo de vida", monthly: 2000, category: "living" },
      { id: "e4", label: "Serviço da dívida", monthly: 400, category: "debt" },
      { id: "e5", label: "Estilo de vida", monthly: 800, category: "lifestyle" },
    ],
  },
  netWorth: {
    assets: [
      { id: "a1", label: "CDB / Fundo DI", value: 25000, assetClass: "cash", liquid: true },
      { id: "a2", label: "LCI", value: 12500, assetClass: "investments", liquid: true },
      { id: "a3", label: "Previdência VGBL", value: 7500, assetClass: "pension", liquid: false },
      { id: "a4", label: "Fundo RF", value: 5000, assetClass: "investments", liquid: true },
    ],
    liabilities: [{ id: "l1", label: "Consignado", balance: 8000, kind: "consigned", annualRate: 25 }],
  },
  suitability: { answers: { horizon: 2, reaction: 0, experience: 1, stability: 2, objective: 0 }, score: 33, profile: "conservative", flags: ["flags.soleProvider"] },
  goals: [
    { id: "g1", type: "protection", label: "Seguro de vida (filho beneficiário)", targetAmount: 1000000, targetYear: 2026, priority: "high", currentAmount: 0, monthlyContribution: 0 },
    { id: "g2", type: "emergency_reserve", label: "Reserva 6–9 meses", targetAmount: 50000, targetYear: 2028, priority: "high", currentAmount: 25000, monthlyContribution: 500 },
    { id: "g3", type: "education", label: "Educação do filho", targetAmount: 300000, targetYear: 2038, priority: "high", currentAmount: 0, monthlyContribution: 600 },
  ],
  scenarios: [],
  approvalStatus: "draft",
  events: [],
};

const thiago: Plan = {
  clientId: "thiago",
  clientProfile: {
    id: "thiago", firstName: "Thiago", lastName: "Nogueira", dateOfBirth: "1996-08-10",
    gender: "male", maritalStatus: "single", dependents: 0, hasPartner: false,
    employmentStatus: "self_employed", occupation: "Freelancer remoto (PJ)", email: "thiago.nogueira@example.com",
    phone: "+55 48 99233-7766", city: "Florianópolis", state: "SC", taxResidency: "BR",
    cpfMasked: "***.***.781-**", pep: false, segment: "prime",
  },
  cashFlow: {
    incomes: [{ id: "i1", label: "Renda de freela (PJ, média)", monthly: 9600, kind: "pro_labore" }],
    expenses: [
      { id: "e1", label: "Aluguel", monthly: 2200, category: "housing" },
      { id: "e2", label: "Custo de vida", monthly: 2000, category: "living" },
      { id: "e3", label: "Serviço da dívida", monthly: 300, category: "debt" },
      { id: "e4", label: "Estilo de vida / viagem", monthly: 2000, category: "lifestyle" },
    ],
  },
  netWorth: {
    assets: [
      { id: "a1", label: "Fundo DI / CDB liquidez", value: 24000, assetClass: "cash", liquid: true },
      { id: "a2", label: "CDB / LCI", value: 15000, assetClass: "investments", liquid: true },
      { id: "a3", label: "Multimercado / ações", value: 12000, assetClass: "investments", liquid: true },
      { id: "a4", label: "Cripto", value: 9000, assetClass: "other", liquid: true },
    ],
    liabilities: [{ id: "l1", label: "Crédito pessoal", balance: 5000, kind: "personal", annualRate: 40 }],
  },
  suitability: { answers: { horizon: 3, reaction: 3, experience: 2, stability: 0, objective: 3 }, score: 73, profile: "aggressive", flags: [] },
  goals: [
    { id: "g1", type: "retirement", label: "Previdência (substituto do INSS)", targetAmount: 1500000, targetYear: 2055, priority: "high", currentAmount: 0, monthlyContribution: 800 },
    { id: "g2", type: "emergency_reserve", label: "Reserva para meses fracos", targetAmount: 40000, targetYear: 2027, priority: "high", currentAmount: 24000, monthlyContribution: 1000 },
    { id: "g3", type: "travel", label: "Nomadismo / viagens", targetAmount: 50000, targetYear: 2028, priority: "medium", currentAmount: 5000, monthlyContribution: 500 },
  ],
  scenarios: [],
  approvalStatus: "draft",
  events: [],
};

const roberto: Plan = {
  clientId: "roberto",
  clientProfile: {
    id: "roberto", firstName: "Roberto", lastName: "Lima", dateOfBirth: "1984-10-12",
    gender: "male", maritalStatus: "married", dependents: 1, hasPartner: true, partnerName: "Ana",
    employmentStatus: "clt", occupation: "CLT (renda dupla)", email: "roberto.lima@example.com",
    phone: "+55 19 99455-1133", city: "Campinas", state: "SP", taxResidency: "BR",
    cpfMasked: "***.***.205-**", pep: false, segment: "prime",
  },
  cashFlow: {
    incomes: [
      { id: "i1", label: "Salário líquido — Roberto", monthly: 5600, kind: "salary" },
      { id: "i2", label: "Salário líquido — Ana", monthly: 4000, kind: "salary" },
    ],
    expenses: [
      { id: "e1", label: "Financiamento imobiliário (SAC)", monthly: 2500, category: "debt" },
      { id: "e2", label: "Custo de vida", monthly: 3000, category: "living" },
      { id: "e3", label: "Carro / transporte", monthly: 800, category: "living" },
      { id: "e4", label: "Estilo de vida", monthly: 1700, category: "lifestyle" },
    ],
  },
  netWorth: {
    assets: [
      { id: "a1", label: "CDB / Fundo DI", value: 33000, assetClass: "cash", liquid: true },
      { id: "a2", label: "LCI", value: 18000, assetClass: "investments", liquid: true },
      { id: "a3", label: "Previdência PGBL", value: 9000, assetClass: "pension", liquid: false },
      { id: "a4", label: "Imóvel residencial (financiado)", value: 400000, assetClass: "real_estate", liquid: false },
    ],
    liabilities: [{ id: "l1", label: "Financiamento imobiliário", balance: 280000, kind: "mortgage", annualRate: 10.5 }],
  },
  suitability: { answers: { horizon: 2, reaction: 2, experience: 1, stability: 2, objective: 2 }, score: 60, profile: "moderate", flags: [] },
  goals: [
    { id: "g1", type: "property", label: "Quitar o financiamento", targetAmount: 280000, targetYear: 2035, priority: "high", currentAmount: 0, monthlyContribution: 1000 },
    { id: "g2", type: "emergency_reserve", label: "Reserva", targetAmount: 48000, targetYear: 2027, priority: "high", currentAmount: 30000, monthlyContribution: 500 },
    { id: "g3", type: "retirement", label: "Aposentadoria", targetAmount: 2000000, targetYear: 2048, priority: "medium", currentAmount: 9000, monthlyContribution: 800 },
    { id: "g4", type: "education", label: "Faculdade do filho", targetAmount: 300000, targetYear: 2035, priority: "medium", currentAmount: 0, monthlyContribution: 400 },
  ],
  scenarios: [],
  approvalStatus: "draft",
  events: [],
};

const ricardo: Plan = {
  clientId: "ricardo",
  clientProfile: {
    id: "ricardo", firstName: "Ricardo", lastName: "Barros", dateOfBirth: "1978-09-03",
    gender: "male", maritalStatus: "married", dependents: 1, hasPartner: true, partnerName: "Beatriz",
    employmentStatus: "clt", occupation: "Diretor sênior (CLT + bônus)", email: "ricardo.barros@example.com",
    phone: "+55 11 99701-8890", city: "São Paulo", state: "SP", taxResidency: "BR",
    cpfMasked: "***.***.412-**", pep: false, segment: "principal",
  },
  cashFlow: {
    incomes: [{ id: "i1", label: "Salário líquido + bônus", monthly: 32500, kind: "salary" }],
    expenses: [
      { id: "e1", label: "Prestação (hipoteca)", monthly: 5000, category: "debt" },
      { id: "e2", label: "Custo de vida", monthly: 7000, category: "living" },
      { id: "e3", label: "Escola do filho", monthly: 4000, category: "education" },
      { id: "e4", label: "Carro", monthly: 2000, category: "debt" },
      { id: "e5", label: "Estilo de vida", monthly: 7000, category: "lifestyle" },
    ],
  },
  netWorth: {
    assets: [
      { id: "a1", label: "Fundo DI / CDB", value: 180000, assetClass: "cash", liquid: true },
      { id: "a2", label: "CDB + fundos RF (banco)", value: 360000, assetClass: "investments", liquid: true },
      { id: "a3", label: "Previdência (múltiplos planos)", value: 240000, assetClass: "pension", liquid: false },
      { id: "a4", label: "Fundo Multimercado", value: 180000, assetClass: "investments", liquid: true },
      { id: "a5", label: "Fundo de Ações", value: 120000, assetClass: "investments", liquid: true },
      { id: "a6", label: "Offshore", value: 120000, assetClass: "investments", liquid: false },
      { id: "a7", label: "Imóvel (financiado)", value: 900000, assetClass: "real_estate", liquid: false },
      { id: "a8", label: "Carro (financiado/leasing)", value: 100000, assetClass: "other", liquid: false },
    ],
    liabilities: [
      { id: "l1", label: "Hipoteca", balance: 600000, kind: "mortgage", annualRate: 9.5 },
      { id: "l2", label: "Carro (financiado/leasing)", balance: 100000, kind: "auto", annualRate: 18 },
    ],
  },
  suitability: { answers: { horizon: 3, reaction: 2, experience: 3, stability: 2, objective: 2 }, score: 80, profile: "aggressive", flags: [] },
  goals: [
    { id: "g1", type: "education", label: "Faculdade do filho (exterior)", targetAmount: 1500000, targetYear: 2031, priority: "high", currentAmount: 0, monthlyContribution: 3000 },
    { id: "g2", type: "retirement", label: "Segunda metade / aposentadoria", targetAmount: 8000000, targetYear: 2046, priority: "high", currentAmount: 1200000, monthlyContribution: 7500 },
    { id: "g3", type: "property", label: "Quitar a hipoteca", targetAmount: 600000, targetYear: 2040, priority: "medium", currentAmount: 0, monthlyContribution: 0 },
  ],
  scenarios: [
    {
      id: "s1", name: "Consolidar + IPCA+5%",
      assumptions: { monthlyContribution: 7500, retirementAge: 60, expectedRealReturn: 5, inflation: 5, growthScenario: "custom" },
      createdAt: "2026-05-14T11:00:00.000Z",
    },
  ],
  selectedScenarioId: "s1",
  approvalStatus: "in_review",
  events: [],
};

const helena: Plan = {
  clientId: "helena",
  clientProfile: {
    id: "helena", firstName: "Helena", lastName: "Cavalcanti", dateOfBirth: "1961-08-25",
    gender: "female", maritalStatus: "widowed", dependents: 0, hasPartner: false,
    employmentStatus: "retired", occupation: "Aposentada", email: "helena.cavalcanti@example.com",
    phone: "+55 81 99566-3344", city: "Recife", state: "PE", taxResidency: "BR",
    cpfMasked: "***.***.118-**", pep: false, segment: "principal",
  },
  cashFlow: {
    incomes: [
      { id: "i1", label: "Aposentadoria", monthly: 6000, kind: "pension" },
      { id: "i2", label: "Renda de FII + aluguel", monthly: 4500, kind: "rent" },
    ],
    expenses: [
      { id: "e1", label: "Custo de vida", monthly: 3500, category: "living" },
      { id: "e2", label: "Saúde", monthly: 2500, category: "health" },
      { id: "e3", label: "Manutenção do imóvel", monthly: 1500, category: "living" },
      { id: "e4", label: "Estilo de vida", monthly: 1500, category: "lifestyle" },
    ],
  },
  netWorth: {
    assets: [
      { id: "a1", label: "Fundo DI / CDB", value: 240000, assetClass: "cash", liquid: true },
      { id: "a2", label: "CDB / LCI", value: 420000, assetClass: "investments", liquid: true },
      { id: "a3", label: "Previdência VGBL", value: 180000, assetClass: "pension", liquid: false },
      { id: "a4", label: "FII (renda mensal)", value: 240000, assetClass: "investments", liquid: true },
      { id: "a5", label: "Tesouro IPCA+", value: 120000, assetClass: "investments", liquid: true },
      { id: "a6", label: "Imóvel próprio", value: 700000, assetClass: "real_estate", liquid: false },
      { id: "a7", label: "Imóvel para alugar", value: 300000, assetClass: "real_estate", liquid: false },
    ],
    liabilities: [],
  },
  suitability: { answers: { horizon: 1, reaction: 0, experience: 1, stability: 2, objective: 0 }, score: 27, profile: "conservative", flags: [] },
  goals: [
    { id: "g1", type: "retirement", label: "Renda vitalícia (IPCA+)", targetAmount: 1200000, targetYear: 2026, priority: "high", currentAmount: 600000, monthlyContribution: 0 },
    { id: "g2", type: "legacy", label: "Herança para os netos", targetAmount: 500000, targetYear: 2045, priority: "medium", currentAmount: 0, monthlyContribution: 0 },
  ],
  scenarios: [
    {
      id: "s1", name: "Renda na decumulação",
      assumptions: { monthlyContribution: 0, retirementAge: 65, expectedRealReturn: 3, inflation: 5, growthScenario: "custom" },
      createdAt: "2026-05-16T08:00:00.000Z",
    },
  ],
  selectedScenarioId: "s1",
  approvalStatus: "in_review",
  events: [],
};

const antonio: Plan = {
  clientId: "antonio",
  clientProfile: {
    id: "antonio", firstName: "Antônio", lastName: "Vasconcelos", dateOfBirth: "1963-08-15",
    gender: "male", maritalStatus: "married", dependents: 0, hasPartner: true, partnerName: "Cláudia",
    employmentStatus: "business_owner", occupation: "Patrimônio consolidado (rendas + dividendos)", email: "antonio.vasconcelos@example.com",
    phone: "+55 11 99888-0001", city: "São Paulo", state: "SP", taxResidency: "BR",
    cpfMasked: "***.***.900-**", pep: false, segment: "private",
  },
  cashFlow: {
    incomes: [
      { id: "i1", label: "Aluguéis", monthly: 60000, kind: "rent" },
      { id: "i2", label: "Dividendos", monthly: 50000, kind: "investments" },
      { id: "i3", label: "Renda de investimentos", monthly: 30000, kind: "investments" },
    ],
    expenses: [
      { id: "e1", label: "Custos de carrego (IPTU, manutenção, equipe)", monthly: 30000, category: "other" },
      { id: "e2", label: "Custo de vida", monthly: 25000, category: "living" },
      { id: "e3", label: "Serviço do empréstimo comercial", monthly: 5000, category: "debt" },
      { id: "e4", label: "Estilo de vida / viagem", monthly: 30000, category: "lifestyle" },
    ],
  },
  netWorth: {
    assets: [
      { id: "a1", label: "CDB / Tesouro", value: 6250000, assetClass: "cash", liquid: true },
      { id: "a2", label: "Crédito privado / debêntures / CRI-CRA", value: 3750000, assetClass: "investments", liquid: true },
      { id: "a3", label: "Fundo de ações / ações", value: 3750000, assetClass: "investments", liquid: true },
      { id: "a4", label: "Previdência VGBL", value: 3750000, assetClass: "pension", liquid: false },
      { id: "a5", label: "Internacional / offshore", value: 5000000, assetClass: "investments", liquid: false },
      { id: "a6", label: "Alternativos (PE / ativos reais)", value: 2500000, assetClass: "business", liquid: false },
      { id: "a7", label: "Imóveis residenciais", value: 22000000, assetClass: "real_estate", liquid: false },
      { id: "a8", label: "Rural / fazenda", value: 12000000, assetClass: "real_estate", liquid: false },
      { id: "a9", label: "Imóvel comercial (alugado)", value: 10000000, assetClass: "real_estate", liquid: false },
      { id: "a10", label: "Carros de luxo / coleção", value: 4000000, assetClass: "other", liquid: false },
      { id: "a11", label: "Barco", value: 3000000, assetClass: "other", liquid: false },
      { id: "a12", label: "Arte e colecionáveis", value: 4000000, assetClass: "other", liquid: false },
    ],
    liabilities: [{ id: "l1", label: "Financiamento imóvel comercial", balance: 3000000, kind: "mortgage", annualRate: 9 }],
  },
  suitability: { answers: { horizon: 2, reaction: 1, experience: 3, stability: 3, objective: 0 }, score: 60, profile: "moderate", flags: [] },
  goals: [
    { id: "g1", type: "legacy", label: "Liquidez para o ITCMD do espólio", targetAmount: 8000000, targetYear: 2030, priority: "high", currentAmount: 0, monthlyContribution: 0 },
    { id: "g2", type: "protection", label: "Seguro dos ativos", targetAmount: 55000000, targetYear: 2027, priority: "medium", currentAmount: 0, monthlyContribution: 0 },
    { id: "g3", type: "retirement", label: "Preservação real (IPCA+5–6%)", targetAmount: 25000000, targetYear: 2035, priority: "medium", currentAmount: 25000000, monthlyContribution: 0 },
  ],
  scenarios: [
    {
      id: "s1", name: "Preservação + sucessão",
      assumptions: { monthlyContribution: 0, retirementAge: 63, expectedRealReturn: 5, inflation: 5, growthScenario: "custom" },
      createdAt: "2026-05-12T15:00:00.000Z",
    },
  ],
  selectedScenarioId: "s1",
  approvalStatus: "in_review",
  events: [],
};

export const SEED_PLANS: Plan[] = [
  marcos,
  julia,
  aline,
  bruno,
  luana,
  thiago,
  roberto,
  camilaDiego,
  fernanda,
  ricardo,
  joseCarlos,
  helena,
  patricia,
  antonio,
];

// v8 — attach the KYC "Conheça seu Cliente" dossier to each seed persona (the
// "Visão 360" button gates on its presence). Cases created from scratch use
// blankPlan() and never carry kyc, so the button is absent there. The dossier
// rides on clientProfile, which the Plan snapshots and structuredClone copies.
for (const plan of SEED_PLANS) {
  const dossier = KYC_DOSSIERS[plan.clientId];
  if (dossier) plan.clientProfile.kyc = dossier;
}
