import { addDays, addMonthsExcelLike, ceilMonthsBetween } from './dateUtils';

export interface CalcInput {
  nome: string;
  nascimento: Date;
  salario: number;
  demissao: Date;
  concepcao: Date;
  partoPrevisao: Date;
  pediuAConta: boolean;
  reconhecerEstabilidade: boolean;
  mesesManual: number | null; // null = usar automático
}

export interface Tabela1 {
  salarios: number;
  decimoTerceiro: number;
  feriasComTerco: number;
  fgts: number;
  total: number;
}

export interface Tabela2 {
  avisoProvio: number;
  decimoTerceiroAviso: number;
  feriasComTercoAviso: number;
  multa477: number;
  multa40Fgts: number;
  total: number;
}

export interface CalcResult {
  previsaoParto: Date;
  fimEstabilidade: Date;
  mesesEstabilidadeAuto: number;
  mesesEstabilidade: number;
  mesesManual: boolean;
  tabela1: Tabela1;
  tabela2: Tabela2 | null;
  totalFinal: number;
  pediuAConta: boolean;
  reconhecerEstabilidade: boolean;
  tipoRescisao: string;
}

export function calcPrevisaoParto(concepcao: Date): Date {
  return addDays(concepcao, 266);
}

export function calcMesesEstabilidade(demissao: Date, fimEstabilidade: Date): number {
  return ceilMonthsBetween(demissao, fimEstabilidade);
}

function calcTabela1(salario: number, meses: number): Tabela1 {
  const salarios = meses * salario;
  const decimoTerceiro = (salario / 12) * meses;
  const feriasComTerco = (salario / 3) + decimoTerceiro;
  const fgts = meses * 0.08 * salario;
  const total = salarios + decimoTerceiro + feriasComTerco + fgts;
  return { salarios, decimoTerceiro, feriasComTerco, fgts, total };
}

function calcTabela2(salario: number): Tabela2 {
  const avisoProvio = salario;
  const decimoTerceiroAviso = avisoProvio / 12;
  const feriasComTercoAviso = (decimoTerceiroAviso / 3) + decimoTerceiroAviso;
  const multa477 = salario;
  const multa40Fgts = avisoProvio + decimoTerceiroAviso + feriasComTercoAviso + multa477;
  const total = avisoProvio + decimoTerceiroAviso + feriasComTercoAviso + multa477 + multa40Fgts;
  return { avisoProvio, decimoTerceiroAviso, feriasComTercoAviso, multa477, multa40Fgts, total };
}

export function calculate(input: CalcInput): CalcResult {
  const previsaoParto = input.partoPrevisao;
  const fimEstabilidade = addMonthsExcelLike(previsaoParto, 5);
  const mesesEstabilidadeAuto = calcMesesEstabilidade(input.demissao, fimEstabilidade);

  const mesesManual = input.mesesManual !== null;
  const mesesEstabilidade = mesesManual ? input.mesesManual! : mesesEstabilidadeAuto;

  const tabela1 = calcTabela1(input.salario, mesesEstabilidade);

  let tabela2: Tabela2 | null = null;
  if (input.pediuAConta) {
    tabela2 = calcTabela2(input.salario);
  }

  const tipoRescisao = input.pediuAConta ? "Pedido de demissão" : "Dispensa";

  let totalFinal = tabela1.total;
  if (input.pediuAConta && input.reconhecerEstabilidade && tabela2) {
    totalFinal = tabela1.total + tabela2.total;
  }

  return {
    previsaoParto,
    fimEstabilidade,
    mesesEstabilidadeAuto,
    mesesEstabilidade,
    mesesManual,
    tabela1,
    tabela2,
    totalFinal,
    pediuAConta: input.pediuAConta,
    reconhecerEstabilidade: input.reconhecerEstabilidade,
    tipoRescisao,
  };
}
