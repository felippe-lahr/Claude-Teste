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

  // ── 1. Main sheet ─────────────────────────────────────────────
  const ws = wb.addWorksheet('Animais');

  // Layout — 39 columns A–AM
  // A-I: dados básicos | J-K: Venda Mês/Ano | L: Obs
  // M: Status Reprodutivo | N: Estágio Prenhez (P1/P2/P3)
  // O-R: Nunca Pariu + Último Parto Mês/Ano | R-S: Toque Mês/Ano
  // T-Y: Inseminada/Monta/Monta Mês/Ano/Inseminação Mês/Ano
  // Z-AA: Sêmen/Obs | AB-AD: CausaMorte/Óbito Mês/Ano
  // AE-AL: Vacinas 1 e 2 | AM: Mãe (nº)
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
    { header: 'Estágio Prenhez',    key: 'n',  width: 16 }, // N
    { header: 'Nunca Pariu',        key: 'o',  width: 14 }, // O
    { header: 'Último Parto Mês',   key: 'p',  width: 16 }, // P
    { header: 'Último Parto Ano',   key: 'q',  width: 16 }, // Q
    { header: 'Toque Mês',          key: 'r',  width: 14 }, // R
    { header: 'Toque Ano',          key: 's',  width: 14 }, // S
    { header: 'Inseminada',         key: 't',  width: 14 }, // T
    { header: 'Monta Natural',      key: 'u',  width: 14 }, // U
    { header: 'Monta Mês',         key: 'v',  width: 14 }, // V
    { header: 'Monta Ano',         key: 'w',  width: 14 }, // W
    { header: 'Inseminação Mês',   key: 'x',  width: 16 }, // X
    { header: 'Inseminação Ano',   key: 'y',  width: 16 }, // Y
    { header: 'Sêmen (código)',     key: 'z',  width: 18 }, // Z
    { header: 'Obs. Reprodução',    key: 'aa', width: 22 }, // AA
    { header: 'Causa da Morte',     key: 'ab', width: 22 }, // AB
    { header: 'Óbito Mês',         key: 'ac', width: 14 }, // AC
    { header: 'Óbito Ano',         key: 'ad', width: 14 }, // AD
    { header: 'Vacina 1 - Produto', key: 'ae', width: 22 }, // AE
    { header: 'Vacina 1 - Mês',     key: 'af', width: 14 }, // AF
    { header: 'Vacina 1 - Ano',     key: 'ag', width: 14 }, // AG
    { header: 'Vacina 1 - Dose',    key: 'ah', width: 16 }, // AH
    { header: 'Vacina 2 - Produto', key: 'ai', width: 22 }, // AI
    { header: 'Vacina 2 - Mês',     key: 'aj', width: 14 }, // AJ
    { header: 'Vacina 2 - Ano',     key: 'ak', width: 14 }, // AK
    { header: 'Vacina 2 - Dose',    key: 'al', width: 16 }, // AL
    { header: 'Mãe (nº)',           key: 'am', width: 12 }, // AM ← vínculo com a mãe (número de outro animal)
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

  // Example rows (39 columns A–AM)
  // Macho — sem reprodução
  ws.addRow([
    '001', p0, 'MACHO', 'Não', 'Não', 3, 2022, 350, 'VIVO',
    '', '',        // J K  venda mês/ano
    '',            // L  obs
    '', '',        // M N  status repro + estágio
    '', '', '',    // O P Q  nunca pariu + último parto mês/ano
    '', '',        // R S  toque mês/ano
    'Não', 'Não',  // T U  inseminada, monta natural
    '', '',        // V W  monta mês/ano
    '', '',        // X Y  inseminação mês/ano
    '', '',        // Z AA  sêmen, obs repro
    '',            // AB causa morte
    '', '',        // AC AD óbito mês/ano
    'Aftosa', 'jan', 2024, '2ml', // AE AF AG AH vacina 1
    '', '', '', '',               // AI AJ AK AL vacina 2
    '',                           // AM mãe (nº)
  ]);
  // Fêmea prenha P1 via IA — toque e inseminação em mar/2025
  ws.addRow([
    '002', p0, 'FEMEA', 'Não', 'Não', 6, 2021, 280, 'VIVO',
    '', '',            // J K  venda
    '',                // L  obs
    'CHEIA', 'P1',     // M N  status repro + estágio
    'Não', '', '',     // O P Q  nunca pariu + último parto
    'mar', 2025,       // R S  toque
    'Sim', 'Não',      // T U  inseminada, monta natural
    '', '',            // V W  monta
    'mar', 2025,       // X Y  inseminação
    s0, '',            // Z AA
    '',                // AB causa morte
    '', '',            // AC AD óbito
    '', '', '', '',    // AE-AH vacina 1
    '', '', '', '',    // AI-AL vacina 2
    '',                // AM mãe (nº)
  ]);
  // Fêmea vazia com último parto
  ws.addRow([
    '003', p0, 'FEMEA', 'Não', 'Não', 9, 2020, 260, 'VIVO',
    '', '', '', 'VAZIA', '', 'Não', 'mar', 2025,
    '', '', 'Não', 'Não', '', '', '', '',
    '', '', '', '', '',
    '', '', '', '', '', '', '', '',
    '', // AM mãe (nº)
  ]);
  // Fêmea primípara
  ws.addRow([
    '004', p0, 'FEMEA', 'Não', 'Não', 1, 2024, 220, 'VIVO',
    '', '', '', 'VAZIA', '', 'Sim', '', '',
    '', '', 'Não', 'Não', '', '', '', '',
    '', '', '', '', '',
    '', '', '', '', '', '', '', '',
    '', // AM mãe (nº)
  ]);
  // Bezerro nascido — vinculado à mãe nº 002 (o parto de fev/2026 é lançado na mãe automaticamente)
  ws.addRow([
    '002/1', p0, 'MACHO', 'Não', 'Não', 2, 2026, 45, 'VIVO',
    '', '', '', '', '', '', '', '',
    '', '', 'Não', 'Não', '', '', '', '',
    '', '', '', '', '',
    '', '', '', '', '', '', '', '',
    '002', // AM mãe (nº) → vincula à vaca 002
  ]);

  ws.views = [{ state: 'frozen', ySplit: 1 }];
  ws.autoFilter = { from: 'A1', to: 'AM1' };

  // ── 2. Hidden helper sheet ──────────────────────────────────────────
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

  // ── 3. Data validations ──────────────────────────────────────────
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
    // Status reprodutivo + estágio prenhez
    ws.getCell(`M${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: ['"CHEIA,VAZIA"'] };
    ws.getCell(`N${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: ['"P1,P2,P3"'] }; // Estágio Prenhez
    ws.getCell(`O${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: ['"Não,Sim"'] };   // Nunca Pariu
    ws.getCell(`P${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: ['"1,2,3,4,5,6,7,8,9,10,11,12"'] }; // Últ Parto Mês
    ws.getCell(`Q${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: [ANOS] };           // Últ Parto Ano
    // Toque Mês/Ano
    ws.getCell(`R${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: [MESES] };
    ws.getCell(`S${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: [ANOS] };
    ws.getCell(`T${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: ['"Não,Sim"'] }; // Inseminada
    ws.getCell(`U${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: ['"Não,Sim"'] }; // Monta Natural
    // Monta Mês/Ano
    ws.getCell(`V${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: [MESES] };
    ws.getCell(`W${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: [ANOS] };
    // Inseminação Mês/Ano
    ws.getCell(`X${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: [MESES] };
    ws.getCell(`Y${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: [ANOS] };
    if (semens.length > 0) {
      ws.getCell(`Z${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: [`_listas!$H$2:$H$${semenEnd}`] };
    }
    if (causasMorte.length > 0) {
      ws.getCell(`AB${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: [`_listas!$I$2:$I$${causaEnd}`] };
    }
    // Óbito Mês/Ano
    ws.getCell(`AC${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: [MESES] };
    ws.getCell(`AD${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: [ANOS] };
    // Vacina 1 Mês/Ano
    ws.getCell(`AF${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: [MESES] };
    ws.getCell(`AG${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: [ANOS] };
    // Vacina 2 Mês/Ano
    ws.getCell(`AJ${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: [MESES] };
    ws.getCell(`AK${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: [ANOS] };
  }

  // ── 4. Conditional formatting ─────────────────────────────────────
  ws.addConditionalFormatting({
    ref: 'A2:AM501',
    rules: [
      { type: 'expression', priority: 1, formulae: ['CELL("row")=ROW()'], style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFFFF9C4' } } } },
    ],
  });
  ws.addConditionalFormatting({
    ref: 'A2:AM501',
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
