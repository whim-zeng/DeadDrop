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
    page.wait_for_timeout(3000)
    
    page.screenshot(path='screenshot_map_fixed.png')
    
    # Check DOM
    result = page.evaluate("""() => {
        const tileLayer = document.querySelector('g.tile-layer');
        if (!tileLayer) return 'no tile-layer';
        return {
            rects: tileLayer.querySelectorAll('rect').length,
            paths: tileLayer.querySelectorAll('path').length,
            images: tileLayer.querySelectorAll('image').length,
        };
    }""")
    
    browser.close()
    print(result)
