"""
ACRS — Automated Code Review System
Flask API Entry Point

Endpoints:
  GET  /api/health
  POST /api/analyze
  GET  /api/results/<scan_id>
  GET  /api/file/<scan_id>/<path:file_path>
  POST /api/benchmark
"""
import os
import sys
import hashlib
import traceback
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(__file__))

from flask import Flask, request, jsonify
from flask_cors import CORS

from parsers import python_parser, java_parser, cpp_parser, js_parser
from parsers import html_parser, css_parser, json_parser
from graph.program_graph import ProgramGraphBuilder
from graph.feature_encoder import FeatureEncoder
from models.gat_model import GATDefectDetector
from utils.repo_handler import RepoHandler
from utils.report_generator import ReportGenerator
from utils.graph_exporter import detect_imports, export_graph_for_viz

app = Flask(__name__)
CORS(app)

VERSION = "1.0.0"
SUPPORTED_LANGUAGES = ["Python", "Java", "C/C++", "JavaScript/TypeScript", "HTML", "CSS", "JSON"]

# In-memory cache: scan_id → result dict
RESULTS_CACHE = {}

# Singletons
_builder = ProgramGraphBuilder()
_encoder = FeatureEncoder()
_detector = GATDefectDetector()
_reporter = ReportGenerator()


# ─── Extension → parser mapping ────────────────────────────────────────────
EXT_MAP = {
    ".py":   ("Python",                python_parser),
    ".java": ("Java",                  java_parser),
    ".c":    ("C/C++",                 cpp_parser),
    ".h":    ("C/C++",                 cpp_parser),
    ".cpp":  ("C/C++",                 cpp_parser),
    ".hpp":  ("C/C++",                 cpp_parser),
    ".js":   ("JavaScript/TypeScript", js_parser),
    ".jsx":  ("JavaScript/TypeScript", js_parser),
    ".mjs":  ("JavaScript/TypeScript", js_parser),
    ".cjs":  ("JavaScript/TypeScript", js_parser),
    ".ts":   ("JavaScript/TypeScript", js_parser),
    ".tsx":  ("JavaScript/TypeScript", js_parser),
    ".html": ("HTML",                  html_parser),
    ".htm":  ("HTML",                  html_parser),
    ".css":  ("CSS",                   css_parser),
    ".scss": ("CSS",                   css_parser),
    ".json": ("JSON",                  json_parser),
}


def _analyze_single_file(file_meta: dict, source_code: str) -> dict:
    """Run the full analysis pipeline on one source file."""
    ext = file_meta.get("extension", ".py").lower()
    path = file_meta.get("path", "unknown")
    language, parser_mod = EXT_MAP.get(ext, ("Unknown", python_parser))

    lines = source_code.count("\n") + 1

    # [3a] Parse
    try:
        ast_data = parser_mod.parse(source_code, path)
    except Exception as e:
        ast_data = {"nodes": [], "edges": [], "cfg_edges": [],
                    "dfg_edges": [], "functions": [], "language": language, "error": str(e)}

    # [3b] Build program graph
    try:
        pg = _builder.build(ast_data, source_code)
    except Exception as e:
        pg = {"graph": None, "typed_adjacency": {}, "node_features_raw": {},
              "functions": [], "node_ids": [], "num_nodes": 0, "num_edges": 0,
              "ast_edges": 0, "cfg_edges": 0, "dfg_edges": 0}

    # [3c] Encode features
    try:
        encoded = _encoder.encode(pg)
    except Exception:
        encoded = ([], [])

    # [3d] GAT defect detection
    try:
        issues = _detector.predict(encoded, pg)
    except Exception as e:
        issues = []

    # [3e] Import detection + graph export
    try:
        import_info = detect_imports(source_code, language, path)
    except Exception:
        import_info = {"imports": [], "frameworks": [], "categories": [], "import_count": 0}

    try:
        graph_viz = export_graph_for_viz(pg, pg.get("node_features_raw", {}))
    except Exception:
        graph_viz = {"nodes": [], "edges": [], "stats": {}}

    graph_info = {
        "num_nodes": pg.get("num_nodes", 0),
        "num_edges": pg.get("num_edges", 0),
        "ast_edges": pg.get("ast_edges", 0),
        "cfg_edges": pg.get("cfg_edges", 0),
        "dfg_edges": pg.get("dfg_edges", 0),
    }

    return {
        "path": path,
        "language": language,
        "lines": lines,
        "size_bytes": file_meta.get("size_bytes", 0),
        "issues": issues,
        "issue_count": len(issues),
        "imports": import_info,
        "graph_info": graph_info,
        "graph_viz": graph_viz,
        "source_preview": source_code[:2000],
    }


def _build_summary(files_data: list) -> dict:
    total_issues = 0
    bugs = 0
    code_smells = 0
    design_issues = 0
    clean = 0
    severity_dist = {"critical": 0, "warning": 0, "info": 0}
    language_breakdown = {}
    confidences = []

    for f in files_data:
        lang = f.get("language", "Unknown")
        if lang not in language_breakdown:
            language_breakdown[lang] = {"files": 0, "issues": 0}
        language_breakdown[lang]["files"] += 1

        file_issues = f.get("issues", [])
        total_issues += len(file_issues)
        language_breakdown[lang]["issues"] += len(file_issues)

        if not file_issues:
            clean += 1
        for iss in file_issues:
            cat = iss.get("category", "Code Smell")
            sev = iss.get("severity", "warning")
            conf = iss.get("confidence", 0.5)
            confidences.append(conf)
            severity_dist[sev] = severity_dist.get(sev, 0) + 1
            if cat == "Bug-Prone":
                bugs += 1
            elif cat == "Code Smell":
                code_smells += 1
            elif cat == "Design Inefficiency":
                design_issues += 1

    return {
        "total_issues": total_issues,
        "bugs": bugs,
        "code_smells": code_smells,
        "design_issues": design_issues,
        "clean": clean,
        "severity_distribution": severity_dist,
        "language_breakdown": language_breakdown,
        "confidence_avg": round(sum(confidences) / len(confidences), 4) if confidences else 0.0,
    }


# ─── Endpoints ──────────────────────────────────────────────────────────────

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status": "healthy",
        "version": VERSION,
        "supported_languages": SUPPORTED_LANGUAGES,
        "cached_scans": len(RESULTS_CACHE),
    })


@app.route("/api/analyze", methods=["POST"])
def analyze():
    data = request.get_json(force=True, silent=True) or {}
    repo_url = (data.get("repo_url") or "").strip()
    branch = (data.get("branch") or "").strip() or None

    if not repo_url:
        return jsonify({"error": "repo_url is required"}), 400

    # Scan ID
    ts = datetime.now(timezone.utc).isoformat()
    raw = f"{repo_url}:{branch}:{ts}"
    scan_id = hashlib.md5(raw.encode()).hexdigest()[:12]

    handler = RepoHandler()
    try:
        clone_path = handler.clone_repository(repo_url, branch)
        repo_info = handler.repo_info

        source_files = handler.discover_source_files(clone_path)
        if not source_files:
            return jsonify({"error": "No supported source files found in repository."}), 422

        files_data = []
        total_nodes = 0
        total_edges = 0
        graph_stats = {"total_ast_edges": 0, "total_cfg_edges": 0,
                       "total_dfg_edges": 0, "avg_graph_density": 0.0}

        for file_meta in source_files:
            src = handler.read_file(file_meta["abs_path"])
            if not src.strip():
                continue
            result = _analyze_single_file(file_meta, src)
            files_data.append(result)
            gi = result.get("graph_info", {})
            total_nodes += gi.get("num_nodes", 0)
            total_edges += gi.get("num_edges", 0)
            graph_stats["total_ast_edges"] += gi.get("ast_edges", 0)
            graph_stats["total_cfg_edges"] += gi.get("cfg_edges", 0)
            graph_stats["total_dfg_edges"] += gi.get("dfg_edges", 0)

        if total_nodes > 0:
            graph_stats["avg_graph_density"] = round(total_edges / total_nodes, 4)

        summary = _build_summary(files_data)
        report = _reporter.generate(files_data, summary)

        response = {
            "scan_id": scan_id,
            "repository": repo_info,
            "timestamp": ts,
            "files_analyzed": len(files_data),
            "total_nodes": total_nodes,
            "total_edges": total_edges,
            "files": files_data,
            "summary": summary,
            "graph_stats": graph_stats,
            "report": report,
        }

        RESULTS_CACHE[scan_id] = response
        return jsonify(response)

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
    finally:
        handler.cleanup()


@app.route("/api/results/<scan_id>", methods=["GET"])
def get_results(scan_id):
    result = RESULTS_CACHE.get(scan_id)
    if result is None:
        return jsonify({"error": "Scan not found or expired"}), 404
    return jsonify(result)


@app.route("/api/file/<scan_id>/<path:file_path>", methods=["GET"])
def get_file(scan_id, file_path):
    result = RESULTS_CACHE.get(scan_id)
    if result is None:
        return jsonify({"error": "Scan not found"}), 404
    for f in result.get("files", []):
        if f.get("path") == file_path:
            return jsonify(f)
    return jsonify({"error": "File not found in scan"}), 404


@app.route("/api/benchmark", methods=["POST"])
def run_benchmark():
    try:
        from models.benchmark import run_benchmark as _run
        results = _run()
        return jsonify(results)
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    print(f"ACRS Backend v{VERSION} starting on 0.0.0.0:5000")
    app.run(host="0.0.0.0", port=5000, debug=False, use_reloader=False)
