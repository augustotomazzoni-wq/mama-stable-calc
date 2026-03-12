const UNIDADES = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
const ESPECIAIS = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
const DEZENAS = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
const CENTENAS = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

function grupoParaExtenso(n: number): string {
  if (n === 0) return '';
  if (n === 100) return 'cem';

  const c = Math.floor(n / 100);
  const resto = n % 100;
  const d = Math.floor(resto / 10);
  const u = resto % 10;

  const partes: string[] = [];
  if (c > 0) partes.push(CENTENAS[c]);

  if (resto >= 10 && resto <= 19) {
    partes.push(ESPECIAIS[resto - 10]);
  } else {
    if (d > 0) partes.push(DEZENAS[d]);
    if (u > 0) partes.push(UNIDADES[u]);
  }

  return partes.join(' e ');
}

const GRUPOS = [
  { singular: '', plural: '' },
  { singular: 'mil', plural: 'mil' },
  { singular: 'milhão', plural: 'milhões' },
  { singular: 'bilhão', plural: 'bilhões' },
];

export function valorPorExtenso(valor: number): string {
  if (valor === 0) return 'zero reais';

  const reais = Math.floor(Math.abs(valor));
  const centavos = Math.round((Math.abs(valor) - reais) * 100);

  const grupos: number[] = [];
  let temp = reais;
  while (temp > 0) {
    grupos.push(temp % 1000);
    temp = Math.floor(temp / 1000);
  }

  const partesReais: string[] = [];
  for (let i = grupos.length - 1; i >= 0; i--) {
    if (grupos[i] === 0) continue;
    const texto = grupoParaExtenso(grupos[i]);
    const grupo = GRUPOS[i];
    const label = grupos[i] === 1 ? grupo.singular : grupo.plural;
    partesReais.push(`${texto}${label ? ' ' + label : ''}`);
  }

  let resultado = '';
  if (partesReais.length > 0) {
    if (partesReais.length === 1) {
      resultado = partesReais[0];
    } else {
      resultado = partesReais.slice(0, -1).join(', ') + ' e ' + partesReais[partesReais.length - 1];
    }
    resultado += reais === 1 ? ' real' : ' reais';
  }

  if (centavos > 0) {
    const centText = grupoParaExtenso(centavos);
    if (resultado) resultado += ' e ';
    resultado += centText + (centavos === 1 ? ' centavo' : ' centavos');
  }

  return resultado;
}
