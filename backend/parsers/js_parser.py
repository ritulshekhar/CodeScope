"""
JavaScript/TypeScript Parser — regex-based AST for JS, JSX, TS, TSX.
"""
import re


def parse(source_code: str, filename: str = "unknown.js") -> dict:
    nodes = []
    edges = []
    cfg_edges = []
    dfg_edges = []
    functions = []
    counter = [0]

    def make_id(ntype):
        nid = f"{ntype}_{counter[0]:04d}"
        counter[0] += 1
        return nid

    lines = source_code.split("\n")
    root_id = make_id("Module")
    nodes.append({"id": root_id, "type": "Module", "token": filename,
                  "depth": 0, "line_start": 1, "line_end": len(lines),
                  "num_children": 0, "context": "root"})

    stores = {}

    for i, line in enumerate(lines):
        ln = i + 1
        stripped = line.strip()
        if not stripped or stripped.startswith("//"):
            continue

        # ES6 import
        m = re.match(r"import\s+(?:{[^}]*}|[\w*]+(?:\s+as\s+\w+)?)\s+from\s+['\"]([^'\"]+)['\"]", stripped)
        if not m:
            m = re.match(r"import\s+['\"]([^'\"]+)['\"]", stripped)
        if m:
            nid = make_id("Import")
            nodes.append({"id": nid, "type": "Import", "token": m.group(1),
                          "depth": 1, "line_start": ln, "line_end": ln,
                          "num_children": 0, "context": "import"})
            edges.append({"source": root_id, "target": nid, "type": "AST"})
            continue

        # require()
        m = re.match(r"(?:const|let|var)\s+\w+\s*=\s*require\(['\"]([^'\"]+)['\"]\)", stripped)
        if m:
            nid = make_id("Import")
            nodes.append({"id": nid, "type": "Import", "token": m.group(1),
                          "depth": 1, "line_start": ln, "line_end": ln,
                          "num_children": 0, "context": "import"})
            edges.append({"source": root_id, "target": nid, "type": "AST"})
            continue

        # export
        if re.match(r'^export\s+(?:default\s+)?(?:class|function|const|let|var)', stripped):
            nid = make_id("Export")
            nodes.append({"id": nid, "type": "Export", "token": "export",
                          "depth": 1, "line_start": ln, "line_end": ln,
                          "num_children": 0, "context": "export"})
            edges.append({"source": root_id, "target": nid, "type": "AST"})

        # class
        m = re.match(r'(?:export\s+)?(?:abstract\s+)?class\s+(\w+)', stripped)
        if m:
            nid = make_id("ClassDef")
            nodes.append({"id": nid, "type": "ClassDef", "token": m.group(1),
                          "depth": 1, "line_start": ln, "line_end": ln,
                          "num_children": 0, "context": "class"})
            edges.append({"source": root_id, "target": nid, "type": "AST"})
            continue

        # function declaration
        m = re.match(r'(?:export\s+)?(?:async\s+)?function\s*\*?\s*(\w+)\s*\(([^)]*)\)', stripped)
        if m:
            fn_name = m.group(1)
            args_str = m.group(2)
            args = [a.strip().split(":")[0].lstrip("...").strip()
                    for a in args_str.split(",") if a.strip()]
            is_async = "async" in stripped[:stripped.index("function")]
            nid = make_id("FunctionDef")
            nodes.append({"id": nid, "type": "FunctionDef", "token": fn_name,
                          "depth": 2, "line_start": ln, "line_end": ln,
                          "num_children": 0, "context": "async_function" if is_async else "function"})
            edges.append({"source": root_id, "target": nid, "type": "AST"})
            functions.append({"name": fn_name, "args": args, "line_start": ln,
                              "line_end": ln, "num_statements": 0, "complexity": 1,
                              "has_return": False, "node_id": nid})
            continue

        # arrow function
        m = re.match(r'(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\(([^)]*)\)\s*=>', stripped)
        if not m:
            m = re.match(r'(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?(\w+)\s*=>', stripped)
        if m:
            fn_name = m.group(1)
            args_str = m.group(2)
            args = [a.strip().split(":")[0].strip() for a in args_str.split(",") if a.strip()]
            nid = make_id("ArrowFunction")
            nodes.append({"id": nid, "type": "ArrowFunction", "token": fn_name,
                          "depth": 2, "line_start": ln, "line_end": ln,
                          "num_children": 0, "context": "arrow_function"})
            edges.append({"source": root_id, "target": nid, "type": "AST"})
            functions.append({"name": fn_name, "args": args, "line_start": ln,
                              "line_end": ln, "num_statements": 0, "complexity": 1,
                              "has_return": True, "node_id": nid})
            continue

        # JSX tag
        m = re.match(r'(?:return\s+)?\(<\s*([A-Z]\w+)', stripped)
        if m:
            nid = make_id("JSXElement")
            nodes.append({"id": nid, "type": "JSXElement", "token": m.group(1),
                          "depth": 3, "line_start": ln, "line_end": ln,
                          "num_children": 0, "context": "jsx"})
            edges.append({"source": root_id, "target": nid, "type": "AST"})

        # Control flow
        for kw, ntype in [("if", "If"), ("else", "Else"), ("for", "For"),
                          ("while", "While"), ("switch", "Switch"), ("try", "Try"),
                          ("catch", "Catch"), ("finally", "Finally")]:
            if re.match(rf'^\b{kw}\b', stripped) or re.match(rf'^\}\s*{kw}\b', stripped):
                nid = make_id(ntype)
                nodes.append({"id": nid, "type": ntype, "token": kw,
                              "depth": 3, "line_start": ln, "line_end": ln,
                              "num_children": 0, "context": "control"})
                edges.append({"source": root_id, "target": nid, "type": "AST"})
                if functions:
                    functions[-1]["complexity"] += 1
                if len(nodes) > 2:
                    cfg_edges.append({"source": nodes[-2]["id"], "target": nid, "type": "CFG", "label": "flow"})
                break

        # await
        if re.search(r'\bawait\b', stripped):
            nid = make_id("Await")
            nodes.append({"id": nid, "type": "Await", "token": "await",
                          "depth": 3, "line_start": ln, "line_end": ln,
                          "num_children": 0, "context": "await"})
            edges.append({"source": root_id, "target": nid, "type": "AST"})

        # return
        if re.match(r'^\breturn\b', stripped):
            nid = make_id("Return")
            nodes.append({"id": nid, "type": "Return", "token": "return",
                          "depth": 3, "line_start": ln, "line_end": ln,
                          "num_children": 0, "context": "return"})
            edges.append({"source": root_id, "target": nid, "type": "AST"})
            if functions:
                functions[-1]["has_return"] = True

        # variable declaration
        m = re.match(r'(?:const|let|var)\s+(\w+)\s*=\s*(.+)', stripped)
        if m:
            var = m.group(1)
            nid = make_id("Assign")
            nodes.append({"id": nid, "type": "Assign", "token": var,
                          "depth": 3, "line_start": ln, "line_end": ln,
                          "num_children": 0, "context": "Store"})
            edges.append({"source": root_id, "target": nid, "type": "AST"})
            stores[var] = stores.get(var, []) + [nid]
            rhs = m.group(2)
            for sv, sids in stores.items():
                if sv != var and re.search(rf'\b{re.escape(sv)}\b', rhs):
                    use_id = make_id("Name")
                    nodes.append({"id": use_id, "type": "Name", "token": sv,
                                  "depth": 4, "line_start": ln, "line_end": ln,
                                  "num_children": 0, "context": "Load"})
                    for sid in sids:
                        dfg_edges.append({"source": sid, "target": use_id, "type": "DFG", "variable": sv})

        if functions:
            functions[-1]["num_statements"] += 1

    return {
        "nodes": nodes,
        "edges": edges,
        "cfg_edges": cfg_edges,
        "dfg_edges": dfg_edges,
        "functions": functions,
        "language": "JavaScript/TypeScript",
    }
