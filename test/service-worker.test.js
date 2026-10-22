import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const origin = 'https://example.com';
const base = origin + '/pick/';
const source = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');

function setup() {
  const stores = new Map();
  const listeners = {};
  let offline = false;
  const key = (request) => new URL(typeof request === 'string' ? request : request.url, base).href;
  const caches = {
    keys: async () => [...stores.keys()],
    delete: async (name) => stores.delete(name),
    open: async (name) => {
      if (!stores.has(name)) stores.set(name, new Map());
      const store = stores.get(name);
      return {
        addAll: async (paths) => paths.forEach((path) => store.set(key(path), new Response(path))),
        put: async (request, response) => store.set(key(request), response),
      };
    },
    match: async (request) => {
      for (const store of stores.values()) if (store.has(key(request))) return store.get(key(request));
    },
  };
  runInNewContext(source, {
    URL, caches, console,
    self: {
      location: { origin }, skipWaiting: async () => {}, clients: { claim: async () => {} },
      addEventListener: (name, listener) => { listeners[name] = listener; },
    },
    fetch: async (request) => {
      if (offline) throw new Error('offline');
      return new Response(typeof request === 'string' ? request : request.url);
    },
  });
  return {
    stores,
    offline: () => { offline = true; },
    install: () => new Promise((resolve, reject) => listeners.install({ waitUntil: (promise) => promise.then(resolve, reject) })),
    activate: () => new Promise((resolve, reject) => listeners.activate({ waitUntil: (promise) => promise.then(resolve, reject) })),
    request: (path) => new Promise((resolve, reject) => listeners.fetch({
      request: { method: 'GET', mode: 'cors', url: key(path) },
      respondWith: (promise) => promise.then(resolve, reject),
      waitUntil() {},
    })),
  };
}

test('first offline reload can load the actual entry point and every imported module', async () => {
  const worker = setup();
  await worker.install();
  await worker.activate();
  worker.offline();
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const entry = html.match(/<script type="module" src="([^"]+)"/)[1];
  assert.equal((await worker.request('./' + entry)).ok, true);
  // Check the real URLs, including query strings, used by every production module.
  const { readdirSync } = await import('node:fs');
  for (const file of readdirSync(new URL('../js/', import.meta.url))) {
    const module = readFileSync(new URL('../js/' + file, import.meta.url), 'utf8');
    for (const [, path] of module.matchAll(/from\s+['"](\.\/[^'"]+)['"]/g)) {
      assert.equal((await worker.request('./js/' + path.slice(2))).ok, true, path);
    }
  }
});

test('activation deletes only obsolete Pick caches', async () => {
  const worker = setup();
  worker.stores.set('sharp:static:v1', new Map());
  worker.stores.set('arcade-v1', new Map());
  worker.stores.set('pick:static:v1', new Map());
  worker.stores.set('pick:runtime:v1', new Map());
  await worker.install();
  await worker.activate();
  assert.ok(worker.stores.has('sharp:static:v1'));
  assert.ok(worker.stores.has('arcade-v1'));
  assert.equal(worker.stores.has('pick:static:v1'), false);
  assert.equal(worker.stores.has('pick:runtime:v1'), false);
});
