/**
 * Scraping diário do IMEA-MT usando Playwright (Chromium headless).
 * O IMEA é um SPA Angular — os preços são carregados via JavaScript,
 * então precisamos de um browser real para renderizar a página.
 */

import { chromium } from 'playwright';

const RAILWAY_URL = process.env.RAILWAY_URL;
const SYNC_TOKEN  = process.env.SYNC_TOKEN;
const IMEA_URL    = 'https://www.imea.com.br/imea-site/indicador-boi';

if (!RAILWAY_URL || !SYNC_TOKEN) {
  console.error('❌ RAILWAY_URL ou SYNC_TOKEN não configurados');
  process.exit(1);
}

// Formata número BR para valor limpo: "1.234,56" → "1.234,56"
function cleanPrice(str) {
  return str.replace(/[^\d.,]/g, '').trim();
}

async function scrapeIMEA() {
  console.log('🚀 Iniciando Playwright...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    locale: 'pt-BR',
  });
  const page = await context.newPage();

  try {
    console.log('🌐 Navegando para:', IMEA_URL);
    await page.goto(IMEA_URL, { waitUntil: 'networkidle', timeout: 45000 });

    // Aguarda os dados carregarem (o SPA faz requests AJAX)
    await page.waitForTimeout(4000);

    // Debug: capturar todo o texto da página
    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log('\n📄 Texto da página (primeiros 3000 chars):');
    console.log(bodyText.slice(0, 3000));

    // Tentar extrair preços pelo texto renderizado
    const prices = {};

    // Padrão de número BR: 1.234,56 ou 234,56
    const numPattern = /([\d]{1,3}(?:\.\d{3})*,\d{2})/g;

    // Buscar por seções com os nomes dos indicadores
    const sections = [
      { key: 'boi_gordo',   terms: ['boi gordo', 'boi-gordo'] },
      { key: 'vaca_gorda',  terms: ['vaca gorda', 'vaca-gorda'] },
      { key: 'bezerro_8m',  terms: ['bezerro'] },
      { key: 'garrote_18m', terms: ['garrote'] },
    ];

    const lowerText = bodyText.toLowerCase();

    for (const { key, terms } of sections) {
      for (const term of terms) {
        const idx = lowerText.indexOf(term);
        if (idx === -1) continue;

        // Pega os 200 chars após o termo para encontrar o número
        const snippet = bodyText.slice(idx, idx + 200);
        const match = snippet.match(numPattern);
        if (match && match.length > 0) {
          // Pega o primeiro número encontrado após o termo
          prices[key] = cleanPrice(match[0]);
          console.log(`✅ ${key}: ${prices[key]} (contexto: "${snippet.slice(0, 80).replace(/\n/g,' ')}")`);
          break;
        }
      }
      if (!prices[key]) {
        console.log(`⚠️  ${key}: não encontrado`);
      }
    }

    // Se não encontrou pelos termos, tenta via DOM
    if (Object.keys(prices).length === 0) {
      console.log('\n🔎 Tentando via seletores DOM...');

      // Pega todos os elementos que contêm números no formato BR
      const elements = await page.$$eval('*', els =>
        els
          .filter(el => el.children.length === 0) // só folhas do DOM
          .map(el => ({ text: el.innerText?.trim(), tag: el.tagName }))
          .filter(e => e.text && /^\d{1,4}[.,]\d{2}$/.test(e.text))
          .slice(0, 30)
      );
      console.log('Elementos com preços encontrados:', elements);
    }

    return prices;
  } finally {
    await browser.close();
  }
}

async function postToRailway(prices) {
  if (Object.keys(prices).length === 0) {
    console.error('❌ Nenhum preço extraído — verifique o debug acima');
    process.exit(1);
  }

  console.log('\n📤 Enviando para Railway:', prices);

  const res = await fetch(`${RAILWAY_URL}/api/admin/sync-cotacoes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SYNC_TOKEN}`,
    },
    body: JSON.stringify(prices),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('❌ Erro ao salvar no Railway:', res.status, err);
    process.exit(1);
  }

  const data = await res.json();
  console.log(`✅ ${data.updated} cotações atualizadas com sucesso!`);
}

(async () => {
  const prices = await scrapeIMEA();
  await postToRailway(prices);
})();
