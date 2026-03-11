import { ConcepcaoInfo } from "@/lib/calculator";
import { formatDateBR } from "@/lib/dateUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Baby } from "lucide-react";

interface Props {
  info: ConcepcaoInfo;
}

const ConcepcaoCalculo = ({ info }: Props) => {
  if (info.metodo === 'insuficiente') {
    return (
      <Card className="border-2 border-muted">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Baby className="w-4 h-4 text-primary" />
            Cálculo da Concepção
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground italic">
            Não foi possível estimar a data da concepção com segurança porque faltam dados obstétricos suficientes.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Baby className="w-4 h-4 text-primary" />
          Cálculo da Concepção
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {info.metodo === 'exame' && info.dataExame && info.semanasExame !== undefined && info.diasExame !== undefined && info.idadeGestacionalDias && info.dumEstimada && info.concepcaoEstimada && (
          <div className="space-y-3 text-sm leading-relaxed">
            <p>
              Cálculo realizado com base no exame informado em <strong>{formatDateBR(info.dataExame)}</strong>, que indicou idade gestacional de <strong>{info.semanasExame} semanas e {info.diasExame} dias</strong>.
            </p>

            <div className="rounded-lg bg-muted/50 p-3 space-y-2 text-sm">
              <p className="font-medium text-foreground">Passo a passo:</p>
              <p>
                1. Convertemos a idade gestacional para dias:<br />
                <span className="font-mono text-primary">{info.semanasExame} semanas × 7 + {info.diasExame} dias = {info.idadeGestacionalDias} dias</span>
              </p>
              <p>
                2. Retroagimos esse total a partir da data do exame para encontrar a DUM estimada:<br />
                <span className="font-mono text-primary">{formatDateBR(info.dataExame)} − {info.idadeGestacionalDias} dias = {formatDateBR(info.dumEstimada)}</span>
              </p>
              <p>
                3. Somamos 14 dias à DUM estimada para encontrar a data estimada da concepção:<br />
                <span className="font-mono text-primary">{formatDateBR(info.dumEstimada)} + 14 dias = {formatDateBR(info.concepcaoEstimada)}</span>
              </p>
            </div>

            <div className="rounded-lg bg-muted/50 p-3 text-sm">
              <p className="font-medium text-foreground">Fórmula resumida:</p>
              <p className="font-mono text-primary">
                {formatDateBR(info.dataExame)} − {info.idadeGestacionalDias} dias + 14 dias = {formatDateBR(info.concepcaoEstimada)}
              </p>
            </div>

            <div className="rounded-lg bg-primary/10 border border-primary/20 p-4 text-center">
              <p className="text-sm font-medium text-muted-foreground">Data estimada da concepção</p>
              <p className="text-xl font-bold text-primary mt-1">{formatDateBR(info.concepcaoEstimada)}</p>
            </div>
          </div>
        )}

        {info.metodo === 'dpp' && info.dpp && info.concepcaoEstimada && (
          <div className="space-y-3 text-sm leading-relaxed">
            <p>
              Cálculo realizado com base na data provável do parto (DPP) informada: <strong>{formatDateBR(info.dpp)}</strong>.
            </p>

            <div className="rounded-lg bg-muted/50 p-3 space-y-2 text-sm">
              <p className="font-medium text-foreground">Passo a passo:</p>
              <p>
                Subtraímos 266 dias da DPP para estimar a data da concepção:<br />
                <span className="font-mono text-primary">{formatDateBR(info.dpp)} − 266 dias = {formatDateBR(info.concepcaoEstimada)}</span>
              </p>
            </div>

            <div className="rounded-lg bg-primary/10 border border-primary/20 p-4 text-center">
              <p className="text-sm font-medium text-muted-foreground">Data estimada da concepção</p>
              <p className="text-xl font-bold text-primary mt-1">{formatDateBR(info.concepcaoEstimada)}</p>
            </div>
          </div>
        )}

        {/* Observação obrigatória */}
        <div className="border-t pt-4 space-y-3">
          <p className="text-xs text-muted-foreground italic">
            <strong>Observação:</strong> Esta data é estimada a partir dos dados obstétricos informados e serve como referência cronológica para análise jurídica do período gestacional.
          </p>
          <p className="text-xs text-muted-foreground italic">
            <strong>Fundamento jurídico:</strong> No Direito do Trabalho, a proteção da gestante considera relevante a existência da gravidez no curso do vínculo de emprego, ainda que a confirmação formal ocorra posteriormente. Por isso, a demonstração cronológica da gestação pode ser útil para análise do caso concreto.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default ConcepcaoCalculo;
