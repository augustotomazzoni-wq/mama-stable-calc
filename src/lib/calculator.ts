import { addDays, addMonthsExcelLike, ceilMonthsBetween } from './dateUtils';

export interface CalcInput {
  nome: string;
  nascimento: Date;
  salario: number;
  demissao: Date;
  concepcao: Date;
  partoPrevisao: Date;
  pediuAConta: boolean;
  mesesManual: number | null;
  empregadaDomestica: boolean;
  admissao: Date | null;
  calcularMultaFgts: boolean;
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
  total: number;
}

export interface MultaFgtsResult {
  fgtsAcumuladoContrato: number;
  mesesContrato: number;
  fgtsAcerto: number;
  baseFgtsTotal: number;
  multa40: number;
  temAdmissao: boolean;
}

export interface CalcResult {
  previsaoParto: Date;
  fimEstabilidade: Date;
  mesesEstabilidadeAuto: number;
  mesesEstabilidade: number;
  mesesManual: boolean;
  tabela1: Tabela1;
  tabela2: Tabela2 | null;
  multaFgts: MultaFgtsResult | null;
  totalFinal: number;
  pediuAConta: boolean;
  tipoRescisao: string;
}

export function calcPrevisaoParto(concepcao: Date): Date {
  return addDays(concepcao, 266);
}

export function calcMesesAteParto(demissao: Date, parto: Date): number {
  if (demissao >= parto) return 0;
  return ceilMonthsBetween(demissao, parto);
}

export function calcMesesEstabilidade(demissao: Date, parto: Date): number {
  const mesesAteParto = calcMesesAteParto(demissao, parto);
  return mesesAteParto + 5;
}

function calcTabela1(salario: number, meses: number, empregadaDomestica: boolean): Tabela1 {
  const salarios = meses * salario;
  const decimoTerceiro = (salario / 12) * meses;
  const feriasComTerco = (salario / 3) + decimoTerceiro;
  const aliquotaFgts = empregadaDomestica ? 0.112 : 0.08;
  const fgts = (salarios + decimoTerceiro + feriasComTerco) * aliquotaFgts;
  const total = salarios + decimoTerceiro + feriasComTerco + fgts;
  return { salarios, decimoTerceiro, feriasComTerco, fgts, total };
}

function calcTabela2(salario: number): Tabela2 {
  const avisoProvio = salario;
  const decimoTerceiroAviso = avisoProvio / 12;
  const feriasComTercoAviso = (decimoTerceiroAviso / 3) + decimoTerceiroAviso;
  const multa477 = salario;
  const total = avisoProvio + decimoTerceiroAviso + feriasComTercoAviso + multa477;
  return { avisoProvio, decimoTerceiroAviso, feriasComTercoAviso, multa477, total };
}

function calcMultaFgts(input: CalcInput, fgtsAcerto: number): MultaFgtsResult {
  const aliquota = input.empregadaDomestica ? 0.112 : 0.08;
  const temAdmissao = input.admissao !== null;

  let fgtsAcumuladoContrato = 0;
  let mesesContrato = 0;

  if (temAdmissao && input.admissao) {
    mesesContrato = ceilMonthsBetween(input.admissao, input.demissao);
    fgtsAcumuladoContrato = input.salario * aliquota * mesesContrato;
  }

  const baseFgtsTotal = fgtsAcumuladoContrato + fgtsAcerto;
  const multa40 = baseFgtsTotal * 0.4;

  return {
    fgtsAcumuladoContrato,
    mesesContrato,
    fgtsAcerto,
    baseFgtsTotal,
    multa40,
    temAdmissao,
  };
}

export function calculate(input: CalcInput): CalcResult {
  const previsaoParto = input.partoPrevisao;
  const fimEstabilidade = addMonthsExcelLike(previsaoParto, 5);
  const mesesEstabilidadeAuto = calcMesesEstabilidade(input.demissao, previsaoParto);

  const mesesManual = input.mesesManual !== null;
  const mesesEstabilidade = mesesManual ? input.mesesManual! : mesesEstabilidadeAuto;

  const tabela1 = calcTabela1(input.salario, mesesEstabilidade, input.empregadaDomestica);

  let tabela2: Tabela2 | null = null;
  if (input.pediuAConta) {
    tabela2 = calcTabela2(input.salario);
  }

  let multaFgts: MultaFgtsResult | null = null;
  if (input.calcularMultaFgts) {
    multaFgts = calcMultaFgts(input, tabela1.fgts);
  }

  const tipoRescisao = input.pediuAConta ? "Pedido de demissão" : "Dispensa";

  let totalFinal = tabela1.total;
  if (input.pediuAConta && tabela2) {
    totalFinal += tabela2.total;
  }
  if (multaFgts) {
    totalFinal += multaFgts.multa40;
  }

  return {
    previsaoParto,
    fimEstabilidade,
    mesesEstabilidadeAuto,
    mesesEstabilidade,
    mesesManual,
    tabela1,
    tabela2,
    multaFgts,
    totalFinal,
    pediuAConta: input.pediuAConta,
    tipoRescisao,
  };
}
