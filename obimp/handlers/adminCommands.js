'use strict';

const constants = require('../constants');

const SHORT_TYPE_DATA = 0;
const WIDE_TYPE_DATA = 1;

/**
 *
 * @param {int} type
 * @param {Buffer} buffer
 * @param {int} offset
 * @returns {Object|null}
 */
function getDataTLD(type, buffer, offset) {
    let inc = (type === SHORT_TYPE_DATA) ? 4 : 8;
    if (buffer.length < (offset + inc))
        return null;

    var tld = {};
    switch (type) {
        case SHORT_TYPE_DATA:
            tld.type = buffer.readUInt16BE(offset);
            tld.size = buffer.readUInt16BE(offset+2);
            offset+=4; break;
        case WIDE_TYPE_DATA:
            tld.type = buffer.readUInt32BE(offset);
            tld.size = buffer.readUInt32BE(offset+4);
            offset+=8; break;
    }
    if (buffer.length < offset + tld.size)
        return null;
    tld.data = buffer.slice(offset, offset + tld.size);
    return tld;
}
exports.getDataTLD = getDataTLD;

/**
 * Read Int64 from Buffer
 * @param {Buffer} buffer
 * @param {int} offset
 * @returns {number}
 */
function readInt64BEasFloat(buffer, offset) {
    var low = buffer.readInt32BE(offset + 4);
    var n = buffer.readInt32BE(offset) * 4294967296.0 + low;
    if (low < 0) n += 4294967296;
    return n;
}

/**
 * @param {Buffer} data
 * @param {int} offset
 * @return {Object}
 */
function srvLoginReplyHandler(data, offset) {
    var loginReply = {};
    let tld;
    while ( null !== (tld = getDataTLD(WIDE_TYPE_DATA, data, offset)) ) {
        offset += tld.size + 8;
        switch (tld.type) {
            case 1:
                loginReply.ResCode = tld.data.readUInt16BE(0);
                loginReply.Logged = loginReply.ResCode == constants.ADM_RES_CODE_SUCCESS;
                break;
            case 2:
                loginReply.major = tld.data.readUInt16BE(0);
                loginReply.minor = tld.data.readUInt16BE(2);
                loginReply.release = tld.data.readUInt16BE(4);
                loginReply.build = tld.data.readUInt16BE(6);
                break;
        }
    }
    return loginReply;
}
exports.srvLoginReplyHandler = srvLoginReplyHandler;

/**
 * @param {Buffer} data
 * @param {int} offset
 * @return {Object}
 */
function srvParamsReplyHandler(data, offset) {

    var params = {server:{users:{}}, db:{}, FileProxy:{} };

    let tld;
    while ( null !== (tld = getDataTLD(WIDE_TYPE_DATA, data, offset)) ) {
        offset += tld.size + 8;

        switch (tld.type) {

            case 11: params.server.users.online = tld.data.readUInt32BE(0); break;
            case 12: params.server.users.registered = tld.data.readUInt32BE(0); break;
            case 46: params.server.allowFileTransfer = tld.data.readUInt8(0) > 0; break;
            // BLK
            case 45:
                //params[tld.type] = tld.data;
                break;
            // string
            case 1: params.db.path = tld.data.toString(); break;

            case 69:
                params.db.type = tld.data.readUInt8(0);
                switch (params.db.type) {
                    case 0: params.db.typeText = 'SQLite'; break;
                    case 1: params.db.typeText = 'MySQL 4.1+'; break;
                    case 2: params.db.typeText = 'PostgreSQL 8.4+'; break;
                    case 3: params.db.typeText = 'MS SQL Server 2012+'; break;
                }
                break;
            case 70: params.db.host = tld.data.toString(); break;
            case 71: params.db.port = tld.data.readUInt32BE(0); break;
            case 72: params.db.name = tld.data.toString(); break;
            case 73: params.db.user = tld.data.toString(); break;
            case 74: params.db.password = tld.data.toString(); break;

            case 29: case 31: case 32: case 33:
            case 34: case 36: case 37: case 40:
            params[tld.type] = tld.data.toString();
            break;
            // Bool
            case 4: case 5: case 6: case 7:
            case 8: case 30: case 38: case 39:
            case 41: case 42: case 53: case 54: case 55:
            case 56: case 57: case 58: case 63:
            case 67: case 68: case 75: case 76:
            case 77:
                params[tld.type] = tld.data.readUInt8(0) > 0;
                break;
            // Integer
            case 2: case 3:  case 9: case 10:
            case 13: case 14: case 15: case 16: case 17:
            case 18: case 19: case 20: case 21: case 22:
            case 23: case 24:  case 25: case 26: case 27:
            case 28: case 35: case 43: case 44:
            case 59: case 60: case 61:
            case 62: case 64: case 65: case 66:
            var v = 0;
            switch (tld.size){
                case 1: v = tld.data.readInt8(0); break;
                case 2: v = tld.data.readUInt16BE(0); break;
                case 3: v = tld.data.readUInt32BE(0); break;
            }
            params[tld.type] = v;
            break;
            /** FileProxy */
            case 47: params.FileProxy.enabled = tld.data.readUInt8(0) > 0; break;
            case 48: params.FileProxy.host = tld.data.toString(); break;
            case 49: params.FileProxy.port = tld.data.readUInt32BE(0); break;
            case 50: params.FileProxy.szLimit = tld.data.readUInt32BE(0); break;
            case 51: params.FileProxy.writeLog = tld.data.readUInt8(0) > 0; break;
            case 52: params.FileProxy.maxClients = tld.data.readUInt32BE(0); break;
        }
    }
    return params;
}
exports.srvParamsReplyHandler = srvParamsReplyHandler;

/**
 * @param {Buffer} data
 * @param {int} offset
 * @return {Object}
 */
function srvStateHandler(data, offset) {

    var state = {};

    let tld;
    while ( null !== (tld = getDataTLD(WIDE_TYPE_DATA, data, offset)) ) {

        offset += tld.size + 8;
        switch (tld.type) {
            case 1:
                state.online = tld.data.readUInt32BE(0);
                break;
            case 2:
                state.registered = tld.data.readUInt32BE(0);
                break;
        }
    }
    return state;
}
exports.srvStateHandler = srvStateHandler;

/**
 * Server will reply with available extensions list of specified type.

 wTLD 0x0001: Word, extension type
 wTLD 0x0002: BLK, extension items data

 * @param {Buffer} data
 * @param {int} offset
 * @return {Object}
 */
function srvExtListReqReplyHandler(data, offset) {

    var extensions = [];

    let tld;
    while ( null !== (tld = getDataTLD(WIDE_TYPE_DATA, data, offset)) ) {

        offset += tld.size + 8;

        if (tld.type === 1) {

            if (tld.data.readUInt16BE(0) === constants.EXT_TYPE_TRANSPORT) {

                if ( null === (tld = getDataTLD(WIDE_TYPE_DATA, data, offset)) ) break;
                offset += tld.size + 8;

                if (tld.type === 2) {

                    let extCount = tld.data.readUInt32BE(0);
                    let seek = 4;

                    while (extCount > 0) {

                        let extension = { proxy:{} };
                        extension.uuid = tld.data.slice(seek, seek + 16).toString('hex'); seek += 16;
                        let szSTLDs = tld.data.readUInt32BE(seek); seek += 4;

                        while (szSTLDs > 0) {

                            let sld = getDataTLD(SHORT_TYPE_DATA, tld.data, seek);
                            seek += sld.size + 4;
                            szSTLDs -= (sld.size + 4);

                            switch (sld.type) {
                                case 1: extension.name = sld.data.toString(); break;
                                case 2: extension.version = sld.data.toString(); break;
                                case 3: extension.author = sld.data.toString(); break;
                                case 4: extension.url = sld.data.toString(); break;
                                case 5: extension.objCount = sld.data.readUInt32BE(0); break;
                                case 6: extension.enabled = sld.data.readInt8(0) > 0; break;
                                case 7: extension.useUserOnly = sld.data.readInt8(0) > 0; break;
                                case 8: extension.accounts = sld.data.toString(); break;
                                case 0x00A0: extension.proxy.type = sld.data.readUInt8(0); break;
                                case 0x00A1: extension.proxy.host = sld.data.toString(); break;
                                case 0x00A2: extension.proxy.port = sld.data.readUInt32BE(0); break;
                                case 0x00A3: extension.proxy.user = sld.data.toString(); break;
                                case 0x00A4: extension.proxy.pwd = sld.data.toString(); break;
                            }
                        }

                        extensions.push(extension);
                        extCount--;

                    }
                }

            }
        }

    }
    return extensions;
}
exports.srvExtListReqReplyHandler = srvExtListReqReplyHandler;

/**
 * Server will reply with broadcast result code.
 *
 * @param {Buffer} data
 * @param {int} offset
 * @return {Object}
 */
function srvBroadcastReplyHandler(data, offset) {

    let reply = {code:-1};
    let tld = getDataTLD(WIDE_TYPE_DATA, data, offset);
    //offset += tld.size + 8;
    if (tld.type == 1) reply.code = tld.data.readUInt16BE(0);
    return reply;
}
exports.srvBroadcastReplyHandler = srvBroadcastReplyHandler;

/**
 * Server will reply with extension update settings result code.
 *
 * @param {Buffer} data
 * @param {int} offset
 * @return {Object}
 */
function srvExtUpdReplyHandler(data, offset) {

    let extension = {};

    while (data.length > offset) {

        let tld = getDataTLD(WIDE_TYPE_DATA, data, offset);
        offset += tld.size + 8;
        switch (tld.type) {
            case 1:
                extension.uuid = tld.data.toString('hex');
                break;
            case 2:
                extension.code = tld.data.readUInt16BE(0);
                extension.update = extension.code == constants.ADM_EXT_UPD_SET_SUCCESS;
                break;
        }
    }
    return extension;
}
exports.srvExtUpdReplyHandler = srvExtUpdReplyHandler;

/**
 * Server will reply with extension update settings result code.
 *
 * @param {Buffer} data
 * @param {int} offset
 * @return {Object}
 */
function srvListReplyHandler(data, offset) {

    let list = {};

    let tld;
    while ( null !== (tld = getDataTLD(WIDE_TYPE_DATA, data, offset)) ) {

        //let tld = getDataTLD('wtld', data, offset);
        offset += tld.size + 8;
        switch (tld.type) {
            case 1: list.code = tld.data.readUInt16BE(0); break;
            case 2: list.nextIdx = tld.data.readUInt32BE(0); break;
            // Optional:
            case 3: list.account = tld.data.toString(); break;
            case 4: list.lastIp = tld.data.toString(); break;
            case 5: list.loginsCount = readInt64BEasFloat(tld.data, 0); break;
            case 6: list.secureEmail = tld.data.toString(); break;
            case 7: list.nick = tld.data.toString(); break;
            case 8: list.firstName = tld.data.toString(); break;
            case 9: list.lastName = tld.data.toString(); break;
            case 0x000a: list.lastConnected = new Date(readInt64BEasFloat(tld.data, 0)*1000); break;
            // wTLD 0x000A: DateTime, last connected time
            // Optional:
            case 0x000b: list.clientName = tld.data.toString(); break;
            case 0x000c:
                list.version = {};
                list.version.major = tld.data.readUInt16BE(0);
                list.version.minor = tld.data.readUInt16BE(2);
                list.version.release = tld.data.readUInt16BE(4);
                list.version.build = tld.data.readUInt16BE(6);
                break;
            default: break;
        }
    }
    log.debug('srvListReplyHandler', list);
    return list;
}
exports.srvListReplyHandler = srvListReplyHandler;

/**
 * Server will reply with user add/ban/delete result code.
 *
 * @param {Buffer} data
 * @param {int} offset
 * @return {Object}
 */
function srvUserReplyHandler(data, offset) {

    let user = {};

    let tld;
    while ( null !== (tld = getDataTLD(WIDE_TYPE_DATA, data, offset)) ) {

        offset += tld.size + 8;
        switch (tld.type) {
            case 1: user.code = tld.data.readUInt16BE(0); break;
            case 2: user.account = tld.data.toString(); break;
            case 3: user.secureEmail = tld.data.toString(); break;
            case 4: user.nick = tld.data.toString(); break;
            case 5: user.firstName = tld.data.toString(); break;
            case 6: user.lastName = tld.data.toString(); break;
            case 7: user.countryCode = tld.data.readUInt16BE(0); break;
            case 8: user.region = tld.data.toString(); break;
            case 9: user.city = tld.data.toString(); break;
            case 10: user.zip = tld.data.toString(); break;
            case 0x000b: user.address = tld.data.toString(); break;
            case 0x000c: user.langCode1 = tld.data.readUInt16BE(0); break;
            case 0x000d: user.langCode2 = tld.data.readUInt16BE(0); break;
            case 0x000e: user.gender = tld.data.readUInt8(0); break;
            case 0x000f: user.birthday = new Date(readInt64BEasFloat(tld.data, 0)*1000); break;
            case 0x0010: user.homepage = tld.data.toString(); break;
            case 0x0011: user.about = tld.data.toString(); break;
            case 0x0012: user.interests = tld.data.toString(); break;
            case 0x0013: user.email = tld.data.toString(); break;
            case 0x0014: user.additionalEmail = tld.data.toString(); break;
            case 0x0015: user.homePhone = tld.data.toString(); break;
            case 0x0016: user.workPhone = tld.data.toString(); break;
            case 0x0017: user.cellular = tld.data.toString(); break;
            case 0x0018: user.fax = tld.data.toString(); break;
            case 0x0019: user.password = tld.data.toString(); break;
            case 0x001a: user.registration = new Date(readInt64BEasFloat(tld.data, 0)*1000); break;
            case 0x001b: user.presenceStatus = tld.data.readUInt32BE(0); break;
            case 0x001c: user.lastConnected = new Date(readInt64BEasFloat(tld.data, 0)*1000); break;
            case 0x001d: user.lastIP = tld.data.toString(); break;
            case 0x001e: user.banned = tld.data.readUInt8(0) > 0; break;
            case 0x001f: user.banDate = new Date(readInt64BEasFloat(tld.data, 0)*1000); break;
            case 0x0020: user.banNote = tld.data.toString(); break;
            case 0x0021: user.loginsCount = readInt64BEasFloat(tld.data, 0); break;
            case 0x0022: user.showOnlineStatus = tld.data.toString(); break;
            case 0x0023: user.company = tld.data.toString(); break;
            case 0x0024: user.department = tld.data.toString(); break;
            case 0x0025: user.position = tld.data.toString(); break;
            default: break;
        }
    }
    // log.debug('srvUserReplyHandler', user);
    return user;
}
exports.srvUserReplyHandler = srvUserReplyHandler;
