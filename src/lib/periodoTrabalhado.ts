import { addDays, addMonthsExcelLike } from './dateUtils';

/**
 * Regras do período efetivamente trabalhado sem registro: salário mês a mês,
 * 13º por ano civil e férias por período aquisitivo, cada verba com a sua data
 * de exigibilidade para a prescrição quinquenal.
 *
 * Aqui o fim do período é o último dia trabalhado, contado por inteiro.
 */

const DIA_MS = 24 * 60 * 60 * 1000;

function inicioDoDia(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Dias corridos de `de` até `ate`, contando os dois extremos. */
export function diasInclusivos(de: Date, ate: Date): number {
  const a = inicioDoDia(de);
  const b = inicioDoDia(ate);
  if (b < a) return 0;
  return Math.round((b.getTime() - a.getTime()) / DIA_MS) + 1;
}

export interface MesTrabalhado {
  ano: number;
  /** 0 = janeiro. */
  mes: number;
  dias: number;
  diasNoMes: number;
  ultimoDia: Date;
}

/** Os meses civis que o período toca, com quantos dias foram trabalhados em cada. */
export function mesesTrabalhados(inicio: Date, fim: Date): MesTrabalhado[] {
  const meses: MesTrabalhado[] = [];
  if (inicioDoDia(fim) < inicioDoDia(inicio)) return meses;

  let ano = inicio.getFullYear();
  let mes = inicio.getMonth();
  const anoFim = fim.getFullYear();
  const mesFim = fim.getMonth();

  while (ano < anoFim || (ano === anoFim && mes <= mesFim)) {
    const primeiro = new Date(ano, mes, 1);
    const ultimo = new Date(ano, mes + 1, 0);
    const de = inicio > primeiro ? inicioDoDia(inicio) : primeiro;
    const ate = fim < ultimo ? inicioDoDia(fim) : ultimo;
    meses.push({
      ano,
      mes,
      dias: diasInclusivos(de, ate),
      diasNoMes: ultimo.getDate(),
      ultimoDia: ultimo,
    });
    mes += 1;
    if (mes > 11) {
      mes = 0;
      ano += 1;
    }
  }

  return meses;
}

/**
 * Meses de serviço contados a partir de `de`, com a fração de mais de 14 dias
 * valendo um mês inteiro (CLT 146, parágrafo único).
 */
export function mesesDeServico(de: Date, ate: Date): number {
  if (inicioDoDia(ate) < inicioDoDia(de)) return 0;
  let meses = 0;
  while (addDays(addMonthsExcelLike(de, meses + 1), -1) <= ate) {
    meses += 1;
  }
  const inicioFracao = addMonthsExcelLike(de, meses);
  return diasInclusivos(inicioFracao, ate) > 14 ? meses + 1 : meses;
}

export interface DecimoAno {
  ano: number;
  meses: number;
  valor: number;
  prescrito: boolean;
}

/**
 * 13º por ano civil: 1/12 do salário por mês com 15 dias ou mais de trabalho
 * (Lei 4.090/62, art. 1º, § 2º). O de cada ano vence em 20 de dezembro; o do
 * ano da saída, na rescisão.
 */
export function decimoTerceiroPorAno(
  meses: MesTrabalhado[],
  salarioBase: number,
  limitePrescricao: Date | null,
  anoSaida: number,
): DecimoAno[] {
  const contagem = new Map<number, number>();
  for (const m of meses) {
    const atual = contagem.get(m.ano) ?? 0;
    contagem.set(m.ano, m.dias >= 15 ? atual + 1 : atual);
  }

  return [...contagem.entries()].
  filter(([, qtd]) => qtd > 0).
  map(([ano, qtd]) => {
    const vencimento = new Date(ano, 11, 20);
    const prescrito = limitePrescricao !== null && ano !== anoSaida && vencimento < limitePrescricao;
    return { ano, meses: qtd, valor: (salarioBase / 12) * qtd, prescrito };
  });
}

export interface PeriodoFerias {
  inicio: Date;
  fim: Date;
  meses: number;
  completo: boolean;
  /** Prazo de concessão vencido antes da saída: paga em dobro (CLT 137). */
  dobro: boolean;
  prescrito: boolean;
  /** Férias + 1/3, sem a dobra. */
  valorSimples: number;
  /** Com a dobra, quando houver. */
  valor: number;
}

/**
 * Férias por período aquisitivo de 12 meses a partir do início do trabalho.
 * Período completo vale um salário + 1/3, em dobro se o prazo de concessão
 * (os 12 meses seguintes) terminou antes da saída. O último período, se
 * incompleto, é proporcional.
 *
 * Férias vencidas prescrevem a partir do fim do prazo de concessão (CLT 149).
 */
export function periodosDeFerias(
  inicio: Date,
  fim: Date,
  salarioBase: number,
  limitePrescricao: Date | null,
): PeriodoFerias[] {
  const periodos: PeriodoFerias[] = [];

  for (let k = 0; ; k++) {
    const aqInicio = addMonthsExcelLike(inicio, 12 * k);
    if (inicioDoDia(aqInicio) > inicioDoDia(fim)) break;

    const aqFim = addDays(addMonthsExcelLike(inicio, 12 * (k + 1)), -1);
    const completo = aqFim <= fim;
    const meses = completo ? 12 : mesesDeServico(aqInicio, fim);
    if (meses === 0) break;

    const ferias = (salarioBase / 12) * meses;
    const valorSimples = ferias + ferias / 3;

    const fimConcessivo = completo ? addDays(addMonthsExcelLike(inicio, 12 * (k + 2)), -1) : null;
    const dobro = fimConcessivo !== null && fimConcessivo < fim;
    const prescrito = dobro && limitePrescricao !== null && fimConcessivo! < limitePrescricao;

    periodos.push({
      inicio: aqInicio,
      fim: completo ? aqFim : inicioDoDia(fim),
      meses,
      completo,
      dobro,
      prescrito,
      valorSimples,
      valor: dobro ? valorSimples * 2 : valorSimples,
    });
  }

  return periodos;
}

/** Cinco anos antes da data de referência (CF 7º, XXIX). */
export function limiteQuinquenal(dataReferencia: Date): Date {
  return addMonthsExcelLike(inicioDoDia(dataReferencia), -60);
}
