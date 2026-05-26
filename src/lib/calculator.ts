import { addDays, addMonthsExcelLike, ceilMonthsBetween } from './dateUtils';

export interface ConcepcaoInfo {
  metodo: 'exame' | 'dpp' | 'dum' | 'insuficiente';
  dataExame?: Date;
  semanasExame?: number;
  diasExame?: number;
  idadeGestacionalDias?: number;
  dumEstimada?: Date;
  concepcaoEstimada?: Date;
  dpp?: Date;
}

export interface CalcInput {
  nome: string;
  nascimento: Date | null;
  salario: number;
  demissao: Date;
  concepcao: Date;
  partoPrevisao: Date;
  pediuAConta: boolean;
  mesesManual: number | null;
  empregadaDomestica: boolean;
  admissao: Date | null;
  calcularMultaFgts: boolean;
  concepcaoInfo?: ConcepcaoInfo;
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
  fgtsRescisorio: number;
  mesesTrabalhados: number;
  fgtsPeriodoContrato: number;
  baseTotalFgts: number;
  multa40: number;
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
  const feriasProporcionais = (salario / 12) * meses;
  const feriasComTerco = feriasProporcionais + feriasProporcionais / 3;
  const subtotalVerbas = salarios + decimoTerceiro + feriasComTerco;
  const aliquota = empregadaDomestica ? 0.112 : 0.08;
  const fgts = subtotalVerbas * aliquota;
  const total = subtotalVerbas + fgts;
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

function calcMultaFgts(input: CalcInput, fgtsRescisorio: number): MultaFgtsResult {
  const aliquota = input.empregadaDomestica ? 0.112 : 0.08;
  let mesesTrabalhados = 0;
  let fgtsPeriodoContrato = 0;

  if (input.admissao) {
    mesesTrabalhados = ceilMonthsBetween(input.admissao, input.demissao);
    fgtsPeriodoContrato = mesesTrabalhados * input.salario * aliquota;
  }

  const baseTotalFgts = fgtsRescisorio + fgtsPeriodoContrato;
  const multa40 = baseTotalFgts * 0.4;

  return {
    fgtsRescisorio,
    mesesTrabalhados,
    fgtsPeriodoContrato,
    baseTotalFgts,
    multa40,
  };
}

export function calculate(input: CalcInput): CalcResult {
  const previsaoParto = input.partoPrevisao;
  const fimEstabilidade = addMonthsExcelLike(previsaoParto, 5);
  const mesesEstabilidadeAuto = calcMesesEstabilidade(input.demissao, previsaoParto);

  const mesesManual = input.mesesManual !== null;
  const mesesEstabilidade = mesesManual ? input.mesesManual! : mesesEstabilidadeAuto;

  const tabela1 = calcTabela1(input.salario, mesesEstabilidade, input.empregadaDomestica);
  const tabela2 = input.pediuAConta ? calcTabela2(input.salario) : null;

  let multaFgts: MultaFgtsResult | null = null;
  if (input.calcularMultaFgts) {
    multaFgts = calcMultaFgts(input, tabela1.fgts);
  }

  const tipoRescisao = input.pediuAConta ? "Pedido de demissão" : "Dispensa";

  let totalFinal = tabela1.total;
  if (tabela2) {
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
