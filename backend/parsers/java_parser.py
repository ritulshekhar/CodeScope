"""
Java Parser — regex-based AST for Java source files.
"""
import re


def parse(source_code: str, filename: str = "unknown.java") -> dict:
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

    root_id = make_id("CompilationUnit")
    nodes.append({"id": root_id, "type": "CompilationUnit", "token": filename,
                  "depth": 0, "line_start": 1, "line_end": len(lines),
                  "num_children": 0, "context": "root"})

    stores = {}

    for i, line in enumerate(lines):
        ln = i + 1
        stripped = line.strip()
        if not stripped:
            continue

        # Imports
        m = re.match(r'import\s+([\w.]+(?:\.\*)?)\s*;', stripped)
        if m:
            nid = make_id("Import")
            nodes.append({"id": nid, "type": "Import", "token": m.group(1),
                          "depth": 1, "line_start": ln, "line_end": ln,
                          "num_children": 0, "context": "import"})
            edges.append({"source": root_id, "target": nid, "type": "AST"})
            continue

        # Class definition
        m = re.match(r'(?:public\s+|private\s+|protected\s+|abstract\s+|final\s+)*class\s+(\w+)', stripped)
        if m:
            nid = make_id("ClassDef")
            nodes.append({"id": nid, "type": "ClassDef", "token": m.group(1),
                          "depth": 1, "line_start": ln, "line_end": ln,
                          "num_children": 0, "context": "class"})
            edges.append({"source": root_id, "target": nid, "type": "AST"})
            continue

        # Method/function definition
        m = re.match(r'(?:(?:public|private|protected|static|final|synchronized|abstract|native|strictfp)\s+)*'
                     r'(?:\w+(?:<[^>]*>)?(?:\[\])*\s+)(\w+)\s*\(([^)]*)\)\s*(?:throws\s+\w+\s*)?[{;]', stripped)
        if m and m.group(1) not in ('if', 'for', 'while', 'switch', 'catch', 'class', 'return'):
            fn_name = m.group(1)
            args_str = m.group(2)
            args = [a.strip().split()[-1] for a in args_str.split(",") if a.strip()] if args_str.strip() else []
            nid = make_id("FunctionDef")
            nodes.append({"id": nid, "type": "FunctionDef", "token": fn_name,
                          "depth": 2, "line_start": ln, "line_end": ln,
                          "num_children": 0, "context": "function"})
            edges.append({"source": root_id, "target": nid, "type": "AST"})
            functions.append({"name": fn_name, "args": args, "line_start": ln,
                              "line_end": ln, "num_statements": 0, "complexity": 1,
                              "has_return": False, "node_id": nid})
            continue

        # Control flow
        for kw, ntype in [("if", "If"), ("else", "Else"), ("for", "For"),
                          ("while", "While"), ("try", "Try"), ("catch", "Catch"),
                          ("finally", "Finally"), ("switch", "Switch")]:
            if re.match(rf'\b{kw}\b', stripped):
                nid = make_id(ntype)
                nodes.append({"id": nid, "type": ntype, "token": kw,
                              "depth": 3, "line_start": ln, "line_end": ln,
                              "num_children": 0, "context": "control"})
                edges.append({"source": root_id, "target": nid, "type": "AST"})
                if len(nodes) > 2:
                    cfg_edges.append({"source": nodes[-2]["id"], "target": nid, "type": "CFG", "label": "flow"})
                break

        # Return
        if re.match(r'\breturn\b', stripped):
            nid = make_id("Return")
            nodes.append({"id": nid, "type": "Return", "token": "return",
                          "depth": 3, "line_start": ln, "line_end": ln,
                          "num_children": 0, "context": "return"})
            edges.append({"source": root_id, "target": nid, "type": "AST"})
            if functions:
                functions[-1]["has_return"] = True

        # Variable assignment
        m = re.match(r'(?:(?:int|long|double|float|boolean|String|char|byte|short|var|final)\s+)?'
                     r'(\w+)\s*=\s*(.+)\s*;', stripped)
        if m and m.group(1) not in ('if', 'else', 'for', 'while', 'return', 'try'):
            var = m.group(1)
            nid = make_id("Assign")
            nodes.append({"id": nid, "type": "Assign", "token": var,
                          "depth": 3, "line_start": ln, "line_end": ln,
                          "num_children": 0, "context": "Store"})
            edges.append({"source": root_id, "target": nid, "type": "AST"})
            stores[var] = stores.get(var, []) + [nid]

            # DFG — detect uses of previously stored vars
            for sv, sids in stores.items():
                if sv in m.group(2) and sv != var:
                    use_id = make_id("Name")
                    nodes.append({"id": use_id, "type": "Name", "token": sv,
                                  "depth": 4, "line_start": ln, "line_end": ln,
                                  "num_children": 0, "context": "Load"})
                    for sid in sids:
                        dfg_edges.append({"source": sid, "target": use_id, "type": "DFG", "variable": sv})

        # Method call
        m = re.match(r'(?:\w+\.)*(\w+)\s*\(', stripped)
        if m and m.group(1) not in ('if', 'for', 'while', 'switch', 'catch',
                                     'class', 'return', 'try', 'finally', 'else'):
            nid = make_id("Call")
            nodes.append({"id": nid, "type": "Call", "token": m.group(1),
                          "depth": 3, "line_start": ln, "line_end": ln,
                          "num_children": 0, "context": "call"})
            edges.append({"source": root_id, "target": nid, "type": "AST"})

    return {
        "nodes": nodes,
        "edges": edges,
        "cfg_edges": cfg_edges,
        "dfg_edges": dfg_edges,
        "functions": functions,
        "language": "Java",
    }
