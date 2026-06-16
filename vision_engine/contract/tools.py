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
    ResultEnvelope,
)
from contract.registry import tool
from core.money import D, brl
from market import renda_fixa
from params.loader import load_params
from planning import objetivos
from tax import ganho_capital, ir_investimentos, irpf


@tool("irpf_mensal", IrpfMensalInput, "IR mensal devido (IRPF, Lei 15.270) sobre a base mensal.")
def irpf_mensal_tool(inp: IrpfMensalInput) -> ResultEnvelope:
    ps = load_params("irpf", inp.data_referencia)
    valor = irpf.irpf_mensal(inp.base, ps.dados)
    return ResultEnvelope(
        valor=brl(valor),
        unidade="BRL",
        formula="max(base·alíquota − dedução de tabela − redutor Lei 15.270; 0)",
        parametros_versao=ps.versao,
        premissas={"base_mensal": str(inp.base)},
    )


@tool(
    "ir_renda_fixa",
    IrRendaFixaInput,
    "IR sobre rendimento de renda fixa (tabela regressiva por prazo).",
)
def ir_renda_fixa_tool(inp: IrRendaFixaInput) -> ResultEnvelope:
    ps = load_params("ir_investimentos", inp.data_referencia)
    isento = ir_investimentos.is_isento_pf(inp.produto, ps.dados)
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
