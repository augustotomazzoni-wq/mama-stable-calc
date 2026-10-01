import { useEffect, useRef, useState } from "react";

/**
 * Rascunho do formulário, guardado no próprio navegador.
 *
 * São trinta campos até chegar no resultado. Antes, fechar a aba no meio do
 * preenchimento perdia tudo — os cálculos finalizados ficam salvos, o meio do
 * caminho não ficava. Aqui o estado vai para o localStorage a cada mudança, e
 * ao reabrir a tela o escritório escolhe se retoma ou começa de novo.
 *
 * Fica só nesta máquina e neste navegador: é conveniência de digitação, não
 * armazenamento de dados da cliente. O cálculo concluído continua sendo salvo
 * no banco, como sempre foi.
 */
const CHAVE = "calculo-gestante:rascunho";
const ATRASO_MS = 400;

export interface Rascunho<T> {
  valores: T;
  salvoEm: string;
}

function ler<T>(): Rascunho<T> | null {
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (!bruto) return null;
    const dados = JSON.parse(bruto) as Rascunho<T>;
    return dados && dados.valores ? dados : null;
  } catch {
    // Modo privativo, cota cheia ou JSON corrompido: segue sem rascunho.
    return null;
  }
}

export function useRascunho<T>(valores: T, vazio: boolean) {
  // Lido uma vez só, na montagem: depois o próprio formulário é a verdade.
  const [encontrado, setEncontrado] = useState<Rascunho<T> | null>(() => ler<T>());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Formulário em branco não vira rascunho — senão, ao descartar, um
    // rascunho vazio nasceria no lugar e o aviso voltaria.
    if (vazio) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      try {
        localStorage.setItem(
          CHAVE,
          JSON.stringify({ valores, salvoEm: new Date().toISOString() }),
        );
      } catch {
        // Sem espaço ou sem permissão: o formulário continua funcionando.
      }
    }, ATRASO_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [valores, vazio]);

  const descartar = () => {
    try {
      localStorage.removeItem(CHAVE);
    } catch {
      // Nada a fazer: o aviso some de qualquer forma.
    }
    setEncontrado(null);
  };

  return { rascunho: encontrado, descartar };
}
