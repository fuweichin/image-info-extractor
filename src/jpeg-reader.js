/**
 * JPEG reader
 * based on https://github.com/titarenko/fast-exif
 */
import {startsWithArray, utf8Encoder, binaryDecoder, concatArrays} from './commons.js';

const CHUNK_SIZE = 65536;
const jfifIdentifier = utf8Encoder.encode('JFIF\x00');
const jfxxIdentifier = utf8Encoder.encode('JFXX\x00');
const exifIdentifier = utf8Encoder.encode('Exif\x00\x00');
const xmpIdentifier = utf8Encoder.encode('http://ns.adobe.com/xap/1.0/\x00');
const exmpIdentifier = utf8Encoder.encode('http://ns.adobe.com/xmp/extension/\x00');
const iccIdentifier = utf8Encoder.encode('ICC_PROFILE\x00');
const iptcIdentifier = utf8Encoder.encode('Photoshop 3.0\x00');
const mjpgIdentifier = utf8Encoder.encode('mjpg');

const SOF = [0xFFC0, 0xFFC1, 0xFFC2, 0xFFC3, 0xFFC5, 0xFFC6, 0xFFC7, 0xFFC9, 0xFFCA, 0xFFCB, 0xFFCD, 0xFFCE, 0xFFCF,
  0xFFF7];
const progressiveMarkers = [0xFFC2, 0xFFC5, 0xFFCA, 0xFFCE];
const losslessMarkers = [0xFFC3, 0xFFC7, 0xFFCB, 0xFFCF];

/**
 * @param {File} file
 * @returns {Object}
 * @async
 */
export async function readFile(file) {
  let result = {};
  let info = {alpha: false, lossless: false, progressive: false, animation: false};
  let flags = 0;
  let obj = {[Symbol.asyncIterator]() { return findJPEGSegments(file); }};
  let exmpChunks = [];
  let iccChunks = [];
  for await (let seg of obj) {
    let {marker, data: array} = seg;
    if (marker === 0xFFE0) { // APP0
      if (startsWithArray(array, jfifIdentifier)) { // JFIF
        result.JFIF = {content: array.slice(jfifIdentifier.length).buffer};
        flags |= 0b10000;
      } else if (startsWithArray(array, jfxxIdentifier)) { // JFIF extension
        result.JFXX = {content: array.slice(jfxxIdentifier.length).buffer};
        flags |= 0b1000;
      }
    } else if (marker === 0xFFE1) { // APP1
      if (startsWithArray(array, exifIdentifier)) { // EXIF
        result.EXIF = {content: array.slice(exifIdentifier.length).buffer};
        flags |= 0b100;
      } else if (startsWithArray(array, xmpIdentifier)) { // XMP
        result.XMP = {content: array.slice(xmpIdentifier.length).buffer};
        flags |= 0b010;
      } else if (startsWithArray(array, exmpIdentifier)) { // Extended XMP
        exmpChunks.push(toExtendedXMPChunk(array, exmpIdentifier.length));
      } else if (startsWithArray(array, mjpgIdentifier)) {
        info.animation = true;
      }
    } else if (marker === 0xFFE2) { // APP2
      if (startsWithArray(array, iccIdentifier)) { // ICC
        iccChunks.push(toICCChunk(array, iccIdentifier.length));
      }
    } else if (marker === 0xFFED) { // APP13
      if (startsWithArray(array, iptcIdentifier)) {
        let iterable = {[Symbol.iterator]() { return findImageResourceBlocks(array, iptcIdentifier.length); }};
        let iptcBlock = null;
        seekIPTCBlock: for (let block of iterable) {
          if (block.resId === 0x0404) { // IPTC
            iptcBlock = block;
            break seekIPTCBlock;
          }
        }
        if (iptcBlock) {
          result.IPTC = {content: iptcBlock.data.slice(0).buffer};
        }
      }
    } else if (SOF.includes(marker)) { // SOFn
      let view = new DataView(array.buffer, array.byteOffset, array.byteLength);
      info.bitDepth = view.getUint8(0);
      info.width = view.getUint16(3);
      let lines = view.getUint16(1);
      if (lines === 0) {
        // TODO see lines defined in 0xFFDC marker
      } else {
        info.height = lines;
      }
      if (progressiveMarkers.includes(marker)) {
        info.progressive = true;
      }
      if (losslessMarkers.includes(marker)) {
        info.lossless = true;
      }
      result.INFO = {parsed: info};
    } else if (marker === 0xFFDA) { // SOS, EOI
      
      break;
    } else if (marker === 0xFFD9) { // SOS, EOI
      break;
    }
  }
  if (exmpChunks.length > 0) { // merge ExtendedXMP chunks
    let array = mergeExtendedXMPChunks(exmpChunks);
    if (array) {
      result.ExtendedXMP = {content: array.buffer};
    }
  }
  if (iccChunks.length > 0) { // merge ICC chunks
    let array = mergeICCChunks(iccChunks);
    if (array) {
      result.ICC = {content: array.buffer};
      flags |= 0b1;
    }
  }
  info.flags = flags;
  return result;
}
function toExtendedXMPChunk(array, start) {
  let view = new DataView(array.buffer, array.byteOffset, array.byteLength);
  let guid = binaryDecoder.decode(array.subarray(start, start + 32));
  let fullLength = view.getUint32(start + 32);
  let offset = view.getUint32(start + 36);
  let content = array.subarray(start + 40);
  return {content, guid, fullLength, offset};
}
function mergeExtendedXMPChunks(exmpChunks) {
  let fullLength = exmpChunks[0].fullLength;
  exmpChunks.sort((a, b) => Math.sign(a.offset - b.offset));
  let array = new Uint8Array(fullLength);
  let j = 0;
  for (let i = 0; i < exmpChunks.length; i++) {
    let {content, offset} = exmpChunks[i];
    if (offset !== j) {
      console.warn('ExtendedXMP chunk offset mismatch');
      return null;
    }
    array.set(content, j);
    j += content.length;
  }
  if (j !== fullLength) {
    console.warn('ExtendedXMP full length mismatch');
    return null;
  }
  return array;
}
function toICCChunk(array, start) {
  return {
    number: array[12],
    total: array[13],
    content: array.subarray(start + 2),
  };
}
function mergeICCChunks(iccChunks) {
  let expected = iccChunks[0].total;
  let actual = iccChunks.length;
  if (actual !== expected) {
    console.warn('ICC chunk count mismatch');
    return null;
  }
  iccChunks.sort((a, b) => Math.sign(a.number - b.number));
  let totalLength = 0;
  for (let chunk of iccChunks) {
    totalLength += chunk.content.length;
  }
  let array = new Uint8Array(totalLength);
  for (let i = 0, offset = 0; i < expected; i++) {
    let content = iccChunks[i].content;
    array.set(content, offset);
    offset += content.length;
  }
  for (let chunk of iccChunks) {
    totalLength += chunk.content.byteLength;
  }
  return array;
}

async function* findJPEGSegments(file) {
  let chunkSize = CHUNK_SIZE;
  let fileSize = file.size;
  let buffer = await file.slice(0, Math.min(chunkSize, fileSize)).arrayBuffer();
  let fileOffset = buffer.byteLength;
  if (buffer.byteLength < 4)
    return null;
  let array = new Uint8Array(buffer);
  let view = new DataView(buffer);
  let seg = readNextSegment(view, 0);
  if (seg.marker !== 0xFFD8)
    throw new Error('Unexpected start of file');
  let arrayOffset = 2;
  let ensureBufferSize = async (minSize) => {
    if (array.length <= minSize) {
      if (fileOffset >= fileSize)
        return false;
      let newBuffer = await file.slice(fileOffset, Math.min(fileOffset + chunkSize, fileSize)).arrayBuffer();
      chunkSize = chunkSize < 2097152 ? chunkSize * 2 : chunkSize;
      fileOffset += newBuffer.byteLength;
      let newArray = concatArrays([array, new Uint8Array(newBuffer)]);
      buffer = newArray.buffer;
      array = newArray;
      view = new DataView(buffer);
    }
    return true;
  };
  while (true) {
    let ok = await ensureBufferSize(arrayOffset + 4);
    if (!ok) {
      break;
    }
    seg = readNextSegment(view, arrayOffset);
    let {marker, length} = seg;
    if (marker >= 0xFFC0 && marker <= 0xFFEF) {
      let offset = arrayOffset + 4;
      let dataLength = length - 2;
      let data;
      if (marker >= 0xFFD0 && marker <= 0xFFDA) {
        data = new Uint8Array(0);
      } else {
        if (array.length <= offset + length) {
          let ok = await ensureBufferSize(offset + length);
          if (!ok) {
            break;
          }
        }
        data = array.subarray(offset, offset + dataLength);
      }
      yield {marker, data, start: offset, end: offset + length};
    } else {
      break;
    }
    arrayOffset += 2 + length;
  }
  return null;
}

let readNextSegment = (view, start) => {
  let marker = view.getUint16(start);
  let b0 = marker >> 8;
  if (b0 !== 0xFF)
    throw new Error('Unexpected segment marker: 0x' + marker.toString(16).toUpperCase().padStart(4, '0'));
  let b1 = marker & 0xFF;
  let length;
  if (b1 >= 0xD0 && b1 <= 0xD9) {
    length = 0;
  } else if (b1 === 0xDD) {
    length = 4;
  } else {
    length = view.getUint16(start + 2);
  }
  return {marker, length};
};

function* findImageResourceBlocks(array, offset) {
  const signature = '8BIM';
  let view = new DataView(array.buffer, array.byteOffset, array.byteLength);
  let j = offset;
  while (j < view.byteLength) {
    let str = binaryDecoder.decode(new Uint8Array(view.buffer, view.byteOffset + j, 4));
    if (str !== signature) {
      throw new Error(`Expected IPTC signature "${signature}" but got "${str}"`);
    }
    let resId = view.getUint16(j + 4);
    j += 6;
    let nameLength = view.getUint8(j);
    let name = binaryDecoder.decode(array.subarray(j + 1, j + 1 + nameLength));
    let n = 1 + name.length;
    if (n % 2 === 1) {
      n += 1;
    }
    j += n;
    let dataSize = view.getUint32(j);
    j += 4;
    let data = new Uint8Array(view.buffer, view.byteOffset + j, dataSize);
    j += dataSize % 2 === 1 ? dataSize + 1 : dataSize;
    yield {resId, name, data};
  }
}
