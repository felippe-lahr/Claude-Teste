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

  // ── 1. Main sheet ─────────────────────────────────────────────────────────
  const ws = wb.addWorksheet('Animais');

  // Column layout (AA = 27th col)
  ws.columns = [
    { header: 'Número',                          key: 'a',  width: 12 },
    { header: 'Proprietário',                    key: 'b',  width: 22 },
    { header: 'Gênero',                          key: 'c',  width: 12 },
    { header: 'Reprodutor',                      key: 'd',  width: 12 },
    { header: 'Descarte',                        key: 'e',  width: 12 },
    { header: 'Mês Nasc',                        key: 'f',  width: 12 },
    { header: 'Ano Nasc',                        key: 'g',  width: 12 },
    { header: 'Peso (kg)',                       key: 'h',  width: 12 },
    { header: 'Status',                          key: 'i',  width: 12 },
    { header: 'Data Venda (dd/mm/aaaa)',          key: 'j',  width: 24 },
    { header: 'Observações',                     key: 'k',  width: 22 },
    { header: 'Status Reprodutivo',              key: 'l',  width: 22 },
    { header: 'Nunca Pariu',                     key: 'm',  width: 14 },
    { header: 'Último Parto Mês',                key: 'n',  width: 16 },
    { header: 'Último Parto Ano',                key: 'o',  width: 16 },
    { header: 'Data do Toque (dd/mm/aaaa)',       key: 'p',  width: 26 },
    { header: 'Inseminada',                      key: 'q',  width: 14 },
    { header: 'Monta Natural',                   key: 'r',  width: 14 },
    { header: 'Data Monta Natural (dd/mm/aaaa)', key: 's',  width: 28 },
    { header: 'Data Inseminação (dd/mm/aaaa)',   key: 't',  width: 28 },
    { header: 'Sêmen (código)',                  key: 'u',  width: 18 },
    { header: 'Obs. Reprodução',                 key: 'v',  width: 22 },
    { header: 'Causa da Morte',                  key: 'w',  width: 22 },
    { header: 'Data do Óbito (dd/mm/aaaa)',      key: 'x',  width: 26 },
    { header: 'Vacina 1 - Produto',              key: 'y',  width: 22 },
    { header: 'Vacina 1 - Data (dd/mm/aaaa)',    key: 'z',  width: 26 },
    { header: 'Vacina 1 - Dose',                 key: 'aa', width: 16 },
    { header: 'Vacina 2 - Produto',              key: 'ab', width: 22 },
    { header: 'Vacina 2 - Data (dd/mm/aaaa)',    key: 'ac', width: 26 },
    { header: 'Vacina 2 - Dose',                 key: 'ad', width: 16 },
  ];

  // Style header row
  ws.getRow(1).eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF374151' } };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = { bottom: { style: 'thin', color: { argb: 'FF6B7280' } } };
  });
  ws.getRow(1).height = 36;

  // Example rows
  // Macho
  ws.addRow(['001', proprietarios[0]?.name ?? 'Proprietário', 'MACHO', 'Não', 'Não', 3, 2022, 350, 'VIVO', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'Aftosa', '15/01/2024', '2ml', '', '', '']);
  // Fêmea prenha via IA
  ws.addRow(['002', proprietarios[0]?.name ?? 'Proprietário', 'FEMEA', 'Não', 'Não', 6, 2021, 280, 'VIVO', '', '', 'CHEIA', 'Não', '', '', '10/03/2025', 'Sim', 'Não', '', '10/03/2025', semens[0]?.codigo ?? '', '', '', '', '', '', '', '', '', '']);
  // Fêmea vazia com último parto
  ws.addRow(['003', proprietarios[0]?.name ?? 'Proprietário', 'FEMEA', 'Não', 'Não', 9, 2020, 260, 'VIVO', '', '', 'VAZIA', 'Não', 3, 2025, '', 'Não', 'Não', '', '', '', '', '', '', '', '', '', '', '', '']);
  // Fêmea primípara
  ws.addRow(['004', proprietarios[0]?.name ?? 'Proprietário', 'FEMEA', 'Não', 'Não', 1, 2024, 220, 'VIVO', '', '', 'VAZIA', 'Sim', '', '', '', 'Não', 'Não', '', '', '', '', '', '', '', '', '', '', '', '']);

  ws.views = [{ state: 'frozen', ySplit: 1 }];
  ws.autoFilter = { from: 'A1', to: 'AD1' };

  // ── 2. Hidden helper sheet ────────────────────────────────────────────────
  const listas = wb.addWorksheet('_listas');
  listas.state = 'veryHidden';

  listas.getCell('A1').value = 'Proprietários';
  proprietarios.forEach((p, i) => { listas.getCell(`A${i + 2}`).value = p.name; });

  listas.getCell('B1').value = 'Gênero';
  ['MACHO', 'FEMEA'].forEach((v, i) => { listas.getCell(`B${i + 2}`).value = v; });

  listas.getCell('C1').value = 'Reprodutor';
  ['Não', 'Sim'].forEach((v, i) => { listas.getCell(`C${i + 2}`).value = v; });

  listas.getCell('D1').value = 'Descarte';
  ['Não', 'Sim'].forEach((v, i) => { listas.getCell(`D${i + 2}`).value = v; });

  listas.getCell('E1').value = 'Status';
  ['VIVO', 'VENDIDO', 'MORTO'].forEach((v, i) => { listas.getCell(`E${i + 2}`).value = v; });

  listas.getCell('F1').value = 'Status Reprodutivo';
  ['CHEIA', 'VAZIA'].forEach((v, i) => { listas.getCell(`F${i + 2}`).value = v; });

  listas.getCell('G1').value = 'Inseminada / Monta Natural';
  ['Não', 'Sim'].forEach((v, i) => { listas.getCell(`G${i + 2}`).value = v; });

  listas.getCell('H1').value = 'Sêmen';
  semens.forEach((s, i) => { listas.getCell(`H${i + 2}`).value = s.codigo; });

  listas.getCell('I1').value = 'Causa da Morte';
  causasMorte.forEach((c, i) => { listas.getCell(`I${i + 2}`).value = c.nome; });

  const propEnd  = Math.max(proprietarios.length + 1, 2);
  const semenEnd = Math.max(semens.length + 1, 2);
  const causaEnd = Math.max(causasMorte.length + 1, 2);

  // ── 3. Data validations ───────────────────────────────────────────────────
  for (let r = 2; r <= 501; r++) {
    ws.getCell(`B${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: [`_listas!$A$2:$A$${propEnd}`] };
    ws.getCell(`C${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: ['_listas!$B$2:$B$3'] };
    ws.getCell(`D${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: ['_listas!$C$2:$C$3'] };
    ws.getCell(`E${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: ['_listas!$D$2:$D$3'] };
    ws.getCell(`I${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: ['_listas!$E$2:$E$4'] };
    ws.getCell(`L${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: ['_listas!$F$2:$F$3'] };
    ws.getCell(`M${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: ['_listas!$G$2:$G$3'] }; // Nunca Pariu
    ws.getCell(`N${r}`).dataValidation = { type: 'whole', allowBlank: true, operator: 'between', formulae: [1, 12], showErrorMessage: true, errorTitle: 'Mês inválido', error: 'Digite um número de 1 a 12' };
    ws.getCell(`O${r}`).dataValidation = { type: 'whole', allowBlank: true, operator: 'between', formulae: [2000, 2100], showErrorMessage: true, errorTitle: 'Ano inválido', error: 'Digite um ano válido (ex: 2024)' };
    ws.getCell(`Q${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: ['_listas!$G$2:$G$3'] }; // Inseminada
    ws.getCell(`R${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: ['_listas!$G$2:$G$3'] }; // Monta Natural
    if (semens.length > 0) {
      ws.getCell(`U${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: [`_listas!$H$2:$H$${semenEnd}`] };
    }
    if (causasMorte.length > 0) {
      ws.getCell(`W${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: [`_listas!$I$2:$I$${causaEnd}`] };
    }
  }

  // ── 4. Conditional formatting ─────────────────────────────────────────────
  ws.addConditionalFormatting({
    ref: 'A2:AK501',
    rules: [
      { type: 'expression', priority: 1, formulae: ['CELL("row")=ROW()'], style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFFFF9C4' } } } },
    ],
  });
  ws.addConditionalFormatting({
    ref: 'A2:AK501',
    rules: [
      { type: 'expression', priority: 2, formulae: ['MOD(ROW(),2)=0'], style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFE8F4FD' } } } },
    ],
  });

  const buf = Buffer.from(await wb.xlsx.writeBuffer());

  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="modelo-importacao.xlsx"',
    },
  });
}
