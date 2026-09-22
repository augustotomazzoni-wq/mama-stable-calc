import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** Senha do primeiro acesso. A troca é obrigatória antes de usar o sistema. */
const SENHA_INICIAL = "123456";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization) throw new Error("NAO_AUTENTICADO");

    const url = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !anonKey || !serviceKey) throw new Error("CONFIGURACAO_INDISPONIVEL");

    const callerClient = createClient(url, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false },
    });
    const { data: userData, error: userError } = await callerClient.auth.getUser();
    if (userError || !userData.user) throw new Error("NAO_AUTENTICADO");

    const adminClient = createClient(url, serviceKey, { auth: { persistSession: false } });
    const { data: adminRole, error: roleError } = await adminClient
      .from("user_roles")
      .select("id")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (roleError || !adminRole) throw new Error("APENAS_ADMIN");

    const body = await req.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!email) throw new Error("EMAIL_INVALIDO");

    // Só cria ou redefine quem o administrador já liberou na lista.
    const { data: autorizado, error: autorizadoError } = await adminClient
      .from("usuarios_autorizados")
      .select("email, ativo")
      .ilike("email", email)
      .maybeSingle();
    if (autorizadoError) throw autorizadoError;
    if (!autorizado) throw new Error("EMAIL_NAO_AUTORIZADO");
    if (!autorizado.ativo) throw new Error("ACESSO_REVOGADO");

    // A conta pode já existir: nesse caso o pedido é devolver a senha inicial,
    // que é como alguém que esqueceu a senha volta a entrar sem depender de e-mail.
    const { data: lista, error: listaError } = await adminClient.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (listaError) throw listaError;
    const existente = lista.users.find((u) => (u.email ?? "").toLowerCase() === email);

    let acao: "criada" | "redefinida";
    let userId: string;

    if (existente) {
      const { error } = await adminClient.auth.admin.updateUserById(existente.id, {
        password: SENHA_INICIAL,
        email_confirm: true,
      });
      if (error) throw error;
      acao = "redefinida";
      userId = existente.id;
    } else {
      const { data: criado, error } = await adminClient.auth.admin.createUser({
        email,
        password: SENHA_INICIAL,
        email_confirm: true,
      });
      if (error) throw error;
      acao = "criada";
      userId = criado.user!.id;
    }

    // Enquanto a senha for a inicial, o primeiro acesso continua obrigatório.
    const { error: perfilError } = await adminClient
      .from("profiles")
      .upsert({ user_id: userId, deve_trocar_senha: true }, { onConflict: "user_id" });
    if (perfilError) throw perfilError;

    return new Response(JSON.stringify({ ok: true, acao }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "ERRO_AO_CRIAR_USUARIO";
    const status = message === "NAO_AUTENTICADO" || message === "APENAS_ADMIN" ? 403 : 400;
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
