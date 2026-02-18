import { CalcInput, CalcResult } from "@/lib/calculator";
import { formatBRL, formatDateBR } from "@/lib/dateUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, RotateCcw, Calendar, DollarSign, FileText, Scale } from "lucide-react";
import { toast } from "sonner";

interface ResultCardProps {
  input: CalcInput;
  result: CalcResult;
  onReset: () => void;
}

const ResultCard = ({ input, result, onReset }: ResultCardProps) => {
  const t1 = result.tabela1;
  const t2 = result.tabela2;

  let resumo = `Cliente: ${input.nome}
Nascimento: ${formatDateBR(input.nascimento)}
Salário: ${formatBRL(input.salario)}
Demissão: ${formatDateBR(input.demissao)}
Concepção: ${formatDateBR(input.concepcao)}
Previsão do parto: ${formatDateBR(result.previsaoParto)}
Estabilidade até: ${formatDateBR(result.fimEstabilidade)}
Período de estabilidade: ${result.mesesEstabilidade} meses (${result.mesesManual ? "Manual" : "Automático"})
Tipo de rescisão: ${result.tipoRescisao}

Tabela 1 — Estabilidade:
- Salários: ${formatBRL(t1.salarios)}
- 13º: ${formatBRL(t1.decimoTerceiro)}
- Férias + 1/3: ${formatBRL(t1.feriasComTerco)}
- FGTS (8%): ${formatBRL(t1.fgts)}
Subtotal Tabela 1: ${formatBRL(t1.total)}`;

  if (t2) {
    resumo += `

Tabela 2 — Aviso + Multas:
- Aviso prévio: ${formatBRL(t2.avisoProvio)}
- 13º sobre aviso: ${formatBRL(t2.decimoTerceiroAviso)}
- Férias + 1/3 sobre aviso: ${formatBRL(t2.feriasComTercoAviso)}
- Multa art. 477: ${formatBRL(t2.multa477)}
- Multa 40% FGTS: ${formatBRL(t2.multa40Fgts)}
Subtotal Tabela 2: ${formatBRL(t2.total)}`;
  }

  resumo += `

TOTAL FINAL: ${formatBRL(result.totalFinal)}`;

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
          <p className="text-xs text-muted-foreground">{result.tipoRescisao}</p>
          <div className="pt-4">
            <p className="text-sm font-medium text-muted-foreground">Total da Indenização</p>
            <p className="text-4xl font-bold text-primary font-display mt-1">{formatBRL(result.totalFinal)}</p>
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
            <span className="text-muted-foreground">Pediu a conta?</span>
            <span className="font-medium">{input.pediuAConta ? "Sim" : "Não"}</span>
            <span className="text-muted-foreground">Reconhecer estabilidade?</span>
            <span className="font-medium">{input.reconhecerEstabilidade ? "Sim" : "Não"}</span>
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
            <span className="font-medium">
              {result.mesesEstabilidade} meses
              <span className="text-xs text-muted-foreground ml-1">
                ({result.mesesManual ? "Manual" : "Automático"})
              </span>
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Tabela 1 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-primary" />
            Tabela 1 — Estabilidade
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
                  <td className="py-2.5 px-4 text-right font-medium">{formatBRL(t1.salarios)}</td>
                </tr>
                <tr className="border-t">
                  <td className="py-2.5 px-4">13º proporcional</td>
                  <td className="py-2.5 px-4 text-right font-medium">{formatBRL(t1.decimoTerceiro)}</td>
                </tr>
                <tr className="border-t">
                  <td className="py-2.5 px-4">Férias + 1/3</td>
                  <td className="py-2.5 px-4 text-right font-medium">{formatBRL(t1.feriasComTerco)}</td>
                </tr>
                <tr className="border-t">
                  <td className="py-2.5 px-4">FGTS (8%)</td>
                  <td className="py-2.5 px-4 text-right font-medium">{formatBRL(t1.fgts)}</td>
                </tr>
                <tr className="border-t bg-primary/5">
                  <td className="py-3 px-4 font-bold">Subtotal Tabela 1</td>
                  <td className="py-3 px-4 text-right font-bold text-primary text-lg">{formatBRL(t1.total)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Tabela 2 — only if pediu a conta */}
      {t2 ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Scale className="w-4 h-4 text-primary" />
              Tabela 2 — Aviso + Multas
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
                    <td className="py-2.5 px-4">Aviso prévio</td>
                    <td className="py-2.5 px-4 text-right font-medium">{formatBRL(t2.avisoProvio)}</td>
                  </tr>
                  <tr className="border-t">
                    <td className="py-2.5 px-4">13º sobre aviso</td>
                    <td className="py-2.5 px-4 text-right font-medium">{formatBRL(t2.decimoTerceiroAviso)}</td>
                  </tr>
                  <tr className="border-t">
                    <td className="py-2.5 px-4">Férias + 1/3 sobre aviso</td>
                    <td className="py-2.5 px-4 text-right font-medium">{formatBRL(t2.feriasComTercoAviso)}</td>
                  </tr>
                  <tr className="border-t">
                    <td className="py-2.5 px-4">Multa art. 477</td>
                    <td className="py-2.5 px-4 text-right font-medium">{formatBRL(t2.multa477)}</td>
                  </tr>
                  <tr className="border-t">
                    <td className="py-2.5 px-4">Multa 40% FGTS</td>
                    <td className="py-2.5 px-4 text-right font-medium">{formatBRL(t2.multa40Fgts)}</td>
                  </tr>
                  <tr className="border-t bg-primary/5">
                    <td className="py-3 px-4 font-bold">Subtotal Tabela 2</td>
                    <td className="py-3 px-4 text-right font-bold text-primary text-lg">{formatBRL(t2.total)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {result.pediuAConta && result.reconhecerEstabilidade && (
              <div className="mt-4 rounded-lg bg-primary/10 border-2 border-primary/30 p-4 text-center">
                <p className="text-sm font-medium text-muted-foreground">TOTAL GERAL (Tabela 1 + Tabela 2)</p>
                <p className="text-3xl font-bold text-primary font-display mt-1">{formatBRL(result.totalFinal)}</p>
              </div>
            )}

            {result.pediuAConta && !result.reconhecerEstabilidade && (
              <p className="mt-3 text-xs text-muted-foreground text-center">
                Estabilidade não reconhecida — Tabela 2 exibida mas não somada ao total final.
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-4 text-center text-sm text-muted-foreground">
            Tabela 2 desativada — marque "Ela pediu a conta?" para habilitar.
          </CardContent>
        </Card>
      )}

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
