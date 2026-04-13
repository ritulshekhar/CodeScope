/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  Node.js Built-in APIs Demo Server  |  Port 3001
 *  Demonstrates: http, fs, path, url, os — NO Express, pure Node.js only
 * ─────────────────────────────────────────────────────────────────────────────
 */

const http = require('http');   // Built-in HTTP module
const fs   = require('fs');     // Built-in File System module
const path = require('path');   // Built-in Path module
const url  = require('url');    // Built-in URL module
const os   = require('os');     // Built-in OS module

const PORT = 3001;

// ─── Helper: send JSON response ──────────────────────────────────────────────
function sendJSON(res, statusCode, data) {
    res.writeHead(statusCode, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end(JSON.stringify(data, null, 2));
}

// ─── Helper: read request body (for POST) ────────────────────────────────────
function readBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try { resolve(JSON.parse(body || '{}')); }
            catch (_) { resolve({ raw: body }); }
        });
        req.on('error', reject);
    });
}

// ─── Route Handlers ──────────────────────────────────────────────────────────

// GET /api/info — Node.js & OS information (os, process modules)
function handleInfo(res) {
    sendJSON(res, 200, {
        route: '/api/info',
        module: 'os + process',
        description: 'System information via Node.js built-in os & process modules',
        server: {
            nodeVersion: process.version,
            platform:    os.platform(),
            architecture: os.arch(),
            hostname:    os.hostname(),
            cpuCount:    os.cpus().length,
            cpuModel:    os.cpus()[0]?.model || 'unknown',
            totalMemoryMB: Math.round(os.totalmem() / 1024 / 1024),
            freeMemoryMB:  Math.round(os.freemem()  / 1024 / 1024),
            uptimeSeconds: Math.round(os.uptime()),
            pid:         process.pid,
            cwd:         process.cwd(),
            env:         process.env.NODE_ENV || 'development',
        },
        timestamp: new Date().toISOString(),
    });
}

// GET /api/files — Directory listing via fs module
function handleFiles(res) {
    const dir = path.join(__dirname, '..'); // list server/ directory
    fs.readdir(dir, { withFileTypes: true }, (err, entries) => {
        if (err) return sendJSON(res, 500, { error: err.message });
        const items = entries.map(e => ({
            name:  e.name,
            type:  e.isDirectory() ? 'directory' : 'file',
            ...(e.isFile() ? { sizeBytes: (() => { try { return fs.statSync(path.join(dir, e.name)).size; } catch { return 0; } })() } : {}),
        }));
        sendJSON(res, 200, {
            route: '/api/files',
            module: 'fs + path',
            description: 'Directory listing using fs.readdir() and path.join()',
            directory: dir,
            totalEntries: items.length,
            entries: items,
        });
    });
}

// GET /api/path-demo — Demonstrates path module operations
function handlePath(res) {
    const sampleFile = '/Users/demo/projects/nlp-bug-finder/server/server.js';
    sendJSON(res, 200, {
        route: '/api/path-demo',
        module: 'path',
        description: 'Path manipulation using Node.js built-in path module',
        input: sampleFile,
        operations: {
            'path.basename()':  path.basename(sampleFile),
            'path.dirname()':   path.dirname(sampleFile),
            'path.extname()':   path.extname(sampleFile),
            'path.parse()':     path.parse(sampleFile),
            'path.join()':      path.join('server', 'routes', 'auth.js'),
            'path.resolve()':   path.resolve('server', 'server.js'),
            'path.normalize()': path.normalize('/users/../users/demo//projects/'),
            'path.sep':         path.sep,
            'path.delimiter':   path.delimiter,
            '__dirname':        __dirname,
            '__filename':       __filename,
        },
    });
}

// GET /api/url-demo — Demonstrates url module parsing
function handleURL(parsedURL, res) {
    const rawQuery  = parsedURL.query;   // from legacy url.parse()
    const searchStr = parsedURL.search;
    const sampleURL = 'https://api.example.com:8080/v2/users?role=admin&active=true#section1';
    const parsed    = new URL(sampleURL);
    sendJSON(res, 200, {
        route: '/api/url-demo',
        module: 'url',
        description: 'URL parsing using Node.js built-in url module (WHATWG URL API)',
        yourQueryParams: rawQuery,
        yourSearchString: searchStr,
        sampleURL,
        parsed: {
            'url.href':     parsed.href,
            'url.protocol': parsed.protocol,
            'url.hostname': parsed.hostname,
            'url.port':     parsed.port,
            'url.host':     parsed.host,
            'url.pathname': parsed.pathname,
            'url.search':   parsed.search,
            'url.hash':     parsed.hash,
            'url.origin':   parsed.origin,
            'url.searchParams (as object)': Object.fromEntries(parsed.searchParams),
        },
    });
}

// GET /api/time — Current server time using Date
function handleTime(res) {
    const now = new Date();
    sendJSON(res, 200, {
        route: '/api/time',
        module: 'Date (global)',
        description: 'Server-side time and date information',
        time: {
            iso:          now.toISOString(),
            utcString:    now.toUTCString(),
            locale:       now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
            unixTimestamp: Math.floor(now.getTime() / 1000),
            year:         now.getFullYear(),
            month:        now.getMonth() + 1,
            day:          now.getDate(),
            hours:        now.getHours(),
            minutes:      now.getMinutes(),
            seconds:      now.getSeconds(),
        },
    });
}

// POST /api/echo — Echo back the request body + headers
async function handleEcho(req, res) {
    const body = await readBody(req);
    sendJSON(res, 200, {
        route: '/api/echo',
        module: 'http (IncomingMessage)',
        description: 'Echoes the POST body and request headers — demonstrates manual body parsing',
        echoedBody: body,
        requestInfo: {
            method:  req.method,
            url:     req.url,
            headers: req.headers,
        },
    });
}

// GET / — API index
function handleIndex(res) {
    sendJSON(res, 200, {
        name: '🟢 Node.js Built-in APIs Demo Server',
        description: 'Pure Node.js HTTP server — NO Express, NO frameworks',
        port: PORT,
        routes: [
            { method: 'GET',  path: '/api/info',      module: 'os, process', desc: 'System & runtime info' },
            { method: 'GET',  path: '/api/files',     module: 'fs, path',    desc: 'Directory listing' },
            { method: 'GET',  path: '/api/path-demo', module: 'path',        desc: 'Path operations' },
            { method: 'GET',  path: '/api/url-demo',  module: 'url',         desc: 'URL parsing (WHATWG API)' },
            { method: 'GET',  path: '/api/time',      module: 'Date',        desc: 'Server time' },
            { method: 'POST', path: '/api/echo',      module: 'http',        desc: 'Echo request body' },
        ],
    });
}

// ─── Main HTTP Server ─────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        });
        return res.end();
    }

    // Parse URL using built-in url.parse()
    const parsedURL = url.parse(req.url, true);
    const pathname  = parsedURL.pathname;

    console.log(`[${new Date().toISOString()}] ${req.method} ${pathname}`);

    // ── Router (manual, no Express) ───────────────────────────────
    if (req.method === 'GET'  && pathname === '/')              return handleIndex(res);
    if (req.method === 'GET'  && pathname === '/api/info')      return handleInfo(res);
    if (req.method === 'GET'  && pathname === '/api/files')     return handleFiles(res);
    if (req.method === 'GET'  && pathname === '/api/path-demo') return handlePath(res);
    if (req.method === 'GET'  && pathname === '/api/url-demo')  return handleURL(parsedURL, res);
    if (req.method === 'GET'  && pathname === '/api/time')      return handleTime(res);
    if (req.method === 'POST' && pathname === '/api/echo')      return handleEcho(req, res);

    // 404 fallback
    sendJSON(res, 404, { error: 'Route not found', availableRoutes: ['/', '/api/info', '/api/files', '/api/path-demo', '/api/url-demo', '/api/time', 'POST /api/echo'] });
});

server.listen(PORT, () => {
    console.log(`🟢 Node.js Built-in APIs Demo Server running on http://localhost:${PORT}`);
    console.log(`   No Express — pure http, fs, path, url, os modules only`);
});
