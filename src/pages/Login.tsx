import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Baby, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface LoginProps {
  onLogin: () => void;
}

const Login = ({ onLogin }: LoginProps) => {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [modo, setModo] = useState<"login" | "signup">("login");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setLoading(true);
    try {
      if (modo === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: senha,
        });
        if (error) throw error;
        onLogin();
      } else {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password: senha,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        // Auto-confirm está ativo → tenta entrar imediatamente
        const { error: e2 } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: senha,
        });
        if (e2) throw e2;
        onLogin();
      }
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
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-3">
            <Baby className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            Cálculos Gestante
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {modo === "login" ? "Faça login para acessar a calculadora" : "Crie uma conta do escritório"}
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
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  autoCapitalize="none"
                  autoCorrect="off"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setErro(null); }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="senha">Senha</Label>
                <Input
                  id="senha"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  autoComplete={modo === "login" ? "current-password" : "new-password"}
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
                {loading ? "Aguarde..." : modo === "login" ? "Entrar" : "Criar conta e entrar"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full text-xs"
                onClick={() => { setModo(modo === "login" ? "signup" : "login"); setErro(null); }}
              >
                {modo === "login" ? "Criar nova conta do escritório" : "Já tenho conta — fazer login"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
