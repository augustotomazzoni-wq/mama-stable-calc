import { CalcInput, CalcResult } from "@/lib/calculator";
import { formatBRL, formatDateBR } from "@/lib/dateUtils";
import { exportCalculoGestante } from "@/lib/exportCalculoGestante";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, RotateCcw, Calendar, DollarSign, FileText, Scale, Shield, ArrowLeft, Home, Printer, Download, BookOpen, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { Baby } from "lucide-react";
import Logo from "@/components/Logo";

interface ResultCardProps {
  input: CalcInput;
  result: CalcResult;
  onReset: () => void;
  onBack: () => void;
  onOpenMemoria: () => void;
  onOpenConcepcao: () => void;
  onOpenResumo: () => void;
}

const ResultCard = ({ input, result, onReset, onBack, onOpenMemoria, onOpenConcepcao, onOpenResumo }: ResultCardProps) => {
  const t1 = result.tabela1;
  const t2 = result.tabela2;
  const mf = result.multaFgts;
  const aliquotaFgts = input.empregadaDomestica ? "11,2%" : "8%";

  let resumo = `Cliente: ${input.nome}
${input.nascimento ? `Nascimento: ${formatDateBR(input.nascimento)}\n` : ""}Salário: ${formatBRL(input.salario)}
Demissão: ${formatDateBR(input.demissao)}
Concepção: ${formatDateBR(input.concepcao)}
Previsão do parto: ${formatDateBR(result.previsaoParto)}
Estabilidade até: ${formatDateBR(result.fimEstabilidade)}
Período de estabilidade: ${result.mesesEstabilidade} meses
Tipo de rescisão: ${result.tipoRescisao}

Cálculo de Indenização:
- Salários: ${formatBRL(t1.salarios)}
- 13º: ${formatBRL(t1.decimoTerceiro)}
- Férias + 1/3: ${formatBRL(t1.feriasComTerco)}
- FGTS (${aliquotaFgts}): ${formatBRL(t1.fgts)}
Subtotal Indenização: ${formatBRL(t1.total)}`;

  if (t2) {
    resumo += `

Cálculo das verbas rescisórias:
- Aviso prévio: ${formatBRL(t2.avisoProvio)}
- 13º sobre aviso: ${formatBRL(t2.decimoTerceiroAviso)}
- Férias + 1/3 sobre aviso: ${formatBRL(t2.feriasComTercoAviso)}
- Multa art. 477: ${formatBRL(t2.multa477)}
Subtotal Verbas Rescisórias: ${formatBRL(t2.total)}`;
  }

  if (mf) {
    resumo += `

Multa 40% FGTS:
- FGTS sobre indenização: ${formatBRL(mf.fgtsRescisorio)}
- FGTS estimado do contrato: ${formatBRL(mf.fgtsPeriodoContrato)}
- Base total: ${formatBRL(mf.baseTotalFgts)}
- Multa 40%: ${formatBRL(mf.multa40)}`;
  }

  resumo += `

TOTAL FINAL: ${formatBRL(result.totalFinal)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(resumo).then(() => {
      toast.success("Resumo copiado para a área de transferência!");
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero result */}
      <Card className="border-2 border-primary/30 bg-accent/30">
        <CardContent className="pt-6 text-center space-y-2">
          <Logo size="md" className="mx-auto mb-2" />
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Resultado da Simulação</p>
          <h2 className="text-2xl font-display font-bold text-foreground">{input.nome}</h2>
          {input.nascimento && (
            <p className="text-sm text-muted-foreground">Nascimento: {formatDateBR(input.nascimento)}</p>
          )}
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
            <span className="text-muted-foreground">Tipo de vínculo</span>
            <span className="font-medium flex items-center gap-1">
              {input.empregadaDomestica && <Home className="w-3 h-3" />}
              {input.empregadaDomestica ? "Empregada doméstica" : "CLT geral"}
            </span>
            {input.admissao && (
              <>
                <span className="text-muted-foreground">Data de admissão</span>
                <span className="font-medium">{formatDateBR(input.admissao)}</span>
              </>
            )}
            <span className="text-muted-foreground">Data de demissão</span>
            <span className="font-medium">{formatDateBR(input.demissao)}</span>
            <span className="text-muted-foreground">Data de concepção</span>
            <span className="font-medium">{formatDateBR(input.concepcao)}</span>
            <span className="text-muted-foreground">Pediu a conta?</span>
            <span className="font-medium">{input.pediuAConta ? "Sim" : "Não"}</span>
            {input.calcularMultaFgts && (
              <>
                <span className="text-muted-foreground">Multa 40% FGTS</span>
                <span className="font-medium">Ativada</span>
              </>
            )}
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
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Cálculo de Indenização */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-primary" />
            Cálculo de Indenização
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
                  <td className="py-2.5 px-4">FGTS ({aliquotaFgts})</td>
                  <td className="py-2.5 px-4 text-right font-medium">{formatBRL(t1.fgts)}</td>
                </tr>
                <tr className="border-t bg-primary/5">
                  <td className="py-3 px-4 font-bold">Subtotal Indenização</td>
                  <td className="py-3 px-4 text-right font-bold text-primary text-lg">{formatBRL(t1.total)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Cálculo das verbas rescisórias */}
      {t2 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Scale className="w-4 h-4 text-primary" />
              Cálculo das verbas rescisórias
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
                  <tr className="border-t bg-primary/5">
                    <td className="py-3 px-4 font-bold">Subtotal Verbas Rescisórias</td>
                    <td className="py-3 px-4 text-right font-bold text-primary text-lg">{formatBRL(t2.total)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Multa FGTS 40% */}
      {mf && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              Multa de 40% do FGTS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg overflow-hidden border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted">
                    <th className="text-left py-2.5 px-4 font-semibold">Componente</th>
                    <th className="text-right py-2.5 px-4 font-semibold">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t">
                    <td className="py-2.5 px-4">FGTS sobre verbas indenizatórias</td>
                    <td className="py-2.5 px-4 text-right font-medium">{formatBRL(mf.fgtsRescisorio)}</td>
                  </tr>
                  <tr className="border-t">
                    <td className="py-2.5 px-4">FGTS estimado do contrato ({mf.mesesTrabalhados} meses)</td>
                    <td className="py-2.5 px-4 text-right font-medium">{formatBRL(mf.fgtsPeriodoContrato)}</td>
                  </tr>
                  <tr className="border-t">
                    <td className="py-2.5 px-4 font-medium">Base total do FGTS</td>
                    <td className="py-2.5 px-4 text-right font-medium">{formatBRL(mf.baseTotalFgts)}</td>
                  </tr>
                  <tr className="border-t bg-primary/5">
                    <td className="py-3 px-4 font-bold">Multa de 40%</td>
                    <td className="py-3 px-4 text-right font-bold text-primary text-lg">{formatBRL(mf.multa40)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Total geral */}
      <Card className="border-2 border-primary/30 bg-primary/10">
        <CardContent className="py-4 text-center">
          <p className="text-sm font-medium text-muted-foreground">TOTAL GERAL</p>
          <p className="text-3xl font-bold text-primary font-display mt-1">{formatBRL(result.totalFinal)}</p>
        </CardContent>
      </Card>

      {/* Print footer */}
      <div className="hidden print:block mt-8 pt-4 border-t-2 border-primary/30 text-center">
        <Logo size="md" className="mx-auto mb-2" />
        <p className="text-sm font-semibold text-foreground">Tabela elaborada por Dr. Augusto Tomazzoni Lubenow</p>
        <p className="text-sm text-muted-foreground">OAB 133519</p>
      </div>

      {/* Actions */}
      <div className="pt-2 print:hidden space-y-3">
        <Button onClick={onOpenMemoria} className="w-full gap-2">
          <BookOpen className="w-4 h-4" />
          Gerar memorial de cálculo detalhado
        </Button>
        <Button onClick={onOpenResumo} variant="outline" className="w-full gap-2">
          <ClipboardList className="w-4 h-4" />
          Gerar resumo de cálculos
        </Button>
      </div>

      {input.concepcaoInfo && (
        <div className="pt-0 print:hidden">
          <Button onClick={onOpenConcepcao} className="w-full gap-2">
            <Baby className="w-4 h-4" />
            Visualizar cálculo da concepção
          </Button>
        </div>
      )}

      <div className="pt-0 print:hidden">
        <Button
          onClick={() => {
            exportCalculoGestante(input, result);
            toast.success("Planilha Excel gerada com sucesso!");
          }}
          variant="secondary"
          className="w-full gap-2"
        >
          <Download className="w-4 h-4" />
          Gerar planilha completa do cálculo (.xlsx)
        </Button>
      </div>

      <div className="flex gap-3 print:hidden">
        <Button onClick={handleCopy} className="flex-1 gap-2">
          <Copy className="w-4 h-4" />
          Copiar resumo
        </Button>
        <Button onClick={handlePrint} variant="outline" className="flex-1 gap-2">
          <Printer className="w-4 h-4" />
          Imprimir
        </Button>
      </div>
      <div className="flex gap-3 print:hidden">
        <Button onClick={onReset} variant="outline" className="flex-1 gap-2">
          <RotateCcw className="w-4 h-4" />
          Nova simulação
        </Button>
        <Button variant="ghost" onClick={onBack} className="flex-1 gap-2">
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Button>
      </div>
    </div>
  );
};

export default ResultCard;
