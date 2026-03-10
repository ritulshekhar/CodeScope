const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const AdmZip = require('adm-zip');
const simpleGit = require('simple-git');
const { protect } = require('../middleware/auth');
const Scan = require('../models/Scan');
const Issue = require('../models/Issue');
const { analyzeRepo } = require('../analyzer/index');

const upload = multer({ dest: path.join(__dirname, '../uploads/') });
const REPOS_DIR = path.join(__dirname, '../repos/');
if (!fs.existsSync(REPOS_DIR)) fs.mkdirSync(REPOS_DIR, { recursive: true });

// Helper to run scan async
async function runScan(scan, repoDir) {
    try {
        scan.status = 'scanning';
        await scan.save();

        const { metrics, fileReports, allIssues } = await analyzeRepo(repoDir);

        // Save issues
        const issuesDocs = allIssues.map(issue => ({ ...issue, scanId: scan._id }));
        if (issuesDocs.length > 0) await Issue.insertMany(issuesDocs);

        scan.metrics = {
            ...metrics,
            languageDistribution: metrics.languageDistribution
        };
        scan.files = fileReports;
        scan.status = 'completed';
        await scan.save();
    } catch (err) {
        scan.status = 'failed';
        await scan.save();
        console.error('Scan failed:', err.message);
    } finally {
        // Cleanup cloned repo
        try { fs.rmSync(repoDir, { recursive: true, force: true }); } catch { }
    }
}

// @route POST /api/scans/github
router.post('/github', protect, async (req, res) => {
    try {
        const { url } = req.body;
        if (!url || !url.startsWith('http')) return res.status(400).json({ message: 'Invalid GitHub URL' });

        const repoName = url.split('/').slice(-2).join('/').replace('.git', '') || url;
        const repoDir = path.join(REPOS_DIR, uuidv4());
        fs.mkdirSync(repoDir, { recursive: true });

        const scan = await Scan.create({
            userId: req.user._id,
            repoName,
            repoSource: 'github',
            repoUrl: url,
            status: 'pending'
        });

        res.json({ message: 'Scan started', scanId: scan._id, status: 'pending' });

        // Clone & analyze in background
        const git = simpleGit();
        git.clone(url, repoDir, ['--depth', '1'])
            .then(() => runScan(scan, repoDir))
            .catch(async (err) => {
                scan.status = 'failed';
                await scan.save();
                console.error('Clone failed:', err.message);
                try { fs.rmSync(repoDir, { recursive: true, force: true }); } catch { }
            });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @route POST /api/scans/upload
router.post('/upload', protect, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

        const repoDir = path.join(REPOS_DIR, uuidv4());
        fs.mkdirSync(repoDir, { recursive: true });

        const zip = new AdmZip(req.file.path);
        zip.extractAllTo(repoDir, true);
        fs.unlinkSync(req.file.path);

        const repoName = req.file.originalname.replace(/\.zip$/i, '') || 'uploaded-repo';
        const scan = await Scan.create({
            userId: req.user._id,
            repoName,
            repoSource: 'zip',
            status: 'pending'
        });

        res.json({ message: 'Scan started', scanId: scan._id, status: 'pending' });

        // Analyze in background
        runScan(scan, repoDir);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @route GET /api/scans
router.get('/', protect, async (req, res) => {
    try {
        const scans = await Scan.find({ userId: req.user._id })
            .select('repoName repoSource status metrics.totalIssues metrics.qualityScore createdAt')
            .sort({ createdAt: -1 });
        res.json(scans);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @route GET /api/scans/:id
router.get('/:id', protect, async (req, res) => {
    try {
        const scan = await Scan.findOne({ _id: req.params.id, userId: req.user._id });
        if (!scan) return res.status(404).json({ message: 'Scan not found' });
        const issues = await Issue.find({ scanId: scan._id }).limit(200);
        res.json({ scan, issues });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @route GET /api/scans/:id/status
router.get('/:id/status', protect, async (req, res) => {
    try {
        const scan = await Scan.findOne({ _id: req.params.id, userId: req.user._id }).select('status');
        if (!scan) return res.status(404).json({ message: 'Not found' });
        res.json({ status: scan.status });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
