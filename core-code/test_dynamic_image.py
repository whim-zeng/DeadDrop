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
    
    # Create a dynamic image in the existing SVG and check if it loads
    result = page.evaluate("""() => {
        return new Promise((resolve) => {
            const svg = document.querySelector('#globe-viz svg');
            if (!svg) return resolve({ error: 'no svg' });
            
            const img = document.createElementNS('http://www.w3.org/2000/svg', 'image');
            img.setAttribute('href', 'http://127.0.0.1:3000/tiles/osm/15/27438/13388.png');
            img.setAttribute('x', '50');
            img.setAttribute('y', '50');
            img.setAttribute('width', '256');
            img.setAttribute('height', '256');
            
            let resolved = false;
            img.onload = () => {
                resolved = true;
                resolve({ event: 'load', naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight });
            };
            img.onerror = (e) => {
                resolved = true;
                resolve({ event: 'error', error: e.type });
            };
            
            svg.appendChild(img);
            
            setTimeout(() => {
                if (!resolved) {
                    resolve({ event: 'timeout', naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight });
                }
            }, 3000);
        });
    }""")
    
    page.wait_for_timeout(3000)
    page.screenshot(path='screenshot_dynamic_image.png')
    
    browser.close()
    print(result)
