import { CalcInput, CalcResult, TipoRegistro, resolveTipoRegistro } from './calculator';
import { formatDateBR } from './dateUtils';

export function tipoRegistroDe(input: CalcInput, result: CalcResult): TipoRegistro {
  return result.tipoRegistro ?? resolveTipoRegistro(input);
}

/**
 * Pedidos que entram na ação mas não têm valor no cálculo. A saída anotada é o
 * fim da estabilidade, coerente com a projeção do contrato.
 */
export function pedidosSemValor(input: CalcInput, result: CalcResult): string[] {
  const tipo = tipoRegistroDe(input, result);
  const vin = result.vinculo;
  if (!vin) return [];

  if (tipo === 'sem_registro') {
    return [
    `Reconhecimento do vínculo de emprego de ${formatDateBR(vin.inicio)} a ${formatDateBR(result.fimEstabilidade)}, ` +
    'com anotação na CTPS; a saída anotada é o fim da estabilidade, pela projeção do contrato.',
    'Recolhimento das contribuições previdenciárias (INSS) de todo o período.',
    'Entrega das guias para saque do FGTS e habilitação no seguro-desemprego.'];

  }

  if (tipo === 'registrada_depois') {
    return [
    `Retificação da CTPS para constar a admissão em ${formatDateBR(vin.inicio)}.`,
    'Recolhimento das contribuições previdenciárias (INSS) do período sem registro.'];

  }

  return [];
}

/** Rótulo do salário conforme o registro. */
export function rotuloSalario(tipo: TipoRegistro): string {
  return tipo === 'sem_registro' ? 'Salário combinado' : 'Salário na carteira';
}

/** Rótulo da data de saída conforme o registro. */
export function rotuloSaida(tipo: TipoRegistro): string {
  if (tipo === 'sem_registro') return 'Último dia de trabalho';
  if (tipo === 'registrada_depois') return 'Data de saída';
  return 'Data de demissão';
}
