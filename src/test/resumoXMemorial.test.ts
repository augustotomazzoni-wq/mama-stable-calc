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

/** Exatamente a conta que o ResumoCalculos.tsx faz. */
function resumoAtual(result: ReturnType<typeof calculate>) {
  const t2 = result.tabela2;
  const dif = (verba: { diferenca: number } | undefined, cheio: number) =>
    verba ? verba.diferenca : cheio;

  const rescisoriasBrutas = t2 ?
  dif(t2.aviso, t2.avisoProvio) +
  dif(t2.decimoAviso, t2.decimoTerceiroAviso) +
  dif(t2.feriasAviso, t2.feriasComTercoAviso) +
  dif(t2.fgtsAviso, t2.fgtsSobreAviso ?? 0) +
  (t2.devolucaoAvisoDescontado ?? 0) :
  0;
  const multa477Bruta = t2 ? dif(t2.multa477Verba, t2.multa477) : 0;
  const outrosAbatidos = t2?.outrosRecebidos ?? 0;

  const indenizacao = result.tabela1.total;
  const periodoSemRegistro = result.vinculo ? result.vinculo.total : 0;
  const verbasRescisorias = Math.max(0, rescisoriasBrutas - outrosAbatidos);
  const sobra = Math.max(0, outrosAbatidos - rescisoriasBrutas);
  const multa477 = Math.max(0, multa477Bruta - sobra);
  const multaFgts = result.multaFgts ? result.multaFgts.multa40 : 0;
  const pedidosAdicionais = result.opcionais ? result.opcionais.total : 0;
  return {
    indenizacao, periodoSemRegistro, verbasRescisorias, multa477, multaFgts, pedidosAdicionais,
    valorTotal:
      indenizacao + periodoSemRegistro + verbasRescisorias + multa477 + multaFgts + pedidosAdicionais,
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
  [
    "abatimento geral que come parte da multa do 477",
    makeInput("pedido_demissao", {
      naoRecebeuTudoNaSaida: true,
      recebidoNaRescisao: {
        avisoPrevio: 0, decimoTerceiroAviso: 0, feriasAviso: 0, fgtsAviso: 0,
        multa477: 0, outros: 4000,
      },
    }),
  ],
  [
    "abatimento geral que zera as rescisórias",
    makeInput("pedido_demissao", {
      naoRecebeuTudoNaSaida: true,
      recebidoNaRescisao: {
        avisoPrevio: 0, decimoTerceiroAviso: 0, feriasAviso: 0, fgtsAviso: 0,
        multa477: 0, outros: 99999,
      },
    }),
  ],
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
      expect(z.verbasRescisorias + z.multa477).toBeCloseTo(r.tabela2!.total, 2);
    });

    it(`a linha da multa do 477 é a diferença apurada no memorial: ${nome}`, () => {
      const r = calculate(input);
      const z = resumoAtual(r);
      // Sem abatimento geral, a linha é exatamente a diferença da verba.
      if ((r.tabela2!.outrosRecebidos ?? 0) === 0) {
        expect(z.multa477).toBeCloseTo(r.tabela2!.multa477Verba!.diferenca, 2);
      }
    });
  }
});
