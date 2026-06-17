"""Ferramentas expostas à LLM — cada uma envelopa uma função do motor.

Aqui (camada de contrato) é permitido I/O: carregar os parâmetros vigentes pela
``data_referencia``. O núcleo/domínio permanecem puros. Toda saída é um
``ResultEnvelope`` com ``formula`` e ``parametros_versao`` (auditável).
"""

from __future__ import annotations

from decimal import Decimal

from contract.models import (
    AporteObjetivoInput,
    CdbLiquidoInput,
    GanhoCapitalInput,
    IrpfMensalInput,
    IrRendaFixaInput,
    PgblDeducaoInput,
    PrevidenciaProgressivaInput,
    ResultEnvelope,
)
from contract.registry import tool
from core.money import D, brl
from market import renda_fixa
from params.loader import load_params
from planning import objetivos
from tax import ganho_capital, ir_investimentos, irpf, previdencia


@tool("irpf_mensal", IrpfMensalInput, "IR mensal devido (IRPF, Lei 15.270) sobre a base mensal.")
def irpf_mensal_tool(inp: IrpfMensalInput) -> ResultEnvelope:
    ps = load_params("irpf", inp.data_referencia)
    valor = irpf.irpf_mensal(inp.base, ps.dados)
    redutor = ps.dados.get("mensal", {}).get("redutor_lei_15270", {})
    calibrado = bool(redutor.get("calibrado", True))
    return ResultEnvelope(
        valor=brl(valor),
        unidade="BRL",
        formula="max(base·alíquota − dedução de tabela − redutor Lei 15.270; 0)",
        parametros_versao=ps.versao,
        # redutor_calibrado=false sinaliza que o coeficiente da rampa do redutor
        # (R$5k–7,35k) ainda não foi confirmado no texto oficial (não fabricar).
        premissas={"base_mensal": str(inp.base), "redutor_calibrado": str(calibrado).lower()},
    )


@tool(
    "ir_renda_fixa",
    IrRendaFixaInput,
    "IR sobre rendimento de renda fixa (tabela regressiva por prazo).",
)
def ir_renda_fixa_tool(inp: IrRendaFixaInput) -> ResultEnvelope:
    ps = load_params("ir_investimentos", inp.data_referencia)
    # classificação tri-estado: produto desconhecido -> OutOfRange (não tributa
    # em silêncio). Isento -> IR 0; tributável -> tabela regressiva.
    isento = ir_investimentos.classificar_produto(inp.produto, ps.dados) == "isento"
    valor = (
        Decimal(0)
        if isento
        else ir_investimentos.ir_renda_fixa(inp.rendimento, inp.dias_corridos, ps.dados)
    )
    aliq = (
        Decimal(0)
        if isento
        else ir_investimentos.aliquota_renda_fixa(inp.dias_corridos, ps.dados)
    )
    return ResultEnvelope(
        valor=brl(valor),
        unidade="BRL",
        formula="isento (PF)" if isento else "rendimento · alíquota_regressiva(dias)",
        parametros_versao=ps.versao,
        premissas={
            "produto": inp.produto,
            "dias_corridos": str(inp.dias_corridos),
            "aliquota": str(aliq),
        },
    )


@tool(
    "ganho_capital",
    GanhoCapitalInput,
    "IR sobre ganho de capital (faixas progressivas marginais).",
)
def ganho_capital_tool(inp: GanhoCapitalInput) -> ResultEnvelope:
    ps = load_params("ganho_capital", inp.data_referencia)
    valor = ganho_capital.ir_ganho_capital(inp.ganho, ps.dados)
    return ResultEnvelope(
        valor=brl(valor),
        unidade="BRL",
        formula="Σ (fatia · alíquota da faixa) — progressivo marginal",
        parametros_versao=ps.versao,
        premissas={"ganho": str(inp.ganho)},
    )


@tool(
    "cdb_liquido",
    CdbLiquidoInput,
    "Rendimento LÍQUIDO de um CDB %CDI (base 252, IOF + IR regressivo).",
)
def cdb_liquido_tool(inp: CdbLiquidoInput) -> ResultEnvelope:
    macro = load_params("macro", inp.data_referencia)
    ir = load_params("ir_investimentos", inp.data_referencia)
    iof = load_params("iof", inp.data_referencia)
    cdi = D(macro.dados["cdi_aa"])
    bruto = renda_fixa.rendimento_cdb_pos(inp.valor, inp.pct_cdi, cdi, inp.prazo_dias_uteis)
    res = renda_fixa.liquido_renda_fixa(
        inp.valor, bruto, inp.prazo_dias_corridos, "CDB", ir.dados, iof.dados
    )
    return ResultEnvelope(
        valor=brl(res.rendimento_liquido),
        unidade="BRL",
        formula="bruto(base252, %CDI) − IOF(<30d) − IR_regressivo",
        parametros_versao=f"{macro.versao};{ir.versao};{iof.versao}",
        premissas={"pct_cdi": str(inp.pct_cdi), "cdi_aa": str(cdi)},
        detalhe={
            "rendimento_bruto": str(brl(res.rendimento_bruto)),
            "iof": str(brl(res.iof)),
            "ir": str(brl(res.ir)),
            "valor_final_liquido": str(brl(res.valor_final_liquido)),
        },
    )


@tool(
    "aporte_objetivo",
    AporteObjetivoInput,
    "Aporte mensal necessário p/ atingir uma meta (PMT, taxa real).",
)
def aporte_objetivo_tool(inp: AporteObjetivoInput) -> ResultEnvelope:
    valor = objetivos.aporte_necessario_mensal(
        inp.vf_meta, inp.vp_atual, inp.taxa_real_aa, inp.meses
    )
    return ResultEnvelope(
        valor=brl(valor),
        unidade="BRL/mês",
        formula="(VF − VP·(1+i)^n)·i / ((1+i)^n − 1), i mensal da taxa real",
        premissas={"meta": str(inp.vf_meta), "meses": str(inp.meses)},
    )


@tool(
    "pgbl_deducao",
    PgblDeducaoInput,
    "Parcela dedutível do PGBL (até 12% da renda bruta tributável) e economia de IR no ano.",
)
def pgbl_deducao_tool(inp: PgblDeducaoInput) -> ResultEnvelope:
    pv = load_params("previdencia", inp.data_referencia)
    ip = load_params("irpf", inp.data_referencia)
    deduzivel = previdencia.base_deduzivel_pgbl(
        inp.contribuicao_ano, inp.renda_bruta_tributavel_ano, pv.dados
    )
    teto = D(inp.renda_bruta_tributavel_ano) * D(pv.dados["pgbl_vgbl"]["pgbl_deducao_pct"])
    # economia = IRPF sobre a renda cheia − IRPF sobre a renda já deduzida (anual)
    ir_sem = irpf.irpf_anual(inp.renda_bruta_tributavel_ano, ip.dados)
    ir_com = irpf.irpf_anual(D(inp.renda_bruta_tributavel_ano) - deduzivel, ip.dados)
    economia = ir_sem - ir_com
    return ResultEnvelope(
        valor=brl(deduzivel),
        unidade="BRL",
        formula="dedutível = min(contribuição; 12%·renda bruta tributável); "
        "economia = IRPF(renda) − IRPF(renda − dedutível)",
        parametros_versao=f"{pv.versao};{ip.versao}",
        premissas={
            "contribuicao_ano": str(inp.contribuicao_ano),
            "renda_bruta_tributavel_ano": str(inp.renda_bruta_tributavel_ano),
        },
        detalhe={
            "teto_12pct": str(brl(teto)),
            "parcela_deduzivel": str(brl(deduzivel)),
            "economia_ir_ano": str(brl(economia)),
        },
    )


@tool(
    "previdencia_progressiva",
    PrevidenciaProgressivaInput,
    "IR no regime PROGRESSIVO de previdência (tabela IRPF; IRRF 15% na fonte compensável).",
)
def previdencia_progressiva_tool(inp: PrevidenciaProgressivaInput) -> ResultEnvelope:
    ip = load_params("irpf", inp.data_referencia)
    pv = load_params("previdencia", inp.data_referencia)
    ir = previdencia.ir_previdencia_progressivo(inp.beneficio_mensal, ip.dados)
    irrf = previdencia.irrf_fonte_progressivo(inp.beneficio_mensal, pv.dados)
    return ResultEnvelope(
        valor=brl(ir),
        unidade="BRL/mês",
        formula="IR mensal pela tabela IRPF sobre o benefício; "
        "IRRF 15% retido na fonte é compensável",
        parametros_versao=f"{ip.versao};{pv.versao}",
        premissas={"beneficio_mensal": str(inp.beneficio_mensal)},
        detalhe={
            "ir_devido_tabela": str(brl(ir)),
            "irrf_fonte_15pct": str(brl(irrf)),
            "a_compensar_ou_restituir": str(brl(irrf - ir)),
        },
    )
