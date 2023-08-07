/**
 * EXIF 2.32 parser
 * based on https://github.com/devongovett/exif-reader
 */
import {binaryDecoder} from './commons.js';
import {tagNameMap as exifTagNameMap, gpsTagNameMap} from './exif-tags.js';

export function parse(buffer) {
  let array = new Uint8Array(buffer);
  let view = new TagDataView(buffer);
  if (array.length <= 8)
    throw new Error('Invalid EXIF data: ends before ifdOffset');

  let byteOrderMark = view.getUint32(0);
  let littleEndian;
  if (byteOrderMark === 0x49492A00) { // 'II*\x00'
    littleEndian = true;
  } else if (byteOrderMark === 0x4D4D002A) { // 'MM\x00*'
    littleEndian = false;
  } else {
    throw new Error('Invalid EXIF data: expected byte order marker.');
  }
  let ifdOffset = view.getUint32(4, littleEndian);
  if (ifdOffset < 8)
    throw new Error('Invalid EXIF data: ifdOffset < 8');

  let parsed = {};
  let ifd0 = getTags(view, ifdOffset, exifTagNameMap, littleEndian);
  parsed.tiff = ifd0;

  if (array.length >= ifdOffset + 2) {
    let numEntries = view.getUint16(ifdOffset, littleEndian);
    if (array.length >= ifdOffset + 2 + numEntries * 12 + 4) {
      let ifd1Offset = view.getUint32(ifdOffset + 2 + numEntries * 12, littleEndian);
      if (ifd1Offset !== 0) {
        parsed.thumbnail = getTags(view, ifd1Offset, exifTagNameMap, littleEndian);
      }
    }
  }
  if (ifd0) {
    if (ifd0.ExifOffset > 0) {
      parsed.exif = getTags(view, ifd0.ExifOffset, exifTagNameMap, littleEndian);
    }
    if (ifd0.GPSInfo > 0) {
      parsed.gps = getTags(view, ifd0.GPSInfo, gpsTagNameMap, littleEndian);
    }
    let interopOffset = ifd0.InteropOffset || parsed.exif?.InteropOffset;
    if (interopOffset > 0) {
      parsed.interop = getTags(view, interopOffset, exifTagNameMap, littleEndian);
    }
  }
  // #endregion
  return parsed;
}

export function getTags(view, offset, tagNameMap, littleEndian = false) {
  let end = view.byteLength;
  if (offset + 2 > end) {
    return null;
  }
  let tags = {};
  let numEntries = view.getUint16(offset, littleEndian);
  if (offset + 2 + numEntries * 12 > end) {
    return null;
  }
  for (let i = 0, j = offset + 2, tag; i < numEntries; i++, j += 12) {
    tag = view.getUint16(j, littleEndian);
    let field = tagNameMap[tag] || tag.toString(16).toUpperCase().padStart(4, '0');
    let value = view.getTag(j + 2, littleEndian);
    tags[field] = value;
  }
  return tags;
}

const TYPE_SIZE_LUT = [
  0,
  1, // 1: uint8
  1, // 2: ascii char
  2, // 3: uint16
  4, // 4: uint32
  8, // 5: unsigned rational
  1, // 6: int8
  1, // 7: undefined
  2, // 8: int16
  4, // 9: int32
  8, // 10: signed rational
  8, // 11: float32
  8, // 12: float64
];

const TYPE_ARRAY_LUT = [
  null,
  Uint8Array,  // 1: uint8
  null,
  Uint8Array,  // 3: uint16
  Uint32Array, // 4: uint32
  Float64Array, // 5: unsigned rational
  Int8Array,  // 6: int8
  null,
  Int16Array,  // 8: int16
  Int32Array,  // 9: int32
  Float64Array, // 10: signed rational
  Float32Array,  // 11: float32
  Float64Array, // 12: float64
];

export class TagDataView extends DataView {
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
  getTag(offset, littleEndian) {
    let end = super.byteLength;
    if (offset + 7 > end) {
      return null;
    }
    let type = super.getUint16(offset, littleEndian);
    // Exit early in case of unknown or bogus type
    if (type === 0 || type > 10) {
      console.warn('Unrecognized tag type: ' + type);
      return null;
    }
    let valueSize = TYPE_SIZE_LUT[type] || 4; // bytes per element
    let numValues = super.getUint32(offset + 2, littleEndian);
    let payloadLength = valueSize * numValues;
    let valueOffset;
    if (payloadLength <= 4) {
      valueOffset = offset + 6;
    } else {
      if (offset + 10 > end) {
        return null;
      }
      valueOffset = super.getUint32(offset + 6, littleEndian);
    }
    if (type === 2) {
      return this.getBinaryString(valueOffset, numValues, true).trimEnd();
    } else if (type === 7) {
      return new Uint8Array(super.buffer).slice(valueOffset, valueOffset + payloadLength);
    } else {
      if (offset + payloadLength > end) {
        return null;
      }
      if (numValues === 1) {
        return this.getTagValue(valueOffset, type, littleEndian);
      } else {
        let arr = new TYPE_ARRAY_LUT[type](numValues);
        for (let i = 0; i < numValues && valueOffset < end; i++, valueOffset += valueSize) {
          arr[i] = this.getTagValue(valueOffset, type, littleEndian);
        }
        return arr;
      }
    }
  }
  getTagValue(offset, type, littleEndian) {
    switch (type) {
      case 1: // uint8
        return super.getUint8(offset);
      case 3: // uint16
        return super.getUint16(offset, littleEndian);
      case 4: // uint32
        return super.getUint32(offset, littleEndian);
      case 5: // unsigned rational
        return super.getUint32(offset, littleEndian) / super.getUint32(offset + 4, littleEndian);
      case 6: // int8
        return super.getInt8(offset);
      case 8: // int16
        return super.getInt16(offset, littleEndian);
      case 9: // int32
        return super.getInt32(offset, littleEndian);
      case 10: // signed rational
        return super.getInt32(offset, littleEndian) / super.getInt32(offset + 4, littleEndian);
      case 11: // float32
        return super.getFloat32(offset, littleEndian);
      case 12: // float64
        return super.getFloat64(offset, littleEndian);
      default:
        return null;
    }
  }
}
