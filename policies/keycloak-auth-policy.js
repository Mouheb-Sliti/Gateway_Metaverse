const querystring = require('querystring');
const http = require('http');
const https = require('https');
const { URL } = require('url');

let authToken = null;

/**
 * Make an HTTPS POST request tunneled through a proxy using HTTP CONNECT.
 * The proxy opens a raw TCP tunnel — no SSL inspection.
 */
function postThroughProxy(proxyUrl, targetUrl, body, headers) {
  return new Promise((resolve, reject) => {
    const proxy = new URL(proxyUrl);
    const target = new URL(targetUrl);
    const targetPort = target.port || 443;

    // Step 1: CONNECT to the proxy
    const connectReq = http.request({
      host: proxy.hostname,
      port: parseInt(proxy.port, 10),
      method: 'CONNECT',
      path: `${target.hostname}:${targetPort}`,
    });

    connectReq.on('connect', (_connectRes, socket) => {
      // Step 2: TLS handshake through the tunnel directly to Keycloak
      const tlsOptions = {
        socket,
        host: target.hostname,
        port: targetPort,
        method: 'POST',
        path: target.pathname + target.search,
        headers: {
          ...headers,
          'Content-Length': Buffer.byteLength(body),
          Host: target.hostname,
        },
        rejectAuthorized: false,
      };

      const req = https.request(tlsOptions, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(data) });
          } catch {
            resolve({ status: res.statusCode, data });
          }
        });
      });

      req.on('error', reject);
      req.write(body);
      req.end();
    });

    connectReq.on('error', reject);
    connectReq.end();
  });
}

/**
 * POST /keycloak/auth — authenticate with Keycloak and store the token.
 */
async function keycloakLogin(req, res) {
  try {
    const { grant_type, client_id, client_secret, username, password } = req.body;

    if (!client_secret) {
      return res.status(400).json({ error: 'client_secret is required' });
    }

    const data = querystring.stringify({
      grant_type: grant_type || 'password',
      client_id: client_id || process.env.KEYCLOAK_CLIENT_ID,
      client_secret,
      username,
      password,
    });

    const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
    let responseData;

    // Use CONNECT tunnel through corporate proxy if configured
    const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
    if (proxyUrl) {
      const result = await postThroughProxy(proxyUrl, process.env.KEYCLOAK_TOKEN_URL, data, headers);
      responseData = result.data;
    } else {
      const result = await require('axios').post(process.env.KEYCLOAK_TOKEN_URL, data, { headers });
      responseData = result.data;
    }

    if (!responseData.access_token) {
      return res.status(500).json({ error: 'No access_token in Keycloak response' });
    }

    authToken = responseData.access_token;
    console.log(`User ${username} authenticated via Keycloak`);

    res.json({ message: 'Authenticated successfully' });
  } catch (err) {
    const detail = err.response ? `${err.response.status} — ${JSON.stringify(err.response.data)}` : err.message;
    console.error('Keycloak auth error:', detail);
    res.status(500).json({ error: 'Keycloak authentication failed', detail });
  }
}

/**
 * Middleware: inject the stored Keycloak token into proxied requests.
 */
function injectKeycloakToken(req, _res, next) {
  if (authToken) {
    req.headers['authorization'] = `Bearer ${authToken}`;
  } else {
    console.warn('keycloak-auth-policy: no token — call POST /keycloak/auth first');
  }
  next();
}

module.exports = { keycloakLogin, injectKeycloakToken };
