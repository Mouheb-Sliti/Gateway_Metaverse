const querystring = require('querystring');
const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');

// In-memory state — shared across all requests on this gateway instance
let authToken = null;
const userTokens = {};

async function makeRequest(method, url, data, headers) {
  const config = { method, url, data, headers };
  const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
  if (proxy) {
    config.httpsAgent = new HttpsProxyAgent(proxy);
    config.proxy = false; // let the agent handle proxying
  }
  const response = await axios(config);
  return response.data;
}

/**
 * loginHandler — mounted on POST /keycloak/auth by manifest.js
 * Authenticates with Keycloak and stores the access token for downstream use.
 */
const loginHandler = async (req, res) => {
  try {
    const { grant_type, client_id, client_secret, username, password } = req.body;

    if (!client_secret) {
      return res.status(400).json({ error: 'Client secret is missing' });
    }

    const data = querystring.stringify({
      grant_type: grant_type || 'password',
      client_id: client_id || process.env.KEYCLOAK_CLIENT_ID,
      client_secret: client_secret || process.env.KEYCLOAK_CLIENT_SECRET,
      username,
      password
    });

    const response = await makeRequest('post', process.env.KEYCLOAK_TOKEN_URL, data, {
      'Content-Type': 'application/x-www-form-urlencoded'
    });

    if (!response.access_token) {
      return res.status(500).json({ error: 'Access token is missing from the response' });
    }

    authToken = response.access_token;

    if (!userTokens[username]) {
      userTokens[username] = 0;
    }
    console.log(`User ${username} authenticated. Token balance: ${userTokens[username]}`);
    res.status(200).json({ message: 'User authenticated successfully!', tokens: userTokens[username] });
  } catch (error) {
    console.error('Keycloak auth error:', error.message);
    res.status(500).json({ error: 'Keycloak auth error' });
  }
};

/**
 * Express-Gateway policy — injects the stored Keycloak token into every
 * proxied request as an Authorization header, so downstream microservices
 * can use it directly for Disco API calls.
 */
module.exports = {
  name: 'keycloak-auth-policy',
  loginHandler,
  policy: (actionParams) => {
    return (req, res, next) => {
      if (authToken) {
        req.headers['authorization'] = `Bearer ${authToken}`;
      } else {
        console.warn('keycloak-auth-policy: no token available — call POST /keycloak/auth first');
      }
      next();
    };
  },
  schema: {
    $id: 'keycloak-auth-policy',
    type: 'object',
    properties: {}
  }
};
