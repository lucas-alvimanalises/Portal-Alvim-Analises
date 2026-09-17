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

// Compostos que hoje imprimem etiqueta física, na ordem em que saem no
// botão "Imprimir Etiquetas Serviço" (uma etiqueta divisória com o nome do
// composto antes de cada grupo, pra separar os rolos): Siloxanos, depois
// Compostos Sulfurados, depois VOCs.
export const LABEL_COMPOUND_CODES = ['11000', '22000', '12000'] as const;

// VOCs (12000) é o único composto de etiqueta "opcional" hoje: nem toda
// amostragem de VOCs do planejamento precisa de etiqueta física — por isso
// o botão "Imprimir Etiquetas Serviço" pergunta antes de incluir o grupo de
// VOCs (ver excludeCodes em ServiceLabelsPreviewParams/
// ConfirmServiceLabelsPayload). Siloxanos e Compostos Sulfurados continuam
// sempre incluídos quando presentes no agendamento.
export const VOCS_LABEL_CODE = '12000';

export interface ServiceLabelGroupDto {
  compoundId: string;
  compoundCode: string;
  compoundName: string;
  labels: PrintedLabelDto[];
  // true quando TODAS as etiquetas deste grupo já foram impressas antes.
  confirmed: boolean;
}

// GET /labels/service-preview — um grupo por composto de etiqueta presente
// no agendamento, na ordem de LABEL_COMPOUND_CODES. Mesma semântica de
// preview: não grava nada; POST /labels/service-confirm reserva os números
// de todos os grupos de uma vez.
export interface ServiceLabelsPreviewResponse {
  groups: ServiceLabelGroupDto[];
}

export interface ConfirmServiceLabelsPayload {
  scheduleId: string;
  // Códigos de composto pra deixar de fora deste lote (ver VOCS_LABEL_CODE)
  // — o composto some do resultado e sua sequência não é consumida.
  excludeCodes?: string[];
}
