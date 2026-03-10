const mongoose = require('mongoose');

const IssueSchema = new mongoose.Schema({
    scanId: { type: mongoose.Schema.Types.ObjectId, ref: 'Scan', required: true },
    filePath: { type: String, required: true },
    issueType: { type: String, required: true },
    severity: { type: String, enum: ['Low', 'Medium', 'High'], required: true },
    description: { type: String, required: true },
    line: { type: Number, default: 0 },
    language: String
});

module.exports = mongoose.model('Issue', IssueSchema);
