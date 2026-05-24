import urllib.request
r = urllib.request.urlopen('http://127.0.0.1:5000', timeout=5)
html = r.read().decode('utf-8')
print('Root div:', 'id="root"' in html)
print('Script:', '<script>' in html)
print('render call:', 'render()' in html)
print('render func:', 'function render()' in html)
print('HTML length:', len(html))
# Check JS for syntax issues
js_start = html.find('<script>')
js_end = html.find('</script>', js_start)
js = html[js_start:js_end]
print('JS length:', len(js))
# Check for unclosed template literals
import re
issues = []
for m in re.finditer(r'\$\{([^}]*)\}', js):
    inner = m.group(1)
    if inner.count('${') != inner.count('}'):
        issues.append((m.start(), inner[:50]))
print('Template literal issues:', len(issues))
for i in issues[:5]:
    print('  at', i[0], ':', i[1])
