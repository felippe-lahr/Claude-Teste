import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { renderToBuffer, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

export const dynamic = 'force-dynamic';

const MESES_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

function fmtAnoMes(mes: number | null, ano: number | null) {
  if (!mes || !ano) return '—';
  return `${MESES_PT[mes - 1] ?? mes}/${ano}`;
}

interface Detalhe {
  linha: number;
  numero: string | null;
  acao: 'criado' | 'atualizado';
  genero: 'MACHO' | 'FEMEA';
  denominacao: string;
  proprietario: string;
  eraMes: number | null;
  eraAno: number | null;
  peso: number | null;
  status: string;
  mae: string | null;
  observacoes: string | null;
}

const s = StyleSheet.create({
  page:        { padding: 32, fontFamily: 'Helvetica', fontSize: 8, color: '#1e293b' },
  title:       { fontSize: 15, fontFamily: 'Helvetica-Bold', color: '#1a3a2a', marginBottom: 3 },
  subtitle:    { fontSize: 7.5, color: '#64748b', marginBottom: 12 },
  totals:      { flexDirection: 'row', gap: 6, marginBottom: 12 },
  card:        { flex: 1, backgroundColor: '#f8fafc', borderRadius: 4, padding: 6, alignItems: 'center', border: '1px solid #e2e8f0' },
  cardNum:     { fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#1a3a2a' },
  cardLabel:   { fontSize: 6.5, color: '#64748b', marginTop: 1 },
  sectionTitle:{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#1a3a2a', marginTop: 6, marginBottom: 5 },
  thead:       { flexDirection: 'row', backgroundColor: '#1a3a2a', borderRadius: 3, marginBottom: 1 },
  th:          { color: '#ffffff', fontFamily: 'Helvetica-Bold', fontSize: 6.5, padding: '5 4', flex: 1 },
  row:         { flexDirection: 'row', borderBottom: '1px solid #e2e8f0', minHeight: 16 },
  rowAlt:      { flexDirection: 'row', borderBottom: '1px solid #e2e8f0', minHeight: 16, backgroundColor: '#f8fafc' },
  td:          { fontSize: 7, padding: '4 4', flex: 1, color: '#334155' },
  badge:       { borderRadius: 3, paddingHorizontal: 4, paddingVertical: 1, fontSize: 6, fontFamily: 'Helvetica-Bold' },
  erroBox:     { backgroundColor: '#fef2f2', borderRadius: 4, padding: 8, borderLeft: '3px solid #dc2626', marginTop: 4 },
  erroItem:    { fontSize: 7.5, color: '#991b1b', marginBottom: 2 },
  semErro:     { fontSize: 7.5, color: '#166534', marginTop: 4 },
  footer:      { position: 'absolute', bottom: 18, left: 32, right: 32, flexDirection: 'row', justifyContent: 'space-between' },
  footerTxt:   { fontSize: 6.5, color: '#94a3b8' },
});

function sBg(status: string) {
  return status === 'VIVO' ? '#dcfce7' : status === 'VENDIDO' ? '#dbeafe' : '#fee2e2';
}
function sColor(status: string) {
  return status === 'VIVO' ? '#166534' : status === 'VENDIDO' ? '#1e40af' : '#991b1b';
}
function sLabel(status: string) {
  return status === 'VIVO' ? 'Vivo' : status === 'VENDIDO' ? 'Vendido' : 'Morto';
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const body = await req.json();
  const detalhes: Detalhe[] = Array.isArray(body.detalhes) ? body.detalhes : [];
  const erros: string[] = Array.isArray(body.erros) ? body.erros : [];
  const total: number = Number(body.total) || detalhes.length;
  const importados: number = Number(body.importados) || detalhes.filter((d) => d.acao === 'criado').length;
  const atualizados: number = Number(body.atualizados) || detalhes.filter((d) => d.acao === 'atualizado').length;
  const arquivo: string = typeof body.arquivo === 'string' ? body.arquivo : '—';

  const now = new Date();
  const dataBR = now.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const horaBR = now.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });

  const COLS = [
    { label: 'Linha', flex: 0.6 },
    { label: 'Nº', flex: 0.8 },
    { label: 'Ação', flex: 0.9 },
    { label: 'Gênero', flex: 0.8 },
    { label: 'Categoria', flex: 1.3 },
    { label: 'Proprietário', flex: 1.5 },
    { label: 'Nasc.', flex: 0.9 },
    { label: 'Peso', flex: 0.7 },
    { label: 'Status', flex: 0.9 },
    { label: 'Mãe', flex: 0.7 },
    { label: 'Observações', flex: 1.6 },
  ];

  const doc = (
    <Document title="Relatório de Importação" author="Sistema Fazenda">
      <Page size="A4" orientation="landscape" style={s.page}>

        <Text style={s.title}>Relatório de Importação</Text>
        <Text style={s.subtitle}>
          Arquivo: {arquivo} · Gerado em {dataBR} às {horaBR}
        </Text>

        <View style={s.totals}>
          {([
            { num: total, label: 'Total processado' },
            { num: importados, label: 'Criados' },
            { num: atualizados, label: 'Atualizados' },
            { num: erros.length, label: 'Erros / avisos' },
          ] as const).map((c, i) => (
            <View key={i} style={s.card}>
              <Text style={s.cardNum}>{c.num}</Text>
              <Text style={s.cardLabel}>{c.label}</Text>
            </View>
          ))}
        </View>

        <Text style={s.sectionTitle}>Animais importados ({detalhes.length})</Text>
        <View>
          <View style={s.thead}>
            {COLS.map((c, i) => (
              <Text key={i} style={[s.th, { flex: c.flex }]}>{c.label}</Text>
            ))}
          </View>

          {detalhes.map((d, i) => (
            <View key={i} style={i % 2 === 0 ? s.row : s.rowAlt} wrap={false}>
              <Text style={[s.td, { flex: 0.6 }]}>{d.linha}</Text>
              <Text style={[s.td, { flex: 0.8 }]}>{d.numero ?? '—'}</Text>
              <Text style={[s.td, { flex: 0.9 }]}>{d.acao === 'criado' ? 'Criado' : 'Atualizado'}</Text>
              <Text style={[s.td, { flex: 0.8 }]}>{d.genero === 'MACHO' ? 'Macho' : 'Fêmea'}</Text>
              <Text style={[s.td, { flex: 1.3 }]}>{d.denominacao}</Text>
              <Text style={[s.td, { flex: 1.5 }]}>{d.proprietario}</Text>
              <Text style={[s.td, { flex: 0.9 }]}>{fmtAnoMes(d.eraMes, d.eraAno)}</Text>
              <Text style={[s.td, { flex: 0.7 }]}>{d.peso != null ? `${d.peso} kg` : '—'}</Text>
              <View style={[s.td, { flex: 0.9 }]}>
                <Text style={[s.badge, { backgroundColor: sBg(d.status), color: sColor(d.status) }]}>
                  {sLabel(d.status)}
                </Text>
              </View>
              <Text style={[s.td, { flex: 0.7 }]}>{d.mae ?? '—'}</Text>
              <Text style={[s.td, { flex: 1.6 }]}>{d.observacoes ?? '—'}</Text>
            </View>
          ))}
          {detalhes.length === 0 && (
            <Text style={{ fontSize: 8, color: '#64748b', padding: 6 }}>Nenhum animal importado nesta operação.</Text>
          )}
        </View>

        <Text style={s.sectionTitle}>Erros e observações ({erros.length})</Text>
        {erros.length > 0 ? (
          <View style={s.erroBox}>
            {erros.map((e, i) => (
              <Text key={i} style={s.erroItem}>• {e}</Text>
            ))}
          </View>
        ) : (
          <Text style={s.semErro}>Nenhum erro ou observação registrado nesta importação.</Text>
        )}

        <View style={s.footer} fixed>
          <Text style={s.footerTxt}>Sistema Fazenda · Importação · {dataBR}</Text>
          <Text style={s.footerTxt} render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>

      </Page>
    </Document>
  );

  const buffer = Buffer.from(await renderToBuffer(doc));

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="importacao-${dataBR.replace(/\//g, '-')}.pdf"`,
    },
  });
}
