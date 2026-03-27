"""
C/C++ Parser — regex-based AST for C and C++ source files.
"""
import re


def parse(source_code: str, filename: str = "unknown.cpp") -> dict:
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
    root_id = make_id("TranslationUnit")
    nodes.append({"id": root_id, "type": "TranslationUnit", "token": filename,
                  "depth": 0, "line_start": 1, "line_end": len(lines),
                  "num_children": 0, "context": "root"})

    stores = {}
    mem_alloc_nodes = []
    mem_free_nodes = []
    in_function = None

    for i, line in enumerate(lines):
        ln = i + 1
        stripped = line.strip()
        if not stripped or stripped.startswith("//"):
            continue

        # Preprocessor
        m = re.match(r'#include\s*[<"]([^>"]+)[>"]', stripped)
        if m:
            nid = make_id("Include")
            nodes.append({"id": nid, "type": "Include", "token": m.group(1),
                          "depth": 1, "line_start": ln, "line_end": ln,
                          "num_children": 0, "context": "import"})
            edges.append({"source": root_id, "target": nid, "type": "AST"})
            continue

        # Class/struct definition
        m = re.match(r'(?:class|struct)\s+(\w+)', stripped)
        if m:
            nid = make_id("ClassDef")
            nodes.append({"id": nid, "type": "ClassDef", "token": m.group(1),
                          "depth": 1, "line_start": ln, "line_end": ln,
                          "num_children": 0, "context": "class"})
            edges.append({"source": root_id, "target": nid, "type": "AST"})
            continue

        # Function definition (return type + name + params)
        m = re.match(r'(?:(?:inline|static|virtual|explicit|constexpr|extern|auto)\s+)*'
                     r'(?:(?:const\s+)?[\w:*&<>, ]+\s+)(\w+)\s*\(([^)]*)\)\s*(?:const\s*)?(?:override\s*)?[{;]',
                     stripped)
        if m and m.group(1) not in ('if', 'else', 'for', 'while', 'switch',
                                     'catch', 'main', 'return', 'sizeof', 'delete'):
            fn_name = m.group(1)
            args_str = m.group(2)
            args = [a.strip().split()[-1].lstrip('*&') for a in args_str.split(",")
                    if a.strip()] if args_str.strip() else []
            nid = make_id("FunctionDef")
            nodes.append({"id": nid, "type": "FunctionDef", "token": fn_name,
                          "depth": 1, "line_start": ln, "line_end": ln,
                          "num_children": 0, "context": "function"})
            edges.append({"source": root_id, "target": nid, "type": "AST"})
            in_function = {"name": fn_name, "args": args, "line_start": ln,
                           "line_end": ln, "num_statements": 0, "complexity": 1,
                           "has_return": False, "node_id": nid}
            functions.append(in_function)
            continue

        # Control flow
        for kw, ntype in [("if", "If"), ("else", "Else"), ("for", "For"),
                          ("while", "While"), ("switch", "Switch"), ("try", "Try"),
                          ("catch", "Catch")]:
            if re.match(rf'^\b{kw}\b', stripped):
                nid = make_id(ntype)
                nodes.append({"id": nid, "type": ntype, "token": kw,
                              "depth": 3, "line_start": ln, "line_end": ln,
                              "num_children": 0, "context": "control"})
                edges.append({"source": root_id, "target": nid, "type": "AST"})
                if in_function:
                    in_function["complexity"] += 1
                if len(nodes) > 2:
                    cfg_edges.append({"source": nodes[-2]["id"], "target": nid, "type": "CFG", "label": "flow"})
                break

        # Return
        if re.match(r'^\breturn\b', stripped):
            nid = make_id("Return")
            nodes.append({"id": nid, "type": "Return", "token": "return",
                          "depth": 3, "line_start": ln, "line_end": ln,
                          "num_children": 0, "context": "return"})
            edges.append({"source": root_id, "target": nid, "type": "AST"})
            if in_function:
                in_function["has_return"] = True

        # Memory allocation
        if re.search(r'\bnew\b|\bmalloc\s*\(|\bcalloc\s*\(|\brealloc\s*\(', stripped):
            nid = make_id("MemAlloc")
            nodes.append({"id": nid, "type": "MemAlloc", "token": "malloc/new",
                          "depth": 3, "line_start": ln, "line_end": ln,
                          "num_children": 0, "context": "alloc"})
            edges.append({"source": root_id, "target": nid, "type": "AST"})
            mem_alloc_nodes.append(nid)

        # Memory free
        if re.search(r'\bdelete\b|\bfree\s*\(', stripped):
            nid = make_id("MemFree")
            nodes.append({"id": nid, "type": "MemFree", "token": "free/delete",
                          "depth": 3, "line_start": ln, "line_end": ln,
                          "num_children": 0, "context": "free"})
            edges.append({"source": root_id, "target": nid, "type": "AST"})
            mem_free_nodes.append(nid)

        # Variable assignment
        m = re.match(r'(?:(?:int|long|double|float|char|bool|auto|size_t|string|void\*)\s+)'
                     r'(\w+)\s*=\s*(.+)\s*;', stripped)
        if m and m.group(1) not in ('if', 'else', 'for', 'while', 'return'):
            var = m.group(1)
            nid = make_id("Assign")
            nodes.append({"id": nid, "type": "Assign", "token": var,
                          "depth": 3, "line_start": ln, "line_end": ln,
                          "num_children": 0, "context": "Store"})
            edges.append({"source": root_id, "target": nid, "type": "AST"})
            stores[var] = stores.get(var, []) + [nid]
            for sv, sids in stores.items():
                if sv in m.group(2) and sv != var:
                    use_id = make_id("Name")
                    nodes.append({"id": use_id, "type": "Name", "token": sv,
                                  "depth": 4, "line_start": ln, "line_end": ln,
                                  "num_children": 0, "context": "Load"})
                    for sid in sids:
                        dfg_edges.append({"source": sid, "target": use_id, "type": "DFG", "variable": sv})

        if in_function:
            in_function["num_statements"] += 1

    return {
        "nodes": nodes,
        "edges": edges,
        "cfg_edges": cfg_edges,
        "dfg_edges": dfg_edges,
        "functions": functions,
        "language": "C/C++",
        "_mem_alloc_nodes": mem_alloc_nodes,
        "_mem_free_nodes": mem_free_nodes,
    }
