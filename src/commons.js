export const utf8Encoder = new TextEncoder('utf-8');
export const utf8Decoder = new TextDecoder('utf-8');
export const binaryDecoder = new TextDecoder('iso-8859-1');
export const utf16beDecoder = new TextDecoder('utf-16be');

/**
 * @param {ArrayLike} array
 * @param {ArrayLike} search
 * @param {number} [position]
 * @returns {boolean}
 */
export function startsWithArray(array, search, position = 0) {
  let end = position + search.length;
  if (end > array.length) {
    return false;
  }
  for (let i = position, j = 0; i < end; i++, j++) {
    if (array[i] !== search[j]) {
      return false;
    }
  }
  return true;
}
/**
 * @param {ArrayLike} array 
 * @param {ArrayLike} search
 * @param {number} [position]
 * @returns {boolean}
 */
export function indexOfArray(array, search, start = 0) {
  if (start < 0) {
    throw new Error('Parameter start cannot be negative');
  }
  let end = start + search.length;
  if (end > array.length) {
    return -1;
  }
  if (search.length === 0) {
    return start;
  }
  let search0 = search[0];
  searchLeading: for (let i = start; i < end; i++) {
    if (array[i] === search0) {
      for (let j = i + 1, k = 1; k < search.length; j++, k++) {
        if (array[j] !== search[k]) {
          continue searchLeading;
        }
      }
      return i;
    }
  }
  return -1;
}
/**
 * @param {Array} array 
 * @param  {string} field
 * @returns {Object}
 */
export function indexBy(arr, field) {
  let map = {};
  for (let i = 0, e; i < arr.length; i++) {
    e = arr[i];
    map[e[field]] = e;
  }
  return map;
}
/**
 * @param {Uint8Array} arr
 * @returns {string}
 */
export function toHexString(arr) {
  let str = '';
  for (let i = 0; i < arr.length; i++) {
    let s = arr[i].toString(16);
    if (s.length === 1)
      str += '0';
    str += s;
  }
  return str;
}
/**
 * @param {string} hex
 * @returns {Uint8Array}
 */
export function fromHexString(str) {
  let len = str.length / 2;
  let arr = new Uint8Array(len);
  for (let i = 0, j = 0; i < len; i++, j += 2) {
    arr[i] = parseInt(str.slice(j, j + 2), 16);
  }
  return arr;
}
/**
 * @param {string} str 
 * @returns {string}
 */
export function basename(str, ext) {
  let pos = str.lastIndexOf('/');
  let name = pos < 0 ? str : str.slice(pos + 1);
  if (typeof ext === 'string' && ext.length > 0) {
    if (name.endsWith(ext)) {
      return name.slice(0, -ext.length);
    }
  }
  return name;
}
/**
 * @param {string} str 
 * @returns {string}
 */
export function extname(str) {
  let pos = str.lastIndexOf('.');
  return pos <= 0 ? '' : str.slice(pos);
}
/**
 * @async
 * @param {Array<Uint8Array>} chunks
 * @param {string} format 'gzip', 'deflate', or 'deflate-raw'
 * @returns {Array<Uint8Array>}
 */
export async function decompress(chunks, format) {
  let writableSink = new BufferedWritableSink();
  await new ReadableStream(new BufferedReadableSink(chunks)).
    pipeThrough(new DecompressionStream(format)).
    pipeTo(new WritableStream(writableSink));
  return writableSink.chunks;
}
export async function compress(chunks, format) {
  let writableSink = new BufferedWritableSink();
  await new ReadableStream(new BufferedReadableSink(chunks)).
    pipeThrough(new CompressionStream(format)).
    pipeTo(new WritableStream(writableSink));
  return writableSink.chunks;
}
/**
 * @param {Uint8Array} array 
 * @param  {Uint8Array} ...sources
 * @returns {Uint8Array}
 */
export function concatArrays(sources) {
  let total = 0;
  for (let source of sources) {
    if (!(source instanceof Uint8Array)) {
      throw new Error('Unexpected source type: ' + Object.prototype.toString.call(source).slice(8, -1));
    }
    total += source.length;
  }
  let arr = new Uint8Array(total);
  let offset = 0;
  for (let source of sources) {
    arr.set(source, offset);
    offset += source.length;
  }
  return arr;
}
class BufferedReadableSink {
  constructor(chunks) {
    if (!Array.isArray(chunks)) {
      throw new Error('parameter chunks should be an Array');
    }
    this.iterator = chunks[Symbol.iterator]();
  }
  pull(controller) {
    let {done, value} = this.iterator.next();
    if (done) {
      controller.close();
    } else {
      controller.enqueue(value);
    }
  }
}
class BufferedWritableSink {
  chunks;
  byteWritten;
  constructor() {
    this.chunks = [];
    this.byteWritten = 0;
  }
  write(chunk) {
    this.chunks.push(chunk);
    this.byteWritten += chunk.length;
  }
}
