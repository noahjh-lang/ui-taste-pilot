// CloudFront Function (cloudfront-js-2.0), viewer-request.
//
// The web app is a static export: every dynamic route is pre-rendered once
// under a "_" placeholder segment (e.g. /recipes/_/index.html), and the page
// reads the real id from the URL on the client. This maps real URLs onto
// those files and adds index.html for directory-style paths.
//
// Keep DYNAMIC_PREFIXES in sync with the [param] routes in apps/web/src/app.

var DYNAMIC_PREFIXES = ['recipes', 'party', 'r', 'c', 'invite'];

function handler(event) {
  var request = event.request;
  var parts = request.uri.split('/');

  // ['', 'recipes', '42', ...] -> ['', 'recipes', '_', ...]
  if (parts.length > 2 && DYNAMIC_PREFIXES.indexOf(parts[1]) !== -1 && parts[2] !== '') {
    parts[2] = '_';
  }

  var uri = parts.join('/');
  var last = parts[parts.length - 1];
  if (uri.endsWith('/')) {
    uri += 'index.html';
  } else if (last.indexOf('.') === -1) {
    uri += '/index.html';
  }

  request.uri = uri;
  return request;
}
