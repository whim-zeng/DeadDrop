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
    
    # Test: modify existing images to use xlink:href
    result = page.evaluate("""() => {
        const tileLayer = document.querySelector('g.tile-layer');
        if (!tileLayer) return 'no tile-layer';
        
        const images = tileLayer.querySelectorAll('image');
        let count = 0;
        for (const img of images) {
            const href = img.getAttribute('href');
            if (href) {
                // Try setting xlink:href
                img.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', href);
                count++;
            }
        }
        
        // Also try creating a new image with xlink:href
        const svg = document.querySelector('#globe-viz svg');
        const newImg = document.createElementNS('http://www.w3.org/2000/svg', 'image');
        newImg.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', 'http://127.0.0.1:3000/tiles/osm/15/27438/13388.png');
        newImg.setAttribute('x', '50');
        newImg.setAttribute('y', '50');
        newImg.setAttribute('width', '200');
        newImg.setAttribute('height', '200');
        svg.appendChild(newImg);
        
        return { modified: count, total: images.length };
    }""")
    
    page.wait_for_timeout(3000)
    page.screenshot(path='screenshot_xlink.png')
    
    browser.close()
    print(result)
