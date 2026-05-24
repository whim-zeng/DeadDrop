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
    
    # Replace all images with red rects
    page.evaluate("""() => {
        const tileLayer = document.querySelector('g.tile-layer');
        if (!tileLayer) return 'no tile-layer';
        
        const images = tileLayer.querySelectorAll('image');
        for (const img of images) {
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('x', img.getAttribute('x'));
            rect.setAttribute('y', img.getAttribute('y'));
            rect.setAttribute('width', img.getAttribute('width'));
            rect.setAttribute('height', img.getAttribute('height'));
            rect.setAttribute('fill', 'red');
            rect.setAttribute('opacity', '0.3');
            img.parentNode.replaceChild(rect, img);
        }
        
        // Also remove the overlay rect
        const overlay = tileLayer.querySelector('rect[fill=\"#f7f5ef\"]');
        if (overlay) overlay.remove();
        
        return 'replaced ' + images.length + ' images';
    }""")
    
    page.wait_for_timeout(500)
    page.screenshot(path='screenshot_rect_replace.png')
    
    browser.close()
