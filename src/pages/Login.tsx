import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Baby, Lock } from "lucide-react";

interface LoginProps {
  onLogin: () => void;
}

const Login = ({ onLogin }: LoginProps) => {
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (usuario.trim().toLowerCase() === "admin" && senha === "123456") {
      setErro(false);
      onLogin();
    } else {
      setErro(true);
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
                  placeholder="Digite o usuário"
                  autoCapitalize="none"
                  autoCorrect="off"
                  autoComplete="username"
                  value={usuario}
                  onChange={(e) => { setUsuario(e.target.value); setErro(false); }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="senha">Senha</Label>
                <Input
                  id="senha"
                  type="password"
                  placeholder="Digite a senha"
                  autoComplete="current-password"
                  value={senha}
                  onChange={(e) => { setSenha(e.target.value); setErro(false); }}
                />
              </div>

              {erro && (
                <Alert variant="destructive">
                  <AlertDescription>
                    Usuário ou senha incorretos.
                  </AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full">
                Entrar
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
