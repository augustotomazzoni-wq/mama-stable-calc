import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { db, registrarAcesso } from "@/lib/db";
import { useSessao } from "@/hooks/useSessao";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue } from
"@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle } from
"@/components/ui/alert-dialog";
import { ArrowLeft, LogOut, UserPlus, ShieldCheck, ShieldOff, Trash2, History, Users } from "lucide-react";
import { toast } from "sonner";
import Logo from "@/components/Logo";

type Papel = "admin" | "usuario";

interface UsuarioLinha {
  email: string;
  nome: string | null;
  papel: Papel;
  ativo: boolean;
  criado_em: string;
  usado_em: string | null;
  tem_conta: boolean;
  ultimo_acesso: string | null;
}

interface AcessoLinha {
  id: string;
  email: string | null;
  tipo: string;
  ocorrido_em: string;
}

function traduzErroRpc(mensagem: string): string {
  if (/ULTIMO_ADMIN/.test(mensagem)) return "Este é o único administrador. Promova outra pessoa antes de mudar este acesso.";
  if (/APENAS_ADMIN/.test(mensagem)) return "Só um administrador pode fazer isso.";
  if (/duplicate key|unique/i.test(mensagem)) return "Esse e-mail já está na lista.";
  return mensagem;
}

function formataDataHora(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

const Usuarios = () => {
  const navigate = useNavigate();
  const { usuario } = useSessao();

  const [linhas, setLinhas] = useState<UsuarioLinha[]>([]);
  const [acessos, setAcessos] = useState<AcessoLinha[]>([]);
  const [carregando, setCarregando] = useState(true);

  const [novoEmail, setNovoEmail] = useState("");
  const [novoNome, setNovoNome] = useState("");
  const [novoPapel, setNovoPapel] = useState<Papel>("usuario");
  const [salvando, setSalvando] = useState(false);

  const [paraRemover, setParaRemover] = useState<UsuarioLinha | null>(null);

  const carregar = async () => {
    setCarregando(true);
    const [usuariosResp, acessosResp] = await Promise.all([
    db.rpc("listar_usuarios"),
    db.from("acessos").select("id, email, tipo, ocorrido_em").order("ocorrido_em", { ascending: false }).limit(200)]
    );

    if (usuariosResp.error) {
      toast.error("Erro ao carregar acessos: " + traduzErroRpc(usuariosResp.error.message));
    } else {
      setLinhas((usuariosResp.data ?? []) as UsuarioLinha[]);
    }

    if (acessosResp.error) {
      toast.error("Erro ao carregar histórico: " + acessosResp.error.message);
    } else {
      setAcessos((acessosResp.data ?? []) as AcessoLinha[]);
    }
    setCarregando(false);
  };

  useEffect(() => {
    carregar();
  }, []);

  const logout = async () => {
    if (usuario) await registrarAcesso(usuario.id, usuario.email ?? null, "logout");
    await supabase.auth.signOut();
  };

  const liberarAcesso = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = novoEmail.trim().toLowerCase();
    if (!email) return;

    setSalvando(true);
    const { error } = await db.from("usuarios_autorizados").insert({
      email,
      nome: novoNome.trim() || null,
      papel: novoPapel,
      criado_por: usuario?.id ?? null,
    });
    setSalvando(false);

    if (error) {
      toast.error(traduzErroRpc(error.message));
      return;
    }

    toast.success("Acesso liberado. A pessoa cria a própria senha em 'Primeiro acesso'.");
    setNovoEmail("");
    setNovoNome("");
    setNovoPapel("usuario");
    carregar();
  };

  const alternarPapel = async (linha: UsuarioLinha) => {
    const novo: Papel = linha.papel === "admin" ? "usuario" : "admin";
    const { error } = await db.rpc("definir_papel", { _email: linha.email, _papel: novo });
    if (error) {
      toast.error(traduzErroRpc(error.message));
      return;
    }
    toast.success(novo === "admin" ? "Agora é administrador." : "Agora é usuário comum.");
    carregar();
  };

  const alternarAtivo = async (linha: UsuarioLinha) => {
    const { error } = await db.rpc("definir_ativo", { _email: linha.email, _ativo: !linha.ativo });
    if (error) {
      toast.error(traduzErroRpc(error.message));
      return;
    }
    toast.success(linha.ativo ? "Acesso revogado." : "Acesso reativado.");
    carregar();
  };

  const remover = async () => {
    if (!paraRemover) return;
    const { error } = await db.rpc("remover_autorizado", { _email: paraRemover.email });
    setParaRemover(null);
    if (error) {
      toast.error(traduzErroRpc(error.message));
      return;
    }
    toast.success("Acesso removido.");
    carregar();
  };

  const statusDe = (l: UsuarioLinha) => {
    if (!l.ativo) return { texto: "Revogado", variante: "destructive" as const };
    if (!l.tem_conta) return { texto: "Aguardando 1º acesso", variante: "secondary" as const };
    return { texto: "Ativo", variante: "default" as const };
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <Button variant="outline" onClick={() => navigate("/")} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
          <div className="flex flex-col items-center gap-1">
            <Logo size="md" />
            <h1 className="text-xl font-display font-bold">Usuários e acessos</h1>
          </div>
          <Button variant="ghost" onClick={logout} className="gap-2">
            <LogOut className="w-4 h-4" />
            Sair
          </Button>
        </div>

        {/* Liberar novo acesso */}
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-primary" />
              Liberar novo acesso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={liberarAcesso} className="grid gap-3 sm:grid-cols-[2fr_2fr_1fr_auto] sm:items-end">
              <div className="space-y-1.5">
                <Label htmlFor="novoEmail" className="text-xs">E-mail *</Label>
                <Input
                  id="novoEmail"
                  type="email"
                  inputMode="email"
                  autoCapitalize="none"
                  placeholder="pessoa@escritorio.com.br"
                  value={novoEmail}
                  onChange={(e) => setNovoEmail(e.target.value)} />

              </div>
              <div className="space-y-1.5">
                <Label htmlFor="novoNome" className="text-xs">Nome</Label>
                <Input
                  id="novoNome"
                  placeholder="Como aparece na lista"
                  value={novoNome}
                  onChange={(e) => setNovoNome(e.target.value)} />

              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Perfil</Label>
                <Select value={novoPapel} onValueChange={(v) => setNovoPapel(v as Papel)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="usuario">Usuário</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={salvando || !novoEmail.trim()} className="gap-2">
                <UserPlus className="w-4 h-4" />
                Liberar
              </Button>
            </form>
            <p className="text-xs text-muted-foreground mt-3">
              A pessoa entra na tela de login, escolhe "Primeiro acesso" e define a própria senha.
              Quem não estiver nesta lista não consegue criar acesso.
            </p>
          </CardContent>
        </Card>

        {/* Lista de acessos */}
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Acessos cadastrados ({linhas.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {carregando ?
            <p className="text-sm text-muted-foreground py-4">Carregando...</p> :
            linhas.length === 0 ?
            <p className="text-sm text-muted-foreground py-4">Nenhum acesso cadastrado ainda.</p> :

            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2 font-semibold">Pessoa</th>
                      <th className="text-left py-2 px-2 font-semibold">Perfil</th>
                      <th className="text-left py-2 px-2 font-semibold">Situação</th>
                      <th className="text-left py-2 px-2 font-semibold">Último acesso</th>
                      <th className="text-right py-2 px-2 font-semibold">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {linhas.map((l) => {
                    const status = statusDe(l);
                    const euMesmo = (usuario?.email ?? "").toLowerCase() === l.email.toLowerCase();
                    return (
                      <tr key={l.email} className="border-b last:border-0">
                          <td className="py-2.5 px-2">
                            <span className="block font-medium text-foreground">{l.nome || l.email}</span>
                            {l.nome && <span className="block text-xs text-muted-foreground">{l.email}</span>}
                            {euMesmo && <span className="block text-xs text-muted-foreground">(você)</span>}
                          </td>
                          <td className="py-2.5 px-2">
                            <Badge variant={l.papel === "admin" ? "default" : "secondary"}>
                              {l.papel === "admin" ? "Administrador" : "Usuário"}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-2">
                            <Badge variant={status.variante}>{status.texto}</Badge>
                          </td>
                          <td className="py-2.5 px-2 text-muted-foreground">
                            {formataDataHora(l.ultimo_acesso)}
                          </td>
                          <td className="py-2.5 px-2">
                            <div className="flex justify-end gap-1">
                              <Button
                              size="sm"
                              variant="ghost"
                              title={l.papel === "admin" ? "Rebaixar para usuário" : "Tornar administrador"}
                              onClick={() => alternarPapel(l)}>

                                {l.papel === "admin" ? <ShieldOff className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                              </Button>
                              <Button
                              size="sm"
                              variant="ghost"
                              title={l.ativo ? "Revogar acesso" : "Reativar acesso"}
                              onClick={() => alternarAtivo(l)}>

                                {l.ativo ? "Revogar" : "Reativar"}
                              </Button>
                              <Button
                              size="sm"
                              variant="ghost"
                              title="Remover da lista"
                              onClick={() => setParaRemover(l)}>

                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          </td>
                        </tr>);

                  })}
                  </tbody>
                </table>
              </div>
            }
          </CardContent>
        </Card>

        {/* Histórico de acesso */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <History className="w-4 h-4 text-primary" />
              Histórico de acesso
            </CardTitle>
          </CardHeader>
          <CardContent>
            {acessos.length === 0 ?
            <p className="text-sm text-muted-foreground py-4">
                Nenhum acesso registrado ainda. Os próximos logins aparecem aqui.
              </p> :

            <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-background">
                    <tr className="border-b">
                      <th className="text-left py-2 px-2 font-semibold">Quando</th>
                      <th className="text-left py-2 px-2 font-semibold">Quem</th>
                      <th className="text-left py-2 px-2 font-semibold">Evento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {acessos.map((a) =>
                  <tr key={a.id} className="border-b last:border-0">
                        <td className="py-2 px-2 text-muted-foreground tabular-nums">{formataDataHora(a.ocorrido_em)}</td>
                        <td className="py-2 px-2">{a.email ?? "—"}</td>
                        <td className="py-2 px-2">
                          <Badge variant={a.tipo === "logout" ? "secondary" : "default"}>
                            {a.tipo === "logout" ? "Saída" : "Entrada"}
                          </Badge>
                        </td>
                      </tr>
                  )}
                  </tbody>
                </table>
              </div>
            }
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!paraRemover} onOpenChange={(aberto) => !aberto && setParaRemover(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover o acesso de {paraRemover?.nome || paraRemover?.email}?</AlertDialogTitle>
            <AlertDialogDescription>
              A pessoa perde o acesso ao sistema imediatamente. Os cálculos que ela já salvou continuam no histórico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={remover}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>);

};

export default Usuarios;
