/**
 * Risk scorer — assigns Low/Medium/High based on issues + complexity
 */
function calculateRisk(issueCount, complexity) {
    const issueScore = Math.min(issueCount * 8, 50);
    const complexityScore = Math.min((complexity - 1) * 2, 50);
    const total = issueScore + complexityScore;

    let riskLevel;
    if (total >= 60) riskLevel = 'High';
    else if (total >= 30) riskLevel = 'Medium';
    else riskLevel = 'Low';

    return { riskScore: total, riskLevel };
}

/**
 * Overall quality score (0–100, higher is better)
 */
function calculateQualityScore(files, totalIssues) {
    if (!files.length) return 100;
    const highRisk = files.filter(f => f.riskLevel === 'High').length;
    const medRisk = files.filter(f => f.riskLevel === 'Medium').length;
    let score = 100;
    score -= highRisk * 5;
    score -= medRisk * 2;
    score -= Math.min(totalIssues, 50);
    return Math.max(0, Math.round(score));
}

module.exports = { calculateRisk, calculateQualityScore };
