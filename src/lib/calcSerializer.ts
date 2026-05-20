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
  const i = reviveDates(data, ["nascimento", "demissao", "concepcao", "partoPrevisao", "admissao"]);
  if (i.nascimento === null || i.nascimento === undefined) i.nascimento = null;
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
  };
}

export function deserializeResult(data: any): CalcResult {
  return reviveDates(data, ["previsaoParto", "fimEstabilidade"]) as CalcResult;
}

export function buildResumoJson(input: CalcInput, result: CalcResult) {
  return {
    nome: input.nome,
    salario: input.salario,
    tipoRescisao: result.tipoRescisao,
    mesesEstabilidade: result.mesesEstabilidade,
    subtotalIndenizacao: result.tabela1.total,
    subtotalVerbasRescisorias: result.tabela2?.total ?? 0,
    multaFgts40: result.multaFgts?.multa40 ?? 0,
    totalFinal: result.totalFinal,
  };
}