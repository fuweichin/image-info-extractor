import {binaryDecoder, startsWithArray, concatArrays, decompress} from './commons.js';

const pngMagicNumber = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];

export async function readFile(file) {
  let buffer = await file.arrayBuffer();
  let array = new Uint8Array(buffer);
  if (!startsWithArray(array, pngMagicNumber)) {
    throw new Error('Not a PNG file');
  }
  let result = {};
  let info = {};
  let colorInfo = {};
  let flags = 0;
  let obj = {[Symbol.iterator]() { return findPNGChunks(buffer, pngMagicNumber.length); }};
  findChunks: for (let chunk of obj) {
    switch (chunk.type) {
      case 'IHDR': {
        let data = chunk.data;
        let view = new DataView(data.buffer, data.byteOffset, data.byteLngeht);
        info.width = view.getUint32(0);
        info.height = view.getUint32(4);
        info.bitDepth = view.getUint8(8);
        info.alpha = (view.getUint8(9) & 0b100) > 0;
        info.progressive = view.getUint8(12) === 1;
        info.lossless = true;
        info.animation = false;
        result.INFO = {parsed: info};
        break;
      }
      case 'eXIf':
        result.EXIF = {content: chunk.data.slice().buffer};
        flags |= 0b100;
        break;
      case 'iTXt': {
        let {data} = chunk;
        let {keyword, compressionFlag, compressionMethod, text} = readITXT(data);
        if (keyword === 'XML:com.adobe.xmp') {
          if (compressionFlag === 0) {
            text = text.slice();
          } else if (compressionMethod === 0) {
            text = concatArrays((await decompress([text], 'deflate')).chunks);
          } else {
            break; // cannot read it
          }
          result.XMP = {content: text.buffer};
          flags |= 0b10;
        } else if (keyword === 'Creation Time') {
          info.creationTime = new Date(binaryDecoder.decode(text)).getTime();
        }
        break;
      }
      case 'iCCP':
      case 'iCCN': {
        let g = findNullSeparatedStrings(array, chunk.start + 8);
        let {done, value} = g.next();
        if (done) {
          break;
        }
        let {bytesRead, data: _profileName} = value;
        let j = bytesRead;
        let {data} = chunk;
        let compressionMethod = data[j];
        if (compressionMethod === 0) {
          let chunks = await decompress([data.subarray(j + 1)], 'deflate');
          result.ICC = {content: concatArrays(chunks).buffer};
          flags |= 0b1;
        }
        break;
      }
      case 'sRGB': {
        info.colorSpace = 'srgb';
        info.renderingIntent = chunk.data[0];
        break;
      }
      // HDR color information
      case 'cICP': { // when present, ignore iCCP, sRGB, gAMA, cHRM
        let view = toDataView(chunk.data);
        colorInfo.colorPrimaries = view.getUint8(0);
        colorInfo.transferFunction = view.getUint8(1);
        colorInfo.matrixCoefficients = view.getUint8(2);
        colorInfo.videoFullRangeFlag = view.getUint8(3);
        break;
      }
      case 'cHRM': { // sRGB or iCCP chunk overrides cHRM+gAMA chunk
        let view = toDataView(chunk.data);
        colorInfo.whitePointX =  view.getUint32(0) / 100000;
        colorInfo.whitePointY =  view.getUint32(4) / 100000;
        colorInfo.redPrimaryX =  view.getUint32(8) / 100000;
        colorInfo.redPrimaryY =  view.getUint32(12) / 100000;
        colorInfo.greenPrimaryX = view.getUint32(16) / 100000;
        colorInfo.greenPrimaryY = view.getUint32(20) / 100000;
        colorInfo.bluePrimaryX =  view.getUint32(24) / 100000;
        colorInfo.bluePrimaryY =  view.getUint32(28) / 100000;
        break;
      }
      case 'gAMA': {
        let view = toDataView(chunk.data);
        colorInfo.gamma = 100000 / view.getUint32(0);
        break;
      }
      case 'mDCv': {
        let view = toDataView(chunk.data);
        colorInfo.redPrimaryX =  view.getUint16(0) / 50000;
        colorInfo.redPrimaryY =  view.getUint16(2) / 50000;
        colorInfo.greenPrimaryX = view.getUint16(4) / 50000;
        colorInfo.greenPrimaryY = view.getUint16(6) / 50000;
        colorInfo.bluePrimaryX =  view.getUint16(8) / 50000;
        colorInfo.bluePrimaryY =  view.getUint16(10) / 50000;
        colorInfo.whitePointX =  view.getUint16(12) / 50000;
        colorInfo.whitePointY =  view.getUint16(14) / 50000;
        colorInfo.maximumLuminance = view.getUint32(16) / 10000;
        colorInfo.minimumLuminance = view.getUint32(20) / 10000;
        break;
      }
      case 'cLLi': {
        let view = toDataView(chunk.data);
        colorInfo.maxContentLightLevel =  view.getUint32(0) / 10000;
        colorInfo.maxFrameAverageLightLevel =  view.getUint32(4) / 10000;
        break;
      }
      case 'tIME': {
        let view = toDataView(chunk.data);
        let d = new Date(0);
        d.setFullYear(view.getUint16(0));
        d.setMonth(view.getUint8(2) - 1);
        d.setDate(view.getUint8(3));
        d.setHours(view.getUint8(4));
        d.setMinutes(view.getUint8(5));
        d.setSeconds(view.getUint8(6));
        info.modificationTime = d.getTime();
        break;
      }
      case 'acTL': {
        info.animation = true;
        break findChunks;
      }
      case 'IDAT':
      case 'IEND':
        break findChunks;
    }
  }
  info.flags = flags;
  return result;
}

function toDataView(array) {
  return new DataView(array.buffer, array.byteOffset, array.byteLength);
}
async function readITXT(data) {
  let pos = data.indexOf(0);
  let keyword = binaryDecoder.decode(data.subarray(0, pos));
  let j = pos + 1;
  let compressonFlag = data[j];
  let compressonMethod = data[j + 1];
  j += 2;
  pos = data.indexOf(0, j);
  let languageTag = binaryDecoder.decode(data.subarray(j, pos));
  j = pos + 1;
  pos = data.indexOf(0, j);
  let translatedKeyword = binaryDecoder.decode(data.subarray(j, pos));
  j = pos + 1;
  let text = data.subarray(j);
  return {
    keyword,
    compressonFlag,
    compressonMethod,
    languageTag,
    translatedKeyword,
    text
  };
}

function* findPNGChunks(buffer, start) {
  let view = new PNGDataView(buffer);
  let offset = start;
  while (offset < buffer.byteLength) {
    let chunk = view.getChunk(offset);
    yield chunk;
    offset = chunk.end;
    if (chunk.type === 'IDAT' || chunk.type === 'IEND') {
      break;
    }
  }
}
function* findNullSeparatedStrings(view, offset = 0) {
  let a = new Uint8Array(view.buffer, view.byteOffset + offset);
  let start = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] === 0) {
      yield {bytesRead: i + 1, data: binaryDecoder.decode(a.subarray(start, i))};
      start = i + 1;
    }
  }
}
class PNGDataView extends DataView {
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
  getChunk(offset) {
    let j = offset;
    let dataLength = super.getUint32(j);
    j += 4;
    let type = this.getBinaryString(j, 4);
    j += 4;
    let data = new Uint8Array(super.buffer, j, dataLength);
    j += dataLength;
    let crc = super.getUint32(j);
    j += 4;
    return {type, data, crc, start: offset, end: j};
  }
}
