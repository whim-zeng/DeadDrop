from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={'width': 430, 'height': 932})
    
    logs = []
    page.on('console', lambda msg: logs.append(f'{msg.type}: {msg.text}'))
    page.on('pageerror', lambda err: logs.append(f'pageerror: {err}'))
    
    page.goto('http://127.0.0.1:3000')
    page.wait_for_timeout(2000)
    page.screenshot(path='screenshot_welcome.png')
    
    # Click start button - use JS to avoid encoding issues
    page.evaluate("""() => {
        const btns = document.querySelectorAll('button');
        for (const b of btns) {
            if (b.textContent.includes('开始') || b.textContent.includes('探索')) {
                b.click();
                break;
            }
        }
    }""")
    page.wait_for_timeout(2000)
    page.screenshot(path='screenshot_identity.png')
    
    # Click continue button
    page.evaluate("""() => {
        const btns = document.querySelectorAll('button');
        for (const b of btns) {
            if (b.textContent.includes('继续')) {
                b.click();
                break;
            }
        }
    }""")
    page.wait_for_timeout(3000)
    page.screenshot(path='screenshot_map.png')
    
    # Take screenshot of just the globe section
    globe = page.locator('#globe-viz')
    if globe.count() > 0:
        globe.screenshot(path='screenshot_globe.png')
    
    browser.close()

print('Screenshots saved')
for log in logs:
    print(log)
