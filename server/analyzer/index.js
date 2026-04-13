/**
 * Analyzer Orchestrator
 * Walks the directory tree, reads each supported file, runs metrics + rules, aggregates results
 */
const fs = require('fs');
const path = require('path');
const { detectLanguage, countLOC, commentRatio, calcCyclomaticComplexity, avgFunctionLength, LANG_MAP } = require('./metrics');
const { detectIssues } = require('./rules');
const { calculateRisk, calculateQualityScore } = require('./risk');

const SUPPORTED_EXTENSIONS = Object.keys(LANG_MAP);
const IGNORE_DIRS = ['node_modules', '.git', 'dist', 'build', '__pycache__', '.next', 'vendor', 'target'];
const MAX_FILE_SIZE = 500 * 1024; // 500KB
const MAX_FILES = 300;           // Cap total files to avoid multi-minute scans
const MAX_TOTAL_ISSUES = 2000;   // Cap total issues to avoid huge DB inserts

function walkDir(dir, fileList = []) {
    if (!fs.existsSync(dir)) return fileList;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        if (IGNORE_DIRS.includes(entry.name)) continue;
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            walkDir(fullPath, fileList);
        } else {
            const ext = path.extname(entry.name).toLowerCase();
            if (SUPPORTED_EXTENSIONS.includes(ext)) fileList.push(fullPath);
        }
    }
    return fileList;
}

async function analyzeRepo(repoDir) {
    const allFiles = walkDir(repoDir);
    // Cap file count — process at most MAX_FILES to keep scan under ~30s
    const files = allFiles.slice(0, MAX_FILES);
    const fileReports = [];
    const allIssues = [];
    const langCounts = {};

    for (const filePath of files) {
        // Stop accumulating issues if we've already hit the global cap
        if (allIssues.length >= MAX_TOTAL_ISSUES) break;

        try {
            const stat = fs.statSync(filePath);
            if (stat.size > MAX_FILE_SIZE) continue;

            let code;
            try { code = fs.readFileSync(filePath, 'utf-8'); } catch { continue; }

            const lang = detectLanguage(filePath);
            langCounts[lang] = (langCounts[lang] || 0) + 1;

            const loc = countLOC(code);
            const complexity = calcCyclomaticComplexity(code);
            const cr = commentRatio(code, lang);
            const afl = avgFunctionLength(code, lang);
            const issues = detectIssues(code, path.relative(repoDir, filePath), lang);

            const { riskScore, riskLevel } = calculateRisk(issues.length, complexity);

            fileReports.push({
                filePath: path.relative(repoDir, filePath),
                language: lang,
                loc,
                complexity,
                commentRatio: cr,
                avgFunctionLength: afl,
                issueCount: issues.length,
                riskScore,
                riskLevel
            });

            allIssues.push(...issues);
        } catch {
            // Skip any file that causes an unexpected error
            continue;
        }
    }

    const totalLoc = fileReports.reduce((s, f) => s + f.loc, 0);
    const highRiskFiles = fileReports.filter(f => f.riskLevel === 'High').length;
    const qualityScore = calculateQualityScore(fileReports, allIssues.length);

    // Mock trend data (7 days)
    const issueTrend = Array.from({ length: 6 }, (_, i) => ({
        day: `Day ${i + 1}`,
        count: Math.floor(Math.random() * 300) + 100
    }));
    issueTrend.push({ day: 'Day 6+', count: allIssues.length });

    const metrics = {
        totalLoc,
        totalFiles: fileReports.length,
        totalIssues: allIssues.length,
        highRiskFiles,
        qualityScore,
        languageDistribution: langCounts,
        issueTrend
    };

    return { metrics, fileReports, allIssues };
}

module.exports = { analyzeRepo };
