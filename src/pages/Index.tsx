import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { serializeInput, serializeResult, buildResumoJson } from "@/lib/calcSerializer";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Clock,
  Home,
  Link,
  Unlink,
  Stethoscope,
  ChevronDown,
  ChevronUp,
  Shield,
  Search,
  LogOut,
  UserMinus,
  DoorOpen,
  CalendarClock,
  Users,
  FileCheck,
  FileClock,
  FileX,
  Wallet,
  Gavel,
  type LucideIcon } from
"lucide-react";
import StepIndicator from "@/components/StepIndicator";
import ResultCard from "@/components/ResultCard";
import Logo from "@/components/Logo";
import MemoriaCalculoDetalhada from "@/components/MemoriaCalculoDetalhada";
import ConcepcaoCalculoPage from "@/components/ConcepcaoCalculoPage";
import ResumoCalculos from "@/components/ResumoCalculos";
import {
  calcPrevisaoParto,
  calcMesesAteParto,
  calculate,
  incluiFgtsDoContrato,
  CalcInput,
  CalcResult,
  ConcepcaoInfo,
  MotivoSaida,
  TipoRegistro } from
"@/lib/calculator";
import { parseDateFromInput, toInputDate, addDays, formatBRL } from "@/lib/dateUtils";
import { useSessao } from "@/hooks/useSessao";
import { registrarAcesso } from "@/lib/db";

type RecebidoCampo = "salarios" | "decimoTerceiro" | "ferias" | "fgts" | "rescisorias" | "outros";

const RECEBIDO_VAZIO: Record<RecebidoCampo, string> = {
  salarios: "",
  decimoTerceiro: "",
  ferias: "",
  fgts: "",
  rescisorias: "",
  outros: "",
};

/** Salários ficam de fora: dependem do interruptor "Recebia o salário todo mês?". */
const CAMPOS_RECEBIDO: { campo: RecebidoCampo; label: string }[] = [
  { campo: "decimoTerceiro", label: "13º recebido" },
  { campo: "ferias", label: "Férias recebidas" },
  { campo: "fgts", label: "FGTS depositado" },
  { campo: "rescisorias", label: "Aviso prévio e demais verbas da saída" },
];

/** Campo de dinheiro vazio conta como zero, não como NaN. */
const valorNumerico = (v: string): number => v === "" ? 0 : Number(v) || 0;

/**
 * O registro define o que se presume pago na saída e quais períodos entram no
 * cálculo, então é a primeira escolha do formulário.
 */
const TIPOS_REGISTRO: {
  valor: TipoRegistro;
  titulo: string;
  descricao: string;
  icone: LucideIcon;
}[] = [
  {
    valor: "com_carteira",
    titulo: "Com carteira",
    descricao: "Registrada desde o primeiro dia de trabalho.",
    icone: FileCheck,
  },
  {
    valor: "registrada_depois",
    titulo: "Registrada depois",
    descricao: "Começou sem carteira e foi registrada mais tarde.",
    icone: FileClock,
  },
  {
    valor: "sem_registro",
    titulo: "Nunca registrada",
    descricao: "Trabalhou sem carteira. Pede-se o reconhecimento do vínculo.",
    icone: FileX,
  },
];

/**
 * Em todos os motivos o ato é nulo e o contrato se projeta até o fim da
 * estabilidade. A diferença está no que a empregada já recebeu ao sair.
 */
const MOTIVOS_SAIDA: {
  valor: MotivoSaida;
  titulo: string;
  descricao: string;
  descricaoSemRegistro?: string;
  icone: LucideIcon;
}[] = [
  {
    valor: "dispensa_sem_justa_causa",
    titulo: "Deram a conta",
    descricao: "Dispensa sem justa causa. Aviso, 13º, férias e os 40% do contrato já foram pagos na rescisão.",
    descricaoSemRegistro: "Dispensa sem justa causa, em geral verbal. Sem registro, nada foi pago na saída.",
    icone: UserMinus,
  },
  {
    valor: "pedido_demissao",
    titulo: "Ela pediu a conta",
    descricao: "Pedido de demissão nulo sem assistência sindical (CLT 500). Nada rescisório foi pago.",
    icone: DoorOpen,
  },
  {
    valor: "fim_experiencia",
    titulo: "Acabou a experiência",
    descricao: "Estabilidade garantida mesmo no contrato a termo (Súmula 244, III, do TST).",
    icone: CalendarClock,
  },
];

interface CartaoOpcaoProps {
  ativo: boolean;
  titulo: string;
  descricao: string;
  Icone: LucideIcon;
  onClick: () => void;
}

const CartaoOpcao = ({ ativo, titulo, descricao, Icone, onClick }: CartaoOpcaoProps) =>
<button
  type="button"
  aria-pressed={ativo}
  onClick={onClick}
  className={`flex items-start gap-3 rounded-lg border-2 p-3 text-left transition-colors ${
  ativo ?
  "border-primary bg-accent/40" :
  "border-border hover:border-primary/40 hover:bg-accent/10"}`
  }>

    <Icone className={`w-4 h-4 mt-0.5 shrink-0 ${ativo ? "text-primary" : "text-muted-foreground"}`} />
    <span>
      <span className="block text-sm font-semibold text-foreground">{titulo}</span>
      <span className="block text-xs text-muted-foreground mt-0.5">{descricao}</span>
    </span>
  </button>;


const Index = () => {
  const navigate = useNavigate();
  // A sessão e o papel são garantidos pelo RotaProtegida que envolve esta tela.
  const { usuario, ehAdmin } = useSessao();

  const handleLogout = async () => {
    if (usuario) await registrarAcesso(usuario.id, usuario.email ?? null, "logout");
    await supabase.auth.signOut();
  };

  const [step, setStep] = useState(1);
  const [showMemoria, setShowMemoria] = useState(false);
  const [showConcepcao, setShowConcepcao] = useState(false);
  const [showResumo, setShowResumo] = useState(false);

  // Passo 1
  const [nome, setNome] = useState("");
  const [nascimento, setNascimento] = useState("");
  const [tipoRegistro, setTipoRegistro] = useState<TipoRegistro>("com_carteira");
  const [salario, setSalario] = useState("");
  const [piso, setPiso] = useState("");
  const [mostrarPiso, setMostrarPiso] = useState(false);
  const [motivoSaida, setMotivoSaida] = useState<MotivoSaida>("dispensa_sem_justa_causa");
  const [empregadaDomestica, setEmpregadaDomestica] = useState(false);

  // Passo 2
  const [vinculoInicio, setVinculoInicio] = useState("");
  const [admissao, setAdmissao] = useState("");
  const [demissao, setDemissao] = useState("");
  const [concepcao, setConcepcao] = useState("");
  const [partoPrevisao, setPartoPrevisao] = useState("");
  const [editarMesesManual, setEditarMesesManual] = useState(false);
  const [mesesManual, setMesesManual] = useState("");
  const [calcularMultaFgts, setCalcularMultaFgts] = useState(true);

  // Passo 3, só quando há período sem registro
  const [vinculoSalario, setVinculoSalario] = useState("");
  const [recebiaSalario, setRecebiaSalario] = useState(true);
  const [recebido, setRecebido] = useState<Record<RecebidoCampo, string>>(RECEBIDO_VAZIO);
  const [recebidoOutrosDescricao, setRecebidoOutrosDescricao] = useState("");

  // Pedidos adicionais, no último passo antes do resultado
  const [multa467, setMulta467] = useState(false);
  const [seguroDesemprego, setSeguroDesemprego] = useState("");
  const [outrosPedidosValor, setOutrosPedidosValor] = useState("");
  const [outrosPedidosDescricao, setOutrosPedidosDescricao] = useState("");

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

  // Tracks how concepcao/partoPrevisao were actually derived, so the
  // memória de cálculo always matches the fields really used in the cálculo.
  const [concepcaoMetodo, setConcepcaoMetodo] = useState<"exame" | "dpp">("dpp");
  const [exameAplicado, setExameAplicado] = useState<{
    dataExame: Date;
    semanas: number;
    dias: number;
    idadeGestacionalDias: number;
    dumEstimada: Date;
  } | null>(null);

  const exameConcepcaoDate = useMemo(() => {
    if (!exameData || exameSemanas === "") return null;
    const eDate = parseDateFromInput(exameData);
    if (!eDate) return null;
    const totalDias = Number(exameSemanas) * 7 + (Number(exameDias) || 0);
    if (totalDias <= 0) return null;
    const dumEstimada = addDays(eDate, -totalDias);
    return addDays(dumEstimada, 14); // DUM + 14 = concepção estimada
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

      const eDate = parseDateFromInput(exameData)!;
      const sem = Number(exameSemanas);
      const dias = Number(exameDias) || 0;
      const totalDias = sem * 7 + dias;
      setExameAplicado({
        dataExame: eDate,
        semanas: sem,
        dias,
        idadeGestacionalDias: totalDias,
        dumEstimada: addDays(eDate, -totalDias),
      });
      setConcepcaoMetodo("exame");
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

  const setRec = (campo: RecebidoCampo, valor: string) =>
  setRecebido((prev) => ({ ...prev, [campo]: valor }));

  // ------------------------------------------------------------------
  // Registro e passos
  // ------------------------------------------------------------------
  const semRegistro = tipoRegistro === "sem_registro";
  const registradaDepois = tipoRegistro === "registrada_depois";
  const temPeriodoSemRegistro = tipoRegistro !== "com_carteira";

  const steps = temPeriodoSemRegistro ?
  ["Dados da Cliente", "Contrato e Gestação", "O que ela recebeu", "Resultado"] :
  ["Dados da Cliente", "Contrato e Gestação", "Resultado"];
  const passoResultado = steps.length;
  const ultimoPassoDeDados = passoResultado - 1;

  // Sem forma escrita e anotação não existe contrato de experiência válido: o
  // contrato é tratado como por prazo indeterminado.
  const motivosVisiveis = semRegistro ?
  MOTIVOS_SAIDA.filter((m) => m.valor !== "fim_experiencia") :
  MOTIVOS_SAIDA;

  const escolherTipoRegistro = (novo: TipoRegistro) => {
    setTipoRegistro(novo);
    if (novo === "sem_registro" && motivoSaida === "fim_experiencia") {
      setMotivoSaida("dispensa_sem_justa_causa");
    }
  };

  const salarioNumero = Number(salario) || 0;
  const pisoNumero = Number(piso) || 0;
  const pisoAplicado = pisoNumero > salarioNumero && salarioNumero > 0;

  // ------------------------------------------------------------------
  // Datas e validação
  // ------------------------------------------------------------------
  const concepcaoDate = parseDateFromInput(concepcao);
  const demissaoDate = parseDateFromInput(demissao);
  const partoDate = parseDateFromInput(partoPrevisao);
  const inicioDate = parseDateFromInput(vinculoInicio);
  const admissaoDate = parseDateFromInput(admissao);
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
  salario !== "" &&
  salarioNumero > 0;

  // Com carteira, a admissão só é indispensável quando o FGTS do contrato entra
  // na base da multa. Registrada depois, ela marca o fim do período sem registro.
  const admissaoObrigatoria = registradaDepois || (
  tipoRegistro === "com_carteira" && calcularMultaFgts && incluiFgtsDoContrato(motivoSaida));

  const erroOrdemDatas = (() => {
    if (registradaDepois && inicioDate && admissaoDate && inicioDate >= admissaoDate) {
      return "O início sem carteira precisa ser anterior ao registro.";
    }
    if (registradaDepois && admissaoDate && demissaoDate && admissaoDate > demissaoDate) {
      return "O registro precisa ser anterior à saída.";
    }
    if (semRegistro && inicioDate && demissaoDate && inicioDate > demissaoDate) {
      return "O início do trabalho precisa ser anterior à saída.";
    }
    return null;
  })();

  const datasContratoValidas =
  tipoRegistro === "com_carteira" ?
  !admissaoObrigatoria || admissao !== "" :
  registradaDepois ?
  !!inicioDate && !!admissaoDate && !erroOrdemDatas :
  !!inicioDate && !erroOrdemDatas;

  const isStep2Valid =
  demissao !== "" &&
  concepcao !== "" &&
  partoPrevisao !== "" &&
  datasContratoValidas;

  const isStep3Valid = !registradaDepois || vinculoSalario === "" || Number(vinculoSalario) > 0;

  // ------------------------------------------------------------------
  // Cálculo
  // ------------------------------------------------------------------
  const calcular = () => {
    // Build concepcao info from the fields actually used in the cálculo,
    // usando o método (exame vs. datas diretas) rastreado a cada edição —
    // assim a memória de cálculo nunca destoa do concepcao/partoPrevisao reais.
    const concDateAtual = concepcaoDate!;
    const pDateAtual = partoDate!;
    let concepcaoInfo: ConcepcaoInfo;
    if (concepcaoMetodo === "exame" && exameAplicado) {
      concepcaoInfo = {
        metodo: "exame",
        dataExame: exameAplicado.dataExame,
        semanasExame: exameAplicado.semanas,
        diasExame: exameAplicado.dias,
        idadeGestacionalDias: exameAplicado.idadeGestacionalDias,
        dumEstimada: exameAplicado.dumEstimada,
        concepcaoEstimada: concDateAtual,
        dpp: pDateAtual,
      };
    } else {
      concepcaoInfo = {
        metodo: "dpp",
        dpp: pDateAtual,
        concepcaoEstimada: concDateAtual,
      };
    }

    const vinculo: CalcInput["vinculo"] = temPeriodoSemRegistro ?
    {
      inicio: inicioDate!,
      // Sem registro, o período vai até o último dia de trabalho; registrada
      // depois, até a véspera do registro.
      fim: semRegistro ? demissaoDate! : addDays(admissaoDate!, -1),
      salario: semRegistro ? salarioNumero : Number(vinculoSalario) || salarioNumero,
      recebiaSalario,
      recebido: {
        salarios: recebiaSalario ? 0 : valorNumerico(recebido.salarios),
        decimoTerceiro: valorNumerico(recebido.decimoTerceiro),
        ferias: valorNumerico(recebido.ferias),
        fgts: valorNumerico(recebido.fgts),
        rescisorias: valorNumerico(recebido.rescisorias),
        outros: valorNumerico(recebido.outros),
        outrosDescricao: recebidoOutrosDescricao.trim() || undefined,
      },
    } :
    null;

    const input: CalcInput = {
      nome: nome.trim(),
      nascimento: nascimento ? parseDateFromInput(nascimento) : null,
      salario: salarioNumero,
      demissao: demissaoDate!,
      concepcao: concDateAtual,
      partoPrevisao: pDateAtual,
      pediuAConta: motivoSaida === "pedido_demissao",
      motivoSaida,
      tipoRegistro,
      piso: pisoAplicado ? pisoNumero : null,
      mesesManual: editarMesesManual && mesesManual !== "" ? Number(mesesManual) : null,
      empregadaDomestica,
      admissao: semRegistro ? null : admissaoDate,
      calcularMultaFgts,
      vinculo,
      opcionais: {
        multa467,
        seguroDesemprego: valorNumerico(seguroDesemprego),
        outrosValor: valorNumerico(outrosPedidosValor),
        outrosDescricao: outrosPedidosDescricao.trim() || undefined,
      },
      dataReferencia: new Date(),
      concepcaoInfo,
    };

    const r = calculate(input);
    setInputData(input);
    setResult(r);
    setStep(passoResultado);
    setShowMemoria(false);

    // Auto-salvar no banco
    (async () => {
      const serialInput = serializeInput(input);
      const serialResult = serializeResult(r);
      // Registra quem fez o cálculo, agora que cada pessoa entra com a própria conta.
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await supabase.from("consultas_calculo").insert({
        user_id: auth.user?.id ?? null,
        nome_completo: input.nome,
        data_nascimento: input.nascimento ? input.nascimento.toISOString().slice(0, 10) : null,
        valor_total_indenizacao: r.totalFinal,
        dados_informados: serialInput as any,
        resultado_resumido: buildResumoJson(input, r) as any,
        memoria_calculo_completa: { input: serialInput, result: serialResult } as any,
      });
      if (error) {
        toast.error("Não foi possível salvar o cálculo: " + error.message);
      } else {
        toast.success("Cálculo salvo no histórico.");
      }
    })();
  };

  const avancarDoPasso2 = () => {
    if (!isStep2Valid) return;
    if (temPeriodoSemRegistro) {
      // Registrada depois, o salário do período informal parte do da carteira.
      if (registradaDepois && vinculoSalario === "") setVinculoSalario(salario);
      setStep(3);
    } else {
      calcular();
    }
  };

  const handleReset = () => {
    setStep(1);
    setNome("");
    setNascimento("");
    setTipoRegistro("com_carteira");
    setMotivoSaida("dispensa_sem_justa_causa");
    setEmpregadaDomestica(false);
    setSalario("");
    setPiso("");
    setMostrarPiso(false);
    setVinculoInicio("");
    setAdmissao("");
    setDemissao("");
    setConcepcao("");
    setPartoPrevisao("");
    setEditarMesesManual(false);
    setMesesManual("");
    setCalcularMultaFgts(true);
    setVinculoSalario("");
    setRecebiaSalario(true);
    setRecebido(RECEBIDO_VAZIO);
    setRecebidoOutrosDescricao("");
    setMulta467(false);
    setSeguroDesemprego("");
    setOutrosPedidosValor("");
    setOutrosPedidosDescricao("");
    setUltimoEditado(null);
    setAutoConcepcao(true);
    setAutoParto(true);
    setShowExameHelper(false);
    setExameData("");
    setExameSemanas("");
    setExameDias("");
    setConcepcaoMetodo("dpp");
    setExameAplicado(null);
    setShowMemoria(false);
  };

  // ------------------------------------------------------------------
  // Trechos de tela reutilizados
  // ------------------------------------------------------------------
  const textoBaseMulta = (() => {
    if (!calcularMultaFgts) return "Ative para incluir a multa de 40% do FGTS no cálculo.";
    if (semRegistro) {
      return "Base: FGTS de todo o período trabalhado + estabilidade. Sem registro, nada foi pago na saída.";
    }
    if (registradaDepois) {
      return incluiFgtsDoContrato(motivoSaida) ?
      "Base: FGTS do período sem registro + do contrato registrado + da estabilidade." :
      "Base: FGTS do período sem registro + da estabilidade. Os 40% do contrato registrado já foram pagos na rescisão.";
    }
    return admissaoObrigatoria ?
    "Base: FGTS do período de estabilidade + FGTS do contrato. Informe a data de admissão abaixo." :
    "Base: apenas o FGTS do período de estabilidade — os 40% do contrato já foram pagos na rescisão.";
  })();

  const blocoPedidosAdicionais =
  <div className="space-y-4 rounded-lg border border-border p-4">
      <div>
        <Label className="text-sm font-semibold flex items-center gap-2">
          <Gavel className="w-4 h-4 text-primary" />
          Pedidos adicionais
        </Label>
        <p className="text-xs text-muted-foreground mt-0.5">
          Opcionais. Só entram no total quando preenchidos.
        </p>
      </div>

      <div className="flex items-start justify-between gap-3">
        <div>
          <Label htmlFor="multa467" className="text-sm font-normal cursor-pointer">
            Multa do art. 467 (50% das rescisórias)
          </Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            Costuma ser afastada quando o vínculo é contestado.
          </p>
        </div>
        <Switch id="multa467" checked={multa467} onCheckedChange={setMulta467} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="seguroDesemprego" className="text-sm font-normal">
          Seguro-desemprego não recebido
        </Label>
        <Input
        id="seguroDesemprego"
        type="number"
        min="0"
        step="0.01"
        inputMode="decimal"
        placeholder="0,00"
        value={seguroDesemprego}
        onChange={(e) => setSeguroDesemprego(e.target.value)} />

        <p className="text-xs text-muted-foreground">
          Soma das parcelas a que ela teria direito (Súmula 389, II, do TST).
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="outrosPedidos" className="text-sm font-normal">
          Dano moral ou outro pedido
        </Label>
        <Input
        id="outrosPedidos"
        type="number"
        min="0"
        step="0.01"
        inputMode="decimal"
        placeholder="0,00"
        value={outrosPedidosValor}
        onChange={(e) => setOutrosPedidosValor(e.target.value)} />

        <Input
        placeholder="Descrição (ex.: dano moral pela dispensa da gestante)"
        value={outrosPedidosDescricao}
        onChange={(e) => setOutrosPedidosDescricao(e.target.value)} />

      </div>
    </div>;


  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8 print:hidden">
          <Logo size="lg" className="mx-auto mb-3" />
          <h1 className="text-2xl font-display font-bold text-foreground">
            Cálculos Gestante
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Cálculo de indenização do período de estabilidade
          </p>
          <div className="flex flex-wrap gap-2 justify-center mt-4">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => navigate("/consultas")}>

              <Search className="w-4 h-4" />
              Pesquisar cálculos já realizados
            </Button>
            {ehAdmin &&
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => navigate("/usuarios")}>

                <Users className="w-4 h-4" />
                Usuários
              </Button>
            }
            <Button variant="ghost" size="sm" className="gap-2" onClick={handleLogout}>
              <LogOut className="w-4 h-4" />
              Sair
            </Button>
          </div>
        </div>

        <div className="print:hidden">
          <StepIndicator currentStep={step} steps={steps} />
        </div>

        {/* Passo 1 */}
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
                <Label htmlFor="nascimento">Data de nascimento</Label>
                <Input id="nascimento" type="date" value={nascimento} onChange={(e) => setNascimento(e.target.value)} />
              </div>

              {/* Registro */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">Como era o registro?</Label>
                <div className="grid gap-2">
                  {TIPOS_REGISTRO.map((t) =>
                <CartaoOpcao
                  key={t.valor}
                  ativo={tipoRegistro === t.valor}
                  titulo={t.titulo}
                  descricao={t.descricao}
                  Icone={t.icone}
                  onClick={() => escolherTipoRegistro(t.valor)} />

                )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="salario">
                  {semRegistro ? "Salário combinado *" : "Salário na carteira (CTPS) *"}
                </Label>
                <Input
                id="salario"
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                placeholder="3500.00"
                value={salario}
                onChange={(e) => setSalario(e.target.value)} />

                {semRegistro &&
              <p className="text-xs text-muted-foreground">
                    O valor que ela recebia por mês, mesmo sem registro.
                  </p>
              }
              </div>

              {/* Piso da categoria */}
              {!mostrarPiso && !piso ?
            <button
              type="button"
              onClick={() => setMostrarPiso(true)}
              className="text-xs text-primary hover:underline">

                  Ela ganhava menos que o piso ou o salário mínimo?
                </button> :

            <div className="space-y-2">
                  <Label htmlFor="piso">Piso da categoria ou salário mínimo</Label>
                  <Input
                id="piso"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                placeholder="0,00"
                value={piso}
                onChange={(e) => setPiso(e.target.value)} />

                  <p className="text-xs text-muted-foreground">
                    {pisoAplicado ?
                `As verbas serão calculadas sobre ${formatBRL(pisoNumero)}${
                temPeriodoSemRegistro ? ", e a diferença do período sem registro será cobrada" : ""}.` :
                "Só é usado quando for maior que o salário informado."}
                  </p>
                </div>
            }

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

              {/* Motivo da saída */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">Como ela saiu da empresa?</Label>
                <div className="grid gap-2">
                  {motivosVisiveis.map((m) =>
                <CartaoOpcao
                  key={m.valor}
                  ativo={motivoSaida === m.valor}
                  titulo={m.titulo}
                  descricao={semRegistro && m.descricaoSemRegistro ? m.descricaoSemRegistro : m.descricao}
                  Icone={m.icone}
                  onClick={() => setMotivoSaida(m.valor)} />

                )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Em qualquer um dos casos o contrato se projeta até o fim da estabilidade e a dispensa sem justa causa só ocorre ao final.
                </p>
              </div>

              <Button onClick={() => isStep1Valid && setStep(2)} disabled={!isStep1Valid} className="w-full gap-2 mt-2">
                Próximo
                <ArrowRight className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
        }

        {/* Passo 2 */}
        {step === 2 &&
        <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle className="text-lg">Dados do Contrato e Gestação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {temPeriodoSemRegistro &&
            <div className="space-y-2">
                  <Label htmlFor="vinculoInicio">Começou a trabalhar em *</Label>
                  <Input id="vinculoInicio" type="date" value={vinculoInicio} onChange={(e) => setVinculoInicio(e.target.value)} />
                  <p className="text-xs text-muted-foreground">
                    Primeiro dia de trabalho, ainda sem carteira.
                  </p>
                </div>
            }

              {registradaDepois &&
            <div className="space-y-2">
                  <Label htmlFor="admissao">Foi registrada em *</Label>
                  <Input id="admissao" type="date" value={admissao} onChange={(e) => setAdmissao(e.target.value)} />
                  <p className="text-xs text-muted-foreground">
                    Data de admissão anotada na carteira.
                  </p>
                </div>
            }

              <div className="space-y-2">
                <Label htmlFor="demissao">
                  {semRegistro ? "Último dia de trabalho *" : registradaDepois ? "Data de saída *" : "Data de demissão *"}
                </Label>
                <Input id="demissao" type="date" value={demissao} onChange={(e) => setDemissao(e.target.value)} />
              </div>

              {erroOrdemDatas &&
            <p className="text-xs text-destructive">{erroOrdemDatas}</p>
            }

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
                        <p><span className="font-medium">Concepção:</span> {exameConcepcaoDate.toLocaleDateString("pt-BR")}</p>
                        <p><span className="font-medium">Previsão do parto:</span> {examePartoDate.toLocaleDateString("pt-BR")}</p>
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
                onChange={(e) => {setConcepcao(e.target.value);setUltimoEditado("concepcao");setConcepcaoMetodo("dpp");}} />

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
                    A concepção é posterior à saída — confira os dados.
                  </AlertDescription>
                </Alert>
            }

              <div className="space-y-2">
                <Label htmlFor="parto">Data do parto / previsão *</Label>
                <Input
                id="parto"
                type="date"
                value={partoPrevisao}
                onChange={(e) => {setPartoPrevisao(e.target.value);setUltimoEditado("parto");setConcepcaoMetodo("dpp");}} />

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
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {mesesAtePartoAuto !== null &&
                <span>
                        {mesesAtePartoAuto} {mesesAtePartoAuto === 1 ? "mês" : "meses"} até o parto + 5 meses fixos = {mesesEstabilidadeAuto} meses
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
                <p className="text-xs text-muted-foreground">{textoBaseMulta}</p>
              </div>

              {/* Data de admissão, só com carteira desde o início */}
              {tipoRegistro === "com_carteira" &&
            <div className="space-y-2">
                  <Label htmlFor="admissao">Data de admissão {admissaoObrigatoria ? "*" : ""}</Label>
                  <Input id="admissao" type="date" value={admissao} onChange={(e) => setAdmissao(e.target.value)} />
                  {admissaoObrigatoria && !admissao ?
              <p className="text-xs text-destructive">
                      Obrigatória para apurar o FGTS do contrato que entra na base da multa de 40%.
                    </p> :

              <p className="text-xs text-muted-foreground">
                      Também conta o tempo de casa para o aviso prévio proporcional.
                    </p>
              }
                </div>
            }

              {/* Com carteira, os pedidos adicionais ficam aqui: é o último passo de dados. */}
              {!temPeriodoSemRegistro && blocoPedidosAdicionais}

              <div className="flex gap-3 mt-2">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1 gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Voltar
                </Button>
                <Button onClick={avancarDoPasso2} disabled={!isStep2Valid} className="flex-1 gap-2">
                  {temPeriodoSemRegistro ? "Próximo" : "Calcular"}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        }

        {/* Passo 3: o que ela já recebeu no período sem registro */}
        {step === 3 && temPeriodoSemRegistro &&
        <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Wallet className="w-5 h-5 text-primary" />
                O que ela já recebeu
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {semRegistro ?
              "Sem registro, o comum é ela ter recebido só o salário. Deixe em branco o que não foi pago." :
              "Do período sem carteira. Deixe em branco o que não foi pago."}
              </p>

              {registradaDepois &&
            <div className="space-y-2">
                  <Label htmlFor="vinculoSalario">Salário no período sem registro</Label>
                  <Input
                id="vinculoSalario"
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                placeholder={salario || "3500.00"}
                value={vinculoSalario}
                onChange={(e) => setVinculoSalario(e.target.value)} />

                  <p className="text-xs text-muted-foreground">
                    Vem igual ao da carteira. Ajuste se o combinado era outro.
                  </p>
                </div>
            }

              <div className="rounded-lg border-2 border-primary/20 bg-accent/20 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="recebiaSalario" className="text-base font-semibold cursor-pointer">
                    Recebia o salário todo mês?
                  </Label>
                  <Switch id="recebiaSalario" checked={recebiaSalario} onCheckedChange={setRecebiaSalario} />
                </div>
                <p className="text-xs text-muted-foreground">
                  {recebiaSalario ?
                pisoAplicado ?
                "Os salários contam como pagos; fica só a diferença para o piso." :
                "Os salários contam como pagos e não são cobrados de novo. O FGTS continua incidindo sobre eles." :
                "Os salários do período serão cobrados, descontado o que você informar abaixo."}
                </p>
                {!recebiaSalario &&
              <div className="space-y-1.5">
                    <Label htmlFor="rec-salarios" className="text-sm font-normal">Salários que ela chegou a receber</Label>
                    <Input
                  id="rec-salarios"
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={recebido.salarios}
                  onChange={(e) => setRec("salarios", e.target.value)} />

                  </div>
              }
              </div>

              {CAMPOS_RECEBIDO.map((c) =>
            <div key={c.campo} className="space-y-1.5">
                  <Label htmlFor={`rec-${c.campo}`} className="text-sm font-normal">{c.label}</Label>
                  <Input
                id={`rec-${c.campo}`}
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                placeholder="0,00"
                value={recebido[c.campo]}
                onChange={(e) => setRec(c.campo, e.target.value)} />

                </div>
            )}

              <div className="space-y-1.5">
                <Label htmlFor="rec-outros" className="text-sm font-normal">Outros valores recebidos</Label>
                <Input
                id="rec-outros"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                placeholder="0,00"
                value={recebido.outros}
                onChange={(e) => setRec("outros", e.target.value)} />

                <Input
                placeholder="A que se referem (opcional)"
                value={recebidoOutrosDescricao}
                onChange={(e) => setRecebidoOutrosDescricao(e.target.value)} />

              </div>

              {blocoPedidosAdicionais}

              <div className="flex gap-3 mt-2">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1 gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Voltar
                </Button>
                <Button onClick={calcular} disabled={!isStep2Valid || !isStep3Valid} className="flex-1 gap-2">
                  Calcular
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        }

        {/* Resultado */}
        {step === passoResultado && result && inputData && (
        showMemoria ?
        <MemoriaCalculoDetalhada
          input={inputData}
          result={result}
          onClose={() => setShowMemoria(false)} /> :
        showConcepcao ?
        <ConcepcaoCalculoPage
          input={inputData}
          onClose={() => setShowConcepcao(false)} /> :
        showResumo ?
        <ResumoCalculos
          input={inputData}
          result={result}
          onClose={() => setShowResumo(false)} /> :
        <ResultCard
          input={inputData}
          result={result}
          onReset={handleReset}
          onBack={() => setStep(ultimoPassoDeDados)}
          onOpenMemoria={() => setShowMemoria(true)}
          onOpenConcepcao={() => setShowConcepcao(true)}
          onOpenResumo={() => setShowResumo(true)} />)
        }
      </div>
    </div>);

};

export default Index;
