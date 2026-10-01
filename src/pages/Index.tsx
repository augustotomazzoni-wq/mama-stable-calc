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
  ehContratoDeExperiencia,
  presumeRescisaoPaga,
  resolveMotivoSaida,
  resolveTipoRegistro,
  avisoPadrao,
  AVISO_NA_SAIDA_LABEL,
  AvisoNaSaida,
  CalcInput,
  CalcResult,
  ConcepcaoInfo,
  MotivoSaida,
  TipoRegistro } from
"@/lib/calculator";
import { parseDateFromInput, toInputDate, addDays, formatBRL } from "@/lib/dateUtils";
import { useLocation, useNavigate } from "react-router-dom";
import { useSessao } from "@/hooks/useSessao";
import { useRascunho } from "@/hooks/useRascunho";
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
/**
 * Quem rompeu o contrato. Combinado com o tipo de contrato, dá o motivo da
 * saída — duas perguntas curtas no lugar de uma lista de cinco cartões longos.
 */
const ACOES: { valor: Acao; titulo: string; descricao: string; icone: LucideIcon }[] = [
  {
    valor: "deram_a_conta",
    titulo: "Deram a conta",
    descricao: "A empresa dispensou. Presume-se que a rescisão foi paga na saída.",
    icone: UserMinus,
  },
  {
    valor: "ela_pediu",
    titulo: "Ela pediu a conta",
    descricao: "Pedido de demissão nulo sem assistência sindical (CLT 500). Nada foi pago.",
    icone: DoorOpen,
  },
  {
    valor: "acabou_o_prazo",
    titulo: "Acabou o prazo",
    descricao: "O contrato a termo chegou ao fim. Só existe no contrato de experiência.",
    icone: CalendarClock,
  },
];

const CONTRATOS: { valor: TipoContrato; titulo: string; descricao: string; icone: LucideIcon }[] = [
  {
    valor: "indeterminado",
    titulo: "Prazo indeterminado",
    descricao: "Contrato comum, sem data para acabar.",
    icone: FileText,
  },
  {
    valor: "experiencia",
    titulo: "Contrato de experiência",
    descricao: "Contrato a termo. Reconhecida a estabilidade, converte-se em indeterminado.",
    icone: CalendarClock,
  },
];

type Acao = "deram_a_conta" | "ela_pediu" | "acabou_o_prazo";
type TipoContrato = "indeterminado" | "experiencia";

/** As duas respostas viram o motivo que o cálculo entende. */
function motivoDe(acao: Acao, contrato: TipoContrato): MotivoSaida {
  if (contrato === "experiencia") {
    if (acao === "deram_a_conta") return "dispensa_na_experiencia";
    if (acao === "ela_pediu") return "pedido_na_experiencia";
    return "fim_experiencia";
  }
  return acao === "deram_a_conta" ? "dispensa_sem_justa_causa" : "pedido_demissao";
}

/** Caminho inverso, para reabrir um cálculo salvo nos dois seletores. */
function acaoDe(motivo: MotivoSaida): { acao: Acao; contrato: TipoContrato } {
  switch (motivo) {
    case "dispensa_na_experiencia":
      return { acao: "deram_a_conta", contrato: "experiencia" };
    case "pedido_na_experiencia":
      return { acao: "ela_pediu", contrato: "experiencia" };
    case "fim_experiencia":
      return { acao: "acabou_o_prazo", contrato: "experiencia" };
    case "pedido_demissao":
      return { acao: "ela_pediu", contrato: "indeterminado" };
    default:
      return { acao: "deram_a_conta", contrato: "indeterminado" };
  }
}

const MOTIVOS_SAIDA_ANTIGOS: {
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
    titulo: "Acabou a experiência no prazo",
    descricao:
      "Contrato a termo chegou ao fim. Sem aviso prévio, e os 40% do contrato entram: no término a empresa não paga essa multa (Súmula 244, III, do TST).",
    icone: CalendarClock,
  },
  {
    valor: "dispensa_na_experiencia",
    titulo: "Deram a conta na experiência",
    descricao:
      "Experiência rompida antes do prazo pela empresa. Sem aviso prévio, e os 40% do contrato ficam de fora: já foram pagos no TRCT.",
    icone: UserMinus,
  },
  {
    valor: "pedido_na_experiencia",
    titulo: "Ela pediu a conta na experiência",
    descricao:
      "Experiência rompida antes do prazo por ela, nulo sem assistência sindical (CLT 500). Sem aviso prévio, e os 40% do contrato entram.",
    icone: DoorOpen,
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
  const [acao, setAcao] = useState<Acao>("deram_a_conta");
  const [tipoContrato, setTipoContrato] = useState<TipoContrato>("indeterminado");
  const motivoSaida = motivoDe(acao, tipoContrato);
  // O que aconteceu com o aviso prévio na saída.
  const [avisoNaSaida, setAvisoNaSaida] = useState<AvisoNaSaida | "">("");
  const [avisoDescontadoValor, setAvisoDescontadoValor] = useState("");
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
  // O que a empresa pagou na rescisão, verba a verba. Abate de cada verba
  // correspondente no cálculo projetado até o fim da estabilidade.
  const [recebidoRescisao, setRecebidoRescisao] = useState({
    avisoPrevio: "",
    decimoTerceiroAviso: "",
    feriasAviso: "",
    fgtsAviso: "",
    multa477: "",
    multa40: "",
    outros: "",
    outrosDescricao: "",
  });
  const mudarRecebido = (campo: keyof typeof recebidoRescisao, valor: string) =>
  setRecebidoRescisao((atual) => ({ ...atual, [campo]: valor }));
  // Na dispensa o padrão é rescisão quitada; os campos só abrem ao marcar que
  // ela não recebeu tudo.
  const [naoRecebeuTudo, setNaoRecebeuTudo] = useState(false);

  // Passo 3, só quando há período sem registro
  const [vinculoSalario, setVinculoSalario] = useState("");
  const [recebiaSalario, setRecebiaSalario] = useState(true);
  const [recebido, setRecebido] = useState<Record<RecebidoCampo, string>>(RECEBIDO_VAZIO);
  const [recebidoOutrosDescricao, setRecebidoOutrosDescricao] = useState("");

  // Pedidos adicionais, no último passo antes do resultado
  const [seguroDesemprego, setSeguroDesemprego] = useState("");
  const [outrosPedidosValor, setOutrosPedidosValor] = useState("");
  const [outrosPedidosDescricao, setOutrosPedidosDescricao] = useState("");

  // Retrato do formulário para o rascunho. Só os campos digitados: o
  // resultado e as telas abertas não entram.
  const retrato = useMemo(
    () => ({
      nome, nascimento, tipoRegistro, salario, piso, mostrarPiso,
      acao, tipoContrato, avisoNaSaida, avisoDescontadoValor, empregadaDomestica,
      vinculoInicio, admissao, demissao, concepcao, partoPrevisao,
      editarMesesManual, mesesManual, calcularMultaFgts,
      recebidoRescisao, naoRecebeuTudo,
      vinculoSalario, recebiaSalario, recebido, recebidoOutrosDescricao,
      seguroDesemprego, outrosPedidosValor, outrosPedidosDescricao,
    }),
    [
      nome, nascimento, tipoRegistro, salario, piso, mostrarPiso,
      acao, tipoContrato, avisoNaSaida, avisoDescontadoValor, empregadaDomestica,
      vinculoInicio, admissao, demissao, concepcao, partoPrevisao,
      editarMesesManual, mesesManual, calcularMultaFgts,
      recebidoRescisao, naoRecebeuTudo,
      vinculoSalario, recebiaSalario, recebido, recebidoOutrosDescricao,
      seguroDesemprego, outrosPedidosValor, outrosPedidosDescricao,
    ],
  );
  // Em branco não vale a pena guardar.
  const formularioVazio =
  nome.trim() === "" && salario === "" && demissao === "" && concepcao === "";
  const { rascunho, descartar } = useRascunho(retrato, formularioVazio);
  const [rascunhoVisivel, setRascunhoVisivel] = useState(true);

  const retomarRascunho = () => {
    if (!rascunho) return;
    const v = rascunho.valores;
    setNome(v.nome); setNascimento(v.nascimento); setTipoRegistro(v.tipoRegistro);
    setSalario(v.salario); setPiso(v.piso); setMostrarPiso(v.mostrarPiso);
    setAcao(v.acao); setTipoContrato(v.tipoContrato);
    setAvisoNaSaida(v.avisoNaSaida); setAvisoDescontadoValor(v.avisoDescontadoValor);
    setEmpregadaDomestica(v.empregadaDomestica);
    setVinculoInicio(v.vinculoInicio); setAdmissao(v.admissao);
    setDemissao(v.demissao); setConcepcao(v.concepcao); setPartoPrevisao(v.partoPrevisao);
    setEditarMesesManual(v.editarMesesManual); setMesesManual(v.mesesManual);
    setCalcularMultaFgts(v.calcularMultaFgts);
    setRecebidoRescisao(v.recebidoRescisao); setNaoRecebeuTudo(v.naoRecebeuTudo);
    setVinculoSalario(v.vinculoSalario); setRecebiaSalario(v.recebiaSalario);
    setRecebido(v.recebido); setRecebidoOutrosDescricao(v.recebidoOutrosDescricao);
    setSeguroDesemprego(v.seguroDesemprego);
    setOutrosPedidosValor(v.outrosPedidosValor);
    setOutrosPedidosDescricao(v.outrosPedidosDescricao);
    setRascunhoVisivel(false);
    toast.success("Rascunho retomado.");
  };

  /** Preenche o formulário a partir de um cálculo salvo, para ajustar e refazer. */
  const preencherDe = (v: CalcInput) => {
    const data = (d: Date | null | undefined) => (d ? toInputDate(d) : "");
    const numero = (n: number | null | undefined) => (n ? String(n) : "");
    const { acao: a, contrato } = acaoDe(resolveMotivoSaida(v));
    setNome(v.nome);
    setNascimento(data(v.nascimento));
    setTipoRegistro(resolveTipoRegistro(v));
    setSalario(numero(v.salario));
    setPiso(numero(v.piso));
    setMostrarPiso(!!v.piso && v.piso > 0);
    setAcao(a);
    setTipoContrato(contrato);
    setAvisoNaSaida(v.avisoNaSaida ?? "");
    setAvisoDescontadoValor(numero(v.avisoDescontadoValor));
    setEmpregadaDomestica(v.empregadaDomestica);
    setAdmissao(data(v.admissao));
    setDemissao(data(v.demissao));
    setConcepcao(data(v.concepcao));
    setPartoPrevisao(data(v.partoPrevisao));
    setEditarMesesManual(v.mesesManual !== null);
    setMesesManual(v.mesesManual !== null ? String(v.mesesManual) : "");
    setCalcularMultaFgts(v.calcularMultaFgts);
    setNaoRecebeuTudo(!!v.naoRecebeuTudoNaSaida);
    const r = v.recebidoNaRescisao;
    setRecebidoRescisao({
      avisoPrevio: numero(r?.avisoPrevio),
      decimoTerceiroAviso: numero(r?.decimoTerceiroAviso),
      feriasAviso: numero(r?.feriasAviso),
      fgtsAviso: numero(r?.fgtsAviso),
      multa477: numero(r?.multa477),
      multa40: numero(v.multa40Recebida),
      outros: numero(r?.outros),
      outrosDescricao: r?.outrosDescricao ?? "",
    });
    setVinculoInicio(data(v.vinculo?.inicio));
    setVinculoSalario(numero(v.vinculo?.salario));
    setRecebiaSalario(v.vinculo?.recebiaSalario ?? true);
    setRecebido({
      salarios: numero(v.vinculo?.recebido.salarios),
      decimoTerceiro: numero(v.vinculo?.recebido.decimoTerceiro),
      ferias: numero(v.vinculo?.recebido.ferias),
      fgts: numero(v.vinculo?.recebido.fgts),
      rescisorias: numero(v.vinculo?.recebido.rescisorias),
      outros: numero(v.vinculo?.recebido.outros),
    });
    setRecebidoOutrosDescricao(v.vinculo?.recebido.outrosDescricao ?? "");
    setSeguroDesemprego(numero(v.opcionais?.seguroDesemprego));
    setOutrosPedidosValor(numero(v.opcionais?.outrosValor));
    setOutrosPedidosDescricao(v.opcionais?.outrosDescricao ?? "");
    setStep(1);
    setRascunhoVisivel(false);
  };

  // Chegou de "Duplicar e ajustar" numa consulta salva.
  const duplicarDe = (location.state as { duplicar?: CalcInput } | null)?.duplicar;
  useEffect(() => {
    if (!duplicarDe) return;
    preencherDe(duplicarDe);
    navigate(location.pathname, { replace: true, state: null });
    toast.success("Cálculo copiado. Ajuste o que precisar e recalcule.");
    // Só na chegada: depois o formulário é a verdade.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duplicarDe]);

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
  const contratosVisiveis = semRegistro ?
  CONTRATOS.filter((c) => c.valor !== "experiencia") :
  CONTRATOS;
  // "Acabou o prazo" só existe em contrato a termo.
  const acoesVisiveis = tipoContrato === "experiencia" ?
  ACOES :
  ACOES.filter((a) => a.valor !== "acabou_o_prazo");

  const escolherTipoRegistro = (novo: TipoRegistro) => {
    setTipoRegistro(novo);
    if (novo === "sem_registro" && tipoContrato === "experiencia") {
      setTipoContrato("indeterminado");
      if (acao === "acabou_o_prazo") setAcao("deram_a_conta");
    }
  };

  const escolherContrato = (novo: TipoContrato) => {
    setTipoContrato(novo);
    if (novo === "indeterminado" && acao === "acabou_o_prazo") setAcao("deram_a_conta");
  };

  // Reproduz na tela o que o cálculo vai presumir pago, para o número não
  // aparecer do nada no memorial.
  const presumeQuitado = presumeRescisaoPaga(motivoSaida, tipoRegistro);

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
  tipoRegistro === "com_carteira" && calcularMultaFgts);

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
      recebidoNaRescisao: {
        avisoPrevio: valorNumerico(recebidoRescisao.avisoPrevio),
        decimoTerceiroAviso: valorNumerico(recebidoRescisao.decimoTerceiroAviso),
        feriasAviso: valorNumerico(recebidoRescisao.feriasAviso),
        fgtsAviso: valorNumerico(recebidoRescisao.fgtsAviso),
        multa477: valorNumerico(recebidoRescisao.multa477),
        outros: valorNumerico(recebidoRescisao.outros),
        outrosDescricao: recebidoRescisao.outrosDescricao.trim() || undefined,
      },
      multa40Recebida: valorNumerico(recebidoRescisao.multa40),
      avisoNaSaida: avisoNaSaida || avisoPadrao(motivoSaida),
      ...(avisoDescontadoValor !== "" ?
      { avisoDescontadoValor: valorNumerico(avisoDescontadoValor) } :
      {}),
      naoRecebeuTudoNaSaida: naoRecebeuTudo,
      vinculo,
      opcionais: {
        multa467: false,
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
    descartar();
    setRascunhoVisivel(false);
    setAcao("deram_a_conta");
    setTipoContrato("indeterminado");
    setAvisoNaSaida("");
    setAvisoDescontadoValor("");
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
    if (empregadaDomestica) {
      return "Contrato doméstico não tem multa de 40%: os 3,2% da indenização compensatória (LC 150/2015, art. 22) fazem as vezes dela e já entram na verba de FGTS.";
    }
    if (!calcularMultaFgts) return "Ative para incluir a multa de 40% do FGTS no cálculo.";
    if (semRegistro) {
      return "Base: FGTS de todo o período trabalhado + estabilidade. Sem registro, nada foi pago na saída.";
    }
    const incluiContrato = incluiFgtsDoContrato(motivoSaida, tipoRegistro);
    if (registradaDepois) {
      return incluiContrato ?
      "Base: FGTS do período sem registro + do contrato registrado + da estabilidade." :
      "Base: FGTS do período sem registro + da estabilidade. Os 40% do contrato registrado já foram pagos na rescisão.";
    }
    if (!incluiContrato) {
      return motivoSaida === "dispensa_na_experiencia" ?
      "Base: apenas o FGTS do período de estabilidade — na rescisão antecipada da experiência a empresa paga os 40% no TRCT." :
      "Base: apenas o FGTS do período de estabilidade — os 40% do contrato já foram pagos na rescisão.";
    }
    if (motivoSaida === "fim_experiencia") {
      return admissaoObrigatoria && !admissao ?
      "Base: FGTS da estabilidade + do contrato. No fim do termo a empresa não paga 40%, então o período trabalhado entra. Informe a data de admissão abaixo." :
      "Base: FGTS da estabilidade + do contrato. No fim do termo a empresa não paga 40%, então o período trabalhado entra.";
    }
    return admissaoObrigatoria ?
    "Base: FGTS do período de estabilidade + FGTS do contrato. Informe a data de admissão abaixo." :
    "Base: FGTS do período de estabilidade + FGTS do contrato.";
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

        {/* Rascunho de um preenchimento interrompido */}
        {rascunho && rascunhoVisivel && step === 1 && formularioVazio &&
        <Card className="animate-fade-in border-primary/40 bg-accent/30 print:hidden">
            <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div>
                <p className="text-sm font-medium text-foreground">
                  Há um cálculo começado
                  {rascunho.valores.nome ? ` para ${rascunho.valores.nome}` : ""}.
                </p>
                <p className="text-xs text-muted-foreground">
                  Salvo em {new Date(rascunho.salvoEm).toLocaleString("pt-BR")} neste navegador.
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={retomarRascunho}>Retomar</Button>
                <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  descartar();
                  setRascunhoVisivel(false);
                }}>
                  Descartar
                </Button>
              </div>
            </CardContent>
          </Card>
        }

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

              {/* Que contrato era */}
              {!semRegistro &&
            <div className="space-y-2">
                  <Label className="text-base font-semibold">Que contrato era?</Label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {contratosVisiveis.map((c) =>
                <CartaoOpcao
                  key={c.valor}
                  ativo={tipoContrato === c.valor}
                  titulo={c.titulo}
                  descricao={c.descricao}
                  Icone={c.icone}
                  onClick={() => escolherContrato(c.valor)} />

                )}
                  </div>
                </div>
            }

              {/* Quem rompeu */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">Como ela saiu da empresa?</Label>
                <div className="grid gap-2">
                  {acoesVisiveis.map((a) =>
                <CartaoOpcao
                  key={a.valor}
                  ativo={acao === a.valor}
                  titulo={a.titulo}
                  descricao={a.descricao}
                  Icone={a.icone}
                  onClick={() => setAcao(a.valor)} />

                )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Em qualquer um dos casos o contrato se projeta até o fim da estabilidade e a
                  dispensa sem justa causa só ocorre ao final.
                </p>
              </div>

              {/* O que houve com o aviso prévio */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">E o aviso prévio?</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {(Object.keys(AVISO_NA_SAIDA_LABEL) as AvisoNaSaida[]).map((v) =>
                <button
                  key={v}
                  type="button"
                  onClick={() => setAvisoNaSaida(v)}
                  className={`rounded-lg border p-3 text-left text-sm transition-colors ${
                  (avisoNaSaida || avisoPadrao(motivoSaida)) === v ?
                  "border-primary bg-accent/40 font-medium" :
                  "border-border hover:bg-muted/50"}`
                  }>
                      {AVISO_NA_SAIDA_LABEL[v]}
                    </button>
                )}
                </div>
                {(avisoNaSaida || avisoPadrao(motivoSaida)) === "descontado" ?
              <div className="space-y-1.5 rounded-md border border-border bg-muted/40 p-3">
                    <Label htmlFor="avisoDescontado" className="text-xs">
                      Quanto a empresa descontou
                    </Label>
                    <Input
                  id="avisoDescontado"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder={salario ? `${Number(salario).toFixed(2)} (um salário)` : "0,00"}
                  value={avisoDescontadoValor}
                  onChange={(e) => setAvisoDescontadoValor(e.target.value)} />

                    <p className="text-[11px] text-muted-foreground">
                      Anulado o pedido de demissão, o desconto perde o fundamento e volta para ela
                      (CLT 487, § 2º). Em branco, usa um salário.
                    </p>
                  </div> :

              <p className="text-xs text-muted-foreground">
                    O aviso indenizado e o cumprido se presumem pagos e abatem do que se pede.
                  </p>
              }
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
                  <Switch
                    id="calcularMultaFgts"
                    checked={calcularMultaFgts && !empregadaDomestica}
                    disabled={empregadaDomestica}
                    onCheckedChange={setCalcularMultaFgts} />
                </div>
                <p className="text-xs text-muted-foreground">{textoBaseMulta}</p>

              </div>

              {/* O que a empresa pagou na rescisão.
                  Reconhecida a nulidade, o contrato se projeta até o fim da
                  estabilidade e a conta é refeita por inteiro. O que já foi
                  pago não some do cálculo: abate verba a verba, e o memorial
                  mostra devido, pago e diferença. */}
              <div className="rounded-lg border border-border p-4 space-y-4">
                <div>
                  <Label className="text-sm font-semibold">O que ela já recebeu na rescisão</Label>
                  {presumeQuitado ?
                  <p className="text-xs text-muted-foreground mt-1">
                      Deram a conta: entende-se que no fim do contrato ela recebeu todas as verbas
                      de uma dispensa sem justa causa — aviso prévio e reflexos, FGTS sobre o aviso
                      e a multa de 40% sobre o tempo trabalhado. O sistema calcula esses valores
                      pelo tempo de casa e pelo salário da data da saída e abate sozinho. Só a
                      multa do art. 477 não se presume paga, porque nasce das verbas da
                      estabilidade que ficaram em aberto.
                    </p> :
                  <p className="text-xs text-muted-foreground mt-1">
                      Opcional. Preencha o que constar do TRCT: cada valor abate da verba
                      correspondente, e o que sobrar é a diferença que se pede. Deixe em branco o
                      que não foi pago.
                    </p>
                  }
                </div>

                {presumeQuitado &&
                <div className="flex items-start gap-2 rounded-md border border-border bg-muted/40 p-3">
                    <Checkbox
                  id="naoRecebeuTudo"
                  checked={naoRecebeuTudo}
                  onCheckedChange={(v) => setNaoRecebeuTudo(v === true)}
                  className="mt-0.5" />

                    <Label htmlFor="naoRecebeuTudo" className="text-xs font-normal cursor-pointer leading-relaxed">
                      Ela não recebeu tudo na saída
                      <span className="block text-muted-foreground">
                        Marque para informar os valores à mão. Sem marcar, vale a presunção acima.
                      </span>
                    </Label>
                  </div>
                }

                <div
                  className={`grid gap-3 sm:grid-cols-2 ${presumeQuitado && !naoRecebeuTudo ? "hidden" : ""}`}>
                  <div className="space-y-1.5">
                    <Label htmlFor="recAviso" className="text-xs">Aviso prévio</Label>
                    <Input
                      id="recAviso" type="number" min="0" step="0.01" placeholder="0,00"
                      value={recebidoRescisao.avisoPrevio}
                      onChange={(e) => mudarRecebido("avisoPrevio", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="rec13" className="text-xs">13º sobre o aviso</Label>
                    <Input
                      id="rec13" type="number" min="0" step="0.01" placeholder="0,00"
                      value={recebidoRescisao.decimoTerceiroAviso}
                      onChange={(e) => mudarRecebido("decimoTerceiroAviso", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="recFerias" className="text-xs">Férias + 1/3 sobre o aviso</Label>
                    <Input
                      id="recFerias" type="number" min="0" step="0.01" placeholder="0,00"
                      value={recebidoRescisao.feriasAviso}
                      onChange={(e) => mudarRecebido("feriasAviso", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="recFgtsAviso" className="text-xs">FGTS sobre o aviso</Label>
                    <Input
                      id="recFgtsAviso" type="number" min="0" step="0.01" placeholder="0,00"
                      value={recebidoRescisao.fgtsAviso}
                      onChange={(e) => mudarRecebido("fgtsAviso", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="rec477" className="text-xs">Multa do art. 477</Label>
                    <Input
                      id="rec477" type="number" min="0" step="0.01" placeholder="0,00"
                      value={recebidoRescisao.multa477}
                      onChange={(e) => mudarRecebido("multa477", e.target.value)} />
                  </div>
                  {calcularMultaFgts && !empregadaDomestica && (!presumeQuitado || naoRecebeuTudo) &&
                  <div className="space-y-1.5">
                      <Label htmlFor="rec40" className="text-xs">Multa de 40% do FGTS</Label>
                      <Input
                      id="rec40" type="number" min="0" step="0.01" placeholder="0,00"
                      value={recebidoRescisao.multa40}
                      onChange={(e) => mudarRecebido("multa40", e.target.value)} />
                      <p className="text-[11px] text-muted-foreground">
                        O que constar do TRCT. Se a empresa pagou sobre base menor que a devida, a
                        diferença aparece no cálculo.
                      </p>
                    </div>
                  }
                  <div className="space-y-1.5">
                    <Label htmlFor="recOutros" className="text-xs">Outros valores</Label>
                    <Input
                      id="recOutros" type="number" min="0" step="0.01" placeholder="0,00"
                      value={recebidoRescisao.outros}
                      onChange={(e) => mudarRecebido("outros", e.target.value)} />
                    <p className="text-[11px] text-muted-foreground">
                      Abate do subtotal. É aqui que entra a indenização do art. 479 da experiência
                      rompida antes do prazo.
                    </p>
                  </div>
                </div>

                {valorNumerico(recebidoRescisao.outros) > 0 && (!presumeQuitado || naoRecebeuTudo) &&
                <div className="space-y-1.5">
                    <Label htmlFor="recOutrosDesc" className="text-xs">A que se refere</Label>
                    <Input
                    id="recOutrosDesc" placeholder="Indenização do art. 479, por exemplo"
                    value={recebidoRescisao.outrosDescricao}
                    onChange={(e) => mudarRecebido("outrosDescricao", e.target.value)} />
                  </div>
                }
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
