import { useState } from "react";
import { CalcInput, CalcResult, TIPO_REGISTRO_LABEL } from "@/lib/calculator";
import { formatBRL, formatDateBR } from "@/lib/dateUtils";
import { pedidosSemValor, tipoRegistroDe, rotuloSalario, rotuloSaida } from "@/lib/pedidos";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Printer } from "lucide-react";
import Logo from "@/components/Logo";

interface Props {
  input: CalcInput;
  result: CalcResult;
  onClose: () => void;
}

const LinhaVerba = ({
  titulo,
  valor,
  formula,
}: {
  titulo: string;
  valor: number;
  formula: string;
}) => (
  <div className="py-3 border-b border-border/60">
    <div className="flex items-baseline justify-between">
      <span className="text-sm font-medium text-foreground">{titulo}</span>
      <span className="text-sm font-semibold text-foreground tabular-nums">{formatBRL(valor)}</span>
    </div>
    <p className="text-xs text-muted-foreground mt-1 font-mono">Cálculo: {formula}</p>
  </div>
);

const SubtotalLinha = ({ titulo, valor }: { titulo: string; valor: number }) => (
  <div className="py-3 border-b-2 border-foreground/20">
    <div className="flex items-baseline justify-between">
      <span className="text-sm font-bold text-foreground uppercase tracking-wide">{titulo}</span>
      <span className="text-base font-bold text-foreground tabular-nums">{formatBRL(valor)}</span>
    </div>
  </div>
);

interface DadoItem {
  key: string;
  label: string;
  value: string;
}

const DadoLinha = ({
  label,
  value,
  checked,
  onToggle,
}: {
  label: string;
  value: string;
  checked: boolean;
  onToggle: () => void;
}) => (
  <div className={`flex items-center gap-2 ${!checked ? "print:hidden" : ""}`}>
    <Checkbox
      checked={checked}
      onCheckedChange={onToggle}
      className="print:hidden h-3.5 w-3.5"
    />
    <span className="text-muted-foreground text-sm">{label}</span>
    <span className="font-medium text-foreground text-sm ml-auto">{value}</span>
  </div>
);

const MemoriaCalculoDetalhada = ({ input, result, onClose }: Props) => {
  const t1 = result.tabela1;
  const t2 = result.tabela2;
  const mf = result.multaFgts;
  const vin = result.vinculo;
  const op = result.opcionais ?? null;
  const alertas = result.alertas ?? [];
  const tipoRegistro = tipoRegistroDe(input, result);
  const semRegistro = tipoRegistro === "sem_registro";
  const pedidos = pedidosSemValor(input, result);
  // A numeração acompanha as seções que existem neste cálculo.
  const nVinculo = 3;
  const nRescisorias = 3 + (vin ? 1 : 0);
  const nMulta = 3 + (vin ? 1 : 0) + (t2 ? 1 : 0);
  const nOpcionais = nMulta + (mf ? 1 : 0);
  const nPedidos = nOpcionais + (op ? 1 : 0);
  const aliquotaLabel = input.empregadaDomestica ? "11,2%" : "8%";
  const meses = result.mesesEstabilidade;
  // Estabilidade e rescisão usam o piso quando ele supera o salário pago.
  const sal = result.salarioBase ?? input.salario;
  const pisoAplicado = sal > input.salario;

  // Reconstituídos a partir do resultado para a fórmula exibida bater com a conta:
  // férias proporcionais são 3/4 do valor já acrescido de 1/3.
  const feriasProporcionais = (t1.feriasComTerco * 3) / 4;
  const tercoFerias = t1.feriasComTerco - feriasProporcionais;

  const fmt = (v: number) => formatBRL(v);

  const handlePrint = () => {
    window.print();
  };

  // Build dados do caso items
  const dadosItems: DadoItem[] = [
    { key: "nome", label: "Nome da reclamante", value: input.nome },
    ...(input.nascimento
      ? [{ key: "nascimento", label: "Data de nascimento", value: formatDateBR(input.nascimento) }]
      : []),
    { key: "registro", label: "Registro", value: TIPO_REGISTRO_LABEL[tipoRegistro] },
    ...(vin
      ? [{ key: "semRegistro", label: "Período sem registro", value: `${formatDateBR(vin.inicio)} a ${formatDateBR(vin.fim)}` }]
      : []),
    ...(input.admissao
      ? [{ key: "admissao", label: "Data de admissão", value: formatDateBR(input.admissao) }]
      : []),
    { key: "demissao", label: rotuloSaida(tipoRegistro), value: formatDateBR(input.demissao) },
    { key: "concepcao", label: "Data de concepção", value: formatDateBR(input.concepcao) },
    { key: "parto", label: "Data do parto / previsão", value: formatDateBR(result.previsaoParto) },
    { key: "fimEstab", label: "Fim da estabilidade", value: formatDateBR(result.fimEstabilidade) },
    { key: "salario", label: rotuloSalario(tipoRegistro), value: fmt(input.salario) },
    ...(pisoAplicado
      ? [{ key: "piso", label: "Piso usado nas verbas", value: fmt(sal) }]
      : []),
    { key: "categoria", label: "Categoria profissional", value: input.empregadaDomestica ? "Empregada doméstica" : "CLT geral" },
    { key: "rescisao", label: "Tipo de rescisão", value: result.tipoRescisao },
    { key: "aliquota", label: "Alíquota FGTS", value: aliquotaLabel },
    { key: "meses", label: "Meses de estabilidade", value: String(meses) },
  ];

  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>(
    () => Object.fromEntries(dadosItems.map((d) => [d.key, true]))
  );

  const toggleItem = (key: string) => {
    setCheckedItems((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-2xl mx-auto font-[Calibri,sans-serif]">
      {/* Cabeçalho */}
      <div className="text-center border-b-2 border-foreground/30 pb-6">
        <Logo size="md" className="mx-auto mb-3" />
        <h1 className="text-lg font-bold text-foreground uppercase tracking-widest">
          Memorial de Cálculo Detalhado
        </h1>
      </div>

      {/* 1. Dados do Caso */}
      <section>
        <h2 className="text-sm font-bold text-foreground uppercase tracking-wide border-b border-foreground/20 pb-2 mb-4">
          1. Dados do Caso
        </h2>
        <div className="grid grid-cols-1 gap-y-1.5">
          {dadosItems.map((item) => (
            <DadoLinha
              key={item.key}
              label={item.label}
              value={item.value}
              checked={checkedItems[item.key] ?? true}
              onToggle={() => toggleItem(item.key)}
            />
          ))}
        </div>
      </section>

      {/* 2. Cálculo de Indenização */}
      <section>
        <h2 className="text-sm font-bold text-foreground uppercase tracking-wide border-b border-foreground/20 pb-2 mb-4">
          2. Cálculo de Indenização
        </h2>

        <LinhaVerba
          titulo="Salários do período"
          valor={t1.salarios}
          formula={`${fmt(sal)} × ${meses} meses = ${fmt(t1.salarios)}`}
        />
        <LinhaVerba
          titulo="13º proporcional"
          valor={t1.decimoTerceiro}
          formula={`(${fmt(sal)} ÷ 12) × ${meses} = ${fmt(t1.decimoTerceiro)}`}
        />
        <LinhaVerba
          titulo="Férias + 1/3"
          valor={t1.feriasComTerco}
          formula={`(${fmt(sal)} ÷ 12) × ${meses} = ${fmt(feriasProporcionais)} + 1/3 (${fmt(tercoFerias)}) = ${fmt(t1.feriasComTerco)}`}
        />
        <LinhaVerba
          titulo={`FGTS (${aliquotaLabel})`}
          valor={t1.fgts}
          formula={`(${fmt(t1.salarios)} + ${fmt(t1.decimoTerceiro)} + ${fmt(t1.feriasComTerco)}) × ${aliquotaLabel} = ${fmt(t1.fgts)}`}
        />

        <SubtotalLinha titulo="Subtotal Indenização" valor={t1.total} />
      </section>

      {/* Período trabalhado sem registro */}
      {vin && (
        <section>
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wide border-b border-foreground/20 pb-2 mb-4">
            {nVinculo}. Período Trabalhado sem Registro
          </h2>

          <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
            De {formatDateBR(vin.inicio)} a {formatDateBR(vin.fim)} — {vin.meses} meses de serviço, ao salário de {fmt(vin.salario)}
            {(vin.salarioBase ?? vin.salario) > vin.salario ? `, com as verbas calculadas sobre o piso de ${fmt(vin.salarioBase!)}` : ""}.
            Cada verba é apurada pelo devido e abatida do que foi pago.
            {vin.salariosPresumidosPagos ?
            " Os salários foram pagos mês a mês e por isso não são cobrados de novo; o FGTS incide sobre eles, porque nunca foi depositado." :
            ""}
          </p>

          {(vin.decimoPorAno ?? []).length > 0 &&
          <div className="mb-4">
              <p className="text-xs font-semibold text-foreground mb-1.5">
                13º por ano — 1/12 por mês com 15 dias ou mais de trabalho (Lei 4.090/62)
              </p>
              {vin.decimoPorAno!.map((d) =>
            <p key={d.ano} className="text-xs text-muted-foreground font-mono">
                  {d.ano}: ({fmt(vin.salarioBase ?? vin.salario)} ÷ 12) × {d.meses} = {fmt(d.valor)}
                  {d.prescrito ? " — prescrito" : ""}
                </p>
            )}
            </div>
          }

          {(vin.periodosFerias ?? []).length > 0 &&
          <div className="mb-4">
              <p className="text-xs font-semibold text-foreground mb-1.5">
                Férias + 1/3 por período aquisitivo
              </p>
              {vin.periodosFerias!.map((p) =>
            <p key={p.inicio.toString()} className="text-xs text-muted-foreground font-mono">
                  {formatDateBR(p.inicio)} a {formatDateBR(p.fim)}: {p.completo ? "completo" : `${p.meses}/12`} = {fmt(p.valorSimples)}
                  {p.dobro ? ` × 2 = ${fmt(p.valor)} (prazo de concessão vencido, CLT 137)` : ""}
                  {p.prescrito ? " — prescrito" : ""}
                </p>
            )}
            </div>
          }

          {(vin.mesesPrescritos ?? 0) > 0 &&
          <p className="text-xs text-muted-foreground mb-4">
              {vin.mesesPrescritos} {vin.mesesPrescritos === 1 ? "mês ficou" : "meses ficaram"} fora dos salários e do FGTS pela prescrição de cinco anos.
            </p>
          }

          {[
          { titulo: "Salários", v: vin.salarios },
          { titulo: "13º", v: vin.decimoTerceiro },
          { titulo: "Férias + 1/3", v: vin.feriasComTerco },
          { titulo: `FGTS não depositado (${aliquotaLabel})`, v: vin.fgts }].
          map((linha) => (
            <LinhaVerba
              key={linha.titulo}
              titulo={linha.titulo}
              valor={linha.v.diferenca}
              formula={`devido ${fmt(linha.v.devido)} − pago ${fmt(linha.v.recebido)} = ${fmt(linha.v.diferenca)}`}
            />
          ))}

          {vin.outrosRecebidos > 0 && (
            <LinhaVerba
              titulo="Outros valores recebidos"
              valor={-vin.outrosRecebidos}
              formula={vin.outrosDescricao ? `Abatimento — ${vin.outrosDescricao}` : "Abatimento de valores pagos"}
            />
          )}

          <SubtotalLinha titulo="Subtotal do Período sem Registro" valor={vin.total} />

          {vin.excedente > 0 && (
            <p className="text-xs text-muted-foreground mt-3">
              Os valores informados como pagos superam o devido em {fmt(vin.excedente)}; o subtotal não é reduzido abaixo de zero.
            </p>
          )}
        </section>
      )}

      {/* Cálculo das verbas rescisórias */}
      {t2 && (
        <section>
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wide border-b border-foreground/20 pb-2 mb-4">
            {nRescisorias}. Cálculo das Verbas Rescisórias
          </h2>

          <LinhaVerba
            titulo="Aviso prévio"
            valor={t2.avisoProvio}
            formula={`${t2.avisoDias ?? 30} dias × (${fmt(sal)} ÷ 30) = ${fmt(t2.avisoProvio)} — Lei 12.506/2011`}
          />
          <LinhaVerba
            titulo="13º sobre aviso"
            valor={t2.decimoTerceiroAviso}
            formula={`${fmt(t2.avisoProvio)} ÷ 12 = ${fmt(t2.decimoTerceiroAviso)}`}
          />
          <LinhaVerba
            titulo="Férias + 1/3 sobre aviso"
            valor={t2.feriasComTercoAviso}
            formula={`(${fmt(t2.decimoTerceiroAviso)} ÷ 3) + ${fmt(t2.decimoTerceiroAviso)} = ${fmt(t2.feriasComTercoAviso)}`}
          />
          <LinhaVerba
            titulo="Multa art. 477"
            valor={t2.multa477}
            formula={`${fmt(sal)} (1 salário)`}
          />

          {t2.jaRecebido > 0 && (
            <LinhaVerba
              titulo="Já recebido na saída"
              valor={-t2.jaRecebido}
              formula="Abatimento do aviso e demais verbas pagas na rescisão"
            />
          )}

          <SubtotalLinha titulo="Subtotal Verbas Rescisórias" valor={t2.total} />
        </section>
      )}

      {/* 4. Multa de 40% do FGTS */}
      {mf && (
        <section>
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wide border-b border-foreground/20 pb-2 mb-4">
            {nMulta}. Multa de 40% do FGTS
          </h2>

          <LinhaVerba
            titulo="FGTS sobre verbas indenizatórias"
            valor={mf.fgtsRescisorio}
            formula={`Valor apurado no item 2: ${fmt(mf.fgtsRescisorio)}`}
          />
          {input.admissao &&
          <LinhaVerba
            titulo="FGTS estimado do contrato registrado"
            valor={mf.fgtsPeriodoContrato}
            formula={
            mf.incluiPeriodoContrato === false ?
            `${mf.mesesTrabalhados} meses de contrato fora da base — a multa de 40% sobre esse período já foi paga na rescisão` :
            `${mf.mesesTrabalhados} meses × ${fmt(input.salario)} × ${aliquotaLabel} = ${fmt(mf.fgtsPeriodoContrato)}`
            } />

          }
          {mf.fgtsPeriodoVinculo > 0 && (
            <LinhaVerba
              titulo="FGTS devido no período sem registro"
              valor={mf.fgtsPeriodoVinculo}
              formula={`Apurado no item ${nVinculo}: ${fmt(mf.fgtsPeriodoVinculo)}`}
            />
          )}
          <div className="py-3 border-b border-border/60">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-medium text-foreground">Base total do FGTS</span>
              <span className="text-sm font-semibold text-foreground tabular-nums">{fmt(mf.baseTotalFgts)}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1 font-mono">
              Cálculo: {[
              mf.fgtsRescisorio,
              ...(input.admissao ? [mf.fgtsPeriodoContrato] : []),
              ...(mf.fgtsPeriodoVinculo > 0 ? [mf.fgtsPeriodoVinculo] : [])].
              map(fmt).join(" + ")} = {fmt(mf.baseTotalFgts)}
            </p>
          </div>
          <SubtotalLinha titulo="Multa de 40% do FGTS" valor={mf.multa40} />

          <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
            {semRegistro ?
            "Reconhecido o vínculo e a nulidade da saída, o contrato se projeta até o fim da estabilidade, quando ocorre a dispensa sem justa causa. Como o FGTS nunca foi depositado e nenhuma multa foi paga, a base alcança o FGTS de todo o período trabalhado somado ao do período de estabilidade." :
            mf.incluiPeriodoContrato === false ?
            "Reconhecida a nulidade da dispensa, o contrato se projeta até o fim da estabilidade, quando ocorre a dispensa sem justa causa. A multa de 40% sobre o FGTS do período trabalhado já foi quitada na rescisão, de modo que aqui se apura apenas a incidente sobre o FGTS do período de estabilidade." :
            "Reconhecida a nulidade do ato, o contrato se projeta até o fim da estabilidade, quando ocorre a dispensa sem justa causa. Como nenhuma multa de 40% foi paga à época da saída, a base alcança o FGTS de todo o contrato somado ao do período de estabilidade."}
          </p>
        </section>
      )}

      {/* Pedidos adicionais */}
      {op &&
      <section>
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wide border-b border-foreground/20 pb-2 mb-4">
            {nOpcionais}. Pedidos Adicionais
          </h2>
          {op.multa467 > 0 && t2 &&
        <LinhaVerba
          titulo="Multa do art. 467 da CLT"
          valor={op.multa467}
          formula={`50% × (${fmt(t2.avisoProvio)} + ${fmt(t2.decimoTerceiroAviso)} + ${fmt(t2.feriasComTercoAviso)}${t2.jaRecebido > 0 ? ` − ${fmt(t2.jaRecebido)}` : ""}) = ${fmt(op.multa467)}`} />

        }
          {op.seguroDesemprego > 0 &&
        <LinhaVerba
          titulo="Seguro-desemprego"
          valor={op.seguroDesemprego}
          formula="Indenização substitutiva pelas parcelas não recebidas (Súm. 389, II, TST)" />

        }
          {op.outros > 0 &&
        <LinhaVerba
          titulo={op.outrosDescricao || "Outros pedidos"}
          valor={op.outros}
          formula="Valor arbitrado" />

        }
          <SubtotalLinha titulo="Subtotal dos Pedidos Adicionais" valor={op.total} />
        </section>
      }

      {/* Pedidos sem valor */}
      {pedidos.length > 0 &&
      <section>
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wide border-b border-foreground/20 pb-2 mb-4">
            {nPedidos}. Pedidos sem Valor
          </h2>
          <ul className="space-y-2 text-sm text-foreground list-disc pl-5">
            {pedidos.map((p) => <li key={p}>{p}</li>)}
          </ul>
        </section>
      }

      {/* Prescrição */}
      {alertas.length > 0 &&
      <section className="rounded-lg border-2 border-destructive/40 p-4 space-y-2">
          <p className="text-sm font-bold text-destructive uppercase tracking-wide">Atenção — prescrição</p>
          {alertas.map((a) =>
        <p key={a.tipo} className="text-xs text-foreground leading-relaxed">{a.mensagem}</p>
        )}
        </section>
      }

      {pisoAplicado && tipoRegistro !== "sem_registro" &&
      <p className="text-xs text-muted-foreground">
          As diferenças salariais do período registrado em carteira não são apuradas por esta calculadora.
        </p>
      }

      {/* Total Geral */}
      <section className="border-t-2 border-foreground/30 pt-6">
        <div className="flex items-baseline justify-between">
          <span className="text-base font-bold text-foreground uppercase tracking-wide">Total Geral da Indenização</span>
          <span className="text-2xl font-bold text-foreground tabular-nums">{fmt(result.totalFinal)}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-2 font-mono">
          Composição: Indenização ({fmt(t1.total)}){vin ? ` + Período sem Registro (${fmt(vin.total)})` : ""}{t2 ? ` + Verbas Rescisórias (${fmt(t2.total)})` : ""}{mf ? ` + Multa 40% FGTS (${fmt(mf.multa40)})` : ""}{op ? ` + Pedidos Adicionais (${fmt(op.total)})` : ""} = {fmt(result.totalFinal)}
        </p>
      </section>

      {/* Rodapé */}
      <div className="text-center border-t border-foreground/20 pt-6 space-y-1">
        <p className="text-xs font-semibold text-foreground">Elaborado por Dr. Augusto Tomazzoni Lubenow</p>
        <p className="text-xs text-muted-foreground">OAB 133519</p>
      </div>

      {/* Action buttons */}
      <div className="print:hidden space-y-3 pt-4">
        <Button onClick={handlePrint} className="w-full gap-2">
          <Printer className="w-4 h-4" />
          Imprimir memorial
        </Button>
        <Button onClick={onClose} variant="outline" className="w-full gap-2">
          <X className="w-4 h-4" />
          Fechar memorial de cálculo
        </Button>
      </div>
    </div>
  );
};

export default MemoriaCalculoDetalhada;
