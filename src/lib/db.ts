import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/**
 * As tabelas de perfis, allowlist e histórico de acesso ainda não constam do
 * types.ts gerado pelo Lovable. Este alias permite consultá-las sem editar o
 * arquivo gerado — quando os tipos forem regerados, basta voltar a usar
 * `supabase` diretamente.
 */
export const db = supabase as unknown as SupabaseClient;

/** Registra login e logout para o histórico que o administrador acompanha. */
export async function registrarAcesso(
  userId: string,
  email: string | null,
  tipo: "login" | "logout",
): Promise<void> {
  try {
    await db.from("acessos").insert({
      user_id: userId,
      email,
      tipo,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    });
  } catch {
    // O histórico é acessório: uma falha aqui não pode impedir o acesso.
  }
}
