/**
 * Scraping diário do IMEA-MT
 * Executado pelo GitHub Actions — tenta buscar cotações e envia para a API do Railway.
 *
 * Estratégia:
 *  1. Fetch simples com headers de browser
 *  2. Se bloqueado, tenta via Playwright (Chromium no runner do GitHub)
 *  3. Faz POST para RAILWAY_URL/api/admin/sync-cotacoes com o SYNC_TOKEN
 */

import { execSync } from 'child_process';

const RAILWAY_URL = process.env.RAILWAY_URL;
const SYNC_TOKEN  = process.env.SYNC_TOKEN;
const IMEA_URL    = 'https://www.imea.com.br/imea-site/indicador-boi';

if (!RAILWAY_URL || !SYNC_TOKEN) {
  console.error('❌ RAILWAY_URL ou SYNC_TOKEN não configurados');
  process.exit(1);
}

// ---------- helpers ----------

function extractPrices(html) {
  const prices = {};

  // IMEA exibe os valores em padrão "NNN,NN" ou "N.NNN,NN"
  // Tenta capturar pelo contexto da palavra-chave + número
  const patterns = [
    { key: 'boi_gordo',   regex: /boi\s*gordo[^0-9]{0,60}([\d]{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2}))/i },
    { key: 'vaca_gorda',  regex: /vaca\s*gorda[^0-9]{0,60}([\d]{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2}))/i },
    { key: 'bezerro_8m',  regex: /bezerro[^0-9]{0,80}([\d]{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2}))/i },
    { key: 'garrote_18m', regex: /garrote[^0-9]{0,80}([\d]{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2}))/i },
  ];

  for (const { key, regex } of patterns) {
    const m = html.match(regex);
    if (m) prices[key] = m[1].trim();
  }

  return prices;
}

// ---------- estratégia 1: fetch simples ----------

async function fetchSimple() {
  console.log('🔍 Tentando fetch simples...');
  const res = await fetch(IMEA_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
      'Cache-Control': 'no-cache',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.text();
}

// ---------- estratégia 2: playwright ----------

async function fetchPlaywright() {
  console.log('🔍 Tentando Playwright (Chromium)...');
  // Instalar playwright-chromium se necessário
  try { execSync('npx playwright install chromium --with-deps', { stdio: 'inherit' }); } catch {}

  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
  });
  await page.goto(IMEA_URL, { waitUntil: 'networkidle', timeout: 30000 });
  // Aguarda um elemento com número aparecer
  await page.waitForTimeout(3000);
  const html = await page.content();
  await browser.close();
  return html;
}

// ---------- enviar para Railway ----------

async function postToRailway(prices) {
  if (Object.keys(prices).length === 0) {
    console.error('❌ Nenhum preço extraído do HTML');
    process.exit(1);
  }

  console.log('📤 Cotações extraídas:', prices);

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
  console.log(`✅ ${data.updated} cotações atualizadas no Railway com sucesso.`);
}

// ---------- main ----------

(async () => {
  let html = null;

  try {
    html = await fetchSimple();
    console.log('✅ Fetch simples OK — HTML:', html.length, 'chars');
  } catch (e) {
    console.warn('⚠️  Fetch simples bloqueado:', e.message);
    try {
      html = await fetchPlaywright();
      console.log('✅ Playwright OK — HTML:', html.length, 'chars');
    } catch (e2) {
      console.error('❌ Playwright também falhou:', e2.message);
      process.exit(1);
    }
  }

  const prices = extractPrices(html);
  await postToRailway(prices);
})();
