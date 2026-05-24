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
    
    # Only change href to data URI, keep overlay rect
    result = page.evaluate("""() => {
        const tileLayer = document.querySelector('g.tile-layer');
        if (!tileLayer) return 'no tile-layer';
        
        const images = tileLayer.querySelectorAll('image');
        const dataUri = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNTYiIGhlaWdodD0iMjU2Ij48cmVjdCB3aWR0aD0iMjU2IiBoZWlnaHQ9IjI1NiIgZmlsbD0iI2ZmMDAwMCIvPjx0ZXh0IHg9IjEyOCIgeT0iMTI4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkb21pbmFudC1iYXNlbGluZT0iY2VudHJhbCIgZmlsbD0id2hpdGUiIGZvbnQtc2l6ZT0iMjAiPkRhdGEgVVJJPC90ZXh0Pjwvc3ZnPg==';
        
        for (const img of images) {
            img.setAttribute('href', dataUri);
        }
        
        return 'modified ' + images.length + ' images (overlay kept)';
    }""")
    
    page.wait_for_timeout(1000)
    page.screenshot(path='screenshot_datauri_overlay.png')
    
    browser.close()
    print(result)
