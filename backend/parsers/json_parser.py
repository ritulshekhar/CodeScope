"""
JSON Parser — key-value tree AST for JSON files.
"""
import json


def parse(source_code: str, filename: str = "unknown.json") -> dict:
    nodes = []
    edges = []
    counter = [0]

    def make_id(ntype):
        nid = f"{ntype}_{counter[0]:04d}"
        counter[0] += 1
        return nid

    root_id = make_id("JSONDocument")
    nodes.append({"id": root_id, "type": "JSONDocument", "token": filename,
                  "depth": 0, "line_start": 1, "line_end": 1,
                  "num_children": 0, "context": "root"})

    try:
        data = json.loads(source_code)
    except json.JSONDecodeError as e:
        return {
            "nodes": nodes, "edges": edges,
            "cfg_edges": [], "dfg_edges": [], "functions": [],
            "language": "JSON", "error": str(e)
        }

    def visit(obj, parent_id, depth, key=None):
        if depth > 10:
            return

        if isinstance(obj, dict):
            nid = make_id("Object")
            token = key if key else "object"
            nodes.append({"id": nid, "type": "Object", "token": str(token)[:30],
                          "depth": depth, "line_start": 1, "line_end": 1,
                          "num_children": len(obj), "context": "object"})
            edges.append({"source": parent_id, "target": nid, "type": "AST"})
            for k, v in list(obj.items())[:50]:  # cap keys
                visit(v, nid, depth + 1, key=k)

        elif isinstance(obj, list):
            nid = make_id("Array")
            token = key if key else "array"
            nodes.append({"id": nid, "type": "Array", "token": str(token)[:30],
                          "depth": depth, "line_start": 1, "line_end": 1,
                          "num_children": len(obj), "context": "array"})
            edges.append({"source": parent_id, "target": nid, "type": "AST"})
            for item in list(obj)[:20]:  # cap items
                visit(item, nid, depth + 1)

        else:
            ntype = "StringValue" if isinstance(obj, str) else \
                    "NumberValue" if isinstance(obj, (int, float)) else \
                    "BoolValue" if isinstance(obj, bool) else "NullValue"
            nid = make_id(ntype)
            token = key if key else str(obj)
            nodes.append({"id": nid, "type": ntype, "token": str(token)[:30],
                          "depth": depth, "line_start": 1, "line_end": 1,
                          "num_children": 0, "context": str(obj)[:30]})
            edges.append({"source": parent_id, "target": nid, "type": "AST"})

    visit(data, root_id, depth=1)

    return {
        "nodes": nodes,
        "edges": edges,
        "cfg_edges": [],
        "dfg_edges": [],
        "functions": [],
        "language": "JSON",
    }
