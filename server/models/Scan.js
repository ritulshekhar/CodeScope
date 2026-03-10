const mongoose = require('mongoose');

const FileReportSchema = new mongoose.Schema({
    filePath: String,
    language: String,
    loc: Number,
    complexity: Number,
    commentRatio: Number,
    avgFunctionLength: Number,
    issueCount: Number,
    riskScore: Number,
    riskLevel: { type: String, enum: ['Low', 'Medium', 'High'] }
});

const MetricsSchema = new mongoose.Schema({
    totalLoc: { type: Number, default: 0 },
    totalFiles: { type: Number, default: 0 },
    totalIssues: { type: Number, default: 0 },
    highRiskFiles: { type: Number, default: 0 },
    qualityScore: { type: Number, default: 0 },
    languageDistribution: { type: Map, of: Number, default: {} },
    issueTrend: [{ day: String, count: Number }]
});

const ScanSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    repoName: { type: String, required: true },
    repoSource: { type: String, enum: ['github', 'zip'], required: true },
    repoUrl: String,
    status: { type: String, enum: ['pending', 'scanning', 'completed', 'failed'], default: 'pending' },
    metrics: MetricsSchema,
    files: [FileReportSchema],
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Scan', ScanSchema);
