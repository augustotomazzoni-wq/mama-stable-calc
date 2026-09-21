import { addDays, addMonthsExcelLike, ceilMonthsBetween, anosCompletosEntre } from './dateUtils';

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

/**
 * Motivo pelo qual a empregada saiu da empresa.
 *
 * Nos três casos o ato que rompeu o contrato é nulo — pedido de demissão de
 * estável sem assistência sindical (CLT 500), dispensa no curso da estabilidade
 * (ADCT 10, II, "b") ou término de contrato de experiência (Súm. 244, III, TST) —
 * e o contrato se projeta até o fim da estabilidade, quando então ocorre a
 * dispensa sem justa causa.
 *
 * O que muda entre eles é apenas o que a empregada JÁ recebeu na saída.
 */
export type MotivoSaida = 'pedido_demissao' | 'dispensa_sem_justa_causa' | 'fim_experiencia';

export const MOTIVO_SAIDA_LABEL: Record<MotivoSaida, string> = {
  pedido_demissao: 'Pedido de demissão',
  dispensa_sem_justa_causa: 'Dispensa sem justa causa',
  fim_experiencia: 'Término do contrato de experiência',
};

/** Valores que a cliente já recebeu, para abater verba a verba. */
export interface VinculoRecebido {
  salarios: number;
  decimoTerceiro: number;
  ferias: number;
  fgts: number;
  /** Aviso prévio e demais verbas pagas na saída; abate das rescisórias. */
  rescisorias: number;
  outros: number;
  outrosDescricao?: string;
}

/** Período trabalhado sem registro, cujo reconhecimento se pede na ação. */
export interface VinculoInput {
  inicio: Date;
  fim: Date;
  salario: number;
  recebido: VinculoRecebido;
}

export interface VinculoVerba {
  devido: number;
  recebido: number;
  diferenca: number;
}

export interface VinculoResult {
  inicio: Date;
  fim: Date;
  meses: number;
  salario: number;
  salarios: VinculoVerba;
  decimoTerceiro: VinculoVerba;
  feriasComTerco: VinculoVerba;
  fgts: VinculoVerba;
  outrosRecebidos: number;
  outrosDescricao?: string;
  totalDevido: number;
  totalRecebido: number;
  /** Diferença ainda a receber, nunca negativa. */
  total: number;
  /** Quanto do que foi pago excedeu o devido, apenas para registro. */
  excedente: number;
}

export interface CalcInput {
  nome: string;
  nascimento: Date | null;
  salario: number;
  demissao: Date;
  concepcao: Date;
  partoPrevisao: Date;
  /** Derivado de motivoSaida. Mantido para não quebrar cálculos já salvos. */
  pediuAConta: boolean;
  motivoSaida?: MotivoSaida;
  mesesManual: number | null;
  empregadaDomestica: boolean;
  admissao: Date | null;
  calcularMultaFgts: boolean;
  vinculo?: VinculoInput | null;
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
  /** Dias de aviso prévio aplicados (Lei 12.506/2011). */
  avisoDias: number;
  avisoProvio: number;
  decimoTerceiroAviso: number;
  feriasComTercoAviso: number;
  multa477: number;
  /** Aviso e demais rescisórias já pagas, abatidas do subtotal. */
  jaRecebido: number;
  total: number;
}

export interface MultaFgtsResult {
  fgtsRescisorio: number;
  mesesTrabalhados: number;
  fgtsPeriodoContrato: number;
  /** FGTS devido no período sem registro, quando há módulo de vínculo. */
  fgtsPeriodoVinculo: number;
  baseTotalFgts: number;
  multa40: number;
  /** false quando a multa sobre o FGTS do contrato já foi paga na rescisão. */
  incluiPeriodoContrato: boolean;
}

export interface CalcResult {
  previsaoParto: Date;
  fimEstabilidade: Date;
  mesesEstabilidadeAuto: number;
  mesesEstabilidade: number;
  mesesManual: boolean;
  tabela1: Tabela1;
  tabela2: Tabela2 | null;
  vinculo: VinculoResult | null;
  multaFgts: MultaFgtsResult | null;
  totalFinal: number;
  pediuAConta: boolean;
  motivoSaida: MotivoSaida;
  tipoRescisao: string;
}

/** Cálculos antigos só gravaram pediuAConta; traduz para o motivo equivalente. */
export function resolveMotivoSaida(input: Pick<CalcInput, 'motivoSaida' | 'pediuAConta'>): MotivoSaida {
  if (input.motivoSaida) return input.motivoSaida;
  return input.pediuAConta ? 'pedido_demissao' : 'dispensa_sem_justa_causa';
}

/**
 * Aviso prévio, 13º e férias sobre o aviso e multa do art. 477 só entram quando
 * a empregada não os recebeu na saída. Na dispensa sem justa causa a empresa já
 * os pagou na rescisão.
 */
export function temVerbasRescisorias(motivo: MotivoSaida): boolean {
  return motivo !== 'dispensa_sem_justa_causa';
}

/**
 * Na dispensa sem justa causa a multa de 40% sobre o FGTS do período trabalhado
 * já foi paga na rescisão; resta apenas a multa sobre o FGTS do período de
 * estabilidade. No pedido de demissão e no término de experiência nada de 40%
 * foi pago, então a base alcança todo o contrato.
 */
export function incluiFgtsDoContrato(motivo: MotivoSaida): boolean {
  return motivo !== 'dispensa_sem_justa_causa';
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

/**
 * Aviso prévio proporcional: 30 dias mais 3 por ano completo de serviço,
 * limitado a 90 (Lei 12.506/2011). Sem data de início conhecida, aplica o
 * mínimo legal de 30 dias.
 */
export function calcAvisoDias(inicioContrato: Date | null, fimContrato: Date): number {
  if (!inicioContrato) return 30;
  return Math.min(30 + 3 * anosCompletosEntre(inicioContrato, fimContrato), 90);
}

function calcTabela2(salario: number, avisoDias: number, jaRecebido: number): Tabela2 {
  const avisoProvio = salario * (avisoDias / 30);
  const decimoTerceiroAviso = avisoProvio / 12;
  const feriasComTercoAviso = (decimoTerceiroAviso / 3) + decimoTerceiroAviso;
  const multa477 = salario;
  const bruto = avisoProvio + decimoTerceiroAviso + feriasComTercoAviso + multa477;
  return {
    avisoDias,
    avisoProvio,
    decimoTerceiroAviso,
    feriasComTercoAviso,
    multa477,
    jaRecebido,
    total: Math.max(0, bruto - jaRecebido),
  };
}

function montaVerba(devido: number, recebido: number): VinculoVerba {
  return { devido, recebido, diferenca: Math.max(0, devido - recebido) };
}

/**
 * Período trabalhado sem registro. Cada verba é apurada pelo que seria devido e
 * abatida do que a cliente comprovadamente recebeu, para o memorial mostrar
 * devido, pago e diferença linha a linha.
 */
function calcVinculo(v: VinculoInput, aliquotaFgts: number): VinculoResult {
  const meses = ceilMonthsBetween(v.inicio, v.fim);
  const salariosDevidos = meses * v.salario;
  const decimoDevido = (v.salario / 12) * meses;
  const feriasProporcionais = (v.salario / 12) * meses;
  const feriasDevidas = feriasProporcionais + feriasProporcionais / 3;
  const fgtsDevido = (salariosDevidos + decimoDevido + feriasDevidas) * aliquotaFgts;

  const salarios = montaVerba(salariosDevidos, v.recebido.salarios);
  const decimoTerceiro = montaVerba(decimoDevido, v.recebido.decimoTerceiro);
  const feriasComTerco = montaVerba(feriasDevidas, v.recebido.ferias);
  const fgts = montaVerba(fgtsDevido, v.recebido.fgts);

  const totalDevido = salariosDevidos + decimoDevido + feriasDevidas + fgtsDevido;
  const totalRecebido =
    v.recebido.salarios + v.recebido.decimoTerceiro + v.recebido.ferias +
    v.recebido.fgts + v.recebido.outros;
  const somaDiferencas =
    salarios.diferenca + decimoTerceiro.diferenca + feriasComTerco.diferenca + fgts.diferenca;

  return {
    inicio: v.inicio,
    fim: v.fim,
    meses,
    salario: v.salario,
    salarios,
    decimoTerceiro,
    feriasComTerco,
    fgts,
    outrosRecebidos: v.recebido.outros,
    outrosDescricao: v.recebido.outrosDescricao,
    totalDevido,
    totalRecebido,
    total: Math.max(0, somaDiferencas - v.recebido.outros),
    excedente: Math.max(0, totalRecebido - totalDevido),
  };
}

function calcMultaFgts(
  input: CalcInput,
  fgtsRescisorio: number,
  motivo: MotivoSaida,
  fgtsPeriodoVinculo: number,
): MultaFgtsResult {
  const aliquota = input.empregadaDomestica ? 0.112 : 0.08;
  const incluiPeriodoContrato = incluiFgtsDoContrato(motivo);
  let mesesTrabalhados = 0;
  let fgtsPeriodoContrato = 0;

  if (input.admissao) {
    // Os meses trabalhados seguem informados mesmo quando não entram na base,
    // para que a memória de cálculo mostre o período que foi desconsiderado.
    mesesTrabalhados = ceilMonthsBetween(input.admissao, input.demissao);
    if (incluiPeriodoContrato) {
      fgtsPeriodoContrato = mesesTrabalhados * input.salario * aliquota;
    }
  }

  // O FGTS do período sem registro nunca foi depositado nem teve multa paga,
  // então entra na base em qualquer motivo de saída.
  const baseTotalFgts = fgtsRescisorio + fgtsPeriodoContrato + fgtsPeriodoVinculo;
  const multa40 = baseTotalFgts * 0.4;

  return {
    fgtsRescisorio,
    mesesTrabalhados,
    fgtsPeriodoContrato,
    fgtsPeriodoVinculo,
    baseTotalFgts,
    multa40,
    incluiPeriodoContrato,
  };
}

export function calculate(input: CalcInput): CalcResult {
  const motivoSaida = resolveMotivoSaida(input);
  const previsaoParto = input.partoPrevisao;
  const fimEstabilidade = addMonthsExcelLike(previsaoParto, 5);
  const mesesEstabilidadeAuto = calcMesesEstabilidade(input.demissao, previsaoParto);

  const mesesManual = input.mesesManual !== null;
  const mesesEstabilidade = mesesManual ? input.mesesManual! : mesesEstabilidadeAuto;

  const aliquotaFgts = input.empregadaDomestica ? 0.112 : 0.08;
  const tabela1 = calcTabela1(input.salario, mesesEstabilidade, input.empregadaDomestica);
  const vinculo = input.vinculo ? calcVinculo(input.vinculo, aliquotaFgts) : null;

  // O tempo de serviço começa no período sem registro quando ele é anterior à
  // admissão formal, e se projeta até o fim da estabilidade.
  const inicioContrato = [input.admissao, input.vinculo?.inicio].
  filter((d): d is Date => !!d).
  sort((a, b) => a.getTime() - b.getTime())[0] ?? null;
  const avisoDias = calcAvisoDias(inicioContrato, fimEstabilidade);

  const tabela2 = temVerbasRescisorias(motivoSaida) ?
  calcTabela2(input.salario, avisoDias, input.vinculo?.recebido.rescisorias ?? 0) :
  null;

  let multaFgts: MultaFgtsResult | null = null;
  if (input.calcularMultaFgts) {
    multaFgts = calcMultaFgts(input, tabela1.fgts, motivoSaida, vinculo?.fgts.devido ?? 0);
  }

  const tipoRescisao = MOTIVO_SAIDA_LABEL[motivoSaida];

  let totalFinal = tabela1.total;
  if (vinculo) {
    totalFinal += vinculo.total;
  }
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
    vinculo,
    multaFgts,
    totalFinal,
    pediuAConta: motivoSaida === 'pedido_demissao',
    motivoSaida,
    tipoRescisao,
  };
}
