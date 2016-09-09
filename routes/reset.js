"use strict";

let express = require('express');
let router = express.Router();

const config = require('../config');
const Token = require('../libs/token');

const obimp = require('../obimp/constants');
const bimoid = require('../libs/bimoid').bimoid;

router.get('/', function (req, res, next) {

  const token = req.query.token || '';
  const sign = req.query.sign || '';

  let reset = Token.decryptToken(token);
  if (!reset) {
    next(new Error(res.t("api_bad_link")));
    return;
  }

  if (reset.expires < Date.now()) {
    next(new Error(res.t("api_expires_link")));
    return;
  }

  if (bimoid.logged) {

    bimoid.getUserDetails(reset.account)
      .then((params) => {

        if (params.code === obimp.USER_RES_SUCCESS) {

          let sign_orig = Token.signToken(reset.account, params.password);

          if (sign !== sign_orig) {
            next(new Error(res.t("api_bad_link")));
            return;
          }

          let data = {token: token, sign: sign};
          res.render('reset', {title: res.t("logo"), i18n: res, data: data});
        }
      });

  } else {
    next(new Error(res.t("api_bimoid_srv_down")));
  }

});


router.post('/', function (req, res) {

  const token = req.body.token || '';
  const sign = req.body.sign || '';
  let pwd1 = req.body.password1 || '',
    pwd2 = req.body.password2 || '';

  pwd1 = pwd1.trim();

  if (pwd1 !== pwd2) {
    res.json({code: 400, statusText: res.t("api_password_not_eq")});
  }

  if (pwd1.length < 1) {
    res.json({code: 400, statusText: res.t("api_password_empty")});
  }

  let reset = Token.decryptToken(token);
  if (!reset) {
    res.json({code: 400, statusText: res.t("api_bad_link")});
  }

  if (reset.expires < Date.now()) {
    res.json({code: 403, statusText: res.t("api_expires_link")});
  }

  if (bimoid.logged) {

    bimoid.getUserDetails(reset.account)
      .then((params) => {

        if (params.code === obimp.USER_RES_SUCCESS) {

          let sign_orig = Token.signToken(reset.account, params.password);

          if (sign === sign_orig) {

            bimoid.setPassword(reset.account, pwd1)
              .then((change) => {

                if (change)
                  res.json({code: 200, statusText: res.t("api_pwd_change_true")});
                else
                  res.json({code: 403, statusText: res.t("api_pwd_change_false")});
              })
              .catch(error => {
                res.json({code: 500, statusText: error.message});
              });

          } else res.json({code: 400, statusText: res.t("api_bad_link")});
        }
      });

  } else {
    res.json({code: 500, statusText: res.t("api_bimoid_srv_down")});
  }

});
module.exports = router;
