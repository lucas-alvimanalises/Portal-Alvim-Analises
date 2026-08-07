// Script avulso: sobe/atualiza só o CustodyFieldTemplate de Mercúrio no banco
// já rodando, sem reexecutar o seed inteiro (que teria efeitos colaterais em
// dados de teste não-idempotentes — schedules/samples). Roda com:
//   npx ts-node scripts/seed-mercurio-custody-template.ts
// Mesma definição usada em prisma/seed.ts (MERCURIO_CUSTODY_TEMPLATE) —
// mantidas em sincronia manualmente, já que seed.ts executa main() como
// efeito colateral da importação e não dá pra importar o objeto de lá direto.
import { PrismaClient } from '@prisma/client';
import { CustodyTemplateSchema } from '@portal-alvim/shared';

const prisma = new PrismaClient();

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

async function main() {
  const mercurio = await prisma.compound.findUniqueOrThrow({ where: { code: '14000' } });
  const template = await prisma.custodyFieldTemplate.upsert({
    where: { compoundId: mercurio.id },
    update: { fields: MERCURIO_CUSTODY_TEMPLATE as object },
    create: { compoundId: mercurio.id, fields: MERCURIO_CUSTODY_TEMPLATE as object },
  });
  console.log('Template de Mercúrio salvo:', template.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
