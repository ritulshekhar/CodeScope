/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  Express.js Demo Router  |  mounted at /api/demo in server.js
 *  Demonstrates: Express routing, GET/POST/PUT/DELETE, middleware,
 *                req/res API, fs, path, query params, body parsing, headers
 * ─────────────────────────────────────────────────────────────────────────────
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const os = require('os');

const router = express.Router();

// ─── In-memory "notes" store (simulates a tiny DB for POST/PUT/DELETE demo) ──
let notes = [
    { id: 1, title: 'Setup Express', body: 'Install express with npm', createdAt: new Date().toISOString() },
    { id: 2, title: 'Add Middleware', body: 'Use app.use() for middleware', createdAt: new Date().toISOString() },
    { id: 3, title: 'Define Routes', body: 'router.get/post/put/delete', createdAt: new Date().toISOString() },
];
let nextId = 4;

// ─── Middleware: attach timestamp & log ──────────────────────────────────────
router.use((req, res, next) => {
    req.demoTimestamp = new Date().toISOString();
    console.log(`[Express Demo] ${req.method} /api/demo${req.path} — ${req.demoTimestamp}`);
    next();
});

// ─── GET /api/demo/ — Index: list all demo routes ────────────────────────────
router.get('/', (req, res) => {
    res.json({
        name: '🚀 Express.js Demo Router',
        description: 'Express routes demonstrating GET, POST, PUT, DELETE methods with fs, path, query params, body parsing, headers',
        mountedAt: '/api/demo',
        routes: [
            { method: 'GET', path: '/api/demo/', desc: 'This index — list all routes' },
            { method: 'GET', path: '/api/demo/info', desc: 'Server & Express info' },
            { method: 'GET', path: '/api/demo/files', desc: 'Directory listing via fs module' },
            { method: 'GET', path: '/api/demo/path', desc: 'path module operations' },
            { method: 'GET', path: '/api/demo/query?a=1&b=2', desc: 'Query string params demo' },
            { method: 'GET', path: '/api/demo/headers', desc: 'Inspect incoming request headers' },
            { method: 'GET', path: '/api/demo/notes', desc: 'Get all notes (in-memory store)' },
            { method: 'GET', path: '/api/demo/notes/:id', desc: 'Get note by ID' },
            { method: 'POST', path: '/api/demo/notes', desc: 'Create a new note' },
            { method: 'PUT', path: '/api/demo/notes/:id', desc: 'Update a note by ID' },
            { method: 'DELETE', path: '/api/demo/notes/:id', desc: 'Delete a note by ID' },
            { method: 'POST', path: '/api/demo/echo', desc: 'Echo request body + headers' },
        ],
        requestTimestamp: req.demoTimestamp,
    });
});

// ─── GET /api/demo/info — Express + server info ──────────────────────────────
router.get('/info', (req, res) => {
    res.json({
        route: '/api/demo/info',
        description: 'Express.js server information using process + os modules',
        express: {
            version: require('express/package.json').version,
            nodeVersion: process.version,
            platform: os.platform(),
            architecture: os.arch(),
            pid: process.pid,
            uptime: `${Math.round(process.uptime())}s`,
            memoryUsageMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
            cwd: process.cwd(),
        },
        system: {
            hostname: os.hostname(),
            cpus: os.cpus().length,
            freeMemMB: Math.round(os.freemem() / 1024 / 1024),
            totalMemMB: Math.round(os.totalmem() / 1024 / 1024),
        },
        timestamp: req.demoTimestamp,
    });
});

// ─── GET /api/demo/files — fs.readdir() demo ─────────────────────────────────
router.get('/files', (req, res) => {
    const targetDir = path.join(__dirname, '..');  // server/ directory
    fs.readdir(targetDir, { withFileTypes: true }, (err, entries) => {
        if (err) return res.status(500).json({ error: err.message });
        const items = entries.map(e => ({
            name: e.name,
            type: e.isDirectory() ? '📁 directory' : '📄 file',
            fullPath: path.join(targetDir, e.name),
            extension: e.isFile() ? path.extname(e.name) : null,
            ...(e.isFile() ? {
                sizeBytes: (() => {
                    try { return fs.statSync(path.join(targetDir, e.name)).size; } catch { return 0; }
                })()
            } : {}),
        }));
        res.json({
            route: '/api/demo/files',
            description: 'Directory listing using fs.readdir() and path.join()',
            modules: ['fs', 'path'],
            directory: targetDir,
            totalEntries: items.length,
            entries: items,
            timestamp: req.demoTimestamp,
        });
    });
});

// ─── GET /api/demo/path — path module operations ─────────────────────────────
router.get('/path', (req, res) => {
    const samplePath = '/Users/developer/projects/nlp-bug-finder/server/routes/auth.js';
    res.json({
        route: '/api/demo/path',
        description: 'Path manipulation using Node.js path module via Express route',
        module: 'path',
        input: samplePath,
        operations: {
            'path.basename()': path.basename(samplePath),
            'path.basename(ext)': path.basename(samplePath, '.js'),
            'path.dirname()': path.dirname(samplePath),
            'path.extname()': path.extname(samplePath),
            'path.parse()': path.parse(samplePath),
            'path.join()': path.join('api', 'v1', 'users', 'profile'),
            'path.resolve()': path.resolve('server', 'routes'),
            'path.isAbsolute()': path.isAbsolute(samplePath),
            'path.normalize()': path.normalize('/api/../api/v1//users'),
            'path.sep': path.sep,
            'path.delimiter': path.delimiter,
            '__dirname (router)': __dirname,
        },
        timestamp: req.demoTimestamp,
    });
});

// ─── GET /api/demo/query — Query string params demo ──────────────────────────
router.get('/query', (req, res) => {
    res.json({
        route: '/api/demo/query',
        description: 'Express req.query — automatically parses URL query parameters',
        hint: 'Try: /api/demo/query?name=Alice&role=admin&active=true',
        receivedParams: req.query,
        paramCount: Object.keys(req.query).length,
        expressFeature: 'req.query is populated automatically by Express — no manual url.parse() needed',
        timestamp: req.demoTimestamp,
    });
});

// ─── GET /api/demo/headers — Inspect request headers ─────────────────────────
router.get('/headers', (req, res) => {
    res.json({
        route: '/api/demo/headers',
        description: 'Inspect and reflect incoming HTTP request headers via req.headers',
        yourHeaders: req.headers,
        expressHelpers: {
            'req.get("host")': req.get('host'),
            'req.get("user-agent")': req.get('user-agent'),
            'req.get("content-type")': req.get('content-type') || '(not set)',
            'req.ip': req.ip,
            'req.method': req.method,
            'req.protocol': req.protocol,
            'req.originalUrl': req.originalUrl,
        },
        timestamp: req.demoTimestamp,
    });
});

// ─── POST /api/demo/echo — Echo body + headers ────────────────────────────────
router.post('/echo', (req, res) => {
    res.json({
        route: 'POST /api/demo/echo',
        description: 'Express body parsing — req.body automatically parsed by express.json() middleware',
        echoedBody: req.body,
        requestInfo: {
            method: req.method,
            path: req.path,
            headers: req.headers,
            contentType: req.get('content-type'),
            ip: req.ip,
        },
        expressFeature: 'No manual body parsing needed — express.json() middleware handles it',
        timestamp: req.demoTimestamp,
    });
});

// ─── GET /api/demo/notes — Get all notes ─────────────────────────────────────
router.get('/notes', (req, res) => {
    const { search } = req.query;
    let result = notes;
    if (search) {
        result = notes.filter(n =>
            n.title.toLowerCase().includes(search.toLowerCase()) ||
            n.body.toLowerCase().includes(search.toLowerCase())
        );
    }
    res.json({
        route: 'GET /api/demo/notes',
        description: 'Retrieve notes from in-memory store — simulates a database GET',
        total: result.length,
        filtered: !!search,
        searchQuery: search || null,
        notes: result,
        timestamp: req.demoTimestamp,
    });
});

// ─── GET /api/demo/notes/:id — Get note by ID ────────────────────────────────
router.get('/notes/:id', (req, res) => {
    const note = notes.find(n => n.id === parseInt(req.params.id));
    if (!note) return res.status(404).json({ error: `Note with id ${req.params.id} not found` });
    res.json({
        route: `GET /api/demo/notes/${req.params.id}`,
        description: 'Express route param — req.params.id extracted from URL pattern',
        paramExtracted: req.params.id,
        note,
        timestamp: req.demoTimestamp,
    });
});

// ─── POST /api/demo/notes — Create a note ────────────────────────────────────
router.post('/notes', (req, res) => {
    const { title, body: bodyText } = req.body;
    if (!title || !bodyText) {
        return res.status(400).json({ error: 'Both "title" and "body" fields are required' });
    }
    const newNote = { id: nextId++, title, body: bodyText, createdAt: new Date().toISOString() };
    notes.push(newNote);
    res.status(201).json({
        route: 'POST /api/demo/notes',
        description: 'Create resource — Express reads req.body (parsed by express.json middleware)',
        created: newNote,
        totalNotes: notes.length,
        timestamp: req.demoTimestamp,
    });
});

// ─── PUT /api/demo/notes/:id — Update a note ─────────────────────────────────
router.put('/notes/:id', (req, res) => {
    const idx = notes.findIndex(n => n.id === parseInt(req.params.id));
    if (idx === -1) return res.status(404).json({ error: `Note with id ${req.params.id} not found` });
    const { title, body: bodyText } = req.body;
    notes[idx] = { ...notes[idx], ...(title && { title }), ...(bodyText && { body: bodyText }), updatedAt: new Date().toISOString() };
    res.json({
        route: `PUT /api/demo/notes/${req.params.id}`,
        description: 'Update resource — combines route params (req.params) with body (req.body)',
        updated: notes[idx],
        timestamp: req.demoTimestamp,
    });
});

// ─── DELETE /api/demo/notes/:id — Delete a note ──────────────────────────────
router.delete('/notes/:id', (req, res) => {
    const idx = notes.findIndex(n => n.id === parseInt(req.params.id));
    if (idx === -1) return res.status(404).json({ error: `Note with id ${req.params.id} not found` });
    const [deleted] = notes.splice(idx, 1);
    res.json({
        route: `DELETE /api/demo/notes/${req.params.id}`,
        description: 'Delete resource — Express route params via req.params.id',
        deleted,
        remainingCount: notes.length,
        timestamp: req.demoTimestamp,
    });
});

module.exports = router;
