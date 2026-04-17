require('dotenv').config();
const express = require('express');
const rateLimit = require('express-rate-limit');
const { createProxyMiddleware } = require('http-proxy-middleware');

const keycloakAuth = require('./policies/keycloak-auth-policy');
const catalogLogger = require('./policies/catalog-policy');

const app = express();
app.use(express.json());

// ── Rate limiters ─────────────────────────────────────────────────────────────
const authLimiter      = rateLimit({ windowMs: 60_000, limit: 100 });
const offersLimiter    = rateLimit({ windowMs: 60_000, limit: 60  });
const partnersLimiter  = rateLimit({ windowMs: 60_000, limit: 200 });
const metaverseLimiter = rateLimit({ windowMs: 60_000, limit: 120 });

// ── Keycloak login ────────────────────────────────────────────────────────────
app.post('/keycloak/auth', keycloakAuth.loginHandler);

// ── Proxy routes (most specific first) ───────────────────────────────────────
app.use('/auth', authLimiter,
  createProxyMiddleware({ target: process.env.AUTH_SERVICE_URL, changeOrigin: true }));

app.use('/catalog', keycloakAuth.middleware, catalogLogger,
  createProxyMiddleware({ target: process.env.CATALOG_SERVICE_URL, changeOrigin: true }));

app.use('/orange/offers', keycloakAuth.middleware, offersLimiter,
  createProxyMiddleware({ target: process.env.METAVERSE_SERVICE_URL, changeOrigin: true }));

app.use('/discover/partners', keycloakAuth.middleware,
  createProxyMiddleware({ target: process.env.METAVERSE_SERVICE_URL, changeOrigin: true }));

app.use('/partners', keycloakAuth.middleware, partnersLimiter,
  createProxyMiddleware({ target: process.env.PARTNERS_SERVICE_URL, changeOrigin: true }));

app.use('/unity', keycloakAuth.middleware,
  createProxyMiddleware({ target: process.env.PARTNERS_SERVICE_URL, changeOrigin: true }));

app.use('/metaverse', keycloakAuth.middleware, metaverseLimiter,
  createProxyMiddleware({ target: process.env.PARTNERS_SERVICE_URL, changeOrigin: true }));

// ── Default catch-all ─────────────────────────────────────────────────────────
app.use(
  createProxyMiddleware({ target: process.env.AUTH_SERVICE_URL, changeOrigin: true }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Gateway running on port ${PORT}`));
