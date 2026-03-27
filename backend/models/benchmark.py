"""
Benchmark — 20-sample evaluation suite for the ACRS GAT defect detector.
"""
import time
import numpy as np
from parsers.python_parser import parse as py_parse
from graph.program_graph import ProgramGraphBuilder
from graph.feature_encoder import FeatureEncoder
from models.gat_model import GATDefectDetector, CATEGORIES

SAMPLES = [
    # Bug-Prone: missing_return (5)
    {
        "id": "bp_001", "label": "Bug-Prone", "pattern": "missing_return",
        "code": '''
def divide(a, b):
    if b == 0:
        print("Cannot divide by zero")
    else:
        result = a / b
''',
    },
    {
        "id": "bp_002", "label": "Bug-Prone", "pattern": "missing_return",
        "code": '''
def get_status(code):
    if code == 200:
        status = "OK"
    elif code == 404:
        status = "Not Found"
    elif code == 500:
        status = "Server Error"
    process(status)
''',
    },
    {
        "id": "bp_003", "label": "Bug-Prone", "pattern": "missing_return",
        "code": '''
def parse_config(path):
    data = open(path).read()
    parsed = json.loads(data)
    config = Config(parsed)
    validate(config)
''',
    },
    {
        "id": "bp_004", "label": "Bug-Prone", "pattern": "missing_return",
        "code": '''
def find_max(lst):
    current_max = lst[0]
    for item in lst:
        if item > current_max:
            current_max = item
    log(current_max)
''',
    },
    {
        "id": "bp_005", "label": "Bug-Prone", "pattern": "missing_return",
        "code": '''
def compute_hash(data):
    h = hashlib.sha256()
    h.update(data.encode())
    digest = h.hexdigest()
    store(digest)
''',
    },
    # Code Smell: high_complexity (2)
    {
        "id": "cs_001", "label": "Code Smell", "pattern": "high_complexity",
        "code": '''
def process(x, y, z, mode, flag1, flag2):
    if x > 0:
        if y > 0:
            if z > 0:
                if mode == "a":
                    if flag1:
                        return "A1"
                    elif flag2:
                        return "A2"
                    else:
                        return "A3"
                elif mode == "b":
                    if flag1 and flag2:
                        return "B1"
                    else:
                        return "B2"
            else:
                if flag1:
                    return "C1"
        else:
            return "D1"
    return "E1"
''',
    },
    {
        "id": "cs_002", "label": "Code Smell", "pattern": "high_complexity",
        "code": '''
def route_request(method, path, headers, body, auth, version, timeout):
    if method == "GET":
        if auth:
            if version == "v1":
                return handle_v1_get(path, headers)
            elif version == "v2":
                return handle_v2_get(path, headers)
        else:
            return handle_anon_get(path)
    elif method == "POST":
        if body:
            if auth:
                if timeout > 30:
                    return handle_long_post(path, body)
                else:
                    return handle_short_post(path, body)
            else:
                return reject_post(path)
    elif method == "DELETE":
        if auth:
            return handle_delete(path)
    return default_response()
''',
    },
    # Code Smell: deep_nesting (2)
    {
        "id": "cs_003", "label": "Code Smell", "pattern": "deep_nesting",
        "code": '''
def nested_logic(a, b, c, d, e, f):
    if a:
        for i in range(b):
            if c:
                while d:
                    if e:
                        if f:
                            result = compute(a, b, c, d, e, f)
    return result
''',
    },
    {
        "id": "cs_004", "label": "Code Smell", "pattern": "deep_nesting",
        "code": '''
def validation_pyramid(user, form, data, config, session, rules):
    if user is not None:
        if form.is_valid():
            if data:
                if config.allow:
                    if session.active:
                        if rules.check(data):
                            return process(data)
    return None
''',
    },
    # Code Smell: long_parameter_list (1)
    {
        "id": "cs_005", "label": "Code Smell", "pattern": "long_parameter_list",
        "code": '''
def send_email(to, cc, bcc, subject, body, html_body, attachments, sender, reply_to):
    msg = build_message(to, cc, bcc, subject, body, html_body, attachments, sender, reply_to)
    return smtp.send(msg)
''',
    },
    # Code Smell: unused_variable (1)
    {
        "id": "cs_006", "label": "Code Smell", "pattern": "unused_variable",
        "code": '''
def compute_total(items):
    temp = []
    unused = "never used"
    total = sum(item.price for item in items)
    return total
''',
    },
    # Design Inefficiency: god_function (2)
    {
        "id": "di_001", "label": "Design Inefficiency", "pattern": "god_function",
        "code": "\n".join(
            ["def mega_handler(request):"] +
            [f"    x{i} = process_{i}(request)" for i in range(55)]
        ),
    },
    {
        "id": "di_002", "label": "Design Inefficiency", "pattern": "god_function",
        "code": "\n".join(
            ["def super_init(self, config):"] +
            [f"    self.attr_{i} = config.get('key_{i}', None)" for i in range(60)]
        ),
    },
    # Mixed (1)
    {
        "id": "mx_001", "label": "Bug-Prone", "pattern": "mixed",
        "code": '''
def complex_handler(req, resp, ctx, auth, config, timeout, retry_count, fallback):
    if auth:
        if ctx.active:
            if config.enable:
                for i in range(retry_count):
                    if i > 5:
                        if timeout > 30:
                            fallback(req, resp)
    result = process(req)
    log(result)
''',
    },
    # Clean (6)
    {
        "id": "cl_001", "label": "Clean", "pattern": None,
        "code": '''
def add(a, b):
    return a + b
''',
    },
    {
        "id": "cl_002", "label": "Clean", "pattern": None,
        "code": '''
def validate_email(email):
    import re
    pattern = r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"
    return bool(re.match(pattern, email))
''',
    },
    {
        "id": "cl_003", "label": "Clean", "pattern": None,
        "code": '''
class Counter:
    def __init__(self):
        self.count = 0

    def increment(self):
        self.count += 1
        return self.count

    def reset(self):
        self.count = 0
''',
    },
    {
        "id": "cl_004", "label": "Clean", "pattern": None,
        "code": '''
def retry(func, max_attempts=3):
    for attempt in range(max_attempts):
        try:
            return func()
        except Exception as e:
            if attempt == max_attempts - 1:
                raise
    return None
''',
    },
    {
        "id": "cl_005", "label": "Clean", "pattern": None,
        "code": '''
def get_squares(nums):
    return [x * x for x in nums if x > 0]
''',
    },
    {
        "id": "cl_006", "label": "Clean", "pattern": None,
        "code": '''
def pipeline(data, *transforms):
    result = data
    for transform in transforms:
        result = transform(result)
    return result
''',
    },
]


def _overlap(a_start, a_end, b_start, b_end):
    return a_start <= b_end and b_start <= a_end


def run_benchmark():
    builder = ProgramGraphBuilder()
    encoder = FeatureEncoder()
    detector = GATDefectDetector()

    results = []
    latencies = []
    cat_tp = {c: 0 for c in CATEGORIES}
    cat_fp = {c: 0 for c in CATEGORIES}
    cat_fn = {c: 0 for c in CATEGORIES}
    cat_tn = {c: 0 for c in CATEGORIES}
    pattern_stats = {}
    confusion = np.zeros((4, 4), dtype=int)
    cat_idx = {c: i for i, c in enumerate(CATEGORIES)}
    conf_buckets = {round(b * 0.1, 1): {"correct": 0, "total": 0}
                    for b in range(11)}

    for sample in SAMPLES:
        t0 = time.time()
        ast_data = py_parse(sample["code"], "benchmark.py")
        pg = builder.build(ast_data, sample["code"])
        enc = encoder.encode(pg)
        issues = detector.predict(enc, pg)
        latency_ms = (time.time() - t0) * 1000
        latencies.append(latency_ms)

        true_label = sample["label"]
        true_idx = cat_idx[true_label]
        pattern = sample.get("pattern")

        # Find best predicted category
        if issues:
            # Pick highest-confidence non-Clean issue, else all Clean
            non_clean = [iss for iss in issues if iss["category"] != "Clean"]
            if non_clean:
                pred_issue = max(non_clean, key=lambda x: x["confidence"])
                pred_label = pred_issue["category"]
                pred_conf = pred_issue["confidence"]
                pred_line_s = pred_issue["line_start"]
                pred_line_e = pred_issue["line_end"]
            else:
                pred_label = "Clean"
                pred_conf = 0.9
                pred_line_s = 1
                pred_line_e = 1
        else:
            pred_label = "Clean"
            pred_conf = 0.9
            pred_line_s = 1
            pred_line_e = 1

        pred_idx = cat_idx[pred_label]
        confusion[true_idx][pred_idx] += 1

        # TP/FP/FN/TN per category
        for cat in CATEGORIES:
            ci = cat_idx[cat]
            is_true = (true_label == cat)
            is_pred = (pred_label == cat)
            if is_true and is_pred:
                cat_tp[cat] += 1
            elif (not is_true) and is_pred:
                cat_fp[cat] += 1
            elif is_true and (not is_pred):
                cat_fn[cat] += 1
            else:
                cat_tn[cat] += 1

        # Pattern stats
        if pattern:
            if pattern not in pattern_stats:
                pattern_stats[pattern] = {"tp": 0, "fp": 0, "fn": 0, "total": 0}
            pattern_stats[pattern]["total"] += 1
            hit = any(
                iss["pattern"] == pattern or
                (iss["category"] == true_label and
                 _overlap(iss["line_start"], iss["line_end"], 1, 200))
                for iss in issues
            )
            if hit:
                pattern_stats[pattern]["tp"] += 1
            else:
                pattern_stats[pattern]["fn"] += 1

        # Confidence calibration
        bucket = round(round(pred_conf / 0.1) * 0.1, 1)
        bucket = min(max(bucket, 0.0), 1.0)
        cb = conf_buckets.get(bucket, {"correct": 0, "total": 0})
        cb["total"] += 1
        correct = (pred_label == true_label)
        if correct:
            cb["correct"] += 1
        conf_buckets[bucket] = cb

        results.append({
            "id": sample["id"],
            "true": true_label,
            "predicted": pred_label,
            "correct": correct,
            "confidence": pred_conf,
            "latency_ms": round(latency_ms, 2),
            "issues_found": len(issues),
            "graph_nodes": pg.get("num_nodes", 0),
            "graph_edges": pg.get("num_edges", 0),
            "ast_edges": pg.get("ast_edges", 0),
            "cfg_edges": pg.get("cfg_edges", 0),
            "dfg_edges": pg.get("dfg_edges", 0),
        })

    # Compute per-category F1
    per_cat = {}
    for cat in CATEGORIES:
        tp = cat_tp[cat]
        fp = cat_fp[cat]
        fn = cat_fn[cat]
        tn = cat_tn[cat]
        prec = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        rec = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        f1 = 2 * prec * rec / (prec + rec) if (prec + rec) > 0 else 0.0
        acc = (tp + tn) / len(SAMPLES)
        per_cat[cat] = {"precision": round(prec, 4), "recall": round(rec, 4),
                        "f1": round(f1, 4), "accuracy": round(acc, 4),
                        "tp": tp, "fp": fp, "fn": fn, "tn": tn}

    # Micro F1
    total_tp = sum(cat_tp.values())
    total_fp = sum(cat_fp.values())
    total_fn = sum(cat_fn.values())
    micro_prec = total_tp / (total_tp + total_fp) if (total_tp + total_fp) > 0 else 0.0
    micro_rec = total_tp / (total_tp + total_fn) if (total_tp + total_fn) > 0 else 0.0
    micro_f1 = 2 * micro_prec * micro_rec / (micro_prec + micro_rec) if (micro_prec + micro_rec) > 0 else 0.0

    # Macro F1
    macro_f1 = sum(per_cat[c]["f1"] for c in CATEGORIES) / len(CATEGORIES)

    # Per-pattern F1
    per_pattern = {}
    for pat, ps in pattern_stats.items():
        tp = ps["tp"]
        fn = ps["fn"]
        rec = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        per_pattern[pat] = {"recall": round(rec, 4), "tp": tp, "fn": fn}

    # Calibration
    calibration = []
    for b in sorted(conf_buckets.keys()):
        cb = conf_buckets[b]
        if cb["total"] > 0:
            calibration.append({
                "confidence_bucket": b,
                "accuracy": round(cb["correct"] / cb["total"], 4),
                "samples": cb["total"],
            })

    return {
        "samples": len(SAMPLES),
        "correct": sum(1 for r in results if r["correct"]),
        "accuracy": round(sum(1 for r in results if r["correct"]) / len(SAMPLES), 4),
        "micro_f1": round(micro_f1, 4),
        "macro_f1": round(macro_f1, 4),
        "per_category": per_cat,
        "per_pattern": per_pattern,
        "confusion_matrix": confusion.tolist(),
        "confusion_labels": CATEGORIES,
        "calibration": calibration,
        "avg_latency_ms": round(sum(latencies) / len(latencies), 2),
        "sample_results": results,
    }
