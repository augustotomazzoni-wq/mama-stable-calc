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
export type MotivoSaida =
  | 'pedido_demissao'
  | 'dispensa_sem_justa_causa'
  | 'fim_experiencia'
  | 'dispensa_na_experiencia'
  | 'pedido_na_experiencia';

export const MOTIVO_SAIDA_LABEL: Record<MotivoSaida, string> = {
  pedido_demissao: 'Pedido de demissão',
  dispensa_sem_justa_causa: 'Dispensa sem justa causa',
  fim_experiencia: 'Término do contrato de experiência',
  dispensa_na_experiencia: 'Dispensa durante o contrato de experiência',
  pedido_na_experiencia: 'Pedido de demissão durante o contrato de experiência',
};

/**
 * Contrato por prazo determinado. Aqui não existe aviso prévio: o contrato
 * nasce com data para acabar, e é essa data que encerra o vínculo. Reconhecida
 * a estabilidade (Súmula 244, III, do TST), o que se indeniza são os salários
 * do período de estabilidade e seus reflexos — não o aviso.
 */
export function ehContratoDeExperiencia(motivo: MotivoSaida): boolean {
  return (
    motivo === 'fim_experiencia' ||
    motivo === 'dispensa_na_experiencia' ||
    motivo === 'pedido_na_experiencia'
  );
}

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
  /**
   * O que a empresa pagou na rescisão, verba a verba. Abate de cada verba
   * correspondente no cálculo projetado até o fim da estabilidade.
   */
  recebidoNaRescisao?: RescisaoRecebida | null;
  /** Multa de 40% do FGTS paga na rescisão. Abate da multa apurada. */
  multa40Recebida?: number;
  /** Campo antigo, de valor único. Entra como "outros" para não se perder. */
  recebidoNaSaida?: number;
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
  /** Salários + 13º: as férias indenizadas ficam fora da base do FGTS. */
  baseFgts?: number;
  fgts: number;
  total: number;
}

/**
 * O que a empresa pagou na rescisão, verba a verba. Cada valor abate da verba
 * correspondente — não do total —, para o memorial mostrar devido, pago e
 * diferença em cada linha, como já faz o módulo do período sem registro.
 */
export interface RescisaoRecebida {
  avisoPrevio: number;
  decimoTerceiroAviso: number;
  feriasAviso: number;
  multa477: number;
  outros: number;
  outrosDescricao?: string;
}

export const RESCISAO_RECEBIDA_VAZIA: RescisaoRecebida = {
  avisoPrevio: 0,
  decimoTerceiroAviso: 0,
  feriasAviso: 0,
  multa477: 0,
  outros: 0,
};

export interface Tabela2 {
  /** Dias de aviso prévio aplicados (Lei 12.506/2011). */
  avisoDias: number;
  /** Valores devidos no contrato projetado até o fim da estabilidade. */
  avisoProvio: number;
  decimoTerceiroAviso: number;
  feriasComTercoAviso: number;
  multa477: number;
  /** Aviso e demais rescisórias já pagas, abatidas do subtotal. */
  jaRecebido: number;
  /** false no contrato a termo, em que não existe aviso prévio. */
  temAviso?: boolean;
  /** Devido, pago e diferença de cada verba. */
  aviso?: VinculoVerba;
  decimoAviso?: VinculoVerba;
  feriasAviso?: VinculoVerba;
  multa477Verba?: VinculoVerba;
  outrosRecebidos?: number;
  outrosDescricao?: string;
  total: number;
}

export interface MultaFgtsResult {
  fgtsRescisorio: number;
  mesesTrabalhados: number;
  fgtsPeriodoContrato: number;
  /** FGTS devido no período sem registro, quando há módulo de vínculo. */
  fgtsPeriodoVinculo: number;
  baseTotalFgts: number;
  /** 40% sobre a base completa, antes de abater o que a empresa pagou. */
  multa40Devida?: number;
  /** Multa de 40% que a empresa pagou na rescisão. */
  multa40Paga?: number;
  /** A diferença — é ela que entra no total. */
  multa40: number;
  /** Mantido para os cálculos antigos; hoje a base é sempre completa. */
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
 * Aviso prévio e seus reflexos (13º e férias sobre o aviso).
 *
 * Só não existem no contrato de experiência: contrato a termo nasce com data
 * para acabar, e não há aviso a ser dado. O que a estabilidade garante são os
 * salários do período e seus reflexos (Súmula 244, III, do TST), não a
 * conversão do contrato para todos os efeitos.
 *
 * Nas demais hipóteses o aviso é sempre apurado — inclusive na dispensa sem
 * justa causa, em que ele foi pago na saída. Reconhecida a nulidade, o
 * contrato se projeta até o fim da estabilidade, e o aviso devido é o daquele
 * momento: mais tempo de casa, mais dias (Lei 12.506/2011), e sobre o salário
 * base. O que foi pago na rescisão abate; o que sobra é diferença devida.
 * Zerar a rubrica, como se fazia antes, escondia essa diferença.
 *
 * Sem registro não existe contrato de experiência válido — faltam forma
 * escrita e anotação —, então o contrato é tratado como indeterminado.
 */
export function temAvisoPrevio(motivo: MotivoSaida, tipoRegistro: TipoRegistro = 'com_carteira'): boolean {
  if (tipoRegistro === 'sem_registro') return true;
  return !ehContratoDeExperiencia(motivo);
}

/**
 * O FGTS do tempo efetivamente trabalhado entra sempre na base dos 40%.
 *
 * Antes esta função decidia se o período entrava ou não, conforme a empresa
 * tivesse pago a multa na saída. Era um atalho: dava o mesmo número só quando
 * o pagamento tinha sido exato. Agora a base é sempre completa e o que a
 * empresa pagou de multa é informado e abatido — assim uma multa paga sobre
 * base menor do que a devida aparece como diferença em vez de sumir.
 *
 * Mantida como função para a tela continuar explicando a composição da base.
 */
export function incluiFgtsDoContrato(
  _motivo?: MotivoSaida,
  _tipoRegistro?: TipoRegistro,
): boolean {
  return true;
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
  // O FGTS incide sobre salários e 13º, não sobre as férias.
  //
  // Na projeção da estabilidade nada é trabalhado: as férias são indenizadas,
  // e sobre férias indenizadas e o terço não há FGTS (Lei 8.036/90, art. 15,
  // § 6º, que remete ao art. 28, § 9º, da Lei 8.212/91). Antes a base incluía
  // as férias, o que inflava a verba e, por tabela, a multa de 40% que incide
  // sobre ela.
  const baseFgts = salarios + decimoTerceiro;
  const fgts = baseFgts * aliquota;
  const total = subtotalVerbas + fgts;
  return { salarios, decimoTerceiro, feriasComTerco, baseFgts, fgts, total };
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

/**
 * Verbas rescisórias da dispensa projetada para o fim da estabilidade.
 *
 * A multa do art. 477 entra sempre, com ou sem aviso prévio: a ação cobra
 * verbas da estabilidade que já deveriam ter sido pagas na saída e não foram,
 * e é exatamente esse atraso que a multa sanciona. Ela não é reflexo do aviso.
 *
 * Quando `temAviso` é falso — contrato a termo, ou aviso já pago na rescisão —
 * o aviso e seus reflexos ficam zerados e sobra só a multa.
 */
function calcTabela2(
  salario: number,
  avisoDias: number,
  recebido: RescisaoRecebida,
  temAviso: boolean,
): Tabela2 {
  const avisoProvio = temAviso ? salario * (avisoDias / 30) : 0;
  const decimoTerceiroAviso = temAviso ? avisoProvio / 12 : 0;
  const feriasComTercoAviso = temAviso ? decimoTerceiroAviso / 3 + decimoTerceiroAviso : 0;
  const multa477 = salario;

  // Cada verba abate da sua. O pago a mais numa não cobre o devido de outra —
  // é o mesmo critério do período sem registro.
  const aviso = montaVerba(avisoProvio, temAviso ? recebido.avisoPrevio : 0);
  const decimoAviso = montaVerba(decimoTerceiroAviso, temAviso ? recebido.decimoTerceiroAviso : 0);
  const feriasAviso = montaVerba(feriasComTercoAviso, temAviso ? recebido.feriasAviso : 0);
  const multa477Verba = montaVerba(multa477, recebido.multa477);

  const somaDiferencas =
  aviso.diferenca + decimoAviso.diferenca + feriasAviso.diferenca + multa477Verba.diferenca;
  const jaRecebido =
  aviso.recebido + decimoAviso.recebido + feriasAviso.recebido +
  multa477Verba.recebido + recebido.outros;

  return {
    avisoDias: temAviso ? avisoDias : 0,
    avisoProvio,
    decimoTerceiroAviso,
    feriasComTercoAviso,
    multa477,
    jaRecebido,
    temAviso,
    aviso,
    decimoAviso,
    feriasAviso,
    multa477Verba,
    outrosRecebidos: recebido.outros,
    outrosDescricao: recebido.outrosDescricao,
    total: Math.max(0, somaDiferencas - recebido.outros),
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
  salarioBase: number,
): MultaFgtsResult {
  const aliquota = input.empregadaDomestica ? 0.112 : 0.08;
  let mesesTrabalhados = 0;
  let fgtsPeriodoContrato = 0;

  if (input.admissao) {
    mesesTrabalhados = ceilMonthsBetween(input.admissao, input.demissao);
    // Sobre o salário base — o piso, quando ele supera o que foi pago, como
    // em todas as outras verbas.
    fgtsPeriodoContrato = mesesTrabalhados * salarioBase * aliquota;
  }

  // A base é sempre completa: estabilidade + contrato registrado + período sem
  // registro. O que a empresa pagou de multa abate depois.
  const baseTotalFgts = fgtsRescisorio + fgtsPeriodoContrato + fgtsPeriodoVinculo;
  const multa40Devida = baseTotalFgts * 0.4;
  const multa40Paga = Math.max(0, input.multa40Recebida ?? 0);

  return {
    fgtsRescisorio,
    mesesTrabalhados,
    fgtsPeriodoContrato,
    fgtsPeriodoVinculo,
    baseTotalFgts,
    multa40Devida,
    multa40Paga,
    multa40: Math.max(0, multa40Devida - multa40Paga),
    incluiPeriodoContrato: true,
  };
}

function calcOpcionais(op: PedidosOpcionais | null | undefined, tabela2: Tabela2 | null): OpcionaisResult | null {
  if (!op) return null;

  // A multa do 467 recai sobre as rescisórias em si, não sobre a multa do 477,
  // e só sobre o que continua em aberto: o que a empresa já pagou não é verba
  // incontroversa inadimplida.
  const baseRescisorias = tabela2 ?
  (tabela2.aviso?.diferenca ?? 0) +
  (tabela2.decimoAviso?.diferenca ?? 0) +
  (tabela2.feriasAviso?.diferenca ?? 0) :
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

  // A tabela 2 existe sempre: mesmo sem aviso prévio, a multa do art. 477 é
  // devida. O que a empresa pagou abate verba a verba; o campo antigo de valor
  // único e o do módulo sem registro entram como "outros", que abate do
  // subtotal.
  const r = input.recebidoNaRescisao;
  const recebido: RescisaoRecebida = {
    avisoPrevio: Math.max(0, r?.avisoPrevio ?? 0),
    decimoTerceiroAviso: Math.max(0, r?.decimoTerceiroAviso ?? 0),
    feriasAviso: Math.max(0, r?.feriasAviso ?? 0),
    multa477: Math.max(0, r?.multa477 ?? 0),
    outros:
    Math.max(0, r?.outros ?? 0) +
    Math.max(0, input.recebidoNaSaida ?? 0) +
    (input.vinculo?.recebido.rescisorias ?? 0),
    ...(r?.outrosDescricao ? { outrosDescricao: r.outrosDescricao } : {}),
  };
  const tabela2 = calcTabela2(
    salarioBase,
    avisoDias,
    recebido,
    temAvisoPrevio(motivoSaida, tipoRegistro),
  );

  let multaFgts: MultaFgtsResult | null = null;
  if (input.calcularMultaFgts) {
    multaFgts = calcMultaFgts(
      input,
      tabela1.fgts,
      motivoSaida,
      tipoRegistro,
      vinculo?.fgts.devido ?? 0,
      salarioBase,
    );
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
