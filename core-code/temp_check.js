

// ============ STATE ============
const state = {
  screen: 'welcome',
  tab: 'explore',
  notes: null,
  currentNote: null,
  replies: [],
  profile: null,
  location: { lat: 31.2304, lng: 121.4737, accuracy: 10 },
  locationMode: 'simulated',
  markers: [],
  watchId: null,
  geoWatchId: null,
  filters: {},
  globe: null,
  localMapZoom: 15,
};

const MOODS = {
  happy:   { label: '开心',  color: '#788c5d', cssVar: 'var(--mood-happy)' },
  sad:     { label: '难过',  color: '#6a9bcc', cssVar: 'var(--mood-sad)' },
  angry:   { label: '愤怒',  color: '#d97757', cssVar: 'var(--mood-angry)' },
  anxious: { label: '焦虑',  color: '#c4a35a', cssVar: 'var(--mood-anxious)' },
  love:    { label: '告白',  color: '#c46686', cssVar: 'var(--mood-love)' },
  thought: { label: '感悟',  color: '#8b7fb8', cssVar: 'var(--mood-thought)' },
  rant:    { label: '吐槽',  color: '#6a8a9e', cssVar: 'var(--mood-rant)' },
};

const GRADIENTS = [
  ['#788c5d','#5a6b44'],['#6a9bcc','#4a7aab'],['#d97757','#a85a3f'],
  ['#c4a35a','#9a7f45'],['#c46686','#9a4a68'],['#8b7fb8','#6b5f98'],
  ['#6a8a9e','#4a6a7e'],['#87867f','#5e5d59'],
];

// ============ API ============
const API = (() => {
  if (location.origin && location.origin !== 'null' && /^https?:$/.test(location.protocol)) {
    return location.origin;
  }
  return 'http://127.0.0.1:3000';
})();

const TILE_BASE = API + '/tiles/osm';
async function apiPost(path, body) {
  const r = await fetch(API + path, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) });
  if (!r.ok) { const e = await r.json().catch(()=>({})); throw new Error(e.error||e.message||'Error'); }
  return r.json();
}

// ============ UTILS ============
function fmtDist(m) { return m < 10 ? '近处' : m < 1000 ? Math.round(m)+'米' : (m/1000).toFixed(1)+'公里'; }
function getDistanceState(distance) {
  if (distance <= 10) return 'unlocked';
  if (distance <= 50) return 'near';
  if (distance <= 200) return 'approach';
  return 'far';
}

function getRevealStage(distance) {
  if (distance <= 10) return 'full';
  if (distance <= 50) return 'clear-blur';
  if (distance <= 200) return 'partial-blur';
  return 'hidden';
}

function getRevealCopy(note) {
  const stage = getRevealStage(note.distance);
  const fullText = note.content || '';
  const previewText = note.contentPreview || fullText.slice(0, 30);

  if (stage === 'full') {
    return {
      text: fullText,
      label: '已解锁',
      blur: 'none',
      opacity: '1',
      lineClamp: 'none',
      suffix: '',
    };
  }

  if (stage === 'clear-blur') {
    return {
      text: fullText,
      label: '靠近中，内容逐渐清晰',
      blur: 'blur(1.1px)',
      opacity: '0.92',
      lineClamp: '2',
      suffix: '',
    };
  }

  return {
    text: previewText,
    label: '再靠近一点才能看清',
    blur: 'blur(2.4px)',
    opacity: '0.78',
    lineClamp: '2',
    suffix: '…',
  };
}

function getDistanceLabel(state, distance) {
  switch (state) {
    case 'unlocked':
      return '已解锁';
    case 'near':
      return `已经很近了！再走 ${Math.round(distance)} 米`;
    case 'approach':
      return `还需走近 ${Math.round(Math.max(0, distance - 50))} 米`;
    case 'far':
      return `前方 ${Math.round(distance)} 米有纸条`;
    default:
      return '';
  }
}
function fmtTime(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '刚刚';
  const n = new Date(), diff = Math.floor((n-d)/1000);
  if (diff < 60) return '刚刚';
  if (diff < 3600) return Math.floor(diff/60)+'分钟前';
  if (diff < 86400) return Math.floor(diff/3600)+'小时前';
  return Math.floor(diff/86400)+'天前';
}
function genCode() {
  const adj = ['孤独的','深夜的','湖边的','街角的','雨后的','午后的','迷路的','等待的','沉默的','流浪的'];
  const noun = ['美食家','失眠者','守望者','旅行者','梦想家','路人甲','咖啡师','读者','写作者','听风者'];
  return adj[Math.floor(Math.random()*adj.length)] + noun[Math.floor(Math.random()*noun.length)] + '_' + Math.floor(Math.random()*10000).toString().padStart(4,'0');
}
function distBetween(lat1,lng1,lat2,lng2) {
  const R=6371000, dLat=(lat2-lat1)*Math.PI/180, dLng=(lng2-lng1)*Math.PI/180;
  const a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

// ============ REAL LOCATION ============
function formatCoordLabel(lat, lng) {
  return `${lat.toFixed(4)},${lng.toFixed(4)}`;
}

function initRealLocation() {
  if (!navigator.geolocation) {
    state.locationMode = 'simulated';
    state.currentAddress = formatCoordLabel(state.location.lat, state.location.lng);
    updateGpsStatusUI();
    if (state.screen === 'app') {
      loadNearbyNotes();
    }
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      state.location.lat = pos.coords.latitude;
      state.location.lng = pos.coords.longitude;
      state.location.accuracy = pos.coords.accuracy || 10;
      state.locationMode = 'real';
      state.currentAddress = formatCoordLabel(state.location.lat, state.location.lng);
      updateGpsStatusUI();
      if (state.globe) {
        updateGlobeRotation();
        loadNearbyNotes();
      }
    },
    (err) => {
      console.warn('GPS error:', err.message);
      state.locationMode = 'simulated';
      state.currentAddress = formatCoordLabel(state.location.lat, state.location.lng);
      updateGpsStatusUI();
      if (state.screen === 'app') {
        loadNearbyNotes();
      }
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
  );

  state.geoWatchId = navigator.geolocation.watchPosition(
    (pos) => {
      state.location.lat = pos.coords.latitude;
      state.location.lng = pos.coords.longitude;
      state.location.accuracy = pos.coords.accuracy || 10;
      state.locationMode = 'real';
      state.currentAddress = formatCoordLabel(state.location.lat, state.location.lng);
      updateNoteDistances();
      updateGpsStatusUI();
    },
    () => {},
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
  );
}

function updateGpsStatusUI() {
  const el = document.getElementById('gpsStatus');
  if (!el) return;
  const mode = state.locationMode;
  const labels = { real: ['实时定位', 'active'], simulated: ['模拟位置', 'simulated'] };
  const [text, cls] = labels[mode] || labels.simulated;
  const address = state.currentAddress ? ` · ${state.currentAddress}` : '';
  el.innerHTML = `<div class="gps-badge"><div class="gps-dot ${cls}"></div><span class="detail-s" style="color:var(--color-slate-light)">${text}${address}</span></div>`;
}

// ============ RENDER ============
const root = document.getElementById('root');
function render() {
  if (!state.profile && state.screen !== 'welcome' && state.screen !== 'identity') { state.screen = 'welcome'; }
  switch(state.screen) {
    case 'welcome': renderWelcome(); break;
    case 'identity': renderIdentity(); break;
    case 'app': renderApp(); break;
    case 'detail': renderDetail(); break;
    case 'create': renderCreate(); break;
  }
  initReveals();
}

function initReveals() {
  const reveals = document.querySelectorAll('.reveal');
  if (!reveals.length) return;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });
  reveals.forEach(el => observer.observe(el));
}

function renderWelcome() {
  root.innerHTML = `
    <div class="screen bg-ivory flex flex-col justify-center items-center px-8">
      <div class="w-32 h-32 rounded-full mb-10 flex items-center justify-center" style="background:var(--color-slate-100);border:1px solid var(--color-slate-200)">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-clay)" stroke-width="1.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
      </div>
      <h1 class="display-serif-xl text-center mb-4" style="color:var(--color-slate-dark)">发现身边的秘密</h1>
      <p class="paragraph-m text-center mb-12" style="color:var(--color-slate-light);max-width:280px">每一条街道、每一个角落，都藏着陌生人的故事。走近，才能听见。</p>
      <button onclick="goIdentity()" class="btn-primary" style="max-width:280px">开始探索</button>
      <p class="detail-s mt-6" style="color:var(--color-cloud-medium)">完全匿名 · 无需注册 · 位置仅用于附近查询</p>
    </div>`;
}

let tempCode = genCode(), tempGradient = 0, tempNickname = '';
function goIdentity() { state.screen = 'identity'; render(); }
function renderIdentity() {
  root.innerHTML = `
    <div class="screen bg-ivory px-6 pt-20 pb-8">
      <h2 class="headline-2 mb-2" style="color:var(--color-slate-dark)">创建你的匿名身份</h2>
      <p class="paragraph-m mb-8" style="color:var(--color-slate-light)">这只是你在 DeadDrop 的代号</p>
      <div class="quote-card mb-4 text-center" style="border:1px solid var(--color-slate-200)">
        <p class="mono-label" style="color:var(--color-slate-dark);font-size:1.125rem" id="codeDisplay">${tempCode}</p>
      </div>
      <button onclick="refreshCode()" class="btn-secondary mb-8 mx-auto block" style="color:var(--color-clay)">换一个</button>
      <p class="detail-s font-medium mb-2" style="color:var(--color-cloud-dark)">自定义昵称（可选）</p>
      <input id="nickInput" value="${tempNickname}" oninput="tempNickname=this.value" placeholder="给自己起个名字" class="input-field mb-8">
      <p class="detail-s font-medium mb-3" style="color:var(--color-cloud-dark)">头像颜色</p>
      <div class="flex gap-3 flex-wrap mb-auto">
        ${GRADIENTS.map((g,i)=>`<button onclick="pickGradient(${i})" class="w-10 h-10 rounded-full border-2 transition-all" style="background:linear-gradient(135deg,${g[0]},${g[1]});border-color:${i===tempGradient?'var(--color-slate-dark)':'transparent'}"></button>`).join('')}
      </div>
      <button onclick="confirmIdentity()" class="btn-primary mt-8" style="max-width:100%">继续</button>
    </div>`;
}
function refreshCode() { tempCode = genCode(); const el = document.getElementById('codeDisplay'); if (el) el.textContent = tempCode; }
function pickGradient(i) { tempGradient = i; renderIdentity(); }
function confirmIdentity() {
  state.profile = { anonymousCode: tempCode, nickname: tempNickname || null, avatarGradient: tempGradient };
  state.screen = 'app';
  render();
  setTimeout(() => { initGlobe(); initRealLocation(); updateGpsStatusUI(); }, 100);
}


// ============ LOCAL MAP (Real-location Window) ============
let globeProjection = null, globeSvg = null, globeGroup = null;
let globeDots = [], globeDotSel = null, globeClusterSel = null;

const DEFAULT_LOCAL_MAP_ZOOM = 15;

function computeAdaptiveMapZoom() {
  if (!state.notes) return DEFAULT_LOCAL_MAP_ZOOM;
  const allDistances = [
    ...(state.notes.unlocked || []).map(n => Number(n.distance)),
    ...(state.notes.preview || []).map(n => Number(n.distance)),
    ...(state.notes.distant || []).map(n => Number(n.centerDistance))
  ].filter(Number.isFinite);

  if (!allDistances.length) return DEFAULT_LOCAL_MAP_ZOOM;
  const nearest = Math.min(...allDistances);
  if (nearest <= 300) return 16;
  if (nearest <= 1200) return 15;
  if (nearest <= 3000) return 14;
  return 13;
}

function lonLatToWorldPx(lng, lat, zoom) {
  const latClamped = Math.max(-85.05112878, Math.min(85.05112878, lat));
  const scale = 256 * Math.pow(2, zoom);
  const x = ((lng + 180) / 360) * scale;
  const sin = Math.sin((latClamped * Math.PI) / 180);
  const y = (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale;
  return { x, y };
}

function worldPxToLonLat(x, y, zoom) {
  const scale = 256 * Math.pow(2, zoom);
  const lon = (x / scale) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / scale;
  const lat = (180 / Math.PI) * Math.atan(Math.sinh(n));
  return { lon, lat };
}

function buildLocalProjection(width, height, center, zoom) {
  const centerWorld = lonLatToWorldPx(center.lng, center.lat, zoom);
  const project = ([lng, lat]) => {
    const world = lonLatToWorldPx(lng, lat, zoom);
    return [world.x - centerWorld.x + width / 2, world.y - centerWorld.y + height / 2];
  };
  project.center = center;
  project.width = width;
  project.height = height;
  project.zoom = zoom;
  project.centerWorld = centerWorld;
  return project;
}

function getGlobeSize(containerNode) {
  const rect = containerNode ? containerNode.getBoundingClientRect() : { width: 0, height: 0 };
  const width = Math.max(280, Math.round(rect.width || 0) || 430);
  const height = Math.max(220, Math.round(rect.height || 0) || 350);
  return { width, height };
}

function syncProjectionViewport() {
  const containerNode = d3.select('#globe-viz').node();
  if (!containerNode || !globeProjection || !globeSvg) return;
  const { width, height } = getGlobeSize(containerNode);
  if (width === globeProjection.width && height === globeProjection.height) return;
  globeProjection = buildLocalProjection(width, height, globeProjection.center, globeProjection.zoom || state.localMapZoom || DEFAULT_LOCAL_MAP_ZOOM);
  globeProjection.center = globeProjection.center || { lat: state.location.lat, lng: state.location.lng };
  globeProjection.width = width;
  globeProjection.height = height;
  globeSvg.attr('viewBox', `0 0 ${width} ${height}`);
}

function drawTileLayer() {
  if (!globeGroup || !globeProjection) return;
  globeGroup.select('g.tile-layer').remove();

  const tileLayer = globeGroup.append('g').attr('class', 'tile-layer');
  const z = globeProjection.zoom;
  const n = Math.pow(2, z);
  const tileSize = 256;
  const topLeftWorldX = globeProjection.centerWorld.x - globeProjection.width / 2;
  const topLeftWorldY = globeProjection.centerWorld.y - globeProjection.height / 2;

  const minTileX = Math.floor(topLeftWorldX / tileSize);
  const maxTileX = Math.floor((topLeftWorldX + globeProjection.width) / tileSize);
  const minTileY = Math.floor(topLeftWorldY / tileSize);
  const maxTileY = Math.floor((topLeftWorldY + globeProjection.height) / tileSize);

  for (let tx = minTileX; tx <= maxTileX; tx++) {
    for (let ty = minTileY; ty <= maxTileY; ty++) {
      if (ty < 0 || ty >= n) continue;
      const wrappedX = ((tx % n) + n) % n;
      const px = tx * tileSize - topLeftWorldX;
      const py = ty * tileSize - topLeftWorldY;
      tileLayer.append('image')
        .attr('href', `${TILE_BASE}/${z}/${wrappedX}/${ty}.png`)
        .attr('x', px)
        .attr('y', py)
        .attr('width', tileSize)
        .attr('height', tileSize)
        .attr('preserveAspectRatio', 'none');
    }
  }

  // Keep the existing muted visual style while using real streets.
  tileLayer.append('rect')
    .attr('x', 0)
    .attr('y', 0)
    .attr('width', globeProjection.width)
    .attr('height', globeProjection.height)
    .attr('fill', '#f7f5ef')
    .attr('opacity', 0.45);

  globeGroup.append('rect')
    .attr('x', 0.5)
    .attr('y', 0.5)
    .attr('width', globeProjection.width - 1)
    .attr('height', globeProjection.height - 1)
    .attr('fill', 'none')
    .attr('stroke', '#d9d5ca')
    .attr('stroke-width', 1);
}

function drawCenterMarker() {
  if (!globeSvg || !globeProjection) return;
  globeSvg.select('g.user-center').remove();
  const g = globeSvg.append('g').attr('class', 'user-center');
  const cx = globeProjection.width / 2;
  const cy = globeProjection.height / 2;
  const accuracyRadius = Math.max(18, Math.min(72, (state.location.accuracy || 20) / 2));

  g.append('circle')
    .attr('cx', cx).attr('cy', cy)
    .attr('r', accuracyRadius)
    .attr('fill', 'none')
    .attr('stroke', '#d9775738')
    .attr('stroke-width', 1.2);

  g.append('circle')
    .attr('cx', cx).attr('cy', cy)
    .attr('r', 5)
    .attr('fill', '#d97757')
    .attr('stroke', '#fff')
    .attr('stroke-width', 2);
}

async function initGlobe() {
  const container = d3.select('#globe-viz');
  if (container.empty()) { setTimeout(initGlobe, 200); return; }
  const containerNode = container.node();
  const { width, height } = getGlobeSize(containerNode);
  const center = { lat: state.location.lat || 31.2304, lng: state.location.lng || 121.4737 };

  container.html('');
  globeSvg = container.append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('preserveAspectRatio', 'xMidYMid meet')
    .style('width', '100%')
    .style('height', '100%')
    .style('display', 'block');

  // Enable basic pan (drag) and zoom (wheel) interactions on the SVG.
  (function enablePanZoom() {
    let isPanning = false;
    let start = null;

    globeSvg.style('cursor', 'grab');

    globeSvg.on('mousedown', (event) => {
      isPanning = true;
      start = { x: event.clientX, y: event.clientY };
      globeSvg.style('cursor', 'grabbing');
      event.preventDefault();
    });

    window.addEventListener('mousemove', (ev) => {
      if (!isPanning || !globeProjection) return;
      const dx = ev.clientX - start.x;
      const dy = ev.clientY - start.y;
      start = { x: ev.clientX, y: ev.clientY };

      // Translate centerWorld by pixel delta
      globeProjection.centerWorld.x -= dx;
      globeProjection.centerWorld.y -= dy;

      // compute new center lat/lon from updated centerWorld
      const c = worldPxToLonLat(globeProjection.centerWorld.x, globeProjection.centerWorld.y, globeProjection.zoom);
      globeProjection.center = { lat: c.lat, lng: c.lon };
      updateGlobePaths();
    });

    window.addEventListener('mouseup', () => {
      if (!isPanning) return;
      isPanning = false;
      globeSvg.style('cursor', 'grab');
    });

    // Wheel to zoom in/out (integer zoom levels)
    globeSvg.node().addEventListener('wheel', (ev) => {
      if (!globeProjection) return;
      ev.preventDefault();
      const delta = Math.sign(ev.deltaY);
      const oldZoom = globeProjection.zoom || state.localMapZoom || DEFAULT_LOCAL_MAP_ZOOM;
      let newZoom = oldZoom - delta; // wheel down -> zoom out (increase deltaY), we invert
      newZoom = Math.max(1, Math.min(18, Math.round(newZoom)));
      if (newZoom === oldZoom) return;

      // Keep center lat/lng the same, but rebuild projection at new zoom
      const centerLatLng = globeProjection.center || { lat: state.location.lat, lng: state.location.lng };
      globeProjection = buildLocalProjection(globeProjection.width, globeProjection.height, centerLatLng, newZoom);
      globeProjection.center = centerLatLng;
      updateGlobePaths();
    }, { passive: false });
  })();

  globeProjection = buildLocalProjection(width, height, center, state.localMapZoom || DEFAULT_LOCAL_MAP_ZOOM);
  globeProjection.center = center;
  globeProjection.width = width;
  globeProjection.height = height;

  globeGroup = globeSvg.append('g');
  drawTileLayer();
  initGlobeDots();
  drawCenterMarker();
  setTimeout(centerToNearestDotIfInvisible, 0);
}

function initGlobeDots() {
  if (!state.notes || !globeGroup) return;
  const all = [...(state.notes.unlocked || []), ...(state.notes.preview || [])];
  const distant = state.notes.distant || [];

  globeDots = all.map(note => {
    const mood = MOODS[note.moodTag];
    return {
      type: 'note',
      lon: Number(note.lng),
      lat: Number(note.lat),
      color: mood ? mood.color : '#788c5d',
      noteId: note.id,
      distance: Number(note.distance)
    };
  }).concat(
    distant.map(d => ({
      type: 'cluster',
      lon: Number(d.lng),
      lat: Number(d.lat),
      count: Number(d.count),
      distance: Number(d.centerDistance),
      color: '#8f8a7e'
    }))
  );

  globeGroup.select('g.dots').remove();
  const dotGroup = globeGroup.append('g').attr('class', 'dots');

  globeDotSel = dotGroup.selectAll('circle')
    .data(globeDots)
    .join('circle')
    .attr('r', d => d.type === 'cluster' ? 8 : (d.distance <= 50 ? 3.2 : 2.1))
    .attr('fill', d => d.type === 'cluster' ? '#faf9f5' : d.color)
    .attr('opacity', 0.9)
    .attr('stroke', d => d.type === 'cluster' ? '#8f8a7e' : '#fff')
    .attr('stroke-width', d => d.type === 'cluster' ? 1.4 : 0.8)
    .style('cursor', 'pointer')
    .on('click', (event, d) => {
      event.stopPropagation();
      if (d.type === 'note' && d.noteId) openNote(d.noteId);
      if (d.type === 'cluster') centerOnPoint(d.lat, d.lon);
    });

  globeClusterSel = dotGroup.selectAll('text.cluster-label')
    .data(globeDots.filter(d => d.type === 'cluster'))
    .join('text')
    .attr('class', 'cluster-label')
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'central')
    .attr('font-size', 9)
    .attr('font-family', 'var(--font-sans)')
    .attr('font-weight', 600)
    .attr('fill', '#8f8a7e')
    .style('pointer-events', 'none')
    .text(d => d.count > 9 ? '9+' : String(d.count || 0));

  renderGlobeDots();
  centerToNearestDotIfInvisible();
}

function renderGlobeDots() {
  if (!globeDotSel || !globeProjection) return;
  syncProjectionViewport();
  globeDotSel
    .attr('cx', d => globeProjection([d.lon, d.lat])[0])
    .attr('cy', d => globeProjection([d.lon, d.lat])[1])
    .attr('opacity', d => {
      const p = globeProjection([d.lon, d.lat]);
      const inside = p[0] >= 0 && p[0] <= globeProjection.width && p[1] >= 0 && p[1] <= globeProjection.height;
      return inside ? 0.9 : 0;
    })
    .style('pointer-events', d => {
      const p = globeProjection([d.lon, d.lat]);
      const inside = p[0] >= 0 && p[0] <= globeProjection.width && p[1] >= 0 && p[1] <= globeProjection.height;
      return inside ? 'auto' : 'none';
    });

  if (globeClusterSel) {
    globeClusterSel
      .attr('x', d => globeProjection([d.lon, d.lat])[0])
      .attr('y', d => globeProjection([d.lon, d.lat])[1])
      .attr('opacity', d => {
        const p = globeProjection([d.lon, d.lat]);
        const inside = p[0] >= 0 && p[0] <= globeProjection.width && p[1] >= 0 && p[1] <= globeProjection.height;
        return inside ? 1 : 0;
      });
  }
}

function getVisibleDotCount() {
  if (!globeProjection || !globeDots || !globeDots.length) return 0;
  return globeDots.filter(d => {
    const p = globeProjection([d.lon, d.lat]);
    return p[0] >= 0 && p[0] <= globeProjection.width && p[1] >= 0 && p[1] <= globeProjection.height;
  }).length;
}

function centerToNearestDotIfInvisible() {
  if (!globeProjection || !globeDots || !globeDots.length) return;
  if (getVisibleDotCount() > 0) return;

  const nearest = globeDots
    .filter(d => Number.isFinite(Number(d.lat)) && Number.isFinite(Number(d.lon)))
    .sort((a, b) => {
      const da = distBetween(state.location.lat, state.location.lng, Number(a.lat), Number(a.lon));
      const db = distBetween(state.location.lat, state.location.lng, Number(b.lat), Number(b.lon));
      return da - db;
    })[0];

  if (!nearest) return;

  globeProjection = buildLocalProjection(
    globeProjection.width,
    globeProjection.height,
    { lat: nearest.lat, lng: nearest.lon },
    globeProjection.zoom || state.localMapZoom || DEFAULT_LOCAL_MAP_ZOOM
  );
  globeProjection.center = { lat: nearest.lat, lng: nearest.lon };
  updateGlobePaths();
}

function updateGlobePaths() {
  syncProjectionViewport();
  drawTileLayer();
  renderGlobeDots();
  drawCenterMarker();
}

function updateGlobeRotation() {
  if (!globeProjection || !globeSvg) return;
  globeSvg.interrupt();
  const start = globeProjection.center || { lat: state.location.lat, lng: state.location.lng };
  const target = { lat: state.location.lat || 31.2304, lng: state.location.lng || 121.4737 };

  d3.transition()
    .duration(650)
    .ease(d3.easeCubicOut)
    .tween('local-map-center', () => {
      const iLat = d3.interpolateNumber(start.lat, target.lat);
      const iLng = d3.interpolateNumber(start.lng, target.lng);
      return t => {
        const c = { lat: iLat(t), lng: iLng(t) };
        globeProjection = buildLocalProjection(globeProjection.width, globeProjection.height, c, globeProjection.zoom || state.localMapZoom || DEFAULT_LOCAL_MAP_ZOOM);
        globeProjection.center = c;
        syncProjectionViewport();
        updateGlobePaths();
      };
    });
}

function centerOnPoint(lat, lng) {
  if (!globeProjection || !globeSvg) return;
    const parsedLat = Number(lat);
    const parsedLng = Number(lng);
    if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) return;
    globeSvg.interrupt();
  const start = globeProjection.center || { lat: state.location.lat, lng: state.location.lng };
    const target = { lat: parsedLat, lng: parsedLng };

  d3.transition()
    .duration(650)
    .ease(d3.easeCubicOut)
    .tween('local-map-center-point', () => {
      const iLat = d3.interpolateNumber(start.lat, target.lat);
      const iLng = d3.interpolateNumber(start.lng, target.lng);
      return t => {
        const c = { lat: iLat(t), lng: iLng(t) };
        globeProjection = buildLocalProjection(globeProjection.width, globeProjection.height, c, globeProjection.zoom || state.localMapZoom || DEFAULT_LOCAL_MAP_ZOOM);
        globeProjection.center = c;
        syncProjectionViewport();
        updateGlobePaths();
      };
    });
}

function centerOnUser() {
  updateGlobeRotation();
}

// ============ APP SHELL ============
function renderApp() {
  if (state.tab === 'explore') {
    renderExploreTab();
  } else if (state.tab === 'list') {
    root.innerHTML = `<div class="screen pb-24" style="background:var(--color-ivory-light)">${renderListContent()}</div>${renderTabBar()}`;
  } else {
    root.innerHTML = `<div class="screen pb-24" style="background:var(--color-ivory-light)">${getTabContent()}</div>${renderTabBar()}`;
  }
  if (state.tab === 'explore') {
    setTimeout(() => { initGlobe(); updateGpsStatusUI(); }, 50);
  }
}

function renderExploreTab() {
  const notes = state.notes;
  const all = notes ? [...notes.unlocked, ...notes.preview] : [];
  const unlocked = all.filter(n => n.distance <= 50);
  const preview = all.filter(n => n.distance > 50 && n.distance <= 200);
  const distant = notes ? notes.distant : [];

  // Pick a random nearby note for the globe story
  const storyNote = unlocked.length > 0 ? unlocked[0] : (all.length > 0 ? all[0] : null);

  root.innerHTML = `
    <div class="screen" style="display:flex;flex-direction:column;background:var(--color-ivory-light)">
      <!-- Globe Section -->
      <div class="globe-section">
        <div id="globe-viz"></div>
        <div class="globe-overlay">
          ${storyNote ? `
            <div class="reveal">
              <div class="globe-story-country">${MOODS[storyNote.moodTag]?.label || '纸条'}</div>
              ${(() => {
                const reveal = getRevealCopy(storyNote);
                return `<blockquote class="globe-story-quote" style="filter:${reveal.blur};opacity:${reveal.opacity};${reveal.lineClamp !== 'none' ? 'display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:' + reveal.lineClamp + ';overflow:hidden;' : ''}">${reveal.text}${reveal.suffix}</blockquote>`;
              })()}
              <div class="globe-story-role">${storyNote.authorNickname || storyNote.authorCode} · ${fmtDist(storyNote.distance)}</div>
            </div>
          ` : '<div class="globe-story-quote" style="color:var(--color-cloud-medium)">附近暂无纸条</div>'}
        </div>
        <!-- GPS Status -->
        <div class="gps-status"><div id="gpsStatus"></div></div>
        <!-- Top Info Bar -->
        <div class="absolute top-0 left-0 right-0 z-[500] px-4 pt-12 pb-3" style="background:linear-gradient(to bottom, rgba(250,249,245,0.95), transparent);">
          <div class="flex justify-between items-start">
            <div>
              <h1 class="headline-2" style="color:var(--color-slate-dark);font-size:1.25rem">附近纸条</h1>
              <p class="detail-s mt-1" style="color:var(--color-slate-light)" id="mapStats">
                ${notes ? `<span style="color:var(--color-olive);font-weight:500">${unlocked.length}</span> 张可阅读 · <span style="color:#c4a35a;font-weight:500">${preview.length}</span> 张走近解锁` : '加载中...'}
              </p>
            </div>
            <div class="flex flex-col items-end gap-2">
              <div class="flex gap-1">
                <button onclick="switchTab('list')" class="map-control-btn" style="width:auto;padding:0 12px;border-radius:2px">
                  <span class="detail-s" style="color:var(--color-slate-light)">列表</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Nearby Notes List -->
      <div class="flex-1 overflow-y-auto px-4 pt-4 pb-24" style="background:var(--color-ivory-light)">
        ${all.length === 0 && notes ? '<p class="paragraph-m text-center py-8" style="color:var(--color-cloud-medium)">附近暂无纸条</p>' : ''}
        ${all.map(note => renderNoteCard(note)).join('')}
        ${distant.map(d=>`
          <button onclick="centerOnPoint(${d.lat}, ${d.lng})" class="quote-card mb-3 flex justify-between items-center w-full text-left" style="background:var(--color-slate-050);border-color:var(--color-slate-150)">
            <div>
              <p class="body-2" style="color:var(--color-slate-medium)">前方有${d.count} 张纸条</p>
              <p class="detail-s mt-1" style="color:var(--color-cloud-medium)">${fmtDist(d.centerDistance)} · 定位到该区域</p>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-cloud-medium)" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        `).join('')}
      </div>

      <!-- Map Controls -->
      <div class="map-controls">
        <button onclick="centerOnUser()" class="map-control-btn" title="定位到我的位置">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-slate-light)" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4"/></svg>
        </button>
        <button onclick="loadNearbyNotes()" class="map-control-btn" title="刷新附近纸条">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-slate-light)" stroke-width="2"><path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
        </button>
      </div>

      ${renderTabBar()}
    </div>`;
}

function renderTabBar() {
  const tabs = [
    {k:'explore',l:'地图',icon:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>'},
    {k:'list',l:'列表',icon:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>'},
    {k:'create',l:'发布',icon:'<div class="create-circle"><span>+</span></div>'},
    {k:'profile',l:'我的',icon:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'},
  ];
  return `<div class="tab-bar">
    ${tabs.map(t=>`<button onclick="switchTab('${t.k}')" class="tab-btn ${state.tab===t.k?'active':''} ${t.k==='create'?'create-btn':''}">${t.icon}<span>${t.l}</span></button>`).join('')}
  </div>`;
}

function switchTab(t) {
  if (t === 'create') { state.screen = 'create'; render(); return; }
  state.tab = t;
  renderApp();
}

function getTabContent() {
  if (state.tab === 'list') return renderListContent();
  if (state.tab === 'profile') return renderProfileContent();
  return '';
}

// ============ LIST ============
function renderListContent() {
  const n = state.notes;
  if (!n) return `<div class="flex items-center justify-center h-full text-cloud-dark px-8" style="color:var(--color-cloud-dark)"><div class="w-8 h-8 border-2 border-slate-300 border-t-clay rounded-full animate-spin mr-3" style="border-color:var(--color-slate-200);border-top-color:var(--color-clay)"></div>加载中...</div>`;
  const all = [...n.unlocked, ...n.preview].sort((a,b)=>a.distance-b.distance);
  return `
    <div class="px-4 pt-14 pb-4">
      <div class="flex justify-between items-end mb-6">
        <div>
          <h1 class="headline-2" style="color:var(--color-slate-dark);font-size:1.5rem">附近纸条</h1>
          <p class="detail-s mt-1" style="color:var(--color-slate-light)">${n.summary.unlockedCount} 张可阅读 / ${n.summary.total} 张总数</p>
        </div>
        <div class="flex gap-2">
          <button onclick="loadNearbyNotes()" class="btn-secondary" style="color:var(--color-slate-dark);font-weight:500">刷新</button>
          <button onclick="switchTab('explore')" class="btn-secondary" style="color:var(--color-clay);font-weight:500">地图视图</button>
        </div>
      </div>
      ${all.length ? all.map(note=>renderNoteCard(note)).join('') : `
        <div class="text-center py-20">
          <p class="paragraph-m" style="color:var(--color-cloud-dark)">附近还没有纸条</p>
          <p class="detail-s mt-2" style="color:var(--color-cloud-medium)">去放一个吧</p>
        </div>
      `}
    </div>`;
}

function renderNoteCard(note) {
  const distanceState = getDistanceState(note.distance);
  const isUnlocked = distanceState === 'unlocked' || distanceState === 'near';
  const reveal = getRevealCopy(note);
  const mood = MOODS[note.moodTag];
  const distLabel = isUnlocked ? fmtDist(note.distance) : getDistanceLabel(distanceState, note.distance);
  const distColor = note.distance <= 50 ? 'var(--color-olive)' : note.distance <= 200 ? '#c4a35a' : 'var(--color-cloud-dark)';
  const isFuzzy = reveal.blur !== 'none';
  const authorLabel = note.authorNickname || note.authorCode || '匿名';
  const readCount = Number.isFinite(Number(note.readCount)) ? Number(note.readCount) : 0;
  const replyCount = Number.isFinite(Number(note.replyCount)) ? Number(note.replyCount) : 0;
  const expiresLabel = note.expiresAt ? fmtTime(note.expiresAt) : (distanceState === 'unlocked' ? '刚刚' : distanceState === 'near' ? '走近后可见更多' : '远处纸条');

  return `
    <button onclick="openNote('${note.id}')" class="w-full text-left quote-card mb-3 reveal hover:shadow-sm transition-shadow" style="${note.isRead?'opacity:0.7':''};border-color:var(--color-slate-200)">
      <div class="flex justify-between items-start mb-3">
        <div class="flex items-center gap-2">
          ${mood?`<span class="mood-badge" style="background:${mood.color}18;color:${mood.color}">${mood.label}</span>`:''}
          <span class="detail-s" style="color:var(--color-cloud-dark)">${authorLabel}</span>
        </div>
        <span class="detail-s font-medium" style="color:${distColor}">${distLabel}</span>
      </div>
      ${distanceState !== 'unlocked' ? '<div class="quote-card__mark" style="font-size:1.5rem;color:var(--color-slate-300)">"</div>' : ''}
      <p class="quote-card__text ${distanceState !== 'unlocked' ? 'text-slate-light' : ''}" style="${distanceState !== 'unlocked' ? 'color:var(--color-cloud-medium);font-style:italic' : ''};filter:${reveal.blur};opacity:${reveal.opacity};${isFuzzy ? 'display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;' : ''}">
        ${reveal.text}${reveal.suffix}
      </p>
      ${distanceState !== 'unlocked' ? `<p class="detail-s mt-2 font-medium" style="color:#c4a35a">${reveal.label}</p>` : ''}
      <div class="flex justify-between items-center mt-3">
        <span class="detail-s" style="color:var(--color-cloud-medium)">${expiresLabel}</span>
        <div class="flex gap-3 detail-s" style="color:var(--color-cloud-medium)">
          <span>${readCount} 阅读</span><span>${replyCount} 回复</span>
        </div>
      </div>
    </button>`;
}


// ============ DETAIL ============
async function openNote(id) {
  try {
    const data = await apiPost(`/functions/v1/notes-read/${id}`, { readerLat: state.location.lat, readerLng: state.location.lng });
    if (!data.unlocked) { alert('距离太远：' + data.message); return; }
    state.currentNote = data.note;
    state.replies = data.replies || [];
    state.screen = 'detail';
    render();
  } catch(e) { alert(e.message); }
}

function renderDetail() {
  const n = state.currentNote;
  const mood = MOODS[n.moodTag];
  root.innerHTML = `
    <div class="screen slide-up" style="background:var(--color-ivory-light)">
      <div class="px-5 pt-14 pb-8">
        <button onclick="backToApp()" class="flex items-center gap-1 mb-6 btn-secondary" style="color:var(--color-cloud-dark)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>返回
        </button>

        <div class="reveal">
          <div class="flex justify-between items-start mb-4">
            ${mood?`<span class="mood-badge" style="background:${mood.color}18;color:${mood.color}">${mood.label}</span>`:''}
            <span class="detail-s" style="color:var(--color-cloud-dark)">${fmtTime(n.createdAt)}</span>
          </div>

          <div class="flex items-center gap-2 mb-3">
            <span class="detail-s font-medium flex items-center gap-1" style="color:var(--color-olive)">
              <span class="w-1.5 h-1.5 rounded-full" style="background:var(--color-olive)"></span>${fmtDist(n.distance)}
            </span>
          </div>

          <p class="detail-s mb-1" style="color:var(--color-slate-light)">${n.authorNickname||n.authorCode}</p>

          <div class="quote-card mb-6" style="border:none;background:transparent;padding:0">
            <div class="quote-card__mark">"</div>
            <p class="quote-card__text" style="font-size:clamp(1.125rem,3.5vw,1.375rem);line-height:1.5">${n.content}</p>
          </div>

          <div class="flex gap-4 detail-s mb-8" style="color:var(--color-cloud-dark)">
            <span>${n.readCount} 阅读</span>
            <span>${n.replyCount} 回复</span>
            <span>${n.lifespanType==='permanent'?'永久':n.lifespanType==='24h'?'24小时':'7天'}</span>
          </div>
        </div>

        <h3 class="headline-2 mb-4 reveal" style="font-size:1.125rem;color:var(--color-slate-dark)">回复</h3>
        <div class="reveal">
          ${state.replies.length===0?'<p class="paragraph-m" style="color:var(--color-cloud-medium)">还没有回复</p>':state.replies.map(r=>renderReplyItem(r,0)).join('')}
        </div>

        <div class="mt-6 pt-4 reveal" style="border-top:1px solid var(--color-slate-200)">
          <div class="flex gap-2">
            <input id="replyInput" placeholder="写一条回复..." class="input-field flex-1" style="border-radius:2px">
            <button onclick="sendReply()" class="btn-primary" style="width:auto;padding:0 20px">发送</button>
          </div>
        </div>
      </div>
    </div>`;
  initReveals();
}

function renderReplyItem(r, depth) {
  const indent = depth * 14;
  const borderColor = depth === 0 ? 'var(--color-slate-300)' : 'var(--color-slate-200)';
  return `
    <div class="mb-3" style="margin-left:${indent}px">
      <div class="reply-item" style="border-left-color:${borderColor}">
        <div class="flex justify-between items-center mb-1">
          <span class="detail-s font-medium" style="color:var(--color-slate-light)">${r.author?.nickname||r.author?.anonymous_code||'匿名'}</span>
          <span class="detail-s" style="color:var(--color-cloud-medium);font-size:0.6875rem">${fmtTime(r.createdAt)}</span>
        </div>
        <p class="body-2" style="color:var(--color-slate-medium)">${r.content}</p>
      </div>
      ${(r.children||[]).map(c=>renderReplyItem(c,depth+1)).join('')}
    </div>`;
}

async function sendReply() {
  const input = document.getElementById('replyInput');
  const text = input.value.trim();
  if (!text) return;
  try {
    await apiPost(`/functions/v1/replies/${state.currentNote.id}`, { content: text });
    const data = await apiPost(`/functions/v1/notes-read/${state.currentNote.id}`, { readerLat: state.location.lat, readerLng: state.location.lng });
    state.replies = data.replies || [];
    renderDetail();
  } catch(e) { alert(e.message); }
}

function backToApp() { state.screen = 'app'; state.currentNote = null; render(); }

// ============ CREATE ============
function renderCreate() {
  root.innerHTML = `
    <div class="screen slide-up flex flex-col" style="background:var(--color-ivory-light)">
      <div class="px-5 pt-14 pb-4 flex-1">
        <div class="flex justify-between items-center mb-6">
          <h2 class="headline-2" style="color:var(--color-slate-dark);font-size:1.25rem">放下纸条</h2>
          <button onclick="backToApp()" class="btn-secondary">取消</button>
        </div>

        <textarea id="createContent" rows="6" placeholder="写下你在这里的想法..." class="textarea-field mb-2"></textarea>
        <p class="detail-s text-right mb-6" style="color:var(--color-cloud-medium)" id="charCount">0/500</p>

        <p class="detail-s font-medium mb-3" style="color:var(--color-cloud-dark)">情绪标签</p>
        <div class="flex gap-2 flex-wrap mb-6" id="moodContainer">
          ${Object.entries(MOODS).map(([k,v])=>`<button onclick="pickMood('${k}')" id="mood-${k}" class="px-3 py-1.5 rounded-sm text-xs font-medium transition-all" style="font-family:var(--font-sans);background:var(--color-slate-050);color:var(--color-cloud-dark);border:1px solid transparent">${v.label}</button>`).join('')}
        </div>

        <p class="detail-s font-medium mb-3" style="color:var(--color-cloud-dark)">生命周期</p>
        <div class="flex gap-2 mb-6">
          ${[['24h','24小时'],['7d','7天'],['permanent','永久']].map(([v,l])=>`<button onclick="pickLife('${v}')" id="life-${v}" class="flex-1 py-3 rounded-sm text-sm font-medium transition-all" style="font-family:var(--font-sans);background:var(--color-slate-050);color:var(--color-cloud-dark);border:1px solid transparent">${l}</button>`).join('')}
        </div>

        <div class="quote-card mb-4" style="background:var(--color-slate-050);border-color:var(--color-slate-150)">
          <p class="detail-s text-center" style="color:var(--color-slate-light)">当前位置：{state.location.lat.toFixed(5)}, ${state.location.lng.toFixed(5)}</p>
          <p class="detail-s text-center mt-1" style="color:var(--color-cloud-medium)">纸条将放在这里，50米内的人才能看到</p>
        </div>
      </div>
      <div class="px-5 pb-8 pt-2" style="border-top:1px solid var(--color-slate-200)">
        <button onclick="submitNote()" class="btn-primary">放下纸条</button>
      </div>
    </div>`;
  document.getElementById('createContent').addEventListener('input', function(){
    const el = document.getElementById('charCount');
    if (el) el.textContent = this.value.length+'/500';
  });
}

let createMood = null, createLife = '24h';
function pickMood(k) {
  createMood = createMood===k?null:k;
  Object.keys(MOODS).forEach(m=>{
    const el = document.getElementById('mood-'+m);
    if (!el) return;
    if (m===createMood) {
      el.style.background = MOODS[m].color+'18';
      el.style.color = MOODS[m].color;
      el.style.borderColor = MOODS[m].color;
    } else {
      el.style.background = 'var(--color-slate-050)';
      el.style.color = 'var(--color-cloud-dark)';
      el.style.borderColor = 'transparent';
    }
  });
}

function pickLife(v) {
  createLife = v;
  ['24h','7d','permanent'].forEach(l=>{
    const el = document.getElementById('life-'+l);
    if (!el) return;
    if (l===v) {
      el.style.borderColor = 'var(--color-slate-dark)';
      el.style.background = 'var(--color-slate-100)';
      el.style.color = 'var(--color-slate-dark)';
    } else {
      el.style.borderColor = 'transparent';
      el.style.background = 'var(--color-slate-050)';
      el.style.color = 'var(--color-cloud-dark)';
    }
  });
}

async function submitNote() {
  const content = document.getElementById('createContent').value.trim();
  if (!content) { alert('请输入内容'); return; }
  try {
    await apiPost('/functions/v1/notes-create', { content, lat: state.location.lat, lng: state.location.lng, lifespanType: createLife, moodTag: createMood, topicTags: [] });
    state.notes = null;
    state.screen = 'app';
    state.tab = 'explore';
    render();
    setTimeout(() => loadNearbyNotes(), 300);
  } catch(e) { alert(e.message); }
}

// ============ PROFILE ============
function renderProfileContent() {
  const g = GRADIENTS[state.profile?.avatarGradient||0];
  return `
    <div class="px-5 pt-14 pb-8">
      <div class="flex flex-col items-center mb-8 reveal">
        <div class="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold mb-4" style="background:linear-gradient(135deg,${g[0]},${g[1]})">${(state.profile?.anonymousCode||'?')[0]}</div>
        <h2 class="headline-2" style="color:var(--color-slate-dark);font-size:1.25rem">${state.profile?.anonymousCode}</h2>
        ${state.profile?.nickname?`<p class="paragraph-m mt-1" style="color:var(--color-slate-light)">${state.profile.nickname}</p>`:''}
      </div>
      <div class="flex justify-around quote-card mb-8 reveal" style="padding:var(--sp-20);border-color:var(--color-slate-200)">
        <div class="text-center"><p class="headline-2" style="font-size:1.5rem;color:var(--color-slate-dark)">12</p><p class="detail-s mt-1" style="color:var(--color-cloud-dark)">我放的纸条</p></div>
        <div class="text-center"><p class="headline-2" style="font-size:1.5rem;color:var(--color-slate-dark)">48</p><p class="detail-s mt-1" style="color:var(--color-cloud-dark)">我读的纸条</p></div>
        <div class="text-center"><p class="headline-2" style="font-size:1.5rem;color:var(--color-slate-dark)">156</p><p class="detail-s mt-1" style="color:var(--color-cloud-dark)">收到的回复</p></div>
      </div>
      <div class="space-y-2 reveal">
        <button class="w-full quote-card flex justify-between items-center text-left" style="padding:14px 16px;border-color:var(--color-slate-200)">
          <span class="body-2" style="color:var(--color-slate-dark)">我的纸条</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-cloud-medium)" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
        </button>
        <button class="w-full quote-card flex justify-between items-center text-left" style="padding:14px 16px;border-color:var(--color-slate-200)">
          <span class="body-2" style="color:var(--color-slate-dark)">阅读历史</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-cloud-medium)" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
        </button>
        <button onclick="logout()" class="w-full quote-card text-center mt-4" style="padding:14px 16px;border-color:var(--color-clay);color:var(--color-clay)">
          <span class="body-2 font-medium">退出登录</span>
        </button>
      </div>
    </div>`;
}

function logout() {
  state.profile = null; state.screen = 'welcome';
  if (state.watchId) clearInterval(state.watchId);
  if (state.geoWatchId) navigator.geolocation.clearWatch(state.geoWatchId);
  state.globe = null;
  render();
}

// ============ DATA ============
function updateNoteDistances() {
  if (!state.notes) return;
  [...state.notes.unlocked, ...state.notes.preview].forEach(n => {
    n.distance = distBetween(state.location.lat, state.location.lng, n.lat, n.lng);
  });
}

async function loadNearbyNotes() {
  try {
    const data = await apiPost('/functions/v1/notes-nearby', { lat: state.location.lat, lng: state.location.lng });
    state.notes = data;
    updateNoteDistances();
    state.localMapZoom = computeAdaptiveMapZoom();
    // Refresh globe dots
    if (globeGroup) {
      globeGroup.select("g.dots").remove();
      if (globeProjection) {
        globeProjection = buildLocalProjection(globeProjection.width, globeProjection.height, globeProjection.center, state.localMapZoom || DEFAULT_LOCAL_MAP_ZOOM);
      }
      initGlobeDots();
      centerToNearestDotIfInvisible();
    }
    if (state.screen === 'app') renderApp();
  } catch(e) { console.error(e); }
}

let simWalkInterval = null;
function toggleSimulatedWalk() {
  if (simWalkInterval) {
    clearInterval(simWalkInterval);
    simWalkInterval = null;
    alert('已停止模拟行走');
  } else {
    simWalkInterval = setInterval(() => {
      const drift = 0.00004;
      state.location.lat += (Math.random() - 0.5) * drift * 2;
      state.location.lng += (Math.random() - 0.5) * drift * 2;
      state.location.accuracy = 5 + Math.random() * 8;
      updateNoteDistances();
      updateGpsStatusUI();
      if (state.screen === 'app' && state.tab === 'explore') renderApp();
    }, 1500);
    alert('已开始模拟行走（每1.5秒更新位置）');
  }
}

// ============ INIT ============
render();
