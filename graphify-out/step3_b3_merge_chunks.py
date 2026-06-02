import json
from pathlib import Path

all_nodes = []
all_edges = []
all_hyperedges = []

for i in range(1, 6):
    try:
        data = json.loads(Path(f'graphify-out/.graphify_chunk_{i:02d}.json').read_text(encoding='utf-8'))
        all_nodes.extend(data.get('nodes', []))
        all_edges.extend(data.get('edges', []))
        all_hyperedges.extend(data.get('hyperedges', []))
    except Exception as e:
        print(f"Error reading chunk {i}: {e}")

Path('graphify-out/.graphify_semantic_new.json').write_text(json.dumps({
    'nodes': all_nodes,
    'edges': all_edges,
    'hyperedges': all_hyperedges
}, indent=2), encoding='utf-8')
print("Merged 5 chunks into .graphify_semantic_new.json")
