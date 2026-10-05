import { describe, it, expect } from "vitest";
import { calculate, CalcInput, MotivoSaida } from "@/lib/calculator";

/** Confere o Resumo de Cálculos contra o Memorial, usando o motor real. */

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

/** Exatamente a conta que o ResumoCalculos.tsx faz hoje. */
function resumoAtual(result: ReturnType<typeof calculate>) {
  const indenizacao = result.tabela1.total;
  const periodoSemRegistro = result.vinculo ? result.vinculo.total : 0;
  const verbasRescisorias = result.tabela2 ? result.tabela2.total : 0;
  const multaFgts = result.multaFgts ? result.multaFgts.multa40 : 0;
  const pedidosAdicionais = result.opcionais ? result.opcionais.total : 0;
  return {
    indenizacao, periodoSemRegistro, verbasRescisorias, multaFgts, pedidosAdicionais,
    valorTotal: indenizacao + periodoSemRegistro + verbasRescisorias + multaFgts + pedidosAdicionais,
  };
}

const CENARIOS: [string, CalcInput][] = [
  ["deram a conta, indeterminado", makeInput("dispensa_sem_justa_causa")],
  ["ela pediu, indeterminado", makeInput("pedido_demissao")],
  ["acabou o prazo da experiência", makeInput("fim_experiencia")],
  ["deram a conta na experiência", makeInput("dispensa_na_experiencia")],
  ["ela pediu na experiência", makeInput("pedido_na_experiencia")],
  [
    "ela pediu, com aviso descontado",
    makeInput("pedido_demissao", { avisoNaSaida: "descontado" }),
  ],
  [
    "sem registro",
    makeInput("dispensa_sem_justa_causa", {
      tipoRegistro: "sem_registro",
      vinculo: {
        inicio: new Date(2024, 0, 1),
        fim: new Date(2024, 5, 30),
        salario: 2000,
        recebido: { salarios: 0, decimoTerceiro: 0, ferias: 0, fgts: 0, rescisorias: 0, outros: 0 },
      },
    }),
  ],
  ["doméstica", makeInput("pedido_demissao", { empregadaDomestica: true })],
];

describe("Resumo de Cálculos x Memorial", () => {
  for (const [nome, input] of CENARIOS) {
    it(`fecha com o total final: ${nome}`, () => {
      const r = calculate(input);
      const z = resumoAtual(r);
      expect(z.valorTotal).toBeCloseTo(r.totalFinal, 2);
    });

    it(`as rescisórias reproduzem o subtotal do memorial: ${nome}`, () => {
      const r = calculate(input);
      const z = resumoAtual(r);
      expect(z.verbasRescisorias).toBeCloseTo(r.tabela2!.total, 2);
    });
  }
});
