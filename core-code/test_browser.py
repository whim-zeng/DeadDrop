from playwright.sync_api import sync_playwright

html = '''<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body>
  <h3>Static SVG image</h3>
  <svg viewBox="0 0 300 300" width="300" height="300">
    <image href="http://127.0.0.1:3000/tiles/osm/15/27438/13388.png" x="0" y="0" width="256" height="256"/>
  </svg>
  <h3>Dynamic SVG image</h3>
  <svg id="dyn" viewBox="0 0 300 300" width="300" height="300"></svg>
  <script>
    const svg = document.getElementById('dyn');
    const img = document.createElementNS('http://www.w3.org/2000/svg', 'image');
    img.setAttribute('href', 'http://127.0.0.1:3000/tiles/osm/15/27438/13388.png');
    img.setAttribute('x', '20');
    img.setAttribute('y', '20');
    img.setAttribute('width', '200');
    img.setAttribute('height', '200');
    svg.appendChild(img);
  </script>
</body>
</html>'''

with open('test_browser.html', 'w', encoding='utf-8') as f:
    f.write(html)

with sync_playwright() as p:
    for name, browser_type in [('chromium', p.chromium), ('firefox', p.firefox), ('webkit', p.webkit)]:
        try:
            browser = browser_type.launch()
            page = browser.new_page(viewport={'width': 400, 'height': 700})
            page.goto('file:///' + __import__('os').path.abspath('test_browser.html').replace('\\', '/'))
            page.wait_for_timeout(3000)
            page.screenshot(path=f'screenshot_{name}.png')
            browser.close()
            print(f'{name}: OK')
        except Exception as e:
            print(f'{name}: {e}')
