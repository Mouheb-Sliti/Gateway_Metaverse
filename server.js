const path = require('path');
const gateway = require('express-gateway');
require("dotenv").config();

// Load and run the gateway
gateway()
  .load(path.join(__dirname, 'config'))
  .run()
