export type CustodyFieldType = 'text' | 'date' | 'time' | 'textarea';

export interface CustodyTemplateField {
  key: string;
  label: string;
  type: CustodyFieldType;
  required: boolean;
  // Presente quando o valor é fixo no modelo em branco da Alvim (ex.:
  // Metodologia, Procedimento Interno) — não varia por coleta, então não é
  // perguntado à IA nem editável na tela de conferência; o PDF gerado usa
  // esse valor direto.
  fixedValue?: string;
  // true pro "relatorio de campo n°" — não é lido do papel (lá é só um
  // placeholder "XXXX") nem fixo; o backend atribui na aprovação seguindo a
  // sequência dos documentos já gerados pro composto+ano (ex.: 11149/26 →
  // próximo é 11150/26).
  systemGenerated?: boolean;
}

// Metadados de controle de documento (cabeçalho do formulário oficial —
// "Responsável / Emissão / Revisão"), fixos por composto, sem relação com
// os dados da coleta em si. revisaoLabel/revisaoData ausentes em compostos
// cujo modelo não tem coluna de Revisão nesse cabeçalho (ex.: Compostos
// Sulfurados/Bags, que só tem Responsável/Emissão).
export interface CustodyDocumentMeta {
  responsavel: string;
  emissao: string;
  revisaoLabel?: string;
  revisaoData?: string;
}

export interface CustodyTemplateTableRow {
  key: string;
  label: string;
}

// Tabela de amostras do formulário (ex.: Siloxanos tem 4 colunas — A/B/C/
// Branco — x 4 linhas — Nº Impingers, Nº Amostrador Impinger, Volume
// Metanol inicial, Volume Metanol final).
export interface CustodyTemplateTable {
  columns: string[];
  rows: CustodyTemplateTableRow[];
}

export interface CustodyTemplateSchema {
  fields: CustodyTemplateField[];
  table: CustodyTemplateTable;
  documentMeta: CustodyDocumentMeta;
  // Chaves de `fields` renderizadas na linha especial do topo do formulário
  // ("relatorio de campo n° X   {composto}   DATA Y"), em vez de na tabela
  // de campos normal.
  topRowFieldKeys: { reportNumber: string; date: string };
  // A tabela de amostras (`table`) é inserida no PDF logo depois deste
  // campo — no modelo de Siloxanos, entre "Procedimento Interno" e "Bomba
  // de amostragem n°", igual ao formulário oficial. Ausente (e `table` com
  // fields/rows vazios) em compostos cujo modelo não tem tabela nenhuma —
  // ex.: VOCs, que é só uma lista simples de campos.
  tableInsertAfterKey?: string;
  // Campo onde a assinatura digital do aprovador (ver User.signatureFileId)
  // é inserida como imagem no PDF gerado — ausente em compostos que ainda
  // não têm esse campo modelado no template.
  signatureFieldKey?: string;
  // Linha da tabela de amostras cujos valores (uma coluna por elemento
  // amostrado) viram o "Código da amostra" do Sample na aprovação — ex.:
  // Siloxanos usa "Amostrador Impingers nsº" (1005830 - 1005831 - 1005832).
  // Ausente em compostos que ainda não têm essa regra definida.
  sampleCodeTableRowKey?: string;
  // Equivalente a sampleCodeTableRowKey pra modelos sem tabela de amostras
  // (um campo simples, não uma linha com várias colunas) — ex.: VOCs usa
  // "Tubo de Amostragem" (o identificador físico do tubo usado na coleta).
  sampleCodeFieldKey?: string;
}

export interface CustodyFieldTemplateDto {
  id: string;
  compoundId: string;
  compoundCode: string;
  compoundName: string;
  schema: CustodyTemplateSchema;
}
