import { describe, it, expect } from "vitest";
import {
  normalizarNome,
  similaridade,
  saoMesmaPessoa,
  agruparPessoas,
  mediaAparada,
  mediaSimples,
  cortePorPonta } from
"@/lib/estatisticas";

describe("normalização de nomes", () => {
  it("ignora acento, caixa e pontuação", () => {
    expect(normalizarNome("  MARIA   das Graças  ")).toBe("maria das gracas");
    expect(normalizarNome("Ana-Paula O'Brien")).toBe("ana paula o brien");
  });

  it("mede o quanto dois nomes se parecem", () => {
    expect(similaridade("Maria Silva", "maria silva")).toBe(1);
    expect(similaridade("Maria Silva", "Maria Sliva")).toBeGreaterThan(0.8);
    expect(similaridade("Maria Silva", "Joana Prado")).toBeLessThan(0.5);
  });
});

describe("identificação da mesma pessoa", () => {
  const nascimento = new Date(1990, 4, 12);

  it("junta quando o nome é igual, mesmo sem outros dados", () => {
    expect(saoMesmaPessoa({ nome: "Maria da Silva" }, { nome: "MARIA DA SILVA" })).toBe(true);
  });

  it("junta erro de digitação confirmado por outro dado", () => {
    expect(saoMesmaPessoa(
      { nome: "Maria Silva", salario: 2000 },
      { nome: "Maria Sliva", salario: 2000 },
    )).toBe(true);
  });

  it("junta nome abreviado quando a data de nascimento bate", () => {
    expect(saoMesmaPessoa(
      { nome: "Maria A. Silva", nascimento },
      { nome: "Maria Aparecida Silva", nascimento },
    )).toBe(true);
  });

  it("não junta pessoas diferentes com nomes parecidos", () => {
    expect(saoMesmaPessoa(
      { nome: "Maria Silva", nascimento: new Date(1990, 0, 1), salario: 2000 },
      { nome: "Mario Silva", nascimento: new Date(1985, 5, 20), salario: 3100 },
    )).toBe(false);
  });

  it("não junta só porque o salário coincide", () => {
    expect(saoMesmaPessoa(
      { nome: "Joana Prado", salario: 2000 },
      { nome: "Carla Menezes", salario: 2000 },
    )).toBe(false);
  });
});

describe("agrupamento de cadastros", () => {
  it("conta a mesma pessoa uma vez e guarda quantas fichas existem", () => {
    const registros = [
      { nome: "Maria Silva", nascimento: new Date(1990, 0, 1), salario: 2000, completo: 1 },
      { nome: "maria silva", nascimento: new Date(1990, 0, 1), salario: 2000, completo: 3 },
      { nome: "Joana Prado", nascimento: new Date(1988, 2, 5), salario: 4000, completo: 2 },
    ];

    const grupos = agruparPessoas(registros, (r) => r.completo);

    expect(grupos).toHaveLength(2);
    const maria = grupos.find((g) => g.quantidade === 2)!;
    expect(maria.principal.completo).toBe(3);
    expect(maria.duplicados).toHaveLength(1);
  });

  it("mantém pessoas distintas separadas", () => {
    const registros = [
      { nome: "Ana Souza", completo: 1 },
      { nome: "Carla Menezes", completo: 1 },
      { nome: "Beatriz Lima", completo: 1 },
    ];
    expect(agruparPessoas(registros, (r) => r.completo)).toHaveLength(3);
  });

  it("devolve lista vazia sem registros", () => {
    expect(agruparPessoas([] as { nome: string }[], () => 0)).toHaveLength(0);
  });
});

describe("média sem os extremos", () => {
  it("descarta o menor e o maior a partir de cinco valores", () => {
    // 1 e 100 saem; sobram 10, 11 e 12.
    expect(mediaAparada([1, 10, 11, 12, 100])).toBeCloseTo(11, 5);
  });

  it("usa a média cheia quando há poucos valores", () => {
    expect(mediaAparada([1, 100])).toBeCloseTo(50.5, 5);
    expect(cortePorPonta(4)).toBe(0);
  });

  it("protege a média de um caso fora da curva", () => {
    const valores = [2000, 2100, 2200, 2300, 900000];
    expect(mediaSimples(valores)).toBeGreaterThan(100000);
    expect(mediaAparada(valores)).toBeCloseTo(2200, 5);
  });

  it("corta mais quando a amostra cresce", () => {
    expect(cortePorPonta(30)).toBe(3);
    expect(cortePorPonta(10)).toBe(1);
  });

  it("devolve zero sem valores", () => {
    expect(mediaAparada([])).toBe(0);
    expect(mediaSimples([])).toBe(0);
  });
});
