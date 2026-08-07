// Script avulso: marca "Coleta de amostras" com requiresCertificate: false
// no banco já rodando, sem reexecutar o seed inteiro — roda com:
//   npx ts-node scripts/seed-service-type-requires-certificate.ts
// Cliente contrata só a coleta em campo, não a consultoria/análise
// laboratorial (confirmado com o usuário) — cadeia de custódia continua
// obrigatória normalmente (por composto), só o certificado deixa de ser
// exigido pra marcar a amostra/agendamento como Concluído.
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const updated = await prisma.serviceType.update({
    where: { name: 'Coleta de amostras' },
    data: { requiresCertificate: false },
  });
  console.log('Tipo de serviço atualizado:', updated.id, 'requiresCertificate =', updated.requiresCertificate);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
