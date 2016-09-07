const nconf = require('nconf');
const path = require('path');

nconf.add('user', { type: 'file', file: path.join(__dirname, 'development.json') });

nconf.argv()
  .env()
  .file({ file: path.join(__dirname, 'config.json') });



process.env.NODE_ENV = nconf.get('NODE_ENV');
process.env.PORT = nconf.get('PORT') || 3000;
module.exports = nconf;
