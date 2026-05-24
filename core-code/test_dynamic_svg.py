from playwright.sync_api import sync_playwright

html = '''<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body>
  <div id="container"></div>
  <script>
    // Create SVG dynamically (like D3 does)
    const container = document.getElementById('container');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 300 300');
    svg.setAttribute('width', '300');
    svg.setAttribute('height', '300');
    svg.style.background = '#eee';
    container.appendChild(svg);
    
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

with open('test_dynamic_svg.html', 'w', encoding='utf-8') as f:
    f.write(html)

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={'width': 400, 'height': 400})
    page.goto('file:///' + __import__('os').path.abspath('test_dynamic_svg.html').replace('\\', '/'))
    page.wait_for_timeout(3000)
    page.screenshot(path='screenshot_dynamic_svg.png')
    browser.close()

print('done')
