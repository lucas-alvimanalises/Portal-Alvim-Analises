import type { Metadata } from 'next';
import { QueryProvider } from '../lib/query-client';
import { ThemeProvider, THEME_INIT_SCRIPT } from '../lib/theme/ThemeContext';
import './globals.css';

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_APP_NAME ?? 'Portal Alvim Análises',
  description: 'Gestão de empresas, contratos, agendamentos e análises da Alvim Análises.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        {/* Roda antes do React hidratar — decide o tema (salvo, ou a
            preferência do sistema operacional na primeira visita) sem
            piscar a tela no tema errado por uma fração de segundo. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <QueryProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
