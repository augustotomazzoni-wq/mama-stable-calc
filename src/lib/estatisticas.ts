/**
 * Apoio às estatísticas: junta cadastros que são da mesma pessoa e calcula
 * médias sem deixar um caso extremo distorcer o resultado.
 */

/** Minúsculas, sem acento, sem pontuação e com espaços colapsados. */
export function normalizarNome(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function distanciaLevenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  let linhaAnterior = Array.from({ length: b.length + 1 }, (_, i) => i);

  for (let i = 1; i <= a.length; i++) {
    const linhaAtual = [i];
    for (let j = 1; j <= b.length; j++) {
      const custo = a[i - 1] === b[j - 1] ? 0 : 1;
      linhaAtual[j] = Math.min(
        linhaAtual[j - 1] + 1,
        linhaAnterior[j] + 1,
        linhaAnterior[j - 1] + custo,
      );
    }
    linhaAnterior = linhaAtual;
  }

  return linhaAnterior[b.length];
}

/** 1 = idênticos, 0 = totalmente diferentes. */
export function similaridade(a: string, b: string): number {
  const x = normalizarNome(a);
  const y = normalizarNome(b);
  if (!x && !y) return 1;
  if (!x || !y) return 0;
  const maior = Math.max(x.length, y.length);
  return 1 - distanciaLevenshtein(x, y) / maior;
}

export interface RegistroComparavel {
  nome: string;
  nascimento?: Date | null;
  salario?: number | null;
  demissao?: Date | null;
}

function mesmaData(a?: Date | null, b?: Date | null): boolean {
  if (!a || !b) return false;
  return a.toISOString().slice(0, 10) === b.toISOString().slice(0, 10);
}

function tokens(nome: string): string[] {
  return normalizarNome(nome).split(" ").filter(Boolean);
}

/**
 * Duas fichas são da mesma pessoa quando o nome bate e algum outro dado
 * confirma. O critério é conservador de propósito: é pior fundir duas clientes
 * diferentes do que deixar uma duplicata passar.
 */
export function saoMesmaPessoa(a: RegistroComparavel, b: RegistroComparavel): boolean {
  const nomeA = normalizarNome(a.nome);
  const nomeB = normalizarNome(b.nome);
  if (!nomeA || !nomeB) return false;

  if (nomeA === nomeB) return true;

  const sim = similaridade(a.nome, b.nome);
  const nascimentoIgual = mesmaData(a.nascimento, b.nascimento);
  const demissaoIgual = mesmaData(a.demissao, b.demissao);
  const salarioIgual =
    a.salario != null && b.salario != null && Math.abs(a.salario - b.salario) < 0.01;
  const confirmado = nascimentoIgual || demissaoIgual || salarioIgual;

  // Erro de digitação: pouquíssimas letras de diferença. A distância absoluta
  // funciona melhor que a proporcional aqui, porque em nome curto duas letras
  // trocadas já derrubariam demais o percentual ("Silva" x "Sliva").
  if (distanciaLevenshtein(nomeA, nomeB) <= 2 && confirmado) return true;

  // Nascimento igual tolera nome mais diferente (abreviação, nome de casada).
  if (nascimentoIgual && sim >= 0.7) return true;

  // "Maria A. Silva" x "Maria Aparecida Silva": mesmo começo e mesmo fim.
  const ta = tokens(a.nome);
  const tb = tokens(b.nome);
  if (ta.length >= 2 && tb.length >= 2) {
    const mesmoInicioEFim = ta[0] === tb[0] && ta[ta.length - 1] === tb[tb.length - 1];
    if (mesmoInicioEFim && confirmado) return true;
  }

  return false;
}

export interface GrupoDuplicado<T> {
  /** Ficha escolhida para representar a pessoa nas estatísticas. */
  principal: T;
  duplicados: T[];
  /** Quantas fichas existem para esta mesma pessoa. */
  quantidade: number;
}

/**
 * Agrupa fichas da mesma pessoa. `pontuacaoCompletude` decide qual delas
 * representa o grupo — vence a mais completa e, no empate, a mais recente.
 */
export function agruparPessoas<T extends RegistroComparavel>(
  registros: T[],
  pontuacaoCompletude: (registro: T) => number,
): GrupoDuplicado<T>[] {
  const grupos: T[][] = [];

  for (const registro of registros) {
    const grupo = grupos.find((g) => g.some((item) => saoMesmaPessoa(item, registro)));
    if (grupo) {
      grupo.push(registro);
    } else {
      grupos.push([registro]);
    }
  }

  return grupos.map((itens) => {
    const ordenados = [...itens].sort((a, b) => pontuacaoCompletude(b) - pontuacaoCompletude(a));
    const [principal, ...duplicados] = ordenados;
    return { principal, duplicados, quantidade: itens.length };
  });
}

/**
 * Média aparada: descarta os menores e os maiores antes de somar, para que um
 * caso fora da curva não puxe o resultado. Com menos de 5 valores não há o que
 * aparar sem perder a amostra, então devolve a média simples.
 */
export function mediaAparada(valores: number[], proporcao = 0.1): number {
  if (!valores.length) return 0;
  if (valores.length < 5) return mediaSimples(valores);

  const ordenados = [...valores].sort((a, b) => a - b);
  const corte = Math.max(1, Math.floor(ordenados.length * proporcao));
  const miolo = ordenados.slice(corte, ordenados.length - corte);
  const usados = miolo.length ? miolo : ordenados;

  return mediaSimples(usados);
}

export function mediaSimples(valores: number[]): number {
  if (!valores.length) return 0;
  return valores.reduce((a, b) => a + b, 0) / valores.length;
}

/** Quantos valores a média aparada descarta de cada ponta. */
export function cortePorPonta(quantidade: number, proporcao = 0.1): number {
  if (quantidade < 5) return 0;
  return Math.max(1, Math.floor(quantidade * proporcao));
}
