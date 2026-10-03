import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// CloudFront Functions are plain scripts (no exports), so load the real file.
const source = readFileSync(path.join(__dirname, 'viewer-request.js'), 'utf8');
const handler = new Function(`${source}; return handler;`)() as (event: {
  request: { uri: string };
}) => { uri: string };

const rewrite = (uri: string) => handler({ request: { uri } }).uri;

describe('viewer-request rewrite', () => {
  it.each([
    ['/', '/index.html'],
    ['/home', '/home/index.html'],
    ['/home/', '/home/index.html'],
    ['/_next/static/chunks/app.js', '/_next/static/chunks/app.js'],
    ['/favicon.ico', '/favicon.ico'],
  ])('maps static path %s -> %s', (uri, expected) => {
    expect(rewrite(uri)).toBe(expected);
  });

  it.each([
    ['/recipes/42', '/recipes/_/index.html'],
    ['/recipes/42/', '/recipes/_/index.html'],
    ['/party/abc', '/party/_/index.html'],
    ['/invite/tok-123/', '/invite/_/index.html'],
    ['/r/9', '/r/_/index.html'],
    ['/c/noah', '/c/_/index.html'],
    // Client-side navigation fetches RSC payloads under the same path.
    ['/recipes/42/index.txt', '/recipes/_/index.txt'],
    ['/recipes/42/__next._tree.txt', '/recipes/_/__next._tree.txt'],
  ])('maps dynamic path %s -> %s', (uri, expected) => {
    expect(rewrite(uri)).toBe(expected);
  });

  it('leaves dynamic-route index pages alone', () => {
    expect(rewrite('/recipes/')).toBe('/recipes/index.html');
  });
});
