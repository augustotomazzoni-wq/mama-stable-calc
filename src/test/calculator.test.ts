import { describe, it, expect } from "vitest";
import {
  calculate,
  resolveMotivoSaida,
  resolveTipoRegistro,
  calcAvisoDias,
  CalcInput,
  MotivoSaida,
  VinculoRecebido } from
"@/lib/calculator";

/**
 * Caso-base: salário R$ 2.000, contrato de 01/02/2025 a 01/08/2025 (6 meses)
 * e 12 meses de estabilidade fixados na mão, para o cálculo não depender das
 * datas de gestação.
 *
 * FGTS da estabilidade = 8% × (24.000 + 2.000 + 2.666,67) = 2.293,33
 * FGTS do contrato     = 6 × 2.000 × 8%                   =   960,00
 */
function makeInput(motivoSaida: MotivoSaida, overrides: Partial<CalcInput> = {}): CalcInput {
  return {
    nome: "Teste",
    nascimento: null,
    salario: 2000,
    demissao: new Date(2025, 7, 1),
    concepcao: new Date(2025, 6, 1),
    partoPrevisao: new Date(2026, 2, 24),
    pediuAConta: motivoSaida === "pedido_demissao",
    motivoSaida,
    mesesManual: 12,
    empregadaDomestica: false,
    admissao: new Date(2025, 1, 1),
    calcularMultaFgts: true,
    dataReferencia: new Date(2025, 8, 1),
    ...overrides,
  };
}

function makeVinculo(
  overrides: {
    inicio?: Date;
    fim?: Date;
    salario?: number;
    recebiaSalario?: boolean;
    recebido?: Partial<VinculoRecebido>;
  } = {},
) {
  return {
    inicio: overrides.inicio ?? new Date(2024, 0, 1),
    // Último dia trabalhado, contado por inteiro: janeiro a junho, 6 meses.
    fim: overrides.fim ?? new Date(2024, 5, 30),
    salario: overrides.salario ?? 2000,
    recebiaSalario: overrides.recebiaSalario,
    recebido: {
      salarios: 0,
      decimoTerceiro: 0,
      ferias: 0,
      fgts: 0,
      rescisorias: 0,
      outros: 0,
      ...overrides.recebido,
    },
  };
}

const FGTS_ESTABILIDADE = 2293.3333;
const FGTS_CONTRATO = 960;

describe("multa de 40% do FGTS por motivo da saída", () => {
  it("na dispensa sem justa causa, incide só sobre o FGTS do período de estabilidade", () => {
    const r = calculate(makeInput("dispensa_sem_justa_causa"));

    expect(r.multaFgts!.incluiPeriodoContrato).toBe(false);
    expect(r.multaFgts!.fgtsPeriodoContrato).toBe(0);
    expect(r.multaFgts!.baseTotalFgts).toBeCloseTo(FGTS_ESTABILIDADE, 2);
    expect(r.multaFgts!.multa40).toBeCloseTo(917.33, 2);
  });

  it("mostra os meses de contrato mesmo quando eles ficam fora da base", () => {
    const r = calculate(makeInput("dispensa_sem_justa_causa"));
    expect(r.multaFgts!.mesesTrabalhados).toBe(6);
  });

  it("no pedido de demissão, alcança o FGTS do contrato e o da estabilidade", () => {
    const r = calculate(makeInput("pedido_demissao"));

    expect(r.multaFgts!.incluiPeriodoContrato).toBe(true);
    expect(r.multaFgts!.fgtsPeriodoContrato).toBeCloseTo(FGTS_CONTRATO, 2);
    expect(r.multaFgts!.baseTotalFgts).toBeCloseTo(FGTS_ESTABILIDADE + FGTS_CONTRATO, 2);
    expect(r.multaFgts!.multa40).toBeCloseTo(1301.33, 2);
  });

  it("no término de experiência, alcança os dois períodos como no pedido de demissão", () => {
    const experiencia = calculate(makeInput("fim_experiencia"));
    const pedido = calculate(makeInput("pedido_demissao"));

    expect(experiencia.multaFgts!.multa40).toBeCloseTo(pedido.multaFgts!.multa40, 2);
    expect(experiencia.totalFinal).toBeCloseTo(pedido.totalFinal, 2);
  });

  it("não calcula multa quando o cálculo está desativado", () => {
    const r = calculate(makeInput("pedido_demissao", { calcularMultaFgts: false }));
    expect(r.multaFgts).toBeNull();
  });
});

describe("verbas rescisórias por motivo da saída", () => {
  it("não repete as verbas já pagas na dispensa sem justa causa", () => {
    const r = calculate(makeInput("dispensa_sem_justa_causa"));
    expect(r.tabela2).toBeNull();
  });

  it("inclui aviso, 13º, férias e multa do art. 477 no pedido de demissão", () => {
    const r = calculate(makeInput("pedido_demissao"));
    expect(r.tabela2).not.toBeNull();
    // Admissão em 01/02/2025 e estabilidade até 24/08/2026: 1 ano completo,
    // logo 33 dias de aviso (Lei 12.506/2011).
    expect(r.tabela2!.avisoDias).toBe(33);
    expect(r.tabela2!.avisoProvio).toBeCloseTo(2200, 2);
    expect(r.tabela2!.multa477).toBe(2000);
  });

  it("inclui as mesmas verbas no término de experiência", () => {
    const r = calculate(makeInput("fim_experiencia"));
    expect(r.tabela2).not.toBeNull();
  });
});

describe("rótulos e total", () => {
  it("nomeia a rescisão conforme o motivo", () => {
    expect(calculate(makeInput("dispensa_sem_justa_causa")).tipoRescisao).toBe("Dispensa sem justa causa");
    expect(calculate(makeInput("pedido_demissao")).tipoRescisao).toBe("Pedido de demissão");
    expect(calculate(makeInput("fim_experiencia")).tipoRescisao).toBe("Término do contrato de experiência");
  });

  it("soma indenização, rescisórias e multa no total final", () => {
    const r = calculate(makeInput("pedido_demissao"));
    const esperado = r.tabela1.total + r.tabela2!.total + r.multaFgts!.multa40;
    expect(r.totalFinal).toBeCloseTo(esperado, 2);
  });

  it("na dispensa, o total é a indenização somada apenas à multa", () => {
    const r = calculate(makeInput("dispensa_sem_justa_causa"));
    expect(r.totalFinal).toBeCloseTo(r.tabela1.total + r.multaFgts!.multa40, 2);
  });
});

describe("aviso prévio proporcional (Lei 12.506/2011)", () => {
  it("aplica o mínimo de 30 dias quando não há data de início", () => {
    expect(calcAvisoDias(null, new Date(2026, 0, 1))).toBe(30);
  });

  it("acrescenta 3 dias por ano completo de serviço", () => {
    expect(calcAvisoDias(new Date(2020, 0, 1), new Date(2025, 0, 1))).toBe(45);
  });

  it("não passa do teto de 90 dias", () => {
    expect(calcAvisoDias(new Date(1990, 0, 1), new Date(2025, 0, 1))).toBe(90);
  });

  it("conta o tempo desde o período sem registro, quando ele é anterior à admissão", () => {
    const comVinculo = calculate(makeInput("pedido_demissao", {
      vinculo: makeVinculo({ inicio: new Date(2020, 0, 1) }),
    }));
    const semVinculo = calculate(makeInput("pedido_demissao"));

    expect(comVinculo.tabela2!.avisoDias).toBeGreaterThan(semVinculo.tabela2!.avisoDias);
  });
});

/**
 * Período sem registro de 01/01/2024 a 30/06/2024 (6 meses) a R$ 2.000, sem
 * salário presumido pago (o padrão de cálculos antigos):
 * salários 12.000 · 13º 1.000 · férias + 1/3 1.333,33 · FGTS 1.146,67
 * = 15.480,00 devidos.
 */
describe("período trabalhado sem registro", () => {
  it("apura salários, 13º, férias e FGTS do período", () => {
    const r = calculate(makeInput("dispensa_sem_justa_causa", { vinculo: makeVinculo() }));
    const v = r.vinculo!;

    expect(v.meses).toBe(6);
    expect(v.salarios.devido).toBeCloseTo(12000, 2);
    expect(v.decimoTerceiro.devido).toBeCloseTo(1000, 2);
    expect(v.feriasComTerco.devido).toBeCloseTo(1333.33, 2);
    expect(v.fgts.devido).toBeCloseTo(1146.67, 2);
    expect(v.totalDevido).toBeCloseTo(15480, 2);
    expect(v.total).toBeCloseTo(15480, 2);
  });

  it("abate verba a verba o que já foi pago", () => {
    const r = calculate(makeInput("dispensa_sem_justa_causa", {
      vinculo: makeVinculo({ recebido: { salarios: 12000 } }),
    }));
    const v = r.vinculo!;

    expect(v.salarios.diferenca).toBe(0);
    expect(v.decimoTerceiro.diferenca).toBeCloseTo(1000, 2);
    expect(v.total).toBeCloseTo(3480, 2);
  });

  it("não deixa a diferença ficar negativa quando o pago supera o devido", () => {
    const r = calculate(makeInput("dispensa_sem_justa_causa", {
      vinculo: makeVinculo({ recebido: { salarios: 99000 } }),
    }));
    const v = r.vinculo!;

    expect(v.salarios.diferenca).toBe(0);
    expect(v.total).toBeGreaterThanOrEqual(0);
    expect(v.excedente).toBeGreaterThan(0);
  });

  it("abate do subtotal os outros valores recebidos", () => {
    const semOutros = calculate(makeInput("dispensa_sem_justa_causa", { vinculo: makeVinculo() }));
    const comOutros = calculate(makeInput("dispensa_sem_justa_causa", {
      vinculo: makeVinculo({ recebido: { outros: 500 } }),
    }));

    expect(comOutros.vinculo!.total).toBeCloseTo(semOutros.vinculo!.total - 500, 2);
  });

  it("soma o subtotal do vínculo ao total final", () => {
    const r = calculate(makeInput("dispensa_sem_justa_causa", { vinculo: makeVinculo() }));
    expect(r.totalFinal).toBeCloseTo(r.tabela1.total + r.vinculo!.total + r.multaFgts!.multa40, 2);
  });

  it("leva o FGTS do período sem registro para a base da multa, mesmo na dispensa", () => {
    const r = calculate(makeInput("dispensa_sem_justa_causa", { vinculo: makeVinculo() }));
    const mf = r.multaFgts!;

    expect(mf.fgtsPeriodoContrato).toBe(0);
    expect(mf.fgtsPeriodoVinculo).toBeCloseTo(1146.67, 2);
    expect(mf.baseTotalFgts).toBeCloseTo(FGTS_ESTABILIDADE + 1146.67, 2);
  });

  it("abate das rescisórias o aviso e as verbas já pagas na saída", () => {
    const semAbatimento = calculate(makeInput("pedido_demissao", { vinculo: makeVinculo() }));
    const comAbatimento = calculate(makeInput("pedido_demissao", {
      vinculo: makeVinculo({ recebido: { rescisorias: 1000 } }),
    }));

    expect(comAbatimento.tabela2!.jaRecebido).toBe(1000);
    expect(comAbatimento.tabela2!.total).toBeCloseTo(semAbatimento.tabela2!.total - 1000, 2);
  });

  it("fica de fora quando o módulo não é usado", () => {
    const r = calculate(makeInput("dispensa_sem_justa_causa"));
    expect(r.vinculo).toBeNull();
  });
});

describe("compatibilidade com cálculos antigos", () => {
  it("traduz o booleano gravado antes do campo de motivo existir", () => {
    expect(resolveMotivoSaida({ pediuAConta: true, motivoSaida: undefined })).toBe("pedido_demissao");
    expect(resolveMotivoSaida({ pediuAConta: false, motivoSaida: undefined })).toBe("dispensa_sem_justa_causa");
  });

  it("recalcula um input antigo sem motivoSaida sem quebrar", () => {
    const antigo = makeInput("pedido_demissao");
    delete (antigo as Partial<CalcInput>).motivoSaida;

    const r = calculate(antigo);
    expect(r.motivoSaida).toBe("pedido_demissao");
    expect(r.tabela2).not.toBeNull();
  });
});
