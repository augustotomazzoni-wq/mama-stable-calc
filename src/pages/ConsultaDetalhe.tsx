import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Copy, Printer, BookOpen, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { CalcInput, CalcResult } from "@/lib/calculator";
import { deserializeInput, deserializeResult } from "@/lib/calcSerializer";
import ResultCard from "@/components/ResultCard";
import MemoriaCalculoDetalhada from "@/components/MemoriaCalculoDetalhada";
import ResumoCalculos from "@/components/ResumoCalculos";

const ConsultaDetalhe = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [input, setInput] = useState<CalcInput | null>(null);
  const [result, setResult] = useState<CalcResult | null>(null);
  const [memoriaJson, setMemoriaJson] = useState<any>(null);
  const [view, setView] = useState<"resultado" | "memoria" | "resumo">("resultado");

  useEffect(() => {
    (async () => {
      if (!id) return;
      const { data, error } = await supabase
        .from("consultas_calculo")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error || !data) {
        toast.error("Cálculo não encontrado");
        navigate("/consultas");
        return;
      }
      try {
        const mem = data.memoria_calculo_completa as any;
        setInput(deserializeInput(data.dados_informados));
        setResult(deserializeResult(mem?.result ?? mem));
        setMemoriaJson(mem);
      } catch (e) {
        toast.error("Erro ao ler dados do cálculo.");
      }
    })();
  }, [id, navigate]);

  const copiarMemoria = () => {
    if (!memoriaJson) return;
    navigator.clipboard.writeText(JSON.stringify(memoriaJson, null, 2));
    toast.success("Memória de cálculo copiada!");
  };

  if (!input || !result) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Carregando cálculo...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4 print:hidden">
          <Button variant="outline" onClick={() => navigate("/consultas")} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
          <div className="flex gap-2">
            <Button size="sm" variant={view === "resultado" ? "default" : "outline"} onClick={() => setView("resultado")}>
              Resultado
            </Button>
            <Button size="sm" variant={view === "memoria" ? "default" : "outline"} onClick={() => setView("memoria")} className="gap-1">
              <BookOpen className="w-4 h-4" /> Memorial
            </Button>
            <Button size="sm" variant={view === "resumo" ? "default" : "outline"} onClick={() => setView("resumo")} className="gap-1">
              <ClipboardList className="w-4 h-4" /> Resumo
            </Button>
          </div>
        </div>

        <Card className="mb-4 print:hidden">
          <CardContent className="py-3 flex flex-wrap gap-2 justify-end">
            <Button size="sm" variant="secondary" onClick={copiarMemoria} className="gap-2">
              <Copy className="w-4 h-4" /> Copiar memória de cálculo
            </Button>
            <Button size="sm" variant="outline" onClick={() => window.print()} className="gap-2">
              <Printer className="w-4 h-4" /> Imprimir
            </Button>
            <Button size="sm" variant="outline" disabled title="Em breve">
              Exportar PDF (em breve)
            </Button>
          </CardContent>
        </Card>

        {view === "resultado" && (
          <ResultCard
            input={input}
            result={result}
            onReset={() => navigate("/consultas")}
            onBack={() => navigate("/consultas")}
            onOpenMemoria={() => setView("memoria")}
            onOpenConcepcao={() => setView("resultado")}
            onOpenResumo={() => setView("resumo")}
          />
        )}
        {view === "memoria" && (
          <MemoriaCalculoDetalhada input={input} result={result} onClose={() => setView("resultado")} />
        )}
        {view === "resumo" && (
          <ResumoCalculos input={input} result={result} onClose={() => setView("resultado")} />
        )}
      </div>
    </div>
  );
};

export default ConsultaDetalhe;