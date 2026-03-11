import { CalcInput } from "@/lib/calculator";
import { Button } from "@/components/ui/button";
import { X, Printer } from "lucide-react";
import ConcepcaoCalculo from "./ConcepcaoCalculo";

interface Props {
  input: CalcInput;
  onClose: () => void;
}

const ConcepcaoCalculoPage = ({ input, onClose }: Props) => {
  const handlePrint = () => {
    window.print();
  };

  if (!input.concepcaoInfo) return null;

  return (
    <div className="space-y-8 animate-fade-in max-w-2xl mx-auto font-[Calibri,sans-serif]">
      {/* Cabeçalho */}
      <div className="text-center border-b-2 border-foreground/30 pb-6">
        <h1 className="text-lg font-bold text-foreground uppercase tracking-widest">
          Cálculo da Concepção
        </h1>
      </div>

      {/* Conteúdo */}
      <ConcepcaoCalculo info={input.concepcaoInfo} />

      {/* Assinatura */}
      <div className="hidden print:block mt-8 pt-4 border-t-2 border-primary/30 text-center">
        <p className="text-sm font-semibold text-foreground">Tabela elaborada por Dr. Augusto Tomazzoni Lubenow</p>
        <p className="text-sm text-muted-foreground">OAB 133519</p>
      </div>

      {/* Ações */}
      <div className="flex gap-3 print:hidden">
        <Button onClick={handlePrint} variant="outline" className="flex-1 gap-2">
          <Printer className="w-4 h-4" />
          Imprimir
        </Button>
        <Button onClick={onClose} variant="ghost" className="flex-1 gap-2">
          <X className="w-4 h-4" />
          Fechar
        </Button>
      </div>
    </div>
  );
};

export default ConcepcaoCalculoPage;
