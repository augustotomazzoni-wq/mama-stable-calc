import { CalcInput, CalcResult } from "@/lib/calculator";
import { formatBRL, formatDateBR } from "@/lib/dateUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, FileText, Calendar, DollarSign, Scale, Shield, Printer } from "lucide-react";

interface Props {
  input: CalcInput;
  result: CalcResult;
  onClose: () => void;
}

const VerbaBlock = ({
  title,
  value,
  explanation,
  formula,
  observation,
}: {
  title: string;
  value: number;
  explanation: string;
  formula: string;
  observation?: string;
}) => (
  <div className="rounded-lg border bg-card p-4 space-y-2">
    <div className="flex items-center justify-between">
      <span className="font-semibold text-sm text-foreground">{title}</span>
      <span className="text-lg font-bold text-primary font-display">{formatBRL(value)}</span>
    </div>
    <p className="text-xs text-muted-foreground">{explanation}</p>
    <p className="text-xs font-mono bg-muted/50 rounded px-2 py-1 text-foreground/80">{formula}</p>
    {observation && (
      <p className="text-xs italic text-muted-foreground">⚠ {observation}</p>
    )}
  </div>
);

const MemoriaCalculoDetalhada = ({ input, result, onClose }: Props) => {
  const t1 = result.tabela1;
  const t2 = result.tabela2;
  const mf = result.multaFgts;
  const aliquotaLabel = input.empregadaDomestica ? "11,2%" : "8%";
  const meses = result.mesesEstabilidade;
  const sal = input.salario;

  const fmt = (v: number) => formatBRL(v);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <Card className="border-2 border-primary/30 bg-accent/30">
        <CardContent className="pt-6 text-center space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Documento de Conferência</p>
          <h2 className="text-xl font-display font-bold text-foreground">Memorial de Cálculo Detalhado</h2>
        </CardContent>
      </Card>

      {/* Dados Iniciais */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            Dados Iniciais
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <span className="text-muted-foreground">Nome da cliente</span>
            <span className="font-medium">{input.nome}</span>
            <span className="text-muted-foreground">Data de nascimento</span>
            <span className="font-medium">{formatDateBR(input.nascimento)}</span>
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
            <span className="text-muted-foreground">Data do parto / previsão</span>
            <span className="font-medium">{formatDateBR(result.previsaoParto)}</span>
            <span className="text-muted-foreground">Salário base</span>
            <span className="font-medium">{fmt(sal)}</span>
            <span className="text-muted-foreground">Empregada doméstica</span>
            <span className="font-medium">{input.empregadaDomestica ? "Sim" : "Não"}</span>
            <span className="text-muted-foreground">Pediu a conta</span>
            <span className="font-medium">{input.pediuAConta ? "Sim" : "Não"}</span>
            <span className="text-muted-foreground">Multa 40% FGTS ativada</span>
            <span className="font-medium">{input.calcularMultaFgts ? "Sim" : "Não"}</span>
          </div>
          <div className="mt-4 pt-3 border-t grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <span className="text-muted-foreground">Meses até o parto</span>
            <span className="font-medium">{result.mesesEstabilidadeAuto - 5}</span>
            <span className="text-muted-foreground">Meses pós-parto (fixo)</span>
            <span className="font-medium">5</span>
            <span className="text-muted-foreground">Total de meses considerados</span>
            <span className="font-medium">{meses} {result.mesesManual ? "(manual)" : "(automático)"}</span>
            <span className="text-muted-foreground">Alíquota FGTS</span>
            <span className="font-medium">{aliquotaLabel}</span>
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
        <CardContent className="space-y-3">
          <VerbaBlock
            title="Salários do período"
            value={t1.salarios}
            explanation="Salário mensal multiplicado pelos meses da estabilidade"
            formula={`${fmt(sal)} × ${meses} meses = ${fmt(t1.salarios)}`}
          />
          <VerbaBlock
            title="13º proporcional"
            value={t1.decimoTerceiro}
            explanation="13º calculado proporcionalmente sobre o período considerado"
            formula={`(${fmt(sal)} / 12) × ${meses} = ${fmt(t1.decimoTerceiro)}`}
          />
          <VerbaBlock
            title="Férias + 1/3"
            value={t1.feriasComTerco}
            explanation="Férias proporcionais acrescidas de 1/3 constitucional"
            formula={`(${fmt(sal)} / 3) + ${fmt(t1.decimoTerceiro)} = ${fmt(t1.feriasComTerco)}`}
          />

          <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-4 flex items-center justify-between">
            <span className="font-bold text-sm">Subtotal Indenização</span>
            <span className="text-xl font-bold text-primary font-display">{fmt(t1.total)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Cálculo das verbas rescisórias */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Scale className="w-4 h-4 text-primary" />
            Cálculo das verbas rescisórias
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <VerbaBlock
            title={`FGTS (${aliquotaLabel})`}
            value={t2.fgts}
            explanation="FGTS calculado sobre a base de Salários + 13º + Férias"
            formula={`(${fmt(t1.salarios)} + ${fmt(t1.decimoTerceiro)} + ${fmt(t1.feriasComTerco)}) × ${aliquotaLabel} = ${fmt(t2.fgts)}`}
            observation={input.empregadaDomestica ? "Alíquota de 11,2% aplicada (empregada doméstica)" : undefined}
          />

          {input.pediuAConta && (
            <>
              <VerbaBlock
                title="Aviso prévio"
                value={t2.avisoProvio}
                explanation="Valor equivalente a um salário mensal"
                formula={`${fmt(sal)}`}
              />
              <VerbaBlock
                title="13º sobre aviso"
                value={t2.decimoTerceiroAviso}
                explanation="Um doze avos do aviso prévio"
                formula={`${fmt(t2.avisoProvio)} / 12 = ${fmt(t2.decimoTerceiroAviso)}`}
              />
              <VerbaBlock
                title="Férias + 1/3 sobre aviso"
                value={t2.feriasComTercoAviso}
                explanation="Férias proporcionais acrescidas de 1/3 sobre o aviso prévio"
                formula={`(${fmt(t2.decimoTerceiroAviso)} / 3) + ${fmt(t2.decimoTerceiroAviso)} = ${fmt(t2.feriasComTercoAviso)}`}
              />
              <VerbaBlock
                title="Multa art. 477"
                value={t2.multa477}
                explanation="Multa por atraso no pagamento das verbas rescisórias"
                formula={`${fmt(sal)}`}
              />
            </>
          )}

          <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-4 flex items-center justify-between">
            <span className="font-bold text-sm">Subtotal Verbas Rescisórias</span>
            <span className="text-xl font-bold text-primary font-display">{fmt(t2.total)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Multa FGTS 40% */}
      {mf && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              Multa de 40% do FGTS
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {mf.temAdmissao ? (
              <VerbaBlock
                title="FGTS acumulado do contrato até a saída"
                value={mf.fgtsAcumuladoContrato}
                explanation="FGTS acumulado calculado com base no salário, alíquota e meses de contrato"
                formula={`${fmt(sal)} × ${aliquotaLabel} × ${mf.mesesContrato} meses = ${fmt(mf.fgtsAcumuladoContrato)}`}
              />
            ) : (
              <div className="rounded-lg border bg-card p-4 space-y-2">
                <span className="font-semibold text-sm text-foreground">FGTS acumulado do contrato</span>
                <p className="text-xs text-muted-foreground">
                  Data de admissão não informada — multa calculada apenas sobre o FGTS do acerto.
                </p>
              </div>
            )}

            <VerbaBlock
              title="FGTS devido sobre o acerto"
              value={mf.fgtsAcerto}
              explanation="Corresponde ao FGTS calculado sobre as verbas rescisórias"
              formula={`Valor calculado pelo motor interno do sistema: ${fmt(mf.fgtsAcerto)}`}
            />

            <VerbaBlock
              title="Multa de 40% do FGTS"
              value={mf.multa40}
              explanation="Multa de 40% aplicada sobre a soma do FGTS acumulado do contrato com o FGTS do acerto"
              formula={mf.temAdmissao
                ? `(${fmt(mf.fgtsAcumuladoContrato)} + ${fmt(mf.fgtsAcerto)}) × 40% = ${fmt(mf.multa40)}`
                : `${fmt(mf.fgtsAcerto)} × 40% = ${fmt(mf.multa40)}`
              }
              observation={!mf.temAdmissao ? "Sem data de admissão — base considera apenas FGTS do acerto" : undefined}
            />
          </CardContent>
        </Card>
      )}

      {/* TOTAL GERAL */}
      <Card className="border-2 border-primary/40 bg-primary/10">
        <CardContent className="py-6 text-center space-y-2">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Geral da Indenização</p>
          <p className="text-4xl font-bold text-primary font-display">{fmt(result.totalFinal)}</p>
          <p className="text-xs text-muted-foreground">
            Indenização + Verbas Rescisórias{mf ? " + Multa 40% FGTS" : ""} — Soma final das verbas apuradas
          </p>
        </CardContent>
      </Card>

      {/* Rodapé */}
      <div className="text-center space-y-1 pt-2 pb-4">
        <p className="text-xs text-muted-foreground">
          Documento gerado automaticamente pelo sistema para facilitar a conferência da memória de cálculo.
        </p>
        <p className="text-xs font-semibold text-foreground">Tabela elaborada por Dr. Augusto Tomazzoni Lubenow</p>
        <p className="text-xs text-muted-foreground">OAB 133519</p>
      </div>

      {/* Action buttons */}
      <div className="print:hidden space-y-3">
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
