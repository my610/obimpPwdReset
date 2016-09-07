'use strict';

const net = require('net');

const obimp = require('./constants');
const BEX = require('./bex');
const Bex = BEX.Bex;
const Handlers = require('./handlers/adminCommands');

const STATUS_OFFLINE = 0;
const STATUS_CONNECTING = 1;
const STATUS_ONLINE = 2;

class BimoidClient {

  constructor(connect, srvKey) {
    /** @private */
    this._conString = connect;
    /** @private */
    this._host = 'bimoid.net';
    /** @type {int} @private */
    this._port = 7024;
    /** @private */
    this._srvKey = srvKey;

    this.initConnection();
    this._sequence = 0;
    this._request = 0;
    this._retry = 0;
    this._status = STATUS_OFFLINE;
    this._cb = [];

    /** @type {Socket} @private */
    this._socket = new net.Socket();
    this._socket.on('data', (data) => {
      this.onData(data)
    });
    this._socket.on('error', (error) => {
      this.doDisconnect(error);
    });
    // this._socket.setNoDelay(true);
  }

  /**
   * @param {Buffer} data
   * @param {int} [offset]
   * @returns {Object|null}
   */
  static getBexHeader(data, offset) {

    offset = offset || 0;

    if (data.length < offset + 17) return null;

    if (data.readUInt8(offset) === 0x23) {
      let bex = {};
      bex.sequence = data.readUInt32BE(offset + 1);
      bex.type = data.readUInt16BE(offset + 5);
      bex.subtype = data.readUInt16BE(offset + 7);
      bex.request = data.readUInt32BE(offset + 9);
      bex.size = data.readUInt32BE(offset + 13);
      return bex;
    }
    return null;
  }

  /**
   * @param {Buffer} data
   * @private
   */
  onData(data) {
    let conn = this;
    const BEX_HEADER_SIZE = 17;
    if (conn.curData)
      conn.curData = Buffer.concat([conn.curData, data]);
    else
      conn.curData = data;
    data = conn.curData;

    if (data.readUInt8(0) === 0x23) {

      if (data.length >= 17) {

        let bex = BimoidClient.getBexHeader(data, 0);
        let cdBex = bex.size + BEX_HEADER_SIZE;

        if (data.length === cdBex) {

          conn.curData = undefined;
          bex.data = data.slice(17, cdBex);
          this.handlerMessageBex(bex);

        } else if (data.length > cdBex) {

          let offset = 0;
          let availableData = data.length;

          while (availableData >= cdBex) {

            bex.data = data.slice(BEX_HEADER_SIZE + offset, cdBex + offset);
            this.handlerMessageBex(bex);

            offset += cdBex;
            availableData -= cdBex;

            if (null !== (bex = BimoidClient.getBexHeader(data, offset))) {
              cdBex = bex.size + BEX_HEADER_SIZE;
            } else {
              conn.curData = data.slice(offset);
              break;
            }
          }
        }
      }
    }
  }

  /**
   *
   * @param {String} key Key of callback array
   * @private
   */
  cbDefine(key) {
    if (this._cb[key] === undefined) this._cb[key] = [];
  }

  /** @private */
  initConnection() {
    let match = this._conString.match(/(.+?):?(\d+|)$/i);
    if (match) {
      this._host = match[1];
      this.setPort(match[2]);
    }
  }

  get sequence() {
    if (this._sequence == 0xFFFFFFFF) this._sequence = 0;
    return this._sequence++;
  }

  get request() {
    if (this._request == 0xFFFFFFFF) this._request = 0;
    return this._request++;
  }

  get retry() {
    if (this._retry === 300) return this._retry * 1000;
    ++this._retry;
    return 1000 * this._retry;
  }

  setPort(val) {
    let port = parseInt(val, 10);
    if (isNaN(port) || (port < 1 || port > 65535)) {
      return;
    }
    this._port = port;
  }

  getPort() {
    return this._port;
  }

  getHost() {
    return this._host;
  }

  /**
   * Parsing BEX packet
   *
   * @param bex
   * @private
   */
  handlerMessageBex(bex) {

    // console.info('\x1b[33mGet packet: %d byte(s) Seq: %d\x1b[0m', bex.data.length, bex.sequence);
    var data = bex.data;
    var offset = 0;

    switch (bex.type) {
      case obimp.OBIMP_BEX_COM:
        switch (bex.subtype) {

          case obimp.OBIMP_BEX_COM_SRV_BYE:
            offset += 8;
            let bye = data.readUInt16BE(offset);
            offset += 4;
            let codeText = {
              1: 'SRV_SHUTDOWN',
              2: 'CLI_NEW_LOGIN',
              3: 'ACCOUNT_KICKED',
              4: 'INCORRECT_SEQ',
              5: 'INCORRECT_BEX_TYPE',
              6: 'INCORRECT_BEX_SUB',
              7: 'INCORRECT_BEX_STEP',
              8: 'TIMEOUT',
              9: 'INCORRECT_WTLD',
              10: 'NOT_ALLOWED',
              11: 'FLOODING'
            };
            this.doDisconnect(null, {statusCode: bye, statusMessage: codeText[bye]});
            break;

          case obimp.OBIMP_BEX_COM_CLI_SRV_KEEPALIVE_PING:
            this.sendPong();
            break;
          default:
            console.error('Unknown subtype');
            break;
        }
        break;
      case obimp.OBIMP_BEX_WADM:

        switch (bex.subtype) {

          case obimp.OBIMP_BEX_WADM_SRV_LOGIN_REPLY:
            let login = Handlers.srvLoginReplyHandler(data, offset);
            if (login.Logged) {
              this.onLogin(login);
            }
            break;

          case obimp.OBIMP_BEX_WADM_SRV_PARAMS_REPLY:
            let params = Handlers.srvParamsReplyHandler(data, offset);
            params.request = bex.request;
            this.doCliParams(params);
            break;

          case obimp.OBIMP_BEX_WADM_SRV_STATE:
            console.info('OBIMP_BEX_WADM_SRV_STATE');
            let state = Handlers.srvStateHandler(data, offset);
            break;

          case obimp.OBIMP_BEX_WADM_SRV_EXT_LIST_REPLY:
            console.info('OBIMP_BEX_WADM_SRV_EXT_LIST_REPLY');
            let extensions = Handlers.srvExtListReqReplyHandler(data, offset);
            break;

          case obimp.OBIMP_BEX_WADM_SRV_SET_REPLY:
            console.info('OBIMP_BEX_WADM_SRV_SET_REPLY');
            break;

          case obimp.OBIMP_BEX_WADM_SRV_BROADCAST_REPLY:
            console.info('OBIMP_BEX_WADM_SRV_BROADCAST_REPLY');
            let bc = Handlers.srvBroadcastReplyHandler(data, offset);
            bc.request = bex.request;
            break;

          case obimp.OBIMP_BEX_WADM_SRV_USER_REPLY:
            let user = Handlers.srvUserReplyHandler(data, offset);
            user.request = bex.request;
            this.doUserReply(user);
            break;

          case obimp.OBIMP_BEX_WADM_SRV_LIST_REPLY:
            console.info('OBIMP_BEX_WADM_SRV_LIST_REPLY Req: %d', bex.request);
            let list = Handlers.srvListReplyHandler(data, offset);
            list.request = bex.request;
            break;

          case obimp.OBIMP_BEX_WADM_SRV_EXT_UPD_REPLY:
            console.info('OBIMP_BEX_WADM_SRV_EXT_UPD_REPLY');
            let extUpd = Handlers.srvExtUpdReplyHandler(data, offset);
            extUpd.request = bex.request;
            break;

          default:
            console.error('Unknown subtype');
            break;
        }
        break;
      default:
        console.error('Unknown BEX type: ' + bex.type);
        break;
    }
  }

  /**
   * Send BEX packet to server
   * @param {Buffer} Bex
   * @private
   * */
  sendBex(Bex) {
    if (!this._socket.destroyed)
      this._socket.write(Bex);
  }

  /**
   *
   * @returns {Promise}
   * @private
   */
  doConnect() {

    this._status = STATUS_CONNECTING;

    return new Promise((resolve, reject) => {

      /** @private */
      this.onLogin = (login) => {

        if (login.Logged) {
          this._status = STATUS_ONLINE;
          this._retry = 0;
          console.info("\x1b[32mConnected bimoid server v%s.%s.%s.%s\x1b[0m", login.major, login.minor, login.release, login.build);
          resolve(login);
        } else {
          reject(new Error("not logged"));
        }
      };

      this._socket.connect(this.getPort(), this.getHost(), () => {
        this._status = STATUS_CONNECTING;
        this._sequence = 0;
        this._request = 0;
        let hello = new Bex(obimp.OBIMP_BEX_WADM, obimp.OBIMP_BEX_WADM_CLI_LOGIN, this.sequence, this.request);
        hello.push(BEX.PD_TYPE_UTF8, 1, this._srvKey);
        this.sendBex(hello.end);
      });

    });
  }

  /** @private */
  doDisconnect(error, data) {

    let listeners = this._socket.listeners('connect');
    let count = listeners.length;

    for (var i = 0; i < count; i++) {
      this._socket.removeListener('connect', listeners[i].listener);
    }

    let message = !!data ? data.statusMessage : '';
    if (error) message = error.message;

    console.log('\x1b[31mdoDisconnect:\x1b[0m', message);
    this._status = STATUS_OFFLINE;

    if (!error) {
      console.log('\x1b[31msrvBye\x1b[0m Code: %d ( \x1b[31m%s\x1b[0m )', data.statusCode, data.statusMessage);
    }

    setTimeout(() => {
      this.reconnect();
    }, this.retry);
  }

  sendPing() {
    let pkt = new Bex(obimp.OBIMP_BEX_COM, obimp.OBIMP_BEX_COM_CLI_SRV_KEEPALIVE_PING, this.sequence, 0);
    this.sendBex(pkt.end);
  }

  sendPong() {
    let pkt = new Bex(obimp.OBIMP_BEX_COM, obimp.OBIMP_BEX_COM_CLI_SRV_KEEPALIVE_PONG, this.sequence, 0);
    this.sendBex(pkt.end);
  }

  get logged() {
    return this._status === STATUS_ONLINE;
  }

  /**
   * Login to server bimoid
   *
   * @returns {Promise}
   */
  login() {
    console.info('\x1b[34mConnected to: %s:%d\x1b[0m', this.getHost(), this.getPort());
    console.info('\x1b[34mSrv key: %s\x1b[0m', this._srvKey);
    return this.doConnect();
  }

  reconnect() {
    if (this._status === STATUS_CONNECTING) return;
    console.info('\x1b[31mReconnected to: %s:%d\x1b[0m', this.getHost(), this.getPort());
    return this.doConnect();
  }

  cliParams() {
    let bex = new Bex(obimp.OBIMP_BEX_WADM, obimp.OBIMP_BEX_WADM_CLI_PARAMS, this.sequence, 0);
    this.sendBex(bex.end);
  }

  /**
   *
   * @param params
   * @private
   */
  doCliParams(params) {
    if (this._cb["cliParams"] === undefined || !this._cb["cliParams"].length) return;
    let cb = this._cb["cliParams"][params.request];
    if (cb && typeof cb == "function") {
      cb(params);
    }
  }

  /**
   * Get server parameters
   *
   * @returns {Promise}
   */
  getCliParams() {

    let _req = this.request;

    let bex = new Bex(obimp.OBIMP_BEX_WADM, obimp.OBIMP_BEX_WADM_CLI_PARAMS, this.sequence, _req);
    this.sendBex(bex.end);

    return new Promise((resolve, reject) => {

      this.cbDefine("cliParams");

      this._cb["cliParams"][_req] = (params) => {
        resolve(params);
        delete this._cb["cliParams"][_req];
      };

      setTimeout(() => {
        this._cb["cliParams"][_req] = null;
        delete this._cb["cliParams"][_req];
        reject(new Error("Can't get client params (timeout)"));
      }, 10000);
    });
  }

  /**
   *
   * @param user
   * @private
   */
  doUserReply(user) {
    if (this._cb["userReply"] === undefined || !this._cb["userReply"].length) return;
    let cb = this._cb["userReply"][user.request];
    if (cb && typeof cb == "function") {
      cb(user);
    }
  }

  getUserDetails(login) {

    let _req = this.request;

    let bex = new Bex(obimp.OBIMP_BEX_WADM, obimp.OBIMP_BEX_WADM_CLI_USER, this.sequence, _req);
    bex.push(BEX.PD_TYPE_WORD, 1, obimp.CMD_USER_DETAILS);
    bex.push(BEX.PD_TYPE_UTF8, 2, login);
    this.sendBex(bex.end);

    return new Promise((resolve, reject) => {

      this.cbDefine("userReply");

      this._cb["userReply"][_req] = (user) => {
        resolve(user);
        this._cb["userReply"][_req] = null;
        delete this._cb["userReply"][_req];
      };

      setTimeout(() => {
        this._cb["userReply"][_req] = null;
        delete this._cb["userReply"][_req];
        reject(new Error("Can't get user details (timeout)"));
      }, 10000);
    });
  }

  /**
   * Set new password
   *
   * @param {String} login
   * @param {String} password
   * @returns {Promise}
   */
  setPassword(login, password) {
    let _req = this.request;
    let bex = new Bex(obimp.OBIMP_BEX_WADM, obimp.OBIMP_BEX_WADM_CLI_USER, this.sequence, _req);
    bex.push(BEX.PD_TYPE_WORD, 1, obimp.CMD_USER_UPD);
    bex.push(BEX.PD_TYPE_UTF8, 2, login);
    bex.push(BEX.PD_TYPE_UTF8, 3, password);
    this.sendBex(bex.end);

    return new Promise((resolve, reject) => {

      this.cbDefine("userReply");

      this._cb["userReply"][_req] = (user) => {
        resolve((user.code === obimp.USER_RES_SUCCESS));
        delete this._cb["userReply"][_req];
      };

      setTimeout(() => {
        delete this._cb["userReply"][_req];
        reject(new Error("Can't set new user password (timeout)"));
      }, 30000);
    });
  }
}
exports.BimoidClient = BimoidClient;

