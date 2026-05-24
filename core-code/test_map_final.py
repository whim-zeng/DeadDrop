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
    page.wait_for_timeout(8000)  # Wait longer for geolocation timeout + API
    
    page.screenshot(path='screenshot_map_final.png')
    
    # Check if notes loaded
    result = page.evaluate("""() => {
        const stats = document.getElementById('mapStats');
        return {
            statsText: stats ? stats.textContent : 'no stats',
            notesCount: document.querySelectorAll('.quote-card').length,
        };
    }""")
    
    browser.close()
    print(result)
