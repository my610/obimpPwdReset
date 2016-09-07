'use strict';

// Protocol data types:

const PD_TYPE_BYTE = 0;     // Byte, Bool - unsigned 1 byte
exports.PD_TYPE_BYTE = PD_TYPE_BYTE;
const PD_TYPE_BOOL = 1;
exports.PD_TYPE_BOOL = PD_TYPE_BOOL;
const PD_TYPE_WORD = 2;     // Word - unsigned 2 bytes
exports.PD_TYPE_WORD = PD_TYPE_WORD;
const PD_TYPE_LONGWORD = 3; // LongWord – unsigned 4 bytes
exports.PD_TYPE_LONGWORD = PD_TYPE_LONGWORD;
const PD_TYPE_QUADWORD = 4; // QuadWord – unsigned 8 bytes
exports.PD_TYPE_QUADWORD = PD_TYPE_QUADWORD;
const PD_TYPE_DATETIME = 5; // DateTime - signed 8 bytes, 64-bit unix date time
exports.PD_TYPE_DATETIME = PD_TYPE_DATETIME;
const PD_TYPE_OCTAWORD = 6; // OctaWord – unsigned 16 bytes
exports.PD_TYPE_OCTAWORD = PD_TYPE_OCTAWORD;
const PD_TYPE_UUID = 7;     // UUID - unsigned 16 bytes, Universally Unique Identifier
exports.PD_TYPE_UUID = PD_TYPE_UUID;
const PD_TYPE_BLK = 8;      // BLK - bytes array, variable length
exports.PD_TYPE_BLK = PD_TYPE_BLK;
const PD_TYPE_UTF8 = 9;     // UTF8 - UTF-8 encoded string, variable length
exports.PD_TYPE_UTF8 = PD_TYPE_UTF8;
// Date time values that sending server are in UTC time, excluding birthday values.

class Bex {

  constructor(type, subtype, seq, req) {
    this.type = type;
    this.subtype = subtype;
    this.sequence = seq;
    this.request = req;
    this.fields = [];
    this.size = 0;
  }

  /** @param {int} val */
  setSeq(val) {
    this.sequence = val;
  }

  push(field, id, value, short) {
    short = short || false;
    let fld = {type: field, id: id, data: value, short: short};
    this.fields.push(fld);
  }

  /**
   * Получение размера поля в пакете с учетом заголовка
   * @param {Object} field
   * @returns {number} размер поля в байтах
   * @private
   */
  static _getFieldSize(field) {
    let cdLen = 0;
    switch (field.type) {
      case PD_TYPE_BYTE:
      case PD_TYPE_BOOL:
        cdLen = 1;
        break;
      case PD_TYPE_WORD:
        cdLen = 2;
        break;
      case PD_TYPE_LONGWORD:
        cdLen = 4;
        break;
      case PD_TYPE_QUADWORD:
      case PD_TYPE_DATETIME:
        cdLen = 8;
        break;
      case PD_TYPE_OCTAWORD:
      case PD_TYPE_UUID:
        cdLen = 16;
        break;
      case PD_TYPE_BLK:
        cdLen = field.data.length;
        break;
      case PD_TYPE_UTF8:
        cdLen = Buffer.byteLength(field.data, 'utf8');
        break;
    }
    if (field.short) {
      cdLen += 4
    } else {
      cdLen += 8
    }
    return cdLen;
  }

  /**
   *
   * @private
   */
  _calcSize() {

    for (let i = 0; i < this.fields.length; i++) {
      let fldSize = Bex._getFieldSize(this.fields[i]);
      this.fields[i].size = fldSize;
      this.size += fldSize;
    }
  }

  /**
   *
   * @returns {Buffer}
   */
  get end() {
    this._calcSize();

    let buf = new Buffer(this.size+17);
    buf.fill(0);
    buf.writeUInt8(0x23, 0);
    buf.writeUInt32BE(this.sequence, 1);
    buf.writeUInt16BE(this.type, 5);
    buf.writeUInt16BE(this.subtype, 7);
    buf.writeUInt32BE(this.request, 9);
    buf.writeUInt32BE(this.size, 13);
    let offset = 17;

    for (let i = 0; i < this.fields.length; i++) {

      let _inOff = 8;
      if (this.fields[i].short) {
        _inOff = 4;
        buf.writeUInt16BE(this.fields[i].id, offset);
        buf.writeUInt16BE(this.fields[i].size - _inOff, offset + 2);
      } else {
        buf.writeUInt32BE(this.fields[i].id, offset);
        buf.writeUInt32BE(this.fields[i].size - _inOff, offset + 4);
      }

      switch (this.fields[i].type) {
        case PD_TYPE_BYTE:
          buf.writeUInt8(this.fields[i].data, offset + _inOff);
          break;
        case PD_TYPE_BOOL:
          buf.writeUInt8(this.fields[i].data ? 0x01 : 0x00, offset + _inOff);
          break;
        case PD_TYPE_WORD:
          buf.writeUInt16BE(this.fields[i].data, offset + _inOff);
          break;
        case PD_TYPE_LONGWORD:
          buf.writeUInt32BE(this.fields[i].data, offset + _inOff);
          break;
        case PD_TYPE_QUADWORD:
        case PD_TYPE_DATETIME:
          break;
        case PD_TYPE_OCTAWORD:
          break;
        case PD_TYPE_UUID:
        case PD_TYPE_BLK:
          this.fields[i].data.copy(buf, offset + _inOff, 0);
          break;
        case PD_TYPE_UTF8:
          buf.write(this.fields[i].data, offset + _inOff, this.fields[i].size - _inOff, 'utf8');
          break;
      }

      offset += this.fields[i].size;
    }

    return buf;

  }
}

exports.Bex = Bex;
