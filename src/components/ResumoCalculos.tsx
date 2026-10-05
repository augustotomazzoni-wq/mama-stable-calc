import { CalcInput, CalcResult } from "@/lib/calculator";
import { formatBRL } from "@/lib/dateUtils";
import { valorPorExtenso } from "@/lib/valorPorExtenso";
import { Button } from "@/components/ui/button";
import { X, Printer } from "lucide-react";
import Logo from "@/components/Logo";

interface Props {
  input: CalcInput;
  result: CalcResult;
  onClose: () => void;
}

const LinhaResumo = ({ titulo, valor }: { titulo: string; valor: number }) => (
  <div className="py-4 border-b border-foreground/10">
    <p className="text-sm font-bold text-foreground uppercase tracking-wide mb-1">{titulo}</p>
    <p className="text-sm text-foreground">
      <span className="font-semibold tabular-nums">{formatBRL(valor)}</span>
      <span className="text-muted-foreground"> — {valorPorExtenso(valor)}</span>
    </p>
  </div>
);

const ResumoCalculos = ({ input, result, onClose }: Props) => {
  const t1 = result.tabela1;
  const t2 = result.tabela2;
  const mf = result.multaFgts;
  const vin = result.vinculo;
  const op = result.opcionais ?? null;

  // 1. Cálculo de Indenização = subtotal da tabela 1
  const indenizacao = t1.total;

  // 2. Diferenças do período sem registro, já abatido o que foi pago
  const periodoSemRegistro = vin ? vin.total : 0;

  // 3. Verbas rescisórias e multa do art. 477, em linhas separadas.
  //
  //    O subtotal da tabela 2 é fatiado pelas diferenças que ela mesma apurou,
  //    verba a verba — e não recalculado aqui. Era a conta refeita por fora
  //    que fazia o Resumo divergir: ela somava os valores devidos do aviso e
  //    descontava o total recebido, deixando de fora o FGTS sobre o aviso
  //    (Súmula 305) e a devolução do aviso descontado, rubricas que a tabela 2
  //    ganhou depois.
  //
  //    O abatimento geral de "outros valores recebidos" não pertence a nenhuma
  //    verba: come primeiro as rescisórias e, se sobrar, a multa. É o que
  //    mantém a soma das duas linhas igual ao subtotal do Memorial.
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

  const verbasRescisorias = Math.max(0, rescisoriasBrutas - outrosAbatidos);
  const sobraDoAbatimento = Math.max(0, outrosAbatidos - rescisoriasBrutas);
  const multa477 = Math.max(0, multa477Bruta - sobraDoAbatimento);

  // A multa de 40% do FGTS tem seção própria no Memorial — aqui também.
  const multaFgts = mf ? mf.multa40 : 0;

  // Seguro-desemprego e dano moral, quando pedidos.
  const pedidosAdicionais = op ? op.total : 0;

  // 4. Valor Total
  const valorTotal =
    indenizacao + periodoSemRegistro + verbasRescisorias + multa477 + multaFgts + pedidosAdicionais;

  // 5. Honorários de Sucumbência (15%)
  const honorarios = valorTotal * 0.15;

  // 6. Total do cálculo de todas as verbas rescisórias
  const totalVerbasRescisoriasObs = verbasRescisorias + multa477 + multaFgts;

  // 7. Valor da Ação = Valor Total + Honorários
  const valorDaAcao = valorTotal + honorarios;

  const handlePrint = () => window.print();

  return (
    <div className="space-y-8 animate-fade-in max-w-2xl mx-auto font-[Calibri,sans-serif]">
      {/* Cabeçalho */}
      <div className="text-center border-b-2 border-foreground/30 pb-6">
        <Logo size="md" className="mx-auto mb-3" />
        <h1 className="text-lg font-bold text-foreground uppercase tracking-widest">
          Resumo de Cálculos
        </h1>
        <p className="text-xs text-muted-foreground mt-2">{input.nome}</p>
      </div>

      {/* Campos */}
      <section className="space-y-0">
        <LinhaResumo titulo="Cálculo de Indenização" valor={indenizacao} />

        {periodoSemRegistro > 0 && (
          <LinhaResumo titulo="Período sem Registro" valor={periodoSemRegistro} />
        )}

        {verbasRescisorias > 0 && (
          <LinhaResumo titulo="Cálculo das Verbas Rescisórias" valor={verbasRescisorias} />
        )}

        {multa477 > 0 && (
          <LinhaResumo titulo="Multa Art. 477" valor={multa477} />
        )}

        {multaFgts > 0 && (
          <LinhaResumo titulo="Multa de 40% do FGTS" valor={multaFgts} />
        )}

        {pedidosAdicionais > 0 && (
          <LinhaResumo titulo="Pedidos Adicionais" valor={pedidosAdicionais} />
        )}
      </section>

      {/* Valor Total */}
      <section className="border-t-2 border-foreground/30 pt-6">
        <div className="py-4">
          <p className="text-base font-bold text-foreground uppercase tracking-wide mb-1">Valor Total</p>
          <p className="text-lg text-foreground">
            <span className="font-bold tabular-nums">{formatBRL(valorTotal)}</span>
            <span className="text-muted-foreground text-sm"> — {valorPorExtenso(valorTotal)}</span>
          </p>
        </div>
      </section>

      {/* Honorários */}
      <section className="border-t border-foreground/10 pt-4">
        <div className="py-3">
          <p className="text-sm font-bold text-foreground uppercase tracking-wide mb-1">Honorários de Sucumbência (15%)</p>
          <p className="text-sm text-foreground">
            <span className="font-semibold tabular-nums">{formatBRL(honorarios)}</span>
            <span className="text-muted-foreground"> — {valorPorExtenso(honorarios)}</span>
          </p>
        </div>
      </section>

      {/* Total do cálculo de todas as verbas rescisórias */}
      {(verbasRescisorias > 0 || multa477 > 0 || multaFgts > 0) && (
        <section className="border-t-2 border-foreground/30 pt-6">
          <div className="py-4">
            <p className="text-base font-bold text-foreground uppercase tracking-wide mb-1">
              Total do cálculo de todas as verbas rescisórias
            </p>
            <p className="text-xs text-muted-foreground mb-2">
              Cálculo das Verbas Rescisórias ({formatBRL(verbasRescisorias)})
              {multa477 > 0 ? ` + Multa Art. 477 (${formatBRL(multa477)})` : ""}
              {multaFgts > 0 ? ` + Multa de 40% do FGTS (${formatBRL(multaFgts)})` : ""}
            </p>
            <p className="text-lg text-foreground">
              <span className="font-bold tabular-nums">{formatBRL(totalVerbasRescisoriasObs)}</span>
              <span className="text-muted-foreground text-sm"> — {valorPorExtenso(totalVerbasRescisoriasObs)}</span>
            </p>
          </div>
        </section>
      )}

      {/* Valor da Ação */}
      <section className="border-t-2 border-foreground/30 pt-6">
        <div className="py-4">
          <p className="text-base font-bold text-foreground uppercase tracking-wide mb-1">Valor da Ação</p>
          <p className="text-xs text-muted-foreground mb-2">
            Valor Total ({formatBRL(valorTotal)}) + Honorários de Sucumbência ({formatBRL(honorarios)})
          </p>
          <p className="text-lg text-foreground">
            <span className="font-bold tabular-nums">{formatBRL(valorDaAcao)}</span>
            <span className="text-muted-foreground text-sm"> — {valorPorExtenso(valorDaAcao)}</span>
          </p>
        </div>
      </section>

      {/* Rodapé */}
      <div className="text-center border-t border-foreground/20 pt-6 space-y-1">
        <p className="text-xs font-semibold text-foreground">Elaborado por Dr. Augusto Tomazzoni Lubenow</p>
        <p className="text-xs text-muted-foreground">OAB 133519</p>
      </div>

      {/* Ações */}
      <div className="print:hidden space-y-3 pt-4">
        <Button onClick={handlePrint} className="w-full gap-2">
          <Printer className="w-4 h-4" />
          Imprimir resumo
        </Button>
        <Button onClick={onClose} variant="outline" className="w-full gap-2">
          <X className="w-4 h-4" />
          Fechar resumo de cálculos
        </Button>
      </div>
    </div>
  );
};

export default ResumoCalculos;
