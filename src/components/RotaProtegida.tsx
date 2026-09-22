import { ReactNode, useState } from "react";
import { ShieldAlert, KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSessao } from "@/hooks/useSessao";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Logo from "@/components/Logo";
import Login from "@/pages/Login";

interface Props {
  children: ReactNode;
  somenteAdmin?: boolean;
}

const Carregando = () => (
  <div className="min-h-screen flex items-center justify-center text-muted-foreground">
    Carregando...
  </div>
);

const Bloqueado = ({ titulo, texto }: { titulo: string; texto: string }) => (
  <div className="min-h-screen bg-background flex items-center justify-center px-4">
    <div className="w-full max-w-sm text-center">
      <Logo size="lg" className="mx-auto mb-6" />
      <Card>
        <CardContent className="pt-6 space-y-4">
          <ShieldAlert className="w-8 h-8 text-muted-foreground mx-auto" />
          <div className="space-y-1">
            <h1 className="text-base font-semibold text-foreground">{titulo}</h1>
            <p className="text-sm text-muted-foreground">{texto}</p>
          </div>
          <Button variant="outline" className="w-full" onClick={() => supabase.auth.signOut()}>
            Sair e entrar com outra conta
          </Button>
        </CardContent>
      </Card>
    </div>
  </div>
);

const NovaSenha = ({ onConcluir }: { onConcluir: () => void }) => {
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    if (senha.length < 6) {
      setErro("A senha precisa ter ao menos 6 caracteres.");
      return;
    }
    if (senha !== confirmacao) {
      setErro("As duas senhas não conferem.");
      return;
    }
    setSalvando(true);
    const { data: usuarioData } = await supabase.auth.getUser();
    const userId = usuarioData.user?.id;
    if (!userId) {
      setSalvando(false);
      setErro("Sua sessão expirou. Entre novamente com a senha inicial.");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: senha });
    if (!error) {
      const { error: perfilError } = await supabase
        .from("profiles")
        .update({ deve_trocar_senha: false })
        .eq("user_id", userId);
      if (perfilError) {
        setSalvando(false);
        setErro("A senha foi alterada, mas não foi possível concluir o primeiro acesso. Tente novamente.");
        return;
      }
    }
    setSalvando(false);
    if (error) {
      setErro(error.message);
      return;
    }
    onConcluir();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <Logo size="lg" className="mx-auto mb-6" />
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={salvar} className="space-y-4">
              <div className="text-center space-y-1">
                <KeyRound className="w-6 h-6 text-primary mx-auto" />
                <h1 className="text-base font-semibold text-foreground">Defina sua nova senha</h1>
              </div>
              <div className="space-y-2">
                <Label htmlFor="novaSenha">Nova senha</Label>
                <Input
                  id="novaSenha"
                  type="password"
                  autoComplete="new-password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)} />

              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmacaoSenha">Repita a nova senha</Label>
                <Input
                  id="confirmacaoSenha"
                  type="password"
                  autoComplete="new-password"
                  value={confirmacao}
                  onChange={(e) => setConfirmacao(e.target.value)} />

              </div>
              {erro &&
              <Alert variant="destructive">
                  <AlertDescription>{erro}</AlertDescription>
                </Alert>
              }
              <Button type="submit" className="w-full" disabled={salvando || !senha || !confirmacao}>
                {salvando ? "Salvando..." : "Salvar nova senha"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>);

};

/** Nenhuma tela do sistema abre sem sessão; a de usuários exige administrador. */
const RotaProtegida = ({ children, somenteAdmin = false }: Props) => {
  const { sessao, papel, ehAdmin, carregando, carregandoPapel, recuperandoSenha, deveTrocarSenha, concluirTrocaSenha } = useSessao();

  if (carregando) return <Carregando />;
  if ((recuperandoSenha || deveTrocarSenha) && sessao) return <NovaSenha onConcluir={concluirTrocaSenha} />;
  if (!sessao) return <Login />;
  if (carregandoPapel) return <Carregando />;

  if (papel === null) {
    return (
      <Bloqueado
        titulo="Acesso ainda não liberado"
        texto="Sua conta existe, mas nenhum perfil foi atribuído a ela. Peça ao administrador para liberar o seu e-mail."
      />
    );
  }

  if (somenteAdmin && !ehAdmin) {
    return (
      <Bloqueado
        titulo="Área do administrador"
        texto="Esta tela é restrita a quem tem perfil de administrador."
      />
    );
  }

  return <>{children}</>;
};

export default RotaProtegida;
