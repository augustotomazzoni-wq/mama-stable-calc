import { CalcInput, CalcResult } from "./calculator";

// Datas -> ISO; revive de volta para Date ao carregar.
function reviveDates<T extends Record<string, any>>(obj: T, keys: (keyof T)[]): T {
  const out: any = { ...obj };
  for (const k of keys) {
    if (out[k]) out[k] = new Date(out[k]);
  }
  return out;
}

export function serializeInput(input: CalcInput) {
  return {
    ...input,
    nascimento: input.nascimento ? input.nascimento.toISOString() : null,
    demissao: input.demissao.toISOString(),
    concepcao: input.concepcao.toISOString(),
    partoPrevisao: input.partoPrevisao.toISOString(),
    admissao: input.admissao ? input.admissao.toISOString() : null,
    dataReferencia: input.dataReferencia ? input.dataReferencia.toISOString() : undefined,
    vinculo: input.vinculo
      ? {
          ...input.vinculo,
          inicio: input.vinculo.inicio.toISOString(),
          fim: input.vinculo.fim.toISOString(),
        }
      : null,
    concepcaoInfo: input.concepcaoInfo
      ? {
          ...input.concepcaoInfo,
          dataExame: input.concepcaoInfo.dataExame?.toISOString(),
          dumEstimada: input.concepcaoInfo.dumEstimada?.toISOString(),
          concepcaoEstimada: input.concepcaoInfo.concepcaoEstimada?.toISOString(),
          dpp: input.concepcaoInfo.dpp?.toISOString(),
        }
      : undefined,
  };
}

export function deserializeInput(data: any): CalcInput {
  const i = reviveDates(data, ["nascimento", "demissao", "concepcao", "partoPrevisao", "admissao", "dataReferencia"]);
  if (i.nascimento === null || i.nascimento === undefined) i.nascimento = null;
  if (i.vinculo) {
    i.vinculo = reviveDates(i.vinculo, ["inicio", "fim"]);
  }
  if (i.concepcaoInfo) {
    i.concepcaoInfo = reviveDates(i.concepcaoInfo, [
      "dataExame",
      "dumEstimada",
      "concepcaoEstimada",
      "dpp",
    ]);
  }
  return i as CalcInput;
}

export function serializeResult(result: CalcResult) {
  return {
    ...result,
    previsaoParto: result.previsaoParto.toISOString(),
    fimEstabilidade: result.fimEstabilidade.toISOString(),
    vinculo: result.vinculo
      ? {
          ...result.vinculo,
          inicio: result.vinculo.inicio.toISOString(),
          fim: result.vinculo.fim.toISOString(),
        }
      : null,
  };
}

export function deserializeResult(data: any): CalcResult {
  const r = reviveDates(data, ["previsaoParto", "fimEstabilidade"]);
  if (r.vinculo) {
    r.vinculo = reviveDates(r.vinculo, ["inicio", "fim"]);
    if (Array.isArray(r.vinculo.periodosFerias)) {
      r.vinculo.periodosFerias = r.vinculo.periodosFerias.map((p: any) => reviveDates(p, ["inicio", "fim"]));
    }
  }
  return r as CalcResult;
}

export function buildResumoJson(input: CalcInput, result: CalcResult) {
  return {
    nome: input.nome,
    salario: input.salario,
    tipoRescisao: result.tipoRescisao,
    mesesEstabilidade: result.mesesEstabilidade,
    subtotalIndenizacao: result.tabela1.total,
    subtotalVerbasRescisorias: result.tabela2?.total ?? 0,
    subtotalVinculo: result.vinculo?.total ?? 0,
    tipoRegistro: result.tipoRegistro ?? "com_carteira",
    subtotalOpcionais: result.opcionais?.total ?? 0,
    mesesVinculo: result.vinculo?.meses ?? 0,
    multaFgts40: result.multaFgts?.multa40 ?? 0,
    totalFinal: result.totalFinal,
  };
}