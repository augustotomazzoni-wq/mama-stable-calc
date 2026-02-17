import { CalcInput, CalcResult } from "@/lib/calculator";
import { formatBRL, formatDateBR } from "@/lib/dateUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, RotateCcw, Calendar, DollarSign, FileText } from "lucide-react";
import { toast } from "sonner";

interface ResultCardProps {
  input: CalcInput;
  result: CalcResult;
  onReset: () => void;
}

const ResultCard = ({ input, result, onReset }: ResultCardProps) => {
  const resumo = `Cliente: ${input.nome}
Nascimento: ${formatDateBR(input.nascimento)}
Salário: ${formatBRL(input.salario)}
Demissão: ${formatDateBR(input.demissao)}
Concepção: ${formatDateBR(input.concepcao)}
Previsão do parto: ${formatDateBR(result.previsaoParto)}
Estabilidade até: ${formatDateBR(result.fimEstabilidade)}
Período de estabilidade: ${result.mesesEstabilidade} meses

Indenização (estabilidade):
- Salários: ${formatBRL(result.salarios)}
- 13º: ${formatBRL(result.decimoTerceiro)}
- Férias + 1/3: ${formatBRL(result.feriasComTerco)}
- FGTS (8%): ${formatBRL(result.fgts)}
Total: ${formatBRL(result.total)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(resumo).then(() => {
      toast.success("Resumo copiado para a área de transferência!");
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero result */}
      <Card className="border-2 border-primary/30 bg-accent/30">
        <CardContent className="pt-6 text-center space-y-2">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Resultado da Simulação</p>
          <h2 className="text-2xl font-display font-bold text-foreground">{input.nome}</h2>
          <p className="text-sm text-muted-foreground">Nascimento: {formatDateBR(input.nascimento)}</p>
          <div className="pt-4">
            <p className="text-sm font-medium text-muted-foreground">Total da Indenização (Estabilidade)</p>
            <p className="text-4xl font-bold text-primary font-display mt-1">{formatBRL(result.total)}</p>
          </div>
        </CardContent>
      </Card>

      {/* Inputs summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            Dados Informados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <span className="text-muted-foreground">Salário mensal</span>
            <span className="font-medium">{formatBRL(input.salario)}</span>
            <span className="text-muted-foreground">Data de demissão</span>
            <span className="font-medium">{formatDateBR(input.demissao)}</span>
            <span className="text-muted-foreground">Data de concepção</span>
            <span className="font-medium">{formatDateBR(input.concepcao)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Calculated dates */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            Datas Calculadas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <span className="text-muted-foreground">Previsão do parto</span>
            <span className="font-medium">{formatDateBR(result.previsaoParto)}</span>
            <span className="text-muted-foreground">Estabilidade até</span>
            <span className="font-medium">{formatDateBR(result.fimEstabilidade)}</span>
            <span className="text-muted-foreground">Meses de estabilidade</span>
            <span className="font-medium">{result.mesesEstabilidade} meses</span>
          </div>
        </CardContent>
      </Card>

      {/* Calculation table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-primary" />
            Cálculo Detalhado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg overflow-hidden border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted">
                  <th className="text-left py-2.5 px-4 font-semibold">Verba</th>
                  <th className="text-right py-2.5 px-4 font-semibold">Valor</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t">
                  <td className="py-2.5 px-4">Salários ({result.mesesEstabilidade} meses)</td>
                  <td className="py-2.5 px-4 text-right font-medium">{formatBRL(result.salarios)}</td>
                </tr>
                <tr className="border-t">
                  <td className="py-2.5 px-4">13º proporcional</td>
                  <td className="py-2.5 px-4 text-right font-medium">{formatBRL(result.decimoTerceiro)}</td>
                </tr>
                <tr className="border-t">
                  <td className="py-2.5 px-4">Férias proporcionais + 1/3</td>
                  <td className="py-2.5 px-4 text-right font-medium">{formatBRL(result.feriasComTerco)}</td>
                </tr>
                <tr className="border-t">
                  <td className="py-2.5 px-4">FGTS (8%)</td>
                  <td className="py-2.5 px-4 text-right font-medium">{formatBRL(result.fgts)}</td>
                </tr>
                <tr className="border-t bg-primary/5">
                  <td className="py-3 px-4 font-bold">Total</td>
                  <td className="py-3 px-4 text-right font-bold text-primary text-lg">{formatBRL(result.total)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button onClick={handleCopy} className="flex-1 gap-2">
          <Copy className="w-4 h-4" />
          Copiar resumo
        </Button>
        <Button onClick={onReset} variant="outline" className="flex-1 gap-2">
          <RotateCcw className="w-4 h-4" />
          Nova simulação
        </Button>
      </div>
    </div>
  );
};

export default ResultCard;
