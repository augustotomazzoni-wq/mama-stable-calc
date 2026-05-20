import { useState } from "react";
import { CalcInput, CalcResult } from "@/lib/calculator";
import { formatBRL, formatDateBR } from "@/lib/dateUtils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Printer } from "lucide-react";
import Logo from "@/components/Logo";

interface Props {
  input: CalcInput;
  result: CalcResult;
  onClose: () => void;
}

const LinhaVerba = ({
  titulo,
  valor,
  formula,
}: {
  titulo: string;
  valor: number;
  formula: string;
}) => (
  <div className="py-3 border-b border-border/60">
    <div className="flex items-baseline justify-between">
      <span className="text-sm font-medium text-foreground">{titulo}</span>
      <span className="text-sm font-semibold text-foreground tabular-nums">{formatBRL(valor)}</span>
    </div>
    <p className="text-xs text-muted-foreground mt-1 font-mono">Cálculo: {formula}</p>
  </div>
);

const SubtotalLinha = ({ titulo, valor }: { titulo: string; valor: number }) => (
  <div className="py-3 border-b-2 border-foreground/20">
    <div className="flex items-baseline justify-between">
      <span className="text-sm font-bold text-foreground uppercase tracking-wide">{titulo}</span>
      <span className="text-base font-bold text-foreground tabular-nums">{formatBRL(valor)}</span>
    </div>
  </div>
);

interface DadoItem {
  key: string;
  label: string;
  value: string;
}

const DadoLinha = ({
  label,
  value,
  checked,
  onToggle,
}: {
  label: string;
  value: string;
  checked: boolean;
  onToggle: () => void;
}) => (
  <div className={`flex items-center gap-2 ${!checked ? "print:hidden" : ""}`}>
    <Checkbox
      checked={checked}
      onCheckedChange={onToggle}
      className="print:hidden h-3.5 w-3.5"
    />
    <span className="text-muted-foreground text-sm">{label}</span>
    <span className="font-medium text-foreground text-sm ml-auto">{value}</span>
  </div>
);

const MemoriaCalculoDetalhada = ({ input, result, onClose }: Props) => {
  const t1 = result.tabela1;
  const t2 = result.tabela2;
  const mf = result.multaFgts;
  const aliquotaLabel = input.empregadaDomestica ? "11,2%" : "8%";
  const meses = result.mesesEstabilidade;
  const sal = input.salario;

  const fmt = (v: number) => formatBRL(v);

  const handlePrint = () => {
    window.print();
  };

  // Build dados do caso items
  const dadosItems: DadoItem[] = [
    { key: "nome", label: "Nome da reclamante", value: input.nome },
    { key: "nascimento", label: "Data de nascimento", value: formatDateBR(input.nascimento) },
    ...(input.admissao
      ? [{ key: "admissao", label: "Data de admissão", value: formatDateBR(input.admissao) }]
      : []),
    { key: "demissao", label: "Data de demissão", value: formatDateBR(input.demissao) },
    { key: "concepcao", label: "Data de concepção", value: formatDateBR(input.concepcao) },
    { key: "parto", label: "Data do parto / previsão", value: formatDateBR(result.previsaoParto) },
    { key: "fimEstab", label: "Fim da estabilidade", value: formatDateBR(result.fimEstabilidade) },
    { key: "salario", label: "Salário base (CTPS)", value: fmt(sal) },
    { key: "categoria", label: "Categoria profissional", value: input.empregadaDomestica ? "Empregada doméstica" : "CLT geral" },
    { key: "rescisao", label: "Tipo de rescisão", value: result.tipoRescisao },
    { key: "aliquota", label: "Alíquota FGTS", value: aliquotaLabel },
    { key: "meses", label: "Meses de estabilidade", value: String(meses) },
  ];

  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>(
    () => Object.fromEntries(dadosItems.map((d) => [d.key, true]))
  );

  const toggleItem = (key: string) => {
    setCheckedItems((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-2xl mx-auto font-[Calibri,sans-serif]">
      {/* Cabeçalho */}
      <div className="text-center border-b-2 border-foreground/30 pb-6">
        <Logo size="md" className="mx-auto mb-3" />
        <h1 className="text-lg font-bold text-foreground uppercase tracking-widest">
          Memorial de Cálculo Detalhado
        </h1>
      </div>

      {/* 1. Dados do Caso */}
      <section>
        <h2 className="text-sm font-bold text-foreground uppercase tracking-wide border-b border-foreground/20 pb-2 mb-4">
          1. Dados do Caso
        </h2>
        <div className="grid grid-cols-1 gap-y-1.5">
          {dadosItems.map((item) => (
            <DadoLinha
              key={item.key}
              label={item.label}
              value={item.value}
              checked={checkedItems[item.key] ?? true}
              onToggle={() => toggleItem(item.key)}
            />
          ))}
        </div>
      </section>

      {/* 2. Cálculo de Indenização */}
      <section>
        <h2 className="text-sm font-bold text-foreground uppercase tracking-wide border-b border-foreground/20 pb-2 mb-4">
          2. Cálculo de Indenização
        </h2>

        <LinhaVerba
          titulo="Salários do período"
          valor={t1.salarios}
          formula={`${fmt(sal)} × ${meses} meses = ${fmt(t1.salarios)}`}
        />
        <LinhaVerba
          titulo="13º proporcional"
          valor={t1.decimoTerceiro}
          formula={`(${fmt(sal)} ÷ 12) × ${meses} = ${fmt(t1.decimoTerceiro)}`}
        />
        <LinhaVerba
          titulo="Férias + 1/3"
          valor={t1.feriasComTerco}
          formula={`(${fmt(sal)} ÷ 3) + ${fmt(t1.decimoTerceiro)} = ${fmt(t1.feriasComTerco)}`}
        />
        <LinhaVerba
          titulo={`FGTS (${aliquotaLabel})`}
          valor={t1.fgts}
          formula={`(${fmt(t1.salarios)} + ${fmt(t1.decimoTerceiro)} + ${fmt(t1.feriasComTerco)}) × ${aliquotaLabel} = ${fmt(t1.fgts)}`}
        />

        <SubtotalLinha titulo="Subtotal Indenização" valor={t1.total} />
      </section>

      {/* 3. Cálculo das verbas rescisórias */}
      {t2 && (
        <section>
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wide border-b border-foreground/20 pb-2 mb-4">
            3. Cálculo das Verbas Rescisórias
          </h2>

          <LinhaVerba
            titulo="Aviso prévio"
            valor={t2.avisoProvio}
            formula={`${fmt(sal)} (1 salário)`}
          />
          <LinhaVerba
            titulo="13º sobre aviso"
            valor={t2.decimoTerceiroAviso}
            formula={`${fmt(t2.avisoProvio)} ÷ 12 = ${fmt(t2.decimoTerceiroAviso)}`}
          />
          <LinhaVerba
            titulo="Férias + 1/3 sobre aviso"
            valor={t2.feriasComTercoAviso}
            formula={`(${fmt(t2.decimoTerceiroAviso)} ÷ 3) + ${fmt(t2.decimoTerceiroAviso)} = ${fmt(t2.feriasComTercoAviso)}`}
          />
          <LinhaVerba
            titulo="Multa art. 477"
            valor={t2.multa477}
            formula={`${fmt(sal)} (1 salário)`}
          />

          <SubtotalLinha titulo="Subtotal Verbas Rescisórias" valor={t2.total} />
        </section>
      )}

      {/* 4. Multa de 40% do FGTS */}
      {mf && (
        <section>
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wide border-b border-foreground/20 pb-2 mb-4">
            {t2 ? "4" : "3"}. Multa de 40% do FGTS
          </h2>

          <LinhaVerba
            titulo="FGTS sobre verbas indenizatórias"
            valor={mf.fgtsRescisorio}
            formula={`Valor apurado no item 2: ${fmt(mf.fgtsRescisorio)}`}
          />
          <LinhaVerba
            titulo="FGTS estimado do período já trabalhado"
            valor={mf.fgtsPeriodoContrato}
            formula={`${mf.mesesTrabalhados} meses × ${fmt(sal)} × ${aliquotaLabel} = ${fmt(mf.fgtsPeriodoContrato)}`}
          />
          <div className="py-3 border-b border-border/60">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-medium text-foreground">Base total do FGTS</span>
              <span className="text-sm font-semibold text-foreground tabular-nums">{fmt(mf.baseTotalFgts)}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1 font-mono">
              Cálculo: {fmt(mf.fgtsRescisorio)} + {fmt(mf.fgtsPeriodoContrato)} = {fmt(mf.baseTotalFgts)}
            </p>
          </div>
          <SubtotalLinha titulo="Multa de 40% do FGTS" valor={mf.multa40} />
        </section>
      )}

      {/* Total Geral */}
      <section className="border-t-2 border-foreground/30 pt-6">
        <div className="flex items-baseline justify-between">
          <span className="text-base font-bold text-foreground uppercase tracking-wide">Total Geral da Indenização</span>
          <span className="text-2xl font-bold text-foreground tabular-nums">{fmt(result.totalFinal)}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-2 font-mono">
          Composição: Indenização ({fmt(t1.total)}){t2 ? ` + Verbas Rescisórias (${fmt(t2.total)})` : ""}{mf ? ` + Multa 40% FGTS (${fmt(mf.multa40)})` : ""} = {fmt(result.totalFinal)}
        </p>
      </section>

      {/* Rodapé */}
      <div className="text-center border-t border-foreground/20 pt-6 space-y-1">
        <p className="text-xs font-semibold text-foreground">Elaborado por Dr. Augusto Tomazzoni Lubenow</p>
        <p className="text-xs text-muted-foreground">OAB 133519</p>
      </div>

      {/* Action buttons */}
      <div className="print:hidden space-y-3 pt-4">
        <Button onClick={handlePrint} className="w-full gap-2">
          <Printer className="w-4 h-4" />
          Imprimir memorial
        </Button>
        <Button onClick={onClose} variant="outline" className="w-full gap-2">
          <X className="w-4 h-4" />
          Fechar memorial de cálculo
        </Button>
      </div>
    </div>
  );
};

export default MemoriaCalculoDetalhada;
