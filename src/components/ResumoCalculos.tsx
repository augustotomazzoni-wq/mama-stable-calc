import { CalcInput, CalcResult } from "@/lib/calculator";
import { formatBRL } from "@/lib/dateUtils";
import { valorPorExtenso } from "@/lib/valorPorExtenso";
import { Button } from "@/components/ui/button";
import { X, Printer } from "lucide-react";

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

  // 1. Cálculo de Indenização = subtotal da tabela 1
  const indenizacao = t1.total;

  // 2. Cálculo das Verbas Rescisórias = aviso + 13º aviso + férias aviso + multa 40%
  const verbasRescisorias = (t2 ? t2.avisoProvio + t2.decimoTerceiroAviso + t2.feriasComTercoAviso : 0) + (mf ? mf.multa40 : 0);

  // 3. Multa Art. 477
  const multa477 = t2 ? t2.multa477 : 0;

  // 4. Valor Total
  const valorTotal = indenizacao + verbasRescisorias + multa477;

  // 5. Honorários de Sucumbência (15%)
  const honorarios = valorTotal * 0.15;

  // 6. Valor Total da Ação = Valor Total + Honorários
  const valorTotalDaAcao = valorTotal + honorarios;

  // Observação: total das verbas rescisórias
  const totalVerbasRescisoriasObs = verbasRescisorias + multa477;

  const handlePrint = () => window.print();

  return (
    <div className="space-y-8 animate-fade-in max-w-2xl mx-auto font-[Calibri,sans-serif]">
      {/* Cabeçalho */}
      <div className="text-center border-b-2 border-foreground/30 pb-6">
        <h1 className="text-lg font-bold text-foreground uppercase tracking-widest">
          Resumo de Cálculos
        </h1>
        <p className="text-xs text-muted-foreground mt-2">{input.nome}</p>
      </div>

      {/* Campos */}
      <section className="space-y-0">
        <LinhaResumo titulo="Cálculo de Indenização" valor={indenizacao} />

        {(verbasRescisorias > 0) && (
          <LinhaResumo titulo="Cálculo das Verbas Rescisórias" valor={verbasRescisorias} />
        )}

        {multa477 > 0 && (
          <LinhaResumo titulo="Multa Art. 477" valor={multa477} />
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

      {/* Valor Total da Ação */}
      <section className="border-t-2 border-foreground/30 pt-6">
        <div className="py-4">
          <p className="text-base font-bold text-foreground uppercase tracking-wide mb-1">Valor Total da Ação</p>
          <p className="text-lg text-foreground">
            <span className="font-bold tabular-nums">{formatBRL(valorTotalDaAcao)}</span>
            <span className="text-muted-foreground text-sm"> — {valorPorExtenso(valorTotalDaAcao)}</span>
          </p>
        </div>
      </section>

      {/* Observação */}
      {(verbasRescisorias > 0 || multa477 > 0) && (
        <section className="border-t border-foreground/10 pt-6">
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wide border-b border-foreground/20 pb-2 mb-4">
            Observação
          </h2>
          <div className="bg-muted/30 rounded-lg p-4 space-y-2 text-sm text-foreground">
            <p className="font-medium">Total do cálculo de todas as verbas rescisórias:</p>
            <p className="text-muted-foreground">
              Cálculo das Verbas Rescisórias ({formatBRL(verbasRescisorias)}) + Multa Art. 477 ({formatBRL(multa477)})
            </p>
            <p className="font-semibold mt-2">
              = {formatBRL(totalVerbasRescisoriasObs)} — {valorPorExtenso(totalVerbasRescisoriasObs)}
            </p>
          </div>
        </section>
      )}

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
