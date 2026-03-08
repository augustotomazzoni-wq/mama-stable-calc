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
  total: number;
}

export interface Tabela2 {
  fgts: number;
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
  tabela2: Tabela2;
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

function calcTabela1(salario: number, meses: number): Tabela1 {
  const salarios = meses * salario;
  const decimoTerceiro = (salario / 12) * meses;
  const feriasComTerco = (salario / 3) + decimoTerceiro;
  const total = salarios + decimoTerceiro + feriasComTerco;
  return { salarios, decimoTerceiro, feriasComTerco, total };
}

function calcTabela2(salario: number, tabela1: Tabela1, empregadaDomestica: boolean, pediuAConta: boolean): Tabela2 {
  const aliquotaFgts = empregadaDomestica ? 0.112 : 0.08;
  const fgts = (tabela1.salarios + tabela1.decimoTerceiro + tabela1.feriasComTerco) * aliquotaFgts;

  let avisoProvio = 0;
  let decimoTerceiroAviso = 0;
  let feriasComTercoAviso = 0;
  let multa477 = 0;

  if (pediuAConta) {
    avisoProvio = salario;
    decimoTerceiroAviso = avisoProvio / 12;
    feriasComTercoAviso = (decimoTerceiroAviso / 3) + decimoTerceiroAviso;
    multa477 = salario;
  }

  const total = fgts + avisoProvio + decimoTerceiroAviso + feriasComTercoAviso + multa477;
  return { fgts, avisoProvio, decimoTerceiroAviso, feriasComTercoAviso, multa477, total };
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

  const tabela1 = calcTabela1(input.salario, mesesEstabilidade);
  const tabela2 = calcTabela2(input.salario, tabela1, input.empregadaDomestica, input.pediuAConta);

  let multaFgts: MultaFgtsResult | null = null;
  if (input.calcularMultaFgts) {
    multaFgts = calcMultaFgts(input, tabela2.fgts);
  }

  const tipoRescisao = input.pediuAConta ? "Pedido de demissão" : "Dispensa";

  let totalFinal = tabela1.total + tabela2.total;
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
