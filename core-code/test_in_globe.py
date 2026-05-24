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
    
    # Add a new image directly to #globe-viz svg
    result = page.evaluate("""() => {
        const svg = document.querySelector('#globe-viz svg');
        if (!svg) return 'no svg';
        
        const img = document.createElementNS('http://www.w3.org/2000/svg', 'image');
        img.setAttribute('href', 'http://127.0.0.1:3000/tiles/osm/15/27438/13388.png');
        img.setAttribute('x', '50');
        img.setAttribute('y', '50');
        img.setAttribute('width', '200');
        img.setAttribute('height', '200');
        svg.appendChild(img);
        
        return 'added image to #globe-viz svg';
    }""")
    
    page.wait_for_timeout(2000)
    page.screenshot(path='screenshot_in_globe.png')
    
    browser.close()
    print(result)
