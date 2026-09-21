import * as XLSX from 'xlsx';
import { CalcInput, CalcResult, VinculoVerba } from './calculator';
import { formatDateBR } from './dateUtils';

export function exportCalculoGestante(input: CalcInput, result: CalcResult): void {
  const wb = XLSX.utils.book_new();
  const aliquotaLabel = input.empregadaDomestica ? '11,2%' : '8%';
  const meses = result.mesesEstabilidade;
  const sal = input.salario;

  // ===== Aba Parametros =====
  const parametros: (string | number)[][] = [
    ['Parâmetro', 'Valor'],
    ['Nome da reclamante', input.nome],
    ['Data de nascimento', input.nascimento ? formatDateBR(input.nascimento) : 'Não informada'],
    ['Salário mensal', sal],
    ['Data de admissão', input.admissao ? formatDateBR(input.admissao) : 'Não informada'],
    ['Data da demissão', formatDateBR(input.demissao)],
    ['Data da concepção', formatDateBR(input.concepcao)],
    ['Data do parto / previsão', formatDateBR(result.previsaoParto)],
    ['Empregada doméstica', input.empregadaDomestica ? 'Sim' : 'Não'],
    ['Motivo da saída', result.tipoRescisao],
    ['Período sem registro', result.vinculo ? `${formatDateBR(result.vinculo.inicio)} a ${formatDateBR(result.vinculo.fim)}` : 'Não aplicável'],
    ['Meses sem registro', result.vinculo ? result.vinculo.meses : 'Não aplicável'],
    ['Salário no período sem registro', result.vinculo ? result.vinculo.salario : 'Não aplicável'],
    ['Calcular multa 40% FGTS', input.calcularMultaFgts ? 'Sim' : 'Não'],
    ['Meses até o parto (automático)', result.mesesEstabilidadeAuto - 5],
    ['Meses pós-parto (fixo)', 5],
    ['Meses totais estabilidade (automático)', result.mesesEstabilidadeAuto],
    ['Meses manuais', result.mesesManual ? meses : 'Não aplicável'],
    ['Meses utilizados no cálculo', meses],
    ['Alíquota de FGTS aplicada', aliquotaLabel],
    ['Fim da estabilidade', formatDateBR(result.fimEstabilidade)],
  ];
  const wsParam = XLSX.utils.aoa_to_sheet(parametros);
  wsParam['!cols'] = [{ wch: 38 }, { wch: 30 }];
  if (wsParam['B4']) wsParam['B4'].z = '#,##0.00';
  XLSX.utils.book_append_sheet(wb, wsParam, 'Parametros');

  // ===== Aba MemoriaCalculo =====
  const t1 = result.tabela1;
  const t2 = result.tabela2;
  const mf = result.multaFgts;
  const vin = result.vinculo;

  const header = ['Grupo', 'Item', 'Explicação simples', 'Conta usada', 'Resultado', 'Unidade', 'Observação'];

  const rows: (string | number)[][] = [
    header,
    ['Indenização', 'Salários do período', 'Salário mensal multiplicado pelos meses de estabilidade', `${fmt(sal)} × ${meses}`, t1.salarios, 'R$', ''],
    ['Indenização', '13º proporcional', 'Um doze avos do salário por mês de estabilidade', `(${fmt(sal)} / 12) × ${meses}`, t1.decimoTerceiro, 'R$', ''],
    ['Indenização', 'Férias + 1/3', 'Férias proporcionais aos meses de estabilidade, acrescidas de um terço', `((${fmt(sal)} / 12) × ${meses}) × 4/3`, t1.feriasComTerco, 'R$', ''],
    ['Indenização', `FGTS (${aliquotaLabel})`, 'FGTS calculado sobre salários + 13º + férias', `(${fmt(t1.salarios)} + ${fmt(t1.decimoTerceiro)} + ${fmt(t1.feriasComTerco)}) × ${aliquotaLabel}`, t1.fgts, 'R$', input.empregadaDomestica ? 'Alíquota doméstica 11,2%' : 'Alíquota CLT 8%'],
    ['Indenização', 'Subtotal Indenização', 'Soma das verbas de indenização + FGTS', 'Salários + 13º + Férias + FGTS', t1.total, 'R$', ''],
  ];

  if (vin) {
    const linhasVinculo: [string, VinculoVerba][] = [
      ['Salários', vin.salarios],
      ['13º', vin.decimoTerceiro],
      ['Férias + 1/3', vin.feriasComTerco],
      [`FGTS não depositado (${aliquotaLabel})`, vin.fgts],
    ];
    rows.push(['', '', '', '', '', '', '']);
    for (const [nome, v] of linhasVinculo) {
      rows.push([
        'Vínculo',
        nome,
        'Verba do período trabalhado sem registro, abatido o que foi pago',
        `devido ${fmt(v.devido)} − pago ${fmt(v.recebido)}`,
        v.diferenca,
        'R$',
        `${vin.meses} meses de ${formatDateBR(vin.inicio)} a ${formatDateBR(vin.fim)}`,
      ]);
    }
    if (vin.outrosRecebidos > 0) {
      rows.push(['Vínculo', 'Outros valores recebidos', 'Abatimento informado pelo usuário', `− ${fmt(vin.outrosRecebidos)}`, -vin.outrosRecebidos, 'R$', vin.outrosDescricao ?? '']);
    }
    rows.push(['Vínculo', 'Subtotal do Período sem Registro', 'Soma das diferenças ainda devidas', 'Salários + 13º + Férias + FGTS − abatimentos', vin.total, 'R$', '']);
  }

  if (t2) {
    rows.push(
      ['', '', '', '', '', '', ''],
      ['Rescisórias', 'Aviso prévio', 'Aviso prévio proporcional ao tempo de serviço', `${t2.avisoDias ?? 30} dias × (${fmt(sal)} / 30)`, t2.avisoProvio, 'R$', 'Lei 12.506/2011 — devido na dispensa projetada para o fim da estabilidade'],
      ['Rescisórias', '13º sobre aviso', 'Um doze avos do aviso prévio', `${fmt(t2.avisoProvio)} / 12`, t2.decimoTerceiroAviso, 'R$', ''],
      ['Rescisórias', 'Férias + 1/3 sobre aviso', 'Férias proporcionais sobre o aviso prévio', `(${fmt(t2.decimoTerceiroAviso)} / 3) + ${fmt(t2.decimoTerceiroAviso)}`, t2.feriasComTercoAviso, 'R$', ''],
      ['Rescisórias', 'Multa art. 477', 'Multa por atraso no pagamento das verbas rescisórias', `${fmt(sal)}`, t2.multa477, 'R$', ''],
      ['Rescisórias', 'Já recebido na saída', 'Aviso e demais verbas pagas na rescisão', `− ${fmt(t2.jaRecebido ?? 0)}`, -(t2.jaRecebido ?? 0), 'R$', ''],
      ['Rescisórias', 'Subtotal Verbas Rescisórias', 'Soma das verbas rescisórias', 'Aviso + 13º + Férias + Multa 477 − recebido', t2.total, 'R$', ''],
    );
  }

  if (mf) {
    rows.push(
      ['', '', '', '', '', '', ''],
      ['Multa FGTS', 'FGTS sobre verbas indenizatórias', 'FGTS apurado na indenização', `Valor da indenização: ${fmt(mf.fgtsRescisorio)}`, mf.fgtsRescisorio, 'R$', ''],
      ['Multa FGTS', 'FGTS estimado do contrato', 'FGTS acumulado no período trabalhado', mf.incluiPeriodoContrato === false ? `${mf.mesesTrabalhados} meses fora da base` : `${mf.mesesTrabalhados} meses × ${fmt(sal)} × ${aliquotaLabel}`, mf.fgtsPeriodoContrato, 'R$', mf.incluiPeriodoContrato === false ? 'Multa de 40% sobre esse período já paga na rescisão' : ''],
      ['Multa FGTS', 'FGTS do período sem registro', 'FGTS devido e nunca depositado', `Apurado no grupo Vínculo`, mf.fgtsPeriodoVinculo ?? 0, 'R$', ''],
      ['Multa FGTS', 'Base total do FGTS', 'Soma dos FGTS que compõem a base', `${fmt(mf.fgtsRescisorio)} + ${fmt(mf.fgtsPeriodoContrato)} + ${fmt(mf.fgtsPeriodoVinculo ?? 0)}`, mf.baseTotalFgts, 'R$', ''],
      ['Multa FGTS', 'Multa de 40%', 'Multa de 40% sobre base total', `${fmt(mf.baseTotalFgts)} × 40%`, mf.multa40, 'R$', ''],
    );
  }

  rows.push(
    ['', '', '', '', '', '', ''],
    ['TOTAL', 'Total Geral', 'Soma final de todas as verbas', `Indenização${vin ? ' + Período sem Registro' : ''}${t2 ? ' + Rescisórias' : ''}${mf ? ' + Multa 40%' : ''}`, result.totalFinal, 'R$', ''],
  );

  const wsMem = XLSX.utils.aoa_to_sheet(rows);
  wsMem['!cols'] = [
    { wch: 12 }, { wch: 28 }, { wch: 55 }, { wch: 50 }, { wch: 18 }, { wch: 8 }, { wch: 45 },
  ];
  for (let r = 1; r < rows.length; r++) {
    const cell = wsMem[XLSX.utils.encode_cell({ r, c: 4 })];
    if (cell && typeof cell.v === 'number') {
      cell.z = '#,##0.00';
    }
  }
  XLSX.utils.book_append_sheet(wb, wsMem, 'MemoriaCalculo');

  // ===== Aba ResultadoBruto =====
  const flatResult = flattenObject(result);
  const rawRows: (string | number | boolean)[][] = [['Caminho do campo', 'Valor']];
  for (const [key, val] of Object.entries(flatResult)) {
    rawRows.push([key, val instanceof Date ? formatDateBR(val) : val]);
  }
  const wsRaw = XLSX.utils.aoa_to_sheet(rawRows);
  wsRaw['!cols'] = [{ wch: 35 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, wsRaw, 'ResultadoBruto');

  // ===== Aba Observacoes =====
  const obs: string[][] = [
    ['Observação'],
    ['Planilha gerada automaticamente pelo sistema Cálculos Gestante.'],
    ['Memorial de cálculo organizado para conferência judicial.'],
    ['Todos os valores foram localizados diretamente no objeto de resultado do sistema.'],
    [`Alíquota de FGTS aplicada: ${aliquotaLabel} (${input.empregadaDomestica ? 'Empregada doméstica' : 'CLT geral'}).`],
    [`Motivo da saída: ${result.tipoRescisao}.`],
    [t2 ?
      'Verbas rescisórias incluídas: não foram pagas na saída e são devidas na dispensa projetada para o fim da estabilidade.' :
      'Verbas rescisórias não incluídas: já quitadas na rescisão por dispensa sem justa causa.'],
    [mf ?
      (mf.incluiPeriodoContrato === false ?
        'Multa de 40% do FGTS apurada apenas sobre o FGTS do período de estabilidade — a incidente sobre o período trabalhado já foi paga na rescisão.' :
        `Multa de 40% do FGTS apurada sobre o FGTS do período de estabilidade somado ao do contrato. ${mf.mesesTrabalhados > 0 ? 'Data de admissão informada.' : 'Sem data de admissão: FGTS do contrato zerado.'}`) :
      'Multa de 40% do FGTS não ativada.'],
    ['Nos três motivos de saída o ato é nulo e o contrato se projeta até o fim da estabilidade (ADCT 10, II, "b"; CLT 500; Súmula 244, III, do TST).'],
    [vin ?
      `Período sem registro de ${formatDateBR(vin.inicio)} a ${formatDateBR(vin.fim)} (${vin.meses} meses): verbas apuradas pelo devido e abatidas do que foi comprovadamente pago.` :
      'Sem pedido de reconhecimento de vínculo neste cálculo.'],
    ['Tabela elaborada por Dr. Augusto Tomazzoni Lubenow — OAB 133519.'],
    [`Data de geração: ${new Date().toLocaleDateString('pt-BR')}`],
  ];
  const wsObs = XLSX.utils.aoa_to_sheet(obs);
  wsObs['!cols'] = [{ wch: 90 }];
  XLSX.utils.book_append_sheet(wb, wsObs, 'Observacoes');

  // ===== Salvar =====
  const nomeArquivo = `calculo_gestante_${input.nome.replace(/\s+/g, '_').toUpperCase()}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, nomeArquivo);
}

function fmt(v: number): string {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function flattenObject(obj: any, prefix = ''): Record<string, any> {
  const result: Record<string, any> = {};
  for (const key in obj) {
    if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
    const path = prefix ? `${prefix}.${key}` : key;
    const val = obj[key];
    if (val instanceof Date) {
      result[path] = val;
    } else if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      Object.assign(result, flattenObject(val, path));
    } else {
      result[path] = val;
    }
  }
  return result;
}
