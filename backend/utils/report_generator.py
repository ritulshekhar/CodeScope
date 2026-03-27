"""
Report Generator — calculates health score, grade, hotspots, and recommendations.
"""


class ReportGenerator:

    def generate(self, files_data: list, summary: dict) -> dict:
        """
        Generate a full health report from analyzed files.

        Args:
            files_data: list of per-file analysis dicts
            summary: aggregated summary dict

        Returns:
            report dict with health_score, health_grade, hotspots, etc.
        """
        files_analyzed = len(files_data)
        if files_analyzed == 0:
            return {
                "health_score": 100.0,
                "health_grade": "A",
                "hotspots": [],
                "pattern_distribution": {},
                "recommendations": [],
                "graph_analysis": {},
            }

        total_issues = summary.get("total_issues", 0)
        severity_dist = summary.get("severity_distribution", {})
        critical = severity_dist.get("critical", 0)
        warning = severity_dist.get("warning", 0)
        info = severity_dist.get("info", 0)

        # Health score formula
        issue_density = total_issues / files_analyzed
        severity_weight = (critical * 3) + (warning * 1.5) + (info * 0.5)
        health_score = 100.0 - (issue_density * 10) - (severity_weight * 2)
        health_score = max(0.0, min(100.0, health_score))

        # Grade
        if health_score >= 80:
            grade = "A"
        elif health_score >= 60:
            grade = "B"
        elif health_score >= 40:
            grade = "C"
        elif health_score >= 20:
            grade = "D"
        else:
            grade = "F"

        # Hotspots — top 10 files sorted by critical then total issues
        hotspots = []
        for f in files_data:
            issues = f.get("issues", [])
            crit = sum(1 for iss in issues if iss.get("severity") == "critical")
            warn = sum(1 for iss in issues if iss.get("severity") == "warning")
            inf = sum(1 for iss in issues if iss.get("severity") == "info")
            if issues:
                hotspots.append({
                    "path": f.get("path", ""),
                    "critical": crit,
                    "warning": warn,
                    "info": inf,
                    "total": len(issues),
                    "language": f.get("language", ""),
                })

        hotspots.sort(key=lambda x: (-x["critical"], -x["total"]))
        hotspots = hotspots[:10]

        # Pattern distribution
        pattern_distribution = {}
        for f in files_data:
            for iss in f.get("issues", []):
                pat = iss.get("pattern", "unknown")
                pattern_distribution[pat] = pattern_distribution.get(pat, 0) + 1

        # Recommendations (1–3 prioritized)
        recommendations = []
        if critical > 0:
            top_pattern = max(pattern_distribution, key=pattern_distribution.get) if pattern_distribution else "issues"
            recommendations.append({
                "priority": "high",
                "title": f"Fix {critical} critical issue(s)",
                "description": f"Most common pattern: '{top_pattern}'. Critical issues indicate potential runtime failures.",
                "impact": "Prevents bugs and crashes in production.",
            })

        if health_score < 60 and warning > 0:
            recommendations.append({
                "priority": "medium",
                "title": f"Refactor {warning} code smell(s)",
                "description": "High-complexity functions and long parameter lists reduce maintainability.",
                "impact": "Improves code readability and reduces maintenance cost.",
            })

        if info > 0:
            recommendations.append({
                "priority": "low",
                "title": f"Address {info} design inefficiency(ies)",
                "description": "God functions and duplicate patterns suggest poor separation of concerns.",
                "impact": "Better architecture enables easier testing and extension.",
            })

        if not recommendations:
            recommendations.append({
                "priority": "low",
                "title": "Maintain code quality",
                "description": "The codebase looks healthy. Continue following best practices.",
                "impact": "Sustained health score above 80.",
            })

        # Graph analysis
        graph_stats = {
            "total_nodes": sum(f.get("graph_info", {}).get("num_nodes", 0) for f in files_data),
            "total_edges": sum(f.get("graph_info", {}).get("num_edges", 0) for f in files_data),
            "total_ast_edges": sum(f.get("graph_info", {}).get("ast_edges", 0) for f in files_data),
            "total_cfg_edges": sum(f.get("graph_info", {}).get("cfg_edges", 0) for f in files_data),
            "total_dfg_edges": sum(f.get("graph_info", {}).get("dfg_edges", 0) for f in files_data),
        }
        total_e = graph_stats["total_edges"]
        total_n = graph_stats["total_nodes"]
        graph_stats["avg_graph_density"] = round(total_e / total_n, 4) if total_n > 0 else 0.0

        return {
            "health_score": round(health_score, 2),
            "health_grade": grade,
            "hotspots": hotspots,
            "pattern_distribution": pattern_distribution,
            "recommendations": recommendations,
            "graph_analysis": graph_stats,
        }
