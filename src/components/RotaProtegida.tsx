import { ReactNode } from "react";
import { ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSessao } from "@/hooks/useSessao";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

/** Nenhuma tela do sistema abre sem sessão; a de usuários exige administrador. */
const RotaProtegida = ({ children, somenteAdmin = false }: Props) => {
  const { sessao, papel, ehAdmin, carregando, carregandoPapel } = useSessao();

  if (carregando) return <Carregando />;
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
