'use strict';

const crypto = require('crypto');
const url = require('url');
const config = require('../config');
const secret = config.get('bimoid:secret_key');


function cryptToken(account) {
  const cipher = crypto.createCipher('aes256', secret);
  let token = {account: account, expires: Date.now() + config.get('token:expires')};
  let encrypted = cipher.update(JSON.stringify(token), 'utf8', 'base64');
  encrypted += cipher.final('base64');
  return encrypted;
}
module.exports.cryptToken = cryptToken;

function decryptToken(token) {
  const decipher = crypto.createDecipher('aes256', secret);
  try {
    let decrypted = decipher.update(token, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted);
  } catch (err) {
    return false;
  }
}
module.exports.decryptToken = decryptToken;


function signToken(account, password) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(account);
  hmac.update(password);
  return hmac.digest('base64');
}
module.exports.signToken = signToken;


function getURL(protocol, host, path, query) {
  return url.format({
    protocol: protocol,
    slashes: true,
    host: host,
    pathname: path,
    query: query
  });
}
module.exports.getURL = getURL;
