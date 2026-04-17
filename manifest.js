const express = require('express');

module.exports = {
    version: '1.0.0',
    policies: ['catalog-policy', 'keycloak-auth-policy'],
    init: function (pluginContext) {
        // Register catalog policy
        const catalogPolicy = require('./policies/catalog-policy');
        pluginContext.registerPolicy(catalogPolicy);

        // Register Keycloak auth policy (token injection into proxied requests)
        const keycloakPolicy = require('./policies/keycloak-auth-policy');
        pluginContext.registerPolicy(keycloakPolicy);

        // Mount the Keycloak login endpoint on the gateway
        // POST /keycloak/auth — call this first to authenticate and store the token
        pluginContext.registerGatewayRoute(app => {
            app.post('/keycloak/auth', express.json(), keycloakPolicy.loginHandler);
        });
    }
}