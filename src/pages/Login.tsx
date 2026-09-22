import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lock, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { registrarAcesso } from "@/lib/db";
import Logo from "@/components/Logo";

interface LoginProps {
  onLogin?: () => void;
}

/** As mensagens do Supabase vêm em inglês e técnicas demais para o dia a dia. */
function traduzErro(mensagem: string): string {
  if (/invalid login credentials/i.test(mensagem)) return "E-mail ou senha incorretos.";
  if (/email not confirmed/i.test(mensagem)) return "E-mail ainda não confirmado. Fale com o administrador.";
  if (/rate limit|too many/i.test(mensagem)) return "Muitas tentativas seguidas. Aguarde um instante.";
  if (/signups? not allowed|disabled/i.test(mensagem)) return "O acesso está bloqueado. Fale com o administrador.";
  return mensagem;
}

const Login = ({ onLogin }: LoginProps) => {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const limpaMensagens = () => {
    setErro(null);
    setAviso(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    limpaMensagens();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: senha,
      });
      if (error) throw error;

      if (data.user) {
        await registrarAcesso(data.user.id, data.user.email ?? email.trim(), "login");
      }
      onLogin?.();
    } catch (err: any) {
      setErro(traduzErro(err?.message ?? "Não foi possível entrar."));
    } finally {
      setLoading(false);
    }
  };

  const handleRecuperarSenha = async () => {
    limpaMensagens();
    if (!email.trim()) {
      setErro("Informe o e-mail para receber o link de redefinição.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin,
      });
      if (error) throw error;
      setAviso("Link de redefinição enviado. Confira a caixa de entrada e o spam.");
    } catch (err: any) {
      setErro(traduzErro(err?.message ?? "Não foi possível enviar o link."));
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
            Acesso restrito à equipe do escritório
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                  E-mail
                </Label>
                <Input
                  id="email"
                  type="email"
                  inputMode="email"
                  placeholder="seu.email@escritorio.com.br"
                  autoCapitalize="none"
                  autoCorrect="off"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => {setEmail(e.target.value);limpaMensagens();}} />

              </div>

              <div className="space-y-2">
                <Label htmlFor="senha" className="flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                  Senha
                </Label>
                <Input
                  id="senha"
                  type="password"
                  placeholder="********"
                  autoComplete="current-password"
                  value={senha}
                  onChange={(e) => {setSenha(e.target.value);limpaMensagens();}} />
              </div>

              {erro &&
              <Alert variant="destructive">
                  <AlertDescription>{erro}</AlertDescription>
                </Alert>
              }

              {aviso &&
              <Alert>
                  <AlertDescription>{aviso}</AlertDescription>
                </Alert>
              }

              <Button type="submit" className="w-full" disabled={loading || !email || !senha}>
                {loading ? "Aguarde..." : "Entrar"}
              </Button>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleRecuperarSenha}
                  disabled={loading}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50">

                  Esqueci minha senha
                </button>
              </div>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Os cálculos ficam guardados com dados de clientes. Não compartilhe seu acesso.
        </p>
      </div>
    </div>
  );
};

export default Login;
