// Etiqueta física impressa na Zebra ZD-220 (Siloxanos e Compostos
// Sulfurados/Enxofre hoje) — um registro por frasco individual, número
// nunca reaproveitado mesmo em reimpressão (ver PrintedLabel/LabelSequence
// no schema do backend).
export interface PrintedLabelDto {
  // Em pré-visualização (ainda não confirmada) é uma chave sintética
  // estável (ponto+composto+frasco+índice), não o id real da linha no
  // banco — só existe de verdade a partir da confirmação da impressão.
  id: string;
  number: number;
  bottleIndex: number;
  // 1..3 — qual das 3 etiquetas sequenciais desse frasco.
  labelIndex: number;
  compoundId: string;
  compoundCode: string;
  compoundName: string;
  samplingPointName: string;
  clientName: string;
  scheduledDate: string;
  // null enquanto for só pré-visualização (nada gravado ainda).
  createdAt: string | null;
}

// GET /labels/preview — nunca grava nada; `confirmed` diz se TODAS as
// etiquetas já foram impressas antes (reabrir mostra exatamente os mesmos
// números) ou se alguma ainda é só prévia (números ainda não reservados,
// só viram reais quando o usuário confirma a impressão).
export interface PreviewLabelsResponse {
  labels: PrintedLabelDto[];
  confirmed: boolean;
}

export interface PrintLabelsPayload {
  scheduleId: string;
  compoundId: string;
}
