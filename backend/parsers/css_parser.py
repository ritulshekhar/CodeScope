"""
CSS Parser — rule-based AST for CSS and SCSS files.
"""
import re


def parse(source_code: str, filename: str = "unknown.css") -> dict:
    nodes = []
    edges = []
    counter = [0]

    def make_id(ntype):
        nid = f"{ntype}_{counter[0]:04d}"
        counter[0] += 1
        return nid

    lines = source_code.split("\n")
    root_id = make_id("Stylesheet")
    nodes.append({"id": root_id, "type": "Stylesheet", "token": filename,
                  "depth": 0, "line_start": 1, "line_end": len(lines),
                  "num_children": 0, "context": "root"})

    current_rule_id = None
    current_depth = 1
    in_rule = False

    for i, line in enumerate(lines):
        ln = i + 1
        stripped = line.strip()
        if not stripped or stripped.startswith("/*"):
            continue

        # @import
        m = re.match(r'@import\s+["\']([^"\']+)["\']', stripped)
        if m:
            nid = make_id("Import")
            nodes.append({"id": nid, "type": "Import", "token": m.group(1),
                          "depth": 1, "line_start": ln, "line_end": ln,
                          "num_children": 0, "context": "import"})
            edges.append({"source": root_id, "target": nid, "type": "AST"})
            continue

        # @media / @keyframes / @supports
        m = re.match(r'(@\w+)\s*(.*?)\s*\{?$', stripped)
        if m and not in_rule:
            nid = make_id("AtRule")
            nodes.append({"id": nid, "type": "AtRule", "token": m.group(1),
                          "depth": 1, "line_start": ln, "line_end": ln,
                          "num_children": 0, "context": m.group(2)[:30]})
            edges.append({"source": root_id, "target": nid, "type": "AST"})
            if "{" in stripped:
                current_rule_id = nid
                in_rule = True
                current_depth = 2
            continue

        # Selector rule start
        if "{" in stripped and not in_rule:
            selector = stripped.split("{")[0].strip()
            nid = make_id("Rule")
            nodes.append({"id": nid, "type": "Rule", "token": selector[:40],
                          "depth": 1, "line_start": ln, "line_end": ln,
                          "num_children": 0, "context": "selector"})
            edges.append({"source": root_id, "target": nid, "type": "AST"})

            sel_id = make_id("Selector")
            nodes.append({"id": sel_id, "type": "Selector", "token": selector[:40],
                          "depth": 2, "line_start": ln, "line_end": ln,
                          "num_children": 0, "context": ""})
            edges.append({"source": nid, "target": sel_id, "type": "AST"})

            current_rule_id = nid
            in_rule = True
            current_depth = 2

            # Inline declarations
            if "}" in stripped:
                decls_str = re.search(r'\{(.+)\}', stripped)
                if decls_str:
                    for decl in decls_str.group(1).split(";"):
                        decl = decl.strip()
                        if ":" in decl:
                            prop, val = decl.split(":", 1)
                            d_id = make_id("Declaration")
                            nodes.append({"id": d_id, "type": "Declaration", "token": prop.strip(),
                                          "depth": current_depth + 1, "line_start": ln, "line_end": ln,
                                          "num_children": 0, "context": val.strip()[:30]})
                            edges.append({"source": current_rule_id, "target": d_id, "type": "AST"})
                current_rule_id = None
                in_rule = False
            continue

        # Rule end
        if stripped == "}" and in_rule:
            in_rule = False
            current_rule_id = None
            current_depth = 1
            continue

        # Declaration inside rule
        if in_rule and current_rule_id and ":" in stripped:
            prop_val = stripped.rstrip(";")
            if ":" in prop_val:
                prop, val = prop_val.split(":", 1)
                d_id = make_id("Declaration")
                nodes.append({"id": d_id, "type": "Declaration", "token": prop.strip(),
                              "depth": current_depth + 1, "line_start": ln, "line_end": ln,
                              "num_children": 0, "context": val.strip()[:30]})
                edges.append({"source": current_rule_id, "target": d_id, "type": "AST"})

        # SCSS variable
        if stripped.startswith("$"):
            m = re.match(r'\$(\w+)\s*:', stripped)
            if m:
                nid = make_id("SCSSVariable")
                nodes.append({"id": nid, "type": "SCSSVariable", "token": m.group(1),
                              "depth": current_depth, "line_start": ln, "line_end": ln,
                              "num_children": 0, "context": "scss_var"})
                edges.append({"source": current_rule_id or root_id, "target": nid, "type": "AST"})

    return {
        "nodes": nodes,
        "edges": edges,
        "cfg_edges": [],
        "dfg_edges": [],
        "functions": [],
        "language": "CSS",
    }
