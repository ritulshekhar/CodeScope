"""
HTML Parser — tag-based AST for HTML/HTM files.
"""
import re


def parse(source_code: str, filename: str = "unknown.html") -> dict:
    nodes = []
    edges = []
    counter = [0]

    def make_id(ntype):
        nid = f"{ntype}_{counter[0]:04d}"
        counter[0] += 1
        return nid

    lines = source_code.split("\n")
    root_id = make_id("Document")
    nodes.append({"id": root_id, "type": "Document", "token": filename,
                  "depth": 0, "line_start": 1, "line_end": len(lines),
                  "num_children": 0, "context": "root"})

    tag_pattern = re.compile(r'<(/?)(\w[\w-]*)([^>]*?)(/?)>', re.DOTALL)
    stack = [(root_id, 0)]  # (parent_id, depth)

    for i, line in enumerate(lines):
        ln = i + 1
        for m in tag_pattern.finditer(line):
            closing = m.group(1) == "/"
            tag = m.group(2).lower()
            self_closing = m.group(4) == "/"
            attrs = m.group(3).strip()

            if closing:
                if len(stack) > 1:
                    stack.pop()
                continue

            parent_id, parent_depth = stack[-1]
            depth = parent_depth + 1

            # Choose type
            if tag in ("html",):
                ntype = "HTMLRoot"
            elif tag in ("head",):
                ntype = "Head"
            elif tag in ("body",):
                ntype = "Body"
            elif tag in ("script",):
                ntype = "Script"
            elif tag in ("link", "style"):
                ntype = "Style"
            elif tag in ("h1", "h2", "h3", "h4", "h5", "h6"):
                ntype = "Heading"
            elif tag in ("p", "div", "span", "section", "article", "main", "header", "footer", "nav", "aside"):
                ntype = "Element"
            elif tag in ("a",):
                ntype = "Link"
            elif tag in ("img",):
                ntype = "Image"
            elif tag in ("form", "input", "button", "select", "textarea", "label"):
                ntype = "FormElement"
            elif tag in ("table", "tr", "td", "th", "thead", "tbody"):
                ntype = "TableElement"
            elif tag in ("ul", "ol", "li"):
                ntype = "ListElement"
            else:
                ntype = "HTMLTag"

            nid = make_id(ntype)
            nodes.append({"id": nid, "type": ntype, "token": tag,
                          "depth": depth, "line_start": ln, "line_end": ln,
                          "num_children": 0, "context": attrs[:30] if attrs else ""})
            edges.append({"source": parent_id, "target": nid, "type": "AST"})

            if not self_closing and tag not in ("br", "hr", "img", "input", "meta", "link"):
                stack.append((nid, depth))

    return {
        "nodes": nodes,
        "edges": edges,
        "cfg_edges": [],
        "dfg_edges": [],
        "functions": [],
        "language": "HTML",
    }
