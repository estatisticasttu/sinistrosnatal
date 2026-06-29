/* ============================================================
   theme.js — Alternância de tema claro / escuro
   ============================================================ */

/* eslint-disable no-unused-vars */

let LIGHT_MODE = true;

function toggleTheme(){
  LIGHT_MODE = !LIGHT_MODE;
  const html = document.documentElement;
  const btn  = document.getElementById('theme-toggle');

  if(LIGHT_MODE){
    html.classList.remove('dark');
    btn.textContent = '☀️ Claro';
  } else {
    html.classList.add('dark');
    btn.textContent = '🌙 Escuro';
  }

  /* Troca tile layer de todos os mapas abertos */
  const newUrl    = getTileUrl();
  const allStates = [MAP_STATE.all, MAP_STATE.ferido, MAP_STATE.obito, FS_STATE];
  allStates.forEach(st=>{
    if(st.map && st.tileLayer){
      st.map.removeLayer(st.tileLayer);
      st.tileLayer = L.tileLayer(newUrl, { attribution:'© OSM © CARTO', maxZoom:19 }).addTo(st.map);
    }
  });

  /* Re-renderiza gráficos com as novas cores do tema */
  if(typeof renderAll === 'function' && CH && Object.keys(CH).length) renderAll();
}
