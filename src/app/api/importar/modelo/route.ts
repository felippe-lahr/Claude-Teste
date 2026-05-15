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
    { header: 'Data do Óbito (mm/aaaa)',          key: 'x',  width: 26 },
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
  ws.addRow(['001', proprietarios[0]?.name ?? 'Proprietário', 'MACHO', 'Não', 'Não', 3, 2022, 350, 'VIVO', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'Aftosa', new Date(2024, 0, 15), '2ml', '', '', '']);
  // Fêmea prenha via IA
  ws.addRow(['002', proprietarios[0]?.name ?? 'Proprietário', 'FEMEA', 'Não', 'Não', 6, 2021, 280, 'VIVO', '', '', 'CHEIA', 'Não', '', '', new Date(2025, 2, 10), 'Sim', 'Não', '', new Date(2025, 2, 10), semens[0]?.codigo ?? '', '', '', '', '', '', '', '', '', '']);
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

  listas.getCell('J1').value = 'Meses';
  for (let m = 1; m <= 12; m++) { listas.getCell(`J${m + 1}`).value = m; }

  listas.getCell('K1').value = 'Anos';
  const ANO_INICIO = 2020;
  const ANO_FIM    = 2026;
  for (let a = ANO_INICIO; a <= ANO_FIM; a++) { listas.getCell(`K${a - ANO_INICIO + 2}`).value = a; }

  const propEnd  = Math.max(proprietarios.length + 1, 2);
  const semenEnd = Math.max(semens.length + 1, 2);
  const causaEnd = Math.max(causasMorte.length + 1, 2);

  // ── 3. Data validations ───────────────────────────────────────────────────
  const dateValidation = {
    type: 'date' as const,
    allowBlank: true,
    operator: 'between' as const,
    formulae: [new Date(2000, 0, 1), new Date(2100, 11, 31)],
    showErrorMessage: true,
    errorTitle: 'Data inválida',
    error: 'Clique na célula e use o seletor de data, ou digite no formato dd/mm/aaaa',
  };

  for (let r = 2; r <= 501; r++) {
    // Listas inline (mais confiável que referências à sheet oculta)
    ws.getCell(`B${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: [`_listas!$A$2:$A$${propEnd}`] };
    ws.getCell(`C${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: ['"MACHO,FEMEA"'] };
    ws.getCell(`D${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: ['"Não,Sim"'] };
    ws.getCell(`E${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: ['"Não,Sim"'] };
    // Mês Nasc — dropdown 1-12
    ws.getCell(`F${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: ['"1,2,3,4,5,6,7,8,9,10,11,12"'] };
    // Ano Nasc — dropdown 2020-2026
    ws.getCell(`G${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: ['"2020,2021,2022,2023,2024,2025,2026"'] };
    // Status — VIVO, VENDIDO, MORTO
    ws.getCell(`I${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: ['"VIVO,VENDIDO,MORTO"'] };
    ws.getCell(`L${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: ['"CHEIA,VAZIA"'] };
    ws.getCell(`M${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: ['"Não,Sim"'] }; // Nunca Pariu
    // Último Parto Mês — dropdown 1-12
    ws.getCell(`N${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: ['"1,2,3,4,5,6,7,8,9,10,11,12"'] };
    // Último Parto Ano — dropdown 2020-2026
    ws.getCell(`O${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: ['"2020,2021,2022,2023,2024,2025,2026"'] };
    ws.getCell(`Q${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: ['"Não,Sim"'] }; // Inseminada
    ws.getCell(`R${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: ['"Não,Sim"'] }; // Monta Natural
    if (semens.length > 0) {
      ws.getCell(`U${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: [`_listas!$H$2:$H$${semenEnd}`] };
    }
    if (causasMorte.length > 0) {
      ws.getCell(`W${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: [`_listas!$I$2:$I$${causaEnd}`] };
    }
    // Date picker para campos de data completa
    for (const col of ['J', 'P', 'S', 'T', 'Z', 'AC']) {
      const cell = ws.getCell(`${col}${r}`);
      cell.dataValidation = dateValidation;
      cell.numFmt = 'dd/mm/yyyy';
    }
  }

  // ── 4. Conditional formatting ─────────────────────────────────────────────
  ws.addConditionalFormatting({
    ref: 'A2:AD501',
    rules: [
      { type: 'expression', priority: 1, formulae: ['CELL("row")=ROW()'], style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFFFF9C4' } } } },
    ],
  });
  ws.addConditionalFormatting({
    ref: 'A2:AD501',
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
