from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={'width': 430, 'height': 932})
    
    page.goto('http://127.0.0.1:3000')
    page.wait_for_timeout(2000)
    
    page.evaluate("""() => {
        for (const b of document.querySelectorAll('button')) {
            if (b.textContent.includes('开始') || b.textContent.includes('探索')) { b.click(); break; }
        }
    }""")
    page.wait_for_timeout(2000)
    
    page.evaluate("""() => {
        for (const b of document.querySelectorAll('button')) {
            if (b.textContent.includes('继续')) { b.click(); break; }
        }
    }""")
    page.wait_for_timeout(5000)  # Wait longer for images to load
    
    # Check image load status
    img_status = page.evaluate("""() => {
        const imgs = document.querySelectorAll('#globe-viz svg image');
        const results = [];
        for (const img of imgs) {
            const bbox = img.getBBox();
            results.push({
                href: img.getAttribute('href') || img.getAttribute('xlink:href'),
                x: img.getAttribute('x'),
                y: img.getAttribute('y'),
                naturalWidth: img.naturalWidth,
                naturalHeight: img.naturalHeight,
                complete: img.complete,
                bbox: { x: bbox.x, y: bbox.y, w: bbox.width, h: bbox.height },
            });
        }
        return results;
    }""")
    
    # Also test standalone SVG image
    standalone = page.evaluate("""() => {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 300 300');
        svg.setAttribute('width', '300');
        svg.setAttribute('height', '300');
        const img = document.createElementNS('http://www.w3.org/2000/svg', 'image');
        img.setAttribute('href', 'http://127.0.0.1:3000/tiles/osm/15/27438/13388.png');
        img.setAttribute('width', '256');
        img.setAttribute('height', '256');
        svg.appendChild(img);
        document.body.appendChild(svg);
        
        return {
            naturalWidth: img.naturalWidth,
            naturalHeight: img.naturalHeight,
            complete: img.complete,
        };
    }""")
    
    page.wait_for_timeout(2000)
    
    standalone_after = page.evaluate("""() => {
        const img = document.querySelector('body > svg:last-child image');
        return {
            naturalWidth: img.naturalWidth,
            naturalHeight: img.naturalHeight,
            complete: img.complete,
        };
    }""")
    
    # Screenshot
    page.screenshot(path='screenshot_map2.png')
    
    browser.close()

print('=== drawTileLayer images ===')
for i, img in enumerate(img_status):
    print(f'Image {i}: nw={img["naturalWidth"]}, nh={img["naturalHeight"]}, complete={img["complete"]}, href={img["href"][-30:]}, bbox={img["bbox"]}')

print()
print('=== Standalone SVG image (immediate) ===')
print(standalone)
print()
print('=== Standalone SVG image (after 2s) ===')
print(standalone_after)
