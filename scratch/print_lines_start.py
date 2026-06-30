import sys
sys.stdout.reconfigure(encoding='utf-8')

with open(r"c:\Users\erin\Desktop\One to One Eco System\frontend\src\pages\SalesTracker.jsx", 'r', encoding='utf-8') as f:
    lines = f.readlines()

for idx in range(2785, min(2850, len(lines))):
    print(f"{idx+1}: {lines[idx]}", end="")
