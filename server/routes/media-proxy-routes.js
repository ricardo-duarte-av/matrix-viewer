'use strict';

const assert = require('assert');
const { Readable } = require('stream');
const urlJoin = require('url-join');
const express = require('express');
const asyncHandler = require('../lib/express-async-handler');
const { fetchEndpoint } = require('../lib/fetch-endpoint');
const identifyRoute = require('../middleware/identify-route-middleware');

const config = require('../lib/config');
const matrixServerUrl = config.get('matrixServerUrl');
assert(matrixServerUrl);
const matrixAccessToken = config.get('matrixAccessToken');
assert(matrixAccessToken);

const router = express.Router({ caseSensitive: true, mergeParams: true });

const CACHE_CONTROL = 'public, max-age=31536000, immutable';

router.get(
  '/thumbnail/:serverName/:mediaId',
  identifyRoute('media-proxy-thumbnail'),
  asyncHandler(async function (req, res) {
    const { serverName, mediaId } = req.params;

    const qs = new URLSearchParams();
    if (req.query.width) qs.append('width', req.query.width);
    if (req.query.height) qs.append('height', req.query.height);
    if (req.query.method) qs.append('method', req.query.method);

    const url = urlJoin(
      matrixServerUrl,
      `/_matrix/client/v1/media/thumbnail/${encodeURIComponent(serverName)}/${encodeURIComponent(mediaId)}?${qs.toString()}`
    );

    const mediaRes = await fetchEndpoint(url, { accessToken: matrixAccessToken });

    const contentType = mediaRes.headers.get('Content-Type');
    if (contentType) res.set('Content-Type', contentType);
    res.set('Cache-Control', CACHE_CONTROL);

    Readable.fromWeb(mediaRes.body).pipe(res);
  })
);

router.get(
  '/download/:serverName/:mediaId',
  identifyRoute('media-proxy-download'),
  asyncHandler(async function (req, res) {
    const { serverName, mediaId } = req.params;

    const url = urlJoin(
      matrixServerUrl,
      `/_matrix/client/v1/media/download/${encodeURIComponent(serverName)}/${encodeURIComponent(mediaId)}`
    );

    const mediaRes = await fetchEndpoint(url, { accessToken: matrixAccessToken });

    const contentType = mediaRes.headers.get('Content-Type');
    if (contentType) res.set('Content-Type', contentType);
    const contentDisposition = mediaRes.headers.get('Content-Disposition');
    if (contentDisposition) res.set('Content-Disposition', contentDisposition);
    res.set('Cache-Control', CACHE_CONTROL);

    Readable.fromWeb(mediaRes.body).pipe(res);
  })
);

module.exports = router;
