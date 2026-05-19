import re

with open('src/pages/MockModules.jsx', 'r', encoding='utf-8') as f:
    d = f.read()

d = re.sub(r'onClick="[^"]*"', 'onClick={() => {}}', d)
d = re.sub(r'onChange="[^"]*"', 'onChange={() => {}}', d)

with open('src/pages/MockModules.jsx', 'w', encoding='utf-8') as f:
    f.write(d)

print("Fixed MockModules.jsx")
