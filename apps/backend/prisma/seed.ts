import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { CustodyTemplateSchema, CertificateAnalyteConfig } from '@portal-alvim/shared';

const prisma = new PrismaClient();

// Campos da cadeia de custódia de Siloxanos — ordem e rótulos seguem
// exatamente o modelo de campo em branco da Alvim ("11000 - Cadeia de
// custódia Silox (MODELO DE CAMPO).pdf"), pra o PDF gerado reproduzir esse
// mesmo layout. Campos com `fixedValue` (Responsável pela Amostragem,
// Metodologia, Procedimento Interno) já vêm preenchidos no modelo em
// branco — não variam por coleta, então não são perguntados à IA nem
// editáveis na conferência. "Nº Relatório de Campo" é `systemGenerated`:
// no modelo é só um placeholder "XXXX" — o número de verdade é atribuído
// pelo backend na aprovação, seguindo a sequência já usada (ex.: o último
// gerado foi 11149/26 → o próximo fica 11150/26).
const SILOXANOS_CUSTODY_TEMPLATE: CustodyTemplateSchema = {
  fields: [
    { key: 'relatorioCampo', label: 'Relatório de Campo nº', type: 'text', required: false, systemGenerated: true },
    { key: 'dataAmostragem', label: 'Data', type: 'date', required: true },
    { key: 'empresa', label: 'Empresa', type: 'text', required: true },
    { key: 'endereco', label: 'Endereço', type: 'text', required: true },
    {
      key: 'localAmostragem',
      label: 'Local de Amostragem (PONTO DE AMOSTRAGEM)',
      type: 'text',
      required: true,
    },
    {
      key: 'matrizAmostra',
      label: 'Matriz amostra (BIOGÁS/BIOMETANO)',
      type: 'text',
      required: true,
    },
    {
      key: 'respAmostragemEmpresaTel',
      label: 'Responsável pela Amostragem / empresa / fone',
      type: 'text',
      required: false,
      fixedValue: 'Gilberto Carlos Lopes Alvim / alvimanalises / 011 99658.8935',
    },
    {
      key: 'amostrador',
      label: 'Amostrador / responsável pela coleta',
      type: 'text',
      required: true,
    },
    {
      key: 'metodologia',
      label: 'Metodologia',
      type: 'text',
      required: false,
      fixedValue:
        'NBR 16560 - "Determinação de Siloxanos por Cromatografia em fase gasosa e amostragem por impingers"',
    },
    {
      key: 'procedimentoInterno',
      label: 'Procedimento Interno',
      type: 'text',
      required: false,
      fixedValue: 'PT01 - "Procedimento Técnico de Amostragem - Siloxanos"',
    },
    { key: 'bombaAmostragemN', label: 'Bomba de amostragem nº', type: 'text', required: false },
    {
      key: 'vazaoAmostragem',
      label: 'Vazão de amostragem (L / minutos)',
      type: 'text',
      required: false,
    },
    {
      key: 'dataCalibracaoBomba',
      label: 'Data calibração bomba de amostragem',
      type: 'date',
      required: false,
    },
    { key: 'horaInicioAmostragem', label: 'Hora início amostragem', type: 'time', required: false },
    { key: 'horaFinalAmostragem', label: 'Hora final de amostragem', type: 'time', required: false },
    {
      key: 'totalAmostragem',
      label: 'Total de amostragem (minutos) / volume em litros',
      type: 'text',
      required: false,
    },
    {
      key: 'assinaturaAmostrador',
      label: 'Assinatura amostrador',
      type: 'text',
      required: false,
      fixedValue: '',
    },
    {
      key: 'observacoes',
      label: 'Observações (Descrever ocorridos durante a amostragem)',
      type: 'textarea',
      required: false,
    },
  ],
  table: {
    columns: ['A', 'B', 'C', 'Branco'],
    rows: [
      { key: 'impingerN', label: 'impingers nºs' },
      { key: 'amostradorImpingerN', label: 'Amostrador Impingers nsº' },
      { key: 'volumeMetanolInicial', label: 'Volume Metanol inicial' },
      { key: 'volumeMetanolFinalRecuperado', label: 'Volume Metanol final - RECUPERADO' },
    ],
  },
  documentMeta: {
    responsavel: 'Gilberto C. Lopes Alvim',
    emissao: 'mar/19',
    revisaoLabel: 'Revisão 01',
    revisaoData: '29/03/2026',
  },
  topRowFieldKeys: { reportNumber: 'relatorioCampo', date: 'dataAmostragem' },
  tableInsertAfterKey: 'procedimentoInterno',
  signatureFieldKey: 'assinaturaAmostrador',
  sampleCodeTableRowKey: 'amostradorImpingerN',
};

// Cadeia de custódia de VOCs — ordem e rótulos seguem exatamente o modelo
// de campo em branco da Alvim ("12000 - Cadeia de custódia VOCs (MODELO DE
// CAMPO).xlsx"). Diferente de Siloxanos, esse modelo não tem tabela de
// amostras (impingers) nem linha de assinatura — é só uma lista simples de
// campos, um valor por campo. "Tubo de Amostragem" faz o papel que
// "Amostrador Impingers nsº" faz em Siloxanos: o identificador físico do
// que foi usado na coleta, que vira o "Código da amostra" na aprovação (ver
// sampleCodeFieldKey, e sampleCodeTableRowKey pro caso com tabela).
const VOCS_CUSTODY_TEMPLATE: CustodyTemplateSchema = {
  fields: [
    { key: 'relatorioCampo', label: 'Relatório de Campo nº', type: 'text', required: false, systemGenerated: true },
    { key: 'dataAmostragem', label: 'Data', type: 'date', required: true },
    { key: 'empresa', label: 'Empresa', type: 'text', required: true },
    { key: 'endereco', label: 'Endereço', type: 'text', required: true },
    {
      key: 'localAmostragem',
      label: 'Local de Amostragem (PONTO DE AMOSTRAGEM)',
      type: 'text',
      required: true,
    },
    {
      key: 'matrizAmostra',
      label: 'Matriz amostra (BIOGÁS/BIOMETANO)',
      type: 'text',
      required: true,
    },
    {
      key: 'respAmostragemEmpresaTel',
      label: 'Responsável pela Amostragem / empresa / fone',
      type: 'text',
      required: false,
      fixedValue: 'Gilberto Carlos Lopes Alvim / alvimanalises / 011 99658.8935',
    },
    {
      key: 'amostrador',
      label: 'Amostrador / Responsavel pela coleta',
      type: 'text',
      required: true,
    },
    {
      key: 'metodologia',
      label: 'Metodologia',
      type: 'text',
      required: false,
      fixedValue:
        'NBR 16562 - "Determinação de Compostos Orgânicos Voláteis por Cromatografia em fase gasosa e amostragem com tubo de dessorção térmica"',
    },
    {
      key: 'procedimentoInterno',
      label: 'Procedimento Interno',
      type: 'text',
      required: false,
      fixedValue: 'PT02 - "Procedimento Técnico de Amostragem - VOCS"',
    },
    { key: 'tuboAmostragem', label: 'Tubo de Amostragem', type: 'text', required: true },
    { key: 'bombaAmostragemN', label: 'Bomba de amostragem nº', type: 'text', required: false },
    {
      key: 'vazaoAmostragem',
      label: 'Vazão de amostragem (L / minutos)',
      type: 'text',
      required: false,
    },
    { key: 'horaInicioAmostragem', label: 'Hora inicio amostragem', type: 'time', required: false },
    { key: 'horaFinalAmostragem', label: 'Hora final de amostragem', type: 'time', required: false },
    {
      key: 'totalAmostragem',
      label: 'Total de amostragem (minutos) / volume em litros',
      type: 'text',
      required: false,
    },
    {
      key: 'observacoes',
      label: 'Observações (Descrever como foi o ocorrido durante a amostragem) TIRAR FOTO:',
      type: 'textarea',
      required: false,
    },
  ],
  table: { columns: [], rows: [] },
  documentMeta: {
    responsavel: 'Gilberto C. Lopes Alvim',
    emissao: 'mar/19',
    revisaoLabel: 'Revisão 01',
    revisaoData: '29/03/2026',
  },
  topRowFieldKeys: { reportNumber: 'relatorioCampo', date: 'dataAmostragem' },
  sampleCodeFieldKey: 'tuboAmostragem',
};

// Cadeia de custódia de Metais — ordem e rótulos seguem exatamente o modelo
// de campo em branco da Alvim ("13000 - Cadeia de custódia METAIS (MODELO DE
// CAMPO).xlsx"). Mesma estrutura de VOCs (sem tabela, sem assinatura):
// "Cassete de Amostragem" faz o papel de identificador físico da coleta
// (vira o "Código da amostra" na aprovação, ver sampleCodeFieldKey).
const METAIS_CUSTODY_TEMPLATE: CustodyTemplateSchema = {
  fields: [
    { key: 'relatorioCampo', label: 'Relatório de Campo nº', type: 'text', required: false, systemGenerated: true },
    { key: 'dataAmostragem', label: 'Data', type: 'date', required: true },
    { key: 'empresa', label: 'Empresa', type: 'text', required: true },
    { key: 'endereco', label: 'Endereço', type: 'text', required: true },
    {
      key: 'localAmostragem',
      label: 'Local de Amostragem (PONTO DE AMOSTRAGEM)',
      type: 'text',
      required: true,
    },
    {
      key: 'matrizAmostra',
      label: 'Matriz amostra (BIOGÁS/BIOMETANO)',
      type: 'text',
      required: true,
    },
    {
      key: 'respAmostragemEmpresaTel',
      label: 'Responsável pela Amostragem / empresa / fone',
      type: 'text',
      required: false,
      fixedValue: 'Gilberto Carlos Lopes Alvim / alvimanalises / 011 99658.8935',
    },
    {
      key: 'amostrador',
      label: 'Amostrador / Responsavel pela coleta',
      type: 'text',
      required: true,
    },
    {
      key: 'metodologia',
      label: 'Metodologia',
      type: 'text',
      required: false,
      fixedValue:
        'NIOSH 7303 - "ICP Espectrometria de Emissão Ótica por Plasma Indutivamente Acoplado Amostrador: cassete de poliestureno de 37 mm referencia"',
    },
    {
      key: 'procedimentoInterno',
      label: 'Procedimento Interno',
      type: 'text',
      required: false,
      fixedValue: 'PT04 - "Procedimento Técnico de Amostragem - Metais"',
    },
    { key: 'casseteAmostragem', label: 'Cassete de Amostragem', type: 'text', required: true },
    { key: 'bombaAmostragemN', label: 'Bomba de amostragem nº', type: 'text', required: false },
    {
      key: 'vazaoAmostragem',
      label: 'Vazão de amostragem (L / minutos)',
      type: 'text',
      required: false,
    },
    { key: 'horaInicioAmostragem', label: 'Hora inicio amostragem', type: 'time', required: false },
    { key: 'horaFinalAmostragem', label: 'Hora final de amostragem', type: 'time', required: false },
    {
      key: 'totalAmostragem',
      label: 'Total de amostragem (minutos) / volume em litros',
      type: 'text',
      required: false,
    },
    {
      key: 'observacoes',
      label: 'Observações (Descrever como foi o ocorrido durante a amostragem) TIRAR FOTO:',
      type: 'textarea',
      required: false,
    },
  ],
  table: { columns: [], rows: [] },
  documentMeta: {
    responsavel: 'Gilberto C. Lopes Alvim',
    emissao: 'mar/19',
    revisaoLabel: 'Revisão 01',
    revisaoData: '29/03/2026',
  },
  topRowFieldKeys: { reportNumber: 'relatorioCampo', date: 'dataAmostragem' },
  sampleCodeFieldKey: 'casseteAmostragem',
};

// Cadeia de custódia de Mercúrio — ordem e rótulos seguem exatamente o modelo
// de campo em branco da Alvim ("14000 - Cadeia de custódia MERCÚRIO (MODELO
// DE CAMPO).xlsx"). Mesma estrutura de VOCs (sem tabela, sem assinatura,
// "Tubo de Amostragem" como identificador físico da coleta).
const MERCURIO_CUSTODY_TEMPLATE: CustodyTemplateSchema = {
  fields: [
    { key: 'relatorioCampo', label: 'Relatório de Campo nº', type: 'text', required: false, systemGenerated: true },
    { key: 'dataAmostragem', label: 'Data', type: 'date', required: true },
    { key: 'empresa', label: 'Empresa', type: 'text', required: true },
    { key: 'endereco', label: 'Endereço', type: 'text', required: true },
    {
      key: 'localAmostragem',
      label: 'Local de Amostragem (PONTO DE AMOSTRAGEM)',
      type: 'text',
      required: true,
    },
    {
      key: 'matrizAmostra',
      label: 'Matriz amostra (BIOGÁS/BIOMETANO)',
      type: 'text',
      required: true,
    },
    {
      key: 'respAmostragemEmpresaTel',
      label: 'Responsável pela Amostragem / empresa / fone',
      type: 'text',
      required: false,
      fixedValue: 'Gilberto Carlos Lopes Alvim / alvimanalises / 011 99658.8935',
    },
    {
      key: 'amostrador',
      label: 'Amostrador / Responsavel pela coleta',
      type: 'text',
      required: true,
    },
    {
      key: 'metodologia',
      label: 'Metodologia',
      type: 'text',
      required: false,
      fixedValue: 'NIOSH 6009 - "Air Sampling for Mercury"',
    },
    {
      key: 'procedimentoInterno',
      label: 'Procedimento Interno',
      type: 'text',
      required: false,
      fixedValue: 'PT06 - "Procedimento Técnico de Amostragem - Mercúrio"',
    },
    { key: 'tuboAmostragem', label: 'Tubo de Amostragem', type: 'text', required: true },
    { key: 'bombaAmostragemN', label: 'Bomba de amostragem nº', type: 'text', required: false },
    {
      key: 'vazaoAmostragem',
      label: 'Vazão de amostragem (L / minutos)',
      type: 'text',
      required: false,
    },
    { key: 'horaInicioAmostragem', label: 'Hora inicio amostragem', type: 'time', required: false },
    { key: 'horaFinalAmostragem', label: 'Hora final de amostragem', type: 'time', required: false },
    {
      key: 'totalAmostragem',
      label: 'Total de amostragem (minutos) / volume em litros',
      type: 'text',
      required: false,
    },
    {
      key: 'observacoes',
      label: 'Observações (Descrever como foi o ocorrido durante a amostragem) TIRAR FOTO:',
      type: 'textarea',
      required: false,
    },
  ],
  table: { columns: [], rows: [] },
  documentMeta: {
    responsavel: 'Gilberto C. Lopes Alvim',
    emissao: 'mar/19',
    revisaoLabel: 'Revisão 01',
    revisaoData: '29/03/2026',
  },
  topRowFieldKeys: { reportNumber: 'relatorioCampo', date: 'dataAmostragem' },
  sampleCodeFieldKey: 'tuboAmostragem',
};

// Cadeia de custódia de Amônia — ordem e rótulos seguem exatamente o modelo
// de campo em branco da Alvim ("15000 - Cadeia de custódia AMÔNIA (MODELO DE
// CAMPO).xlsx"). Mesma estrutura de VOCs/Mercúrio (sem tabela, sem
// assinatura, "Tubo de Amostragem" como identificador físico da coleta).
const AMONIA_CUSTODY_TEMPLATE: CustodyTemplateSchema = {
  fields: [
    { key: 'relatorioCampo', label: 'Relatório de Campo nº', type: 'text', required: false, systemGenerated: true },
    { key: 'dataAmostragem', label: 'Data', type: 'date', required: true },
    { key: 'empresa', label: 'Empresa', type: 'text', required: true },
    { key: 'endereco', label: 'Endereço', type: 'text', required: true },
    {
      key: 'localAmostragem',
      label: 'Local de Amostragem (PONTO DE AMOSTRAGEM)',
      type: 'text',
      required: true,
    },
    {
      key: 'matrizAmostra',
      label: 'Matriz amostra (BIOGÁS/BIOMETANO)',
      type: 'text',
      required: true,
    },
    {
      key: 'respAmostragemEmpresaTel',
      label: 'Responsável pela Amostragem / empresa / fone',
      type: 'text',
      required: false,
      fixedValue: 'Gilberto Carlos Lopes Alvim / alvimanalises / 011 99658.8935',
    },
    {
      key: 'amostrador',
      label: 'Amostrador / Responsavel pela coleta',
      type: 'text',
      required: true,
    },
    {
      key: 'metodologia',
      label: 'Metodologia',
      type: 'text',
      required: false,
      fixedValue: 'NIOSH 6016 - "Cromatografia de Íons"',
    },
    {
      key: 'procedimentoInterno',
      label: 'Procedimento Interno',
      type: 'text',
      required: false,
      fixedValue: 'PT07 - "Procedimento Técnico de Amostragem - Amônia"',
    },
    { key: 'tuboAmostragem', label: 'Tubo de Amostragem', type: 'text', required: true },
    { key: 'bombaAmostragemN', label: 'Bomba de amostragem nº', type: 'text', required: false },
    {
      key: 'vazaoAmostragem',
      label: 'Vazão de amostragem (L / minutos)',
      type: 'text',
      required: false,
    },
    { key: 'horaInicioAmostragem', label: 'Hora inicio amostragem', type: 'time', required: false },
    { key: 'horaFinalAmostragem', label: 'Hora final de amostragem', type: 'time', required: false },
    {
      key: 'totalAmostragem',
      label: 'Total de amostragem (minutos) / volume em litros',
      type: 'text',
      required: false,
    },
    {
      key: 'observacoes',
      label: 'Observações (Descrever como foi o ocorrido durante a amostragem) TIRAR FOTO:',
      type: 'textarea',
      required: false,
    },
  ],
  table: { columns: [], rows: [] },
  documentMeta: {
    responsavel: 'Gilberto C. Lopes Alvim',
    emissao: 'mar/19',
    revisaoLabel: 'Revisão 01',
    revisaoData: '29/03/2026',
  },
  topRowFieldKeys: { reportNumber: 'relatorioCampo', date: 'dataAmostragem' },
  sampleCodeFieldKey: 'tuboAmostragem',
};

// Cadeia de custódia de Particulados — ordem e rótulos seguem exatamente o
// modelo de campo em branco da Alvim ("16000 - Cadeia de custódia
// PARTICULADOS (MODELO DE CAMPO).xlsx"). Mesma estrutura de Metais (sem
// tabela, sem assinatura, "Cassete de Amostragem" como identificador físico).
const PARTICULADOS_CUSTODY_TEMPLATE: CustodyTemplateSchema = {
  fields: [
    { key: 'relatorioCampo', label: 'Relatório de Campo nº', type: 'text', required: false, systemGenerated: true },
    { key: 'dataAmostragem', label: 'Data', type: 'date', required: true },
    { key: 'empresa', label: 'Empresa', type: 'text', required: true },
    { key: 'endereco', label: 'Endereço', type: 'text', required: true },
    {
      key: 'localAmostragem',
      label: 'Local de Amostragem (PONTO DE AMOSTRAGEM)',
      type: 'text',
      required: true,
    },
    {
      key: 'matrizAmostra',
      label: 'Matriz amostra (BIOGÁS/BIOMETANO)',
      type: 'text',
      required: true,
    },
    {
      key: 'respAmostragemEmpresaTel',
      label: 'Responsável pela Amostragem / empresa / fone',
      type: 'text',
      required: false,
      fixedValue: 'Gilberto Carlos Lopes Alvim / alvimanalises / 011 99658.8935',
    },
    {
      key: 'amostrador',
      label: 'Amostrador / Responsavel pela coleta',
      type: 'text',
      required: true,
    },
    {
      key: 'metodologia',
      label: 'Metodologia',
      type: 'text',
      required: false,
      fixedValue: 'NIOSH 0500 - "Particulados Totais"',
    },
    {
      key: 'procedimentoInterno',
      label: 'Procedimento Interno',
      type: 'text',
      required: false,
      fixedValue: 'PT05 - "Procedimento Técnico de Amostragem - Particulados"',
    },
    { key: 'casseteAmostragem', label: 'Cassete de Amostragem', type: 'text', required: true },
    { key: 'bombaAmostragemN', label: 'Bomba de amostragem nº', type: 'text', required: false },
    {
      key: 'vazaoAmostragem',
      label: 'Vazão de amostragem (L / minutos)',
      type: 'text',
      required: false,
    },
    { key: 'horaInicioAmostragem', label: 'Hora inicio amostragem', type: 'time', required: false },
    { key: 'horaFinalAmostragem', label: 'Hora final de amostragem', type: 'time', required: false },
    {
      key: 'totalAmostragem',
      label: 'Total de amostragem (minutos) / volume em litros',
      type: 'text',
      required: false,
    },
    {
      key: 'observacoes',
      label: 'Observações (Descrever como foi o ocorrido durante a amostragem) TIRAR FOTO:',
      type: 'textarea',
      required: false,
    },
  ],
  table: { columns: [], rows: [] },
  documentMeta: {
    responsavel: 'Gilberto C. Lopes Alvim',
    emissao: 'mar/19',
    revisaoLabel: 'Revisão 01',
    revisaoData: '29/03/2026',
  },
  topRowFieldKeys: { reportNumber: 'relatorioCampo', date: 'dataAmostragem' },
  sampleCodeFieldKey: 'casseteAmostragem',
};

// Cadeia de custódia de BTEX — ordem e rótulos seguem exatamente o modelo de
// campo em branco da Alvim ("17000 - Cadeia de custódia BTEX (MODELO DE
// CAMPO).xlsx"). Mesma estrutura de VOCs/Mercúrio/Amônia (sem tabela, sem
// assinatura, "Tubo de Amostragem" como identificador físico da coleta).
const BTEX_CUSTODY_TEMPLATE: CustodyTemplateSchema = {
  fields: [
    { key: 'relatorioCampo', label: 'Relatório de Campo nº', type: 'text', required: false, systemGenerated: true },
    { key: 'dataAmostragem', label: 'Data', type: 'date', required: true },
    { key: 'empresa', label: 'Empresa', type: 'text', required: true },
    { key: 'endereco', label: 'Endereço', type: 'text', required: true },
    {
      key: 'localAmostragem',
      label: 'Local de Amostragem (PONTO DE AMOSTRAGEM)',
      type: 'text',
      required: true,
    },
    {
      key: 'matrizAmostra',
      label: 'Matriz amostra (BIOGÁS/BIOMETANO)',
      type: 'text',
      required: true,
    },
    {
      key: 'respAmostragemEmpresaTel',
      label: 'Responsável pela Amostragem / empresa / fone',
      type: 'text',
      required: false,
      fixedValue: 'Gilberto Carlos Lopes Alvim / alvimanalises / 011 99658.8935',
    },
    {
      key: 'amostrador',
      label: 'Amostrador / Responsavel pela coleta',
      type: 'text',
      required: true,
    },
    {
      key: 'metodologia',
      label: 'Metodologia',
      type: 'text',
      required: false,
      fixedValue: 'NIOSH 1501 - "Hidrocarbonetos Aromáticos por Cromatografia Gasosa"',
    },
    {
      key: 'procedimentoInterno',
      label: 'Procedimento Interno',
      type: 'text',
      required: false,
      fixedValue: 'PT10 - "Procedimento Técnico de Amostragem - BTEX"',
    },
    { key: 'tuboAmostragem', label: 'Tubo de Amostragem', type: 'text', required: true },
    { key: 'bombaAmostragemN', label: 'Bomba de amostragem nº', type: 'text', required: false },
    {
      key: 'vazaoAmostragem',
      label: 'Vazão de amostragem (L / minutos)',
      type: 'text',
      required: false,
    },
    { key: 'horaInicioAmostragem', label: 'Hora inicio amostragem', type: 'time', required: false },
    { key: 'horaFinalAmostragem', label: 'Hora final de amostragem', type: 'time', required: false },
    {
      key: 'totalAmostragem',
      label: 'Total de amostragem (minutos) / volume em litros',
      type: 'text',
      required: false,
    },
    {
      key: 'observacoes',
      label: 'Observações (Descrever como foi o ocorrido durante a amostragem) TIRAR FOTO:',
      type: 'textarea',
      required: false,
    },
  ],
  table: { columns: [], rows: [] },
  documentMeta: {
    responsavel: 'Gilberto C. Lopes Alvim',
    emissao: 'mar/19',
    revisaoLabel: 'Revisão 01',
    revisaoData: '29/03/2026',
  },
  topRowFieldKeys: { reportNumber: 'relatorioCampo', date: 'dataAmostragem' },
  sampleCodeFieldKey: 'tuboAmostragem',
};

// Cadeia de custódia de Óleo — ordem e rótulos seguem exatamente o modelo de
// campo em branco da Alvim ("18000 - Cadeia de custódia ÓLEO (MODELO DE
// CAMPO).xlsx"). Mesma estrutura de Metais/Particulados (sem tabela, sem
// assinatura, "Cassete de Amostragem" como identificador físico). OBS: o
// texto de Metodologia no Excel original é idêntico ao de Metais (NIOSH
// 7303/ICP) — reproduzido aqui literalmente, igual ao modelo fornecido.
const OLEO_CUSTODY_TEMPLATE: CustodyTemplateSchema = {
  fields: [
    { key: 'relatorioCampo', label: 'Relatório de Campo nº', type: 'text', required: false, systemGenerated: true },
    { key: 'dataAmostragem', label: 'Data', type: 'date', required: true },
    { key: 'empresa', label: 'Empresa', type: 'text', required: true },
    { key: 'endereco', label: 'Endereço', type: 'text', required: true },
    {
      key: 'localAmostragem',
      label: 'Local de Amostragem (PONTO DE AMOSTRAGEM)',
      type: 'text',
      required: true,
    },
    {
      key: 'matrizAmostra',
      label: 'Matriz amostra (BIOGÁS/BIOMETANO)',
      type: 'text',
      required: true,
    },
    {
      key: 'respAmostragemEmpresaTel',
      label: 'Responsável pela Amostragem / empresa / fone',
      type: 'text',
      required: false,
      fixedValue: 'Gilberto Carlos Lopes Alvim / alvimanalises / 011 99658.8935',
    },
    {
      key: 'amostrador',
      label: 'Amostrador / Responsavel pela coleta',
      type: 'text',
      required: true,
    },
    {
      key: 'metodologia',
      label: 'Metodologia',
      type: 'text',
      required: false,
      fixedValue:
        'NIOSH 7303 - "ICP Espectrometria de Emissão Ótica por Plasma Indutivamente Acoplado Amostrador: cassete de poliestureno de 37 mm referencia"',
    },
    {
      key: 'procedimentoInterno',
      label: 'Procedimento Interno',
      type: 'text',
      required: false,
      fixedValue: 'PT04 - "Procedimento Técnico de Amostragem - Óleo"',
    },
    { key: 'casseteAmostragem', label: 'Cassete de Amostragem', type: 'text', required: true },
    { key: 'bombaAmostragemN', label: 'Bomba de amostragem nº', type: 'text', required: false },
    {
      key: 'vazaoAmostragem',
      label: 'Vazão de amostragem (L / minutos)',
      type: 'text',
      required: false,
    },
    { key: 'horaInicioAmostragem', label: 'Hora inicio amostragem', type: 'time', required: false },
    { key: 'horaFinalAmostragem', label: 'Hora final de amostragem', type: 'time', required: false },
    {
      key: 'totalAmostragem',
      label: 'Total de amostragem (minutos) / volume em litros',
      type: 'text',
      required: false,
    },
    {
      key: 'observacoes',
      label: 'Observações (Descrever como foi o ocorrido durante a amostragem) TIRAR FOTO:',
      type: 'textarea',
      required: false,
    },
  ],
  table: { columns: [], rows: [] },
  documentMeta: {
    responsavel: 'Gilberto C. Lopes Alvim',
    emissao: 'mar/19',
    revisaoLabel: 'Revisão 01',
    revisaoData: '29/03/2026',
  },
  topRowFieldKeys: { reportNumber: 'relatorioCampo', date: 'dataAmostragem' },
  sampleCodeFieldKey: 'casseteAmostragem',
};

// Cadeia de custódia de Microbiologia — ordem e rótulos seguem exatamente o
// modelo de campo em branco da Alvim ("21000 - Cadeia de custódia
// MICROBIOLOGIA (MODELO DE CAMPO).xlsx"). Diferente dos demais: sem campo de
// Observações/foto, e a tabela tem formato invertido — 2 colunas ("nº da
// Amostra", "ID - Placa") x 8 linhas (3 réplicas + 1 branco de cada um dos 2
// parâmetros analisados). Sem identificador físico único de amostra, então
// "Código da amostra" fica manual (sem sampleCodeFieldKey/
// sampleCodeTableRowKey) — decisão confirmada com o usuário. Cabeçalho de
// controle de documento (Emissão/Revisão) reproduzido literalmente do
// modelo, incluindo o placeholder "xxxxxxx" não preenchido pela Alvim.
const MICROBIOLOGIA_CUSTODY_TEMPLATE: CustodyTemplateSchema = {
  fields: [
    { key: 'relatorioCampo', label: 'Relatório de Campo nº', type: 'text', required: false, systemGenerated: true },
    { key: 'dataAmostragem', label: 'Data', type: 'date', required: true },
    { key: 'empresa', label: 'Empresa', type: 'text', required: true },
    { key: 'endereco', label: 'Endereço', type: 'text', required: true },
    {
      key: 'localAmostragem',
      label: 'Local de Amostragem (PONTO DE AMOSTRAGEM)',
      type: 'text',
      required: true,
    },
    {
      key: 'matrizAmostra',
      label: 'Matriz amostra (BIOGÁS/BIOMETANO/GÁS NATURAL)',
      type: 'text',
      required: true,
    },
    {
      key: 'respAmostragemEmpresaTel',
      label: 'Responsável pela Amostragem / empresa / fone',
      type: 'text',
      required: false,
      fixedValue: 'Gilberto Carlos Lopes Alvim / alvimanalises / 011 99658.8935',
    },
    {
      key: 'amostrador',
      label: 'Amostrador / Responsavel pela coleta',
      type: 'text',
      required: true,
    },
    {
      key: 'metodologia',
      label: 'Metodologia',
      type: 'text',
      required: false,
      fixedValue:
        'American Public Health Association (APHA) - Compendium of Methods for the Microbiological Examination of Foods ( Chapter 3 ) - 5º Ed. 2015)',
    },
    {
      key: 'tipoAmostrador',
      label: 'Tipo Amostrador',
      type: 'text',
      required: false,
      fixedValue: 'Placa Agar Saborard- Contaem de Fungos e Bolores , Placa de TSA - Contagem de bactérias',
    },
    {
      key: 'procedimentoInterno',
      label: 'Procedimento Interno',
      type: 'text',
      required: false,
      fixedValue: 'PT 08 - Procedimento Técnico Amostragens de Microorganismos',
    },
    { key: 'bombaAmostragemN', label: 'Bomba de amostragem nº', type: 'text', required: false },
    { key: 'volumeGasAmostrado', label: 'Volume de Gás Amostrado', type: 'text', required: false },
    {
      key: 'vazaoAmostragem',
      label: 'Vazão de amostragem (L / minutos)',
      type: 'text',
      required: false,
    },
    { key: 'temperatura', label: 'Temperatura', type: 'text', required: false },
    { key: 'pressao', label: 'Pressão', type: 'text', required: false },
  ],
  table: {
    columns: ['nº da Amostra', 'ID - Placa'],
    rows: [
      { key: 'boloresLeveduras1', label: 'Bolores e Leveduras' },
      { key: 'boloresLeveduras2', label: 'Bolores e Leveduras' },
      { key: 'boloresLeveduras3', label: 'Bolores e Leveduras' },
      { key: 'boloresLevedurasBranco', label: 'Bolores e Leveduras - Branco da Amostra' },
      { key: 'bacteriasMesofilas1', label: 'Contagem Total de Bactérias Mesófilas' },
      { key: 'bacteriasMesofilas2', label: 'Contagem Total de Bactérias Mesófilas' },
      { key: 'bacteriasMesofilas3', label: 'Contagem Total de Bactérias Mesófilas' },
      { key: 'bacteriasMesofilasBranco', label: 'Contagem Total de Bactérias Mesófilas - Branco da Amostra' },
    ],
  },
  documentMeta: {
    responsavel: 'Gilberto C. Lopes Alvim',
    emissao: '22/05/2026',
    revisaoLabel: 'Revisão',
    revisaoData: 'xxxxxxx',
  },
  topRowFieldKeys: { reportNumber: 'relatorioCampo', date: 'dataAmostragem' },
  tableInsertAfterKey: 'pressao',
};

// Cadeia de custódia de Compostos Sulfurados (Bags) — ordem e rótulos
// seguem exatamente o modelo de campo em branco da Alvim ("22000 - Cadeia
// de custódia Bags -Compostos Sulfurados.xlsx"). Diferente dos demais: sem
// tabela, sem assinatura, cabeçalho de controle do documento com só 2
// colunas (Responsável/Emissão, sem Revisão), 3 campos separados de "BAG
// IDENTIFICAÇÃO -" (até 3 bags coletadas por visita) em vez de um único
// identificador físico — "Código da amostra" fica manual (decisão
// confirmada com o usuário, igual Microbiologia).
const COMPOSTOS_SULFURADOS_CUSTODY_TEMPLATE: CustodyTemplateSchema = {
  fields: [
    { key: 'relatorioCampo', label: 'Relatório de Campo nº', type: 'text', required: false, systemGenerated: true },
    { key: 'dataAmostragemCampo', label: 'Data Amostragem em Campo', type: 'date', required: true },
    { key: 'horaAmostragemCampo', label: 'Hora Amostragem em Campo', type: 'time', required: false },
    { key: 'contatoEmpresa', label: 'Contato Empresa', type: 'text', required: true },
    { key: 'endereco', label: 'Endereço', type: 'text', required: true },
    {
      key: 'localAmostragem',
      label: 'Local de Amostragem (PONTO DE AMOSTRAGEM)',
      type: 'text',
      required: true,
    },
    {
      key: 'matrizAmostra',
      label: 'Matriz amostra (BIOGÁS/BIOMETANO/GÁS NATURAL)',
      type: 'text',
      required: true,
    },
    {
      key: 'procedimentoTecnico',
      label: 'Procedimento Técnico de Amostragem',
      type: 'text',
      required: false,
      fixedValue: 'PT 03 - Procedimento Técnico Amostragem - Sulfeto de Hidrogênio e Enxofre Total',
    },
    {
      key: 'respAmostragemEmpresaTel',
      label: 'Responsável pela Amostragem / empresa / fone',
      type: 'text',
      required: false,
      fixedValue: 'Gilberto Carlos Lopes Alvim / alvimanalises / 011 99658.8935',
    },
    {
      key: 'amostrador',
      label: 'Amostrador / responsável pela coleta',
      type: 'text',
      required: true,
    },
    { key: 'bagIdentificacao1', label: 'BAG IDENTIFICAÇÃO -', type: 'text', required: true },
    { key: 'bagIdentificacao2', label: 'BAG IDENTIFICAÇÃO -', type: 'text', required: false },
    { key: 'bagIdentificacao3', label: 'BAG IDENTIFICAÇÃO -', type: 'text', required: false },
    {
      key: 'observacoes',
      label: 'Observações (Descrever como foi o ocorrido durante a amostragem) TIRAR FOTO:',
      type: 'textarea',
      required: false,
    },
  ],
  table: { columns: [], rows: [] },
  documentMeta: {
    responsavel: 'Gilberto Alvim',
    emissao: '22/05/2026',
  },
  topRowFieldKeys: { reportNumber: 'relatorioCampo', date: 'dataAmostragemCampo' },
};

// Análises que a IA deve extrair do certificado laboratorial de VOCs pra
// monitoramento mensal — cada parâmetro aparece várias vezes no laudo (uma
// linha por unidade: mg/m³, ppb, µg/m³, ppm, ng), então unitHint diz qual
// delas pegar. regulatoryLimit/limitUnit só existem pra Clorados/Fluorados
// (5,00 mg/m³ cada, confirmado com o usuário) — sem limite pra
// Bromados/Tolueno, mas ainda assim monitorados.
const VOCS_CERTIFICATE_ANALYTE_TEMPLATE: CertificateAnalyteConfig[] = [
  {
    key: 'somatorioClorados',
    label: 'Somatório Clorados',
    reportAnalyteName: 'Somatório Clorados',
    unitHint: 'mg Cl/m³ (família mg.../m³)',
    regulatoryLimit: 5.0,
    limitUnit: 'mg Cl/m³',
  },
  {
    key: 'somatorioBromados',
    label: 'Somatório Bromados',
    reportAnalyteName: 'Somatório Bromados',
    unitHint: 'mg Br/m³ (família mg.../m³)',
  },
  {
    key: 'somatorioFluorados',
    label: 'Somatório Fluorados',
    reportAnalyteName: 'Somatório Fluorados',
    unitHint: 'mg F/m³ (família mg.../m³)',
    regulatoryLimit: 5.0,
    limitUnit: 'mg F/m³',
  },
  {
    key: 'vocComoTolueno',
    // Nome distinguível do equivalente no template de BTEX abaixo — os
    // dois eram "VOC como Tolueno" cru, mas medem coisas diferentes (aqui é
    // o somatório de VOCs do certificado de VOCs; lá é a leitura própria do
    // certificado de BTEX), com valores bem diferentes entre si no mesmo
    // ponto/dia — descoberto quando o resumo consolidado de resultados
    // mostrava os dois lado a lado como se fossem duplicata do mesmo
    // parâmetro (confirmado com o usuário, ver spec do Resumo de
    // Resultados). Renomear aqui só afeta certificados aprovados A PARTIR de
    // agora — os já salvos foram corrigidos via migration
    // (20260806220000_rename_duplicate_voc_tolueno).
    label: 'Somatório VOC como Tolueno',
    reportAnalyteName: 'Somatório VOC como Tolueno',
    unitHint: 'mg/m³ (família mg.../m³)',
  },
];

// Análises que a IA deve extrair do certificado laboratorial de BTEX —
// modelo mais simples que o de VOCs (um resultado só por parâmetro, sem
// repetir em várias unidades), então unitHint só documenta a unidade
// esperada, sem precisar desambiguar entre variantes. Sem limite
// regulatório informado pra nenhum desses parâmetros ainda.
const BTEX_CERTIFICATE_ANALYTE_TEMPLATE: CertificateAnalyteConfig[] = [
  { key: 'benzeno', label: 'Benzeno', reportAnalyteName: 'Benzeno', unitHint: 'mg/m³' },
  { key: 'etilbenzeno', label: 'Etilbenzeno', reportAnalyteName: 'Etilbenzeno', unitHint: 'mg/m³' },
  { key: 'xilenos', label: 'o, m e p-Xileno', reportAnalyteName: 'o, m e p-Xileno', unitHint: 'mg/m³' },
  { key: 'tolueno', label: 'Tolueno', reportAnalyteName: 'Tolueno', unitHint: 'mg/m³' },
  {
    key: 'vocComoTolueno',
    // Nome distinguível do equivalente no template de VOCs acima — ver
    // comentário lá.
    label: 'COV Total como Tolueno (BTEX)',
    reportAnalyteName: 'COV Total como Tolueno (BTEX)',
    unitHint: 'mg/m³',
  },
];

// Análises que a IA deve extrair do certificado laboratorial de Siloxanos —
// laudo de outro formato ainda (relatório técnico-científico da UFMG): o
// "número do certificado" é o próprio Relatório de Campo (RC), e o
// resultado que importa é só a concentração TOTAL de siloxanos (não cada
// um dos 8 individuais × 3 impingers da tabela detalhada). Limite
// regulatório da ANP = 0,3 mg Si/m³, com patamar de atenção em 0,21 mg
// Si/m³ (confirmado com o usuário).
const SILOXANOS_CERTIFICATE_ANALYTE_TEMPLATE: CertificateAnalyteConfig[] = [
  {
    key: 'volumeAmostrado',
    label: 'Volume Amostrado',
    reportAnalyteName: 'Volume amostrado (L)',
    unitHint: 'L (litros) — está na tabela de identificação da amostra, não na tabela de resultados',
  },
  {
    key: 'concentracaoTotalSiloxanos',
    label: 'Concentração Total de Siloxanos',
    reportAnalyteName: 'Concentração total de siloxanos',
    unitHint:
      'mg Si/m³ — a tabela de resultados tem uma linha "Concentração" com duas sub-linhas, "mg/m³" (geralmente vazia/traço) e "mg Si/m³" (o valor que interessa, ex.: "<0,21")',
    regulatoryLimit: 0.3,
    warningThreshold: 0.21,
    limitUnit: 'mg Si/m³',
  },
];

// Análises que a IA deve extrair do certificado laboratorial de Metais — o
// laudo traz uma tabela de ~30 metais, cada um com LQ e resultado próprios,
// quase sempre todos "<LQ" (abaixo do limite de quantificação). Em vez de
// gerar 30 linhas de resultado repetitivas, resultsMode COLLAPSE_BELOW_LQ faz
// a aprovação gerar UMA linha resumo "Metais" = "<LQ" quando nenhum metal foi
// quantificado, ou listar só os que vieram com valor quantificado (sem "<")
// quando algum aparecer acima do LQ (confirmado com o usuário).
const METAIS_CERTIFICATE_ANALYTE_TEMPLATE: CertificateAnalyteConfig[] = [
  { key: 'aluminio', label: 'Alumínio', reportAnalyteName: 'Alumínio', unitHint: 'mg/m³' },
  { key: 'antimonio', label: 'Antimônio', reportAnalyteName: 'Antimônio', unitHint: 'mg/m³' },
  { key: 'arsenio', label: 'Arsênio', reportAnalyteName: 'Arsênio', unitHint: 'mg/m³' },
  { key: 'bario', label: 'Bário', reportAnalyteName: 'Bário', unitHint: 'mg/m³' },
  { key: 'bismuto', label: 'Bismuto', reportAnalyteName: 'Bismuto', unitHint: 'mg/m³' },
  { key: 'boro', label: 'Boro', reportAnalyteName: 'Boro', unitHint: 'mg/m³' },
  { key: 'cadmio', label: 'Cádmio', reportAnalyteName: 'Cádmio', unitHint: 'mg/m³' },
  { key: 'calcio', label: 'Cálcio', reportAnalyteName: 'Cálcio', unitHint: 'mg/m³' },
  { key: 'chumbo', label: 'Chumbo', reportAnalyteName: 'Chumbo', unitHint: 'mg/m³' },
  { key: 'cobalto', label: 'Cobalto', reportAnalyteName: 'Cobalto', unitHint: 'mg/m³' },
  { key: 'cobre', label: 'Cobre', reportAnalyteName: 'Cobre', unitHint: 'mg/m³' },
  { key: 'cromo', label: 'Cromo', reportAnalyteName: 'Cromo', unitHint: 'mg/m³' },
  { key: 'estanho', label: 'Estanho', reportAnalyteName: 'Estanho', unitHint: 'mg/m³' },
  { key: 'estroncio', label: 'Estrôncio', reportAnalyteName: 'Estrôncio', unitHint: 'mg/m³' },
  { key: 'ferro', label: 'Ferro', reportAnalyteName: 'Ferro', unitHint: 'mg/m³' },
  { key: 'litio', label: 'Lítio', reportAnalyteName: 'Lítio', unitHint: 'mg/m³' },
  { key: 'magnesio', label: 'Magnésio', reportAnalyteName: 'Magnésio', unitHint: 'mg/m³' },
  { key: 'manganes', label: 'Manganês', reportAnalyteName: 'Manganês', unitHint: 'mg/m³' },
  { key: 'molibdenio', label: 'Molibdênio', reportAnalyteName: 'Molibdênio', unitHint: 'mg/m³' },
  { key: 'niquel', label: 'Níquel', reportAnalyteName: 'Níquel', unitHint: 'mg/m³' },
  { key: 'potassio', label: 'Potássio', reportAnalyteName: 'Potássio', unitHint: 'mg/m³' },
  { key: 'prata', label: 'Prata', reportAnalyteName: 'Prata', unitHint: 'mg/m³' },
  { key: 'selenio', label: 'Selênio', reportAnalyteName: 'Selênio', unitHint: 'mg/m³' },
  { key: 'silicio', label: 'Silício', reportAnalyteName: 'Silício', unitHint: 'mg/m³' },
  { key: 'sodio', label: 'Sódio', reportAnalyteName: 'Sódio', unitHint: 'mg/m³' },
  { key: 'talio', label: 'Tálio', reportAnalyteName: 'Tálio', unitHint: 'mg/m³' },
  { key: 'titanio', label: 'Titânio', reportAnalyteName: 'Titânio', unitHint: 'mg/m³' },
  { key: 'tungstenio', label: 'Tungstênio', reportAnalyteName: 'Tungstênio', unitHint: 'mg/m³' },
  { key: 'vanadio', label: 'Vanádio', reportAnalyteName: 'Vanádio', unitHint: 'mg/m³' },
  { key: 'zinco', label: 'Zinco', reportAnalyteName: 'Zinco', unitHint: 'mg/m³' },
];

// Análises que a IA deve extrair do certificado laboratorial de Mercúrio —
// um parâmetro só. Mesmo resultsMode COLLAPSE_BELOW_LQ do Metais: se o
// resultado vier com "<" (abaixo do LQ) a linha final fica "<LQ"; se vier
// quantificado, usa o valor lido (confirmado com o usuário).
const MERCURIO_CERTIFICATE_ANALYTE_TEMPLATE: CertificateAnalyteConfig[] = [
  { key: 'mercurio', label: 'Mercúrio', reportAnalyteName: 'Mercúrio', unitHint: 'mg/m³' },
];

// Análises que a IA deve extrair do certificado laboratorial de Amônia — um
// parâmetro só, mesmo resultsMode COLLAPSE_BELOW_LQ de Mercúrio.
const AMONIA_CERTIFICATE_ANALYTE_TEMPLATE: CertificateAnalyteConfig[] = [
  { key: 'amonia', label: 'Amônia', reportAnalyteName: 'Amônia', unitHint: 'mg/m³' },
];

// Análises que a IA deve extrair do certificado laboratorial de Particulados
// — um parâmetro só, mesmo resultsMode COLLAPSE_BELOW_LQ de Mercúrio/Amônia.
const PARTICULADOS_CERTIFICATE_ANALYTE_TEMPLATE: CertificateAnalyteConfig[] = [
  {
    key: 'particuladoTotal',
    label: 'Particulado Total',
    reportAnalyteName: 'Particulado Total',
    unitHint: 'mg/m³',
  },
];

// Análises que a IA deve extrair do certificado laboratorial de Óleo — um
// parâmetro só, mesmo resultsMode COLLAPSE_BELOW_LQ de Mercúrio/Amônia/
// Particulados.
const OLEO_CERTIFICATE_ANALYTE_TEMPLATE: CertificateAnalyteConfig[] = [
  { key: 'oleoMineral', label: 'Óleo Mineral', reportAnalyteName: 'Óleo Mineral', unitHint: 'mg/m³' },
];

// Análises que a IA deve extrair do certificado laboratorial de Compostos
// Sulfurados (Bags) — laudo próprio da Alvim (não terceirizado como os
// outros), reporta "0,00 mg/m³" pra não-detectado em vez de "<". resultsMode
// SKIP_ZERO omite os parâmetros com "0,00" e lista só os que têm resultado
// (confirmado com o usuário). Sulfeto de Hidrogênio tem limite regulatório
// de 10 mg/m³ (confirmado com o usuário) — sem patamar de atenção. COG tem
// faixa regulatória de 15 a 30 mg/m³ (confirmado com o usuário) — só se
// aplica a clientes com odorização na planta; nesses clientes que não
// odoram, o COG (e também TBM/THT) simplesmente não aparece no laudo, então
// a faixa nunca chega a ser avaliada pra eles (sem campo separado de
// "cliente odoriza" no cadastro).
const COMPOSTOS_SULFURADOS_CERTIFICATE_ANALYTE_TEMPLATE: CertificateAnalyteConfig[] = [
  {
    key: 'sulfetoHidrogenio',
    label: 'Sulfeto de Hidrogênio',
    reportAnalyteName: 'Sulfeto de Hidrogênio',
    unitHint: 'mg/m³',
    regulatoryLimit: 10,
    limitUnit: 'mg/m³',
  },
  {
    key: 'isoPropilMercaptana',
    label: 'Iso Propil Mercaptana',
    reportAnalyteName: 'Iso Propil Mercaptana',
    unitHint: 'mg/m³',
  },
  {
    key: 'normalPropilMercaptana',
    label: 'Normal Propil Mercaptana',
    reportAnalyteName: 'Normal Propil Mercaptana',
    unitHint: 'mg/m³',
  },
  {
    key: 'tercButilMercaptana',
    label: 'Terc Butil Mercaptana',
    reportAnalyteName: 'Terc Butil Mercaptana',
    unitHint: 'mg/m³',
  },
  {
    key: 'thtTetraHidroTiofeno',
    label: 'THT Tetra Hidro Tiofeno',
    reportAnalyteName: 'THT Tetra hidro tiofeno',
    unitHint: 'mg/m³',
  },
  {
    key: 'cog',
    label: 'COG (Concentração de Odorante no Gás)',
    reportAnalyteName: 'COG (Conc. de Odorante no Gás)',
    unitHint: 'mg/m³',
    regulatoryMin: 15,
    regulatoryLimit: 30,
    limitUnit: 'mg/m³',
  },
  {
    key: 'enxofreTotal',
    label: 'Enxofre Total',
    reportAnalyteName: 'Enxofre Total',
    unitHint: 'mg/m³',
  },
];

// Análises que a IA deve extrair do certificado laboratorial de
// Microbiologia — o laudo traz uma mini-tabela por parâmetro, com uma linha
// por amostra individual (nº 1/2/3, depois 5/6/7...) e uma linha final
// "Resultado médio" — o que interessa é só essa média, não as leituras
// individuais (confirmado com o usuário).
const MICROBIOLOGIA_CERTIFICATE_ANALYTE_TEMPLATE: CertificateAnalyteConfig[] = [
  {
    key: 'contagemBacteriasMesofilas',
    label: 'Contagem Total de Bactérias Mesófilas',
    reportAnalyteName:
      'Resultado médio da Contagem Total de Bactérias Mesófilas — pegue APENAS a linha "Resultado médio" da mini-tabela desse parâmetro, nunca as linhas de amostra individual (nº 1, 2, 3...)',
    unitHint: 'UFC/m³',
  },
  {
    key: 'boloresLeveduras',
    label: 'Bolores e Leveduras',
    reportAnalyteName:
      'Resultado médio de Bolores e Leveduras — pegue APENAS a linha "Resultado médio" da mini-tabela desse parâmetro, nunca as linhas de amostra individual (nº 5, 6, 7...)',
    unitHint: 'UFC/m³',
  },
];

// "Coleta de amostras" tem requiresCertificate: false — cliente contrata só
// a coleta em campo, não a consultoria/análise laboratorial (confirmado com
// o usuário). Cadeia de custódia continua obrigatória normalmente (por
// composto, ver CustodyFieldTemplate.custodyRequired); só o certificado
// deixa de ser exigido pra marcar a amostra/agendamento como Concluído —
// mas ainda pode ser anexado manualmente se a Alvim tiver acesso a ele.
const SERVICE_TYPES: { name: string; requiresCertificate?: boolean }[] = [
  { name: 'Monitoramento mensal' },
  { name: 'Coleta de amostras', requiresCertificate: false },
  { name: 'Caracterização do biometano' },
  { name: 'HAZOP' },
  { name: 'Análises laboratoriais' },
  { name: 'Outros' },
];

const SAMPLING_POINT_STANDARDS = ['1ª Barreira (ANP)', '2ª Barreira', 'Biogás'];

// Compostos analisáveis — código numérico segue a numeração de pastas da Alvim.
const COMPOUNDS = [
  { code: '11000', name: 'Siloxanos' },
  { code: '12000', name: 'VOCs' },
  { code: '13000', name: 'Metais' },
  { code: '14000', name: 'Mercúrio' },
  { code: '15000', name: 'Amônia' },
  { code: '16000', name: 'Particulados' },
  { code: '17000', name: 'BTEX' },
  { code: '18000', name: 'Óleo' },
  { code: '19000', name: 'Cloreto de Vinila' },
  { code: '20000', name: 'Arsênio' },
  { code: '21000', name: 'Microbiologia' },
  { code: '22000', name: 'Compostos Sulfurados (Bags)' },
  { code: '23000', name: 'Aldeídos' },
  { code: '24000', name: 'H2S' },
  { code: '25000', name: 'SO2' },
  { code: '26000', name: 'NOx' },
];

const TEST_USERS = [
  { name: 'Administrador Teste', email: 'admin@alvim.com.br', password: 'Admin@123', role: Role.ADMIN },
  { name: 'Gestor Teste', email: 'gestor@alvim.com.br', password: 'Gestor@123', role: Role.MANAGER },
  { name: 'Técnico Teste', email: 'tecnico@alvim.com.br', password: 'Tecnico@123', role: Role.TECHNICIAN },
];

async function main() {
  console.log('Semeando tipos de serviço...');
  const serviceTypes = await Promise.all(
    SERVICE_TYPES.map((st) =>
      prisma.serviceType.upsert({
        where: { name: st.name },
        update: { requiresCertificate: st.requiresCertificate ?? true },
        create: { name: st.name, requiresCertificate: st.requiresCertificate ?? true },
      }),
    ),
  );

  console.log('Semeando compostos...');
  await Promise.all(
    COMPOUNDS.map((c) =>
      prisma.compound.upsert({ where: { code: c.code }, update: { name: c.name }, create: c }),
    ),
  );

  console.log('Semeando modelo de cadeia de custódia (Siloxanos)...');
  const siloxanos = await prisma.compound.findUniqueOrThrow({ where: { code: '11000' } });
  await prisma.custodyFieldTemplate.upsert({
    where: { compoundId: siloxanos.id },
    update: { fields: SILOXANOS_CUSTODY_TEMPLATE as object },
    create: { compoundId: siloxanos.id, fields: SILOXANOS_CUSTODY_TEMPLATE as object },
  });

  console.log('Semeando modelo de cadeia de custódia (VOCs)...');
  const vocs = await prisma.compound.findUniqueOrThrow({ where: { code: '12000' } });
  await prisma.custodyFieldTemplate.upsert({
    where: { compoundId: vocs.id },
    update: { fields: VOCS_CUSTODY_TEMPLATE as object },
    create: { compoundId: vocs.id, fields: VOCS_CUSTODY_TEMPLATE as object },
  });

  console.log('Semeando modelo de cadeia de custódia (Metais)...');
  const metais = await prisma.compound.findUniqueOrThrow({ where: { code: '13000' } });
  await prisma.custodyFieldTemplate.upsert({
    where: { compoundId: metais.id },
    update: { fields: METAIS_CUSTODY_TEMPLATE as object },
    create: { compoundId: metais.id, fields: METAIS_CUSTODY_TEMPLATE as object },
  });

  console.log('Semeando modelo de cadeia de custódia (Mercúrio)...');
  const mercurio = await prisma.compound.findUniqueOrThrow({ where: { code: '14000' } });
  await prisma.custodyFieldTemplate.upsert({
    where: { compoundId: mercurio.id },
    update: { fields: MERCURIO_CUSTODY_TEMPLATE as object },
    create: { compoundId: mercurio.id, fields: MERCURIO_CUSTODY_TEMPLATE as object },
  });

  console.log('Semeando modelo de cadeia de custódia (Amônia)...');
  const amonia = await prisma.compound.findUniqueOrThrow({ where: { code: '15000' } });
  await prisma.custodyFieldTemplate.upsert({
    where: { compoundId: amonia.id },
    update: { fields: AMONIA_CUSTODY_TEMPLATE as object },
    create: { compoundId: amonia.id, fields: AMONIA_CUSTODY_TEMPLATE as object },
  });

  console.log('Semeando modelo de cadeia de custódia (Particulados)...');
  const particulados = await prisma.compound.findUniqueOrThrow({ where: { code: '16000' } });
  await prisma.custodyFieldTemplate.upsert({
    where: { compoundId: particulados.id },
    update: { fields: PARTICULADOS_CUSTODY_TEMPLATE as object },
    create: { compoundId: particulados.id, fields: PARTICULADOS_CUSTODY_TEMPLATE as object },
  });

  console.log('Semeando modelo de cadeia de custódia (BTEX)...');
  const btex = await prisma.compound.findUniqueOrThrow({ where: { code: '17000' } });
  await prisma.custodyFieldTemplate.upsert({
    where: { compoundId: btex.id },
    update: { fields: BTEX_CUSTODY_TEMPLATE as object },
    create: { compoundId: btex.id, fields: BTEX_CUSTODY_TEMPLATE as object },
  });

  console.log('Semeando modelo de cadeia de custódia (Óleo)...');
  const oleo = await prisma.compound.findUniqueOrThrow({ where: { code: '18000' } });
  await prisma.custodyFieldTemplate.upsert({
    where: { compoundId: oleo.id },
    update: { fields: OLEO_CUSTODY_TEMPLATE as object },
    create: { compoundId: oleo.id, fields: OLEO_CUSTODY_TEMPLATE as object },
  });

  // custodyRequired: false — Microbiologia nunca teve cadeia de custódia
  // digitalizada antes desta plataforma, então não é exigida pra "Concluído"
  // (nem em serviços antigos, nem nos novos por enquanto — confirmado com o
  // usuário; ele avisa quando o portal for lançado oficialmente pra virar
  // obrigatório só pros agendamentos a partir dali).
  console.log('Semeando modelo de cadeia de custódia (Microbiologia)...');
  const microbiologia = await prisma.compound.findUniqueOrThrow({ where: { code: '21000' } });
  await prisma.custodyFieldTemplate.upsert({
    where: { compoundId: microbiologia.id },
    update: { fields: MICROBIOLOGIA_CUSTODY_TEMPLATE as object, custodyRequired: false },
    create: {
      compoundId: microbiologia.id,
      fields: MICROBIOLOGIA_CUSTODY_TEMPLATE as object,
      custodyRequired: false,
    },
  });

  // custodyRequired: false — mesmo motivo do Microbiologia acima.
  console.log('Semeando modelo de cadeia de custódia (Compostos Sulfurados)...');
  const compostosSulfurados = await prisma.compound.findUniqueOrThrow({ where: { code: '22000' } });
  await prisma.custodyFieldTemplate.upsert({
    where: { compoundId: compostosSulfurados.id },
    update: { fields: COMPOSTOS_SULFURADOS_CUSTODY_TEMPLATE as object, custodyRequired: false },
    create: {
      compoundId: compostosSulfurados.id,
      fields: COMPOSTOS_SULFURADOS_CUSTODY_TEMPLATE as object,
      custodyRequired: false,
    },
  });

  console.log('Semeando modelo de leitura de certificado por IA (VOCs)...');
  const vocsForCertificate = await prisma.compound.findUniqueOrThrow({ where: { code: '12000' } });
  await prisma.certificateAnalyteTemplate.upsert({
    where: { compoundId: vocsForCertificate.id },
    update: { analytes: VOCS_CERTIFICATE_ANALYTE_TEMPLATE as unknown as object },
    create: {
      compoundId: vocsForCertificate.id,
      analytes: VOCS_CERTIFICATE_ANALYTE_TEMPLATE as unknown as object,
    },
  });

  console.log('Semeando modelo de leitura de certificado por IA (BTEX)...');
  const btexForCertificate = await prisma.compound.findUniqueOrThrow({ where: { code: '17000' } });
  await prisma.certificateAnalyteTemplate.upsert({
    where: { compoundId: btexForCertificate.id },
    update: { analytes: BTEX_CERTIFICATE_ANALYTE_TEMPLATE as unknown as object },
    create: {
      compoundId: btexForCertificate.id,
      analytes: BTEX_CERTIFICATE_ANALYTE_TEMPLATE as unknown as object,
    },
  });

  console.log('Semeando modelo de leitura de certificado por IA (Siloxanos)...');
  const siloxanosForCertificate = await prisma.compound.findUniqueOrThrow({ where: { code: '11000' } });
  await prisma.certificateAnalyteTemplate.upsert({
    where: { compoundId: siloxanosForCertificate.id },
    update: { analytes: SILOXANOS_CERTIFICATE_ANALYTE_TEMPLATE as unknown as object },
    create: {
      compoundId: siloxanosForCertificate.id,
      analytes: SILOXANOS_CERTIFICATE_ANALYTE_TEMPLATE as unknown as object,
    },
  });

  console.log('Semeando modelo de leitura de certificado por IA (Metais)...');
  const metaisForCertificate = await prisma.compound.findUniqueOrThrow({ where: { code: '13000' } });
  await prisma.certificateAnalyteTemplate.upsert({
    where: { compoundId: metaisForCertificate.id },
    update: {
      analytes: METAIS_CERTIFICATE_ANALYTE_TEMPLATE as unknown as object,
      resultsMode: 'COLLAPSE_BELOW_LQ',
      collapsedResultLabel: 'Metais',
    },
    create: {
      compoundId: metaisForCertificate.id,
      analytes: METAIS_CERTIFICATE_ANALYTE_TEMPLATE as unknown as object,
      resultsMode: 'COLLAPSE_BELOW_LQ',
      collapsedResultLabel: 'Metais',
    },
  });

  console.log('Semeando modelo de leitura de certificado por IA (Mercúrio)...');
  const mercurioForCertificate = await prisma.compound.findUniqueOrThrow({ where: { code: '14000' } });
  await prisma.certificateAnalyteTemplate.upsert({
    where: { compoundId: mercurioForCertificate.id },
    update: {
      analytes: MERCURIO_CERTIFICATE_ANALYTE_TEMPLATE as unknown as object,
      resultsMode: 'COLLAPSE_BELOW_LQ',
      collapsedResultLabel: 'Mercúrio',
    },
    create: {
      compoundId: mercurioForCertificate.id,
      analytes: MERCURIO_CERTIFICATE_ANALYTE_TEMPLATE as unknown as object,
      resultsMode: 'COLLAPSE_BELOW_LQ',
      collapsedResultLabel: 'Mercúrio',
    },
  });

  console.log('Semeando modelo de leitura de certificado por IA (Amônia)...');
  const amoniaForCertificate = await prisma.compound.findUniqueOrThrow({ where: { code: '15000' } });
  await prisma.certificateAnalyteTemplate.upsert({
    where: { compoundId: amoniaForCertificate.id },
    update: {
      analytes: AMONIA_CERTIFICATE_ANALYTE_TEMPLATE as unknown as object,
      resultsMode: 'COLLAPSE_BELOW_LQ',
      collapsedResultLabel: 'Amônia',
    },
    create: {
      compoundId: amoniaForCertificate.id,
      analytes: AMONIA_CERTIFICATE_ANALYTE_TEMPLATE as unknown as object,
      resultsMode: 'COLLAPSE_BELOW_LQ',
      collapsedResultLabel: 'Amônia',
    },
  });

  console.log('Semeando modelo de leitura de certificado por IA (Particulados)...');
  const particuladosForCertificate = await prisma.compound.findUniqueOrThrow({ where: { code: '16000' } });
  await prisma.certificateAnalyteTemplate.upsert({
    where: { compoundId: particuladosForCertificate.id },
    update: {
      analytes: PARTICULADOS_CERTIFICATE_ANALYTE_TEMPLATE as unknown as object,
      resultsMode: 'COLLAPSE_BELOW_LQ',
      collapsedResultLabel: 'Particulado Total',
    },
    create: {
      compoundId: particuladosForCertificate.id,
      analytes: PARTICULADOS_CERTIFICATE_ANALYTE_TEMPLATE as unknown as object,
      resultsMode: 'COLLAPSE_BELOW_LQ',
      collapsedResultLabel: 'Particulado Total',
    },
  });

  console.log('Semeando modelo de leitura de certificado por IA (Óleo)...');
  const oleoForCertificate = await prisma.compound.findUniqueOrThrow({ where: { code: '18000' } });
  await prisma.certificateAnalyteTemplate.upsert({
    where: { compoundId: oleoForCertificate.id },
    update: {
      analytes: OLEO_CERTIFICATE_ANALYTE_TEMPLATE as unknown as object,
      resultsMode: 'COLLAPSE_BELOW_LQ',
      collapsedResultLabel: 'Óleo Mineral',
    },
    create: {
      compoundId: oleoForCertificate.id,
      analytes: OLEO_CERTIFICATE_ANALYTE_TEMPLATE as unknown as object,
      resultsMode: 'COLLAPSE_BELOW_LQ',
      collapsedResultLabel: 'Óleo Mineral',
    },
  });

  console.log('Semeando modelo de leitura de certificado por IA (Compostos Sulfurados)...');
  const compostosSulfuradosForCertificate = await prisma.compound.findUniqueOrThrow({
    where: { code: '22000' },
  });
  await prisma.certificateAnalyteTemplate.upsert({
    where: { compoundId: compostosSulfuradosForCertificate.id },
    update: {
      analytes: COMPOSTOS_SULFURADOS_CERTIFICATE_ANALYTE_TEMPLATE as unknown as object,
      resultsMode: 'SKIP_ZERO',
    },
    create: {
      compoundId: compostosSulfuradosForCertificate.id,
      analytes: COMPOSTOS_SULFURADOS_CERTIFICATE_ANALYTE_TEMPLATE as unknown as object,
      resultsMode: 'SKIP_ZERO',
    },
  });

  console.log('Semeando modelo de leitura de certificado por IA (Microbiologia)...');
  const microbiologiaForCertificate = await prisma.compound.findUniqueOrThrow({
    where: { code: '21000' },
  });
  await prisma.certificateAnalyteTemplate.upsert({
    where: { compoundId: microbiologiaForCertificate.id },
    update: { analytes: MICROBIOLOGIA_CERTIFICATE_ANALYTE_TEMPLATE as unknown as object },
    create: {
      compoundId: microbiologiaForCertificate.id,
      analytes: MICROBIOLOGIA_CERTIFICATE_ANALYTE_TEMPLATE as unknown as object,
    },
  });

  console.log('Semeando tipos padrão de ponto de amostragem...');
  const samplingPointStandards = await Promise.all(
    SAMPLING_POINT_STANDARDS.map((name) =>
      prisma.samplingPointStandard.upsert({ where: { name }, update: {}, create: { name } }),
    ),
  );

  console.log('Semeando usuários internos (admin/gestor/técnico)...');
  const [admin, , technician] = await Promise.all(
    TEST_USERS.map(async (u) => {
      const passwordHash = await bcrypt.hash(u.password, 10);
      return prisma.user.upsert({
        where: { email: u.email },
        update: {},
        create: { name: u.name, email: u.email, passwordHash, role: u.role },
      });
    }),
  );

  console.log('Semeando empresas de teste...');
  const client = await prisma.client.upsert({
    where: { cnpj: '12.345.678/0001-90' },
    update: {},
    create: {
      companyName: 'Alvim Cliente Teste Ltda',
      cnpj: '12.345.678/0001-90',
      address: 'Rua Exemplo, 100',
      city: 'Vitória',
      state: 'ES',
      mainContact: 'João da Silva',
      email: 'contato@clienteteste.com.br',
      phone: '(27) 99999-0000',
      status: 'ACTIVE',
    },
  });

  // Segunda empresa: demonstra o usuário-cliente com acesso a múltiplas
  // empresas (N:N) e o seletor de empresa ativa no portal.
  const secondClient = await prisma.client.upsert({
    where: { cnpj: '33.444.555/0001-66' },
    update: {},
    create: {
      companyName: 'Empresa Secundária Teste Ltda',
      cnpj: '33.444.555/0001-66',
      address: 'Av. Secundária, 200',
      city: 'Cariacica',
      state: 'ES',
      mainContact: 'Maria Souza',
      email: 'contato@empresasecundaria.com.br',
      phone: '(27) 98888-0000',
      status: 'ACTIVE',
    },
  });

  console.log('Semeando usuário do cliente (vinculado a 2 empresas)...');
  const clientPasswordHash = await bcrypt.hash('Cliente@123', 10);
  const clientUser = await prisma.user.upsert({
    where: { email: 'cliente@alvim.com.br' },
    update: {},
    create: {
      name: 'Usuário Cliente Teste',
      email: 'cliente@alvim.com.br',
      passwordHash: clientPasswordHash,
      role: Role.CLIENT,
    },
  });
  await Promise.all(
    [client.id, secondClient.id].map((clientId) =>
      prisma.clientUser.upsert({
        where: { userId_clientId: { userId: clientUser.id, clientId } },
        update: {},
        create: { userId: clientUser.id, clientId },
      }),
    ),
  );

  console.log('Semeando pontos de amostragem de teste...');
  const primeiraBarreira = samplingPointStandards.find((s) => s.name === '1ª Barreira (ANP)')!;
  const segundaBarreira = samplingPointStandards.find((s) => s.name === '2ª Barreira')!;

  const samplingPointsToSeed = [
    // Cada empresa nomeia os pontos do seu jeito, mas ambos marcados com o
    // mesmo tipo padrão — permite comparar entre empresas no futuro.
    { clientId: client.id, name: 'Barreira 1 - Entrada', standardId: primeiraBarreira.id },
    { clientId: client.id, name: 'Barreira 2 - Saída', standardId: segundaBarreira.id },
    { clientId: client.id, name: 'Ponto de Coleta Externa', standardId: null },
    { clientId: secondClient.id, name: '1º Ponto ANP', standardId: primeiraBarreira.id },
    { clientId: secondClient.id, name: '2º Ponto de Controle', standardId: segundaBarreira.id },
  ];
  for (const point of samplingPointsToSeed) {
    const existing = await prisma.samplingPoint.findFirst({
      where: { clientId: point.clientId, name: point.name },
    });
    if (!existing) {
      await prisma.samplingPoint.create({ data: point });
    }
  }

  console.log('Semeando contratos de teste...');
  const monitoramento = serviceTypes.find((s) => s.name === 'Monitoramento mensal')!;
  const coleta = serviceTypes.find((s) => s.name === 'Coleta de amostras')!;

  const existingContract = await prisma.contract.findFirst({
    where: { clientId: client.id, name: 'Contrato de Monitoramento 2026' },
  });
  const contract =
    existingContract ??
    (await prisma.contract.create({
      data: {
        clientId: client.id,
        name: 'Contrato de Monitoramento 2026',
        description: 'Contrato de teste gerado pelo seed.',
        startDate: new Date(),
        periodicity: 'Mensal',
        active: true,
        scopes: {
          create: [{ serviceTypeId: monitoramento.id }, { serviceTypeId: coleta.id }],
        },
      },
    }));

  const existingSecondContract = await prisma.contract.findFirst({
    where: { clientId: secondClient.id, name: 'Contrato HAZOP 2026' },
  });
  const secondContract =
    existingSecondContract ??
    (await prisma.contract.create({
      data: {
        clientId: secondClient.id,
        name: 'Contrato HAZOP 2026',
        description: 'Contrato de teste da segunda empresa, gerado pelo seed.',
        startDate: new Date(),
        periodicity: 'Anual',
        active: true,
        scopes: { create: [{ serviceTypeId: serviceTypes.find((s) => s.name === 'HAZOP')!.id }] },
      },
    }));

  console.log('Semeando agendamentos de teste...');
  const scheduledDate = new Date();
  scheduledDate.setDate(scheduledDate.getDate() + 5);

  const existingSchedule = await prisma.schedule.findFirst({
    where: { contractId: contract.id, technicians: { some: { technicianId: technician.id } } },
  });
  if (!existingSchedule) {
    await prisma.schedule.create({
      data: {
        contractId: contract.id,
        clientId: client.id,
        serviceTypeId: monitoramento.id,
        scheduledDate,
        technicians: { create: [{ technicianId: technician.id }] },
        status: 'SCHEDULED',
      },
    });
  }

  const existingSecondSchedule = await prisma.schedule.findFirst({
    where: {
      contractId: secondContract.id,
      technicians: { some: { technicianId: technician.id } },
    },
  });
  if (!existingSecondSchedule) {
    const secondScheduledDate = new Date();
    secondScheduledDate.setDate(secondScheduledDate.getDate() + 10);
    await prisma.schedule.create({
      data: {
        contractId: secondContract.id,
        clientId: secondClient.id,
        serviceTypeId: serviceTypes.find((s) => s.name === 'HAZOP')!.id,
        scheduledDate: secondScheduledDate,
        technicians: { create: [{ technicianId: technician.id }] },
        status: 'SCHEDULED',
      },
    });
  }

  // Agendamento sem contrato vinculado — fluxo novo: empresa + técnico +
  // serviço + data, direto, sem precisar selecionar um contrato.
  const existingThirdSchedule = await prisma.schedule.findFirst({
    where: {
      contractId: null,
      clientId: client.id,
      technicians: { some: { technicianId: technician.id } },
    },
  });
  if (!existingThirdSchedule) {
    const thirdScheduledDate = new Date();
    thirdScheduledDate.setDate(thirdScheduledDate.getDate() + 3);
    await prisma.schedule.create({
      data: {
        clientId: client.id,
        serviceTypeId: coleta.id,
        scheduledDate: thirdScheduledDate,
        technicians: { create: [{ technicianId: technician.id }] },
        status: 'SCHEDULED',
      },
    });
  }

  console.log('\nSeed concluído. Usuários de teste:');
  console.table([
    ...TEST_USERS.map((u) => ({ email: u.email, senha: u.password, papel: u.role })),
    {
      email: 'cliente@alvim.com.br',
      senha: 'Cliente@123',
      papel: 'CLIENT (acesso a 2 empresas)',
    },
  ]);
  console.log(`Admin id: ${admin.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
