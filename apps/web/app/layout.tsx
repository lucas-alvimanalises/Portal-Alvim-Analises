import type { Metadata } from 'next';
import { QueryProvider } from '../lib/query-client';
import './globals.css';

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_APP_NAME ?? 'Portal Alvim Análises',
  description: 'Gestão de empresas, contratos, agendamentos e análises da Alvim Análises.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
