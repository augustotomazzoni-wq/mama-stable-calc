import { addDays, addMonthsExcelLike, ceilMonthsBetween } from './dateUtils';

export interface CalcInput {
  nome: string;
  nascimento: Date;
  salario: number;
  demissao: Date;
  concepcao: Date;
  partoPrevisao: Date;
  pediuAConta: boolean;
  mesesManual: number | null; // null = usar automático
  empregadaDomestica: boolean;
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
  tipoRescisao: string;
}

export function calcPrevisaoParto(concepcao: Date): Date {
  return addDays(concepcao, 266);
}

export function calcMesesAteParto(demissao: Date, parto: Date): number {
  // Se demissão >= parto, retorna 0 para não ficar negativo
  if (demissao >= parto) return 0;
  return ceilMonthsBetween(demissao, parto);
}

export function calcMesesEstabilidade(demissao: Date, parto: Date): number {
  // meses até o parto (arredondado para cima) + 5 meses fixos por lei
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

  const tipoRescisao = input.pediuAConta ? "Pedido de demissão" : "Dispensa";

  // Se pediu a conta → sempre soma Tabela 1 + Tabela 2
  const totalFinal = input.pediuAConta && tabela2
    ? tabela1.total + tabela2.total
    : tabela1.total;

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
    tipoRescisao,
  };
}
