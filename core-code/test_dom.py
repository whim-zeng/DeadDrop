from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={'width': 430, 'height': 932})
    
    page.goto('http://127.0.0.1:3000')
    page.wait_for_timeout(2000)
    
    # Click start
    page.evaluate("""() => {
        for (const b of document.querySelectorAll('button')) {
            if (b.textContent.includes('开始') || b.textContent.includes('探索')) { b.click(); break; }
        }
    }""")
    page.wait_for_timeout(2000)
    
    # Click continue
    page.evaluate("""() => {
        for (const b of document.querySelectorAll('button')) {
            if (b.textContent.includes('继续')) { b.click(); break; }
        }
    }""")
    page.wait_for_timeout(3000)
    
    # Get globe-viz innerHTML
    html = page.evaluate("""() => {
        const el = document.getElementById('globe-viz');
        return el ? el.innerHTML : 'NOT FOUND';
    }""")
    
    # Count image elements
    img_count = page.evaluate("""() => {
        return document.querySelectorAll('#globe-viz svg image').length;
    }""")
    
    # Get computed style of globe-viz
    style = page.evaluate("""() => {
        const el = document.getElementById('globe-viz');
        if (!el) return {};
        const s = getComputedStyle(el);
        return {
            width: s.width,
            height: s.height,
            position: s.position,
            display: s.display,
        };
    }""")
    
    # Get svg viewBox and dimensions
    svg_info = page.evaluate("""() => {
        const svg = document.querySelector('#globe-viz svg');
        if (!svg) return 'NO SVG';
        const s = getComputedStyle(svg);
        return {
            viewBox: svg.getAttribute('viewBox'),
            width: s.width,
            height: s.height,
            innerHTML_length: svg.innerHTML.length,
        };
    }""")
    
    # Check if images have loaded
    img_status = page.evaluate("""() => {
        const imgs = document.querySelectorAll('#globe-viz svg image');
        const results = [];
        for (const img of imgs) {
            const rect = img.getBoundingClientRect();
            results.push({
                href: img.getAttribute('href') || img.getAttribute('xlink:href'),
                x: img.getAttribute('x'),
                y: img.getAttribute('y'),
                width: img.getAttribute('width'),
                height: img.getAttribute('height'),
                rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height },
                naturalWidth: img.naturalWidth,
                naturalHeight: img.naturalHeight,
            });
        }
        return results;
    }""")
    
    browser.close()

print('=== globe-viz HTML (first 2000 chars) ===')
print(html[:2000])
print()
print('=== Image count ===')
print(img_count)
print()
print('=== globe-viz style ===')
print(style)
print()
print('=== SVG info ===')
print(svg_info)
print()
print('=== Image status ===')
for i, img in enumerate(img_status):
    print(f'Image {i}: {img}')
