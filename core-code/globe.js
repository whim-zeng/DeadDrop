/* =========================================================
   ScrollIntroGlobe — Anthropic Hero Background Earth
   Orthographic projection + dot cloud + story carousel
   ========================================================= */

(async function() {
  const container = d3.select("#globe-viz");
  if (container.empty()) return;

  const width = 1400;
  const height = 1000;
  const scale = 520;
  const center = [width / 2, height / 2];

  const svg = container
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .style("width", "100%")
    .style("height", "auto")
    .style("display", "block");

  // ─── Projection ───
  const projection = d3.geoOrthographic()
    .scale(scale)
    .translate(center)
    .rotate([-20, -15]) // Initial rotation showing Europe/Africa/Asia
    .clipAngle(90);

  const path = d3.geoPath().projection(projection);

  // ─── Clip path for perfect circle ───
  const defs = svg.append("defs");
  defs.append("clipPath")
    .attr("id", "globe-clip")
    .append("circle")
    .attr("cx", center[0])
    .attr("cy", center[1])
    .attr("r", scale);

  // Outer faint rim
  svg.append("circle")
    .attr("cx", center[0])
    .attr("cy", center[1])
    .attr("r", scale)
    .attr("fill", "none")
    .attr("stroke", "#d1cfc5")
    .attr("stroke-width", 1);

  const globeGroup = svg.append("g")
    .attr("clip-path", "url(#globe-clip)");

  // ─── Load data ───
  const world = await d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json");
  const countries = topojson.feature(world, world.objects.countries);

  // ─── Graticule ───
  const graticule = d3.geoGraticule().step([10, 10]);
  globeGroup.append("path")
    .datum(graticule)
    .attr("d", path)
    .attr("fill", "none")
    .attr("stroke", "#e8e6dc")
    .attr("stroke-width", 0.6);

  // ─── Country shapes (extremely subtle fill, faint stroke) ───
  const countryPaths = globeGroup.append("g")
    .selectAll("path.country")
    .data(countries.features)
    .join("path")
    .attr("class", "country")
    .attr("d", path)
    .attr("fill", "transparent")
    .attr("stroke", "#d1cfc5")
    .attr("stroke-width", 0.5);

  // ─── Dot cloud ───
  // Generate ~4000 dots representing ~16000 respondents (each dot = 4)
  // Color: 50% green (hope), 50% blue (alarm)
  const dotColors = { hope: "#788c5d", alarm: "#6a9bcc" };

  // Approximate respondent allocation by major countries
  const countryWeights = [
    { name: "United States", id: 840, n: 2800 },
    { name: "India", id: 356, n: 1800 },
    { name: "United Kingdom", id: 826, n: 1200 },
    { name: "Germany", id: 276, n: 900 },
    { name: "Brazil", id: 76, n: 700 },
    { name: "China", id: 156, n: 600 },
    { name: "Nigeria", id: 566, n: 550 },
    { name: "Japan", id: 392, n: 500 },
    { name: "France", id: 250, n: 480 },
    { name: "Canada", id: 124, n: 420 },
    { name: "Australia", id: 36, n: 380 },
    { name: "Mexico", id: 484, n: 350 },
    { name: "Indonesia", id: 360, n: 320 },
    { name: "Philippines", id: 608, n: 300 },
    { name: "Pakistan", id: 586, n: 280 },
    { name: "South Africa", id: 710, n: 260 },
    { name: "Italy", id: 380, n: 240 },
    { name: "Spain", id: 724, n: 220 },
    { name: "Egypt", id: 818, n: 210 },
    { name: "Bangladesh", id: 50, n: 200 },
    { name: "Argentina", id: 32, n: 190 },
    { name: "Poland", id: 616, n: 180 },
    { name: "Ukraine", id: 804, n: 170 },
    { name: "Colombia", id: 170, n: 160 },
    { name: "Turkey", id: 792, n: 150 },
    { name: "Israel", id: 376, n: 140 },
    { name: "South Korea", id: 410, n: 130 },
    { name: "Thailand", id: 764, n: 125 },
    { name: "Chile", id: 152, n: 120 },
    { name: "Netherlands", id: 528, n: 115 },
    { name: "Vietnam", id: 704, n: 110 },
    { name: "Kenya", id: 404, n: 105 },
    { name: "Cameroon", id: 120, n: 70 },
    { name: "Honduras", id: 340, n: 60 },
    { name: "Denmark", id: 208, n: 90 },
    { name: "Hungary", id: 348, n: 85 },
    { name: "Sweden", id: 752, n: 80 },
    { name: "Peru", id: 604, n: 95 },
    { name: "Morocco", id: 504, n: 88 },
    { name: "Algeria", id: 12, n: 72 },
    { name: "Mongolia", id: 496, n: 15 }
  ];

  // Build lookup
  const countryById = new Map(countries.features.map(c => [c.id, c]));

  function randomPointInBBox(bbox) {
    const lon = bbox[0] + Math.random() * (bbox[2] - bbox[0]);
    const lat = bbox[1] + Math.random() * (bbox[3] - bbox[1]);
    return [lon, lat];
  }

  const dots = [];
  countryWeights.forEach(cw => {
    const feat = countryById.get(cw.id);
    if (!feat) return;
    const bbox = d3.geoBounds(feat);
    // Generate points roughly within the country's bbox
    // Simplified: accept if within bbox (some may fall outside actual shape, but ok for visual density)
    const numDots = Math.ceil(cw.n / 4);
    for (let i = 0; i < numDots; i++) {
      const pt = randomPointInBBox(bbox);
      // Jitter toward centroid for better clustering
      const centroid = d3.geoCentroid(feat);
      const jitter = 0.25;
      const lon = pt[0] * (1 - jitter) + centroid[0] * jitter + (Math.random() - 0.5) * 3;
      const lat = pt[1] * (1 - jitter) + centroid[1] * jitter + (Math.random() - 0.5) * 3;
      dots.push({
        lon, lat,
        type: Math.random() > 0.5 ? "hope" : "alarm",
        countryId: cw.id,
        countryName: cw.name
      });
    }
  });

  // Render dots
  const dotGroup = globeGroup.append("g").attr("class", "dots");

  // Pre-project all dots and create circles once
  const dotSel = dotGroup.selectAll("circle")
    .data(dots)
    .join("circle")
    .attr("r", 1.1)
    .attr("fill", d => dotColors[d.type]);

  function renderDots() {
    const rot = projection.rotate();
    // Back-face culling: build a rough visible-hemisphere check
    // For orthographic, a point is visible if dot product with rotation axis > 0
    const lambda = rot[0] * Math.PI / 180;
    const phi = rot[1] * Math.PI / 180;
    const cx = Math.cos(phi) * Math.cos(-lambda);
    const cy = Math.cos(phi) * Math.sin(-lambda);
    const cz = Math.sin(phi);

    dotSel
      .attr("cx", d => {
        const p = projection([d.lon, d.lat]);
        return p ? p[0] : -999;
      })
      .attr("cy", d => {
        const p = projection([d.lon, d.lat]);
        return p ? p[1] : -999;
      })
      .attr("opacity", d => {
        const lon = d.lon * Math.PI / 180;
        const lat = d.lat * Math.PI / 180;
        const px = Math.cos(lat) * Math.cos(lon);
        const py = Math.cos(lat) * Math.sin(lon);
        const pz = Math.sin(lat);
        const visible = (px * cx + py * cy + pz * cz) > 0.05;
        return visible ? 0.8 : 0;
      });
  }

  renderDots();

  // ─── Country Highlight ───
  const highlightGroup = globeGroup.append("g").attr("class", "highlight");

  function highlightCountry(countryId) {
    const feat = countryById.get(countryId);
    if (!feat) return;

    highlightGroup.selectAll("*").remove();

    // Draw filled country in clay/gold
    highlightGroup.append("path")
      .datum(feat)
      .attr("d", path)
      .attr("fill", "#d97757")
      .attr("opacity", 0.35)
      .attr("stroke", "#d97757")
      .attr("stroke-width", 1.5);
  }

  // ─── Stories / Carousel ───
  const stories = [
    { countryId: 840, country: "United States", quote: "Claude put the historical pieces together, leading to my proper diagnosis after being misdiagnosed for over 9 years.", role: "Freelancer" },
    { countryId: 566, country: "Nigeria", quote: "I live hand to mouth, zero savings. If I use AI smarter, it may help me craft solutions to that cycle.", role: "Entrepreneur" },
    { countryId: 124, country: "Canada", quote: "I got laid off from my job in May because my company wanted to replace me with an AI system.", role: "Technical Support Specialist" },
    { countryId: 12, country: "Algeria", quote: "I think I can even start a business alone and my partner will be AI.", role: "Entrepreneur" },
    { countryId: 208, country: "Denmark", quote: "If AI truly handled the mental load… it would give me back something priceless: undivided attention.", role: "Manager/executive" },
    { countryId: 376, country: "Israel", quote: "I use AI to review contracts, save time... and at the same time I fear: am I losing my ability to read by myself? Thinking was the last frontier.", role: "LAWYER" },
    { countryId: 410, country: "South Korea", quote: "Humanity has never dealt with something smarter than itself. We need to reflect on how to prepare for the AI age.", role: "SOFTWARE ENGINEER" },
    { countryId: 76, country: "Brazil", quote: "With AI support I can now leave work on time to pick up my kids from school, feed them, and play with them.", role: "Software engineer" },
    { countryId: 356, country: "India", quote: "I developed a phobia for maths from doing so badly in school... Now I sit with AI, get paragraphs translated into simple English.", role: "Lawyer" },
    { countryId: 156, country: "China", quote: "AI should be cleaning windows and emptying the dishwasher so I can paint and write poetry.", role: "Artist" },
    { countryId: 32, country: "Argentina", quote: "With AI I can be more efficient at work... last Tuesday it allowed me to cook with my mother instead of finishing tasks.", role: "White collar worker" },
    { countryId: 496, country: "Mongolia", quote: "15 respondents", role: "" }
  ];

  let currentStory = 0;
  let isAutoPlaying = true;

  // Country centroids for rotation targets
  const countryCentroids = new Map();
  countryWeights.forEach(cw => {
    const feat = countryById.get(cw.id);
    if (feat) countryCentroids.set(cw.id, d3.geoCentroid(feat));
  });

  // ─── Auto rotation ───
  function rotateToCountry(countryId, duration = 1200) {
    const centroid = countryCentroids.get(countryId);
    if (!centroid) return Promise.resolve();

    const targetRotate = [-centroid[0], -centroid[1]];
    const currentRotate = projection.rotate();

    // Interpolate rotation
    return new Promise(resolve => {
      d3.transition()
        .duration(duration)
        .ease(d3.easeCubicOut)
        .tween("rotate", () => {
          const r = d3.interpolate(currentRotate, targetRotate);
          return t => {
            projection.rotate(r(t));
            countryPaths.attr("d", path);
            highlightGroup.selectAll("path").attr("d", path);
            globeGroup.select("path:first-child").attr("d", path);
            renderDots();
          };
        })
        .on("end", resolve);
    });
  }

  // ─── DOM UI updates ───
  const storyCountryEl = document.getElementById("globe-story-country");
  const storyQuoteEl = document.getElementById("globe-story-quote");
  const storyRoleEl = document.getElementById("globe-story-role");
  const dotsNav = document.getElementById("globe-dots");

  if (dotsNav) {
    stories.forEach((_, i) => {
      const btn = document.createElement("button");
      btn.className = "globe-dot" + (i === 0 ? " is-active" : "");
      btn.setAttribute("aria-label", `Story ${i + 1}`);
      btn.addEventListener("click", () => goToStory(i));
      dotsNav.appendChild(btn);
    });
  }

  function typewriter(el, text, speed = 30) {
    el.textContent = "";
    el.style.opacity = 1;
    let i = 0;
    function step() {
      if (i < text.length) {
        el.textContent += text.charAt(i);
        i++;
        setTimeout(step, speed);
      }
    }
    step();
  }

  async function goToStory(index) {
    currentStory = index;
    const s = stories[index];

    // Update dots
    if (dotsNav) {
      Array.from(dotsNav.children).forEach((btn, i) => {
        btn.classList.toggle("is-active", i === index);
      });
    }

    // Rotate globe
    highlightCountry(s.countryId);
    await rotateToCountry(s.countryId);

    // Update text
    if (storyCountryEl) storyCountryEl.textContent = s.country.toUpperCase();
    if (storyQuoteEl) typewriter(storyQuoteEl, s.quote);
    if (storyRoleEl) storyRoleEl.textContent = s.role ? `${s.role}, ${s.country}` : "";
  }

  // Auto-play loop
  async function autoPlay() {
    if (!isAutoPlaying) return;
    await goToStory(currentStory);
    await new Promise(r => setTimeout(r, 4000));
    currentStory = (currentStory + 1) % stories.length;
    autoPlay();
  }

  // Start after a brief delay
  setTimeout(autoPlay, 1000);

  // Drag to rotate (manual override pauses auto-play)
  let isDragging = false;
  const drag = d3.drag()
    .on("start", () => { isDragging = true; isAutoPlaying = false; })
    .on("drag", (event) => {
      const rotate = projection.rotate();
      const k = 0.25;
      projection.rotate([rotate[0] + event.dx * k, rotate[1] - event.dy * k]);
      countryPaths.attr("d", path);
      highlightGroup.selectAll("path").attr("d", path);
      globeGroup.select("path:first-child").attr("d", path);
      renderDots();
    })
    .on("end", () => { isDragging = false; });

  svg.call(drag);

  // Jump to story button
  const jumpBtn = document.getElementById("globe-jump-btn");
  if (jumpBtn) {
    jumpBtn.addEventListener("click", () => {
      const s = stories[currentStory];
      // Try to find the corresponding quote in the page and scroll to it
      const quoteText = s.quote.substring(0, 30);
      const elements = Array.from(document.querySelectorAll("p, blockquote"));
      const target = elements.find(el => el.textContent.includes(quoteText));
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });
  }
})();
