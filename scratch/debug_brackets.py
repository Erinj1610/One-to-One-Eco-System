import sys

def check_brackets(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # We want to trace curly braces { and } and parentheses ( and )
    stack = []
    lines = content.split('\n')
    for i, line in enumerate(lines):
        for char in line:
            if char in '{(':
                stack.append((char, i+1, line))
            elif char in '})':
                if not stack:
                    print(f"Unmatched closing {char} at line {i+1}: {line}")
                    return
                top, l_num, l_text = stack.pop()
                if (char == '}' and top != '{') or (char == ')' and top != '('):
                    print(f"Mismatched {char} at line {i+1} matching {top} from line {l_num}")
                    print(f"Opening: {l_text}")
                    print(f"Closing: {line}")
                    return
    if stack:
        print(f"Unclosed brackets left on stack: {len(stack)}")
        for top, l_num, l_text in stack[-5:]:
            print(f"Unclosed {top} from line {l_num}: {l_text}")

if __name__ == '__main__':
    check_brackets(r"c:\Users\erin\Desktop\One to One Eco System\frontend\src\pages\SalesTracker.jsx")
