with open('E:\\ThreeInOne\\DeadDrop\\prompts\\software\\demo-server\\static\\index.html', 'rb') as f:
    data = f.read()

idx = data.find(b'GPS\xe5\xae\x9a\xe4\xbd\x8d\xe4\xb8\xad')
print('Found at', idx)
ctx = data[idx:idx+40]
print('Bytes:', ctx)
print('Hex:', ctx.hex())
for i, b in enumerate(ctx):
    ch = chr(b) if 32 <= b < 127 else ''
    print(f'  {i}: {hex(b)} = {ch!r}')
