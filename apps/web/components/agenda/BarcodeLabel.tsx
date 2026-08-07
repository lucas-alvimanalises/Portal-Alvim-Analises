'use client';

import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

interface BarcodeLabelProps {
  value: number;
}

// Código de barras CODE128 do número da etiqueta — formato padrão pra
// leitores de código de barras genéricos. Se o leitor da Alvim exigir outro
// (ex.: CODE39), é só trocar `format` abaixo.
export function BarcodeLabel({ value }: BarcodeLabelProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    JsBarcode(svgRef.current, String(value), {
      // Code128-A (não o "CODE128" genérico, que a lib comprime sozinha pro
      // modo C em string só de dígitos) — mesmo subtipo do arquivo de
      // referência da Alvim no ZebraDesigner (Etiqueta Silox.nlbl), pra sair
      // do mesmo tamanho/densidade de barras já validado fisicamente.
      format: 'CODE128A',
      displayValue: true,
      // Valores em px convertidos 1:1 das medidas em mm do ZebraDesigner
      // (96px/25,4mm ≈ 3,7795 px/mm — é assim que o navegador mapeia CSS
      // pra tamanho físico real no @page da etiqueta, ver page.tsx):
      // módulo 0,25mm (dimensão X já ajustada pra 203 DPI da ZD-220) e
      // altura de barra 3,25mm — tamanho do código de barras já bateu com a
      // referência física, não mexe aqui.
      //
      // Número saiu apagado na impressão térmica (fonte fina não satura bem
      // o elemento térmico em corpo pequeno) — negrito + maior, só o texto,
      // sem mudar largura/altura do código de barras acima.
      fontOptions: 'bold',
      fontSize: 14,
      textMargin: 3,
      margin: 0,
      height: 12.3,
      width: 0.95,
    });
  }, [value]);

  return <svg ref={svgRef} />;
}
