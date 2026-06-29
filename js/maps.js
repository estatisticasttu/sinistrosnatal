/* ============================================================
   maps.js — Mapas Leaflet (3 cards + fullscreen)
   ============================================================ */

/* eslint-disable no-unused-vars */

/* ── Estado dos mapas ────────────────────────────────────── */
const MAP_STATE = {
  all:    { map:null, heatLayer:null, dotsLayer:null, mode:'heat', tileLayer:null },
  ferido: { map:null, heatLayer:null, dotsLayer:null, mode:'heat', tileLayer:null },
  obito:  { map:null, heatLayer:null, dotsLayer:null, mode:'heat', tileLayer:null },
};

const FS_STATE = { map:null, heatLayer:null, dotsLayer:null, type:null, mode:'heat', tileLayer:null };

/* ── Configuração visual de cada mapa ────────────────────── */
const MAP_CFG = {
  all:    { gradient:{0.15:'#0ea5e9',0.35:'#22d3a5',0.55:'#fbbf24',0.8:'#f97316',1:'#f43f5e'}, dotColor:'#00d4ff', radius:10, blur:16, title:'🔵 Total Geral de Sinistros' },
  ferido: { gradient:{0.15:'#0ea5e9',0.35:'#22d3a5',0.55:'#fbbf24',0.8:'#f97316',1:'#f43f5e'}, dotColor:'#fbbf24', radius:11, blur:17, title:'🟡 Sinistros com Feridos' },
  obito:  { gradient:{0.2:'#22d3a5',0.45:'#fbbf24',0.7:'#f97316',1:'#f43f5e'},                  dotColor:'#f43f5e', radius:13, blur:18, title:'🔴 Sinistros com Óbito' },
};

/* ── URL do tile conforme tema ───────────────────────────── */
function getTileUrl(){
  return document.documentElement.classList.contains('dark')
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
}

/* ── Cria (ou retorna) mapa Leaflet ──────────────────────── */
function getOrCreateMap(containerId, stateObj){
  if(stateObj.map) return stateObj.map;
  const m = L.map(containerId, { zoomControl:true, attributionControl:false })
              .setView([-5.805,-35.210], 12);
  stateObj.tileLayer = L.tileLayer(getTileUrl(), { attribution:'© OSM © CARTO', maxZoom:19 }).addTo(m);
  stateObj.map = m;
  return m;
}

/* ── Extrai coordenadas de um array de rows ──────────────── */
function getCoords(rows){
  return rows.map(r=>{
    const loc = col(r,'LOCALIZAÇÃO');
    if(!loc || !loc.includes(',')) return null;
    const [lat,lng] = loc.split(',').map(x=>parseFloat(x.trim()));
    if(isNaN(lat)||isNaN(lng)||Math.abs(lat)<0.1) return null;
    return [lat,lng];
  }).filter(Boolean);
}

/* ── Limpa camadas de um estado ──────────────────────────── */
function clearLayers(stateObj){
  if(stateObj.heatLayer){ stateObj.map.removeLayer(stateObj.heatLayer); stateObj.heatLayer=null; }
  if(stateObj.dotsLayer){ stateObj.map.removeLayer(stateObj.dotsLayer); stateObj.dotsLayer=null; }
}

/* ── Desenha calor ou pontos ─────────────────────────────── */
function drawMap(stateObj, coords, cfg, mode){
  clearLayers(stateObj);
  if(!coords.length) return;
  if(mode === 'heat'){
    stateObj.heatLayer = L.heatLayer(
      coords.map(([a,b])=>[a,b,1]),
      { radius:cfg.radius, blur:cfg.blur||16, maxZoom:19, max:1.0, minOpacity:0.2, gradient:cfg.gradient }
    ).addTo(stateObj.map);
  } else {
    const group = L.layerGroup();
    coords.forEach(([lat,lng])=>{
      L.circleMarker([lat,lng], {
        radius:5, color:cfg.dotColor, fillColor:cfg.dotColor,
        fillOpacity:0.7, weight:0
      }).addTo(group);
    });
    stateObj.dotsLayer = group;
    group.addTo(stateObj.map);
  }
}

/* ── Atualiza os 3 mapas com dados filtrados ─────────────── */
function updTripleMaps(){
  const all    = getF();
  const acc    = dedup(all);
  const boatsFset = new Set(all.filter(r=>col(r,'ESTADO FÍSICO')==='FERIDO').map(r=>col(r,'NÚMERO BOAT')));
  const boatsOset = new Set(all.filter(r=>col(r,'ESTADO FÍSICO')==='ÓBITO').map(r=>col(r,'NÚMERO BOAT')));

  const DATA = {
    all:    { rows: acc, count: acc.length },
    ferido: { rows: acc.filter(r=>boatsFset.has(col(r,'NÚMERO BOAT'))), count:0 },
    obito:  { rows: acc.filter(r=>boatsOset.has(col(r,'NÚMERO BOAT'))), count:0 },
  };
  DATA.ferido.count = DATA.ferido.rows.length;
  DATA.obito.count  = DATA.obito.rows.length;

  ['all','ferido','obito'].forEach(type=>{
    const st     = MAP_STATE[type];
    const cfg    = MAP_CFG[type];
    const {rows, count} = DATA[type];
    const coords = getCoords(rows);

    getOrCreateMap('map-'+type, st);
    drawMap(st, coords, cfg, st.mode);

    const labels = {all:'sinistros totais', ferido:'com feridos', obito:'com óbito'};
    document.getElementById('map-'+type+'-count').textContent =
      count.toLocaleString('pt-BR') + ' ponto(s) — ' + labels[type];

    /* Invalida tamanho (necessário quando div estava oculta) */
    setTimeout(()=>{ if(st.map) st.map.invalidateSize(); }, 50);
    setTimeout(()=>{ if(st.map) st.map.invalidateSize(); }, 300);
    setTimeout(()=>{ if(st.map) st.map.invalidateSize(); }, 700);
  });
}

/* ── Altera modo calor / pontos de um mini-mapa ──────────── */
function setMapMode(type, mode, btn){
  MAP_STATE[type].mode = mode;
  const card = document.getElementById('mapcard-'+type);
  card.querySelectorAll('.mmbtn').forEach(b=>b.classList.remove('active'));
  if(btn) btn.classList.add('active');
  updTripleMaps();
}

/* ── Fullscreen ──────────────────────────────────────────── */
function openFullscreen(type){
  const modal = document.getElementById('fs-modal');
  const cfg   = MAP_CFG[type];
  FS_STATE.type = type;
  FS_STATE.mode = MAP_STATE[type].mode;

  document.getElementById('fs-title').textContent = cfg.title;
  document.getElementById('fs-heat-btn').classList.toggle('active', FS_STATE.mode==='heat');
  document.getElementById('fs-dots-btn').classList.toggle('active', FS_STATE.mode==='dots');

  modal.classList.add('open');
  document.body.style.overflow = 'hidden';

  if(FS_STATE.map){ FS_STATE.map.remove(); FS_STATE.map=null; FS_STATE.heatLayer=null; FS_STATE.dotsLayer=null; }
  getOrCreateMap('fs-map', FS_STATE);

  const all       = getF();
  const acc       = dedup(all);
  const boatsFset = new Set(all.filter(r=>col(r,'ESTADO FÍSICO')==='FERIDO').map(r=>col(r,'NÚMERO BOAT')));
  const boatsOset = new Set(all.filter(r=>col(r,'ESTADO FÍSICO')==='ÓBITO').map(r=>col(r,'NÚMERO BOAT')));
  const rows = type==='all'    ? acc
             : type==='ferido' ? acc.filter(r=>boatsFset.has(col(r,'NÚMERO BOAT')))
             :                   acc.filter(r=>boatsOset.has(col(r,'NÚMERO BOAT')));
  const coords = getCoords(rows);
  const cfgFS  = { ...cfg, radius: cfg.radius + 4 };

  drawMap(FS_STATE, coords, cfgFS, FS_STATE.mode);
  setTimeout(()=>{ if(FS_STATE.map) FS_STATE.map.invalidateSize(); }, 50);
  setTimeout(()=>{ if(FS_STATE.map) FS_STATE.map.invalidateSize(); }, 250);

  const labels = {all:'sinistros totais', ferido:'com feridos', obito:'com óbito'};
  document.getElementById('fs-count').textContent =
    rows.length.toLocaleString('pt-BR') + ' ponto(s) — ' + labels[type];
}

function closeFullscreen(){
  document.getElementById('fs-modal').classList.remove('open');
  document.body.style.overflow = '';
  if(FS_STATE.map){ FS_STATE.map.remove(); FS_STATE.map=null; FS_STATE.heatLayer=null; FS_STATE.dotsLayer=null; }
}

function setFsMode(mode, btn){
  FS_STATE.mode = mode;
  document.querySelectorAll('#fs-inner .mmbtn').forEach(b=>b.classList.remove('active'));
  if(btn) btn.classList.add('active');
  if(FS_STATE.type && FS_STATE.map){
    const type      = FS_STATE.type;
    const cfg       = MAP_CFG[type];
    const all       = getF();
    const acc       = dedup(all);
    const boatsFset = new Set(all.filter(r=>col(r,'ESTADO FÍSICO')==='FERIDO').map(r=>col(r,'NÚMERO BOAT')));
    const boatsOset = new Set(all.filter(r=>col(r,'ESTADO FÍSICO')==='ÓBITO').map(r=>col(r,'NÚMERO BOAT')));
    const rows = type==='all'    ? acc
               : type==='ferido' ? acc.filter(r=>boatsFset.has(col(r,'NÚMERO BOAT')))
               :                   acc.filter(r=>boatsOset.has(col(r,'NÚMERO BOAT')));
    const coords = getCoords(rows);
    const cfgFS  = { ...cfg, radius: cfg.radius + 4 };
    drawMap(FS_STATE, coords, cfgFS, FS_STATE.mode);
  }
}

/* ESC fecha o modal */
document.addEventListener('keydown', e=>{ if(e.key==='Escape') closeFullscreen(); });

/* ── Inicialização chamada após carga do CSV ─────────────── */
function initMap(){ /* updTripleMaps é chamado pelo renderAll */ }
function updMap(){ updTripleMaps(); }
