/**
 * ICC 4.4 parser
 * based on https://github.com/lovell/icc
 * derived from https://github.com/lovell/icc/blob/main/index.js
 */

// Copyright 2015 Lovell Fuller and others.
// SPDX-License-Identifier: Apache-2.0
// http://www.color.org/profileheader.xalter

import {binaryDecoder, utf16beDecoder, toHexString} from './commons.js';
import {tagParsers, tagSignatureMap} from './icc-tags.js';

export function parse(buffer) {
  let array = new Uint8Array(buffer);
  let view = new TagDataView(buffer);
  let parsed = {};
  let len = view.getUint32(0);
  if (len !== array.length) {
    throw new Error(`Expected file length to be ${len} but got ${array.length}`);
  }
  let str = view.getBinaryString4(36);
  const fileSignature = 'acsp';
  if (str !== fileSignature) {
    throw new Error(`Expected file signature "${fileSignature}" but got "${str}"`);
  }

  let headers = parsed.headers = {};
  // Header
  headers['cmm'] = view.getBinaryString4(4, true);
  str = view.getUint32(8).toString(16).padStart(8, '0').slice(1, 3);
  headers['profileVersion'] = str[0] + '.' + str[1];
  headers['deviceClass'] = view.getBinaryString4(12);
  headers['colorSpace'] = view.getBinaryString4(16).trimEnd();
  headers['connectionSpace'] = view.getBinaryString4(20).trimEnd();
  headers['createionDate'] = new Date(view.getDateTimeNumber(24));
  headers['platform'] = view.getBinaryString4(40, true);
  headers['flags'] = view.getUint32(44);
  headers['manufacturer'] = view.getBinaryString4(48, true).trimEnd();
  headers['model'] = view.getBinaryString4(52, true).trimEnd();
  headers['media'] = (view.getUint32(56) << 32) + view.getUint32(60);
  headers['intent'] = view.getUint32(64);
  headers['illuminant'] = view.getXYZNumber(68);
  headers['creator'] = view.getBinaryString4(80, true).trimEnd();
  headers['id'] = toHexString(array.subarray(84, 100));
  // 100~128 reverved

  let tags = parsed.tags = {};
  let tagCount = view.getUint32(128);
  let offset = 132;
  let tagTypeWarnings = {};
  for (let i = 0; i < tagCount; i++) {
    let tagSignature = view.getBinaryString4(offset);
    let tagOffset = view.getUint32(offset + 4);
    let tagSize = view.getUint32(offset + 8);
    if (tagOffset + tagSize > array.length) {
      throw new Error('Tag offset out of bounds');
    }
    let tagType = view.getBinaryString4(tagOffset);
    let parser = tagParsers[tagType];
    if (parser) {
      let field = tagSignatureMap[tagSignature];
      if (!field) {
        field = tagSignature;
      }
      tags[field] = parser(view, tagOffset, tagSize);
    } else if (parser === null) {
      if (!tagTypeWarnings[tagType]) {
        tagTypeWarnings[tagType] = true;
        console.warn('Not implemented ICC tag type: ' + tagType);
      }
    } else {
      if (!tagTypeWarnings[tagType]) {
        tagTypeWarnings[tagType] = true;
        console.warn('Unrecognized ICC tag type: ' + tagType);
      }
    }
    offset = offset + 12;
  }
  return parsed;
}

// eslint-disable-next-line no-control-regex
const nullEnding = /\x00\x00*$/;

class TagDataView extends DataView {
  getBinaryString4(offset, strip = false) {
    let a = new Uint8Array(super.buffer, super.byteOffset + offset, 4);
    if (strip) {
      let s = '';
      for (let i = 0; i < a.length; i++) {
        if (a[i] === 0) {
          break;
        } else {
          s += String.fromCharCode(a[i]);
        }
      }
      return s;
    }
    return String.fromCharCode(a[0], a[1], a[2], a[3]);
  }
  getBinaryString(offset, length, strip = false) {
    let a = new Uint8Array(super.buffer, super.byteOffset + offset, length);
    if (strip) {
      let lastIndex = a.length - 1;
      while (lastIndex > -1) {
        if (a[lastIndex] === 0) {
          lastIndex--;
        } else {
          break;
        }
      }
      return binaryDecoder.decode(a.subarray(0, lastIndex + 1));
    }
    return binaryDecoder.decode(a);
  }
  getUTF16BEString(offset, length, strip = false) {
    let a = new Uint8Array(super.buffer, super.byteOffset + offset, length);
    let s = utf16beDecoder.decode(a);
    return strip ? s.replace(nullEnding, '') : s;
  }
  getDateTimeNumber(offset) {
    return Date.UTC(super.getUint16(offset), super.getUint16(offset + 2) - 1, super.getUint16(offset + 4),
      super.getUint16(offset + 6), super.getUint16(offset + 8), super.getUint16(offset + 10));
  }
  getPositionNumber(offset) {
    return {offset: super.getUint32(offset), length: super.getUint32(offset + 4)};
  }
  getResponse16Number(offset) {
    return {code: super.getUint16(offset), measurement: this.getS15Fixed16Number(offset)};
  }
  getS15Fixed16Number(offset) {
    return super.getInt16(offset) + super.getUint16(offset + 2) / 65536;
  }
  getU16Fixed16Number(offset) {
    return super.getUint16(offset) + super.getUint16(offset + 2) / 65536;
  }
  getU1Fixed15Number(offset) {
    let n = super.getUint16(offset);
    return (n >> 15) + (n & 0x8000) / 0x8000;
  }
  getU8Fixed8Number(offset) {
    return super.getUint8(offset) + super.getUint8(offset + 1) / 256;
  }
  getXYZNumber(offset) {
    let a = new Float64Array(3);
    a[0] = this.getS15Fixed16Number(offset);
    a[1] = this.getS15Fixed16Number(offset + 4);
    a[2] = this.getS15Fixed16Number(offset + 8);
    return a;
  }
}
