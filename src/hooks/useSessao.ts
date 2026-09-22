import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { db } from "@/lib/db";

export type Papel = "admin" | "usuario" | null;

/**
 * Sessão do Supabase somada ao papel do usuário. `papel` fica `undefined`
 * enquanto a consulta não volta, para a tela não piscar "sem permissão".
 */
export function useSessao() {
  const [sessao, setSessao] = useState<Session | null>(null);
  const [papel, setPapel] = useState<Papel | undefined>(undefined);
  const [deveTrocarSenha, setDeveTrocarSenha] = useState<boolean | undefined>(undefined);
  const [carregando, setCarregando] = useState(true);
  // Quem volta pelo link de "Esqueci minha senha" chega logado, mas precisa
  // definir a senha nova antes de usar o sistema.
  const [recuperandoSenha, setRecuperandoSenha] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((evento, nova) => {
      setSessao(nova);
      if (evento === "PASSWORD_RECOVERY") setRecuperandoSenha(true);
      if (!nova) {
        setPapel(null);
        setDeveTrocarSenha(undefined);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      setSessao(data.session);
      setCarregando(false);
    });

    return () => { sub.subscription.unsubscribe(); };
  }, []);

  const userId = sessao?.user?.id ?? null;

  useEffect(() => {
    if (!userId) {
      setPapel(null);
      setDeveTrocarSenha(undefined);
      return;
    }
    let cancelado = false;
    (async () => {
      const [papeisResp, perfilResp] = await Promise.all([
        db.from("user_roles").select("role").eq("user_id", userId),
        db.from("profiles").select("deve_trocar_senha").eq("user_id", userId).maybeSingle(),
      ]);
      if (cancelado) return;
      const papeis = (papeisResp.data ?? []).map((r: { role: string }) => r.role);
      setPapel(papeis.includes("admin") ? "admin" : papeis.length > 0 ? "usuario" : null);
      setDeveTrocarSenha(perfilResp.data?.deve_trocar_senha === true);
    })();
    return () => { cancelado = true; };
  }, [userId]);

  return {
    sessao,
    usuario: sessao?.user ?? null,
    papel,
    ehAdmin: papel === "admin",
    carregandoPapel: papel === undefined,
    deveTrocarSenha,
    carregando,
    recuperandoSenha,
    concluirTrocaSenha: () => {
      setRecuperandoSenha(false);
      setDeveTrocarSenha(false);
    },
  };
}
