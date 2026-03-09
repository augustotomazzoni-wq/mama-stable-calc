import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { AlertTriangle, ArrowLeft, ArrowRight, Clock, Home, Link, Unlink, Stethoscope, ChevronDown, ChevronUp, Shield } from "lucide-react";
import StepIndicator from "@/components/StepIndicator";
import ResultCard from "@/components/ResultCard";
import MemoriaCalculoDetalhada from "@/components/MemoriaCalculoDetalhada";
import { calcPrevisaoParto, calcMesesAteParto, calcMesesEstabilidade, calculate, CalcInput, CalcResult } from "@/lib/calculator";
import { parseDateFromInput, toInputDate, addDays } from "@/lib/dateUtils";
import Login from "./Login";

const STEPS = ["Dados da Cliente", "Contrato e Gestação", "Resultado"];

const Index = () => {
  const [autenticado, setAutenticado] = useState(false);
  const [step, setStep] = useState(1);
  const [showMemoria, setShowMemoria] = useState(false);

  // Step 1
  const [nome, setNome] = useState("");
  const [nascimento, setNascimento] = useState("");
  const [salario, setSalario] = useState("");
  const [pediuAConta, setPediuAConta] = useState(false);
  const [empregadaDomestica, setEmpregadaDomestica] = useState(false);

  // Step 2
  const [admissao, setAdmissao] = useState("");
  const [demissao, setDemissao] = useState("");
  const [concepcao, setConcepcao] = useState("");
  const [partoPrevisao, setPartoPrevisao] = useState("");
  const [editarMesesManual, setEditarMesesManual] = useState(false);
  const [mesesManual, setMesesManual] = useState("");
  const [calcularMultaFgts, setCalcularMultaFgts] = useState(false);

  const [result, setResult] = useState<CalcResult | null>(null);
  const [inputData, setInputData] = useState<CalcInput | null>(null);

  const [ultimoEditado, setUltimoEditado] = useState<"concepcao" | "parto" | null>(null);
  const [autoConcepcao, setAutoConcepcao] = useState(true);
  const [autoParto, setAutoParto] = useState(true);

  // Helper: exam-based conception calculator
  const [showExameHelper, setShowExameHelper] = useState(false);
  const [exameData, setExameData] = useState("");
  const [exameSemanas, setExameSemanas] = useState("");
  const [exameDias, setExameDias] = useState("");

  const exameConcepcaoDate = useMemo(() => {
    if (!exameData || exameSemanas === "") return null;
    const eDate = parseDateFromInput(exameData);
    if (!eDate) return null;
    const totalDias = Number(exameSemanas) * 7 + (Number(exameDias) || 0);
    if (totalDias <= 0) return null;
    return addDays(eDate, -totalDias);
  }, [exameData, exameSemanas, exameDias]);

  const examePartoDate = useMemo(() => {
    if (!exameConcepcaoDate) return null;
    return calcPrevisaoParto(exameConcepcaoDate);
  }, [exameConcepcaoDate]);

  const aplicarExame = () => {
    if (exameConcepcaoDate && examePartoDate) {
      setConcepcao(toInputDate(exameConcepcaoDate));
      setPartoPrevisao(toInputDate(examePartoDate));
      setUltimoEditado(null);
    }
  };

  // Auto-calculate parto from concepcao
  useEffect(() => {
    if (ultimoEditado === "concepcao" && concepcao && autoParto) {
      const cDate = parseDateFromInput(concepcao);
      if (cDate) {
        setPartoPrevisao(toInputDate(calcPrevisaoParto(cDate)));
      }
    }
  }, [concepcao, ultimoEditado, autoParto]);

  // Auto-calculate concepcao from parto
  useEffect(() => {
    if (ultimoEditado === "parto" && partoPrevisao && autoConcepcao) {
      const pDate = parseDateFromInput(partoPrevisao);
      if (pDate) {
        const concDate = addDays(pDate, -266);
        setConcepcao(toInputDate(concDate));
      }
    }
  }, [partoPrevisao, ultimoEditado, autoConcepcao]);

  // Clear admissao when multa is turned off
  useEffect(() => {
    if (!calcularMultaFgts) {
      setAdmissao("");
    }
  }, [calcularMultaFgts]);

  const concepcaoDate = parseDateFromInput(concepcao);
  const demissaoDate = parseDateFromInput(demissao);
  const partoDate = parseDateFromInput(partoPrevisao);
  const showWarning = concepcaoDate && demissaoDate && concepcaoDate > demissaoDate;

  const mesesAtePartoAuto = useMemo(() => {
    if (!demissaoDate || !partoDate) return null;
    return calcMesesAteParto(demissaoDate, partoDate);
  }, [demissao, partoPrevisao]);

  const mesesEstabilidadeAuto = useMemo(() => {
    if (mesesAtePartoAuto === null) return null;
    return mesesAtePartoAuto + 5;
  }, [mesesAtePartoAuto]);

  const mesesAtual = editarMesesManual && mesesManual !== "" ?
  Number(mesesManual) :
  mesesEstabilidadeAuto;

  const isStep1Valid =
  nome.trim() !== "" &&
  nascimento !== "" &&
  salario !== "" &&
  Number(salario) > 0;

  const isStep2Valid =
  demissao !== "" &&
  concepcao !== "" &&
  partoPrevisao !== "" && (
  !calcularMultaFgts || admissao !== "");

  const handleNext = () => {
    if (step === 1 && isStep1Valid) setStep(2);else
    if (step === 2 && isStep2Valid) {
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
        admissao: admissao ? parseDateFromInput(admissao) : null,
        calcularMultaFgts
      };
      setInputData(input);
      setResult(calculate(input));
      setStep(3);
      setShowMemoria(false);
    }
  };

  const handleReset = () => {
    setStep(1);
    setNome("");
    setNascimento("");
    setPediuAConta(false);
    setEmpregadaDomestica(false);
    setSalario("");
    setAdmissao("");
    setDemissao("");
    setConcepcao("");
    setPartoPrevisao("");
    setEditarMesesManual(false);
    setMesesManual("");
    setCalcularMultaFgts(false);
    setUltimoEditado(null);
    setAutoConcepcao(true);
    setAutoParto(true);
    setShowExameHelper(false);
    setExameData("");
    setExameSemanas("");
    setExameDias("");
    setShowMemoria(false);
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
        {step === 1 &&
        <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle className="text-lg">Dados da Cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome completo *</Label>
                <Input id="nome" placeholder="Maria da Silva" value={nome} onChange={(e) => setNome(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nascimento">Data de nascimento *</Label>
                <Input id="nascimento" type="date" value={nascimento} onChange={(e) => setNascimento(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="salario">Salário da gestante na carteira (CTPS) *</Label>
                <Input id="salario" type="number" min="0.01" step="0.01" placeholder="3500.00" value={salario} onChange={(e) => setSalario(e.target.value)} />
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
                  <Switch id="empregadaDomestica" checked={empregadaDomestica} onCheckedChange={setEmpregadaDomestica} />
                </div>
                <p className="text-xs text-muted-foreground">
                  {empregadaDomestica ?
                "FGTS calculado à alíquota de 11,2% sobre a base (Salários + 13º + Férias+1/3)" :
                "FGTS calculado à alíquota de 8% sobre a base (Salários + 13º + Férias+1/3)"}
                </p>
              </div>

              {/* Toggle pediu a conta */}
              <div className="rounded-lg border-2 border-primary/20 bg-accent/20 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="pediuAConta" className="text-base font-semibold cursor-pointer">
                    Ela pediu a conta?
                  </Label>
                  <Switch id="pediuAConta" checked={pediuAConta} onCheckedChange={setPediuAConta} />
                </div>
                <p className="text-xs text-muted-foreground">
                  {pediuAConta ?
                "Tipo de rescisão: Pedido de demissão — verbas rescisórias completas serão calculadas" :
                "Tipo de rescisão: Dispensa — apenas indenização e FGTS serão calculados"}
                </p>
              </div>

              <Button onClick={handleNext} disabled={!isStep1Valid} className="w-full gap-2 mt-2">
                Próximo
                <ArrowRight className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
        }

        {/* Step 2 */}
        {step === 2 &&
        <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle className="text-lg">Dados do Contrato e Gestação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="demissao">Data de demissão *</Label>
                <Input id="demissao" type="date" value={demissao} onChange={(e) => setDemissao(e.target.value)} />
              </div>

              {/* Exam-based helper */}
              <div className="rounded-lg border-2 border-muted bg-muted/30 p-4 space-y-3">
                <button
                type="button"
                className="flex items-center justify-between w-full text-left"
                onClick={() => setShowExameHelper(!showExameHelper)}>
                
                  <div className="flex items-center gap-2">
                    <Stethoscope className="w-4 h-4 text-primary" />
                    <span className="text-sm font-semibold">Calcular a partir do exame</span>
                  </div>
                  {showExameHelper ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </button>
                {showExameHelper &&
              <div className="space-y-3 pt-1">
                    <p className="text-xs text-muted-foreground">
                      Informe a data do exame e a idade gestacional para calcular concepção e parto.
                    </p>
                    <div className="space-y-2">
                      <Label htmlFor="exameData" className="text-sm">Data do exame</Label>
                      <Input id="exameData" type="date" value={exameData} onChange={(e) => setExameData(e.target.value)} />
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-1 space-y-2">
                        <Label htmlFor="exameSemanas" className="text-sm">Semanas</Label>
                        <Input id="exameSemanas" type="number" min="0" max="42" placeholder="0" value={exameSemanas} onChange={(e) => setExameSemanas(e.target.value)} />
                      </div>
                      <div className="flex-1 space-y-2">
                        <Label htmlFor="exameDias" className="text-sm">Dias</Label>
                        <Input id="exameDias" type="number" min="0" max="6" placeholder="0" value={exameDias} onChange={(e) => setExameDias(e.target.value)} />
                      </div>
                    </div>
                    {exameConcepcaoDate && examePartoDate &&
                <div className="rounded-md bg-accent/40 p-3 space-y-1 text-sm">
                        <p><span className="font-medium">Concepção:</span> {exameConcepcaoDate.toLocaleDateString('pt-BR')}</p>
                        <p><span className="font-medium">Previsão do parto:</span> {examePartoDate.toLocaleDateString('pt-BR')}</p>
                        <Button type="button" size="sm" className="w-full mt-2 gap-1.5" onClick={aplicarExame}>
                          Usar estas datas
                        </Button>
                      </div>
                }
                  </div>
              }
              </div>

              <div className="space-y-2">
                <Label htmlFor="concepcao">Data da concepção *</Label>
                <Input
                id="concepcao"
                type="date"
                value={concepcao}
                onChange={(e) => {setConcepcao(e.target.value);setUltimoEditado("concepcao");}} />
              
                <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-1.5 text-xs h-7 px-2"
                onClick={() => setAutoConcepcao(!autoConcepcao)}>
                
                  {autoConcepcao ? <Link className="w-3 h-3" /> : <Unlink className="w-3 h-3" />}
                  {autoConcepcao ? "Cálculo automático ativo" : "Cálculo automático desativado"}
                </Button>
              </div>

              {showWarning &&
            <Alert variant="destructive" className="bg-warning/10 border-warning/30 text-warning">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    A concepção é posterior à demissão — confira os dados.
                  </AlertDescription>
                </Alert>
            }

              <div className="space-y-2">
                <Label htmlFor="parto">Data do parto / previsão *</Label>
                <Input
                id="parto"
                type="date"
                value={partoPrevisao}
                onChange={(e) => {setPartoPrevisao(e.target.value);setUltimoEditado("parto");}} />
              
                <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-1.5 text-xs h-7 px-2"
                onClick={() => setAutoParto(!autoParto)}>
                
                  {autoParto ? <Link className="w-3 h-3" /> : <Unlink className="w-3 h-3" />}
                  {autoParto ? "Cálculo automático ativo" : "Cálculo automático desativado"}
                </Button>
              </div>

              {/* Stability months display */}
              {mesesEstabilidadeAuto !== null &&
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
                    {mesesAtePartoAuto !== null &&
                <span className="ml-1">
                        ({mesesAtePartoAuto} {mesesAtePartoAuto === 1 ? "mês" : "meses"} até o parto + 5 meses fixos)
                      </span>
                }
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
                  }} />
                
                  </div>

                  {editarMesesManual &&
              <div className="space-y-1">
                      <Label htmlFor="mesesManual" className="text-sm">Meses de estabilidade</Label>
                      <Input
                  id="mesesManual"
                  type="number"
                  min="0"
                  step="1"
                  placeholder={String(mesesEstabilidadeAuto)}
                  value={mesesManual}
                  onChange={(e) => setMesesManual(e.target.value)} />
                
                    </div>
              }
                </div>
            }

              {/* Multa FGTS 40% switch */}
              <div className="rounded-lg border-2 border-primary/20 bg-accent/20 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-primary" />
                    <Label htmlFor="calcularMultaFgts" className="text-base font-semibold cursor-pointer">
                      Calcular multa de FGTS de 40%?
                    </Label>
                  </div>
                  <Switch id="calcularMultaFgts" checked={calcularMultaFgts} onCheckedChange={setCalcularMultaFgts} />
                </div>
                <p className="text-xs text-muted-foreground">
                  {calcularMultaFgts ?
                "Preencha a data de admissão abaixo para calcular a multa de 40% sobre o FGTS" :
                "Ative para incluir a multa de 40% do FGTS no cálculo"}
                </p>
              </div>

              {/* Data de admissão - condicional */}
              {calcularMultaFgts &&
            <div className="space-y-2">
                  <Label htmlFor="admissao">Data de admissão *</Label>
                  <Input id="admissao" type="date" value={admissao} onChange={(e) => setAdmissao(e.target.value)} />
                  {!admissao &&
              <p className="text-xs text-destructive">
                      Obrigatório quando a multa de 40% está ativada.
                    </p>
              }
                </div>
            }

              <div className="flex gap-3 mt-2">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1 gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Voltar
                </Button>
                <Button onClick={handleNext} disabled={!isStep2Valid} className="flex-1 gap-2">
                  Calcular
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        }

        {/* Step 3 */}
        {step === 3 && result && inputData && (
        showMemoria ?
        <MemoriaCalculoDetalhada
          input={inputData}
          result={result}
          onClose={() => setShowMemoria(false)} /> :


        <ResultCard
          input={inputData}
          result={result}
          onReset={handleReset}
          onBack={() => setStep(2)}
          onOpenMemoria={() => setShowMemoria(true)} />)


        }
      </div>
    </div>);

};

export default Index;