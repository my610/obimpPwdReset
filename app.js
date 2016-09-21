'use strict';

let express = require('express');
let path = require('path');
let favicon = require('serve-favicon');
let logger = require('morgan');
let session = require('express-session');
let cookieParser = require('cookie-parser');
let bodyParser = require('body-parser');
let i18n = require('i18n');

const config = require('./config');

i18n.configure({
  locales: config.get('locale:locales'),
  directory: __dirname + '/locales',
  queryParameter: 'lang',
  autoReload: true,
  updateFiles: false,
  defaultLocale: config.get('locale:defaultLocale'),
  cookie: 'lang',
  api: {'__': 't', '__n': 'tn'}
});

let routes = require('./routes/index');
let reset = require('./routes/reset');

let app = express();

let trustProxy = config.get('trust_proxy');
if (!!trustProxy) {
  app.set('trust proxy', trustProxy);
}

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());

app.use(i18n.init);

app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);
app.use('/reset', reset);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      title: res.t("logo"),
      message: err.message,
      error: err,
      i18n: res
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    title: res.t("logo"),
    message: err.message,
    error: {},
    i18n: res
  });
});

module.exports = app;
