"""
GAT Model — Graph Attention Network defect detector.
Pure NumPy implementation, no ML framework required.
Weights are Xavier-initialized with fixed seeds (deterministic, not trained).
"""
import hashlib
import math
import numpy as np

INPUT_DIM = 64
HIDDEN_DIM = 128
OUTPUT_DIM = 4   # Bug-Prone, Code Smell, Design Inefficiency, Clean
NUM_HEADS = 4
NUM_LAYERS = 3

CATEGORIES = ["Bug-Prone", "Code Smell", "Design Inefficiency", "Clean"]
CAT_IDX = {c: i for i, c in enumerate(CATEGORIES)}


def _xavier_matrix(in_dim, out_dim, seed_str):
    seed = int(hashlib.md5(seed_str.encode()).hexdigest()[:8], 16)
    rng = np.random.default_rng(seed)
    scale = math.sqrt(2.0 / (in_dim + out_dim))
    return (rng.standard_normal((out_dim, in_dim)) * scale).astype(np.float32)


def _leaky_relu(x, alpha=0.2):
    return np.where(x >= 0, x, alpha * x)


def _softmax(x):
    x = x - np.max(x)
    e = np.exp(x)
    s = e.sum()
    return e / (s + 1e-9)


class GATLayer:
    """Single GAT layer with per-(edge_type, head) weight matrices."""

    EDGE_TYPES = ["AST", "CFG", "DFG"]

    def __init__(self, in_dim, out_dim, num_heads, layer_idx):
        head_dim = out_dim // num_heads
        self.in_dim = in_dim
        self.out_dim = out_dim
        self.num_heads = num_heads
        self.head_dim = head_dim
        self.layer_idx = layer_idx

        # Weight matrices: W[etype][head] shape (head_dim, in_dim)
        self.W = {}
        # Attention vectors: a[etype][head] shape (2*head_dim,)
        self.a = {}

        for etype in self.EDGE_TYPES:
            self.W[etype] = []
            self.a[etype] = []
            for h in range(num_heads):
                seed_str = f"W_{etype}_{layer_idx}_{h}"
                w = _xavier_matrix(in_dim, head_dim, seed_str)
                self.W[etype].append(w)

                seed_str_a = f"a_{etype}_{layer_idx}_{h}"
                seed_a = int(hashlib.md5(seed_str_a.encode()).hexdigest()[:8], 16)
                rng_a = np.random.default_rng(seed_a)
                av = rng_a.standard_normal(2 * head_dim).astype(np.float32)
                self.a[etype].append(av / (np.linalg.norm(av) + 1e-8))

    def forward(self, H, typed_adjacency, node_ids):
        """
        H: np.ndarray [N × in_dim]
        typed_adjacency: {etype: {target_id: [source_ids]}}
        node_ids: list of N node ids

        Returns: np.ndarray [N × out_dim], attention_weights dict
        """
        N = H.shape[0]
        id2idx = {nid: i for i, nid in enumerate(node_ids)}
        out = np.zeros((N, self.out_dim), dtype=np.float32)
        attention_weights = {}  # key: "etype:src->tgt", value: float

        for etype in self.EDGE_TYPES:
            adj = typed_adjacency.get(etype, {})
            head_outs = []

            for h in range(self.num_heads):
                W_h = self.W[etype][h]   # (head_dim, in_dim)
                a_h = self.a[etype][h]   # (2*head_dim,)

                # Project all nodes
                H_proj = (W_h @ H.T).T  # (N, head_dim)

                head_out = np.zeros((N, self.head_dim), dtype=np.float32)

                for tgt_id, src_ids in adj.items():
                    tgt_idx = id2idx.get(tgt_id)
                    if tgt_idx is None:
                        continue

                    # Get valid neighbors
                    nbr_idx = [id2idx[s] for s in src_ids if s in id2idx]
                    if not nbr_idx:
                        head_out[tgt_idx] += H_proj[tgt_idx]
                        continue

                    h_tgt = H_proj[tgt_idx]   # (head_dim,)

                    # Compute attention scores
                    scores = []
                    for ni in nbr_idx:
                        h_src = H_proj[ni]
                        cat_v = np.concatenate([h_src, h_tgt])
                        score = float(np.dot(a_h, cat_v))
                        score = _leaky_relu(np.array([score]))[0]
                        scores.append(score)

                    scores_arr = np.array(scores, dtype=np.float32)
                    alphas = _softmax(scores_arr)

                    # Aggregate
                    agg = np.zeros(self.head_dim, dtype=np.float32)
                    for k, ni in enumerate(nbr_idx):
                        agg += alphas[k] * H_proj[ni]
                        key = f"{etype}:{node_ids[ni]}->{tgt_id}"
                        attention_weights[key] = float(alphas[k])

                    head_out[tgt_idx] = agg

                head_outs.append(head_out)

            # Concatenate heads
            if head_outs:
                cat_heads = np.concatenate(head_outs, axis=1)  # (N, out_dim)
                out += cat_heads

        # LeakyReLU activation
        out = _leaky_relu(out)
        return out, attention_weights


class GATDefectDetector:
    """Multi-layer GAT + MLP classifier + heuristic hybrid."""

    def __init__(self):
        # GAT layers: 64→128, 128→128, 128→128
        dims = [
            (INPUT_DIM, HIDDEN_DIM),
            (HIDDEN_DIM, HIDDEN_DIM),
            (HIDDEN_DIM, HIDDEN_DIM),
        ]
        self.gat_layers = [
            GATLayer(in_d, out_d, NUM_HEADS, li)
            for li, (in_d, out_d) in enumerate(dims)
        ]

        # MLP: 128→64→4
        self.W_mlp1 = _xavier_matrix(HIDDEN_DIM, 64, "mlp_w1")
        self.W_mlp2 = _xavier_matrix(64, OUTPUT_DIM, "mlp_w2")
        self.b_mlp1 = np.zeros(64, dtype=np.float32)
        self.b_mlp2 = np.zeros(OUTPUT_DIM, dtype=np.float32)

    def _forward_gat(self, H, typed_adjacency, node_ids):
        all_attn = {}
        for layer in self.gat_layers:
            H, attn = layer.forward(H, typed_adjacency, node_ids)
            all_attn.update(attn)
        # MLP
        h1 = _leaky_relu((self.W_mlp1 @ H.T).T + self.b_mlp1)
        logits = (self.W_mlp2 @ h1.T).T + self.b_mlp2
        return logits, all_attn

    def predict(self, encoded_features, program_graph):
        """
        Run heuristic analysis, then augment with GAT confidence.

        Args:
            encoded_features: (node_ids: list, H: np.ndarray [N×64])
            program_graph: output from ProgramGraphBuilder.build()

        Returns:
            list of issue dicts
        """
        node_ids, H = encoded_features
        if len(node_ids) == 0:
            return []

        typed_adjacency = program_graph.get("typed_adjacency", {})
        node_features_raw = program_graph.get("node_features_raw", {})
        functions = program_graph.get("functions", [])

        # Run GAT forward pass
        try:
            logits, all_attn = self._forward_gat(H, typed_adjacency, node_ids)
        except Exception:
            logits = np.zeros((len(node_ids), OUTPUT_DIM), dtype=np.float32)
            all_attn = {}

        id2idx = {nid: i for i, nid in enumerate(node_ids)}

        # Run heuristic analysis
        candidate_issues = self._run_heuristic_analysis(
            node_features_raw, functions, node_ids, program_graph
        )

        issues = []
        for issue in candidate_issues:
            nid = issue.get("node_id")
            cat = issue.get("category", "Code Smell")
            cat_idx = CAT_IDX.get(cat, 1)
            clean_idx = CAT_IDX["Clean"]

            # Boost GAT logit for the issue node
            node_logits = np.zeros(OUTPUT_DIM, dtype=np.float32)
            if nid and nid in id2idx:
                node_logits = logits[id2idx[nid]].copy()
            node_logits[cat_idx] += 2.0
            node_logits[clean_idx] -= 1.5

            conf = _softmax(node_logits)[cat_idx]
            conf = float(min(conf, 0.98))

            # Top-5 attention weights for this node
            node_attn = {}
            if nid:
                for k, v in all_attn.items():
                    if nid in k:
                        node_attn[k] = v
            top_attn = dict(sorted(node_attn.items(), key=lambda x: -x[1])[:5])

            issues.append({
                "category": cat,
                "confidence": round(conf, 4),
                "severity": issue.get("severity", "warning"),
                "line_start": issue.get("line_start", 1),
                "line_end": issue.get("line_end", 1),
                "node_type": issue.get("node_type", "Unknown"),
                "description": issue.get("description", ""),
                "suggestion": issue.get("suggestion", ""),
                "attention_weights": top_attn,
                "structural_context": issue.get("structural_context", ""),
                "pattern": issue.get("pattern", ""),
            })

        return issues

    def _run_heuristic_analysis(self, node_features_raw, functions, node_ids, program_graph):
        """Run 8 pattern-based heuristic rules on the program graph."""
        issues = []

        # Build reverse lookup: node_id → features
        nfr = node_features_raw

        # Rule 1: high_complexity — cyclomatic > 10
        for fn in functions:
            if fn.get("complexity", 0) > 10:
                issues.append({
                    "node_id": fn.get("node_id"),
                    "category": "Code Smell",
                    "severity": "warning",
                    "pattern": "high_complexity",
                    "line_start": fn.get("line_start", 1),
                    "line_end": fn.get("line_end", 1),
                    "node_type": "FunctionDef",
                    "description": f"Function '{fn['name']}' has cyclomatic complexity {fn['complexity']} (threshold: 10).",
                    "suggestion": "Break this function into smaller, more focused functions.",
                    "structural_context": f"complexity={fn['complexity']}, branches detected",
                })

        # Rule 2: god_function — > 50 statements
        for fn in functions:
            if fn.get("num_statements", 0) > 50:
                issues.append({
                    "node_id": fn.get("node_id"),
                    "category": "Design Inefficiency",
                    "severity": "info",
                    "pattern": "god_function",
                    "line_start": fn.get("line_start", 1),
                    "line_end": fn.get("line_end", 1),
                    "node_type": "FunctionDef",
                    "description": f"Function '{fn['name']}' has {fn['num_statements']} statements (threshold: 50).",
                    "suggestion": "Apply the Single Responsibility Principle. Extract cohesive sub-tasks into helpers.",
                    "structural_context": f"statements={fn['num_statements']}",
                })

        # Rule 3: long_parameter_list — > 5 args
        for fn in functions:
            nargs = len(fn.get("args", []))
            if nargs > 5:
                issues.append({
                    "node_id": fn.get("node_id"),
                    "category": "Code Smell",
                    "severity": "info",
                    "pattern": "long_parameter_list",
                    "line_start": fn.get("line_start", 1),
                    "line_end": fn.get("line_end", 1),
                    "node_type": "FunctionDef",
                    "description": f"Function '{fn['name']}' has {nargs} parameters (threshold: 5).",
                    "suggestion": "Introduce a parameter object or data class to group related parameters.",
                    "structural_context": f"params={fn['args']}",
                })

        # Rule 4: missing_return (hard) — non-dunder, non-test function with ≥2 stmts and no return
        for fn in functions:
            name = fn.get("name", "")
            is_dunder = name.startswith("__") and name.endswith("__")
            is_test = name.startswith("test_") or name.startswith("Test")
            if not is_dunder and not is_test and fn.get("num_statements", 0) >= 2 and not fn.get("has_return", True):
                issues.append({
                    "node_id": fn.get("node_id"),
                    "category": "Bug-Prone",
                    "severity": "critical",
                    "pattern": "missing_return",
                    "line_start": fn.get("line_start", 1),
                    "line_end": fn.get("line_end", 1),
                    "node_type": "FunctionDef",
                    "description": f"Function '{name}' has no return statement despite having {fn['num_statements']} statements.",
                    "suggestion": "Ensure all code paths return an appropriate value or raise an exception.",
                    "structural_context": f"statements={fn['num_statements']}, has_return=False",
                })

        # Rule 5: missing_return (soft) — branches but fewer returns than branches
        for fn in functions:
            name = fn.get("name", "")
            complexity = fn.get("complexity", 1)
            has_return = fn.get("has_return", True)
            if complexity > 2 and not has_return:
                issues.append({
                    "node_id": fn.get("node_id"),
                    "category": "Bug-Prone",
                    "severity": "warning",
                    "pattern": "missing_return",
                    "line_start": fn.get("line_start", 1),
                    "line_end": fn.get("line_end", 1),
                    "node_type": "FunctionDef",
                    "description": f"Function '{name}' has branching logic (complexity={complexity}) but may be missing return statements on some paths.",
                    "suggestion": "Add explicit return statements to all code paths.",
                    "structural_context": f"complexity={complexity}",
                })

        # Rule 6: deep_nesting — If/For/While node at depth > 5
        for nid in node_ids:
            feat = nfr.get(nid, {})
            ntype = feat.get("type", "")
            if ntype in ("If", "For", "While") and feat.get("depth", 0) > 5:
                issues.append({
                    "node_id": nid,
                    "category": "Code Smell",
                    "severity": "warning",
                    "pattern": "deep_nesting",
                    "line_start": feat.get("line_start", 1),
                    "line_end": feat.get("line_end", 1),
                    "node_type": ntype,
                    "description": f"Control flow node '{ntype}' found at nesting depth {feat['depth']} (threshold: 5).",
                    "suggestion": "Reduce nesting using early returns, guard clauses, or helper functions.",
                    "structural_context": f"depth={feat['depth']}",
                })

        # Rule 7: unbalanced_resource — MemAlloc with no MemFree
        mem_alloc_ids = [nid for nid in node_ids if nfr.get(nid, {}).get("type") == "MemAlloc"]
        mem_free_count = sum(1 for nid in node_ids if nfr.get(nid, {}).get("type") == "MemFree")
        if mem_alloc_ids and mem_free_count == 0:
            for nid in mem_alloc_ids:
                feat = nfr.get(nid, {})
                issues.append({
                    "node_id": nid,
                    "category": "Bug-Prone",
                    "severity": "critical",
                    "pattern": "unbalanced_resource",
                    "line_start": feat.get("line_start", 1),
                    "line_end": feat.get("line_end", 1),
                    "node_type": "MemAlloc",
                    "description": "Memory allocation detected with no corresponding deallocation.",
                    "suggestion": "Ensure every allocation has a matching free/delete, or use RAII / smart pointers.",
                    "structural_context": f"alloc_nodes={len(mem_alloc_ids)}, free_nodes={mem_free_count}",
                })

        # Rule 8: unused_variable — Store-context nodes with no outgoing DFG edges
        dfg_adj = program_graph.get("typed_adjacency", {}).get("DFG", {})
        dfg_sources = set()
        for tgt, srcs in dfg_adj.items():
            dfg_sources.update(srcs)

        for nid in node_ids:
            feat = nfr.get(nid, {})
            if feat.get("context") == "Store" and nid not in dfg_sources:
                token = feat.get("token", "?")
                if token and not token.startswith("_"):  # ignore _ prefix (intentional)
                    issues.append({
                        "node_id": nid,
                        "category": "Code Smell",
                        "severity": "warning",
                        "pattern": "unused_variable",
                        "line_start": feat.get("line_start", 1),
                        "line_end": feat.get("line_end", 1),
                        "node_type": feat.get("type", "Assign"),
                        "description": f"Variable '{token}' is assigned but never used.",
                        "suggestion": "Remove unused variable assignments to reduce noise and potential bugs.",
                        "structural_context": f"token={token}, context=Store, dfg_uses=0",
                    })

        # Deduplicate (same pattern + same node)
        seen = set()
        deduped = []
        for issue in issues:
            key = (issue.get("pattern"), issue.get("node_id"))
            if key not in seen:
                seen.add(key)
                deduped.append(issue)

        return deduped
