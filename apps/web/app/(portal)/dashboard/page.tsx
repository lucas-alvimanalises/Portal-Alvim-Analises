'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  AnpDashboardComplianceDto,
  COMPLIANCE_STATUS_COLORS,
  MaintenanceStatus,
  Role,
  SCHEDULE_DERIVED_STATUS_COLORS,
  SCHEDULE_DERIVED_STATUS_LABELS_PT,
  ScheduleDerivedStatus,
} from '@portal-alvim/shared';
import { dashboardApi } from '../../../lib/api/dashboard.api';
import { schedulesApi } from '../../../lib/api/schedules.api';
import { plantMaintenancesApi } from '../../../lib/api/plant-maintenances.api';
import { samplesApi } from '../../../lib/api/samples.api';
import { anpMonthlyReportsApi } from '../../../lib/api/anp-monthly-reports.api';
import { useCurrentUser } from '../../../lib/auth/useCurrentUser';
import { useActiveClient } from '../../../lib/auth/ActiveClientContext';
import { CardGridSkeleton } from '../../../components/shared/Skeleton';

// `href` opcional — quando presente, o card navega pra lista filtrada
// correspondente (ver especificação de navegação: cards do Dashboard
// pareciam clicáveis mas não faziam nada). Sem `href`, continua um card
// estático como antes (nenhum caso hoje, mas mantém o componente flexível).
function StatCard({
  label,
  value,
  background,
  color,
  href,
  compact,
}: {
  label: string;
  value: number | string;
  background?: string;
  color?: string;
  href?: string;
  // Card com menos destaque visual (ex.: Manutenção da Planta sem nenhum
  // dado real no momento) — ver Problema 1 da especificação de Dashboard.
  compact?: boolean;
}) {
  const content = (
    <>
      <div style={{ fontSize: compact ? 12 : 13, color: color ?? 'var(--color-text-muted)' }}>{label}</div>
      <div
        style={{
          fontSize: compact ? 20 : 28,
          fontWeight: 700,
          marginTop: 4,
          color: color ?? 'var(--color-text)',
        }}
      >
        {value}
      </div>
    </>
  );
  const style: React.CSSProperties = {
    flex: 1,
    minWidth: compact ? 140 : 160,
    background,
    padding: compact ? 12 : undefined,
  };
  if (href) {
    return (
      <Link href={href} className="card card-clickable" style={style}>
        {content}
      </Link>
    );
  }
  return (
    <div className="card" style={style}>
      {content}
    </div>
  );
}

// Agrupamento visual por prioridade (ver especificação "Dashboard e telas de
// apoio") — substitui a fileira única de cards soltos de antes.
function DashboardSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="section-title">{title}</h2>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>{children}</div>
    </div>
  );
}

// Reflete o fluxo natural do serviço (do que ainda vai acontecer até o que
// já terminou). "Aguardando Informações" e "Cancelado" ficam de fora dos
// cards do cliente (confirmado com o usuário) — o total ainda soma certo
// nas outras listas, só não vira card aqui.
const STATUS_ORDER: ScheduleDerivedStatus[] = [
  'PROGRAMADO',
  'AGENDADO',
  'AGUARDANDO_CERTIFICADOS',
  'CONCLUIDO',
];

// Programado/Agendado ainda não aconteceram → aparecem em Agendamento;
// Aguardando Certificados/Concluído já aconteceram → aparecem em Realizados
// (mesma classificação por data que ScheduleListView já usa, ver
// isScheduleRealized). Cada lista lê o filtro inicial de status da
// querystring (ver ScheduleListView.tsx).
const STATUS_TARGET_PATH: Record<ScheduleDerivedStatus, string> = {
  PROGRAMADO: '/agendamentos',
  AGENDADO: '/agendamentos',
  AGUARDANDO_CERTIFICADOS: '/agendamentos/realizados',
  AGUARDANDO_INFORMACOES: '/agendamentos/realizados',
  CONCLUIDO: '/agendamentos/realizados',
  CANCELADO: '/agendamentos',
};

// Cliente vê um resumo dos PRÓPRIOS serviços por status — não o resumo
// global (Empresas ativas, Agendamentos no mês etc.) que Admin/Gestor veem,
// que cruzaria dados de outros clientes (confirmado com o usuário). Reusa a
// mesma listagem de agendamentos já usada em Agendamento/Realizados, então
// as contagens sempre batem com o que aparece lá.
function ClientDashboard() {
  const { activeClientId } = useActiveClient();
  const { data: schedules, isLoading } = useQuery({
    queryKey: ['schedules', activeClientId],
    queryFn: () => schedulesApi.list(activeClientId ?? undefined),
  });

  const counts = STATUS_ORDER.reduce(
    (acc, status) => ({ ...acc, [status]: 0 }),
    {} as Record<ScheduleDerivedStatus, number>,
  );
  schedules?.forEach((schedule) => {
    if (schedule.derivedStatus in counts) counts[schedule.derivedStatus] += 1;
  });

  // Indicadores de Manutenção da Planta escopados pra própria empresa —
  // reaproveita o mesmo endpoint de listagem já usado em /manutencao, sem
  // precisar de uma rota de resumo dedicada (mesmo espírito do resto deste
  // dashboard: contagens sempre batem com o que aparece na tela cheia).
  const now = new Date();
  const { data: scheduledMaintenances } = useQuery({
    queryKey: ['plant-maintenances', activeClientId, 'dashboard-scheduled'],
    queryFn: () =>
      plantMaintenancesApi.list({
        clientId: activeClientId!,
        status: MaintenanceStatus.SCHEDULED,
        year: now.getFullYear(),
        month: now.getMonth() + 1,
      }),
    enabled: !!activeClientId,
  });
  const { data: inProgressMaintenances } = useQuery({
    queryKey: ['plant-maintenances', activeClientId, 'dashboard-in-progress'],
    queryFn: () =>
      plantMaintenancesApi.list({ clientId: activeClientId!, status: MaintenanceStatus.IN_PROGRESS }),
    enabled: !!activeClientId,
  });

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
      </div>
      {isLoading ? (
        <CardGridSkeleton count={6} />
      ) : (
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {STATUS_ORDER.map((status) => (
            <StatCard
              key={status}
              label={SCHEDULE_DERIVED_STATUS_LABELS_PT[status]}
              value={counts[status]}
              background={SCHEDULE_DERIVED_STATUS_COLORS[status].background}
              color={SCHEDULE_DERIVED_STATUS_COLORS[status].text}
              href={`${STATUS_TARGET_PATH[status]}?status=${status}`}
            />
          ))}
          <StatCard
            label="Manutenções programadas (mês)"
            value={scheduledMaintenances?.length ?? 0}
            background="#e0f2fe"
            color="#0369a1"
            href={
              activeClientId
                ? `/manutencao/${activeClientId}?status=${MaintenanceStatus.SCHEDULED}&year=${now.getFullYear()}&month=${now.getMonth() + 1}`
                : '/manutencao'
            }
          />
          <StatCard
            label="Manutenções em andamento"
            value={inProgressMaintenances?.length ?? 0}
            background="#fef3c7"
            color="#92400e"
            href={activeClientId ? `/manutencao/${activeClientId}?status=${MaintenanceStatus.IN_PROGRESS}` : '/manutencao'}
          />
        </div>
      )}
    </div>
  );
}

// Estado positivo explícito quando não há nenhuma ocorrência no mês — pedido
// específico da especificação (não basta omitir o bloco). Não reaproveita o
// componente ComplianceStatusIndicator (que sempre acopla um rótulo fixo tipo
// "Conforme") porque aqui o texto é uma frase própria — mas usa a mesma cor
// verde de COMPLIANCE_STATUS_COLORS.CONFORME, então o padrão visual de
// bolinha colorida continua sendo o mesmo.
function ComplianceSection({ compliance }: { compliance: AnpDashboardComplianceDto }) {
  const isClean = compliance.outOfSpecCount === 0 && compliance.attentionCount === 0;

  return (
    <div>
      <h2 className="section-title">Compliance do mês</h2>

      {isClean ? (
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            aria-hidden
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: COMPLIANCE_STATUS_COLORS.CONFORME.text,
              flexShrink: 0,
            }}
          />
          <span>Nenhuma não conformidade registrada este mês.</span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <StatCard
              label="Fora da especificação"
              value={compliance.outOfSpecCount}
              background={COMPLIANCE_STATUS_COLORS.NAO_CONFORME.background}
              color={COMPLIANCE_STATUS_COLORS.NAO_CONFORME.text}
            />
            <StatCard
              label="Atenção"
              value={compliance.attentionCount}
              background={COMPLIANCE_STATUS_COLORS.ATENCAO.background}
              color={COMPLIANCE_STATUS_COLORS.ATENCAO.text}
            />
          </div>
          {compliance.affectedClients.length > 0 && (
            <div className="card">
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                Empresas com resultado fora da especificação este mês
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {compliance.affectedClients.map((c) => (
                  <li key={c.clientId} style={{ fontSize: 14 }}>
                    <Link href={`/reportes-anp/${c.clientId}/${c.year}/${c.month}`}>{c.clientName}</Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AdminDashboard() {
  const { data: summary, isLoading: isLoadingSummary } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: dashboardApi.summary,
  });

  // Contagens por status "de verdade" (derivedStatus) recalculadas aqui, não
  // no backend — ver comentário em dashboard.service.ts sobre por que um
  // COUNT bruto por Schedule.status não reflete o que a tela de
  // Agendamento/Realizados mostra (derivedStatus é computado, não salvo).
  // Mesma lista/fonte já usada em Realizados, então os números sempre batem.
  const { data: schedules, isLoading: isLoadingSchedules } = useQuery({
    queryKey: ['schedules'],
    queryFn: () => schedulesApi.list(),
  });

  // Mesma fonte da tela /certificados-pendentes (ver Problema 1: "vinda da
  // mesma fonte").
  const { data: pendingCertificates, isLoading: isLoadingPending } = useQuery({
    queryKey: ['pending-certificates'],
    queryFn: () => samplesApi.listPendingCertificates(),
  });

  const { data: compliance, isLoading: isLoadingCompliance } = useQuery({
    queryKey: ['anp-dashboard-compliance'],
    queryFn: anpMonthlyReportsApi.getDashboardCompliance,
  });

  const isLoading = isLoadingSummary || isLoadingSchedules || isLoadingPending || isLoadingCompliance;

  const now = new Date();
  const aguardandoInformacoesCount = (schedules ?? []).filter(
    (s) => s.derivedStatus === 'AGUARDANDO_INFORMACOES',
  ).length;
  const aguardandoCertificadosCount = (schedules ?? []).filter(
    (s) => s.derivedStatus === 'AGUARDANDO_CERTIFICADOS',
  ).length;
  const concluidoNoMesCount = (schedules ?? []).filter((s) => {
    if (s.derivedStatus !== 'CONCLUIDO') return false;
    const d = new Date(s.scheduledDate);
    return d.getUTCFullYear() === now.getUTCFullYear() && d.getUTCMonth() === now.getUTCMonth();
  }).length;
  // "Atrasado" (data prevista já passada e ainda não concluído) já É,
  // estruturalmente, o mesmo conjunto de Aguardando Informações + Aguardando
  // Certificados — assim que a data passa, o agendamento sai de
  // Programado/Agendado direto pra um desses dois (ver isScheduleRealized +
  // ScheduleDerivedStatusService), nunca fica "atrasado" mostrando como se
  // ainda estivesse agendado. Por isso não existe aqui um card à parte de
  // "Atrasados" — seria uma soma redundante dos dois cards acima.

  const maintenanceHasActivity =
    (summary?.maintenancesScheduledThisMonth ?? 0) > 0 || (summary?.maintenancesInProgress ?? 0) > 0;

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
      </div>

      {isLoading || !summary || !compliance ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          <CardGridSkeleton count={3} />
          <CardGridSkeleton count={2} />
          <CardGridSkeleton count={3} />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          <DashboardSection title="Ação necessária">
            <StatCard
              label="Certificados Pendentes"
              value={pendingCertificates?.length ?? 0}
              href="/certificados-pendentes"
              background="#fee2e2"
              color="#b91c1c"
            />
            <StatCard
              label={SCHEDULE_DERIVED_STATUS_LABELS_PT.AGUARDANDO_INFORMACOES}
              value={aguardandoInformacoesCount}
              href={`${STATUS_TARGET_PATH.AGUARDANDO_INFORMACOES}?status=AGUARDANDO_INFORMACOES`}
              background={SCHEDULE_DERIVED_STATUS_COLORS.AGUARDANDO_INFORMACOES.background}
              color={SCHEDULE_DERIVED_STATUS_COLORS.AGUARDANDO_INFORMACOES.text}
            />
            {/* Antes "Pendentes" — rótulo não deixava claro que era
                especificamente sobre certificado (ver Problema 1). */}
            <StatCard
              label={SCHEDULE_DERIVED_STATUS_LABELS_PT.AGUARDANDO_CERTIFICADOS}
              value={aguardandoCertificadosCount}
              href={`${STATUS_TARGET_PATH.AGUARDANDO_CERTIFICADOS}?status=AGUARDANDO_CERTIFICADOS`}
              background={SCHEDULE_DERIVED_STATUS_COLORS.AGUARDANDO_CERTIFICADOS.background}
              color={SCHEDULE_DERIVED_STATUS_COLORS.AGUARDANDO_CERTIFICADOS.text}
            />
          </DashboardSection>

          <ComplianceSection compliance={compliance} />

          <DashboardSection title="Visão geral">
            <StatCard label="Empresas ativas" value={summary.activeClients} href="/empresas" />
            {/* "Agendamentos no mês" conta todo agendamento com data >= início
                do mês (sem status específico, ver dashboard.service.ts) — o
                equivalente mais próximo já existente é a própria lista de
                Agendamento (mesma janela: hoje em diante). */}
            <StatCard label="Agendamentos no mês" value={summary.scheduledThisMonth} href="/agendamentos" />
            <StatCard
              label="Concluídos no mês"
              value={concluidoNoMesCount}
              href={`${STATUS_TARGET_PATH.CONCLUIDO}?status=CONCLUIDO`}
              background={SCHEDULE_DERIVED_STATUS_COLORS.CONCLUIDO.background}
              color={SCHEDULE_DERIVED_STATUS_COLORS.CONCLUIDO.text}
            />
          </DashboardSection>

          {/* Não existe uma lista de manutenções cruzando todas as empresas
              (Manutenção da Planta só lista por empresa, ver
              /manutencao/[clientId]) — o destino possível é a tela de
              escolha de empresa, não um filtro cross-empresa. Sem nenhum dado
              real (mês corrente), o bloco vira uma linha discreta em vez de
              cards do mesmo tamanho dos demais (ver Problema 1). */}
          {maintenanceHasActivity ? (
            <DashboardSection title="Manutenção da Planta">
              <StatCard
                label="Manutenções programadas (mês)"
                value={summary.maintenancesScheduledThisMonth}
                background="#e0f2fe"
                color="#0369a1"
                href="/manutencao"
              />
              <StatCard
                label="Manutenções em andamento"
                value={summary.maintenancesInProgress}
                background="#fef3c7"
                color="#92400e"
                href="/manutencao"
              />
            </DashboardSection>
          ) : (
            <Link
              href="/manutencao"
              className="card card-clickable"
              style={{ fontSize: 13, color: 'var(--color-text-muted)', padding: 12 }}
            >
              Manutenção da Planta: nenhuma manutenção programada este mês nem em andamento.
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { data: me } = useCurrentUser();
  return me?.role === Role.CLIENT ? <ClientDashboard /> : <AdminDashboard />;
}
