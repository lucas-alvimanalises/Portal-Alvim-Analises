import { ScrollView, Text, View, Pressable, StyleSheet } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { Role } from '@portal-alvim/shared';
import { useAuth } from '../../lib/auth/AuthContext';

// Cliente continua com a tela própria (contratos/serviços da empresa) — só
// os papéis internos (ADMIN/MANAGER/TECHNICIAN) ganham este menu novo, mesmo
// nível de acesso pra todos independente do papel (pedido do usuário),
// espelhando os submenus "Serviços" e "Agenda" já existentes no portal web.
interface MenuItem {
  label: string;
  href: string;
}

const SERVICOS_ITEMS: MenuItem[] = [
  { label: 'Agendamento', href: '/servicos/agendamento' },
  { label: 'Realizados', href: '/servicos/realizados' },
  { label: 'Código de Rastreio', href: '/servicos/codigo-rastreio' },
];

const AGENDA_ITEMS: MenuItem[] = [
  { label: 'Calendário', href: '/agenda/calendario' },
  { label: 'Organizar Serviço', href: '/agenda/organizar-servico' },
  { label: 'Cronograma de Amostras', href: '/agenda/cronograma-amostras' },
];

function MenuSection({ title, items }: { title: string; items: MenuItem[] }) {
  const router = useRouter();
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>
        {items.map((item, index) => (
          <Pressable
            key={item.href}
            onPress={() => router.push(item.href as never)}
            style={[styles.row, index > 0 && styles.rowBorder]}
          >
            <Text style={styles.rowLabel}>{item.label}</Text>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export default function AppIndex() {
  const { user } = useAuth();

  if (user?.role === Role.CLIENT) {
    return <Redirect href="/meus-servicos" />;
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <MenuSection title="Serviços" items={SERVICOS_ITEMS} />
      <MenuSection title="Agenda" items={AGENDA_ITEMS} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 20 },
  section: { gap: 8 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e5e9',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  rowBorder: { borderTopWidth: 1, borderTopColor: '#e2e5e9' },
  rowLabel: { fontSize: 16, color: '#1f2937' },
  chevron: { fontSize: 20, color: '#9ca3af' },
});
