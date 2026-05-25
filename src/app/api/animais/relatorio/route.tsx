import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Genero, StatusAnimal } from '@prisma/client';
import { renderToBuffer, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { calcularEstagioAtual, DEFAULT_PRENHEZ_CONFIGS } from '@/lib/prenhez';

export const dynamic = 'force-dynamic';

const MESES_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

function fmtAnoMes(mes: number | null, ano: number | null) {
  if (!mes || !ano) return '—';
  return `${MESES_PT[mes - 1]}/${ano}`;
}

const s = StyleSheet.create({
  page:        { padding: 36, fontFamily: 'Helvetica', fontSize: 8, color: '#1e293b' },
  title:       { fontSize: 15, fontFamily: 'Helvetica-Bold', color: '#1a3a2a', marginBottom: 3 },
  subtitle:    { fontSize: 7.5, color: '#64748b', marginBottom: 12 },
  filterBox:   { backgroundColor: '#f1f5f9', borderRadius: 4, padding: 7, marginBottom: 10, borderLeft: '3px solid #2F6A47' },
  filterTitle: { fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: '#2F6A47', marginBottom: 4 },
  filterRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  chip:        { backgroundColor: '#e2e8f0', borderRadius: 3, paddingHorizontal: 6, paddingVertical: 2, fontSize: 7 },
  totals:      { flexDirection: 'row', gap: 6, marginBottom: 10 },
  card:        { flex: 1, backgroundColor: '#f8fafc', borderRadius: 4, padding: 6, alignItems: 'center', border: '1px solid #e2e8f0' },
  cardNum:     { fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#1a3a2a' },
  cardLabel:   { fontSize: 6.5, color: '#64748b', marginTop: 1 },
  thead:       { flexDirection: 'row', backgroundColor: '#1a3a2a', borderRadius: 3, marginBottom: 1 },
  th:          { color: '#ffffff', fontFamily: 'Helvetica-Bold', fontSize: 6.5, padding: '5 4', flex: 1 },
  row:         { flexDirection: 'row', borderBottom: '1px solid #e2e8f0', minHeight: 17 },
  rowAlt:      { flexDirection: 'row', borderBottom: '1px solid #e2e8f0', minHeight: 17, backgroundColor: '#f8fafc' },
  td:          { fontSize: 7, padding: '4 4', flex: 1, color: '#334155' },
  badge:       { borderRadius: 3, paddingHorizontal: 4, paddingVertical: 1, fontSize: 6, fontFamily: 'Helvetica-Bold' },
  footer:      { position: 'absolute', bottom: 20, left: 36, right: 36, flexDirection: 'row', justifyContent: 'space-between' },
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

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const where: Record<string, unknown> = {};

  const numero = searchParams.get('numero');
  if (numero) where.numero = { contains: numero, mode: 'insensitive' };

  const proprietarioId = searchParams.get('proprietarioId');
  if (proprietarioId) where.proprietarioId = parseInt(proprietarioId);

  const genero = searchParams.get('genero');
  if (genero && (genero === 'MACHO' || genero === 'FEMEA')) where.genero = genero as Genero;

  const denominacao = searchParams.get('denominacao');
  if (denominacao) where.denominacao = denominacao;

  const status = searchParams.get('status');
  if (status && (['VIVO', 'MORTO', 'VENDIDO'] as string[]).includes(status)) where.status = status as StatusAnimal;

  const descarteFilter = searchParams.get('descarte');
  if (descarteFilter === 'true') where.descarte = true;
  else if (descarteFilter === 'false') where.descarte = false;

  const eraMin = searchParams.get('eraMin');
  const eraMax = searchParams.get('eraMax');
  if (eraMin && eraMax) {
    (where as Record<string, unknown>).AND = [
      { eraAno: { gte: parseInt(eraMin) } },
      { eraAno: { lte: parseInt(eraMax) } },
    ];
  }

  const animais = await prisma.animal.findMany({
    where,
    include: {
      proprietario: { select: { name: true } },
      reproducoes: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { statusReprodutivo: true, estagioPrenhez: true, dataToque: true },
      },
    },
    orderBy: [{ status: 'asc' }, { proprietarioId: 'asc' }, { denominacao: 'asc' }],
  });

  // Filter labels for report header
  const chips: string[] = [];
  if (numero) chips.push(`Número: ${numero}`);
  if (proprietarioId) {
    const nome = animais.find(a => a.proprietarioId === parseInt(proprietarioId))?.proprietario?.name ?? proprietarioId;
    chips.push(`Proprietário: ${nome}`);
  }
  if (genero) chips.push(`Gênero: ${genero === 'MACHO' ? 'Macho' : 'Fêmea'}`);
  if (denominacao) chips.push(`Categoria: ${denominacao}`);
  if (status) chips.push(`Status: ${sLabel(status)}`);
  if (descarteFilter === 'true') chips.push('Descarte: Sim');
  else if (descarteFilter === 'false') chips.push('Descarte: Não');
  if (eraMin && eraMax) chips.push(`Ano Nasc.: ${eraMin}–${eraMax}`);

  const now = new Date();
  const dataBR = now.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const horaBR = now.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });

  const total    = animais.length;
  const vivos    = animais.filter(a => a.status === 'VIVO').length;
  const vendidos = animais.filter(a => a.status === 'VENDIDO').length;
  const mortos   = animais.filter(a => a.status === 'MORTO').length;

  const COLS = [
    { label: 'Nº',        flex: 0.7 },
    { label: 'Proprietário', flex: 1.6 },
    { label: 'Gênero',    flex: 0.8 },
    { label: 'Categoria', flex: 1.5 },
    { label: 'Nasc.',     flex: 0.9 },
    { label: 'Peso',      flex: 0.7 },
    { label: 'Repr.',     flex: 0.6 },
    { label: 'Status',    flex: 1.4 },
    { label: 'Reprod.',   flex: 1.1 },
    { label: 'Toque',     flex: 0.9 },
  ];

  const doc = (
    <Document title="Relatório de Animais" author="Sistema Fazenda">
      <Page size="A4" orientation="landscape" style={s.page}>

        <Text style={s.title}>Relatório de Animais</Text>
        <Text style={s.subtitle}>Gerado em {dataBR} às {horaBR} · {total} animal(is)</Text>

        {chips.length > 0 && (
          <View style={s.filterBox}>
            <Text style={s.filterTitle}>FILTROS APLICADOS</Text>
            <View style={s.filterRow}>
              {chips.map((c, i) => <Text key={i} style={s.chip}>{c}</Text>)}
            </View>
          </View>
        )}

        <View style={s.totals}>
          {([
            { num: total, label: 'Total' },
            { num: vivos, label: 'Vivos' },
            { num: vendidos, label: 'Vendidos' },
            { num: mortos, label: 'Mortos' },
          ] as const).map((c, i) => (
            <View key={i} style={s.card}>
              <Text style={s.cardNum}>{c.num}</Text>
              <Text style={s.cardLabel}>{c.label}</Text>
            </View>
          ))}
        </View>

        {/* Table */}
        <View>
          <View style={s.thead}>
            {COLS.map((c, i) => (
              <Text key={i} style={[s.th, { flex: c.flex }]}>{c.label}</Text>
            ))}
          </View>

          {animais.map((a, i) => {
            const repro = a.reproducoes[0] ?? null;
            const estagio = repro?.estagioPrenhez
              ? (repro.dataToque
                  ? calcularEstagioAtual(repro.estagioPrenhez, new Date(repro.dataToque), DEFAULT_PRENHEZ_CONFIGS)
                  : repro.estagioPrenhez as 'P1' | 'P2' | 'P3')
              : null;
            const reproLabel = repro?.statusReprodutivo === 'CHEIA'
              ? `Cheia${estagio ? ` ${estagio}` : ''}`
              : repro?.statusReprodutivo === 'VAZIA' ? 'Vazia' : '—';

            return (
              <View key={a.id} style={i % 2 === 0 ? s.row : s.rowAlt}>
                <Text style={[s.td, { flex: 0.7 }]}>{a.numero ?? '—'}</Text>
                <Text style={[s.td, { flex: 1.6 }]}>{a.proprietario.name}</Text>
                <Text style={[s.td, { flex: 0.8 }]}>{a.genero === 'MACHO' ? 'Macho' : 'Fêmea'}</Text>
                <Text style={[s.td, { flex: 1.5 }]}>{a.denominacao}</Text>
                <Text style={[s.td, { flex: 0.9 }]}>{fmtAnoMes(a.eraMes, a.eraAno)}</Text>
                <Text style={[s.td, { flex: 0.7 }]}>{a.peso != null ? `${a.peso} kg` : '—'}</Text>
                <Text style={[s.td, { flex: 0.6 }]}>{a.reprodutor ? 'Sim' : 'Não'}</Text>
                <View style={[s.td, { flex: 1.4, flexDirection: 'row', gap: 3, alignItems: 'center', flexWrap: 'wrap' }]}>
                  <Text style={[s.badge, { backgroundColor: sBg(a.status), color: sColor(a.status) }]}>
                    {sLabel(a.status)}
                  </Text>
                  {a.descarte && (
                    <Text style={[s.badge, { backgroundColor: '#fef3c7', color: '#92400e' }]}>
                      Descarte
                    </Text>
                  )}
                </View>
                <Text style={[s.td, { flex: 1.1 }]}>{reproLabel}</Text>
                <Text style={[s.td, { flex: 0.9 }]}>
                  {repro?.dataToque
                    ? `${MESES_PT[new Date(repro.dataToque).getUTCMonth()]}/${new Date(repro.dataToque).getUTCFullYear()}`
                    : '—'}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Footer with page numbers */}
        <View style={s.footer} fixed>
          <Text style={s.footerTxt}>Sistema Fazenda · {dataBR}</Text>
          <Text style={s.footerTxt} render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>

      </Page>
    </Document>
  );

  const buffer = Buffer.from(await renderToBuffer(doc));

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="animais-${dataBR.replace(/\//g, '-')}.pdf"`,
    },
  });
}
