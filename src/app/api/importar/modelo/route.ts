import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import ExcelJS from 'exceljs';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const [proprietarios, causasMorte, semens] = await Promise.all([
    prisma.user.findMany({ select: { name: true }, orderBy: { name: 'asc' } }),
    prisma.causaMortePredefinida.findMany({ where: { ativo: true }, orderBy: { ordem: 'asc' } }),
    prisma.semen.findMany({ where: { ativo: true }, orderBy: { ordem: 'asc' } }),
  ]);

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Sistema Fazenda';

  // ── 1. Main sheet FIRST so it opens as the active tab ──────────────────────
  const ws = wb.addWorksheet('Animais');

  ws.columns = [
    { header: 'Número', key: 'a', width: 12 },
    { header: 'Proprietário', key: 'b', width: 22 },
    { header: 'Gênero', key: 'c', width: 12 },
    { header: 'Reprodutor', key: 'd', width: 12 },
    { header: 'Mês Nasc', key: 'e', width: 12 },
    { header: 'Ano Nasc', key: 'f', width: 12 },
    { header: 'Peso (kg)', key: 'g', width: 12 },
    { header: 'Status', key: 'h', width: 12 },
    { header: 'Data Venda (dd/mm/aaaa)', key: 'i', width: 24 },
    { header: 'Observações', key: 'j', width: 22 },
    { header: 'Status Reprodutivo', key: 'k', width: 22 },
    { header: 'Data do Toque (dd/mm/aaaa)', key: 'l', width: 26 },
    { header: 'Inseminada', key: 'm', width: 14 },
    { header: 'Data Inseminação (dd/mm/aaaa)', key: 'n', width: 28 },
    { header: 'Sêmen (código)', key: 'o', width: 18 },
    { header: 'Obs. Reprodução', key: 'p', width: 22 },
    { header: 'Causa da Morte', key: 'q', width: 22 },
    { header: 'Data do Óbito (dd/mm/aaaa)', key: 'r', width: 26 },
    { header: 'Vacina 1 - Produto', key: 's', width: 22 },
    { header: 'Vacina 1 - Data (dd/mm/aaaa)', key: 't', width: 26 },
    { header: 'Vacina 1 - Dose', key: 'u', width: 16 },
    { header: 'Vacina 2 - Produto', key: 'v', width: 22 },
    { header: 'Vacina 2 - Data (dd/mm/aaaa)', key: 'w', width: 26 },
    { header: 'Vacina 2 - Dose', key: 'x', width: 16 },
  ];

  // Style header row
  ws.getRow(1).eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF374151' } };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = { bottom: { style: 'thin', color: { argb: 'FF6B7280' } } };
  });
  ws.getRow(1).height = 36;

  // Example rows (text dates to avoid Excel serial number problem)
  ws.addRow(['001', proprietarios[0]?.name ?? 'Proprietário', 'MACHO', 'Não', 3, 2022, 350, 'VIVO', '', '', '', '', '', '', '', '', '', '', 'Aftosa', '15/01/2024', '2ml', '', '', '']);
  ws.addRow(['002', proprietarios[0]?.name ?? 'Proprietário', 'FEMEA', 'Não', 6, 2021, 280, 'VIVO', '', '', 'CHEIA', '10/03/2025', 'Sim', '10/03/2025', semens[0]?.codigo ?? '', '', '', '', '', '', '', '', '', '']);

  // Freeze header row and mark Animais as the active tab (tabSelected: true)
  ws.views = [{ state: 'frozen', ySplit: 1 }];
  ws.autoFilter = { from: 'A1', to: 'X1' };

  // ── 2. Hidden helper sheet SECOND ──────────────────────────────────────────
  const listas = wb.addWorksheet('_listas');
  listas.state = 'veryHidden'; // veryHidden = not shown even in "Unhide" dialog

  listas.getCell('A1').value = 'Proprietários';
  proprietarios.forEach((p, i) => { listas.getCell(`A${i + 2}`).value = p.name; });

  listas.getCell('B1').value = 'Gênero';
  ['MACHO', 'FEMEA'].forEach((v, i) => { listas.getCell(`B${i + 2}`).value = v; });

  listas.getCell('C1').value = 'Reprodutor';
  ['Não', 'Sim'].forEach((v, i) => { listas.getCell(`C${i + 2}`).value = v; });

  listas.getCell('D1').value = 'Status';
  ['VIVO', 'VENDIDO', 'MORTO'].forEach((v, i) => { listas.getCell(`D${i + 2}`).value = v; });

  listas.getCell('E1').value = 'Status Reprodutivo';
  ['CHEIA', 'VAZIA', 'PARIDA', 'BEZERRO_NO_PE'].forEach((v, i) => { listas.getCell(`E${i + 2}`).value = v; });

  listas.getCell('F1').value = 'Inseminada';
  ['Não', 'Sim'].forEach((v, i) => { listas.getCell(`F${i + 2}`).value = v; });

  listas.getCell('G1').value = 'Sêmen';
  semens.forEach((s, i) => { listas.getCell(`G${i + 2}`).value = s.codigo; });

  listas.getCell('H1').value = 'Causa da Morte';
  causasMorte.forEach((c, i) => { listas.getCell(`H${i + 2}`).value = c.nome; });

  const propEnd = Math.max(proprietarios.length + 1, 2);
  const semenEnd = Math.max(semens.length + 1, 2);
  const causaEnd = Math.max(causasMorte.length + 1, 2);

  // ── 3. Data validations (referencing _listas) ──────────────────────────────
  for (let r = 2; r <= 501; r++) {
    ws.getCell(`B${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: [`_listas!$A$2:$A$${propEnd}`] };
    ws.getCell(`C${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: ['_listas!$B$2:$B$3'] };
    ws.getCell(`D${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: ['_listas!$C$2:$C$3'] };
    ws.getCell(`H${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: ['_listas!$D$2:$D$4'] };
    ws.getCell(`K${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: ['_listas!$E$2:$E$5'] };
    ws.getCell(`M${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: ['_listas!$F$2:$F$3'] };
    if (semens.length > 0) {
      ws.getCell(`O${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: [`_listas!$G$2:$G$${semenEnd}`] };
    }
    if (causasMorte.length > 0) {
      ws.getCell(`Q${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: [`_listas!$H$2:$H$${causaEnd}`] };
    }
  }

  const buf = Buffer.from(await wb.xlsx.writeBuffer());

  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="modelo-importacao.xlsx"',
    },
  });
}
