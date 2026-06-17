/* ============================================================
   data.js — Leitura e parse do CSV (Refatorado)
   ============================================================ */

/* eslint-disable no-unused-vars */

const MESES  = ['JANEIRO','FEVEREIRO','MARÇO','ABRIL','MAIO','JUNHO',
                'JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO'];
const DIAS   = ['SEGUNDA-FEIRA','TERÇA-FEIRA','QUARTA-FEIRA',
                'QUINTA-FEIRA','SEXTA-FEIRA','SÁBADO','DOMINGO'];
const FAIXAS = ['ATÉ 10 ANOS','11 A 19 ANOS','20 A 29 ANOS','30 A 39 ANOS',
                '40 A 49 ANOS','50 A 59 ANOS','MAIORES DE 60 ANOS'];

let RAW = [], CH = {}, F = {}, lmap = null, hLayers = {}, curMap = 'all';

/* ── Função Core de Processamento ────────────────────────── */
function processarDados(textoCSV) {
  RAW = parseCSV(textoCSV);
  if(RAW.length < 2){ setStatus('Erro: CSV inválido'); return; }

  document.getElementById('land').style.display = 'none';
  document.getElementById('app').style.display  = 'flex';

  const boats = dedup(RAW).length;
  setStatus(RAW.length.toLocaleString('pt-BR') + ' reg · ' + boats.toLocaleString('pt-BR') + ' BOATs');
  
  populateSels();
  renderAll();
  initMap();

  // Força re-render dos mapas após tudo estar visível
  setTimeout(()=>{ ['all','ferido','obito'].forEach(t=>{ if(MAP_STATE[t].map) MAP_STATE[t].map.invalidateSize(); }); }, 500);
  setTimeout(()=>{ ['all','ferido','obito'].forEach(t=>{ if(MAP_STATE[t].map) MAP_STATE[t].map.invalidateSize(); }); }, 1200);
}

/* ── Carregamento via Upload (Manual) ────────────────────── */
function loadFile(f){
  if(!f) return;
  setStatus('Carregando...');
  const r = new FileReader();
  r.onload = e => processarDados(e.target.result);
  r.readAsText(f, 'ISO-8859-1');
}

/* ── Carregamento via URL (Automático) ───────────────────── */
async function loadFromURL(url) {
  setStatus('Carregando dados da fonte...');
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Falha ao buscar CSV');
    const text = await response.text();
    processarDados(text);
  } catch (err) {
    console.error(err);
    setStatus('Erro ao carregar URL automática');
  }
}

/* ── Inicialização ───────────────────────────────────────── */
window.addEventListener('DOMContentLoaded', () => {
  // A URL do seu arquivo CSV exportado do Google Sheets
  const URL_AUTOMATICA = 'https://raw.githubusercontent.com/JottaFilho/bi-viario/main/data/Bse de Dados - Sinistros em Natal_RN - 2021-2026 - Página1_ .csv;
  
  // Se quiser que carregue sempre, descomente a linha abaixo:
  loadFromURL(URL_AUTOMATICA);
});

/* ── Parser CSV (Mantido) ────────────────────────────────── */
function parseCSV(txt){
  const lines = txt.replace(/\r/g,'').split('\n').filter(l=>l.trim());
  if(!lines.length) return [];
  const sep = lines[0].split(';').length > lines[0].split(',').length ? ';' : ',';
  const hdrs = splitL(lines[0], sep);
  return lines.slice(1).map(line => {
    const v = splitL(line, sep), row = {};
    hdrs.forEach((h,i) => row[h] = (v[i]||'').trim());
    return row;
  });
}

function splitL(line, sep){
  const p = []; let cur = '', inQ = false;
  for(let i = 0; i < line.length; i++){
    const c = line[i];
    if(c === '"'){ inQ = !inQ; }
    else if(c === sep && !inQ){ p.push(cur.replace(/^"|"$/g,'')); cur = ''; }
    else cur += c;
  }
  p.push(cur.replace(/^"|"$/g,''));
  return p;
}