import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import ExcelJS from 'exceljs';

export const dynamic = 'force-dynamic';

const MESES = '"jan,fev,mar,abr,mai,jun,jul,ago,set,out,nov,dez"';
const ANOS  = '"2020,2021,2022,2023,2024,2025,2026"';

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

  // Layout: A-I dados básicos | J-K Venda Mês/Ano | L Obs | M-P Repro básico+Último Parto
  // Q-X Toque/Inseminada/Monta/Inseminação (Mês/Ano) | Y-AC Sêmen/Obs/CausaMorte/Óbito Mês/Ano
  // AD-AK Vacinas 1 e 2
  ws.columns = [
    { header: 'Número',              key: 'a',  width: 12 },
    { header: 'Proprietário',        key: 'b',  width: 22 },
    { header: 'Gênero',              key: 'c',  width: 12 },
    { header: 'Reprodutor',          key: 'd',  width: 12 },
    { header: 'Descarte',            key: 'e',  width: 12 },
    { header: 'Mês Nasc',            key: 'f',  width: 12 },
    { header: 'Ano Nasc',            key: 'g',  width: 12 },
    { header: 'Peso (kg)',           key: 'h',  width: 12 },
    { header: 'Status',             key: 'i',  width: 12 },
    { header: 'Venda Mês',          key: 'j',  width: 14 }, // J
    { header: 'Venda Ano',          key: 'k',  width: 14 }, // K
    { header: 'Observações',        key: 'l',  width: 22 }, // L
    { header: 'Status Reprodutivo', key: 'm',  width: 22 }, // M
    { header: 'Nunca Pariu',        key: 'n',  width: 14 }, // N
    { header: 'Último Parto Mês',   key: 'o',  width: 16 }, // O
    { header: 'Último Parto Ano',   key: 'p',  width: 16 }, // P
    { header: 'Toque Mês',          key: 'q',  width: 14 }, // Q
    { header: 'Toque Ano',          key: 'r',  width: 14 }, // R
    { header: 'Inseminada',         key: 's',  width: 14 }, // S
    { header: 'Monta Natural',      key: 't',  width: 14 }, // T
    { header: 'Monta Mês',         key: 'u',  width: 14 }, // U
    { header: 'Monta Ano',         key: 'v',  width: 14 }, // V
    { header: 'Inseminação Mês',   key: 'w',  width: 16 }, // W
    { header: 'Inseminação Ano',   key: 'x',  width: 16 }, // X
    { header: 'Sêmen (código)',     key: 'y',  width: 18 }, // Y
    { header: 'Obs. Reprodução',    key: 'z',  width: 22 }, // Z
    { header: 'Causa da Morte',     key: 'aa', width: 22 }, // AA
    { header: 'Óbito Mês',         key: 'ab', width: 14 }, // AB
    { header: 'Óbito Ano',         key: 'ac', width: 14 }, // AC
    { header: 'Vacina 1 - Produto', key: 'ad', width: 22 }, // AD
    { header: 'Vacina 1 - Mês',     key: 'ae', width: 14 }, // AE
    { header: 'Vacina 1 - Ano',     key: 'af', width: 14 }, // AF
    { header: 'Vacina 1 - Dose',    key: 'ag', width: 16 }, // AG
    { header: 'Vacina 2 - Produto', key: 'ah', width: 22 }, // AH
    { header: 'Vacina 2 - Mês',     key: 'ai', width: 14 }, // AI
    { header: 'Vacina 2 - Ano',     key: 'aj', width: 14 }, // AJ
    { header: 'Vacina 2 - Dose',    key: 'ak', width: 16 }, // AK
  ];

  // Style header row
  ws.getRow(1).eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF374151' } };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = { bottom: { style: 'thin', color: { argb: 'FF6B7280' } } };
  });
  ws.getRow(1).height = 36;

  const p0 = proprietarios[0]?.name ?? 'Proprietário';
  const s0 = semens[0]?.codigo ?? '';

  // Example rows (37 columns A–AK)
  ws.addRow([
    '001', p0, 'MACHO', 'Não', 'Não', 3, 2022, 350, 'VIVO',
    '', '',       // J K  venda mês/ano
    '',           // L  obs
    '', '', '', '', // M N O P  repro básico
    '', '',       // Q R  toque mês/ano
    'Não', 'Não', // S T  inseminada, monta natural
    '', '',       // U V  monta mês/ano
    '', '',       // W X  inseminação mês/ano
    '', '',       // Y Z  sêmen, obs repro
    '',           // AA causa morte
    '', '',       // AB AC óbito mês/ano
    'Aftosa', 'jan', 2024, '2ml', // AD AE AF AG vacina 1
    '', '', '', '',               // AH AI AJ AK vacina 2
  ]);
  ws.addRow([
    '002', p0, 'FEMEA', 'Não', 'Não', 6, 2021, 280, 'VIVO',
    '', '',           // J K  venda
    '',               // L  obs
    'CHEIA', 'Não', '', '', // M N O P
    'mar', 2025,      // Q R  toque
    'Sim', 'Não',     // S T
    '', '',           // U V  monta
    'mar', 2025,      // W X  inseminação
    s0, '',           // Y Z
    '',               // AA causa morte
    '', '',           // AB AC óbito
    '', '', '', '',   // AD-AG vacina 1
    '', '', '', '',   // AH-AK vacina 2
  ]);
  ws.addRow([
    '003', p0, 'FEMEA', 'Não', 'Não', 9, 2020, 260, 'VIVO',
    '', '', '', 'VAZIA', 'Não', 'mar', 2025,
    '', '', 'Não', 'Não', '', '', '', '',
    '', '', '', '', '',
    '', '', '', '', '', '', '', '',
  ]);
  ws.addRow([
    '004', p0, 'FEMEA', 'Não', 'Não', 1, 2024, 220, 'VIVO',
    '', '', '', 'VAZIA', 'Sim', '', '',
    '', '', 'Não', 'Não', '', '', '', '',
    '', '', '', '', '',
    '', '', '', '', '', '', '', '',
  ]);

  ws.views = [{ state: 'frozen', ySplit: 1 }];
  ws.autoFilter = { from: 'A1', to: 'AK1' };

  // ── 2. Hidden helper sheet ────────────────────────────────────────────────
  const listas = wb.addWorksheet('_listas');
  listas.state = 'veryHidden';

  listas.getCell('A1').value = 'Proprietários';
  proprietarios.forEach((p, i) => { listas.getCell(`A${i + 2}`).value = p.name; });

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
    ws.getCell(`C${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: ['"MACHO,FEMEA"'] };
    ws.getCell(`D${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: ['"Não,Sim"'] };
    ws.getCell(`E${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: ['"Não,Sim"'] };
    ws.getCell(`F${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: ['"1,2,3,4,5,6,7,8,9,10,11,12"'] };
    ws.getCell(`G${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: [ANOS] };
    ws.getCell(`I${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: ['"VIVO,VENDIDO,MORTO"'] };
    // Venda Mês/Ano
    ws.getCell(`J${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: [MESES] };
    ws.getCell(`K${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: [ANOS] };
    // Status reprodutivo
    ws.getCell(`M${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: ['"CHEIA,VAZIA"'] };
    ws.getCell(`N${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: ['"Não,Sim"'] };
    ws.getCell(`O${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: ['"1,2,3,4,5,6,7,8,9,10,11,12"'] };
    ws.getCell(`P${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: [ANOS] };
    // Toque Mês/Ano
    ws.getCell(`Q${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: [MESES] };
    ws.getCell(`R${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: [ANOS] };
    ws.getCell(`S${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: ['"Não,Sim"'] };
    ws.getCell(`T${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: ['"Não,Sim"'] };
    // Monta Mês/Ano
    ws.getCell(`U${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: [MESES] };
    ws.getCell(`V${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: [ANOS] };
    // Inseminação Mês/Ano
    ws.getCell(`W${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: [MESES] };
    ws.getCell(`X${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: [ANOS] };
    if (semens.length > 0) {
      ws.getCell(`Y${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: [`_listas!$H$2:$H$${semenEnd}`] };
    }
    if (causasMorte.length > 0) {
      ws.getCell(`AA${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: [`_listas!$I$2:$I$${causaEnd}`] };
    }
    // Óbito Mês/Ano
    ws.getCell(`AB${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: [MESES] };
    ws.getCell(`AC${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: [ANOS] };
    // Vacina 1 Mês/Ano
    ws.getCell(`AE${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: [MESES] };
    ws.getCell(`AF${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: [ANOS] };
    // Vacina 2 Mês/Ano
    ws.getCell(`AI${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: [MESES] };
    ws.getCell(`AJ${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: [ANOS] };
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
