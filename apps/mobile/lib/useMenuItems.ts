import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  ClipboardList,
  Truck,
} from 'lucide-react-native';
import { TrackingShipmentStatus } from '@portal-alvim/shared';
import { schedulesApi } from './api/schedules.api';
import { trackingShipmentsApi } from './api/tracking-shipments.api';
import { colors } from './theme';
import {
  countSamplesThisMonth,
  countSchedulesWithoutTechnician,
  getCurrentMonthLabelPt,
  getOpenSchedules,
} from './home-summary';
import { MenuRowItem } from '../components/MenuListCard';

// Mesmas linhas usadas na Home (seções "Serviços"/"Agenda") e nos hubs das
// próprias abas — centralizado aqui pra não duplicar a lógica de badges/
// contadores em 3 lugares (ver handoff da tela inicial, seções 3 e 4).
export function useServicosMenuItems(): MenuRowItem[] {
  const router = useRouter();
  const schedulesQuery = useQuery({ queryKey: ['schedules'], queryFn: schedulesApi.list });
  const shipmentsQuery = useQuery({ queryKey: ['tracking-shipments'], queryFn: trackingShipmentsApi.list });

  const openSchedulesCount = schedulesQuery.data ? getOpenSchedules(schedulesQuery.data).length : undefined;
  const inTransitCount = shipmentsQuery.data
    ? shipmentsQuery.data.filter((s) => s.status === TrackingShipmentStatus.IN_TRANSIT).length
    : undefined;

  return [
    {
      key: 'agendamento',
      icon: CalendarPlus,
      title: 'Agendamento',
      subtitle: 'Serviços futuros e em andamento',
      badge:
        openSchedulesCount && openSchedulesCount > 0
          ? { text: String(openSchedulesCount), color: colors.primary, background: colors.primarySoft }
          : undefined,
      onPress: () => router.push('/servicos/agendamento' as never),
    },
    {
      key: 'realizados',
      icon: CheckCircle2,
      title: 'Realizados',
      subtitle: 'Resultados, certificados e fotos',
      onPress: () => router.push('/servicos/realizados' as never),
    },
    {
      key: 'codigo-rastreio',
      icon: Truck,
      title: 'Código de Rastreio',
      subtitle:
        inTransitCount !== undefined
          ? `${inTransitCount} ${inTransitCount === 1 ? 'envio no transporte' : 'envios no transporte'}`
          : 'Envios pelos Correios',
      onPress: () => router.push('/servicos/codigo-rastreio' as never),
    },
  ];
}

export function useAgendaMenuItems(): MenuRowItem[] {
  const router = useRouter();
  const schedulesQuery = useQuery({ queryKey: ['schedules'], queryFn: schedulesApi.list });

  const withoutTechnicianCount = schedulesQuery.data
    ? countSchedulesWithoutTechnician(schedulesQuery.data)
    : undefined;
  const samplesThisMonth = schedulesQuery.data ? countSamplesThisMonth(schedulesQuery.data) : undefined;

  return [
    {
      key: 'calendario',
      icon: CalendarDays,
      title: 'Calendário',
      subtitle: 'Alocar técnico e data ao serviço',
      badge:
        withoutTechnicianCount && withoutTechnicianCount > 0
          ? { text: String(withoutTechnicianCount), color: colors.danger, background: colors.dangerSoft }
          : undefined,
      onPress: () => router.push('/agenda/calendario' as never),
    },
    {
      key: 'organizar-servico',
      icon: ClipboardList,
      title: 'Organizar Serviço',
      subtitle: 'Etiquetas, cadeia de custódia e check list',
      onPress: () => router.push('/agenda/organizar-servico' as never),
    },
    {
      key: 'cronograma-amostras',
      icon: BarChart3,
      title: 'Cronograma de Amostras',
      subtitle:
        samplesThisMonth !== undefined
          ? `${samplesThisMonth} amostras previstas em ${getCurrentMonthLabelPt()}`
          : `Amostras previstas em ${getCurrentMonthLabelPt()}`,
      onPress: () => router.push('/agenda/cronograma-amostras' as never),
    },
  ];
}
