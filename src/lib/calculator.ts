import { addDays, addMonthsExcelLike, ceilMonthsBetween } from './dateUtils';

export interface CalcInput {
  nome: string;
  nascimento: Date;
  salario: number;
  demissao: Date;
  concepcao: Date;
  partoPrevisao: Date;
}

export interface CalcResult {
  previsaoParto: Date;
  fimEstabilidade: Date;
  mesesEstabilidade: number;
  salarios: number;
  decimoTerceiro: number;
  feriasComTerco: number;
  fgts: number;
  total: number;
}

export function calcPrevisaoParto(concepcao: Date): Date {
  return addDays(concepcao, 266);
}

export function calculate(input: CalcInput): CalcResult {
  const previsaoParto = input.partoPrevisao;
  const fimEstabilidade = addMonthsExcelLike(previsaoParto, 5);
  const mesesEstabilidade = ceilMonthsBetween(input.demissao, fimEstabilidade);

  const s = input.salario;
  const m = mesesEstabilidade;

  const salarios = s * m;
  const decimoTerceiro = (s / 12) * m;
  const feriasComTerco = (s / 12) * m * (4 / 3);
  const fgts = m * 0.08 * s;
  const total = salarios + decimoTerceiro + feriasComTerco + fgts;

  return {
    previsaoParto,
    fimEstabilidade,
    mesesEstabilidade,
    salarios,
    decimoTerceiro,
    feriasComTerco,
    fgts,
    total,
  };
}
