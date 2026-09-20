import os

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    original = content

    # 1. Update Cards
    # In models/page.tsx
    content = content.replace(
        'hover:border-zinc-700 transition-colors duration-75',
        'hover-lift'
    )
    
    # In task/page.tsx, if there is a specific card class:
    # "bg-zinc-900 rounded-lg border border-zinc-800 p-3 hover:border-zinc-700 transition-colors"
    content = content.replace(
        'hover:border-zinc-700 transition-colors',
        'hover-lift'
    )

    # 2. Add hover-glow to Buttons
    # Example: hover:bg-blue-700 transition-colors
    # Example: hover:bg-blue-600 hover:text-white text-zinc-300 rounded-md text-xs font-medium transition-colors duration-75
    # Just add hover-glow to the classes that have hover:bg-blue-600 or hover:bg-blue-700
    content = content.replace(
        'hover:bg-blue-600 hover:text-white',
        'hover:bg-blue-600 hover:text-white hover-glow'
    )
    content = content.replace(
        'hover:bg-blue-700 transition-colors duration-75',
        'hover:bg-blue-700 hover-glow'
    )
    content = content.replace(
        'hover:bg-blue-700',
        'hover:bg-blue-700 hover-glow'
    )
    content = content.replace(
        'hover-glow hover-glow', 
        'hover-glow'
    )
    
    # 3. Add hover-row to Settings rows, file list rows, usage rows
    # In settings API keys list: 'flex items-center justify-between p-3 rounded-lg border border-zinc-800/80 bg-zinc-900/50'
    content = content.replace(
        'bg-zinc-900/50 rounded-lg border border-zinc-800/80',
        'bg-zinc-900/50 rounded-lg border border-zinc-800/80 hover-row'
    )
    content = content.replace(
        'flex items-center justify-between p-3 rounded-lg border border-zinc-800/80 bg-zinc-900/50 hover-row',
        'flex items-center justify-between p-3 rounded-lg border border-zinc-800/80 bg-zinc-900/50 hover-row'
    )
    content = content.replace(
        'border-b border-zinc-800/50 last:border-0 hover:bg-zinc-800/30 transition-colors',
        'border-b border-zinc-800/50 last:border-0 hover-row'
    )

    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {filepath}")

for root, _, files in os.walk('/home/tuna/yapayzekacalisan/apps/web/app'):
    for f in files:
        if f.endswith('.tsx'):
            process_file(os.path.join(root, f))
            
for root, _, files in os.walk('/home/tuna/yapayzekacalisan/apps/web/components'):
    for f in files:
        if f.endswith('.tsx'):
            process_file(os.path.join(root, f))
