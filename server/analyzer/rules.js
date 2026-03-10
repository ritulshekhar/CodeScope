/**
 * Rule Engine - Detects code quality issues
 */

function detectIssues(code, filePath, lang) {
    const issues = [];
    const lines = code.split('\n');

    lines.forEach((line, i) => {
        const lineNum = i + 1;
        const t = line.trim();

        // Console.log detection (JS/TS)
        if ((lang === 'JavaScript' || lang === 'TypeScript') && /console\.(log|warn|error|debug)\(/.test(t)) {
            issues.push({ issueType: 'console-log', severity: 'Low', description: 'Console logging found — remove before production', line: lineNum, filePath, language: lang });
        }

        // Empty catch blocks
        if (/catch\s*\(.*\)\s*\{\s*\}/.test(t) || (t === 'catch' && lines[i + 1] && lines[i + 1].trim() === '{}')) {
            issues.push({ issueType: 'empty-catch', severity: 'High', description: 'Empty catch block — errors are silently swallowed', line: lineNum, filePath, language: lang });
        }

        // TODO/FIXME
        if (/\/\/\s*(TODO|FIXME|HACK|XXX)/i.test(t) || /#\s*(TODO|FIXME)/i.test(t)) {
            issues.push({ issueType: 'todo-comment', severity: 'Low', description: 'TODO/FIXME marker found — incomplete code', line: lineNum, filePath, language: lang });
        }

        // Hardcoded passwords/secrets
        if (/(password|secret|api_key|apikey)\s*=\s*['"][^'"]+['"]/i.test(t)) {
            issues.push({ issueType: 'hardcoded-secret', severity: 'High', description: 'Hardcoded credential or secret detected', line: lineNum, filePath, language: lang });
        }

        // var keyword (JS) — prefer let/const
        if ((lang === 'JavaScript' || lang === 'TypeScript') && /^\s*var\s+/.test(line)) {
            issues.push({ issueType: 'var-usage', severity: 'Low', description: 'Use of `var` — prefer `let` or `const`', line: lineNum, filePath, language: lang });
        }

        // == instead of === (JS/TS)
        if ((lang === 'JavaScript' || lang === 'TypeScript') && /[^=!<>]==[^=]/.test(t) && !/===/.test(t)) {
            issues.push({ issueType: 'loose-equality', severity: 'Medium', description: 'Loose equality `==` found — use strict `===`', line: lineNum, filePath, language: lang });
        }

        // Missing prop validation (JSX)
        if (lang === 'JavaScript' && /\bprops\.\w+/.test(t) && !/propTypes/.test(code)) {
            if (issues.filter(x => x.issueType === 'missing-proptypes').length === 0) {
                issues.push({ issueType: 'missing-proptypes', severity: 'Medium', description: 'Missing prop validation (PropTypes or TypeScript types)', line: lineNum, filePath, language: lang });
            }
        }

        // Python: print() statements
        if (lang === 'Python' && /^\s*print\(/.test(line)) {
            issues.push({ issueType: 'print-statement', severity: 'Low', description: 'print() statement found — use logging module instead', line: lineNum, filePath, language: lang });
        }

        // Python: bare except
        if (lang === 'Python' && /^\s*except\s*:/.test(line)) {
            issues.push({ issueType: 'bare-except', severity: 'High', description: 'Bare except clause — catches all exceptions including SystemExit', line: lineNum, filePath, language: lang });
        }

        // Java: System.out.println
        if (lang === 'Java' && /System\.out\.(println|print)\(/.test(t)) {
            issues.push({ issueType: 'sysout', severity: 'Low', description: 'System.out.println found — use a logger instead', line: lineNum, filePath, language: lang });
        }
    });

    // Long methods detection
    detectLongMethods(lines, filePath, lang, issues);

    // Deep nesting detection
    detectDeepNesting(lines, filePath, lang, issues);

    // Unused variable hints (basic)
    detectUnusedVars(code, filePath, lang, issues);

    return issues;
}

function detectLongMethods(lines, filePath, lang, issues) {
    let funcStart = -1, braceDepth = 0, funcName = '';
    lines.forEach((line, i) => {
        const t = line.trim();
        const funcMatch = t.match(/(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\(|(?:async\s+)?(\w+)\s*\(.*\)\s*\{|def\s+(\w+)\s*\(|public\s+\w+\s+(\w+)\s*\()/);
        if (funcMatch && funcStart === -1) {
            funcStart = i;
            funcName = funcMatch[1] || funcMatch[2] || funcMatch[3] || funcMatch[4] || funcMatch[5] || 'unknown';
        }
        if (funcStart !== -1) {
            braceDepth += (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
            if (braceDepth <= 0 && i > funcStart) {
                const length = i - funcStart;
                if (length > 50) {
                    issues.push({ issueType: 'long-method', severity: 'Medium', description: `Method '${funcName}' is ${length} lines long — consider refactoring (>50 lines)`, line: funcStart + 1, filePath, language: lang });
                }
                funcStart = -1; braceDepth = 0;
            }
        }
    });
}

function detectDeepNesting(lines, filePath, lang, issues) {
    let reported = false;
    lines.forEach((line, i) => {
        const depth = (line.match(/^\s*/)[0].length) / 2;
        if (depth >= 5 && !reported) {
            issues.push({ issueType: 'deep-nesting', severity: 'Medium', description: `Excessive nesting depth (${Math.round(depth)} levels) — refactor to reduce complexity`, line: i + 1, filePath, language: lang });
            reported = true;
        }
    });
}

function detectUnusedVars(code, filePath, lang, issues) {
    if (lang !== 'JavaScript' && lang !== 'TypeScript') return;
    const declPattern = /(?:const|let|var)\s+(\w+)\s*=/g;
    let match;
    while ((match = declPattern.exec(code)) !== null) {
        const varName = match[1];
        if (varName === '_' || varName.startsWith('_')) continue;
        const usageCount = (code.match(new RegExp(`\\b${varName}\\b`, 'g')) || []).length;
        if (usageCount === 1) {
            issues.push({ issueType: 'unused-variable', severity: 'Medium', description: `Variable '${varName}' is declared but never used`, line: 0, filePath, language: lang });
        }
    }
}

module.exports = { detectIssues };
