// Script avulso: sobe/atualiza só o CustodyFieldTemplate de Compostos
// Sulfurados (Bags) no banco já rodando, sem reexecutar o seed inteiro (que
// teria efeitos colaterais em dados de teste não-idempotentes —
// schedules/samples). Roda com:
//   npx ts-node scripts/seed-compostos-sulfurados-custody-template.ts
// Mesma definição usada em prisma/seed.ts (COMPOSTOS_SULFURADOS_CUSTODY_TEMPLATE)
// — mantidas em sincronia manualmente, já que seed.ts executa main() como
// efeito colateral da importação e não dá pra importar o objeto de lá direto.
import { PrismaClient } from '@prisma/client';
import { CustodyTemplateSchema } from '@portal-alvim/shared';

const prisma = new PrismaClient();

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

async function main() {
  const compostosSulfurados = await prisma.compound.findUniqueOrThrow({ where: { code: '22000' } });
  const template = await prisma.custodyFieldTemplate.upsert({
    where: { compoundId: compostosSulfurados.id },
    update: { fields: COMPOSTOS_SULFURADOS_CUSTODY_TEMPLATE as object },
    create: { compoundId: compostosSulfurados.id, fields: COMPOSTOS_SULFURADOS_CUSTODY_TEMPLATE as object },
  });
  console.log('Template de Compostos Sulfurados salvo:', template.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
