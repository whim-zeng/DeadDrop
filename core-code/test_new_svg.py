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
    
    # Create a completely new SVG inside #globe-viz
    result = page.evaluate("""() => {
        const globe = document.getElementById('globe-viz');
        if (!globe) return 'no globe';
        
        // Hide old SVG
        const oldSvg = globe.querySelector('svg');
        if (oldSvg) oldSvg.style.display = 'none';
        
        // Create new SVG
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 300 300');
        svg.setAttribute('width', '300');
        svg.setAttribute('height', '300');
        svg.style.background = '#eee';
        globe.appendChild(svg);
        
        const img = document.createElementNS('http://www.w3.org/2000/svg', 'image');
        img.setAttribute('href', 'http://127.0.0.1:3000/tiles/osm/15/27438/13388.png');
        img.setAttribute('x', '20');
        img.setAttribute('y', '20');
        img.setAttribute('width', '200');
        img.setAttribute('height', '200');
        svg.appendChild(img);
        
        return 'added new svg to #globe-viz';
    }""")
    
    page.wait_for_timeout(2000)
    page.screenshot(path='screenshot_new_svg.png')
    
    browser.close()
    print(result)
