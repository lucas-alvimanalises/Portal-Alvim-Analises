// Script avulso: sobe/atualiza só o CustodyFieldTemplate de Microbiologia no
// banco já rodando, sem reexecutar o seed inteiro (que teria efeitos
// colaterais em dados de teste não-idempotentes — schedules/samples). Roda
// com:
//   npx ts-node scripts/seed-microbiologia-custody-template.ts
// Mesma definição usada em prisma/seed.ts (MICROBIOLOGIA_CUSTODY_TEMPLATE) —
// mantidas em sincronia manualmente, já que seed.ts executa main() como
// efeito colateral da importação e não dá pra importar o objeto de lá direto.
import { PrismaClient } from '@prisma/client';
import { CustodyTemplateSchema } from '@portal-alvim/shared';

const prisma = new PrismaClient();

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

async function main() {
  const microbiologia = await prisma.compound.findUniqueOrThrow({ where: { code: '21000' } });
  const template = await prisma.custodyFieldTemplate.upsert({
    where: { compoundId: microbiologia.id },
    update: { fields: MICROBIOLOGIA_CUSTODY_TEMPLATE as object },
    create: { compoundId: microbiologia.id, fields: MICROBIOLOGIA_CUSTODY_TEMPLATE as object },
  });
  console.log('Template de Microbiologia salvo:', template.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
