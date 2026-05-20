import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import Logo from "@/components/Logo";

interface LoginProps {
  onLogin: () => void;
}

const SHARED_EMAIL = "escritorio@calculosgestante.local";
const SHARED_PASSWORD = "CalcGestante#2026";

async function ensureSharedSession() {
  const { data: sessionData } = await supabase.auth.getSession();
  if (sessionData.session) return;
  const { error } = await supabase.auth.signInWithPassword({
    email: SHARED_EMAIL,
    password: SHARED_PASSWORD,
  });
  if (!error) return;
  const { error: signUpError } = await supabase.auth.signUp({
    email: SHARED_EMAIL,
    password: SHARED_PASSWORD,
    options: { emailRedirectTo: window.location.origin },
  });
  if (signUpError && !/registered/i.test(signUpError.message)) throw signUpError;
  const { error: e2 } = await supabase.auth.signInWithPassword({
    email: SHARED_EMAIL,
    password: SHARED_PASSWORD,
  });
  if (e2) throw e2;
}

const Login = ({ onLogin }: LoginProps) => {
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setLoading(true);
    try {
      if (usuario.trim().toLowerCase() !== "admin" || senha !== "123456") {
        throw new Error("Usuário ou senha inválidos.");
      }
      await ensureSharedSession();
      onLogin();
    } catch (err: any) {
      setErro(err?.message ?? "Erro ao autenticar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Logo size="lg" className="mx-auto mb-3" />
          <h1 className="text-2xl font-display font-bold text-foreground">
            Cálculos Gestante
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Faça login para acessar a calculadora
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Acesso restrito
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="usuario">Usuário</Label>
                <Input
                  id="usuario"
                  type="text"
                  placeholder="Admin"
                  autoCapitalize="none"
                  autoCorrect="off"
                  autoComplete="username"
                  value={usuario}
                  onChange={(e) => { setUsuario(e.target.value); setErro(null); }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="senha">Senha</Label>
                <Input
                  id="senha"
                  type="password"
                  placeholder="Senha de acesso"
                  autoComplete="current-password"
                  value={senha}
                  onChange={(e) => { setSenha(e.target.value); setErro(null); }}
                />
              </div>

              {erro && (
                <Alert variant="destructive">
                  <AlertDescription>
                    {erro}
                  </AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Aguarde..." : "Entrar"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
