with open(r'E:\ThreeInOne\DeadDrop\prompts\software\demo-server\static\index.html', 'r', encoding='utf-8') as f:
    content = f.read()

lines = content.split('\n')
for i, line in enumerate(lines):
    if 'label:' in line and 'color:' in line:
        idx = line.find('label:')
        if idx >= 0:
            after_label = line[idx+6:]
            after_label = after_label.lstrip()
            if after_label.startswith("'"):
                quote_end = after_label.find("',", 1)
                if quote_end < 0:
                    print(f'Line {i+1}: Missing closing quote in label')
                    print(f'  {line.strip()}')

# Also check genCode function for similar issues
print("\nChecking genCode function...")
for i, line in enumerate(lines):
    if 'genCode' in line or (670 < i < 730 and ('adj' in line or 'noun' in line)):
        print(f'Line {i+1}: {line.strip()[:100]}')
