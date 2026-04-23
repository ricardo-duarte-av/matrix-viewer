'use strict';

const assert = require('./assert');

function mxcUrlToHttp({ mxcUrl, mediaBaseUrl }) {
  assert(mxcUrl, '`mxcUrl` must be provided to `mxcUrlToHttp(...)`');
  assert(mediaBaseUrl, '`mediaBaseUrl` must be provided to `mxcUrlToHttp(...)`');
  const [serverName, mediaId] = mxcUrl.substr('mxc://'.length).split('/', 2);
  const base = mediaBaseUrl.replace(/\/$/, '');
  return `${base}/_viewer/media/download/${encodeURIComponent(serverName)}/${encodeURIComponent(
    mediaId
  )}`;
}

const ALLOWED_RESIZE_METHODS = ['scale', 'crop'];
function mxcUrlToHttpThumbnail({ mxcUrl, mediaBaseUrl, size, resizeMethod = 'scale' }) {
  assert(mxcUrl, '`mxcUrl` must be provided to `mxcUrlToHttpThumbnail(...)`');
  assert(mediaBaseUrl, '`mediaBaseUrl` must be provided to `mxcUrlToHttpThumbnail(...)`');
  assert(size, '`size` must be provided to `mxcUrlToHttpThumbnail(...)`');
  assert(
    ALLOWED_RESIZE_METHODS.includes(resizeMethod),
    `\`resizeMethod\` must be ${JSON.stringify(ALLOWED_RESIZE_METHODS)}`
  );
  const [serverName, mediaId] = mxcUrl.substr('mxc://'.length).split('/');

  let qs = new URLSearchParams();
  qs.append('width', Math.round(size));
  qs.append('height', Math.round(size));
  qs.append('method', resizeMethod);

  const base = mediaBaseUrl.replace(/\/$/, '');
  return `${base}/_viewer/media/thumbnail/${encodeURIComponent(serverName)}/${encodeURIComponent(
    mediaId
  )}?${qs.toString()}`;
}

module.exports = { mxcUrlToHttp, mxcUrlToHttpThumbnail };
