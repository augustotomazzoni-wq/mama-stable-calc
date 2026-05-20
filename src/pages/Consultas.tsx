import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Eye, UserCheck, UserX, Trash2, Search, ArrowUpDown, LogOut } from "lucide-react";
import { formatBRL, formatDateBR } from "@/lib/dateUtils";
import { toast } from "sonner";
import Logo from "@/components/Logo";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const STATUS_OPTIONS = ["Pesquisa realizada", "Cliente", "Não contratou", "Em análise"] as const;

interface Row {
  id: string;
  nome_completo: string;
  data_nascimento: string | null;
  valor_total_indenizacao: number;
  created_at: string;
  status_cliente: string;
}

const Consultas = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [dataIni, setDataIni] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [ordemValorAsc, setOrdemValorAsc] = useState<boolean | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  const carregar = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("consultas_calculo")
      .select("id,nome_completo,data_nascimento,valor_total_indenizacao,created_at,status_cliente")
      .eq("excluido", false)
      .order("created_at", { ascending: false });
    if (error) toast.error("Erro ao carregar: " + error.message);
    setRows((data as Row[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    carregar();
  }, []);

  const filtradas = useMemo(() => {
    let r = [...rows];
    if (busca.trim()) {
      const b = busca.toLowerCase();
      r = r.filter((x) => x.nome_completo.toLowerCase().includes(b));
    }
    if (dataIni) r = r.filter((x) => x.created_at.slice(0, 10) >= dataIni);
    if (dataFim) r = r.filter((x) => x.created_at.slice(0, 10) <= dataFim);
    if (statusFilter !== "todos") r = r.filter((x) => x.status_cliente === statusFilter);
    if (ordemValorAsc !== null) {
      r.sort((a, b) =>
        ordemValorAsc
          ? a.valor_total_indenizacao - b.valor_total_indenizacao
          : b.valor_total_indenizacao - a.valor_total_indenizacao
      );
    }
    return r;
  }, [rows, busca, dataIni, dataFim, statusFilter, ordemValorAsc]);

  const toggleCliente = async (id: string, statusAtual: string) => {
    const novo = statusAtual === "Cliente" ? "Não contratou" : "Cliente";
    const { error } = await supabase
      .from("consultas_calculo")
      .update({ status_cliente: novo })
      .eq("id", id);
    if (error) toast.error("Erro: " + error.message);
    else {
      toast.success(novo === "Cliente" ? "Marcado como cliente!" : "Desmarcado como cliente.");
      carregar();
    }
  };

  const alterarStatus = async (id: string, novoStatus: string) => {
    const { error } = await supabase
      .from("consultas_calculo")
      .update({ status_cliente: novoStatus })
      .eq("id", id);
    if (error) toast.error("Erro: " + error.message);
    else {
      toast.success("Status atualizado");
      carregar();
    }
  };

  const excluir = async () => {
    if (!confirmDel) return;
    const { error } = await supabase
      .from("consultas_calculo")
      .update({ excluido: true, deleted_at: new Date().toISOString() })
      .eq("id", confirmDel);
    setConfirmDel(null);
    if (error) toast.error("Erro: " + error.message);
    else {
      toast.success("Cadastro excluído");
      carregar();
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <Button variant="outline" onClick={() => navigate("/")} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
          <div className="flex flex-col items-center gap-1">
            <Logo size="md" />
            <h1 className="text-xl font-display font-bold">Cálculos realizados</h1>
          </div>
          <Button variant="ghost" onClick={logout} className="gap-2">
            <LogOut className="w-4 h-4" />
            Sair
          </Button>
        </div>

        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Search className="w-4 h-4" /> Filtros
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="space-y-1 md:col-span-2">
              <Label className="text-xs">Pesquisar por nome</Label>
              <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Nome da cliente" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">De</Label>
              <Input type="date" value={dataIni} onChange={(e) => setDataIni(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Até</Label>
              <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label className="text-xs">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 md:col-span-2 flex items-end">
              <Button
                variant="outline"
                className="gap-2 w-full"
                onClick={() =>
                  setOrdemValorAsc(ordemValorAsc === null ? false : ordemValorAsc ? null : true)
                }
              >
                <ArrowUpDown className="w-4 h-4" />
                Ordenar valor:{" "}
                {ordemValorAsc === null ? "—" : ordemValorAsc ? "Crescente" : "Decrescente"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left py-2.5 px-3 font-semibold">Nome</th>
                  <th className="text-left py-2.5 px-3 font-semibold">Nascimento</th>
                  <th className="text-right py-2.5 px-3 font-semibold">Valor indenização</th>
                  <th className="text-left py-2.5 px-3 font-semibold">Data/hora</th>
                  <th className="text-left py-2.5 px-3 font-semibold">Status</th>
                  <th className="text-right py-2.5 px-3 font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={6} className="py-6 text-center text-muted-foreground">Carregando...</td></tr>
                )}
                {!loading && filtradas.length === 0 && (
                  <tr><td colSpan={6} className="py-6 text-center text-muted-foreground">Nenhum cálculo encontrado.</td></tr>
                )}
                {filtradas.map((r) => (
                  <tr key={r.id} className="border-t hover:bg-muted/30">
                    <td className="py-2 px-3">
                      <button
                        className="text-primary hover:underline font-medium"
                        onClick={() => navigate(`/consultas/${r.id}`)}
                      >
                        {r.nome_completo}
                      </button>
                    </td>
                    <td className="py-2 px-3">
                      {r.data_nascimento ? formatDateBR(new Date(r.data_nascimento + "T00:00:00")) : "—"}
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums font-medium">
                      {formatBRL(Number(r.valor_total_indenizacao))}
                    </td>
                    <td className="py-2 px-3">{new Date(r.created_at).toLocaleString("pt-BR")}</td>
                    <td className="py-2 px-3">
                      <Select value={r.status_cliente} onValueChange={(v) => alterarStatus(r.id, v)}>
                        <SelectTrigger className="h-8 w-[170px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex gap-1 justify-end">
                        <Button size="sm" variant="outline" className="gap-1" onClick={() => navigate(`/consultas/${r.id}`)}>
                          <Eye className="w-3.5 h-3.5" /> Ver
                        </Button>
                        <Button
                          size="sm"
                          variant={r.status_cliente === "Cliente" ? "default" : "secondary"}
                          className="gap-1"
                          onClick={() => toggleCliente(r.id, r.status_cliente)}
                        >
                          {r.status_cliente === "Cliente" ? (
                            <><UserX className="w-3.5 h-3.5" /> Desmarcar</>
                          ) : (
                            <><UserCheck className="w-3.5 h-3.5" /> Cliente</>
                          )}
                        </Button>
                        <Button size="sm" variant="destructive" className="gap-1" onClick={() => setConfirmDel(r.id)}>
                          <Trash2 className="w-3.5 h-3.5" /> Excluir
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir este cadastro?</AlertDialogTitle>
            <AlertDialogDescription>
              O cadastro será marcado como excluído e deixará de aparecer na lista. Esta ação pode ser revertida diretamente no banco de dados.
            </AlertDialogDescription>
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

export default Consultas;