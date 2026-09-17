// Script avulso (roda UMA vez): migra o antigo FIELD_CHECKLIST_SECTIONS
// (fixo no código, removido de @portal-alvim/shared) pras tabelas
// ChecklistSection/ChecklistItem. Já inclui "Bags" em "Material p/
// Amostragem" (pedido do usuário em 16/09/2026 — item que faltava na lista
// antiga). Idempotente (upsert por key) — pode rodar de novo sem duplicar.
//   npx ts-node scripts/seed-checklist-catalog.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SECTIONS = [
  {
    key: 'vidrarias',
    label: 'Vidrarias',
    items: [
      'erlenmeyer|Erlenmeyer',
      'manifold|Manifold',
      'haste_pescoco_ganso|Haste "Pescoço de Ganso"',
      'impingers|Impingers',
      'impinger_seco|Impinger Seco',
      'lavador_gas|Lavador de Gás',
      'bolhometro_pequeno|Bolhômetro pequeno',
      'bolhometro_medio|Bolhômetro médio',
      'bolhometro_grande|Bolhômetro grande',
    ],
  },
  {
    key: 'amostragem',
    label: 'Material p/ Amostragem',
    items: [
      'bombas|Bombas',
      'ferramenta_calibrar_bomba|Ferramenta p/ Calibrar Bomba',
      'mangueira_14|Mangueira 1/4',
      'mangueira_silicone|Mangueira Silicone',
      'amostradores|Amostradores',
      'tubos_sacrificio|Tubos de Sacrifício',
      'vials_lacre_borracha|VIALs + Lacre + Borracha',
      'metanol|Metanol',
      'presilhas_impingers|Presilhas p/ Impingers',
      'etiquetas_siloxanos|Etiquetas Siloxanos',
      'etiquetas_vocs|Etiquetas VOCs',
      'etiquetas_compostos_enxofre|Etiquetas Compostos de Enxofre',
      'bags|Bags', // pedido do usuário — faltava na lista antiga
    ],
  },
  {
    key: 'ferramentas',
    label: 'Ferramentas',
    items: [
      'chave_inglesa_2x|2x Chave Inglesa',
      'alicate_bico|Alicate de Bico',
      'crimper|Crimper (Lacrar VIALs)',
      'tesoura|Tesoura',
      'estilete|Estilete',
      'chave_inglesa_grande|Chave Inglesa Grande',
    ],
  },
  {
    key: 'cromatografia',
    label: 'Cromatografia',
    items: [
      'cromatografo|Cromatógrafo',
      'gas_arraste|Gás de Arraste',
      'gas_padrao|Gás Padrão',
      'notebook|Notebook',
      'cabo_rede|Cabo de Rede',
      'anilhas_swagelok|Anilhas Swagelok',
      'reguladores|Reguladores',
      'mangueira_18|Mangueira 1/8',
      'secador_gas_agilent|Secador de Gás Agilent',
      'extensao_eletrica|Extensão Elétrica',
      'nobreak|NoBreak',
    ],
  },
  {
    key: 'umidade',
    label: 'Análise de Umidade',
    items: ['analisador_umidade|Analisador de Umidade'],
  },
  {
    key: 'auxiliar',
    label: 'Material Auxiliar',
    items: [
      'fitas_isolante_crepe|Fitas Isolantes; Crepe',
      'rotametro|Rotâmetro',
      'saco_plastico_zip|Saco Plastico ZIP',
      'canetas|Canetas',
      'garras_bolhometro|Garras p/ segurar Bolhômetro',
      'pedestal_haste|Pedestal + Haste',
      'pote_agua|Pote p/ Água',
      'cadeias_custodia|Cadeias de Custódias',
      'prancheta|Prancheta',
      'pilhas_carregador_bomba|Pilhas + Carregador Bomba',
      'luva_nitrilica|Luva Nitrilica',
      'fita_filme|Fita Filme',
      'papel_toalha|Papel Toalha',
      'mesas|Mesas',
      'cadeiras|Cadeiras',
      'tenda|Tenda',
      'caixas_termica|Caixas Térmica',
      'mala_epis|Mala de EPIs',
      'reducoes_12_14|Reduções 1/2 - 1/4',
      'outras_conexoes|Outras conexões e reduções',
    ],
  },
];

async function main() {
  let sectionsCreated = 0;
  let itemsCreated = 0;

  for (let sectionOrder = 0; sectionOrder < SECTIONS.length; sectionOrder++) {
    const { key, label, items } = SECTIONS[sectionOrder];
    const section = await prisma.checklistSection.upsert({
      where: { key },
      update: { label, order: sectionOrder },
      create: { key, label, order: sectionOrder },
    });
    if (section.order === sectionOrder) sectionsCreated++;

    for (let itemOrder = 0; itemOrder < items.length; itemOrder++) {
      const [itemKey, itemLabel] = items[itemOrder].split('|');
      const existing = await prisma.checklistItem.findUnique({ where: { key: itemKey } });
      await prisma.checklistItem.upsert({
        where: { key: itemKey },
        update: { label: itemLabel, order: itemOrder, sectionId: section.id },
        create: { key: itemKey, label: itemLabel, order: itemOrder, sectionId: section.id, active: true },
      });
      if (!existing) {
        itemsCreated++;
        console.log(`  + ${label} > ${itemLabel}`);
      }
    }
  }

  console.log(`\nOK — ${sectionsCreated} seção(ões) e ${itemsCreated} item(ns) novo(s) (upsert, seguro rodar de novo).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
