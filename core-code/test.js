

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
const API = location.origin;
async function apiPost(path, body) {
  const r = await fetch(API + path, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) });
  if (!r.ok) { const e = await r.json().catch(()=>({})); throw new Error(e.error||e.message||'Error'); }
  return r.json();
}

// ============ UTILS ============
function fmtDist(m) { return m < 10 ? '近处' : m < 1000 ? Math.round(m)+'米' : (m/1000).toFixed(1)+'公里'; }
function fmtTime(iso) {
  const d = new Date(iso), n = new Date(), diff = Math.floor((n-d)/1000);
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
function initRealLocation() {
  if (!navigator.geolocation) {
    state.locationMode = 'simulated';
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      state.location.lat = pos.coords.latitude;
      state.location.lng = pos.coords.longitude;
      state.location.accuracy = pos.coords.accuracy || 10;
      state.locationMode = 'real';
      if (state.globe) {
        updateGlobeRotation();
        loadNearbyNotes();
      }
    },
    (err) => {
      console.warn('GPS error:', err.message);
      state.locationMode = 'simulated';
      fetch('https://ipapi.co/json/').then(r=>r.json()).then(data=>{
        if (data.latitude && data.longitude) {
          state.location.lat = data.latitude;
          state.location.lng = data.longitude;
          state.location.accuracy = 1000;
          state.locationMode = 'manual';
          if (state.globe) {
            updateGlobeRotation();
            loadNearbyNotes();
          }
        }
      }).catch(()=>{});
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
  );

  state.geoWatchId = navigator.geolocation.watchPosition(
    (pos) => {
      state.location.lat = pos.coords.latitude;
      state.location.lng = pos.coords.longitude;
      state.location.accuracy = pos.coords.accuracy || 10;
      state.locationMode = 'real';
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
  const labels = { real: ['GPS定位中', 'active'], simulated: ['模拟位置', 'simulated'], manual: ['IP定位', 'simulated'] };
  const [text, cls] = labels[mode] || labels.simulated;
  const address = state.currentAddress ? ` · ${state.currentAddress}` : '';
  el.innerHTML = `<div class="gps-badge"><div class="gps-dot ${cls}"><<</div><span class="detail-s" style="color:var(--color-slate-light)">${text}${address}<<</span><<</div>`;
}

let reverseGeoTimeout = null;
function reverseGeocode() {
  const GAODE_KEY = '6404e465242f02ca0d7a140a54bcef3b';
  if (!GAODE_KEY || reverseGeoTimeout) return;
  reverseGeoTimeout = setTimeout(() => { reverseGeoTimeout = null; }, 5000);
  const { lat, lng } = state.location;
  fetch(`https://restapi.amap.com/v3/geocode/regeo?key=${GAODE_KEY}&location=${lng},${lat}&extensions=base`)
    .then(r => r.json())
    .then(data => {
      if (data.status === '1' && data.regeocode) {
        const addr = data.regeocode.formatted_address;
        const parts = addr.split(/[省市县区镇]/);
        const short = parts.filter(p => p.trim()).pop() || addr;
        state.currentAddress = short.substring(0, 12);
        updateGpsStatusUI();
      }
    })
    .catch(() => {});
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
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-clay)" stroke-width="1.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/><</svg>
      <</div>
      <h1 class="display-serif-xl text-center mb-4" style="color:var(--color-slate-dark)">发现身边的秘密</h1>
      <p class="paragraph-m text-center mb-12" style="color:var(--color-slate-light);max-width:280px">每一条街道、每一个角落，都藏着陌生人的故事。走近，才能听见。</p>
      <button onclick="goIdentity()" class="btn-primary" style="max-width:280px">开始探索</button>
      <p class="detail-s mt-6" style="color:var(--color-cloud-medium)">完全匿名 · 无需注册 · 位置仅用于附近查询</p>
    <</div>`;
}

let tempCode = genCode(), tempGradient = 0, tempNickname = '';
function goIdentity() { state.screen = 'identity'; render(); }
function renderIdentity() {
  root.innerHTML = `
    <div class="screen bg-ivory px-6 pt-20 pb-8">
      <h2 class="headline-2 mb-2" style="color:var(--color-slate-dark)">创建你的匿名身份</h2>
      <p class="paragraph-m mb-8" style="color:var(--color-slate-light)">这只是你在 DeadDrop 的代号</p>
      <div class="quote-card mb-4 text-center" style="border:1px solid var(--color-slate-200)">
        <p class="mono-label" style="color:var(--color-slate-dark);font-size:1.125rem" id="codeDisplay">${tempCode}<</p>
      <</div>
      <button onclick="refreshCode()" class="btn-secondary mb-8 mx-auto block" style="color:var(--color-clay)">换一个</button>
      <p class="detail-s font-medium mb-2" style="color:var(--color-cloud-dark)">自定义昵称（可选）<</p>
      <input id="nickInput" value="${tempNickname}" oninput="tempNickname=this.value" placeholder="给自己起个名字" class="input-field mb-8">
      <p class="detail-s font-medium mb-3" style="color:var(--color-cloud-dark)">头像颜色<</p>
      <div class="flex gap-3 flex-wrap mb-auto">
        ${GRADIENTS.map((g,i)=>`<button onclick="pickGradient(${i})" class="w-10 h-10 rounded-full border-2 transition-all" style="background:linear-gradient(135deg,${g[0]},${g[1]});border-color:${i===tempGradient?'var(--color-slate-dark)':'transparent'}"><</button>`).join('')}
      <</div>
      <button onclick="confirmIdentity()" class="btn-primary mt-8" style="max-width:100%">继续<</button>
    <</div>`;
}
function refreshCode() { tempCode = genCode(); const el = document.getElementById('codeDisplay'); if (el) el.textContent = tempCode; }
function pickGradient(i) { tempGradient = i; renderIdentity(); }
function confirmIdentity() {
  state.profile = { anonymousCode: tempCode, nickname: tempNickname || null, avatarGradient: tempGradient };
  state.screen = 'app';
  render();
  setTimeout(() => { initGlobe(); initRealLocation(); updateGpsStatusUI(); reverseGeocode(); }, 100);
}


// ============ GLOBE (D3 Orthographic) ============
let globeProjection = null, globePath = null, globeSvg = null, globeGroup = null;
let globeDots = [], globeDotSel = null, globeHighlightGroup = null;
let globeCountryPaths = null, globeCountries = null;
let globeAutoPlay = true, globeCurrentStory = 0;

async function initGlobe() {
  const container = d3.select("#globe-viz");
  if (container.empty()) { setTimeout(initGlobe, 200); return; }

  const box = container.node().getBoundingClientRect();
  const width = box.width || 430;
  const height = box.height || 350;
  const scale = Math.min(width, height) * 0.42;
  const center = [width / 2, height * 0.55];

  globeSvg = container.append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .style("width", "100%")
    .style("height", "100%")
    .style("display", "block");

  globeProjection = d3.geoOrthographic()
    .scale(scale)
    .translate(center)
    .rotate([-(state.location.lng || 121), -(state.location.lat || 31)])
    .clipAngle(90);

  globePath = d3.geoPath().projection(globeProjection);

  // Clip path
  const defs = globeSvg.append("defs");
  defs.append("clipPath")
    .attr("id", "globe-clip")
    .append("circle")
    .attr("cx", center[0])
    .attr("cy", center[1])
    .attr("r", scale);

  // Outer faint rim
  globeSvg.append("circle")
    .attr("cx", center[0])
    .attr("cy", center[1])
    .attr("r", scale)
    .attr("fill", "none")
    .attr("stroke", "#d1cfc5")
    .attr("stroke-width", 1);

  globeGroup = globeSvg.append("g")
    .attr("clip-path", "url(#globe-clip)");

  // Load world data
  try {
    const world = await d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json");
    globeCountries = topojson.feature(world, world.objects.countries);

    // Graticule
    const graticule = d3.geoGraticule().step([10, 10]);
    globeGroup.append("path")
      .datum(graticule)
      .attr("d", globePath)
      .attr("fill", "none")
      .attr("stroke", "#e8e6dc")
      .attr("stroke-width", 0.6);

    // Country shapes
    globeCountryPaths = globeGroup.append("g")
      .selectAll("path.country")
      .data(globeCountries.features)
      .join("path")
      .attr("class", "country")
      .attr("d", globePath)
      .attr("fill", "transparent")
      .attr("stroke", "#d1cfc5")
      .attr("stroke-width", 0.5);

    // Highlight group
    globeHighlightGroup = globeGroup.append("g").attr("class", "highlight");

    // Init dots from notes
    initGlobeDots();

    // Drag to rotate
    const drag = d3.drag()
      .on("start", () => { globeAutoPlay = false; })
      .on("drag", (event) => {
        const rotate = globeProjection.rotate();
        const k = 0.35;
        globeProjection.rotate([rotate[0] + event.dx * k, rotate[1] - event.dy * k]);
        updateGlobePaths();
      });
    globeSvg.call(drag);

  } catch(e) {
    console.error('Globe init error:', e);
  }
}

function initGlobeDots() {
  if (!state.notes || !globeGroup) return;
  const all = [...(state.notes.unlocked||[]), ...(state.notes.preview||[])];
  globeDots = all.map(note => {
    const mood = MOODS[note.moodTag];
    return {
      lon: note.lng,
      lat: note.lat,
      color: mood ? mood.color : '#788c5d',
      noteId: note.id,
      distance: note.distance
    };
  });

  const dotGroup = globeGroup.append("g").attr("class", "dots");
  globeDotSel = dotGroup.selectAll("circle")
    .data(globeDots)
    .join("circle")
    .attr("r", d => d.distance <= 50 ? 2.5 : 1.8)
    .attr("fill", d => d.color)
    .attr("opacity", 0.85)
    .style("cursor", "pointer")
    .on("click", (event, d) => { event.stopPropagation(); openNote(d.noteId); });

  renderGlobeDots();
}

function renderGlobeDots() {
  if (!globeDotSel || !globeProjection) return;
  const rot = globeProjection.rotate();
  const lambda = rot[0] * Math.PI / 180;
  const phi = rot[1] * Math.PI / 180;
  const cx = Math.cos(phi) * Math.cos(-lambda);
  const cy = Math.cos(phi) * Math.sin(-lambda);
  const cz = Math.sin(phi);

  globeDotSel
    .attr("cx", d => {
      const p = globeProjection([d.lon, d.lat]);
      return p ? p[0] : -999;
    })
    .attr("cy", d => {
      const p = globeProjection([d.lon, d.lat]);
      return p ? p[1] : -999;
    })
    .attr("opacity", d => {
      const lon = d.lon * Math.PI / 180;
      const lat = d.lat * Math.PI / 180;
      const px = Math.cos(lat) * Math.cos(lon);
      const py = Math.cos(lat) * Math.sin(lon);
      const pz = Math.sin(lat);
      const visible = (px * cx + py * cy + pz * cz) > 0.08;
      return visible ? 0.85 : 0;
    });
}

function updateGlobePaths() {
  if (!globeCountryPaths || !globePath) return;
  globeCountryPaths.attr("d", globePath);
  if (globeHighlightGroup) globeHighlightGroup.selectAll("path").attr("d", globePath);
  renderGlobeDots();
}

function updateGlobeRotation() {
  if (!globeProjection) return;
  const targetRotate = [-(state.location.lng || 121), -(state.location.lat || 31)];
  const currentRotate = globeProjection.rotate();
  d3.transition()
    .duration(1200)
    .ease(d3.easeCubicOut)
    .tween("rotate", () => {
      const r = d3.interpolate(currentRotate, targetRotate);
      return t => {
        globeProjection.rotate(r(t));
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
    root.innerHTML = `<div class="screen pb-24" style="background:var(--color-ivory-light)">${renderListContent()}<<</div>${renderTabBar()}`;
  } else {
    root.innerHTML = `<div class="screen pb-24" style="background:var(--color-ivory-light)">${getTabContent()}<<</div>${renderTabBar()}`;
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
        <div id="globe-viz"><</div>
        <div class="globe-overlay">
          ${storyNote ? `
            <div class="reveal">
              <div class="globe-story-country">${MOODS[storyNote.moodTag]?.label || '纸条'}<</div>
              <blockquote class="globe-story-quote">${storyNote.content.substring(0, 60)}${storyNote.content.length > 60 ? '...' : ''}<</blockquote>
              <div class="globe-story-role">${storyNote.authorNickname || storyNote.authorCode} · ${fmtDist(storyNote.distance)}<</div>
            <</div>
          ` : '<div class="globe-story-quote" style="color:var(--color-cloud-medium)">附近暂无纸条<</div>'}
        <</div>
        <!-- GPS Status -->
        <div class="gps-status"><div id="gpsStatus"><</div><</div>
        <!-- Top Info Bar -->
        <div class="absolute top-0 left-0 right-0 z-[500] px-4 pt-12 pb-3" style="background:linear-gradient(to bottom, rgba(250,249,245,0.95), transparent);">
          <div class="flex justify-between items-start">
            <div>
              <h1 class="headline-2" style="color:var(--color-slate-dark);font-size:1.25rem">附近纸条<</h1>
              <p class="detail-s mt-1" style="color:var(--color-slate-light)" id="mapStats">
                ${notes ? `<span style="color:var(--color-olive);font-weight:500">${unlocked.length}<</span> 张可阅读 · <span style="color:#c4a35a;font-weight:500">${preview.length}<</span> 张走近解锁` : '加载中...'
              <</p>
            <</div>
            <div class="flex flex-col items-end gap-2">
              <div class="flex gap-1">
                <button onclick="switchTab('list')" class="map-control-btn" style="width:auto;padding:0 12px;border-radius:2px">
                  <span class="detail-s" style="color:var(--color-slate-light)">列表<</span>
                <</button>
              <</div>
            <</div>
          <</div>
        <</div>
      <</div>

      <!-- Nearby Notes List -->
      <div class="flex-1 overflow-y-auto px-4 pt-4 pb-24" style="background:var(--color-ivory-light)">
        ${all.length === 0 && notes ? '<p class="paragraph-m text-center py-8" style="color:var(--color-cloud-medium)">附近暂无纸条<</p>' : ''}
        ${all.map(note => renderNoteCard(note)).join('')}
        ${distant.map(d=>`
          <div class="quote-card mb-3 flex justify-between items-center" style="background:var(--color-slate-050);border-color:var(--color-slate-150)">
            <div>
              <p class="body-2" style="color:var(--color-slate-medium)">前方有${d.count} 张纸条</p>
              <p class="detail-s mt-1" style="color:var(--color-cloud-medium)">${fmtDist(d.centerDistance)}<</p>
            <</div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-cloud-medium)" stroke-width="2"><path d="M9 18l6-6-6-6"/><</svg>
          <</div>
        `).join('')}
      <</div>

      <!-- Map Controls -->
      <div class="map-controls">
        <button onclick="centerOnUser()" class="map-control-btn" title="定位到我的位置">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-slate-light)" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4"/><</svg>
        <</button>
        <button onclick="loadNearbyNotes()" class="map-control-btn" title="刷新附近纸条">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-slate-light)" stroke-width="2"><path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/><</svg>
        <</button>
      <</div>

      ${renderTabBar()}
    <</div>`;
}

function renderTabBar() {
  const tabs = [
    {k:'explore',l:'地图',icon:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/><</svg>'},
    {k:'list',l:'列表',icon:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/><</svg>'},
    {k:'create',l:'',icon:'<div class="create-circle"><span>+<</span><</div>'},
    {k:'chat',l:'消息',icon:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/><</svg>'},
    {k:'profile',l:'我的',icon:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/><</svg>'},
  ];
  return `<div class="tab-bar">
    ${tabs.map(t=>`<button onclick="switchTab('${t.k}')" class="tab-btn ${state.tab===t.k?'active':''} ${t.k==='create'?'create-btn':''}">${t.icon}<span class="${t.k==='create'?'hidden':''}">${t.l}<</span><</button>`).join('')}
  <</div>`;
}

function switchTab(t) {
  if (t === 'create') { state.screen = 'create'; render(); return; }
  state.tab = t;
  renderApp();
}

function getTabContent() {
  if (state.tab === 'list') return renderListContent();
  if (state.tab === 'chat') return renderChatContent();
  if (state.tab === 'profile') return renderProfileContent();
  return '';
}

// ============ LIST ============
function renderListContent() {
  const n = state.notes;
  if (!n) return `<div class="flex items-center justify-center h-full text-cloud-dark px-8" style="color:var(--color-cloud-dark)"><div class="w-8 h-8 border-2 border-slate-300 border-t-clay rounded-full animate-spin mr-3" style="border-color:var(--color-slate-200);border-top-color:var(--color-clay)"><</div>加载中...<</div>`;
  const all = [...n.unlocked, ...n.preview].sort((a,b)=>a.distance-b.distance);
  return `
    <div class="px-4 pt-14 pb-4">
      <div class="flex justify-between items-end mb-6">
        <div>
          <h1 class="headline-2" style="color:var(--color-slate-dark);font-size:1.5rem">附近纸条<</h1>
          <p class="detail-s mt-1" style="color:var(--color-slate-light)">${n.summary.unlockedCount} 张可阅读 / ${n.summary.total} 张总数<</p>
        <</div>
        <button onclick="switchTab('explore')" class="btn-secondary" style="color:var(--color-clay);font-weight:500">地图视图<</button>
      <</div>
      ${all.map(note=>renderNoteCard(note)).join('')}
      ${n.distant.map(d=>`
        <div class="quote-card mb-3 flex justify-between items-center" style="background:var(--color-slate-050);border-color:var(--color-slate-150)">
          <div>
            <p class="body-2" style="color:var(--color-slate-medium)">前方有${d.count} 张纸条</p>
            <p class="detail-s mt-1" style="color:var(--color-cloud-medium)">${fmtDist(d.centerDistance)}<</p>
          <</div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-cloud-medium)" stroke-width="2"><path d="M9 18l6-6-6-6"/><</svg>
        <</div>
      `).join('')}
    <</div>`;
}

function renderNoteCard(note) {
  const isUnlocked = note.distance <= 50;
  const mood = MOODS[note.moodTag];
  const distLabel = note.distance <= 50 ? '已解锁' : note.distance <= 200 ? `还需走近 ${Math.max(1,Math.round(note.distance-50))} 米` : `${fmtDist(note.distance)}`;
  const distColor = note.distance <= 50 ? 'var(--color-olive)' : note.distance <= 200 ? '#c4a35a' : 'var(--color-cloud-dark)';

  return `
    <button onclick="openNote('${note.id}')" class="w-full text-left quote-card mb-3 reveal hover:shadow-sm transition-shadow" style="${note.isRead?'opacity:0.7':''};border-color:var(--color-slate-200)">
      <div class="flex justify-between items-start mb-3">
        <div class="flex items-center gap-2">
          ${mood?`<span class="mood-badge" style="background:${mood.color}18;color:${mood.color}">${mood.label}<</span>`:''}
          <span class="detail-s" style="color:var(--color-cloud-dark)">${note.authorNickname||note.authorCode}<</span>
        <</div>
        <span class="detail-s font-medium" style="color:${distColor}">${distLabel}<</span>
      <</div>
      ${!isUnlocked?'<div class="quote-card__mark" style="font-size:1.5rem;color:var(--color-slate-300)">"<</div>':''}
      <p class="quote-card__text ${!isUnlocked?'text-slate-light':''}" style="${!isUnlocked?'color:var(--color-cloud-medium);font-style:italic':''}">
        ${isUnlocked?note.content:note.contentPreview+'...'}
      <</p>
      ${!isUnlocked?`<p class="detail-s mt-2 font-medium" style="color:#c4a35a">${distLabel}<</p>`:''}
      <div class="flex justify-between items-center mt-3">
        <span class="detail-s" style="color:var(--color-cloud-medium)">${fmtTime(note.expiresAt)}<</span>
        <div class="flex gap-3 detail-s" style="color:var(--color-cloud-medium)">
          <span>${note.readCount} 阅读<</span><span>${note.replyCount} 回复<</span>
        <</div>
      <</div>
    <</button>`;
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
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/><</svg>返回
        <</button>

        <div class="reveal">
          <div class="flex justify-between items-start mb-4">
            ${mood?`<span class="mood-badge" style="background:${mood.color}18;color:${mood.color}">${mood.label}<</span>`:''}
            <span class="detail-s" style="color:var(--color-cloud-dark)">${fmtTime(n.createdAt)}<</span>
          <</div>

          <div class="flex items-center gap-2 mb-3">
            <span class="detail-s font-medium flex items-center gap-1" style="color:var(--color-olive)">
              <span class="w-1.5 h-1.5 rounded-full" style="background:var(--color-olive)"><</span>${fmtDist(n.distance)}
            <</span>
          <</div>

          <p class="detail-s mb-1" style="color:var(--color-slate-light)">${n.authorNickname||n.authorCode}<</p>

          <div class="quote-card mb-6" style="border:none;background:transparent;padding:0">
            <div class="quote-card__mark">"<</div>
            <p class="quote-card__text" style="font-size:clamp(1.125rem,3.5vw,1.375rem);line-height:1.5">${n.content}<</p>
          <</div>

          <div class="flex gap-4 detail-s mb-8" style="color:var(--color-cloud-dark)">
            <span>${n.readCount} 阅读<</span>
            <span>${n.replyCount} 回复<</span>
            <span>${n.lifespanType==='permanent'?'永久':n.lifespanType==='24h'?'24小时':'7天'}<</span>
          <</div>
        <</div>

        <h3 class="headline-2 mb-4 reveal" style="font-size:1.125rem;color:var(--color-slate-dark)">回复</h3>
        <div class="reveal">
          ${state.replies.length===0?'<p class="paragraph-m" style="color:var(--color-cloud-medium)">还没有回复</p>':state.replies.map(r=>renderReplyItem(r,0)).join('')}
        <</div>

        <div class="mt-6 pt-4 reveal" style="border-top:1px solid var(--color-slate-200)">
          <div class="flex gap-2">
            <input id="replyInput" placeholder="写一条回复..." class="input-field flex-1" style="border-radius:2px">
            <button onclick="sendReply()" class="btn-primary" style="width:auto;padding:0 20px">发送</button>
          <</div>
        <</div>
      <</div>
    <</div>`;
  initReveals();
}

function renderReplyItem(r, depth) {
  const indent = depth * 14;
  const borderColor = depth === 0 ? 'var(--color-slate-300)' : 'var(--color-slate-200)';
  return `
    <div class="mb-3" style="margin-left:${indent}px">
      <div class="reply-item" style="border-left-color:${borderColor}">
        <div class="flex justify-between items-center mb-1">
          <span class="detail-s font-medium" style="color:var(--color-slate-light)">${r.author?.nickname||r.author?.anonymous_code||'匿名'}<</span>
          <span class="detail-s" style="color:var(--color-cloud-medium);font-size:0.6875rem">${fmtTime(r.createdAt)}<</span>
        <</div>
        <p class="body-2" style="color:var(--color-slate-medium)">${r.content}<</p>
      <</div>
      ${(r.children||[]).map(c=>renderReplyItem(c,depth+1)).join('')}
    <</div>`;
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
          <button onclick="backToApp()" class="btn-secondary">取消<</button>
        <</div>

        <textarea id="createContent" rows="6" placeholder="写下你在这里的想法..." class="textarea-field mb-2"></textarea>
        <p class="detail-s text-right mb-6" style="color:var(--color-cloud-medium)" id="charCount">0/500<</p>

        <p class="detail-s font-medium mb-3" style="color:var(--color-cloud-dark)">情绪标签<</p>
        <div class="flex gap-2 flex-wrap mb-6" id="moodContainer">
          ${Object.entries(MOODS).map(([k,v])=>`<button onclick="pickMood('${k}')" id="mood-${k}" class="px-3 py-1.5 rounded-sm text-xs font-medium transition-all" style="font-family:var(--font-sans);background:var(--color-slate-050);color:var(--color-cloud-dark);border:1px solid transparent">${v.label}<</button>`).join('')}
        <</div>

        <p class="detail-s font-medium mb-3" style="color:var(--color-cloud-dark)">生命周期<</p>
        <div class="flex gap-2 mb-6">
          ${[['24h','24小时'],['7d','7天'],['permanent','永久']].map(([v,l])=>`<button onclick="pickLife('${v}')" id="life-${v}" class="flex-1 py-3 rounded-sm text-sm font-medium transition-all" style="font-family:var(--font-sans);background:var(--color-slate-050);color:var(--color-cloud-dark);border:1px solid transparent">${l}<</button>`).join('')}
        <</div>

        <div class="quote-card mb-4" style="background:var(--color-slate-050);border-color:var(--color-slate-150)">
          <p class="detail-s text-center" style="color:var(--color-slate-light)">当前位置：{state.location.lat.toFixed(5)}, ${state.location.lng.toFixed(5)}<</p>
          <p class="detail-s text-center mt-1" style="color:var(--color-cloud-medium)">纸条将放在这里，50米内的人才能看到<</p>
        <</div>
      <</div>
      <div class="px-5 pb-8 pt-2" style="border-top:1px solid var(--color-slate-200)">
        <button onclick="submitNote()" class="btn-primary">放下纸条<</button>
      <</div>
    <</div>`;
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

// ============ CHAT ============
function renderChatContent() {
  return `
    <div class="px-5 pt-14">
      <h1 class="headline-2 mb-6" style="color:var(--color-slate-dark);font-size:1.5rem">消息<</h1>
      <div class="flex items-center gap-3 py-3 reveal" style="border-bottom:1px solid var(--color-slate-200)">
        <div class="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold" style="background:linear-gradient(135deg,var(--color-olive),#5a6b44)">孤<</div>
        <div class="flex-1">
          <p class="body-2 font-medium" style="color:var(--color-slate-dark)">孤独的美食家_2847<</p>
          <p class="detail-s mt-0.5" style="color:var(--color-cloud-dark)">有人回复了你的纸条</p>
        <</div>
        <span class="detail-s" style="color:var(--color-cloud-medium)">2分钟前</span>
        <div class="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold" style="background:var(--color-clay)">1<</div>
      <</div>
      <div class="flex items-center gap-3 py-3 reveal" style="border-bottom:1px solid var(--color-slate-200)">
        <div class="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold" style="background:linear-gradient(135deg,#6a9bcc,#4a7aab)">孤<</div>
        <div class="flex-1">
          <p class="body-2 font-medium" style="color:var(--color-slate-dark)">深夜的失眠者_9301<</p>
          <p class="detail-s mt-0.5" style="color:var(--color-cloud-dark)">外滩的夜景确实很美</p>
        <</div>
        <span class="detail-s" style="color:var(--color-cloud-medium)">1小时前</span>
      <</div>
    <</div>`;
}

// ============ PROFILE ============
function renderProfileContent() {
  const g = GRADIENTS[state.profile?.avatarGradient||0];
  return `
    <div class="px-5 pt-14 pb-8">
      <div class="flex flex-col items-center mb-8 reveal">
        <div class="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold mb-4" style="background:linear-gradient(135deg,${g[0]},${g[1]})">${(state.profile?.anonymousCode||'?')[0]}<</div>
        <h2 class="headline-2" style="color:var(--color-slate-dark);font-size:1.25rem">${state.profile?.anonymousCode}</h2>
        ${state.profile?.nickname?`<p class="paragraph-m mt-1" style="color:var(--color-slate-light)">${state.profile.nickname}<</p>`:''}
      <</div>
      <div class="flex justify-around quote-card mb-8 reveal" style="padding:var(--sp-20);border-color:var(--color-slate-200)">
        <div class="text-center"><p class="headline-2" style="font-size:1.5rem;color:var(--color-slate-dark)">12<</p><p class="detail-s mt-1" style="color:var(--color-cloud-dark)">我放的纸条</p><</div>
        <div class="text-center"><p class="headline-2" style="font-size:1.5rem;color:var(--color-slate-dark)">48<</p><p class="detail-s mt-1" style="color:var(--color-cloud-dark)">我读的纸条</p><</div>
        <div class="text-center"><p class="headline-2" style="font-size:1.5rem;color:var(--color-slate-dark)">156<</p><p class="detail-s mt-1" style="color:var(--color-cloud-dark)">收到的回复</p><</div>
      <</div>
      <div class="space-y-2 reveal">
        <button class="w-full quote-card flex justify-between items-center text-left" style="padding:14px 16px;border-color:var(--color-slate-200)">
          <span class="body-2" style="color:var(--color-slate-dark)">我的纸条<</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-cloud-medium)" stroke-width="2"><path d="M9 18l6-6-6-6"/><</svg>
        <</button>
        <button class="w-full quote-card flex justify-between items-center text-left" style="padding:14px 16px;border-color:var(--color-slate-200)">
          <span class="body-2" style="color:var(--color-slate-dark)">阅读历史<</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-cloud-medium)" stroke-width="2"><path d="M9 18l6-6-6-6"/><</svg>
        <</button>
        <button onclick="logout()" class="w-full quote-card text-center mt-4" style="padding:14px 16px;border-color:var(--color-clay);color:var(--color-clay)">
          <span class="body-2 font-medium">退出登录</span>
        <</button>
      <</div>
    <</div>`;
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
    // Refresh globe dots
    if (globeGroup) {
      globeGroup.select("g.dots").remove();
      initGlobeDots();
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
