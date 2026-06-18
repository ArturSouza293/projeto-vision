/**
 * v8 — Dossiês KYC "Conheça seu Cliente" (9 categorias) das personas seed.
 *
 * Fonte: Anexo de `01_personas_PT.md` (v2). Dados 100% FICTÍCIOS e ilustrativos
 * — alimentam o botão "Visão 360" do protótipo. Cada chave é o `clientId` de uma
 * persona seed; casos criados do zero NÃO têm KYC (a 360 fica indisponível).
 *
 * Reconciliação de nomes: onde o dossiê e o cadastro do seed divergiam no nome
 * do cônjuge, este arquivo usa o nome do CADASTRO (que já aparece no app —
 * `partnerName` e rótulos de renda), mantendo o resto do dossiê. Mapeamentos:
 *   marcos: cônjuge Sandra (dossiê: Vanessa) · roberto: Ana (Renata)
 *   fernanda: Rafael (Eduardo) · jose-carlos: Marta (Vera)
 *   ricardo: Beatriz (Mariana) · antonio: Cláudia (Lúcia)
 *
 * Os resumos `resumoIAFicha`/`resumoIAGastos` são mock pré-escrito (em produção
 * viriam da BIA) — exibidos com badge "exemplo ilustrativo".
 *
 * PRIVACIDADE: nada daqui entra no payload da BIA — a whitelist de
 * `buildPlanoIdealPayload` é por inclusão; um teste garante a não-fuga.
 */
import type { ClientKYC } from "@/lib/types";

export const KYC_DOSSIERS: Record<string, ClientKYC> = {
  marcos: {
    perfilPessoal: {
      ramo: "Logística / distribuição",
      cargo: "Assistente de operações",
      contadorAdvogado: "Contador: não · Advogado: não",
      conhecimentoFinanceiro: "básico",
      interesses: ["futebol", "churrasco com amigos"],
      esporte: { modalidade: "futebol", time: "Corinthians", nivel: "fanático" },
      admira: ["Neymar", "Luciano Huck"],
      hobbies: ["futebol de várzea aos domingos"],
      viagens: { gosta: false, nota: "raramente — litoral de SP, casa de parentes" },
      pets: [],
    },
    perfilFamiliar: {
      moraCom: "esposa Sandra e filho Gabriel (8)",
      filhos: [{ nome: "Gabriel", idade: 8 }],
      arvoreGenealogica: [
        { parentesco: "esposa", nome: "Sandra", banco: "banco do empregador (concorrente)" },
        { parentesco: "mãe", nome: "—", banco: "Caixa (aposentada)" },
      ],
    },
    relacionamento: {
      temasSensiveis: [
        "Vergonha da dívida — nunca abrir a conversa por investimentos; começar por 'organizar as contas'.",
      ],
      canaisPreferidos: ["WhatsApp"],
      frequencia: "Quinzenal, mensagens curtas",
      estiloComunicacao: "Simples e direto, zero jargão",
      conjugeClienteBradesco: false,
      filhosClientesBradesco: false,
      resumoIAFicha:
        "Cliente em estresse financeiro; receptivo a renegociação; evitar ofertas de crédito novo.",
    },
    ativosFinanceiros: { origemCapital: "Salário", saldoConsolidadoBanco: 800 },
    ativosNaoFinanceiros: { imoveisProprios: 0, imoveisExterior: 0, empresas: [] },
    fluxoCaixa: {
      despesasFixas: [
        { categoria: "Aluguel", valor: 1300 },
        { categoria: "Essenciais", valor: 1400 },
        { categoria: "Serviço da dívida", valor: 1200 },
        { categoria: "Lifestyle", valor: 300 },
      ],
      doacoes: { realiza: false },
      alertas: [
        { texto: "Uso recorrente do cheque especial em 11 dos últimos 12 meses.", severidade: "alta" },
      ],
      resumoIAGastos:
        "iFood/apps ~R$ 240/mês — pequeno vs. juros do rotativo; foco na dívida.",
    },
    posicaoInternacional: { contaInternacional: false, investeExterior: false },
    planejamentos: { momentoDeVida: "Reorganização financeira (pré-acumulação)" },
    protecao: { planejamentoSucessorio: "Não", segurosExternos: [] },
  },

  julia: {
    perfilPessoal: {
      ramo: "Comunicação / marketing (agência digital)",
      cargo: "Analista júnior de mídia",
      contadorAdvogado: "Contador: não · Advogado: não",
      conhecimentoFinanceiro: "básico (aprendendo rápido)",
      interesses: ["redes sociais", "K-pop", "finanças no TikTok"],
      esporte: { modalidade: "vôlei (acompanha a seleção)", nivel: "ocasional" },
      admira: ["Nathalia Arcuri", "Anitta"],
      hobbies: ["dança", "fotografia no celular"],
      viagens: { gosta: true, nota: "sonha com mochilão; já fez litoral NE" },
      pets: ["gata 'Mel'"],
    },
    perfilFamiliar: {
      moraCom: "os pais",
      filhos: [],
      arvoreGenealogica: [
        { parentesco: "pai", nome: "—", banco: "Caixa (FGTS/poupança)" },
        { parentesco: "mãe", nome: "—", banco: "Bradesco (conta-salário) — porta de entrada da família" },
      ],
    },
    relacionamento: {
      temasSensiveis: ["Não ser tratada como 'iniciante que não entende'."],
      canaisPreferidos: ["WhatsApp", "app"],
      frequencia: "Mensal",
      estiloComunicacao: "Didático e visual, exemplos práticos",
      conjugeClienteBradesco: undefined,
      filhosClientesBradesco: undefined,
      resumoIAFicha:
        "Alta propensão a automatizar aportes; responde bem a conteúdo educativo curto.",
    },
    ativosFinanceiros: { origemCapital: "Salário", saldoConsolidadoBanco: 5000 },
    ativosNaoFinanceiros: { imoveisProprios: 0, imoveisExterior: 0, empresas: [] },
    fluxoCaixa: {
      despesasFixas: [
        { categoria: "Contribuição em casa", valor: 300 },
        { categoria: "Transporte / vida", valor: 400 },
        { categoria: "Lifestyle", valor: 500 },
      ],
      doacoes: { realiza: false },
      alertas: [
        { texto: "Parcelamentos crescentes no cartão (3 compras BNPL em 60 dias).", severidade: "media" },
      ],
      resumoIAGastos:
        "Delivery + streaming ~R$ 310/mês; espaço para aporte automático no dia do pagamento.",
    },
    posicaoInternacional: { contaInternacional: false, investeExterior: false },
    planejamentos: { momentoDeVida: "Início da acumulação (construção de hábito)" },
    protecao: { planejamentoSucessorio: "Não", segurosExternos: [] },
  },

  aline: {
    perfilPessoal: {
      ramo: "Saúde (operadora)",
      cargo: "Supervisora de atendimento",
      contadorAdvogado: "Contador: não · Advogado: não",
      conhecimentoFinanceiro: "básico → intermediário",
      interesses: ["corrida de rua", "podcasts de finanças", "séries"],
      esporte: { modalidade: "corrida (10k)", nivel: "pratica" },
      admira: ["Nathalia Arcuri", "mulheres que 'viraram o jogo'"],
      hobbies: ["corrida", "culinária fit"],
      viagens: { gosta: true, nota: "1x/ano (Sul / Nordeste)" },
      pets: ["gato 'Simba'"],
    },
    perfilFamiliar: {
      moraCom: "sozinha (aluguel)",
      filhos: [],
      arvoreGenealogica: [
        { parentesco: "mãe", nome: "—", banco: "Bradesco (aposentadoria INSS)" },
        { parentesco: "irmão", nome: "—", banco: "banco digital" },
      ],
    },
    relacionamento: {
      temasSensiveis: [
        "A dívida passada — tratar como conquista em curso, não como mancha.",
      ],
      canaisPreferidos: ["WhatsApp", "reuniões rápidas por vídeo"],
      frequencia: "Mensal (acompanhamento da quitação)",
      estiloComunicacao: "Objetivo, com metas visuais",
      resumoIAFicha:
        "Disciplina alta; o momento-chave é redirecionar a parcela liberada (R$ 0,9k) em D+1 da quitação.",
    },
    ativosFinanceiros: { origemCapital: "Salário", saldoConsolidadoBanco: 1000 },
    ativosNaoFinanceiros: { imoveisProprios: 0, imoveisExterior: 0, empresas: [] },
    fluxoCaixa: {
      despesasFixas: [
        { categoria: "Aluguel", valor: 1600 },
        { categoria: "Vida", valor: 1500 },
        { categoria: "Serviço da dívida", valor: 900 },
        { categoria: "Lifestyle", valor: 500 },
      ],
      doacoes: { realiza: true, descricao: "campanha anual do agasalho" },
      alertas: [
        { texto: "Quitação do consignado prevista em ~6 meses — janela de conversão em aporte.", severidade: "media" },
      ],
      resumoIAGastos:
        "Gastos sob controle; assinatura dupla de streaming é o único excesso recorrente.",
    },
    posicaoInternacional: { contaInternacional: false, investeExterior: false },
    planejamentos: { momentoDeVida: "Virada — da quitação para a acumulação" },
    protecao: { planejamentoSucessorio: "Não", segurosExternos: [] },
  },

  bruno: {
    perfilPessoal: {
      ramo: "Tecnologia (próprio) + comércio atacadista (família)",
      cargo: "Analista de produto em fintech; sucessor potencial da Eletro Damasceno Materiais Elétricos Ltda",
      contadorAdvogado: "Contador da empresa do pai (mistura PF/PJ)",
      conhecimentoFinanceiro: "intermediário",
      interesses: ["tecnologia", "gestão", "empreendedorismo"],
      esporte: { modalidade: "basquete (NBA)", nivel: "ocasional" },
      admira: ["o pai", "Jorge Paulo Lemann"],
      hobbies: ["games", "trilha"],
      viagens: { gosta: false, nota: "pouco (trabalho)" },
      pets: [],
    },
    perfilFamiliar: {
      moraCom: "sozinho",
      filhos: [],
      arvoreGenealogica: [
        { parentesco: "pai", nome: "Damião (fundador)", banco: "Bradesco PJ + PF há 30 anos" },
        { parentesco: "mãe", nome: "Cleusa", banco: "Bradesco" },
        { parentesco: "irmã", nome: "Renata", banco: "banco digital — risco latente de conflito sucessório" },
      ],
    },
    relacionamento: {
      temasSensiveis: [
        "Aposentadoria/saúde do pai e a sucessão — abordar como 'proteção do legado', nunca como 'fim de ciclo'.",
      ],
      canaisPreferidos: ["WhatsApp", "presencial trimestral com o pai junto"],
      frequencia: "Mensal",
      estiloComunicacao: "Analítico, gosta de cenários",
      conjugeClienteBradesco: undefined,
      filhosClientesBradesco: undefined,
      resumoIAFicha:
        "Decisão bifurcada (assumir vs. seguir carreira); o valor está em mapear a renda real do pai antes de qualquer produto.",
    },
    ativosFinanceiros: { origemCapital: "Salário", saldoConsolidadoBanco: 18000 },
    ativosNaoFinanceiros: {
      imoveisProprios: 0,
      imoveisExterior: 0,
      empresas: [
        { nome: "Eletro Damasceno (participação informal futura)", porte: "pequeno (~12 funcionários)", nota: "não formalizada" },
      ],
    },
    fluxoCaixa: {
      despesasFixas: [
        { categoria: "Moradia", valor: 1500 },
        { categoria: "Vida", valor: 1500 },
        { categoria: "Apoio aos pais (crescente)", valor: 1000 },
        { categoria: "Lifestyle", valor: 500 },
      ],
      doacoes: { realiza: false },
      alertas: [
        { texto: "Aporte aos pais subiu 2x em 12 meses.", severidade: "media" },
      ],
      resumoIAGastos:
        "Caixa pessoal saudável, mas exposto ao cenário 'provedor'; separar 3 caixas é a 1ª entrega.",
    },
    posicaoInternacional: { contaInternacional: false, investeExterior: false },
    planejamentos: { momentoDeVida: "Transição (acumulando com risco de virar provedor)" },
    protecao: {
      planejamentoSucessorio: "Não há na família — ponto crítico",
      segurosExternos: [{ tipo: "—", possui: false, obs: "nenhum relevante" }],
    },
  },

  luana: {
    perfilPessoal: {
      ramo: "Educação privada",
      cargo: "Coordenadora administrativa",
      contadorAdvogado: "Contador: não · Advogado: não",
      conhecimentoFinanceiro: "básico → intermediário",
      interesses: ["educação do filho", "organização financeira", "fé"],
      esporte: { modalidade: "futebol (Bahia, pelo pai)", time: "Bahia", nivel: "raro" },
      admira: ["a própria mãe", "Maya Angelou"],
      hobbies: ["leitura", "praia com o filho"],
      viagens: { gosta: true, nota: "1x/ano para o interior (família)" },
      pets: [],
    },
    perfilFamiliar: {
      moraCom: "filho Davi (5)",
      filhos: [{ nome: "Davi", idade: 5 }],
      arvoreGenealogica: [
        { parentesco: "mãe", nome: "—", banco: "Bradesco (aposentada)" },
        { parentesco: "irmã", nome: "—", banco: "Caixa" },
        { parentesco: "pai de Davi", nome: "—", banco: "ausente" },
      ],
    },
    relacionamento: {
      temasSensiveis: [
        "O pai da criança — não mencionar.",
        "Nunca insinuar fragilidade ('se algo der errado…') sem ela trazer o tema.",
      ],
      canaisPreferidos: ["WhatsApp fora do horário escolar (após 19h)"],
      frequencia: "Mensal",
      estiloComunicacao: "Acolhedor, direto ao ponto, sem pressão",
      filhosClientesBradesco: true,
      resumoIAFicha:
        "Prioridade emocional = segurança do filho; seguro de vida com beneficiário correto vale mais que qualquer rentabilidade.",
    },
    ativosFinanceiros: { origemCapital: "Salário", saldoConsolidadoBanco: 42000 },
    ativosNaoFinanceiros: { imoveisProprios: 0, imoveisExterior: 0, empresas: [] },
    fluxoCaixa: {
      despesasFixas: [
        { categoria: "Aluguel", valor: 1800 },
        { categoria: "Escola / cuidados (Davi)", valor: 1500 },
        { categoria: "Vida", valor: 2000 },
        { categoria: "Serviço da dívida", valor: 400 },
        { categoria: "Lifestyle", valor: 800 },
      ],
      doacoes: { realiza: true, descricao: "ação social da igreja (R$ 100/mês)" },
      alertas: [
        { texto: "Reajuste escolar anual ~10% pressiona o superávit.", severidade: "media" },
      ],
      resumoIAGastos:
        "Orçamento sem folga estrutural; ganhos virão de proteção e automação, não de corte.",
    },
    posicaoInternacional: { contaInternacional: false, investeExterior: false },
    planejamentos: { momentoDeVida: "Proteção + acumulação (educação do filho)" },
    protecao: {
      planejamentoSucessorio: "Não (sem testamento; guarda de Davi não formalizada — sensível)",
      segurosExternos: [
        { tipo: "VGBL do banco", possui: true, obs: "única 'proteção' — inadequada à necessidade" },
        { tipo: "Seguro de vida", possui: false, obs: "lacuna prioritária" },
      ],
    },
  },

  thiago: {
    perfilPessoal: {
      ramo: "Tecnologia — desenvolvimento de software freelancer (clientes EUA/UE)",
      cargo: "Dono da TS Tech Serviços Digitais ME (PJ/Simples)",
      contadorAdvogado: "Contador: sim (PJ)",
      conhecimentoFinanceiro: "intermediário (avançado em cripto)",
      interesses: ["tech", "e-sports", "nomadismo digital"],
      esporte: { modalidade: "surf (pratica); e-sports (CS/Valorant)", nivel: "fanático (e-sports)" },
      admira: ["Naval Ravikant", "criadores tech"],
      hobbies: ["surf", "setups", "viagens longas"],
      viagens: { gosta: true, nota: "sim — 2–3 meses/ano (Bali, Portugal, Argentina)" },
      pets: [],
    },
    perfilFamiliar: {
      moraCom: "sozinho (aluguel flexível)",
      filhos: [],
      arvoreGenealogica: [
        { parentesco: "pais", nome: "—", banco: "Sicredi (interior) — sem vínculo familiar com o Bradesco" },
      ],
    },
    relacionamento: {
      temasSensiveis: [
        "Não tratar PJ/cripto com tom de bronca; ele se desliga com burocracia.",
      ],
      canaisPreferidos: ["e-mail / assíncrono", "call só agendada"],
      frequencia: "Trimestral (ou por evento)",
      estiloComunicacao: "Técnico e direto, dados na mesa",
      resumoIAFicha:
        "Renda lumpy em FX; a alavanca é regra de '% de cada nota' + previdência substituta do INSS.",
    },
    ativosFinanceiros: {
      origemCapital: "Honorários no exterior (USD/EUR) + salário PJ",
      saldoConsolidadoBanco: 25000,
    },
    ativosNaoFinanceiros: {
      imoveisProprios: 0,
      imoveisExterior: 0,
      empresas: [{ nome: "TS Tech Serviços Digitais", porte: "micro" }],
    },
    fluxoCaixa: {
      despesasFixas: [
        { categoria: "Aluguel", valor: 2200 },
        { categoria: "Vida", valor: 2000 },
        { categoria: "Serviço da dívida", valor: 300 },
        { categoria: "Lifestyle / viagem", valor: 2000 },
      ],
      doacoes: { realiza: false },
      alertas: [
        { texto: "3+ remessas internacionais/mês com spread de FX alto fora do banco.", severidade: "media" },
      ],
      resumoIAGastos:
        "Custo de FX e mistura PF/PJ são os vazamentos; meses fortes não viram aporte.",
    },
    posicaoInternacional: { contaInternacional: true, investeExterior: true, valorExterior: 9000 },
    planejamentos: { momentoDeVida: "Acumulando — sem rede formal (sem INSS/FGTS)" },
    protecao: {
      planejamentoSucessorio: "Não",
      segurosExternos: [{ tipo: "Seguro saúde", possui: false, obs: "usa avulso em viagem" }],
    },
  },

  roberto: {
    perfilPessoal: {
      ramo: "Indústria (autopeças)",
      cargo: "Coordenador de manutenção",
      contadorAdvogado: "Contador: não · Advogado: não",
      conhecimentoFinanceiro: "intermediário (estudioso do 'amortizar vs. investir')",
      interesses: ["futebol", "casa / reforma", "YouTube de finanças"],
      esporte: { modalidade: "futebol", time: "Palmeiras", nivel: "ocasional" },
      admira: ["Gustavo Cerbasi"],
      hobbies: ["churrasco", "pequenos reparos", "pesca esporádica"],
      viagens: { gosta: true, nota: "férias anuais (litoral / interior)" },
      pets: ["cachorro 'Bob' (SRD)"],
    },
    perfilFamiliar: {
      moraCom: "esposa Ana (professora) e filho Pedro (9)",
      filhos: [{ nome: "Pedro", idade: 9 }],
      arvoreGenealogica: [
        { parentesco: "esposa", nome: "Ana", banco: "outro banco — oportunidade de portabilidade de salário" },
        { parentesco: "pais", nome: "—", banco: "Banco do Brasil (aposentados)" },
      ],
    },
    relacionamento: {
      temasSensiveis: [
        "Medo de 'decisão errada' — apresentar sempre 2 cenários comparados, nunca uma ordem.",
      ],
      canaisPreferidos: ["WhatsApp", "1 presencial/ano"],
      frequencia: "Bimestral",
      estiloComunicacao: "Comparativo, números lado a lado",
      conjugeClienteBradesco: false,
      resumoIAFicha:
        "Conversa de maior valor: simulação amortizar (SAC 10,5%+TR) vs. investir IPCA+; decide com planilha.",
    },
    ativosFinanceiros: { origemCapital: "Salário", saldoConsolidadoBanco: 48000 },
    ativosNaoFinanceiros: {
      imoveisProprios: 1,
      imoveisExterior: 0,
      empresas: [],
    },
    fluxoCaixa: {
      despesasFixas: [
        { categoria: "Prestação (imóvel)", valor: 2500 },
        { categoria: "Vida", valor: 3000 },
        { categoria: "Carro", valor: 800 },
        { categoria: "Lifestyle", valor: 1700 },
      ],
      doacoes: { realiza: false },
      alertas: [
        { texto: "FGTS elegível para amortização extraordinária (janela bienal).", severidade: "baixa" },
      ],
      resumoIAGastos:
        "Superávit estável de R$ 1,6k; sem reserva formal segregada — 1º passo antes do dilema do financiamento.",
    },
    posicaoInternacional: { contaInternacional: false, investeExterior: false },
    planejamentos: { momentoDeVida: "Acumulação com dívida boa (imóvel)" },
    protecao: {
      planejamentoSucessorio: "Não",
      segurosExternos: [
        { tipo: "Auto", possui: true, obs: "Porto Seguro" },
        { tipo: "Residencial", possui: false },
        { tipo: "Vida", possui: true, obs: "só o prestamista do financiamento" },
      ],
    },
  },

  "camila-diego": {
    perfilPessoal: {
      ramo: "Ela: marketing (varejo) · Ele: tecnologia (software house)",
      cargo: "Gerente de marketing; engenheiro de software sênior",
      contadorAdvogado: "Contador: não · Advogado: não",
      conhecimentoFinanceiro: "intermediário (ele avançado em planilhas)",
      interesses: ["viagens", "gastronomia", "FIIs", "corrida"],
      esporte: { modalidade: "corrida de rua juntos; futebol", time: "Athletico-PR", nivel: "raro (futebol)" },
      admira: ["casais creators de finanças", "Anthony Bourdain"],
      hobbies: ["viagens 2x/ano", "vinhos", "trilhas"],
      viagens: { gosta: true, nota: "sim — internacional 1x/ano (Europa / América do Sul) + nacional" },
      pets: ["cachorro 'Thor' (golden)"],
    },
    perfilFamiliar: {
      moraCom: "juntos (aluguel, Curitiba)",
      filhos: [],
      arvoreGenealogica: [
        { parentesco: "pais dela", nome: "—", banco: "Bradesco (interior do PR)" },
        { parentesco: "pais dele", nome: "—", banco: "Itaú" },
      ],
    },
    relacionamento: {
      temasSensiveis: [
        "A decisão de ter filhos — jamais usar como argumento de venda ('quando vierem as crianças…').",
      ],
      canaisPreferidos: ["vídeo-call à noite", "WhatsApp em grupo do casal"],
      frequencia: "Bimestral",
      estiloComunicacao: "Visual, metas compartilhadas, gamificado q.b.",
      conjugeClienteBradesco: false,
      resumoIAFicha:
        "Decisão-chave: consórcio vs. financiamento vs. à vista para o apê; alta capacidade (35% poupança), risco = lifestyle creep.",
    },
    ativosFinanceiros: { origemCapital: "Salários (dupla renda)", saldoConsolidadoBanco: 120000 },
    ativosNaoFinanceiros: {
      imoveisProprios: 0,
      imoveisExterior: 0,
      empresas: [],
    },
    fluxoCaixa: {
      despesasFixas: [
        { categoria: "Aluguel", valor: 3000 },
        { categoria: "Vida", valor: 3000 },
        { categoria: "Carro", valor: 1200 },
        { categoria: "Lifestyle / viagem", valor: 3800 },
      ],
      doacoes: { realiza: true, descricao: "ONG de animais (R$ 80/mês)" },
      alertas: [
        { texto: "Simulação de consórcio iniciada no app e abandonada (lead quente).", severidade: "alta" },
      ],
      resumoIAGastos:
        "Viagem é inegociável — plano que corta viagem será abandonado; plano que organiza baldes será seguido.",
    },
    posicaoInternacional: { contaInternacional: true, investeExterior: false, valorExterior: 0 },
    planejamentos: { momentoDeVida: "Acumulação acelerada com meta de imóvel (2–3 anos)" },
    protecao: {
      planejamentoSucessorio: "Não",
      segurosExternos: [
        { tipo: "Auto", possui: true, obs: "Porto" },
        { tipo: "Vida", possui: false },
        { tipo: "Residencial", possui: false },
      ],
    },
  },

  fernanda: {
    perfilPessoal: {
      ramo: "Indústria (controladoria)",
      cargo: "Gerente de controladoria",
      contadorAdvogado: "Contador: sim (IR) · Advogada: sim — direito à saúde (judicialização de cobertura)",
      conhecimentoFinanceiro: "intermediário → avançado",
      interesses: ["direito da saúde", "associações de pacientes", "gestão do tempo"],
      esporte: { modalidade: "vôlei", nivel: "raro" },
      admira: ["Drauzio Varella", "mães da associação"],
      hobbies: ["leitura", "culinária com os filhos (tempo escasso)"],
      viagens: { gosta: true, nota: "curtas, planejadas em torno do tratamento" },
      pets: [],
    },
    perfilFamiliar: {
      moraCom: "marido Rafael e filhos Miguel (10) e Sofia (7 — condição crônica, tratamento contínuo)",
      filhos: [
        { nome: "Miguel", idade: 10 },
        { nome: "Sofia", idade: 7, nota: "condição crônica, tratamento contínuo" },
      ],
      arvoreGenealogica: [
        { parentesco: "marido", nome: "Rafael", banco: "Bradesco (conta + cartão)" },
        { parentesco: "pais dela", nome: "—", banco: "Banco do Brasil (aposentados)" },
      ],
    },
    relacionamento: {
      temasSensiveis: [
        "A condição de saúde de Sofia — só falar quando ELA trouxer.",
        "Nunca abrir reunião por 'seguro de vida' sem contexto; o tema correto é 'continuidade do cuidado'.",
      ],
      canaisPreferidos: ["e-mail para documentos", "WhatsApp curto", "presencial trimestral agendado"],
      frequencia: "Trimestral + eventos",
      estiloComunicacao: "Técnico, documentado, sem rodeios",
      conjugeClienteBradesco: true,
      resumoIAFicha:
        "Toda decisão orbita a perpetuidade do cuidado de Sofia; PGBL superdimensionado é a revisão técnica de entrada.",
    },
    ativosFinanceiros: { origemCapital: "Salários + bônus", saldoConsolidadoBanco: 310000 },
    ativosNaoFinanceiros: {
      imoveisProprios: 1,
      imoveisExterior: 0,
      empresas: [],
    },
    fluxoCaixa: {
      despesasFixas: [
        { categoria: "Prestação (imóvel)", valor: 3000 },
        { categoria: "Médico (Sofia) — sobe acima do IPCA", valor: 5000 },
        { categoria: "Vida", valor: 5000 },
        { categoria: "Escola (Miguel)", valor: 2500 },
        { categoria: "Lifestyle", valor: 3500 },
      ],
      doacoes: { realiza: true, descricao: "associação de pacientes (R$ 300/mês)" },
      alertas: [
        { texto: "Reajuste do plano de saúde >15% a.a. por 2 anos seguidos.", severidade: "alta" },
        { texto: "Plano atrelado ao emprego dela (ponto único de falha).", severidade: "alta" },
      ],
      resumoIAGastos:
        "Superávit de 9% engana: a linha médica é perpétua e indexada à inflação médica — fundo apartado é a resposta.",
    },
    posicaoInternacional: { contaInternacional: false, investeExterior: false },
    planejamentos: { momentoDeVida: "Proteção crítica + acumulação dirigida (perpetuidade médica)" },
    protecao: {
      planejamentoSucessorio: "Iniciado e incompleto — sem testamento; sem estrutura para o cuidado de Sofia (lacuna nº 1)",
      segurosExternos: [
        { tipo: "Saúde empresarial", possui: true, obs: "via emprego dela" },
        { tipo: "Vida", possui: true, obs: "apólice pequena via empregador — subdimensionada" },
        { tipo: "Residencial", possui: false },
      ],
    },
  },

  "jose-carlos": {
    perfilPessoal: {
      ramo: "Metalurgia",
      cargo: "Gerente industrial (aposentadoria prevista em 8–10 anos)",
      contadorAdvogado: "Contador: só no IR",
      conhecimentoFinanceiro: "intermediário",
      interesses: ["churrasco", "futebol", "viagens com a esposa", "netos futuros"],
      esporte: { modalidade: "futebol", time: "Grêmio", nivel: "fanático (sócio)" },
      admira: ["Felipão", "o pai"],
      hobbies: ["churrasco de domingo", "pesca", "oficina em casa"],
      viagens: { gosta: true, nota: "Serra Gaúcha; 1 internacional/ano (Europa 'antes dos 60 e poucos')" },
      pets: ["cachorro 'Faísca'"],
    },
    perfilFamiliar: {
      moraCom: "esposa Marta (servidora aposentada)",
      filhos: [
        { nome: "Marcelo", idade: 29, nota: "casado" },
        { nome: "Carla", idade: 26 },
      ],
      arvoreGenealogica: [
        { parentesco: "esposa", nome: "Marta", banco: "Bradesco" },
        { parentesco: "filho", nome: "Marcelo", banco: "Bradesco" },
        { parentesco: "filha", nome: "Carla", banco: "banco digital" },
      ],
    },
    relacionamento: {
      temasSensiveis: [
        "'Sobreviver ao dinheiro' o assombra — falar de renda vitalícia com números, nunca com medo.",
      ],
      canaisPreferidos: ["presencial na agência (faz questão)", "telefone"],
      frequencia: "Mensal",
      estiloComunicacao: "Conservador, didático, confia em relacionamento longo (28 anos de banco)",
      conjugeClienteBradesco: true,
      filhosClientesBradesco: true,
      resumoIAFicha:
        "Virada acumulação→renda em curso; decisão da fase de saque da previdência (tabela regressiva) é a conversa do ano.",
    },
    ativosFinanceiros: {
      origemCapital: "Salário de carreira + previdência corporativa portada",
      saldoConsolidadoBanco: 1100000,
    },
    ativosNaoFinanceiros: {
      imoveisProprios: 1,
      imoveisExterior: 0,
      empresas: [],
    },
    fluxoCaixa: {
      despesasFixas: [
        { categoria: "Vida", valor: 6000 },
        { categoria: "Plano de saúde (subindo)", valor: 2500 },
        { categoria: "Lifestyle / viagem", valor: 4500 },
        { categoria: "Diversos", valor: 2000 },
      ],
      doacoes: { realiza: true, descricao: "APAE local (anual)" },
      alertas: [
        { texto: "Continuidade do plano de saúde pós-CLT não resolvida.", severidade: "media" },
      ],
      resumoIAGastos:
        "Superávit forte de R$ 7,5k na última janela; escada IPCA+ e plano de saque > qualquer produto novo.",
    },
    posicaoInternacional: { contaInternacional: false, investeExterior: false },
    planejamentos: { momentoDeVida: "Preservação — janela final de acumulação, virada para renda" },
    protecao: {
      planejamentoSucessorio: "Testamento não; beneficiários da previdência atualizados",
      segurosExternos: [
        { tipo: "Saúde", possui: true, obs: "Unimed" },
        { tipo: "Auto", possui: true, obs: "Porto" },
        { tipo: "Vida", possui: false, obs: "avaliar pertinência na idade" },
      ],
    },
  },

  ricardo: {
    perfilPessoal: {
      ramo: "Bens de consumo (multinacional)",
      cargo: "Diretor comercial",
      contadorAdvogado: "Contador: sim (IR complexo) · Advogado: eventual (contratos)",
      conhecimentoFinanceiro: "avançado",
      interesses: ["golfe", "vinhos", "geopolítica", "educação internacional"],
      esporte: { modalidade: "golfe (handicap social); futebol", time: "São Paulo FC", nivel: "ocasional" },
      admira: ["Abilio Diniz", "Warren Buffett"],
      hobbies: ["golfe aos sábados", "adega", "viagens com a família"],
      viagens: { gosta: true, nota: "sim — EUA/Europa 2x/ano" },
      pets: [],
    },
    perfilFamiliar: {
      moraCom: "esposa Beatriz (arquiteta autônoma) e filho Lucas (16)",
      filhos: [{ nome: "Lucas", idade: 16, nota: "intercâmbio / faculdade no exterior em 2–3 anos" }],
      arvoreGenealogica: [
        { parentesco: "esposa", nome: "Beatriz", banco: "outro banco (Itaú Personnalité)" },
        { parentesco: "irmão", nome: "—", banco: "sócio de corretora (influência externa)" },
      ],
    },
    relacionamento: {
      temasSensiveis: [
        "Detesta sentir-se 'vendido' — abordar como assessoria de consolidação, com agenda prévia.",
      ],
      canaisPreferidos: ["e-mail executivo", "presencial trimestral (almoço)", "WhatsApp só urgência"],
      frequencia: "Trimestral",
      estiloComunicacao: "Executivo, answer-first, material antes da reunião",
      conjugeClienteBradesco: false,
      resumoIAFicha:
        "Share of wallet 23% — baixo share com perfil Acumulador Sofisticado é sinal POSITIVO de captura, não desinteresse.",
    },
    ativosFinanceiros: {
      origemCapital: "Salário + bônus anuais + RSUs antigas",
      saldoConsolidadoBanco: 280000,
    },
    ativosNaoFinanceiros: {
      imoveisProprios: 1,
      imoveisExterior: 0,
      empresas: [],
    },
    fluxoCaixa: {
      despesasFixas: [
        { categoria: "Prestação (hipoteca)", valor: 5000 },
        { categoria: "Vida", valor: 7000 },
        { categoria: "Escola (Lucas)", valor: 4000 },
        { categoria: "Carro", valor: 2000 },
        { categoria: "Lifestyle", valor: 7000 },
      ],
      doacoes: { realiza: true, descricao: "campanha do alumni (anual)" },
      alertas: [
        { texto: "TEDs recorrentes para corretora XP nos últimos 6 meses — risco/realidade de portabilidade de investimentos.", severidade: "alta" },
      ],
      resumoIAGastos:
        "Bônus sem política: 40% consumido em upgrade de lifestyle nos últimos 2 ciclos; política formal de bônus é a primeira vitória.",
    },
    posicaoInternacional: { contaInternacional: true, investeExterior: true, valorExterior: 120000 },
    planejamentos: { momentoDeVida: "Pico de acumulação — consolidação e eficiência" },
    protecao: {
      planejamentoSucessorio: "Não formalizado",
      segurosExternos: [
        { tipo: "Vida", possui: true, obs: "corporativo (empregador)" },
        { tipo: "Auto", possui: true, obs: "Allianz" },
        { tipo: "Residencial", possui: true, obs: "Porto — disperso, sem visão única" },
      ],
    },
  },

  helena: {
    perfilPessoal: {
      ramo: "Educação superior (aposentada — professora universitária de Letras)",
      cargo: "Aposentada",
      contadorAdvogado: "Contador: sim (IR dos aluguéis)",
      conhecimentoFinanceiro: "intermediário (cautelosa)",
      interesses: ["netos", "literatura", "jardinagem", "cultura"],
      esporte: { modalidade: "Náutico (afetivo, pelo falecido marido)", time: "Náutico", nivel: "raro" },
      admira: ["Clarice Lispector", "a mãe"],
      hobbies: ["leitura", "jardim", "coral da paróquia"],
      viagens: { gosta: true, nota: "visita o filho em SP 3x/ano; sonho: Portugal com os netos" },
      pets: ["gata 'Nina'"],
    },
    perfilFamiliar: {
      moraCom: "sozinha (casa própria, Recife) — viúva há 2 anos",
      filhos: [
        { nome: "Paulo", idade: 38, nota: "SP" },
        { nome: "Beatriz", idade: 35, nota: "Recife" },
      ],
      arvoreGenealogica: [
        { parentesco: "filha", nome: "Beatriz", banco: "Bradesco" },
        { parentesco: "filho", nome: "Paulo", banco: "Itaú" },
        { parentesco: "netos", nome: "3 netos", banco: "—" },
      ],
    },
    relacionamento: {
      temasSensiveis: [
        "A viuvez — não apressar decisões 'agora que está sozinha'.",
        "Decisões grandes com a filha presente (a pedido dela).",
      ],
      canaisPreferidos: ["telefone", "presencial", "WhatsApp só para avisos"],
      frequencia: "Mensal, horário fixo",
      estiloComunicacao: "Didático, paciente, por escrito depois",
      resumoIAFicha:
        "Risco nº 1 é inflação na renda, não volatilidade; envolver Beatriz nas decisões aumenta conforto e conformidade.",
    },
    ativosFinanceiros: {
      origemCapital: "Carreira + pensão do esposo + seguro de vida recebido",
      saldoConsolidadoBanco: 950000,
    },
    ativosNaoFinanceiros: {
      imoveisProprios: 2,
      imoveisInvestimento: { qtd: 1, receitaMensal: 2500, nota: "imóvel de aluguel" },
      imoveisExterior: 0,
      empresas: [],
    },
    fluxoCaixa: {
      despesasFixas: [
        { categoria: "Vida", valor: 3500 },
        { categoria: "Saúde (crescente)", valor: 2500 },
        { categoria: "Manutenção de imóveis", valor: 1500 },
        { categoria: "Lifestyle", valor: 1500 },
      ],
      doacoes: { realiza: true, descricao: "paróquia + asilo (R$ 250/mês)" },
      alertas: [
        { texto: "Vacância eventual do imóvel de aluguel derruba a renda do mês.", severidade: "media" },
      ],
      resumoIAGastos:
        "Decumulação saudável; core IPCA+ com cupom resolve a angústia mensal melhor que qualquer fundo.",
    },
    posicaoInternacional: { contaInternacional: false, investeExterior: false },
    planejamentos: { momentoDeVida: "Sustentação do patrimônio (decumulação consciente)" },
    protecao: {
      planejamentoSucessorio:
        "Pendente — sem testamento (sabe que precisa; adia); beneficiários do VGBL desatualizados (só os filhos; quer incluir netos)",
      segurosExternos: [
        { tipo: "Saúde", possui: true, obs: "Hapvida (legado)" },
        { tipo: "Residencial", possui: true },
      ],
    },
  },

  patricia: {
    perfilPessoal: {
      ramo: "Indústria de alimentos funcionais",
      cargo: "Fundadora e CEO da Vetra Alimentos S.A. (vendeu 40% a fundo de PE)",
      contadorAdvogado: "Contador: sim (PJ+PF) · Advogado: sim (M&A e societário)",
      conhecimentoFinanceiro: "avançado (negócio) / intermediário (mercado financeiro pessoal)",
      interesses: ["gestão", "ESG", "vela", "longevidade"],
      esporte: { modalidade: "vela e trail run", nivel: "pratica" },
      admira: ["Luiza Trajano", "a avó"],
      hobbies: ["velejar", "trilhas em Floripa", "vinhos naturais"],
      viagens: { gosta: true, nota: "negócios + 1 grande viagem/ano com o filho" },
      pets: ["cachorro 'Max'"],
    },
    perfilFamiliar: {
      moraCom: "filho Theo (14) — guarda compartilhada",
      filhos: [{ nome: "Theo", idade: 14 }],
      arvoreGenealogica: [
        { parentesco: "mãe", nome: "—", banco: "Bradesco" },
        { parentesco: "ex-cônjuge", nome: "—", banco: "outro banco — não é interlocutor" },
      ],
    },
    relacionamento: {
      temasSensiveis: [
        "O divórcio e o ex — fora da pauta.",
        "Não tratar o caixa parado como 'erro dela', e sim como prudência a converter em plano.",
      ],
      canaisPreferidos: ["reunião quinzenal curta (30 min, vídeo)", "e-mail executivo"],
      frequencia: "Quinzenal nesta fase (deployment)",
      estiloComunicacao: "Dona da decisão — opções com prós/contras, ela bate o martelo",
      resumoIAFicha:
        "Janela pós-liquidez: R$ 18M líquidos, 35% em DI por inércia; deployment + holding + sucessão de Theo são o tripé.",
    },
    ativosFinanceiros: {
      origemCapital: "Venda parcial de participação societária (evento de liquidez) + pró-labore/dividendos",
      saldoConsolidadoBanco: 14000000,
    },
    ativosNaoFinanceiros: {
      imoveisProprios: 1,
      imoveisInvestimento: { qtd: 1, receitaMensal: 6000, nota: "financiado ~R$ 200k, alugado" },
      imoveisExterior: 0,
      empresas: [
        { nome: "Vetra Alimentos S.A.", porte: "médio (~180 funcionários)", nota: "participação remanescente ~R$ 12M" },
      ],
    },
    fluxoCaixa: {
      despesasFixas: [
        { categoria: "Moradia", valor: 6000 },
        { categoria: "Vida", valor: 9000 },
        { categoria: "Imóvel de investimento", valor: 2000 },
        { categoria: "Theo", valor: 3000 },
        { categoria: "Lifestyle", valor: 15000 },
      ],
      doacoes: { realiza: true, descricao: "instituto de empreendedorismo feminino (R$ 2k/mês)" },
      alertas: [
        { texto: "R$ 6,3M em DI sem destinação há 90+ dias (oportunidade interna).", severidade: "alta" },
      ],
      resumoIAGastos:
        "Tributação do ganho realizado e dividendos 2026 na mesa; alocação por baldes destrava o caixa sem gatilho de ansiedade.",
    },
    posicaoInternacional: { contaInternacional: true, investeExterior: true, valorExterior: 1800000 },
    planejamentos: { momentoDeVida: "Estruturação pós-liquidez (preservar + alocar + suceder)" },
    protecao: {
      planejamentoSucessorio: "Em estruturação — holding em estudo com o advogado; testamento não",
      segurosExternos: [
        { tipo: "Empresarial", possui: true, obs: "Vetra" },
        { tipo: "Pessoa-chave", possui: false, obs: "lacuna" },
        { tipo: "Vida pessoal", possui: true, obs: "pequena" },
        { tipo: "Auto / residencial", possui: true },
      ],
    },
  },

  antonio: {
    perfilPessoal: {
      ramo: "Imobiliário + agro",
      cargo: "Sócio-fundador (incorporação) e titular da Agropecuária Santa Clara Ltda",
      contadorAdvogado: "Contador: sim · Advogado tributarista: sim · Family office embrionário (em formação)",
      conhecimentoFinanceiro: "avançado",
      interesses: ["agro", "arte brasileira", "náutica", "filantropia educacional"],
      esporte: { modalidade: "hipismo (das filhas, acompanha); futebol", time: "São Paulo FC", nivel: "raro (futebol)" },
      admira: ["o avô fundador", "Jorge Gerdau (governança)"],
      hobbies: ["carros de coleção", "barco", "fazenda nos fins de semana", "colecionismo de arte"],
      viagens: { gosta: true, nota: "Europa anual + fazenda mensal" },
      pets: ["cães na fazenda"],
    },
    perfilFamiliar: {
      moraCom: "esposa Cláudia (62)",
      filhos: [
        { nome: "Henrique", idade: 36, nota: "no negócio" },
        { nome: "Camila A.", idade: 33, nota: "advogada" },
        { nome: "Rafael", idade: 29, nota: "mora em Londres" },
      ],
      arvoreGenealogica: [
        { parentesco: "esposa", nome: "Cláudia", banco: "Bradesco Private" },
        { parentesco: "filho", nome: "Henrique", banco: "Bradesco" },
        { parentesco: "filho", nome: "Rafael", banco: "HSBC UK" },
        { parentesco: "netos", nome: "2 netos", banco: "—" },
      ],
    },
    relacionamento: {
      temasSensiveis: [
        "A rivalidade entre Henrique e Rafael na sucessão — nunca opinar sobre 'quem merece'; conduzir por governança, não por pessoas.",
        "Saúde própria: tema fechado.",
      ],
      canaisPreferidos: ["presencial com o gerente private (quinzenal)", "telefone direto"],
      frequencia: "Quinzenal",
      estiloComunicacao: "Institucional, discreto, decisões maturadas em 2 reuniões",
      conjugeClienteBradesco: true,
      filhosClientesBradesco: true,
      resumoIAFicha:
        "O trabalho é o balanço inteiro (~R$ 80M): liquidez para ITCMD, holding, doações em vida e governança — produto é consequência.",
    },
    ativosFinanceiros: {
      origemCapital: "Construção patrimonial de uma vida: incorporação imobiliária + agro + aluguéis + dividendos",
      saldoConsolidadoBanco: 19000000,
    },
    ativosNaoFinanceiros: {
      imoveisProprios: 3,
      imoveisInvestimento: { qtd: 1, receitaMensal: 55000, nota: "imóvel comercial alugado (~R$ 10M)" },
      imoveisExterior: 0,
      empresas: [
        { nome: "Agropecuária Santa Clara", porte: "médio" },
        { nome: "Holding patrimonial", porte: "em estruturação" },
      ],
    },
    fluxoCaixa: {
      despesasFixas: [
        { categoria: "Carrego dos ativos (IPTU, marina, equipe, manutenção)", valor: 30000 },
        { categoria: "Vida", valor: 25000 },
        { categoria: "Empréstimo comercial", valor: 5000 },
        { categoria: "Lifestyle / viagem", valor: 30000 },
      ],
      doacoes: { realiza: true, descricao: "bolsas de estudo (quer estruturar instituto, ~R$ 8k/mês hoje)" },
      alertas: [
        { texto: "Seguros patrimoniais subdimensionados vs. valor segurado (arte / barco / fazenda).", severidade: "alta" },
      ],
      resumoIAGastos:
        "Espólio hoje não paga o próprio ITCMD sem vender ativo ilíquido — criação de liquidez é a prioridade técnica.",
    },
    posicaoInternacional: { contaInternacional: true, investeExterior: true, valorExterior: 5000000 },
    planejamentos: { momentoDeVida: "Sustentação e transmissão (sucessão entre gerações)" },
    protecao: {
      planejamentoSucessorio:
        "Parcial — doações em vida iniciadas (1 imóvel), holding em estruturação, testamento desatualizado (pré-venda da incorporadora); governança familiar inexistente",
      segurosExternos: [
        { tipo: "Frota / coleção", possui: true, obs: "subdimensionado" },
        { tipo: "Náutico", possui: true },
        { tipo: "Residencial", possui: true },
        { tipo: "Rural", possui: true, obs: "parcial" },
        { tipo: "Vida", possui: false, obs: "avalia para liquidez de ITCMD" },
      ],
    },
  },
};
