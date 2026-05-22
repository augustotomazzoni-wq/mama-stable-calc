import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, BarChart3, Users, TrendingUp, TrendingDown, Calendar, DollarSign,
  Clock, PieChart as PieIcon, Eye, UserCheck, Trash2, FileDown, FileSpreadsheet,
  FileText, AlertCircle,
} from "lucide-react";
import Logo from "@/components/Logo";
import { formatBRL, formatDateBR } from "@/lib/dateUtils";
import { toast } from "sonner";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  ReferenceLine, PieChart, Pie, Cell, Legend,
} from "recharts";
import * as XLSX from "xlsx";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const STATUS_OPTIONS = ["Pesquisa realizada", "Cliente", "Não contratou", "Em análise"] as const;
const SM = 1412; // salário mínimo de referência

interface Registro {
  id: string;
  nome: string;
  nascimento: Date | null;
  admissao: Date | null;
  demissao: Date | null;
  concepcao: Date | null;
  partoPrevisao: Date | null;
  primeiroAtendimento: Date;
  salario: number | null;
  pediuAConta: boolean | null;
  tipoSaida: "Pediu a conta" | "Dispensada" | "Desconhecido";
  totalIndenizacao: number | null;
  mesesIndenizacao: number | null;
  verbasRescisorias: number | null;
  totalFinal: number | null;
  status: string;
  idade: number | null;
  tempoLiquidoDias: number | null;
  aindaEmpregada: boolean;
}

function parseDate(v: any): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function diffDays(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function calcIdade(nasc: Date | null, ref: Date): number | null {
  if (!nasc) return null;
  let i = ref.getFullYear() - nasc.getFullYear();
  const m = ref.getMonth() - nasc.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < nasc.getDate())) i--;
  return i >= 0 && i < 120 ? i : null;
}

function faixaIdade(i: number | null): string {
  if (i == null) return "—";
  if (i <= 20) return "Até 20";
  if (i <= 25) return "21–25";
  if (i <= 30) return "26–30";
  if (i <= 35) return "31–35";
  if (i <= 40) return "36–40";
  return "Acima de 40";
}
const FAIXAS_IDADE = ["Até 20", "21–25", "26–30", "31–35", "36–40", "Acima de 40"];

function faixaSalario(s: number | null): string {
  if (s == null) return "—";
  if (s <= SM) return "Até 1 SM";
  if (s <= 2 * SM) return "1–2 SM";
  if (s <= 3 * SM) return "2–3 SM";
  if (s <= 5 * SM) return "3–5 SM";
  return "Acima de 5 SM";
}
const FAIXAS_SAL = ["Até 1 SM", "1–2 SM", "2–3 SM", "3–5 SM", "Acima de 5 SM"];

function media(arr: number[]): number {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

const AnaliseEstatistica = () => {
  const navigate = useNavigate();
  const [regs, setRegs] = useState<Registro[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [dataIni, setDataIni] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [tipoSaidaFilter, setTipoSaidaFilter] = useState("todos");
  const [faixaSalFilter, setFaixaSalFilter] = useState("todos");
  const [faixaIdadeFilter, setFaixaIdadeFilter] = useState("todos");
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  const carregar = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("consultas_calculo")
      .select("*")
      .eq("excluido", false)
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Erro ao carregar: " + error.message);
      setLoading(false);
      return;
    }
    const list: Registro[] = (data ?? []).map((row: any) => {
      const di = row.dados_informados ?? {};
      const mem = row.memoria_calculo_completa ?? {};
      const result = mem?.result ?? mem;
      const primeiroAtend = new Date(row.created_at);
      const nascimento = parseDate(row.data_nascimento) ?? parseDate(di.nascimento);
      const admissao = parseDate(di.admissao);
      const demissao = parseDate(di.demissao);
      const concepcao = parseDate(di.concepcao);
      const partoPrevisao = parseDate(di.partoPrevisao) ?? parseDate(result?.previsaoParto);
      const salario = typeof di.salario === "number" ? di.salario : null;
      const pediuAConta = typeof di.pediuAConta === "boolean" ? di.pediuAConta : null;
      const tipoSaida: Registro["tipoSaida"] =
        pediuAConta === true ? "Pediu a conta" :
        pediuAConta === false ? "Dispensada" : "Desconhecido";
      const totalIndenizacao = Number(row.valor_total_indenizacao) || (result?.tabela1?.total ?? null);
      const mesesIndenizacao = result?.mesesEstabilidade ?? null;
      const verbasRescisorias = result?.tabela2?.total ?? null;
      const totalFinal = result?.totalFinal ?? totalIndenizacao;
      const idade = calcIdade(nascimento, primeiroAtend);

      // Tempo líquido
      let tempoLiquidoDias: number | null = null;
      let aindaEmpregada = false;
      if (!demissao) {
        aindaEmpregada = true;
      } else if (concepcao && demissao) {
        const ref = concepcao > demissao ? concepcao : demissao;
        tempoLiquidoDias = Math.max(0, diffDays(ref, primeiroAtend));
      }

      return {
        id: row.id,
        nome: row.nome_completo,
        nascimento, admissao, demissao, concepcao, partoPrevisao,
        primeiroAtendimento: primeiroAtend,
        salario, pediuAConta, tipoSaida,
        totalIndenizacao, mesesIndenizacao, verbasRescisorias, totalFinal,
        status: row.status_cliente, idade,
        tempoLiquidoDias, aindaEmpregada,
      };
    });
    setRegs(list);
    setLoading(false);
  };

  useEffect(() => { carregar(); }, []);

  const filtrados = useMemo(() => {
    return regs.filter((r) => {
      if (busca && !r.nome.toLowerCase().includes(busca.toLowerCase())) return false;
      const dStr = r.primeiroAtendimento.toISOString().slice(0, 10);
      if (dataIni && dStr < dataIni) return false;
      if (dataFim && dStr > dataFim) return false;
      if (statusFilter !== "todos" && r.status !== statusFilter) return false;
      if (tipoSaidaFilter !== "todos" && r.tipoSaida !== tipoSaidaFilter) return false;
      if (faixaSalFilter !== "todos" && faixaSalario(r.salario) !== faixaSalFilter) return false;
      if (faixaIdadeFilter !== "todos" && faixaIdade(r.idade) !== faixaIdadeFilter) return false;
      return true;
    });
  }, [regs, busca, dataIni, dataFim, statusFilter, tipoSaidaFilter, faixaSalFilter, faixaIdadeFilter]);

  // Cards
  const stats = useMemo(() => {
    const inds = filtrados.map((r) => r.totalIndenizacao).filter((v): v is number => v != null && v > 0);
    const sals = filtrados.map((r) => r.salario).filter((v): v is number => v != null && v > 0);
    const idades = filtrados.map((r) => r.idade).filter((v): v is number => v != null);
    const meses = filtrados.map((r) => r.mesesIndenizacao).filter((v): v is number => v != null);
    const liquidos = filtrados
      .filter((r) => !r.aindaEmpregada && r.tempoLiquidoDias != null)
      .map((r) => r.tempoLiquidoDias as number);
    return {
      total: filtrados.length,
      mediaInd: media(inds),
      maxInd: inds.length ? Math.max(...inds) : 0,
      minInd: inds.length ? Math.min(...inds) : 0,
      mediaIdade: media(idades),
      mediaSal: media(sals),
      mediaMeses: media(meses),
      mediaLiquidoDias: media(liquidos),
      incompletos: filtrados.length - inds.length,
    };
  }, [filtrados]);

  // Charts data
  const chartIndenizacao = filtrados
    .filter((r) => r.totalIndenizacao && r.totalIndenizacao > 0)
    .map((r) => ({
      nome: r.nome.split(" ")[0],
      nomeCompleto: r.nome,
      valor: r.totalIndenizacao,
      salario: r.salario,
      meses: r.mesesIndenizacao,
      tipo: r.tipoSaida,
    }));

  const chartIdades = FAIXAS_IDADE.map((f) => ({
    faixa: f,
    qtd: filtrados.filter((r) => faixaIdade(r.idade) === f).length,
  }));

  const chartMeses = filtrados
    .filter((r) => r.mesesIndenizacao != null)
    .map((r) => ({ nome: r.nome.split(" ")[0], nomeCompleto: r.nome, meses: r.mesesIndenizacao }));

  const chartSalarios = FAIXAS_SAL.map((f) => ({
    faixa: f,
    qtd: filtrados.filter((r) => faixaSalario(r.salario) === f).length,
  }));

  const tipoSaidaData = (() => {
    const pediu = filtrados.filter((r) => r.tipoSaida === "Pediu a conta").length;
    const disp = filtrados.filter((r) => r.tipoSaida === "Dispensada").length;
    return [
      { name: "Dispensada", value: disp },
      { name: "Pediu a conta", value: pediu },
    ];
  })();
  const PIE_COLORS = ["hsl(var(--primary))", "hsl(var(--muted-foreground))"];

  const chartLiquido = filtrados
    .filter((r) => !r.aindaEmpregada && r.tempoLiquidoDias != null)
    .map((r) => ({
      nome: r.nome.split(" ")[0],
      nomeCompleto: r.nome,
      dias: r.tempoLiquidoDias!,
      semanas: +(r.tempoLiquidoDias! / 7).toFixed(1),
      meses: +(r.tempoLiquidoDias! / 30).toFixed(1),
      concepcao: r.concepcao ? formatDateBR(r.concepcao) : "—",
      saida: r.demissao ? formatDateBR(r.demissao) : "—",
      atend: formatDateBR(r.primeiroAtendimento),
    }));

  // Exports
  const exportarCSV = () => {
    const headers = [
      "Nome", "Nascimento", "Idade", "Salário", "Tipo de saída", "Concepção",
      "Saída", "Primeiro atendimento", "Tempo líquido (dias)", "Meses indenização",
      "Valor indenização", "Verbas rescisórias", "Total final", "Status",
    ];
    const rows = filtrados.map((r) => [
      r.nome,
      r.nascimento ? formatDateBR(r.nascimento) : "",
      r.idade ?? "",
      r.salario ?? "",
      r.tipoSaida,
      r.concepcao ? formatDateBR(r.concepcao) : "",
      r.demissao ? formatDateBR(r.demissao) : "",
      formatDateBR(r.primeiroAtendimento),
      r.aindaEmpregada ? "ainda empregada" : (r.tempoLiquidoDias ?? ""),
      r.mesesIndenizacao ?? "",
      r.totalIndenizacao ?? "",
      r.verbasRescisorias ?? "",
      r.totalFinal ?? "",
      r.status,
    ]);
    const csv = [headers, ...rows].map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "analise-estatistica.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const exportarExcel = () => {
    const dados = filtrados.map((r) => ({
      Nome: r.nome,
      Nascimento: r.nascimento ? formatDateBR(r.nascimento) : "",
      Idade: r.idade ?? "",
      Salário: r.salario ?? "",
      "Tipo de saída": r.tipoSaida,
      Concepção: r.concepcao ? formatDateBR(r.concepcao) : "",
      Saída: r.demissao ? formatDateBR(r.demissao) : "",
      "Primeiro atendimento": formatDateBR(r.primeiroAtendimento),
      "Tempo líquido (dias)": r.aindaEmpregada ? "ainda empregada" : (r.tempoLiquidoDias ?? ""),
      "Meses indenização": r.mesesIndenizacao ?? "",
      "Valor indenização": r.totalIndenizacao ?? "",
      "Verbas rescisórias": r.verbasRescisorias ?? "",
      "Total final": r.totalFinal ?? "",
      Status: r.status,
    }));
    const ws = XLSX.utils.json_to_sheet(dados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Análise");
    XLSX.writeFile(wb, "analise-estatistica.xlsx");
  };

  const exportarPDF = () => window.print();

  const toggleCliente = async (id: string, statusAtual: string) => {
    const novo = statusAtual === "Cliente" ? "Não contratou" : "Cliente";
    const { error } = await supabase.from("consultas_calculo").update({ status_cliente: novo }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Status atualizado"); carregar(); }
  };

  const excluir = async () => {
    if (!confirmDel) return;
    const { error } = await supabase
      .from("consultas_calculo")
      .update({ excluido: true, deleted_at: new Date().toISOString() })
      .eq("id", confirmDel);
    setConfirmDel(null);
    if (error) toast.error(error.message); else { toast.success("Cadastro excluído"); carregar(); }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando análise...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3 print:hidden">
          <Button variant="outline" onClick={() => navigate(-1)} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Button>
          <div className="flex flex-col items-center gap-1">
            <Logo size="md" />
            <h1 className="text-2xl font-display font-bold flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-primary" />
              Análise Estatística dos Cálculos
            </h1>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={exportarPDF} className="gap-1">
              <FileText className="w-4 h-4" /> PDF
            </Button>
            <Button size="sm" variant="outline" onClick={exportarExcel} className="gap-1">
              <FileSpreadsheet className="w-4 h-4" /> Excel
            </Button>
            <Button size="sm" variant="outline" onClick={exportarCSV} className="gap-1">
              <FileDown className="w-4 h-4" /> CSV
            </Button>
          </div>
        </div>

        {stats.incompletos > 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 px-3 py-2 rounded-md">
            <AlertCircle className="w-4 h-4" />
            Alguns cadastros possuem dados incompletos e não foram considerados em determinadas médias.
          </div>
        )}

        {/* Filtros */}
        <Card className="print:hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Filtros</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Pesquisar nome</Label>
              <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Nome..." />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Cadastro de</Label>
              <Input type="date" value={dataIni} onChange={(e) => setDataIni(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Cadastro até</Label>
              <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Tipo de saída</Label>
              <Select value={tipoSaidaFilter} onValueChange={setTipoSaidaFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="Pediu a conta">Pediu a conta</SelectItem>
                  <SelectItem value="Dispensada">Dispensada/Ganhou a conta</SelectItem>
                  <SelectItem value="Desconhecido">Desconhecido</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Faixa salarial</Label>
              <Select value={faixaSalFilter} onValueChange={setFaixaSalFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas</SelectItem>
                  {FAIXAS_SAL.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Faixa de idade</Label>
              <Select value={faixaIdadeFilter} onValueChange={setFaixaIdadeFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas</SelectItem>
                  {FAIXAS_IDADE.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button variant="ghost" className="w-full" onClick={() => {
                setBusca(""); setDataIni(""); setDataFim(""); setStatusFilter("todos");
                setTipoSaidaFilter("todos"); setFaixaSalFilter("todos"); setFaixaIdadeFilter("todos");
              }}>Limpar filtros</Button>
            </div>
          </CardContent>
        </Card>

        {/* Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={<Users />} label="Total de clientes" value={String(stats.total)} />
          <StatCard icon={<DollarSign />} label="Indenização média" value={formatBRL(stats.mediaInd)} />
          <StatCard icon={<TrendingUp />} label="Maior indenização" value={formatBRL(stats.maxInd)} />
          <StatCard icon={<TrendingDown />} label="Menor indenização" value={formatBRL(stats.minInd)} />
          <StatCard icon={<Users />} label="Idade média" value={stats.mediaIdade ? `${stats.mediaIdade.toFixed(1)} anos` : "—"} />
          <StatCard icon={<DollarSign />} label="Salário médio" value={formatBRL(stats.mediaSal)} />
          <StatCard icon={<Calendar />} label="Meses médios de indenização" value={stats.mediaMeses ? stats.mediaMeses.toFixed(1) : "—"} />
          <StatCard icon={<Clock />} label="Tempo médio até procurar (dias)" value={stats.mediaLiquidoDias ? `${stats.mediaLiquidoDias.toFixed(0)} dias` : "—"} />
        </div>

        {/* Gráfico 1 */}
        <Card>
          <CardHeader><CardTitle className="text-base">Indenizações vs. média geral</CardTitle></CardHeader>
          <CardContent className="h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartIndenizacao}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nome" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<IndTooltip />} />
                <Bar dataKey="valor" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <ReferenceLine y={stats.mediaInd} stroke="hsl(var(--destructive))" strokeDasharray="4 4" label={{ value: "Média", position: "right", fontSize: 11 }} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Gráfico 2 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Distribuição de idade</CardTitle>
              <p className="text-xs text-muted-foreground">Idade média: {stats.mediaIdade ? `${stats.mediaIdade.toFixed(1)} anos` : "—"}</p>
            </CardHeader>
            <CardContent className="h-[280px]">
              <ResponsiveContainer>
                <BarChart data={chartIdades}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="faixa" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="qtd" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Gráfico 3 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Meses de indenização por cliente</CardTitle>
              <p className="text-xs text-muted-foreground">Média: {stats.mediaMeses.toFixed(1)} meses</p>
            </CardHeader>
            <CardContent className="h-[280px]">
              <ResponsiveContainer>
                <BarChart data={chartMeses}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="nome" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="meses" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <ReferenceLine y={stats.mediaMeses} stroke="hsl(var(--destructive))" strokeDasharray="4 4" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Gráfico 4 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Distribuição salarial</CardTitle>
              <p className="text-xs text-muted-foreground">Salário médio: {formatBRL(stats.mediaSal)}</p>
            </CardHeader>
            <CardContent className="h-[280px]">
              <ResponsiveContainer>
                <BarChart data={chartSalarios}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="faixa" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="qtd" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Gráfico 5 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><PieIcon className="w-4 h-4" /> Tipo de saída da empresa</CardTitle>
            </CardHeader>
            <CardContent className="h-[280px]">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={tipoSaidaData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90}
                    label={(d) => `${d.name}: ${d.value} (${stats.total ? ((d.value / stats.total) * 100).toFixed(0) : 0}%)`}>
                    {tipoSaidaData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Gráfico 6 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Clock className="w-4 h-4" /> Tempo líquido até procurar o escritório</CardTitle>
            <p className="text-xs text-muted-foreground">
              Média: {stats.mediaLiquidoDias ? `${stats.mediaLiquidoDias.toFixed(0)} dias (~${(stats.mediaLiquidoDias / 30).toFixed(1)} meses)` : "—"}
              {" · "}Clientes ainda empregadas (excluídas da média): {filtrados.filter((r) => r.aindaEmpregada).length}
            </p>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer>
              <BarChart data={chartLiquido}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nome" tick={{ fontSize: 11 }} />
                <YAxis label={{ value: "dias", angle: -90, position: "insideLeft", fontSize: 11 }} />
                <Tooltip content={<LiquidoTooltip />} />
                <Bar dataKey="dias" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <ReferenceLine y={stats.mediaLiquidoDias} stroke="hsl(var(--destructive))" strokeDasharray="4 4" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Tabela */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Detalhamento por cliente</CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted">
                <tr>
                  {["Nome", "Nasc.", "Idade", "Salário", "Tipo saída", "Concepção", "Saída", "1º atend.", "T. líquido", "Meses ind.", "Valor", "Status", "Ações"].map((h) => (
                    <th key={h} className="text-left py-2 px-2 font-semibold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtrados.map((r) => (
                  <tr key={r.id} className="border-t hover:bg-muted/30">
                    <td className="py-1.5 px-2">
                      <button className="text-primary hover:underline font-medium" onClick={() => navigate(`/consultas/${r.id}`)}>
                        {r.nome}
                      </button>
                    </td>
                    <td className="py-1.5 px-2">{r.nascimento ? formatDateBR(r.nascimento) : "—"}</td>
                    <td className="py-1.5 px-2">{r.idade ?? "—"}</td>
                    <td className="py-1.5 px-2 tabular-nums">{r.salario != null ? formatBRL(r.salario) : "—"}</td>
                    <td className="py-1.5 px-2"><Badge variant="secondary">{r.tipoSaida}</Badge></td>
                    <td className="py-1.5 px-2">{r.concepcao ? formatDateBR(r.concepcao) : "—"}</td>
                    <td className="py-1.5 px-2">{r.demissao ? formatDateBR(r.demissao) : "—"}</td>
                    <td className="py-1.5 px-2">{formatDateBR(r.primeiroAtendimento)}</td>
                    <td className="py-1.5 px-2">{r.aindaEmpregada ? "—" : r.tempoLiquidoDias != null ? `${r.tempoLiquidoDias}d` : "—"}</td>
                    <td className="py-1.5 px-2">{r.mesesIndenizacao ?? "—"}</td>
                    <td className="py-1.5 px-2 tabular-nums font-medium">{r.totalIndenizacao != null ? formatBRL(r.totalIndenizacao) : "—"}</td>
                    <td className="py-1.5 px-2"><Badge>{r.status}</Badge></td>
                    <td className="py-1.5 px-2">
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => navigate(`/consultas/${r.id}`)} title="Ver cálculo completo">
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" variant={r.status === "Cliente" ? "default" : "secondary"} className="h-7 px-2"
                          onClick={() => toggleCliente(r.id, r.status)} title="Marcar como cliente">
                          <UserCheck className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" variant="destructive" className="h-7 px-2" onClick={() => setConfirmDel(r.id)} title="Excluir cadastro">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!filtrados.length && (
                  <tr><td colSpan={13} className="text-center py-6 text-muted-foreground">Nenhum cadastro corresponde aos filtros.</td></tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir este cadastro?</AlertDialogTitle>
            <AlertDialogDescription>O cadastro será marcado como excluído.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={excluir}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const StatCard = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
        <span className="[&_svg]:w-4 [&_svg]:h-4 text-primary">{icon}</span>
        {label}
      </div>
      <div className="text-xl font-bold tabular-nums">{value}</div>
    </CardContent>
  </Card>
);

const IndTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-background border rounded-md shadow-md p-2 text-xs space-y-0.5">
      <div className="font-semibold">{d.nomeCompleto}</div>
      <div>Indenização: <span className="font-medium">{formatBRL(d.valor)}</span></div>
      <div>Salário: {d.salario != null ? formatBRL(d.salario) : "—"}</div>
      <div>Meses: {d.meses ?? "—"}</div>
      <div>Tipo: {d.tipo}</div>
    </div>
  );
};

const LiquidoTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-background border rounded-md shadow-md p-2 text-xs space-y-0.5">
      <div className="font-semibold">{d.nomeCompleto}</div>
      <div>{d.dias} dias · {d.semanas} sem · {d.meses} meses</div>
      <div>Concepção: {d.concepcao}</div>
      <div>Saída: {d.saida}</div>
      <div>1º atendimento: {d.atend}</div>
    </div>
  );
};

export default AnaliseEstatistica;