import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// Estrutura mínima de dashboard — só os agregados citados na especificação
// inicial. Novas métricas (linha de tendência por composto, tempo médio de
// atendimento etc.) entram aqui como novos métodos, sem mudar o contrato dos
// existentes.
//
// "Concluído no mês" e "Aguardando Certificados"/"Aguardando Informações"
// PROPOSITALMENTE não vivem aqui: dependem do status DERIVADO de cada
// agendamento (ScheduleDerivedStatusService — cadeia de custódia + certificado
// aprovados, não um campo salvo no banco), o mesmo cálculo já usado em
// Agendamento/Realizados. Um COUNT bruto por Schedule.status aqui de propósito
// dava sempre 0 pra "Finalizados no mês" (nenhum agendamento real chega a
// status='COMPLETED' — esse campo bruto só serve pro fluxo manual de
// confirmação em campo do Técnico, que não é usado na prática; ver
// TECHNICIAN_ALLOWED_TRANSITIONS). Corrigido levando esse cálculo pro
// frontend (ver AdminDashboard em apps/web), que já busca a lista completa de
// agendamentos (com derivedStatus pronto) e conta em memória — mesmo padrão
// já usado no ClientDashboard.
@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary() {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const startOfNextMonth = new Date(startOfMonth);
    startOfNextMonth.setMonth(startOfNextMonth.getMonth() + 1);

    const [activeClients, scheduledThisMonth, maintenancesScheduledThisMonth, maintenancesInProgress] =
      await Promise.all([
        this.prisma.client.count({ where: { status: 'ACTIVE' } }),
        this.prisma.schedule.count({ where: { scheduledDate: { gte: startOfMonth } } }),
        // Indicadores de Manutenção da Planta (Fase 2 do módulo) — contagem
        // global, mesmo escopo "todas as empresas" do resto deste resumo
        // (o dashboard do CLIENT usa um caminho separado, ver ClientDashboard
        // no frontend, que já escopa por empresa ativa).
        this.prisma.plantMaintenance.count({
          where: { status: 'SCHEDULED', date: { gte: startOfMonth, lt: startOfNextMonth } },
        }),
        this.prisma.plantMaintenance.count({ where: { status: 'IN_PROGRESS' } }),
      ]);

    return {
      activeClients,
      scheduledThisMonth,
      maintenancesScheduledThisMonth,
      maintenancesInProgress,
    };
  }
}
