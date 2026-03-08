import * as XLSX from 'xlsx';
import { CalcInput, CalcResult } from './calculator';
import { formatDateBR } from './dateUtils';

export function exportCalculoGestante(input: CalcInput, result: CalcResult): void {
  const wb = XLSX.utils.book_new();
  const aliquotaLabel = input.empregadaDomestica ? '11,2%' : '8%';
  const meses = result.mesesEstabilidade;
  const sal = input.salario;

  // ===== Aba Parametros =====
  const parametros: (string | number)[][] = [
    ['Parâmetro', 'Valor'],
    ['Nome da cliente', input.nome],
    ['Data de nascimento', formatDateBR(input.nascimento)],
    ['Salário mensal', sal],
    ['Data de admissão', input.admissao ? formatDateBR(input.admissao) : 'Não informada'],
    ['Data da demissão', formatDateBR(input.demissao)],
    ['Data da concepção', formatDateBR(input.concepcao)],
    ['Data do parto / previsão', formatDateBR(result.previsaoParto)],
    ['Empregada doméstica', input.empregadaDomestica ? 'Sim' : 'Não'],
    ['Pediu a conta', input.pediuAConta ? 'Sim' : 'Não'],
    ['Calcular multa 40% FGTS', input.calcularMultaFgts ? 'Sim' : 'Não'],
    ['Tipo de rescisão', result.tipoRescisao],
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

  const header = ['Grupo', 'Item', 'Explicação simples', 'Conta usada', 'Resultado', 'Unidade', 'Observação'];

  const rows: (string | number)[][] = [
    header,
    ['Indenização', 'Salários do período', 'Salário mensal multiplicado pelos meses de estabilidade', `${fmt(sal)} × ${meses}`, t1.salarios, 'R$', ''],
    ['Indenização', '13º proporcional', 'Um doze avos do salário por mês de estabilidade', `(${fmt(sal)} / 12) × ${meses}`, t1.decimoTerceiro, 'R$', ''],
    ['Indenização', 'Férias + 1/3', 'Um terço do salário somado ao 13º proporcional', `(${fmt(sal)} / 3) + ${fmt(t1.decimoTerceiro)}`, t1.feriasComTerco, 'R$', ''],
    ['Indenização', 'Subtotal Indenização', 'Soma das verbas de indenização', 'Salários + 13º + Férias', t1.total, 'R$', ''],
    ['', '', '', '', '', '', ''],
    ['Rescisórias', `FGTS (${aliquotaLabel})`, 'FGTS calculado sobre salários + 13º + férias', `(${fmt(t1.salarios)} + ${fmt(t1.decimoTerceiro)} + ${fmt(t1.feriasComTerco)}) × ${aliquotaLabel}`, t2.fgts, 'R$', input.empregadaDomestica ? 'Alíquota doméstica 11,2%' : 'Alíquota CLT 8%'],
  ];

  if (input.pediuAConta) {
    rows.push(
      ['Rescisórias', 'Aviso prévio', 'Valor equivalente a um salário mensal', `${fmt(sal)}`, t2.avisoProvio, 'R$', 'Devido em caso de pedido de demissão'],
      ['Rescisórias', '13º sobre aviso', 'Um doze avos do aviso prévio', `${fmt(t2.avisoProvio)} / 12`, t2.decimoTerceiroAviso, 'R$', ''],
      ['Rescisórias', 'Férias + 1/3 sobre aviso', 'Férias proporcionais sobre o aviso prévio', `(${fmt(t2.decimoTerceiroAviso)} / 3) + ${fmt(t2.decimoTerceiroAviso)}`, t2.feriasComTercoAviso, 'R$', ''],
      ['Rescisórias', 'Multa art. 477', 'Multa por atraso no pagamento das verbas rescisórias', `${fmt(sal)}`, t2.multa477, 'R$', ''],
    );
  }

  rows.push(
    ['Rescisórias', 'Subtotal Verbas Rescisórias', 'Soma das verbas rescisórias', 'FGTS + Aviso + 13º + Férias + Multa 477', t2.total, 'R$', ''],
  );

  if (mf) {
    rows.push(['', '', '', '', '', '', '']);
    if (mf.temAdmissao) {
      rows.push(
        ['Multa FGTS', 'FGTS acumulado do contrato', 'FGTS acumulado calculado com base no salário, alíquota e meses de contrato', `${fmt(sal)} × ${aliquotaLabel} × ${mf.mesesContrato} meses`, mf.fgtsAcumuladoContrato, 'R$', ''],
      );
    } else {
      rows.push(
        ['Multa FGTS', 'FGTS acumulado do contrato', 'Data de admissão não informada', 'N/A', 0, 'R$', 'Multa calculada apenas sobre FGTS do acerto'],
      );
    }
    rows.push(
      ['Multa FGTS', 'FGTS do acerto', 'Corresponde ao FGTS calculado sobre as verbas rescisórias', `Valor do motor: ${fmt(mf.fgtsAcerto)}`, mf.fgtsAcerto, 'R$', ''],
      ['Multa FGTS', 'Multa de 40%', 'Multa de 40% aplicada sobre a soma do FGTS acumulado e do acerto', mf.temAdmissao ? `(${fmt(mf.fgtsAcumuladoContrato)} + ${fmt(mf.fgtsAcerto)}) × 40%` : `${fmt(mf.fgtsAcerto)} × 40%`, mf.multa40, 'R$', !mf.temAdmissao ? 'Sem data de admissão — base apenas FGTS do acerto' : ''],
    );
  }

  rows.push(
    ['', '', '', '', '', '', ''],
    ['TOTAL', 'Total Geral', 'Soma final de todas as verbas', 'Indenização + Rescisórias' + (mf ? ' + Multa 40%' : ''), result.totalFinal, 'R$', ''],
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
    [input.pediuAConta ? 'Verbas rescisórias completas — a cliente pediu demissão.' : 'Verbas rescisórias com FGTS apenas — rescisão por dispensa.'],
    [mf ? `Multa de 40% do FGTS ativada. ${mf.temAdmissao ? 'Data de admissão informada — FGTS do contrato incluído.' : 'Sem data de admissão — multa sobre FGTS do acerto apenas.'}` : 'Multa de 40% do FGTS não ativada.'],
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
