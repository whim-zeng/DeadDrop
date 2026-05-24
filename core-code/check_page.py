import urllib.request

r = urllib.request.urlopen('http://127.0.0.1:5000', timeout=5)
html = r.read().decode('utf-8')

print('Length:', len(html))
print('Has root div:', 'id="root"' in html)
print('Has render():', 'render();' in html)
print('Has welcome text:', '发现身边的秘密' in html)
print('First char:', repr(html[0]))
print('Has script tag:', '<script>' in html)
