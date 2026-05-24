from playwright.sync_api import sync_playwright
import json

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    
    page.goto("https://www.anthropic.com/features/81k-interviews", wait_until="networkidle", timeout=60000)
    page.wait_for_timeout(5000)
    
    # Scroll to top to see the globe
    page.evaluate("window.scrollTo(0, 0)")
    page.wait_for_timeout(2000)
    
    # Screenshot the hero area
    page.screenshot(path="anthropic_hero_globe.png")
    
    # Try to find the SVG canvas element for the globe
    # Look for large SVGs at the top
    elements = page.query_selector_all("svg, canvas")
    for idx, el in enumerate(elements[:20]):
        try:
            bbox = el.bounding_box()
            if bbox and bbox["width"] > 600 and bbox["height"] > 400:
                print(f"Element {idx}: tag={el.evaluate('el => el.tagName')}, bbox={bbox}")
                el.screenshot(path=f"anthropic_globe_el_{idx}.png")
        except Exception as e:
            pass
    
    # Dump the DOM around the hero to understand structure
    hero_html = page.evaluate("""
        () => {
            const hero = document.querySelector('main') || document.body;
            // Find elements containing "represents 4 respondents"
            const el = Array.from(document.querySelectorAll('*')).find(e => 
                e.textContent && e.textContent.includes('Each dot represents')
            );
            if (el) {
                let parent = el;
                for (let i=0; i<6; i++) {
                    if (parent.parentElement) parent = parent.parentElement;
                }
                return parent.outerHTML.substring(0, 8000);
            }
            return '';
        }
    """)
    with open("anthropic_hero_dom.html", "w", encoding="utf-8") as f:
        f.write(hero_html)
    
    # Also try to extract any visible data attributes or class names
    globe_info = page.evaluate("""
        () => {
            const svgs = Array.from(document.querySelectorAll('svg'))
                .filter(s => s.getBoundingClientRect().width > 500 && s.getBoundingClientRect().height > 500)
                .map(s => ({
                    width: s.getAttribute('width'),
                    height: s.getAttribute('height'),
                    viewBox: s.getAttribute('viewBox'),
                    class: s.getAttribute('class'),
                    childCount: s.children.length,
                    firstChildTag: s.children[0]?.tagName,
                    parentClass: s.parentElement?.className
                }));
            return svgs;
        }
    """)
    print(json.dumps(globe_info, indent=2))
    
    browser.close()
    print("Done.")
