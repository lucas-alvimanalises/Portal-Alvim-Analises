// Script avulso (roda UMA vez): cria a sequência de etiquetas físicas de
// VOCs (código 12000) começando em 8000000 — a primeira etiqueta impressa
// será exatamente 8000000 (mesmo padrão do Compostos Sulfurados, cuja 1ª
// foi 6000000: a sequência é semeada em <inicial - 1> porque confirmPrint
// faz increment e depois baseNumber = lastNumber - qtd).
//
// Só cria se ainda não existir sequência nem nenhuma etiqueta de VOCs
// impressa (proteção contra rodar depois que a numeração já começou).
//   npx ts-node scripts/seed-vocs-label-sequence.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const VOCS_CODE = '12000';
const INITIAL_NUMBER = 8000000;

async function main() {
  const vocs = await prisma.compound.findUniqueOrThrow({ where: { code: VOCS_CODE } });

  const existingSequence = await prisma.labelSequence.findUnique({ where: { compoundId: vocs.id } });
  const printedCount = await prisma.printedLabel.count({ where: { compoundId: vocs.id } });
  if (existingSequence || printedCount > 0) {
    console.log(
      `Nada a fazer — VOCs já tem sequência (lastNumber=${existingSequence?.lastNumber ?? '?'}) ou ` +
        `${printedCount} etiqueta(s) impressa(s). Não vou mexer.`,
    );
    return;
  }

  const sequence = await prisma.labelSequence.create({
    data: { compoundId: vocs.id, lastNumber: INITIAL_NUMBER - 1 },
  });
  console.log(
    `Sequência de etiquetas de VOCs criada: lastNumber=${sequence.lastNumber} ` +
      `(a 1ª etiqueta impressa será ${INITIAL_NUMBER}).`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
