import { CalcInput, CalcResult, TIPO_REGISTRO_LABEL } from "@/lib/calculator";
import { formatBRL, formatDateBR } from "@/lib/dateUtils";
import { exportCalculoGestante } from "@/lib/exportCalculoGestante";
import { pedidosSemValor, tipoRegistroDe, rotuloSalario, rotuloSaida } from "@/lib/pedidos";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Copy, RotateCcw, Calendar, DollarSign, FileText, Scale, Shield, ArrowLeft, Home, Printer, Download, BookOpen, ClipboardList, Briefcase, AlertTriangle, Gavel, ListChecks } from "lucide-react";
import { toast } from "sonner";
import { Baby } from "lucide-react";
import Logo from "@/components/Logo";
import { useNavigate } from "react-router-dom";

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
  const navigate = useNavigate();
  const t1 = result.tabela1;
  const t2 = result.tabela2;
  const mf = result.multaFgts;
  const vin = result.vinculo;
  const op = result.opcionais ?? null;
  const alertas = result.alertas ?? [];
  const tipoRegistro = tipoRegistroDe(input, result);
  const semRegistro = tipoRegistro === "sem_registro";
  const pedidos = pedidosSemValor(input, result);
  const salarioBase = result.salarioBase ?? input.salario;
  const pisoAplicado = salarioBase > input.salario;
  const periodosEmDobro = (vin?.periodosFerias ?? []).filter((p) => p.dobro && !p.prescrito).length;
  const aliquotaFgts = input.empregadaDomestica ? "11,2%" : "8%";

  let resumo = `Cliente: ${input.nome}
${input.nascimento ? `Nascimento: ${formatDateBR(input.nascimento)}\n` : ""}Registro: ${TIPO_REGISTRO_LABEL[tipoRegistro]}
${rotuloSalario(tipoRegistro)}: ${formatBRL(input.salario)}${pisoAplicado ? ` (verbas sobre o piso de ${formatBRL(salarioBase)})` : ""}
${vin ? `Período sem registro: ${formatDateBR(vin.inicio)} a ${formatDateBR(vin.fim)}\n` : ""}${rotuloSaida(tipoRegistro)}: ${formatDateBR(input.demissao)}
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

  if (vin) {
    resumo += `

Período sem registro (${vin.meses} meses) — devido / pago / diferença:
- Salários: ${formatBRL(vin.salarios.devido)} / ${formatBRL(vin.salarios.recebido)} / ${formatBRL(vin.salarios.diferenca)}
- 13º: ${formatBRL(vin.decimoTerceiro.devido)} / ${formatBRL(vin.decimoTerceiro.recebido)} / ${formatBRL(vin.decimoTerceiro.diferenca)}
- Férias + 1/3: ${formatBRL(vin.feriasComTerco.devido)} / ${formatBRL(vin.feriasComTerco.recebido)} / ${formatBRL(vin.feriasComTerco.diferenca)}
- FGTS: ${formatBRL(vin.fgts.devido)} / ${formatBRL(vin.fgts.recebido)} / ${formatBRL(vin.fgts.diferenca)}
Subtotal do período sem registro: ${formatBRL(vin.total)}`;
  }

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
${input.admissao ? `- FGTS estimado do contrato: ${formatBRL(mf.fgtsPeriodoContrato)}\n` : ""}${mf.fgtsPeriodoVinculo > 0 ? `- FGTS do período sem registro: ${formatBRL(mf.fgtsPeriodoVinculo)}\n` : ""}- Base total: ${formatBRL(mf.baseTotalFgts)}
- Multa 40%: ${formatBRL(mf.multa40)}`;
  }

  if (op) {
    resumo += `

Pedidos adicionais:${op.multa467 > 0 ? `\n- Multa art. 467: ${formatBRL(op.multa467)}` : ""}${op.seguroDesemprego > 0 ? `\n- Seguro-desemprego: ${formatBRL(op.seguroDesemprego)}` : ""}${op.outros > 0 ? `\n- ${op.outrosDescricao || "Outros pedidos"}: ${formatBRL(op.outros)}` : ""}`;
  }

  if (pedidos.length) {
    resumo += `

Pedidos sem valor:
${pedidos.map((p) => `- ${p}`).join("\n")}`;
  }

  if (alertas.length) {
    resumo += `

ATENÇÃO:
${alertas.map((a) => `- ${a.mensagem}`).join("\n")}`;
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
          <p className="text-xs text-muted-foreground">
            {result.tipoRescisao} · {TIPO_REGISTRO_LABEL[tipoRegistro]}
          </p>
          <div className="pt-4">
            <p className="text-sm font-medium text-muted-foreground">Total da Indenização</p>
            <p className="text-4xl font-bold text-primary font-display mt-1">{formatBRL(result.totalFinal)}</p>
          </div>
        </CardContent>
      </Card>

      {/* Prescrição */}
      {alertas.map((a) =>
      <Alert key={a.tipo} variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{a.mensagem}</AlertDescription>
        </Alert>
      )}

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
            <span className="text-muted-foreground">Registro</span>
            <span className="font-medium">{TIPO_REGISTRO_LABEL[tipoRegistro]}</span>
            <span className="text-muted-foreground">{rotuloSalario(tipoRegistro)}</span>
            <span className="font-medium">{formatBRL(input.salario)}</span>
            {pisoAplicado &&
            <>
                <span className="text-muted-foreground">Piso usado nas verbas</span>
                <span className="font-medium">{formatBRL(salarioBase)}</span>
              </>
            }
            {vin &&
            <>
                <span className="text-muted-foreground">Período sem registro</span>
                <span className="font-medium">{formatDateBR(vin.inicio)} a {formatDateBR(vin.fim)}</span>
              </>
            }
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
            <span className="text-muted-foreground">{rotuloSaida(tipoRegistro)}</span>
            <span className="font-medium">{formatDateBR(input.demissao)}</span>
            <span className="text-muted-foreground">Data de concepção</span>
            <span className="font-medium">{formatDateBR(input.concepcao)}</span>
            <span className="text-muted-foreground">Motivo da saída</span>
            <span className="font-medium">{result.tipoRescisao}</span>
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

      {/* Período sem registro */}
      {vin && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-primary" />
              {semRegistro ? "Período trabalhado sem registro" : "Período sem registro"} ({vin.meses} meses)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">
              {formatDateBR(vin.inicio)} a {formatDateBR(vin.fim)} · salário de {formatBRL(vin.salario)}
              {(vin.salarioBase ?? vin.salario) > vin.salario && ` · piso de ${formatBRL(vin.salarioBase!)}`}
            </p>
            <div className="rounded-lg overflow-hidden border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted">
                    <th className="text-left py-2.5 px-4 font-semibold">Verba</th>
                    <th className="text-right py-2.5 px-3 font-semibold">Devido</th>
                    <th className="text-right py-2.5 px-3 font-semibold">Pago</th>
                    <th className="text-right py-2.5 px-4 font-semibold">Diferença</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                  { nome: "Salários", v: vin.salarios },
                  { nome: "13º", v: vin.decimoTerceiro },
                  { nome: "Férias + 1/3", v: vin.feriasComTerco },
                  { nome: "FGTS não depositado", v: vin.fgts }].
                  map((linha) => (
                    <tr className="border-t" key={linha.nome}>
                      <td className="py-2.5 px-4">{linha.nome}</td>
                      <td className="py-2.5 px-3 text-right text-muted-foreground tabular-nums">{formatBRL(linha.v.devido)}</td>
                      <td className="py-2.5 px-3 text-right text-muted-foreground tabular-nums">{formatBRL(linha.v.recebido)}</td>
                      <td className="py-2.5 px-4 text-right font-medium tabular-nums">{formatBRL(linha.v.diferenca)}</td>
                    </tr>
                  ))}
                  {vin.outrosRecebidos > 0 && (
                    <tr className="border-t">
                      <td className="py-2.5 px-4" colSpan={3}>
                        Outros valores recebidos
                        {vin.outrosDescricao ? ` (${vin.outrosDescricao})` : ""}
                      </td>
                      <td className="py-2.5 px-4 text-right font-medium tabular-nums">− {formatBRL(vin.outrosRecebidos)}</td>
                    </tr>
                  )}
                  <tr className="border-t bg-primary/5">
                    <td className="py-3 px-4 font-bold" colSpan={3}>Subtotal do período sem registro</td>
                    <td className="py-3 px-4 text-right font-bold text-primary text-lg tabular-nums">{formatBRL(vin.total)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="space-y-1 mt-2">
              {vin.salariosPresumidosPagos &&
              <p className="text-xs text-muted-foreground">
                  Salários considerados pagos mês a mês; o FGTS continua incidindo sobre eles.
                </p>
              }
              {periodosEmDobro > 0 &&
              <p className="text-xs text-muted-foreground">
                  Férias: {periodosEmDobro} {periodosEmDobro === 1 ? "período vencido pago" : "períodos vencidos pagos"} em dobro (CLT 137).
                </p>
              }
              {vin.excedente > 0 &&
              <p className="text-xs text-muted-foreground">
                  Os valores informados como pagos superam o devido em {formatBRL(vin.excedente)}. O subtotal não fica negativo.
                </p>
              }
            </div>
          </CardContent>
        </Card>
      )}

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
                    <td className="py-2.5 px-4">
                      Aviso prévio
                      <span className="block text-xs text-muted-foreground mt-0.5">
                        {t2.avisoDias ?? 30} dias (Lei 12.506/2011)
                      </span>
                    </td>
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
                  {t2.jaRecebido > 0 && (
                    <tr className="border-t">
                      <td className="py-2.5 px-4">Já recebido na saída</td>
                      <td className="py-2.5 px-4 text-right font-medium">− {formatBRL(t2.jaRecebido)}</td>
                    </tr>
                  )}
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
                  {input.admissao &&
                  <tr className="border-t">
                      <td className="py-2.5 px-4">
                        FGTS estimado do contrato ({mf.mesesTrabalhados} meses)
                        {mf.incluiPeriodoContrato === false &&
                      <span className="block text-xs text-muted-foreground mt-0.5">
                            Fora da base: a multa sobre esse período já foi paga na rescisão.
                          </span>
                      }
                      </td>
                      <td className="py-2.5 px-4 text-right font-medium">{formatBRL(mf.fgtsPeriodoContrato)}</td>
                    </tr>
                  }
                  {mf.fgtsPeriodoVinculo > 0 && (
                    <tr className="border-t">
                      <td className="py-2.5 px-4">FGTS do período sem registro</td>
                      <td className="py-2.5 px-4 text-right font-medium">{formatBRL(mf.fgtsPeriodoVinculo)}</td>
                    </tr>
                  )}
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

      {/* Pedidos adicionais */}
      {op &&
      <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Gavel className="w-4 h-4 text-primary" />
              Pedidos adicionais
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg overflow-hidden border">
              <table className="w-full text-sm">
                <tbody>
                  {op.multa467 > 0 &&
                <tr className="border-t first:border-t-0">
                      <td className="py-2.5 px-4">
                        Multa do art. 467
                        <span className="block text-xs text-muted-foreground mt-0.5">50% do aviso prévio e reflexos</span>
                      </td>
                      <td className="py-2.5 px-4 text-right font-medium">{formatBRL(op.multa467)}</td>
                    </tr>
                }
                  {op.seguroDesemprego > 0 &&
                <tr className="border-t first:border-t-0">
                      <td className="py-2.5 px-4">
                        Seguro-desemprego
                        <span className="block text-xs text-muted-foreground mt-0.5">Indenização substitutiva (Súm. 389, II, TST)</span>
                      </td>
                      <td className="py-2.5 px-4 text-right font-medium">{formatBRL(op.seguroDesemprego)}</td>
                    </tr>
                }
                  {op.outros > 0 &&
                <tr className="border-t first:border-t-0">
                      <td className="py-2.5 px-4">{op.outrosDescricao || "Outros pedidos"}</td>
                      <td className="py-2.5 px-4 text-right font-medium">{formatBRL(op.outros)}</td>
                    </tr>
                }
                  <tr className="border-t bg-primary/5">
                    <td className="py-3 px-4 font-bold">Subtotal dos pedidos adicionais</td>
                    <td className="py-3 px-4 text-right font-bold text-primary text-lg">{formatBRL(op.total)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      }

      {/* Pedidos sem valor */}
      {pedidos.length > 0 &&
      <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ListChecks className="w-4 h-4 text-primary" />
              Pedidos sem valor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm list-disc pl-5">
              {pedidos.map((p) => <li key={p}>{p}</li>)}
            </ul>
          </CardContent>
        </Card>
      }

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
