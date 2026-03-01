import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { AlertTriangle, ArrowLeft, ArrowRight, Baby, Clock, Home } from "lucide-react";
import StepIndicator from "@/components/StepIndicator";
import ResultCard from "@/components/ResultCard";
import { calcPrevisaoParto, calcMesesAteParto, calcMesesEstabilidade, calculate, CalcInput, CalcResult } from "@/lib/calculator";
import { parseDateFromInput, toInputDate, addDays } from "@/lib/dateUtils";
import Login from "./Login";

const STEPS = ["Dados da Cliente", "Contrato e Gestação", "Resultado"];

const Index = () => {
  const [autenticado, setAutenticado] = useState(false);
  const [step, setStep] = useState(1);

  // Step 1
  const [nome, setNome] = useState("");
  const [nascimento, setNascimento] = useState("");
  const [salario, setSalario] = useState("");
  const [pediuAConta, setPediuAConta] = useState(false);
  const [empregadaDomestica, setEmpregadaDomestica] = useState(false);

  // Step 2
  const [demissao, setDemissao] = useState("");
  const [concepcao, setConcepcao] = useState("");
  const [partoPrevisao, setPartoPrevisao] = useState("");
  const [editarMesesManual, setEditarMesesManual] = useState(false);
  const [mesesManual, setMesesManual] = useState("");

  const [result, setResult] = useState<CalcResult | null>(null);
  const [inputData, setInputData] = useState<CalcInput | null>(null);

  const [ultimoEditado, setUltimoEditado] = useState<"concepcao" | "parto" | null>(null);

  // Auto-calculate parto from concepcao
  useEffect(() => {
    if (ultimoEditado === "concepcao" && concepcao) {
      const cDate = parseDateFromInput(concepcao);
      if (cDate) {
        setPartoPrevisao(toInputDate(calcPrevisaoParto(cDate)));
      }
    }
  }, [concepcao, ultimoEditado]);

  // Auto-calculate concepcao from parto (inverse: parto - 266 days)
  useEffect(() => {
    if (ultimoEditado === "parto" && partoPrevisao) {
      const pDate = parseDateFromInput(partoPrevisao);
      if (pDate) {
        const concDate = addDays(pDate, -266);
        setConcepcao(toInputDate(concDate));
      }
    }
  }, [partoPrevisao, ultimoEditado]);

  const concepcaoDate = parseDateFromInput(concepcao);
  const demissaoDate = parseDateFromInput(demissao);
  const partoDate = parseDateFromInput(partoPrevisao);
  const showWarning = concepcaoDate && demissaoDate && concepcaoDate > demissaoDate;

  // Live preview stability months
  const mesesAtePartoAuto = useMemo(() => {
    if (!demissaoDate || !partoDate) return null;
    return calcMesesAteParto(demissaoDate, partoDate);
  }, [demissao, partoPrevisao]);

  const mesesEstabilidadeAuto = useMemo(() => {
    if (mesesAtePartoAuto === null) return null;
    return mesesAtePartoAuto + 5;
  }, [mesesAtePartoAuto]);

  const mesesAtual = editarMesesManual && mesesManual !== ""
    ? Number(mesesManual)
    : mesesEstabilidadeAuto;

  const isStep1Valid =
    nome.trim() !== "" &&
    nascimento !== "" &&
    salario !== "" &&
    Number(salario) > 0;

  const isStep2Valid =
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
        mesesManual: editarMesesManual && mesesManual !== "" ? Number(mesesManual) : null,
        empregadaDomestica,
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
    setEmpregadaDomestica(false);
    setSalario("");
    setDemissao("");
    setConcepcao("");
    setPartoPrevisao("");
    setEditarMesesManual(false);
    setMesesManual("");
    setUltimoEditado(null);
  };

  if (!autenticado) {
    return <Login onLogin={() => setAutenticado(true)} />;
  }

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
              <div className="space-y-2">
                <Label htmlFor="salario">Salário da gestante na carteira (CTPS) *</Label>
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

              {/* Toggle empregada doméstica */}
              <div className="rounded-lg border-2 border-secondary/40 bg-secondary/10 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Home className="w-4 h-4 text-secondary-foreground" />
                    <Label htmlFor="empregadaDomestica" className="text-base font-semibold cursor-pointer">
                      Empregada doméstica?
                    </Label>
                  </div>
                  <Switch
                    id="empregadaDomestica"
                    checked={empregadaDomestica}
                    onCheckedChange={setEmpregadaDomestica}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {empregadaDomestica
                    ? "FGTS calculado à alíquota de 11,2% sobre a base (Salários + 13º + Férias+1/3)"
                    : "FGTS calculado à alíquota de 8% sobre a base (Salários + 13º + Férias+1/3)"}
                </p>
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
                  onChange={(e) => { setConcepcao(e.target.value); setUltimoEditado("concepcao"); }}
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
                  onChange={(e) => { setPartoPrevisao(e.target.value); setUltimoEditado("parto"); }}
                />
                <p className="text-xs text-muted-foreground">
                  Cálculo bidirecional: preencha concepção ou parto e o outro será calculado automaticamente (266 dias).
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
                    {mesesAtePartoAuto !== null && (
                      <span className="ml-1">
                        ({mesesAtePartoAuto} {mesesAtePartoAuto === 1 ? "mês" : "meses"} até o parto + 5 meses fixos)
                      </span>
                    )}
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
          <ResultCard
            input={inputData}
            result={result}
            onReset={handleReset}
            onBack={() => setStep(2)}
          />
        )}
      </div>
    </div>
  );
};

export default Index;
