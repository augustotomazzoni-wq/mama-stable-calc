import { describe, it, expect } from "vitest";
import { calculate, resolveTipoRegistro, CalcInput, MotivoSaida, VinculoInput, VinculoRecebido } from "@/lib/calculator";

/**
 * Maria nunca foi registrada: trabalhou de 01/03/2024 a 01/08/2025 ganhando
 * R$ 2.000, recebidos todo mês por fora, e foi dispensada verbalmente.
 * Estabilidade fixada em 12 meses; referência da prescrição em 01/09/2025.
 *
 * Salários devidos: 17 meses cheios + 1 dia de agosto = 34.064,52 (todos pagos)
 * 13º: 2024 = 10/12, 2025 = 7/12 (agosto teve 1 dia)   =  2.833,33
 * Férias: 1º período completo 2.666,67 + 5/12 do 2º 1.111,11 = 3.777,78
 * FGTS: 8% × (34.064,52 + 2.833,33 + 3.777,78)          =  3.254,05
 */
const SEM_RECEBIMENTOS: VinculoRecebido = {
  salarios: 0,
  decimoTerceiro: 0,
  ferias: 0,
  fgts: 0,
  rescisorias: 0,
  outros: 0,
};

function makeVinculo(overrides: Partial<VinculoInput> = {}): VinculoInput {
  return {
    inicio: new Date(2024, 2, 1),
    fim: new Date(2025, 7, 1),
    salario: 2000,
    recebiaSalario: true,
    recebido: SEM_RECEBIMENTOS,
    ...overrides,
  };
}

function makeInput(
  motivo: MotivoSaida = "dispensa_sem_justa_causa",
  overrides: Partial<CalcInput> = {},
): CalcInput {
  const vinculo = overrides.vinculo ?? makeVinculo();
  return {
    nome: "Maria",
    nascimento: null,
    salario: 2000,
    demissao: vinculo.fim,
    concepcao: new Date(2025, 6, 1),
    partoPrevisao: new Date(2026, 2, 24),
    pediuAConta: motivo === "pedido_demissao",
    motivoSaida: motivo,
    tipoRegistro: "sem_registro",
    mesesManual: 12,
    empregadaDomestica: false,
    admissao: null,
    calcularMultaFgts: true,
    dataReferencia: new Date(2025, 8, 1),
    ...overrides,
    vinculo,
  };
}

describe("cliente sem registro", () => {
  it("cobra a rescisão mesmo na dispensa, porque nada foi pago na saída", () => {
    const r = calculate(makeInput("dispensa_sem_justa_causa"));
    expect(r.tabela2).not.toBeNull();
    expect(r.tabela2!.multa477).toBe(2000);
  });

  it("não cobra de novo o salário que ela recebeu por fora", () => {
    const r = calculate(makeInput());
    expect(r.vinculo!.salarios.devido).toBeCloseTo(34064.52, 2);
    expect(r.vinculo!.salarios.diferenca).toBeCloseTo(0, 2);
  });

  it("mantém o salário pago por fora na base do FGTS", () => {
    const v = calculate(makeInput()).vinculo!;
    expect(v.decimoTerceiro.devido).toBeCloseTo(2833.33, 2);
    expect(v.feriasComTerco.devido).toBeCloseTo(3777.78, 2);
    expect(v.fgts.devido).toBeCloseTo(3254.05, 2);
  });

  it("conta o aviso prévio por todo o tempo de serviço, até o fim da estabilidade", () => {
    // 01/03/2024 a 24/08/2026: 2 anos completos, logo 36 dias.
    const r = calculate(makeInput());
    expect(r.tabela2!.avisoDias).toBe(36);
    expect(r.tabela2!.avisoProvio).toBeCloseTo(2400, 2);
  });

  it("leva todo o FGTS do período trabalhado para a base da multa de 40%", () => {
    const r = calculate(makeInput());
    expect(r.multaFgts!.fgtsPeriodoContrato).toBe(0);
    expect(r.multaFgts!.fgtsPeriodoVinculo).toBeCloseTo(3254.05, 2);
  });

  it("cobra os salários quando ela não recebia", () => {
    const r = calculate(makeInput("dispensa_sem_justa_causa", {
      vinculo: makeVinculo({ recebiaSalario: false }),
    }));
    expect(r.vinculo!.salarios.diferenca).toBeCloseTo(34064.52, 2);
  });
});

describe("piso da categoria", () => {
  it("cobra a diferença para o piso e calcula as verbas sobre ele", () => {
    const r = calculate(makeInput("dispensa_sem_justa_causa", {
      salario: 1500,
      piso: 2000,
      vinculo: makeVinculo({
        inicio: new Date(2024, 0, 1),
        fim: new Date(2024, 5, 30),
        salario: 1500,
      }),
    }));

    expect(r.salarioBase).toBe(2000);
    // 6 meses a 2.000 devidos, 6 meses a 1.500 pagos.
    expect(r.vinculo!.salarios.diferenca).toBeCloseTo(3000, 2);
    expect(r.tabela1.salarios).toBeCloseTo(24000, 2);
  });

  it("não muda nada quando o piso é menor que o salário", () => {
    const comPiso = calculate(makeInput("pedido_demissao", { piso: 1000 }));
    const semPiso = calculate(makeInput("pedido_demissao"));
    expect(comPiso.totalFinal).toBeCloseTo(semPiso.totalFinal, 2);
  });
});

describe("férias por período aquisitivo", () => {
  // 01/01/2022 a 30/06/2024: dois períodos completos e seis meses do terceiro.
  const r = calculate(makeInput("dispensa_sem_justa_causa", {
    vinculo: makeVinculo({ inicio: new Date(2022, 0, 1), fim: new Date(2024, 5, 30) }),
  }));
  const periodos = r.vinculo!.periodosFerias!;

  it("paga em dobro o período cujo prazo de concessão venceu antes da saída", () => {
    // 2022: concessão até 31/12/2023, antes da saída em 30/06/2024.
    expect(periodos[0].dobro).toBe(true);
    expect(periodos[0].valor).toBeCloseTo(5333.33, 2);
  });

  it("paga simples o período ainda dentro do prazo de concessão", () => {
    // 2023: concessão até 31/12/2024, depois da saída.
    expect(periodos[1].dobro).toBe(false);
    expect(periodos[1].valor).toBeCloseTo(2666.67, 2);
  });

  it("paga proporcional o último período incompleto", () => {
    expect(periodos[2].completo).toBe(false);
    expect(periodos[2].meses).toBe(6);
    expect(periodos[2].valor).toBeCloseTo(1333.33, 2);
  });

  it("deixa a dobra fora da base do FGTS", () => {
    const v = r.vinculo!;
    const feriasSemDobra = periodos.reduce((soma, p) => soma + p.valorSimples, 0);
    const base = v.salarios.devido + v.decimoTerceiro.devido + feriasSemDobra;
    expect(v.fgts.devido).toBeCloseTo(base * 0.08, 2);
  });
});

describe("13º pela regra dos 15 dias", () => {
  it("despreza o mês com menos de 15 dias trabalhados", () => {
    // Janeiro: só 12 dias (20 a 31).
    const r = calculate(makeInput("dispensa_sem_justa_causa", {
      vinculo: makeVinculo({ inicio: new Date(2024, 0, 20), fim: new Date(2024, 5, 30) }),
    }));
    expect(r.vinculo!.decimoPorAno).toEqual([
      expect.objectContaining({ ano: 2024, meses: 5 }),
    ]);
  });

  it("conta o mês com 15 dias ou mais", () => {
    // Janeiro: 22 dias (10 a 31).
    const r = calculate(makeInput("dispensa_sem_justa_causa", {
      vinculo: makeVinculo({ inicio: new Date(2024, 0, 10), fim: new Date(2024, 5, 30) }),
    }));
    expect(r.vinculo!.decimoPorAno![0].meses).toBe(6);
  });
});

describe("prescrição", () => {
  it("deixa fora as verbas com mais de cinco anos e avisa", () => {
    // Referência 01/09/2025: limite em 01/09/2020.
    const r = calculate(makeInput("dispensa_sem_justa_causa", {
      vinculo: makeVinculo({ inicio: new Date(2019, 0, 1), recebiaSalario: false }),
    }));
    const v = r.vinculo!;

    // Janeiro de 2019 a agosto de 2020: 20 meses.
    expect(v.mesesPrescritos).toBe(20);
    expect(v.decimoPorAno!.find((d) => d.ano === 2019)!.prescrito).toBe(true);
    // O 13º de 2020 vence em dezembro, depois do limite.
    expect(v.decimoPorAno!.find((d) => d.ano === 2020)!.prescrito).toBe(false);
    expect(r.alertas!.map((a) => a.tipo)).toContain("prescricao_quinquenal");
  });

  it("avisa quando passaram dois anos do fim do aviso prévio", () => {
    const vinculo = makeVinculo({ inicio: new Date(2021, 0, 1), fim: new Date(2022, 0, 1) });
    const r = calculate(makeInput("pedido_demissao", { vinculo }));
    expect(r.alertas!.map((a) => a.tipo)).toContain("prescricao_bienal");
  });

  it("não avisa nada num caso recente", () => {
    expect(calculate(makeInput()).alertas).toEqual([]);
  });
});

describe("pedidos opcionais", () => {
  it("calcula a multa do 467 sobre o aviso e seus reflexos, sem a multa do 477", () => {
    // Aviso de 36 dias: 2.400 + 200 + 266,67 = 2.866,67; metade = 1.433,33.
    const r = calculate(makeInput("dispensa_sem_justa_causa", {
      opcionais: { multa467: true, seguroDesemprego: 0, outrosValor: 0 },
    }));
    expect(r.opcionais!.multa467).toBeCloseTo(1433.33, 2);
  });

  it("soma seguro-desemprego e dano moral ao total", () => {
    const sem = calculate(makeInput());
    const com = calculate(makeInput("dispensa_sem_justa_causa", {
      opcionais: { multa467: false, seguroDesemprego: 3000, outrosValor: 10000, outrosDescricao: "Dano moral" },
    }));
    expect(com.opcionais!.total).toBe(13000);
    expect(com.totalFinal).toBeCloseTo(sem.totalFinal + 13000, 2);
  });

  it("fica de fora quando nada foi preenchido", () => {
    const r = calculate(makeInput("dispensa_sem_justa_causa", {
      opcionais: { multa467: false, seguroDesemprego: 0, outrosValor: 0 },
    }));
    expect(r.opcionais).toBeNull();
  });
});

describe("tipo de registro em cálculos antigos", () => {
  it("trata como carteira assinada quando não há período sem registro", () => {
    expect(resolveTipoRegistro({ tipoRegistro: undefined, vinculo: null })).toBe("com_carteira");
  });

  it("trata como registro posterior quando havia período sem registro", () => {
    expect(resolveTipoRegistro({ tipoRegistro: undefined, vinculo: makeVinculo() })).toBe("registrada_depois");
  });
});
