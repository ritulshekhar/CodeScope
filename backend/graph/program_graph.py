"""
Program Graph Builder — assembles a typed NetworkX DiGraph from parser output.
Produces AST, CFG, and DFG edge types.
"""
import networkx as nx


EDGE_COLORS = {
    "AST": "#6366F1",   # Indigo
    "CFG": "#22C55E",   # Green
    "DFG": "#EF4444",   # Red
}


class ProgramGraphBuilder:

    def build(self, ast_data: dict, source_code: str = ""):
        """
        Build a NetworkX DiGraph from parsed AST data.

        Returns:
            graph          — networkx.DiGraph
            typed_adjacency — {type: {target: [sources]}}
            node_features_raw — {node_id: feature_dict}
            functions      — list of function metadata
        """
        G = nx.DiGraph()

        all_nodes = ast_data.get("nodes", [])
        ast_edges = ast_data.get("edges", [])
        cfg_edges = ast_data.get("cfg_edges", [])
        dfg_edges = ast_data.get("dfg_edges", [])
        functions = ast_data.get("functions", [])

        # Index nodes by id
        node_index = {n["id"]: n for n in all_nodes}

        # Add all nodes
        for n in all_nodes:
            G.add_node(n["id"], **n)

        # Add all edges with type labels
        def add_edges(edge_list, etype):
            for e in edge_list:
                src = e.get("source")
                tgt = e.get("target")
                if src and tgt and src in node_index and tgt in node_index:
                    G.add_edge(src, tgt, type=etype,
                               label=e.get("label", ""),
                               variable=e.get("variable", ""),
                               color=EDGE_COLORS.get(etype, "#888888"))

        add_edges(ast_edges, "AST")
        add_edges(cfg_edges, "CFG")
        add_edges(dfg_edges, "DFG")

        # Build typed adjacency: {type: {target: [sources]}}
        typed_adjacency = {"AST": {}, "CFG": {}, "DFG": {}}
        for src, tgt, data in G.edges(data=True):
            etype = data.get("type", "AST")
            if etype not in typed_adjacency:
                typed_adjacency[etype] = {}
            if tgt not in typed_adjacency[etype]:
                typed_adjacency[etype][tgt] = []
            typed_adjacency[etype][tgt].append(src)

        # Build node_features_raw
        node_features_raw = {}
        for nid, n in node_index.items():
            in_deg = G.in_degree(nid)
            out_deg = G.out_degree(nid)
            node_features_raw[nid] = {
                "type": n.get("type", "Unknown"),
                "token": n.get("token", ""),
                "depth": n.get("depth", 0),
                "in_degree": in_deg,
                "out_degree": out_deg,
                "line_start": n.get("line_start", 1),
                "line_end": n.get("line_end", 1),
                "context": n.get("context", ""),
                "num_children": n.get("num_children", 0),
            }

        return {
            "graph": G,
            "typed_adjacency": typed_adjacency,
            "node_features_raw": node_features_raw,
            "functions": functions,
            "node_ids": [n["id"] for n in all_nodes],
            "num_nodes": len(all_nodes),
            "num_edges": G.number_of_edges(),
            "ast_edges": len(ast_edges),
            "cfg_edges": len(cfg_edges),
            "dfg_edges": len(dfg_edges),
        }
