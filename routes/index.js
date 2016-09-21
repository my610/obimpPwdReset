"use strict";

let express = require('express');
let router = express.Router();
const config = require('../config');

const crypto = require('crypto');
const obimp = require('../obimp/constants');
const bimoid = require('../libs/bimoid').bimoid;
let Mailer = require('../libs/mailer').SendMail;

let recaptcha = require('express-recaptcha');
let options = {
  // size: 'compact'
};
recaptcha.init(config.get('reCaptcha:site_key'), config.get('reCaptcha:secret_key'), options);


router.get('/', function (req, res) {
  let token = crypto.randomBytes(64).toString('base64');
  res.render('index', {title: res.t("logo"), i18n: res, captcha: recaptcha.render(), token: token});
});

router.get(/^\/lang\/([a-zA-Z]{2})$/, function (req, res) {

  let lang = req.params[0].toLowerCase();
  if (res.getLocales().includes(lang)) {
    res.cookie('lang', lang);
  }
  res.redirect('back')
});


router.post('/', function (req, res) {

  recaptcha.verify(req, function (error) {
    if (!error) {

      if (bimoid.logged) {

        console.log('>> Login:', req.body.login);

        bimoid.getUserDetails(req.body.login)
          .then((params) => {

            switch (params.code) {
              case obimp.USER_RES_SUCCESS:
                console.log('\x1b[31m>> USER_RES_SUCCESS: %s, e-mail: "%s"\x1b[0m', params.account, params.secureEmail);

                if (params.secureEmail.length > 4 && params.secureEmail.includes('@')) {

                  let user = {account: params.account, secureEmail: params.secureEmail, password: params.password};
                  let mailer = new Mailer(user, res, req.protocol, req.hostname);
                  mailer.send()
                    .then(() => {
                      res.json({code: 200, statusText: res.t("send_mail")});
                    })
                    .catch(() => {
                      res.json({code: 500, statusText: res.t("api_service_unavailable")});
                    });
                } else {
                  res.json({code: 403, statusText: res.t("api_security_mail_not_found")});
                }
                break;
              case obimp.USER_RES_NOT_FOUND:
                res.json({code: 404, statusText: res.t("api_user_not_found")});
                break;
              case obimp.USER_RES_SERVICE_TEMP_UNAVAILABLE:
                res.json({code: 500, statusText: res.t("api_service_unavailable")});
                break;
              default:
                res.json({code: 500, statusText: res.t("api_service_unavailable")});
                break;
            }
          });
      } else {
        res.json({code: 500, statusText: res.t("api_bimoid_srv_down")});
      }
    } else {
      res.json({code: 403, statusText: res.t(error)});
    }
  });
});
module.exports = router;
