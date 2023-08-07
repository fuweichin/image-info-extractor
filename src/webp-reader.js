import {binaryDecoder} from './commons.js';

export async function readFile(file) {
  let fileSize = file.size;
  let buffer = await file.arrayBuffer();
  let bytesRead = buffer.byteLength;
  let view = new RIFFDataView(buffer);
  if (bytesRead < 12) {
    throw new Error('Not a WebP file');
  }
  let chunk = view.getChunk(0);
  if (chunk.type !== 'RIFF' || view.getBinaryString(chunk.start + 8, 4) !== 'WEBP') {
    throw new Error('Not a WebP file');
  }
  if (8 + chunk.size !== fileSize) {
    throw new Error(`Expected file length to be ${8 + chunk.size} but got ${fileSize}`);
  }
  let result = {};
  let info = {};
  let flags = 0;
  let features = 0;
  findChunks: for (let offset = 12; offset < fileSize; offset = chunk.end) {
    chunk = view.getChunk(offset);
    switch (chunk.type) {
      case 'VP8X': {
        let start = offset + 8;
        let b = view.getUint8(start); // |Rsv|I|L|E|X|A|R|
        info.width = (view.getUint16(start + 4, true) & 0x3FFF) + 1;
        info.height = (view.getUint16(start + 7, true) & 0x3FFF) + 1;
        info.alpha = (b & 0b10000) > 0;
        info.animation = (b & 0b10) > 0;
        info.bitDepth = 8;
        result.INFO = {parsed: info};
        features = b & 0b101100;
        break;
      }
      case 'VP8 ':
      case 'VP8L':
        info.lossless = chunk.type === 'VP8L';
        if (features === 0) {
          break findChunks;
        }
        break;
      case 'EXIF': {
        let start = offset + 8;
        let content = new Uint8Array(buffer).slice(start, start + chunk.size).buffer;
        result.EXIF = {content};
        flags |= 0b100;
        break;
      }
      case 'ICCP': {
        let start = offset + 8;
        let content = new Uint8Array(buffer).slice(start, start + chunk.size).buffer;
        result.ICC = {content};
        flags |= 0b010;
        break;
      }
      case 'XMP ': {
        let start = offset + 8;
        let content = new Uint8Array(buffer).slice(start, start + chunk.size).buffer;
        result.XMP = {content};
        flags |= 0b001;
        break;
      }
      default:
        continue;
    }
    if (flags === 0b111) {
      break;
    }
  }
  info.flags = flags;
  return flags === 0 ? undefined : result;
}

class RIFFDataView extends DataView {
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
    let size = super.getUint32(offset + 4, true);
    let end = offset + 8 + size;
    if (size % 2 === 1)
      end++;
    return {type: this.getBinaryString(offset, 4), size, start: offset, end};
  }
}
