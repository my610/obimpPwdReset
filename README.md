# obimpPwdReset

Сброс пароля от учетной записи Bimoid через электронную почту для восстановления.

  - Поддержка Bimoid сервера v1.0.48.x и v2.0.49.x
  - Для работы требуется [Node.js](https://nodejs.org/) v6+
  - Для восстановления используется привязанный к аккаунту SecurityMail
  
### Установка

```sh
$ git clone https://github.com/my610/obimpPwdReset.git
$ cd obimpPwdReset
$ npm install
```

### Настройка

Все параметры приложения содержатся в файле __/config/config.json__

```json
{
  "NODE_ENV": "production",
  "host": "localhost:3000",
  "PORT": 3000,
  "locale": {
    "locales": ["en", "ru"],
    "defaultLocale": "ru"
  },
  "reCaptcha": {
    "site_key": "",
    "secret_key": ""
  },
  "bimoid": {
    "host": "bimoid.net",
    "port": 7024,
    "secret_key": ""
  },
  "mailer": {
    "login": "no-reply@domain.tld",
    "password": "password",
    "service": "Yandex"
  },
  "token": {"expires": 7200},
  "trust_proxy": [ "loopback", "linklocal", "uniquelocal" ]
}
```

**host** - Имя хоста, который будет использоваться при генерации ссылки восстановления для e-mail письма

**PORT** - Порт, на котором будет запущен web сервер

**locale.locales** - доступные локализации (**/locales**)

**reCaptcha:** Регистрируем [ReCaptcha](https://www.google.com/recaptcha/intro/index.html) , после указываем открытый и закрытый ключи, при желании можно выпилить :)

**bimoid:** В данной секции указываются параметры подключения и секретный ключ (ключ можно найти в папке, где установлен сервер) к серверу bimoid

**mailer** Параметры подключения к почте, с которой будут отправляться письма. Все поддерживаемые значения **service** доступны: [nodemailer-wellknown](https://github.com/nodemailer/nodemailer-wellknown#supported-services) 

**token.expires** - Время жизни ссылки восстановления, сек.

**trust_proxy** - Описание значений [тут](http://expressjs.com/ru/guide/behind-proxies.html)

License
----

MIT
