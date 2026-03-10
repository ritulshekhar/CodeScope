/**
 * Code Metrics Calculator
 * Supports: JS, JSX, TS, TSX, Python, Java, C, C++, HTML, CSS
 */

const LANG_MAP = {
    '.js': 'JavaScript', '.jsx': 'JavaScript', '.ts': 'TypeScript', '.tsx': 'TypeScript',
    '.py': 'Python', '.java': 'Java', '.c': 'C', '.cpp': 'C++',
    '.html': 'HTML', '.css': 'CSS', '.md': 'Markdown', '.json': 'JSON'
};

function detectLanguage(filename) {
    const ext = filename.toLowerCase().match(/\.[^.]+$/);
    return ext ? (LANG_MAP[ext[0]] || 'Other') : 'Other';
}

function countLOC(code) {
    const lines = code.split('\n');
    return lines.filter(l => l.trim().length > 0).length;
}

function commentRatio(code, lang) {
    const lines = code.split('\n');
    let commentLines = 0;
    let inBlockComment = false;
    for (const line of lines) {
        const t = line.trim();
        if (lang === 'Python') {
            if (t.startsWith('#') || t.startsWith('"""') || t.startsWith("'''")) commentLines++;
        } else {
            if (inBlockComment) {
                commentLines++;
                if (t.includes('*/')) inBlockComment = false;
            } else if (t.startsWith('//') || t.startsWith('*')) {
                commentLines++;
            } else if (t.startsWith('/*') || t.startsWith('/**')) {
                commentLines++;
                if (!t.includes('*/')) inBlockComment = true;
            }
        }
    }
    return lines.length > 0 ? Math.round((commentLines / lines.length) * 100) / 100 : 0;
}

function calcCyclomaticComplexity(code) {
    const patterns = [
        /\bif\b/g, /\belse if\b/g, /\bwhile\b/g, /\bfor\b/g,
        /\bswitch\b/g, /\bcatch\b/g, /\bcase\b/g, /&&/g, /\|\|/g,
        /\?/g, /\belif\b/g
    ];
    let count = 1;
    for (const p of patterns) {
        const matches = code.match(p);
        if (matches) count += matches.length;
    }
    return Math.min(count, 50);
}

function avgFunctionLength(code, lang) {
    let lines = code.split('\n');
    let inFunc = false, funcLines = 0, funcCount = 0, braceDepth = 0;

    if (lang === 'Python') {
        let inDef = false, defStart = 0;
        lines.forEach((line, i) => {
            if (/^\s*(def|async def)\s+/.test(line)) {
                if (inDef) { funcCount++; funcLines += (i - defStart); }
                inDef = true; defStart = i;
            }
        });
        if (inDef) { funcCount++; funcLines += (lines.length - defStart); }
    } else {
        for (const line of lines) {
            const isFuncDef = /^(function\s+\w+|const\s+\w+\s*=|async\s+function|\w+\s*\(.*\)\s*\{|public\s+\w+|private\s+\w+|protected\s+\w+)/.test(line.trim());
            if (isFuncDef && !inFunc) { inFunc = true; funcCount++; braceDepth = 0; }
            if (inFunc) {
                funcLines++;
                braceDepth += (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
                if (braceDepth <= 0 && funcLines > 1) inFunc = false;
            }
        }
    }
    return funcCount > 0 ? Math.round(funcLines / funcCount) : 0;
}

module.exports = { detectLanguage, countLOC, commentRatio, calcCyclomaticComplexity, avgFunctionLength, LANG_MAP };
