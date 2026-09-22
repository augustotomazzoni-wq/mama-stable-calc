import { addDays, addMonthsExcelLike, ceilMonthsBetween, anosCompletosEntre, formatDateBR } from './dateUtils';
import {
  mesesTrabalhados,
  mesesDeServico,
  decimoTerceiroPorAno,
  periodosDeFerias,
  limiteQuinquenal,
  MesTrabalhado,
  DecimoAno,
  PeriodoFerias } from
'./periodoTrabalhado';

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

/**
 * Como era o registro do contrato. Define o que se presume pago na saída:
 * sem carteira, nada foi pago, qualquer que seja o motivo.
 */
export type TipoRegistro = 'com_carteira' | 'registrada_depois' | 'sem_registro';

export const TIPO_REGISTRO_LABEL: Record<TipoRegistro, string> = {
  com_carteira: 'Com carteira desde o início',
  registrada_depois: 'Registrada depois de um período sem carteira',
  sem_registro: 'Sem registro — reconhecimento de vínculo',
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
  /** Último dia trabalhado sem registro, contado por inteiro. */
  fim: Date;
  /** Salário efetivamente pago no período (o combinado). */
  salario: number;
  recebido: VinculoRecebido;
  /**
   * Salário recebido todo mês por fora: fica presumido quitado. Cálculos
   * anteriores a este campo não o têm, e neles os salários eram cobrados.
   */
  recebiaSalario?: boolean;
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
  /** Salário pago no período. */
  salario: number;
  /** Salário usado para as verbas: o pago ou o piso, o que for maior. */
  salarioBase?: number;
  salariosPresumidosPagos?: boolean;
  salarios: VinculoVerba;
  decimoTerceiro: VinculoVerba;
  feriasComTerco: VinculoVerba;
  fgts: VinculoVerba;
  decimoPorAno?: DecimoAno[];
  periodosFerias?: PeriodoFerias[];
  /** Meses civis cujas verbas ficaram fora por prescrição quinquenal. */
  mesesPrescritos?: number;
  outrosRecebidos: number;
  outrosDescricao?: string;
  totalDevido: number;
  totalRecebido: number;
  /** Diferença ainda a receber, nunca negativa. */
  total: number;
  /** Quanto do que foi pago excedeu o devido, apenas para registro. */
  excedente: number;
}

/** Pedidos que o advogado decide incluir caso a caso. */
export interface PedidosOpcionais {
  /** Multa de 50% sobre as rescisórias incontroversas (CLT 467). */
  multa467: boolean;
  /** Indenização pelo seguro-desemprego não recebido (Súm. 389, II, TST). */
  seguroDesemprego: number;
  /** Dano moral ou outro pedido de valor arbitrado. */
  outrosValor: number;
  outrosDescricao?: string;
}

export interface OpcionaisResult {
  multa467: number;
  seguroDesemprego: number;
  outros: number;
  outrosDescricao?: string;
  total: number;
}

export interface AlertaCalculo {
  tipo: 'prescricao_bienal' | 'prescricao_quinquenal';
  mensagem: string;
}

export interface CalcInput {
  nome: string;
  nascimento: Date | null;
  /** Salário na carteira ou, sem registro, o combinado. */
  salario: number;
  demissao: Date;
  concepcao: Date;
  partoPrevisao: Date;
  /** Derivado de motivoSaida. Mantido para não quebrar cálculos já salvos. */
  pediuAConta: boolean;
  motivoSaida?: MotivoSaida;
  tipoRegistro?: TipoRegistro;
  /** Piso da categoria ou salário mínimo, quando maior que o salário pago. */
  piso?: number | null;
  mesesManual: number | null;
  empregadaDomestica: boolean;
  admissao: Date | null;
  calcularMultaFgts: boolean;
  vinculo?: VinculoInput | null;
  opcionais?: PedidosOpcionais | null;
  /** Data que faz as vezes do ajuizamento na contagem da prescrição. */
  dataReferencia?: Date;
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
  opcionais?: OpcionaisResult | null;
  alertas?: AlertaCalculo[];
  totalFinal: number;
  pediuAConta: boolean;
  motivoSaida: MotivoSaida;
  tipoRegistro?: TipoRegistro;
  /** Salário usado na estabilidade e na rescisão (o pago ou o piso). */
  salarioBase?: number;
  tipoRescisao: string;
}

/** Cálculos antigos só gravaram pediuAConta; traduz para o motivo equivalente. */
export function resolveMotivoSaida(input: Pick<CalcInput, 'motivoSaida' | 'pediuAConta'>): MotivoSaida {
  if (input.motivoSaida) return input.motivoSaida;
  return input.pediuAConta ? 'pedido_demissao' : 'dispensa_sem_justa_causa';
}

/** Cálculos antigos não tinham o campo; o módulo de vínculo indicava registro posterior. */
export function resolveTipoRegistro(input: Pick<CalcInput, 'tipoRegistro' | 'vinculo'>): TipoRegistro {
  if (input.tipoRegistro) return input.tipoRegistro;
  return input.vinculo ? 'registrada_depois' : 'com_carteira';
}

/**
 * Aviso prévio, 13º e férias sobre o aviso e multa do art. 477 só entram quando
 * a empregada não os recebeu na saída. Com carteira, a dispensa sem justa causa
 * presume a rescisão paga; sem registro, nada foi pago em motivo nenhum.
 */
export function temVerbasRescisorias(motivo: MotivoSaida, tipoRegistro: TipoRegistro = 'com_carteira'): boolean {
  if (tipoRegistro === 'sem_registro') return true;
  return motivo !== 'dispensa_sem_justa_causa';
}

/**
 * Na dispensa sem justa causa com carteira, a multa de 40% sobre o FGTS do
 * contrato registrado já foi paga na rescisão; resta apenas a multa sobre o
 * FGTS do período de estabilidade. No pedido de demissão, no término de
 * experiência e sem registro, nada de 40% foi pago.
 */
export function incluiFgtsDoContrato(motivo: MotivoSaida, tipoRegistro: TipoRegistro = 'com_carteira'): boolean {
  if (tipoRegistro === 'sem_registro') return true;
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
 * abatida do que a cliente recebeu, para o memorial mostrar devido, pago e
 * diferença linha a linha. Verbas vencidas há mais de cinco anos ficam fora.
 */
function calcVinculo(
  v: VinculoInput,
  piso: number,
  aliquotaFgts: number,
  limitePrescricao: Date | null,
): VinculoResult {
  const recebiaSalario = v.recebiaSalario ?? false;
  const salarioBase = Math.max(v.salario, piso);

  const meses = mesesTrabalhados(v.inicio, v.fim);
  const exigivel = (m: MesTrabalhado) => limitePrescricao === null || m.ultimoDia >= limitePrescricao;
  const mesesExigiveis = meses.filter(exigivel);
  const proporcao = (m: MesTrabalhado) => m.dias / m.diasNoMes;

  // Salário mês a mês, pelos dias trabalhados. Quando ela recebia todo mês, o
  // que foi pago abate o devido e sobra só a diferença para o piso, se houver.
  const salariosDevidos = mesesExigiveis.reduce((soma, m) => soma + salarioBase * proporcao(m), 0);
  const salariosPresumidos = recebiaSalario ?
  mesesExigiveis.reduce((soma, m) => soma + v.salario * proporcao(m), 0) :
  0;

  const decimoPorAno = decimoTerceiroPorAno(meses, salarioBase, limitePrescricao, v.fim.getFullYear());
  const decimoDevido = decimoPorAno.
  filter((d) => !d.prescrito).
  reduce((soma, d) => soma + d.valor, 0);

  const periodosFerias = periodosDeFerias(v.inicio, v.fim, salarioBase, limitePrescricao);
  const feriasValidas = periodosFerias.filter((p) => !p.prescrito);
  const feriasDevidas = feriasValidas.reduce((soma, p) => soma + p.valor, 0);
  // A dobra do art. 137 é sanção, não remuneração: fica fora da base do FGTS.
  const feriasBaseFgts = feriasValidas.reduce((soma, p) => soma + p.valorSimples, 0);

  // O FGTS incide sobre tudo o que era devido, inclusive o que ela recebeu por fora.
  const fgtsDevido = (salariosDevidos + decimoDevido + feriasBaseFgts) * aliquotaFgts;

  const salarios = montaVerba(salariosDevidos, salariosPresumidos + v.recebido.salarios);
  const decimoTerceiro = montaVerba(decimoDevido, v.recebido.decimoTerceiro);
  const feriasComTerco = montaVerba(feriasDevidas, v.recebido.ferias);
  const fgts = montaVerba(fgtsDevido, v.recebido.fgts);

  const totalDevido = salariosDevidos + decimoDevido + feriasDevidas + fgtsDevido;
  const totalRecebido =
  salarios.recebido + decimoTerceiro.recebido + feriasComTerco.recebido +
  fgts.recebido + v.recebido.outros;
  const somaDiferencas =
  salarios.diferenca + decimoTerceiro.diferenca + feriasComTerco.diferenca + fgts.diferenca;

  return {
    inicio: v.inicio,
    fim: v.fim,
    meses: mesesDeServico(v.inicio, v.fim),
    salario: v.salario,
    salarioBase,
    salariosPresumidosPagos: recebiaSalario,
    salarios,
    decimoTerceiro,
    feriasComTerco,
    fgts,
    decimoPorAno,
    periodosFerias,
    mesesPrescritos: meses.length - mesesExigiveis.length,
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
  tipoRegistro: TipoRegistro,
  fgtsPeriodoVinculo: number,
): MultaFgtsResult {
  const aliquota = input.empregadaDomestica ? 0.112 : 0.08;
  const incluiPeriodoContrato = incluiFgtsDoContrato(motivo, tipoRegistro);
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

function calcOpcionais(op: PedidosOpcionais | null | undefined, tabela2: Tabela2 | null): OpcionaisResult | null {
  if (!op) return null;

  // A multa do 467 recai sobre as rescisórias em si, não sobre a multa do 477.
  const baseRescisorias = tabela2 ?
  Math.max(0, tabela2.avisoProvio + tabela2.decimoTerceiroAviso + tabela2.feriasComTercoAviso - tabela2.jaRecebido) :
  0;
  const multa467 = op.multa467 ? baseRescisorias * 0.5 : 0;
  const seguroDesemprego = Math.max(0, op.seguroDesemprego || 0);
  const outros = Math.max(0, op.outrosValor || 0);
  const total = multa467 + seguroDesemprego + outros;

  if (total === 0) return null;
  return { multa467, seguroDesemprego, outros, outrosDescricao: op.outrosDescricao, total };
}

function calcAlertas(
  input: CalcInput,
  vinculo: VinculoResult | null,
  inicioContrato: Date | null,
  dataReferencia: Date,
  limitePrescricao: Date,
): AlertaCalculo[] {
  const alertas: AlertaCalculo[] = [];

  // A bienal corre do fim do aviso prévio projetado a partir da saída real
  // (OJ 83 da SDI-1 do TST).
  const avisoReal = calcAvisoDias(inicioContrato, input.demissao);
  const limiteBienal = addMonthsExcelLike(addDays(input.demissao, avisoReal), 24);
  if (dataReferencia > limiteBienal) {
    alertas.push({
      tipo: 'prescricao_bienal',
      mensagem:
      `O prazo de dois anos para ajuizar venceu em ${formatDateBR(limiteBienal)}, ` +
      'contado do fim do aviso prévio (CF 7º, XXIX; OJ 83 da SDI-1 do TST). A ação pode estar prescrita.',
    });
  }

  const algoPrescrito =
  vinculo !== null && (
  (vinculo.mesesPrescritos ?? 0) > 0 ||
  (vinculo.decimoPorAno ?? []).some((d) => d.prescrito) ||
  (vinculo.periodosFerias ?? []).some((p) => p.prescrito));

  if (algoPrescrito) {
    alertas.push({
      tipo: 'prescricao_quinquenal',
      mensagem:
      `Verbas do período sem registro vencidas antes de ${formatDateBR(limitePrescricao)} ficaram fora do cálculo ` +
      '(prescrição de cinco anos, considerando o ajuizamento na data do cálculo). ' +
      'O pedido de anotação da CTPS continua abrangendo todo o período (CLT 11, § 1º).',
    });
  }

  return alertas;
}

export function calculate(input: CalcInput): CalcResult {
  const motivoSaida = resolveMotivoSaida(input);
  const tipoRegistro = resolveTipoRegistro(input);
  const piso = input.piso && input.piso > 0 ? input.piso : 0;
  const salarioBase = Math.max(input.salario, piso);
  const dataReferencia = input.dataReferencia ?? new Date();
  const limitePrescricao = limiteQuinquenal(dataReferencia);

  const previsaoParto = input.partoPrevisao;
  const fimEstabilidade = addMonthsExcelLike(previsaoParto, 5);
  const mesesEstabilidadeAuto = calcMesesEstabilidade(input.demissao, previsaoParto);

  const mesesManual = input.mesesManual !== null;
  const mesesEstabilidade = mesesManual ? input.mesesManual! : mesesEstabilidadeAuto;

  const aliquotaFgts = input.empregadaDomestica ? 0.112 : 0.08;
  const tabela1 = calcTabela1(salarioBase, mesesEstabilidade, input.empregadaDomestica);
  const vinculo = input.vinculo ?
  calcVinculo(input.vinculo, piso, aliquotaFgts, limitePrescricao) :
  null;

  // O tempo de serviço começa no período sem registro quando ele é anterior à
  // admissão formal, e se projeta até o fim da estabilidade.
  const inicioContrato = [input.admissao, input.vinculo?.inicio].
  filter((d): d is Date => !!d).
  sort((a, b) => a.getTime() - b.getTime())[0] ?? null;
  const avisoDias = calcAvisoDias(inicioContrato, fimEstabilidade);

  const tabela2 = temVerbasRescisorias(motivoSaida, tipoRegistro) ?
  calcTabela2(salarioBase, avisoDias, input.vinculo?.recebido.rescisorias ?? 0) :
  null;

  let multaFgts: MultaFgtsResult | null = null;
  if (input.calcularMultaFgts) {
    multaFgts = calcMultaFgts(input, tabela1.fgts, motivoSaida, tipoRegistro, vinculo?.fgts.devido ?? 0);
  }

  const opcionais = calcOpcionais(input.opcionais, tabela2);
  const alertas = calcAlertas(input, vinculo, inicioContrato, dataReferencia, limitePrescricao);

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
  if (opcionais) {
    totalFinal += opcionais.total;
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
    opcionais,
    alertas,
    totalFinal,
    pediuAConta: motivoSaida === 'pedido_demissao',
    motivoSaida,
    tipoRegistro,
    salarioBase,
    tipoRescisao,
  };
}
