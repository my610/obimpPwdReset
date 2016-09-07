'use strict';

const nodemailer = require('nodemailer');
const jade = require('jade');

const config = require('../config');
const Token = require('../libs/token');

let transporter = nodemailer.createTransport({
  service: config.get('mailer:service'),
  auth: {
    user: config.get('mailer:login'),
    pass: config.get('mailer:password')
  }
});


class SendMail {

  constructor(user, i18n, protocol) {

    this.securityMail = user.secureEmail;
    this.login = user.account;
    this.password = user.password;
    this.i18n = i18n;
    this.protocol = protocol;

    this.mailOptions = {
      from: config.get('mailer:login'),
      to: this.securityMail,
      subject: i18n.t('logo'),
      text: '',
      html: ''
    };

  }

  send() {

    return new Promise((resolve, reject) => {

      let token = Token.cryptToken(this.login),
        sign = Token.signToken(this.login, this.password),
        query = {token: token, sign: sign},
        url = Token.getURL(this.protocol, config.get('host'), 'reset', query);

      const compiledFunction = jade.compileFile('./templates/mail.' + this.i18n.getLocale() + '.jade');

      this.mailOptions.text = this.i18n.t('mail_text', url);
      this.mailOptions.html = compiledFunction({url: url});

      transporter.sendMail(this.mailOptions, function (error, info) {
        if (error) {
          reject(error);
          console.log('sendMail error: ', error.message);
        }
        resolve();
        console.log('Message sent: ' + info.response);
      });
    })
  }

}

exports.SendMail = SendMail;

