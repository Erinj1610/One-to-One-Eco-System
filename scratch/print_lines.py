with open(r"c:\Users\erin\Desktop\One to One Eco System\frontend\src\pages\SalesTracker.jsx", 'r', encoding='utf-8') as f:
    lines = f.readlines()

for idx in range(3200, min(3230, len(lines))):
    print(f"{idx+1}: {lines[idx]}", end="")
