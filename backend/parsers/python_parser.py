"""
Python Parser — uses native ast module for full AST + CFG + DFG.
"""
import ast
import hashlib


def _make_id(prefix, counter):
    return f"{prefix}_{counter[0]:04d}"


def _inc(counter):
    counter[0] += 1
    return counter[0] - 1


def parse(source_code: str, filename: str = "unknown.py") -> dict:
    counter = [0]
    nodes = []
    edges = []
    cfg_edges = []
    dfg_edges = []
    functions = []

    try:
        tree = ast.parse(source_code, filename=filename)
    except SyntaxError as e:
        return {
            "nodes": [{"id": "root_0000", "type": "Module", "token": filename, "depth": 0,
                       "line_start": 1, "line_end": 1, "num_children": 0, "context": "root"}],
            "edges": [], "cfg_edges": [], "dfg_edges": [], "functions": [],
            "language": "Python", "error": str(e)
        }

    node_map = {}  # ast node id → graph node id

    def get_loc(node):
        ls = getattr(node, "lineno", 1)
        le = getattr(node, "end_lineno", ls)
        return ls, le

    def visit(node, parent_id=None, depth=0):
        ntype = type(node).__name__
        ls, le = get_loc(node)

        token = ""
        context = ""
        if isinstance(node, ast.Name):
            token = node.id
            context = ast.dump(node.ctx).split("(")[0]
        elif isinstance(node, ast.FunctionDef) or isinstance(node, ast.AsyncFunctionDef):
            token = node.name
            context = "FunctionDef"
        elif isinstance(node, ast.ClassDef):
            token = node.name
            context = "ClassDef"
        elif isinstance(node, ast.Import):
            token = ",".join(a.name for a in node.names)
            context = "import"
        elif isinstance(node, ast.ImportFrom):
            token = node.module or ""
            context = "import_from"
        elif isinstance(node, ast.Constant):
            token = str(node.value)[:30]
            context = "constant"
        elif isinstance(node, ast.Attribute):
            token = node.attr
            context = "attr"
        elif isinstance(node, ast.arg):
            token = node.arg
            context = "arg"
        elif isinstance(node, ast.Call):
            if isinstance(node.func, ast.Name):
                token = node.func.id
            elif isinstance(node.func, ast.Attribute):
                token = node.func.attr
            context = "call"
        elif isinstance(node, ast.Assign):
            context = "assign"
        elif isinstance(node, ast.Return):
            context = "return"

        nid = _make_id(ntype, counter)
        _inc(counter)

        children = list(ast.iter_child_nodes(node))
        graph_node = {
            "id": nid,
            "type": ntype,
            "token": token,
            "depth": depth,
            "line_start": ls,
            "line_end": le,
            "num_children": len(children),
            "context": context,
        }
        nodes.append(graph_node)
        node_map[id(node)] = nid

        if parent_id is not None:
            edges.append({"source": parent_id, "target": nid, "type": "AST"})

        for child in children:
            visit(child, nid, depth + 1)

        return nid

    visit(tree)

    # CFG pass — walk function bodies
    def build_cfg(func_node, func_nid):
        stmts = func_node.body
        if not stmts:
            return
        prev_ids = [node_map.get(id(stmts[0]))]

        for i, stmt in enumerate(stmts):
            snid = node_map.get(id(stmt))
            if snid is None:
                continue
            if i > 0:
                for prev in prev_ids:
                    if prev:
                        cfg_edges.append({"source": prev, "target": snid, "type": "CFG", "label": "seq"})
            prev_ids = [snid]

            if isinstance(stmt, ast.If):
                body_ids = [node_map.get(id(s)) for s in stmt.body if node_map.get(id(s))]
                else_ids = [node_map.get(id(s)) for s in stmt.orelse if node_map.get(id(s))]
                if body_ids:
                    cfg_edges.append({"source": snid, "target": body_ids[0], "type": "CFG", "label": "true"})
                if else_ids:
                    cfg_edges.append({"source": snid, "target": else_ids[0], "type": "CFG", "label": "false"})
                prev_ids = body_ids[-1:] + else_ids[-1:]

            elif isinstance(stmt, (ast.For, ast.While)):
                body_ids = [node_map.get(id(s)) for s in stmt.body if node_map.get(id(s))]
                if body_ids:
                    cfg_edges.append({"source": snid, "target": body_ids[0], "type": "CFG", "label": "loop"})
                    cfg_edges.append({"source": body_ids[-1], "target": snid, "type": "CFG", "label": "back"})
                prev_ids = [snid]  # exit edge

            elif isinstance(stmt, ast.Try):
                body_ids = [node_map.get(id(s)) for s in stmt.body if node_map.get(id(s))]
                handler_ids = []
                for h in stmt.handlers:
                    hid = node_map.get(id(h))
                    if hid:
                        handler_ids.append(hid)
                        cfg_edges.append({"source": snid, "target": hid, "type": "CFG", "label": "except"})
                prev_ids = body_ids[-1:] + handler_ids[-1:]

    # DFG pass — track variable stores and loads per scope
    def build_dfg(func_node):
        stores = {}  # var name → list of node ids that define it

        class DFGVisitor(ast.NodeVisitor):
            def visit_Name(self, node):
                nid = node_map.get(id(node))
                if nid is None:
                    return
                name = node.id
                if isinstance(node.ctx, ast.Store):
                    stores[name] = stores.get(name, []) + [nid]
                elif isinstance(node.ctx, ast.Load):
                    for def_id in stores.get(name, []):
                        dfg_edges.append({"source": def_id, "target": nid, "type": "DFG", "variable": name})
                self.generic_visit(node)

        DFGVisitor().visit(func_node)

    # Extract functions and build CFG/DFG per function
    func_id_counter = [0]
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            nid = node_map.get(id(node))
            if nid is None:
                continue
            args = [a.arg for a in node.args.args]
            num_stmts = len(node.body)
            # cyclomatic complexity
            complexity = 1
            for n in ast.walk(node):
                if isinstance(n, (ast.If, ast.For, ast.While, ast.ExceptHandler,
                                  ast.With, ast.Assert, ast.comprehension)):
                    complexity += 1
                elif isinstance(n, ast.BoolOp) and isinstance(n.op, (ast.And, ast.Or)):
                    complexity += len(n.values) - 1
            has_return = any(isinstance(n, ast.Return) for n in ast.walk(node))
            ls, le = get_loc(node)

            functions.append({
                "name": node.name,
                "args": args,
                "line_start": ls,
                "line_end": le,
                "num_statements": num_stmts,
                "complexity": complexity,
                "has_return": has_return,
                "node_id": nid,
            })
            build_cfg(node, nid)
            build_dfg(node)
            func_id_counter[0] += 1

    return {
        "nodes": nodes,
        "edges": edges,
        "cfg_edges": cfg_edges,
        "dfg_edges": dfg_edges,
        "functions": functions,
        "language": "Python",
    }
