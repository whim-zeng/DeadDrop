import urllib.request

r = urllib.request.urlopen('http://127.0.0.1:3000', timeout=5)
html = r.read().decode('utf-8')
print('Status:', r.status)
print('Length:', len(html))
print('Has globe-viz:', 'id="globe-viz"' in html)
print('Has d3:', 'd3js.org' in html)
print('Has initGlobe call:', 'initGlobe()' in html)
print('Has drawTileLayer:', 'function drawTileLayer(' in html)
print('Has TILE_BASE:', 'TILE_BASE' in html)

# Check tile endpoint
r2 = urllib.request.urlopen('http://127.0.0.1:3000/tiles/osm/15/26945/13715.png', timeout=10)
print('Tile Status:', r2.status)
print('Tile Content-Type:', r2.headers.get('Content-Type'))
