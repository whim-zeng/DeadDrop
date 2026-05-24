from playwright.sync_api import sync_playwright
import time

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    
    print("Loading page...")
    page.goto("https://www.anthropic.com/features/81k-interviews", wait_until="networkidle", timeout=60000)
    
    # Wait a bit for JS hydration and lazy-loaded content
    time.sleep(5)
    
    # Try to find the map section by looking for known text
    print("Scrolling to map section...")
    
    # Scroll down to find map
    for i in range(20):
        page.evaluate("window.scrollBy(0, 800)")
        time.sleep(0.5)
        content = page.content()
        if "Loading data" in content or "Rate of overall positive sentiment" in content or "Bigger bubbles mean more respondents" in content:
            print(f"Found map-related content at scroll {i}")
            time.sleep(3)
            break
    
    # Full page screenshot first
    print("Taking full page screenshot...")
    page.screenshot(path="anthropic_full.png", full_page=False)
    
    # Try to locate the map element - look for svg or canvas in the viewport
    # Let's take a screenshot focused on the bottom half where map likely is
    page.evaluate("window.scrollTo(0, document.body.scrollHeight * 0.55)")
    time.sleep(2)
    page.screenshot(path="anthropic_map_area.png")
    
    # Also try to find SVG elements that look like maps
    svgs = page.query_selector_all("svg")
    print(f"Found {len(svgs)} SVG elements")
    
    for idx, svg in enumerate(svgs):
        try:
            bbox = svg.bounding_box()
            if bbox and bbox["width"] > 400 and bbox["height"] > 200:
                print(f"SVG {idx}: {bbox}")
                svg.screenshot(path=f"anthropic_svg_{idx}.png")
        except Exception as e:
            print(f"SVG {idx} error: {e}")
    
    browser.close()
    print("Done. Check anthropic_*.png files.")
