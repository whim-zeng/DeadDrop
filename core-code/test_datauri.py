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
    
    # Replace images with data URI SVG
    result = page.evaluate("""() => {
        const svg = document.querySelector('#globe-viz svg');
        if (!svg) return 'no svg';
        
        // Remove existing tile-layer
        const tileLayer = svg.querySelector('g.tile-layer');
        if (tileLayer) tileLayer.remove();
        
        // Create new tile-layer with data URI images
        const newLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        newLayer.setAttribute('class', 'tile-layer');
        
        const dataUri = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNTYiIGhlaWdodD0iMjU2Ij48cmVjdCB3aWR0aD0iMjU2IiBoZWlnaHQ9IjI1NiIgZmlsbD0iI2ZmMDAwMCIvPjx0ZXh0IHg9IjEyOCIgeT0iMTI4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkb21pbmFudC1iYXNlbGluZT0iY2VudHJhbCIgZmlsbD0id2hpdGUiIGZvbnQtc2l6ZT0iMjAiPkRhdGEgVVJJPC90ZXh0Pjwvc3ZnPg==';
        
        const img = document.createElementNS('http://www.w3.org/2000/svg', 'image');
        img.setAttribute('href', dataUri);
        img.setAttribute('x', '50');
        img.setAttribute('y', '50');
        img.setAttribute('width', '200');
        img.setAttribute('height', '200');
        newLayer.appendChild(img);
        
        // Also try with xlink:href
        const img2 = document.createElementNS('http://www.w3.org/2000/svg', 'image');
        img2.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', dataUri);
        img2.setAttribute('x', '50');
        img2.setAttribute('y', '300');
        img2.setAttribute('width', '200');
        img2.setAttribute('height', '200');
        newLayer.appendChild(img2);
        
        svg.querySelector('g').insertBefore(newLayer, svg.querySelector('g').firstChild);
        
        return 'added 2 data URI images';
    }""")
    
    page.wait_for_timeout(1000)
    page.screenshot(path='screenshot_datauri.png')
    
    browser.close()
    print(result)
