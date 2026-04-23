const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { keycloakLogin, injectKeycloakToken } = require('./policies/keycloak-auth-policy');
require('dotenv').config();

const app = express();
const PORT = process.env.HTTP_PORT || 8080;

// ── Middleware ───────────────────────────────────────────
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));

// ── Health check ────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'metaverse-gateway' });
});

// ── Keycloak login endpoint ─────────────────────────────
app.post('/keycloak/auth', express.urlencoded({ extended: true }), express.json(), keycloakLogin);

// ── Rate limiters ───────────────────────────────────────
const defaultLimiter = rateLimit({ windowMs: 60_000, max: 100 });
const strictLimiter = rateLimit({ windowMs: 60_000, max: 60 });
const highLimiter = rateLimit({ windowMs: 60_000, max: 200 });
const metaverseLimiter = rateLimit({ windowMs: 60_000, max: 120 });

// ── Service URLs ────────────────────────────────────────
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:4001';
const CATALOG_SERVICE_URL = process.env.CATALOG_SERVICE_URL || 'http://localhost:4003';
const PARTNERS_SERVICE_URL = process.env.PARTNERS_SERVICE_URL || 'http://localhost:4001';
const METAVERSE_SERVICE_URL = process.env.METAVERSE_SERVICE_URL || 'http://localhost:4003';

// ── Helper: create proxy ────────────────────────────────
function proxy(target, pathRewrite) {
  const opts = { target, changeOrigin: true };
  if (pathRewrite) opts.pathRewrite = pathRewrite;
  return createProxyMiddleware(opts);
}

// ── Routes → Service proxies ────────────────────────────

// Auth service (no keycloak token needed — partners auth themselves)
app.use('/auth', defaultLimiter, proxy(AUTH_SERVICE_URL));

// Catalog service (keycloak-protected)
app.use('/catalog', injectKeycloakToken, proxy(CATALOG_SERVICE_URL, { '^/': '/catalog/' }));

// Orange offers → metaverse-journey-service
app.use('/orange/offers', injectKeycloakToken, strictLimiter, proxy(METAVERSE_SERVICE_URL, { '^/orange/offers': '/orange/offers' }));

// Discover partners → metaverse-journey-service
app.use('/discover/partners', injectKeycloakToken, proxy(METAVERSE_SERVICE_URL, { '^/discover/partners': '/discover/partners' }));

// Partners service (keycloak-protected)
app.use('/partners', injectKeycloakToken, highLimiter, proxy(PARTNERS_SERVICE_URL, { '^/partners': '' }));

// Unity → partners service (keycloak-protected)
app.use('/unity', injectKeycloakToken, proxy(PARTNERS_SERVICE_URL));

// Metaverse → partners service (keycloak-protected)
app.use('/metaverse', injectKeycloakToken, metaverseLimiter, proxy(PARTNERS_SERVICE_URL, { '^/metaverse': '' }));

// ── 404 ─────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ── Start ───────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Gateway listening on port ${PORT}`);
});

