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
  const [carregando, setCarregando] = useState(true);
  // Quem volta pelo link de "Esqueci minha senha" chega logado, mas precisa
  // definir a senha nova antes de usar o sistema.
  const [recuperandoSenha, setRecuperandoSenha] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((evento, nova) => {
      setSessao(nova);
      if (evento === "PASSWORD_RECOVERY") setRecuperandoSenha(true);
      if (!nova) setPapel(null);
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
      return;
    }
    let cancelado = false;
    (async () => {
      const { data } = await db.from("user_roles").select("role").eq("user_id", userId);
      if (cancelado) return;
      const papeis = (data ?? []).map((r: { role: string }) => r.role);
      setPapel(papeis.includes("admin") ? "admin" : papeis.length > 0 ? "usuario" : null);
    })();
    return () => { cancelado = true; };
  }, [userId]);

  return {
    sessao,
    usuario: sessao?.user ?? null,
    papel,
    ehAdmin: papel === "admin",
    carregandoPapel: papel === undefined,
    carregando,
    recuperandoSenha,
    concluirRecuperacao: () => setRecuperandoSenha(false),
  };
}
