'use strict';

const config = require('../config');
let connStr = config.get('bimoid:host') + ':' + config.get('bimoid:port');
let BimoidClient = require('../obimp/admin').BimoidClient;
const bimoid = new BimoidClient(connStr, config.get('bimoid:secret_key'));

bimoid.login()
  .catch(
    error => console.error(error)
  );

module.exports.bimoid = bimoid;
