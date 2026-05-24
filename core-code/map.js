/* =========================================================
   World Bubble Map — Anthropic 81k Interviews Replica
   Uses D3.js + TopoJSON + Natural Earth projection
   ========================================================= */

(async function() {
  const container = d3.select("#map-viz");
  const containerNode = container.node();
  if (!containerNode) return;

  const width = 960;
  const height = 500;

  const svg = container
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .style("width", "100%")
    .style("height", "auto")
    .style("display", "block");

  // Natural Earth projection — balanced area/shape for global data
  const projection = d3.geoNaturalEarth1()
    .scale(170)
    .translate([width / 2, height / 2]);

  const path = d3.geoPath().projection(projection);

  // Graticule (subtle lat/lon grid like original)
  const graticule = d3.geoGraticule();
  svg.append("path")
    .datum(graticule)
    .attr("d", path)
    .attr("fill", "none")
    .attr("stroke", "#e8e6dc")
    .attr("stroke-width", 0.5);

  // Load world atlas
  const world = await d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json");
  const countries = topojson.feature(world, world.objects.countries);

  // Draw country basemap (very subtle)
  svg.append("g")
    .selectAll("path.country")
    .data(countries.features)
    .join("path")
    .attr("class", "country")
    .attr("d", path)
    .attr("fill", "#f0eee6")
    .attr("stroke", "#faf9f5")
    .attr("stroke-width", 0.6);

  // Simulated dataset based on article trends:
  // - Lower/middle income countries → higher positive sentiment (green)
  // - Wealthy/Western regions → lower positive sentiment (blue)
  // - Bubble size ~ respondent count (approximate relative scale)
  const data = [
    { name: "United States",        lat: 37.09,  lon: -95.71, sentiment: 65, n: 12000 },
    { name: "India",                lat: 20.59,  lon: 78.96,  sentiment: 81, n: 8500  },
    { name: "United Kingdom",       lat: 55.38,  lon: -3.44,  sentiment: 66, n: 6200  },
    { name: "Germany",              lat: 51.17,  lon: 10.45,  sentiment: 67, n: 4500  },
    { name: "Brazil",               lat: -14.23, lon: -51.93, sentiment: 79, n: 3800  },
    { name: "China",                lat: 35.86,  lon: 104.19, sentiment: 75, n: 3200  },
    { name: "Nigeria",              lat: 9.08,   lon: 8.68,   sentiment: 82, n: 2800  },
    { name: "Japan",                lat: 36.20,  lon: 138.25, sentiment: 68, n: 2400  },
    { name: "France",               lat: 46.23,  lon: 2.21,   sentiment: 66, n: 2300  },
    { name: "Canada",               lat: 56.13,  lon: -106.35,sentiment: 68, n: 2100  },
    { name: "Australia",            lat: -25.27, lon: 133.78, sentiment: 70, n: 1900  },
    { name: "Mexico",               lat: 23.63,  lon: -102.55,sentiment: 80, n: 1800  },
    { name: "Indonesia",            lat: -0.79,  lon: 113.92, sentiment: 78, n: 1600  },
    { name: "Philippines",          lat: 12.88,  lon: 121.77, sentiment: 82, n: 1500  },
    { name: "Pakistan",             lat: 30.38,  lon: 69.34,  sentiment: 80, n: 1400  },
    { name: "South Africa",         lat: -30.56, lon: 22.94,  sentiment: 74, n: 1300  },
    { name: "Italy",                lat: 41.87,  lon: 12.57,  sentiment: 64, n: 1200  },
    { name: "Spain",                lat: 40.46,  lon: -3.75,  sentiment: 65, n: 1100  },
    { name: "Egypt",                lat: 26.82,  lon: 30.80,  sentiment: 76, n: 1050  },
    { name: "Bangladesh",           lat: 23.68,  lon: 90.36,  sentiment: 81, n: 1000  },
    { name: "Argentina",            lat: -38.42, lon: -63.62, sentiment: 78, n: 950   },
    { name: "Poland",               lat: 51.92,  lon: 19.15,  sentiment: 69, n: 900   },
    { name: "Ukraine",              lat: 48.38,  lon: 31.17,  sentiment: 73, n: 850   },
    { name: "Colombia",             lat: 4.57,   lon: -74.30, sentiment: 80, n: 820   },
    { name: "Turkey",               lat: 38.96,  lon: 35.24,  sentiment: 75, n: 800   },
    { name: "Israel",               lat: 31.05,  lon: 34.85,  sentiment: 72, n: 780   },
    { name: "South Korea",          lat: 35.91,  lon: 127.77, sentiment: 68, n: 760   },
    { name: "Thailand",             lat: 15.87,  lon: 100.99, sentiment: 76, n: 720   },
    { name: "Chile",                lat: -35.68, lon: -71.54, sentiment: 77, n: 700   },
    { name: "Netherlands",          lat: 52.13,  lon: 5.29,   sentiment: 63, n: 680   },
    { name: "Vietnam",              lat: 14.06,  lon: 108.28, sentiment: 77, n: 650   },
    { name: "Kenya",                lat: -0.02,  lon: 37.91,  sentiment: 78, n: 620   },
    { name: "Cameroon",             lat: 7.37,   lon: 12.35,  sentiment: 84, n: 400   },
    { name: "Honduras",             lat: 15.20,  lon: -86.24, sentiment: 83, n: 350   },
    { name: "Denmark",              lat: 56.26,  lon: 9.50,   sentiment: 76, n: 500   },
    { name: "Hungary",              lat: 47.16,  lon: 19.50,  sentiment: 78, n: 480   },
    { name: "Sweden",               lat: 60.13,  lon: 18.64,  sentiment: 64, n: 550   },
    { name: "Peru",                 lat: -9.19,  lon: -75.02, sentiment: 79, n: 600   },
    { name: "Morocco",              lat: 31.79,  lon: -7.09,  sentiment: 76, n: 520   }
  ];

  // Color scale: low sentiment = blue (sky), high sentiment = green (olive)
  const colorScale = d3.scaleLinear()
    .domain([60, 72, 85])
    .range(["#6a9bcc", "#bcd1ca", "#788c5d"])
    .clamp(true);

  // Size scale based on respondent count
  const sizeScale = d3.scaleSqrt()
    .domain([0, 13000])
    .range([2.5, 28]);

  // Tooltip
  const tooltip = d3.select("body")
    .append("div")
    .attr("class", "map-tooltip")
    .style("position", "absolute")
    .style("visibility", "hidden")
    .style("background", "#141413")
    .style("color", "#faf9f5")
    .style("padding", "10px 14px")
    .style("border-radius", "2px")
    .style("font-family", "'Inter', sans-serif")
    .style("font-size", "13px")
    .style("line-height", "1.4")
    .style("pointer-events", "none")
    .style("z-index", "1000")
    .style("opacity", 0)
    .style("transition", "opacity 0.15s ease-out");

  // Draw bubbles
  const bubbleGroup = svg.append("g").attr("class", "bubbles");

  const bubbles = bubbleGroup
    .selectAll("circle")
    .data(data)
    .join("circle")
    .attr("cx", d => projection([d.lon, d.lat])[0])
    .attr("cy", d => projection([d.lon, d.lat])[1])
    .attr("r", 0)
    .attr("fill", d => colorScale(d.sentiment))
    .attr("opacity", 0.9)
    .attr("stroke", "#faf9f5")
    .attr("stroke-width", 1)
    .style("cursor", "pointer");

  // Entrance animation
  bubbles.transition()
    .duration(900)
    .delay((d, i) => i * 30)
    .ease(d3.easeCubicOut)
    .attr("r", d => sizeScale(d.n));

  // Hover interactions
  bubbles
    .on("mouseenter", function(event, d) {
      d3.select(this)
        .transition().duration(150)
        .attr("r", sizeScale(d.n) * 1.25)
        .attr("opacity", 1)
        .attr("stroke-width", 2);

      tooltip.style("visibility", "visible").style("opacity", 1);
      tooltip.html(`
        <div style="font-weight:600;margin-bottom:2px">${d.name}</div>
        <div>Positive sentiment: <span style="color:#bcd1ca;font-weight:500">${d.sentiment}%</span></div>
        <div style="color:#b0aea5;margin-top:2px">${d.n.toLocaleString()} respondents</div>
      `);
    })
    .on("mousemove", function(event) {
      tooltip
        .style("left", (event.pageX + 14) + "px")
        .style("top", (event.pageY - 10) + "px");
    })
    .on("mouseleave", function(event, d) {
      d3.select(this)
        .transition().duration(150)
        .attr("r", sizeScale(d.n))
        .attr("opacity", 0.9)
        .attr("stroke-width", 1);

      tooltip.style("opacity", 0);
      setTimeout(() => tooltip.style("visibility", "hidden"), 150);
    });

  // ─── Legend ───
  const legendX = width - 180;
  const legendY = height - 110;

  const legend = svg.append("g").attr("transform", `translate(${legendX},${legendY})`);

  legend.append("text")
    .attr("x", 0)
    .attr("y", 0)
    .text("AI sentiment")
    .attr("fill", "#5e5d59")
    .attr("font-family", "'Inter', sans-serif")
    .attr("font-size", "11px")
    .attr("font-weight", "500")
    .attr("letter-spacing", "0.05em")
    .attr("text-transform", "uppercase");

  // Gradient bar for legend
  const gradId = "map-legend-grad";
  const defs = svg.append("defs");
  const grad = defs.append("linearGradient")
    .attr("id", gradId)
    .attr("x1", "0%")
    .attr("x2", "100%");

  grad.append("stop").attr("offset", "0%").attr("stop-color", "#6a9bcc");
  grad.append("stop").attr("offset", "50%").attr("stop-color", "#bcd1ca");
  grad.append("stop").attr("offset", "100%").attr("stop-color", "#788c5d");

  legend.append("rect")
    .attr("x", 0)
    .attr("y", 12)
    .attr("width", 140)
    .attr("height", 6)
    .attr("fill", `url(#${gradId})`)
    .attr("rx", 3);

  legend.append("text").attr("x", 0).attr("y", 32).text("Less positive").attr("fill", "#87867f").attr("font-family", "'Inter', sans-serif").attr("font-size", "10px");
  legend.append("text").attr("x", 140).attr("y", 32).text("More positive").attr("fill", "#87867f").attr("font-family", "'Inter', sans-serif").attr("font-size", "10px").attr("text-anchor", "end");

  legend.append("text")
    .attr("x", 0)
    .attr("y", 52)
    .text("Bubble size = number of respondents")
    .attr("fill", "#87867f")
    .attr("font-family", "'Inter', sans-serif")
    .attr("font-size", "10px");

  // ─── Observer-based re-trigger ───
  const mapSection = document.getElementById("map-section");
  if (mapSection && "IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          bubbles.attr("r", 0).transition()
            .duration(900)
            .delay((d, i) => i * 30)
            .ease(d3.easeCubicOut)
            .attr("r", d => sizeScale(d.n));
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.3 });
    io.observe(mapSection);
  }
})();
