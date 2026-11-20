import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Load public/sw.js in a sandbox with just enough of the service-worker globals to define its helpers
const source = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');
const sandbox = { self: { addEventListener() {}, location: { origin: 'https://app.example' } }, caches: {}, console, URL, Response, Headers, fetch: async () => { throw new Error('offline'); } };
vm.createContext(sandbox);
vm.runInContext(`${source}\nthis.isCacheableAsset = isCacheableAsset;`, sandbox);
const { isCacheableAsset } = sandbox;

const req = (path) => ({ url: `https://app.example${path}` });
const res = (type, status = 200) => new Response('x', { status, headers: { 'Content-Type': type } });

test('a real script or stylesheet is cached', () => {
    assert.equal(isCacheableAsset(req('/assets/js/index-abc.js'), res('text/javascript')), true);
    assert.equal(isCacheableAsset(req('/assets/js/index-abc.js'), res('application/javascript; charset=utf-8')), true);
    assert.equal(isCacheableAsset(req('/assets/index-abc.css'), res('text/css')), true);
    assert.equal(isCacheableAsset(req('/icons/icon-192x192.png'), res('image/png')), true);
});

test('the single-page fallback is never cached in place of an asset', () => {
    // After a deploy the old chunk is gone and the host answers with index.html, status 200
    assert.equal(isCacheableAsset(req('/assets/js/OldChunk-123.js'), res('text/html; charset=utf-8')), false);
    assert.equal(isCacheableAsset(req('/assets/index-old.css'), res('text/html')), false);
    assert.equal(isCacheableAsset(req('/logo.png'), res('text/html')), false);
});

test('error responses are never cached', () => {
    assert.equal(isCacheableAsset(req('/assets/js/index-abc.js'), res('text/javascript', 404)), false);
    assert.equal(isCacheableAsset(req('/assets/js/index-abc.js'), res('text/javascript', 500)), false);
});
