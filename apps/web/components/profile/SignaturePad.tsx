'use client';

import { forwardRef, useImperativeHandle, useRef, useState } from 'react';

export interface SignaturePadHandle {
  isEmpty(): boolean;
  clear(): void;
  toBlob(): Promise<Blob | null>;
}

interface SignaturePadProps {
  // Notifica o pai a cada traço/limpeza — usado só pra habilitar/desabilitar
  // o botão de salvar reativamente, sem precisar dar poll no ref.
  onContentChange?: (hasContent: boolean) => void;
}

const CANVAS_WIDTH = 460;
const CANVAS_HEIGHT = 160;

function getPoint(canvas: HTMLCanvasElement, e: React.PointerEvent) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - rect.left) / rect.width) * canvas.width,
    y: ((e.clientY - rect.top) / rect.height) * canvas.height,
  };
}

// Pad de assinatura: desenha com mouse/dedo direto no canvas (alternativa a
// enviar um arquivo de imagem já pronto). O componente pai lê o conteúdo via
// ref (toBlob) só na hora de salvar, em vez de reportar a cada traço.
export const SignaturePad = forwardRef<SignaturePadHandle, SignaturePadProps>(function SignaturePad(
  { onContentChange },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const [hasContent, setHasContent] = useState(false);

  function getContext() {
    return canvasRef.current?.getContext('2d') ?? null;
  }

  function updateHasContent(value: boolean) {
    setHasContent(value);
    onContentChange?.(value);
  }

  useImperativeHandle(ref, () => ({
    isEmpty: () => !hasContent,
    clear: () => {
      const canvas = canvasRef.current;
      const ctx = getContext();
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      updateHasContent(false);
    },
    toBlob: () =>
      new Promise((resolve) => {
        const canvas = canvasRef.current;
        if (!canvas || !hasContent) {
          resolve(null);
          return;
        }
        canvas.toBlob((blob) => resolve(blob), 'image/png');
      }),
  }));

  function startDrawing(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const ctx = getContext();
    if (!canvas || !ctx) return;
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    const { x, y } = getPoint(canvas, e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function draw(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    const ctx = getContext();
    if (!canvas || !ctx) return;
    e.preventDefault();
    const { x, y } = getPoint(canvas, e);
    ctx.lineTo(x, y);
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    if (!hasContent) updateHasContent(true);
  }

  function stopDrawing() {
    drawingRef.current = false;
  }

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      onPointerDown={startDrawing}
      onPointerMove={draw}
      onPointerUp={stopDrawing}
      onPointerLeave={stopDrawing}
      style={{
        width: '100%',
        maxWidth: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        touchAction: 'none',
        border: '1px solid var(--color-border)',
        borderRadius: 6,
        background: '#fff',
        cursor: 'crosshair',
        display: 'block',
      }}
    />
  );
});
