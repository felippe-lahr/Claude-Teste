import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Fazenda Santo Antônio da Barra',
  description: 'Sistema de gestão de bovinos',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
