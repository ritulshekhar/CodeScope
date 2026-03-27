"""
Graph Exporter — import/framework detection and D3 force-simulation graph export.
"""
import ast
import re

# Framework database: module_name → (display_name, category)
FRAMEWORK_DB = {
    # Python web
    "flask": ("Flask", "web"), "django": ("Django", "web"),
    "fastapi": ("FastAPI", "web"), "aiohttp": ("aiohttp", "web"),
    "tornado": ("Tornado", "web"), "bottle": ("Bottle", "web"),
    "starlette": ("Starlette", "web"), "sanic": ("Sanic", "web"),
    # Python ML
    "tensorflow": ("TensorFlow", "ml"), "torch": ("PyTorch", "ml"),
    "keras": ("Keras", "ml"), "sklearn": ("scikit-learn", "ml"),
    "scikit_learn": ("scikit-learn", "ml"), "xgboost": ("XGBoost", "ml"),
    "lightgbm": ("LightGBM", "ml"), "catboost": ("CatBoost", "ml"),
    "transformers": ("HuggingFace", "ml"), "diffusers": ("Diffusers", "ml"),
    "gym": ("OpenAI Gym", "ml"), "stable_baselines3": ("StableBaselines3", "ml"),
    # Python data
    "numpy": ("NumPy", "data"), "pandas": ("Pandas", "data"),
    "scipy": ("SciPy", "data"), "polars": ("Polars", "data"),
    "pyarrow": ("PyArrow", "data"), "dask": ("Dask", "data"),
    # Python viz
    "matplotlib": ("Matplotlib", "viz"), "seaborn": ("Seaborn", "viz"),
    "plotly": ("Plotly", "viz"), "bokeh": ("Bokeh", "viz"),
    "altair": ("Altair", "viz"), "d3": ("D3.js", "viz"),
    # Python db
    "sqlalchemy": ("SQLAlchemy", "db"), "pymongo": ("PyMongo", "db"),
    "redis": ("Redis", "db"), "psycopg2": ("psycopg2", "db"),
    "pymysql": ("PyMySQL", "db"), "motor": ("Motor", "db"),
    "elasticsearch": ("Elasticsearch", "db"), "cassandra": ("Cassandra", "db"),
    # Python http
    "requests": ("Requests", "http"), "httpx": ("httpx", "http"),
    "aiohttp": ("aiohttp", "http"), "urllib3": ("urllib3", "http"),
    "grpc": ("gRPC", "http"), "pika": ("Pika/RabbitMQ", "http"),
    # Python test
    "pytest": ("pytest", "test"), "unittest": ("unittest", "test"),
    "mock": ("mock", "test"), "hypothesis": ("Hypothesis", "test"),
    # JS web
    "react": ("React", "web"), "vue": ("Vue.js", "web"),
    "angular": ("Angular", "web"), "svelte": ("Svelte", "web"),
    "next": ("Next.js", "web"), "nuxt": ("Nuxt.js", "web"),
    "gatsby": ("Gatsby", "web"), "remix": ("Remix", "web"),
    "express": ("Express.js", "web"), "koa": ("Koa", "web"),
    "fastify": ("Fastify", "web"), "nestjs": ("NestJS", "web"),
    # JS state / util
    "redux": ("Redux", "web"), "mobx": ("MobX", "web"),
    "zustand": ("Zustand", "web"), "react-query": ("React Query", "web"),
    "axios": ("Axios", "http"), "fetch": ("fetch", "http"),
    "lodash": ("Lodash", "util"), "underscore": ("Underscore", "util"),
    "moment": ("Moment.js", "util"), "dayjs": ("Day.js", "util"),
    "date-fns": ("date-fns", "util"),
    # JS test
    "jest": ("Jest", "test"), "mocha": ("Mocha", "test"),
    "chai": ("Chai", "test"), "cypress": ("Cypress", "test"),
    "playwright": ("Playwright", "test"), "vitest": ("Vitest", "test"),
    # JS DB
    "mongoose": ("Mongoose", "db"), "sequelize": ("Sequelize", "db"),
    "prisma": ("Prisma", "db"), "typeorm": ("TypeORM", "db"),
    "knex": ("Knex.js", "db"),
    # Java
    "spring": ("Spring", "web"), "junit": ("JUnit", "test"),
    "hibernate": ("Hibernate", "db"), "jackson": ("Jackson", "util"),
    "log4j": ("Log4j", "util"), "slf4j": ("SLF4J", "util"),
    # Std lib (skip)
    "os": None, "sys": None, "re": None, "json": None,
    "math": None, "time": None, "datetime": None,
    "collections": None, "itertools": None, "functools": None,
    "pathlib": None, "io": None, "abc": None, "typing": None,
    "copy": None, "hashlib": None, "random": None, "string": None,
    "threading": None, "multiprocessing": None, "subprocess": None,
    "socket": None, "struct": None, "base64": None, "csv": None,
    "logging": None, "warnings": None, "traceback": None,
    "inspect": None, "ast": None, "types": None, "enum": None,
}

# Node color palette by type
NODE_COLORS = {
    "Module": "#6366F1", "CompilationUnit": "#6366F1", "TranslationUnit": "#6366F1",
    "FunctionDef": "#3B82F6", "ArrowFunction": "#60A5FA", "AsyncFunctionDef": "#2563EB",
    "ClassDef": "#A855F7",
    "If": "#F59E0B", "For": "#FBBF24", "While": "#F97316", "Switch": "#F97316",
    "Try": "#FB923C", "Catch": "#F87171", "Finally": "#FCA5A5",
    "Return": "#22C55E",
    "Import": "#8B5CF6", "ImportFrom": "#7C3AED",
    "Assign": "#64748B",
    "Call": "#EC4899",
    "MemAlloc": "#EF4444", "MemFree": "#10B981",
    "Name": "#94A3B8",
    "JSXElement": "#06B6D4",
    "Document": "#1E293B", "HTMLRoot": "#334155",
    "Stylesheet": "#0F172A", "Rule": "#1E40AF",
    "JSONDocument": "#065F46", "Object": "#047857",
}

NODE_SIZES = {
    "Module": 14, "CompilationUnit": 14, "TranslationUnit": 14,
    "ClassDef": 13, "FunctionDef": 12, "ArrowFunction": 11,
    "If": 8, "For": 8, "While": 8, "Try": 8, "Switch": 8,
    "Call": 7, "Return": 7, "Import": 7, "ImportFrom": 7,
}

PRIORITY_TYPES = {
    "FunctionDef", "ArrowFunction", "AsyncFunctionDef",
    "ClassDef", "If", "For", "While", "Return", "Call",
    "Assign", "Try", "Import", "ImportFrom", "MemAlloc",
    "Module", "CompilationUnit",
}

MAX_VIZ_NODES = 200


def detect_imports(source_code: str, language: str, filename: str = "") -> dict:
    """Detect imports and map to frameworks."""
    raw_imports = []

    if language == "Python":
        try:
            tree = ast.parse(source_code, filename=filename)
            for node in ast.walk(tree):
                if isinstance(node, ast.Import):
                    for alias in node.names:
                        raw_imports.append(alias.name.split(".")[0])
                elif isinstance(node, ast.ImportFrom):
                    if node.module:
                        raw_imports.append(node.module.split(".")[0])
        except SyntaxError:
            # fallback regex
            for m in re.finditer(r'^(?:import|from)\s+([\w.]+)', source_code, re.MULTILINE):
                raw_imports.append(m.group(1).split(".")[0])

    elif language == "Java":
        for m in re.finditer(r'import\s+([\w.]+)\s*;', source_code):
            parts = m.group(1).split(".")
            raw_imports.append(parts[0].lower())

    elif language == "C/C++":
        for m in re.finditer(r'#include\s*[<"]([^>"]+)[>"]', source_code):
            name = m.group(1).split(".")[0].split("/")[-1]
            raw_imports.append(name)

    elif language in ("JavaScript/TypeScript",):
        for m in re.finditer(
            r"""(?:import\s+(?:{[^}]*}|[\w*]+)\s+from\s+|require\s*\(\s*)['"]([\w@/.-]+)['"]""",
            source_code
        ):
            pkg = m.group(1).split("/")[0].lstrip("@")
            raw_imports.append(pkg)

    elif language == "HTML":
        for m in re.finditer(r'<script[^>]+src=["\']([^"\']+)["\']', source_code):
            raw_imports.append(m.group(1).split("/")[-1].split(".")[0])
        for m in re.finditer(r'<link[^>]+href=["\']([^"\']+)["\']', source_code):
            raw_imports.append(m.group(1).split("/")[-1].split(".")[0])

    elif language == "CSS":
        for m in re.finditer(r'@import\s+["\']([^"\']+)["\']', source_code):
            raw_imports.append(m.group(1).split("/")[-1].split(".")[0])

    # Deduplicate
    seen = set()
    unique_imports = []
    for imp in raw_imports:
        k = imp.lower().replace("-", "_")
        if k not in seen:
            seen.add(k)
            unique_imports.append(imp)

    # Map to frameworks
    frameworks = []
    categories = set()
    for imp in unique_imports:
        key = imp.lower().replace("-", "_")
        mapped = FRAMEWORK_DB.get(key)
        if mapped is not None:
            display, cat = mapped
            frameworks.append({"name": display, "category": cat, "module": imp})
            categories.add(cat)

    return {
        "imports": unique_imports,
        "frameworks": frameworks,
        "categories": sorted(categories),
        "import_count": len(unique_imports),
    }


def export_graph_for_viz(program_graph: dict, node_features_raw: dict) -> dict:
    """
    Export graph as D3-ready JSON (max 200 nodes, priority by type significance).

    Args:
        program_graph: output from ProgramGraphBuilder.build()
        node_features_raw: {node_id: feature_dict}

    Returns:
        {"nodes": [...], "edges": [...], "stats": {...}}
    """
    G = program_graph.get("graph")
    if G is None:
        return {"nodes": [], "edges": [], "stats": {}}

    all_node_ids = list(program_graph.get("node_ids", []))
    N = len(all_node_ids)

    # Priority selection
    if N > MAX_VIZ_NODES:
        priority = [nid for nid in all_node_ids
                    if node_features_raw.get(nid, {}).get("type") in PRIORITY_TYPES]
        rest = [nid for nid in all_node_ids if nid not in set(priority)]
        selected = (priority + rest)[:MAX_VIZ_NODES]
    else:
        selected = all_node_ids

    selected_set = set(selected)

    viz_nodes = []
    for nid in selected:
        feat = node_features_raw.get(nid, {})
        ntype = feat.get("type", "Unknown")
        token = (feat.get("token") or "")[:30]
        label = token if token else ntype

        viz_nodes.append({
            "id": nid,
            "type": ntype,
            "label": label,
            "token": token,
            "line": feat.get("line_start", 1),
            "depth": feat.get("depth", 0),
            "color": NODE_COLORS.get(ntype, "#94A3B8"),
            "size": NODE_SIZES.get(ntype, 5),
        })

    viz_edges = []
    edge_type_counts = {"AST": 0, "CFG": 0, "DFG": 0}
    for src, tgt, data in G.edges(data=True):
        if src in selected_set and tgt in selected_set:
            etype = data.get("type", "AST")
            edge_type_counts[etype] = edge_type_counts.get(etype, 0) + 1
            color = data.get("color", "#888888")
            dash = "5,5" if etype == "CFG" else ("2,4" if etype == "DFG" else "none")
            width = 2 if etype == "AST" else (1.5 if etype == "CFG" else 1)
            viz_edges.append({
                "source": src,
                "target": tgt,
                "type": etype,
                "color": color,
                "dash": dash,
                "width": width,
                "label": data.get("label", ""),
                "variable": data.get("variable", ""),
            })

    stats = {
        "total_nodes": len(viz_nodes),
        "total_edges": len(viz_edges),
        "ast_edges": edge_type_counts.get("AST", 0),
        "cfg_edges": edge_type_counts.get("CFG", 0),
        "dfg_edges": edge_type_counts.get("DFG", 0),
        "was_truncated": N > MAX_VIZ_NODES,
        "original_node_count": N,
    }

    return {"nodes": viz_nodes, "edges": viz_edges, "stats": stats}
