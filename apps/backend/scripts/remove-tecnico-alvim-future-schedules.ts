// Script avulso: remove "Técnico Alvim" (tecnico@alvim.com.br — conta de
// login genérica, não uma pessoa real de campo, ver
// packages/shared/src/constants/field-staff.ts) de todos os agendamentos
// FUTUROS onde ela aparece como técnico responsável, deixando o campo em
// branco (o usuário confirma o técnico de verdade só quando a data for
// definida de fato — não precisa ficar com esse valor de preenchimento
// antigo até lá). Não mexe em agendamentos já cancelados nem em quem já
// passou da data (histórico realizado fica como está).
//
// Roda em modo DRY RUN por padrão. Pra aplicar de verdade:
//   npx ts-node scripts/remove-tecnico-alvim-future-schedules.ts --apply
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');
const TECNICO_ALVIM_EMAIL = 'tecnico@alvim.com.br';

async function main() {
  const tecnicoAlvim = await prisma.user.findUnique({ where: { email: TECNICO_ALVIM_EMAIL } });
  if (!tecnicoAlvim) {
    console.log(`Usuário ${TECNICO_ALVIM_EMAIL} não encontrado — nada a fazer.`);
    return;
  }
  console.log(`Encontrado: ${tecnicoAlvim.name} (${tecnicoAlvim.id})`);

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const links = await prisma.scheduleTechnician.findMany({
    where: {
      technicianId: tecnicoAlvim.id,
      schedule: {
        status: { not: 'CANCELLED' },
        OR: [{ dateConfirmed: false }, { scheduledDate: { gte: today } }, { endDate: { gte: today } }],
      },
    },
    include: {
      schedule: {
        select: {
          id: true,
          orderNumber: true,
          scheduledDate: true,
          dateConfirmed: true,
          client: { select: { companyName: true } },
          serviceType: { select: { name: true } },
        },
      },
    },
  });

  console.log(`${links.length} agendamento(s) futuro(s) com Técnico Alvim como responsável:`);
  for (const link of links) {
    const s = link.schedule;
    console.log(
      `  OS ${s.orderNumber} — ${s.client.companyName} — ${s.serviceType.name} — ` +
        `${s.dateConfirmed ? s.scheduledDate.toISOString().slice(0, 10) : 'mês previsto ' + s.scheduledDate.toISOString().slice(0, 7)}`,
    );
  }

  if (APPLY && links.length > 0) {
    const result = await prisma.scheduleTechnician.deleteMany({
      where: { id: { in: links.map((l) => l.id) } },
    });
    console.log(`${result.count} vínculo(s) removido(s).`);
  } else if (!APPLY) {
    console.log('Modo DRY RUN — nada foi alterado. Rode de novo com --apply pra aplicar de verdade.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
