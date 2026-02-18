import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { AlertTriangle, ArrowLeft, ArrowRight, Baby, Clock } from "lucide-react";
import StepIndicator from "@/components/StepIndicator";
import ResultCard from "@/components/ResultCard";
import { calcPrevisaoParto, calcMesesEstabilidade, calculate, CalcInput, CalcResult } from "@/lib/calculator";
import { parseDateFromInput, toInputDate, addMonthsExcelLike } from "@/lib/dateUtils";

const STEPS = ["Dados da Cliente", "Contrato e Gestação", "Resultado"];

const Index = () => {
  const [step, setStep] = useState(1);

  // Step 1
  const [nome, setNome] = useState("");
  const [nascimento, setNascimento] = useState("");
  const [pediuAConta, setPediuAConta] = useState(false);

  // Step 2
  const [salario, setSalario] = useState("");
  const [demissao, setDemissao] = useState("");
  const [concepcao, setConcepcao] = useState("");
  const [partoPrevisao, setPartoPrevisao] = useState("");
  const [partoEditado, setPartoEditado] = useState(false);
  const [editarMesesManual, setEditarMesesManual] = useState(false);
  const [mesesManual, setMesesManual] = useState("");
  const [reconhecerEstabilidade, setReconhecerEstabilidade] = useState(true);

  const [result, setResult] = useState<CalcResult | null>(null);
  const [inputData, setInputData] = useState<CalcInput | null>(null);

  // Auto-calculate parto previsão
  useEffect(() => {
    if (concepcao && !partoEditado) {
      const cDate = parseDateFromInput(concepcao);
      if (cDate) {
        setPartoPrevisao(toInputDate(calcPrevisaoParto(cDate)));
      }
    }
  }, [concepcao, partoEditado]);

  const concepcaoDate = parseDateFromInput(concepcao);
  const demissaoDate = parseDateFromInput(demissao);
  const partoDate = parseDateFromInput(partoPrevisao);
  const showWarning = concepcaoDate && demissaoDate && concepcaoDate > demissaoDate;

  // Calculate stability months for live preview
  const mesesEstabilidadeAuto = useMemo(() => {
    if (!demissaoDate || !partoDate) return null;
    const fimEst = addMonthsExcelLike(partoDate, 5);
    return calcMesesEstabilidade(demissaoDate, fimEst);
  }, [demissao, partoPrevisao]);

  const mesesAtual = editarMesesManual && mesesManual !== ""
    ? Number(mesesManual)
    : mesesEstabilidadeAuto;

  const isStep1Valid = nome.trim() !== "" && nascimento !== "";
  const isStep2Valid =
    salario !== "" &&
    Number(salario) > 0 &&
    demissao !== "" &&
    concepcao !== "" &&
    partoPrevisao !== "";

  const handleNext = () => {
    if (step === 1 && isStep1Valid) setStep(2);
    else if (step === 2 && isStep2Valid) {
      const input: CalcInput = {
        nome: nome.trim(),
        nascimento: parseDateFromInput(nascimento)!,
        salario: Number(salario),
        demissao: parseDateFromInput(demissao)!,
        concepcao: parseDateFromInput(concepcao)!,
        partoPrevisao: parseDateFromInput(partoPrevisao)!,
        pediuAConta,
        reconhecerEstabilidade,
        mesesManual: editarMesesManual && mesesManual !== "" ? Number(mesesManual) : null,
      };
      setInputData(input);
      setResult(calculate(input));
      setStep(3);
    }
  };

  const handleReset = () => {
    setStep(1);
    setNome("");
    setNascimento("");
    setPediuAConta(false);
    setSalario("");
    setDemissao("");
    setConcepcao("");
    setPartoPrevisao("");
    setPartoEditado(false);
    setEditarMesesManual(false);
    setMesesManual("");
    setReconhecerEstabilidade(true);
    setResult(null);
    setInputData(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-3">
            <Baby className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            Cálculos Gestante
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Cálculo de indenização do período de estabilidade
          </p>
        </div>

        <StepIndicator currentStep={step} steps={STEPS} />

        {/* Step 1 */}
        {step === 1 && (
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle className="text-lg">Dados da Cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome completo *</Label>
                <Input
                  id="nome"
                  placeholder="Maria da Silva"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nascimento">Data de nascimento *</Label>
                <Input
                  id="nascimento"
                  type="date"
                  value={nascimento}
                  onChange={(e) => setNascimento(e.target.value)}
                />
              </div>

              {/* Toggle pediu a conta */}
              <div className="rounded-lg border-2 border-primary/20 bg-accent/20 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="pediuAConta" className="text-base font-semibold cursor-pointer">
                    Ela pediu a conta?
                  </Label>
                  <Switch
                    id="pediuAConta"
                    checked={pediuAConta}
                    onCheckedChange={setPediuAConta}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {pediuAConta
                    ? "Tipo de rescisão: Pedido de demissão — Tabela 2 será habilitada"
                    : "Tipo de rescisão: Dispensa — apenas Tabela 1 será calculada"}
                </p>
              </div>

              <Button
                onClick={handleNext}
                disabled={!isStep1Valid}
                className="w-full gap-2 mt-2"
              >
                Próximo
                <ArrowRight className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle className="text-lg">Dados do Contrato e Gestação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="salario">Salário mensal (R$) *</Label>
                <Input
                  id="salario"
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="3500.00"
                  value={salario}
                  onChange={(e) => setSalario(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="demissao">Data de demissão *</Label>
                <Input
                  id="demissao"
                  type="date"
                  value={demissao}
                  onChange={(e) => setDemissao(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="concepcao">Data da concepção *</Label>
                <Input
                  id="concepcao"
                  type="date"
                  value={concepcao}
                  onChange={(e) => setConcepcao(e.target.value)}
                />
              </div>

              {showWarning && (
                <Alert variant="destructive" className="bg-warning/10 border-warning/30 text-warning">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    A concepção é posterior à demissão — confira os dados.
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="parto">Data do parto / previsão *</Label>
                <Input
                  id="parto"
                  type="date"
                  value={partoPrevisao}
                  onChange={(e) => {
                    setPartoPrevisao(e.target.value);
                    setPartoEditado(true);
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Calculado automaticamente (266 dias após concepção). Edite se houver ultrassom/certidão.
                </p>
              </div>

              {/* Stability months display */}
              {mesesEstabilidadeAuto !== null && (
                <div className="rounded-lg border-2 border-primary/20 bg-accent/20 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    <span className="text-base font-semibold">
                      Tempo de estabilidade: {mesesAtual ?? 0} meses
                    </span>
                    {editarMesesManual && <span className="text-xs text-muted-foreground">(manual)</span>}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Cálculo automático: {mesesEstabilidadeAuto} meses
                  </p>

                  <div className="flex items-center justify-between pt-1">
                    <Label htmlFor="editarMeses" className="text-sm cursor-pointer">
                      Editar tempo manualmente
                    </Label>
                    <Switch
                      id="editarMeses"
                      checked={editarMesesManual}
                      onCheckedChange={(checked) => {
                        setEditarMesesManual(checked);
                        if (!checked) setMesesManual("");
                      }}
                    />
                  </div>

                  {editarMesesManual && (
                    <div className="space-y-1">
                      <Label htmlFor="mesesManual" className="text-sm">Meses de estabilidade</Label>
                      <Input
                        id="mesesManual"
                        type="number"
                        min="0"
                        step="1"
                        placeholder={String(mesesEstabilidadeAuto)}
                        value={mesesManual}
                        onChange={(e) => setMesesManual(e.target.value)}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Reconhecer estabilidade */}
              <div className="flex items-center justify-between rounded-lg border p-4">
                <Label htmlFor="reconhecer" className="text-sm font-medium cursor-pointer">
                  Reconhecer estabilidade?
                </Label>
                <Switch
                  id="reconhecer"
                  checked={reconhecerEstabilidade}
                  onCheckedChange={setReconhecerEstabilidade}
                />
              </div>

              <div className="flex gap-3 mt-2">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1 gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Voltar
                </Button>
                <Button
                  onClick={handleNext}
                  disabled={!isStep2Valid}
                  className="flex-1 gap-2"
                >
                  Calcular
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3 */}
        {step === 3 && result && inputData && (
          <ResultCard input={inputData} result={result} onReset={handleReset} />
        )}
      </div>
    </div>
  );
};

export default Index;
