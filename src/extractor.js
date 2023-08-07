import {extname, startsWithArray, binaryDecoder} from './commons.js';

import {readFile as readJPEGFile} from './jpeg-reader.js';
import {readFile as readPNGFile} from './png-reader.js';
import {readFile as readWEBPFile} from './webp-reader.js';
import {readFile as readAVIFFile} from './avif-reader.js';
import {readFile as readSVGFile} from './svg-reader.js';

import {parse as parseJFIF, parseJFXX} from './jfif-parser.js';
import {parse as parseEXIF} from './exif-parser.js';
import {parse as parseXMP}  from './xmp-parser.js';
import {parse as parseICC} from './icc-parser.js';
import {parse as parseIPTC} from './iptc-parser.js';

export {readJPEGFile, readPNGFile, readWEBPFile, readAVIFFile, readSVGFile};
export {parseEXIF, parseXMP, parseICC};

export {default as exifHelpers} from './exif-helpers.js';
export {default as xmpHelpers} from './xmp-helpers.js';

/* expose common utilities, tag registries for extensibility */
export * as commons from './commons.js';
export {tagNameMap as exifTagNameMap} from './exif-tags.js';
export {tagTypeMap as xmpTagTypeMap} from './xmp-tags.js';

/**
 * @typedef Metadata
 * @type {Object}
 * @property {ArrayBuffer} content
 * @property {Object} parsed
 */
/**
 * @typedef ReadResult
 * @type {Object}
 * @property {Metadata} INFO - always present
 * @property {Metadata} EXIF
 * @property {Metadata} XMP
 * @property {Metadata} ICC
 * @property {Metadata} ExtendedXMP - JPEG-only
 * @property {Metadata} IPTC - JPEG-only
 * @property {Metadata} JFIF - JPEG-only
 */

/**
 * @param {Blob} file 
 * @returns {ReadResult}
 */
export async function readFile(file) {
  let {type} = file;
  if (!type) {
    type = getFileTypeByName(file.name);
    if (!type) {
      type = imageContentSniff(await file.slice(0, 40).arrayBuffer());
    }
  }
  switch (type) {
    case 'image/jpeg':
      return readJPEGFile(file);
    case 'image/png':
    case 'image/apng':
      return readPNGFile(file);
    case 'image/webp':
      return readWEBPFile(file);
    case 'image/avif':
    case 'image/heif':
    case 'image/heic':
    case 'image/avif-sequence': // still support it
    case 'image/heif-sequence':
    case 'image/heic-sequence':
      return readAVIFFile(file);
    case 'image/svg+xml':
      return readSVGFile(file);
    default:
      throw new Error(`Unsupported file type: ${file.type}`);
  }
}

/**
 * process extracted metadata content
 * @param {ReadResult} result
 * @returns {ReadResult}
 */
export function parseResult(result) {
  if (!result)
    return result;
  let {INFO, JFIF, EXIF, XMP, IPTC, ICC} = result;
  if (JFIF) {
    JFIF.parsed = parseJFIF(JFIF.content);
    let {JFXX} = result;
    if (JFXX) {
      JFXX.parsed = parseJFXX(JFXX.content);
    }
  }
  if (EXIF) {
    EXIF.parsed = parseEXIF(EXIF.content);
    let o;
    if (INFO && !('rotation' in INFO.parsed && 'mirror' in INFO.parsed) && (o = EXIF.parsed.tiff?.Orientation) !== undefined) {
      Object.assign(INFO.parsed, parseOrientation(o));
    }
  }
  if (XMP) {
    XMP.parsed = parseXMP(XMP.content);
    let {ExtendedXMP} = result;
    if (ExtendedXMP) {
      ExtendedXMP.parsed = parseXMP(ExtendedXMP.content);
    }
  }
  if (IPTC) {
    IPTC.parsed = parseIPTC(IPTC.content);
  }
  if (ICC) {
    ICC.parsed = parseICC(ICC.content);
  }
  return result;
}
function parseOrientation(orientation) {
  let rotation = 0;
  let mirror = 0;
  switch (orientation) {
    case 1: rotation = 0; break; // Horizontal (normal)
    case 2: mirror = 1; break; // Mirror horizontal
    case 3: rotation = 180; break; // Rotate 180
    case 4: mirror = 0; break; // Mirror vertical
    case 5: mirror = 1; rotation = 270; break; // Mirror horizontal and rotate 270 CW
    case 6: rotation = 90; break; // Rotate 90 CW
    case 7: mirror = 1; rotation = 90; break; // Mirror horizontal and rotate 90 CW
    case 8: rotation = 270; break; // Rotate 270 CW
  }
  return {rotation, mirror};
}

const supportedImageTypes = [
  'image/jpeg',
  'image/png',
  'image/apng',
  'image/webp',
  'image/avif',
  'image/avif-sequence',
  'image/heif',
  'image/heif-sequence',
  'image/heic',
  'image/heic-sequence',
  'image/svg',
];
export let getFileTypeByName = (name) => {
  let type;
  let ext = extname(name || '').toLowerCase();
  switch (ext) {
    case '.jpg':
    case '.jpeg': type = 'image/jpeg'; break;
    case '.png': type = 'image/png'; break;
    case '.apng': type = 'image/apng'; break;
    case '.webp': type = 'image/webp'; break;
    case '.avif':
    case '.avifs': type = 'image/avif'; break;
    case '.heif': type = 'image/heif'; break;
    case '.heifs': type = 'image/heif-sequence'; break;
    case '.heic': type = 'image/heic'; break;
    case '.heics': type = 'image/heic-sequence'; break;
    case '.jxl': type = 'image/jxl'; break;
    case '.svg': type = 'image/svg+xml'; break;
  }
  return type;
};
/**
 * @param {File} file 
 * @returns {boolean}
 */
export function isSupportedImageFile(file) {
  return supportedImageTypes.includes(file.type || getFileTypeByName(file.name));
}
export function isSupportedSidecarFile(file) {
  switch (file.type) {
    case 'application/vnd.iccprofile':
    case 'application/rdf+xml': return true;
  }
  let ext = extname(file.name).toLowerCase();
  if (/\.(exi?f|xmp|rdf|ic[cm])$/.test(ext)) {
    return true;
  }
  return false;
}

const MagicNum = {
  JPEG: [0xFF, 0xD8, 0xFF],
  PNG: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A],
  WEBP: [0x52, 0x49, 0x46, 0x46],
  WEBP8: [0x57, 0x45, 0x42, 0x50], // offset at 8
  BMFF4: [0x66, 0x74, 0x79, 0x70], // offset at 4
  JXL: [0x00, 0x00, 0x00, 0x0C, 0x4A, 0x58, 0x4C, 0x20, 0x0D, 0x0A, 0x87, 0x0A],
  JXL_RAW: [0xFF, 0x0A],
  EXIF: [0x49, 0x49, 0x2A, 0x00],
  EXIF_ALT: [0x4D, 0x4D, 0x00, 0x2A],
  XMP: [0x3c, 0x3f, 0x78, 0x70, 0x61, 0x63, 0x6b, 0x65, 0x74],
  XMP_ALT: [0x3c, 0x78, 0x3a, 0x78, 0x6d, 0x70, 0x6d, 0x65, 0x74, 0x61],
  ICC34: [0x61, 0x63, 0x73, 0x70],
};
/**
 * @param {Blob} file 
 * @returns {string}
 */
export async function imageContentSniff(input) {
  let array;
  if (input instanceof ArrayBuffer) {
    array = new Uint8Array(input);
  } else if (ArrayBuffer.isView(input)) {
    array = new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  } else {
    throw new TypeError('Unsupported input');
  }
  if (startsWithArray(array, MagicNum.JPEG)) {
    return 'image/jpeg';
  } else if (startsWithArray(array, MagicNum.PNG)) {
    return 'image/png';
  } else if (startsWithArray(array, MagicNum.WEBP, 0) && startsWithArray(array, MagicNum.WEBP8, 8)) {
    return 'image/webp';
  } else if (startsWithArray(array, MagicNum.BMFF4, 4)) {
    let brand = binaryDecoder.decode(array.subarray(8, 12));
    switch (brand) {
      case 'avif':
      case 'avis': return 'image/avif';
      case 'mif1': return 'image/heif';
      case 'msf1': return 'image/heif-sequence';
      case 'heic':
      case 'heix': return 'image/heic';
      case 'hevc':
      case 'hevx': return 'image/heic-sequence';
    }
  } else if (startsWithArray(array, MagicNum.JXL) || startsWithArray(array, MagicNum.JXL_RAW)) {
    return 'image/jxl';
  }
  return null;
}

/**
 * @param {Blob} file 
 * @returns {string}
 */
export async function sidecarContentSniff(input) {
  let array;
  if (input instanceof ArrayBuffer) {
    array = new Uint8Array(input);
  } else if (ArrayBuffer.isView(input)) {
    array = new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  } else {
    throw new TypeError('Unsupported input');
  }
  if (startsWithArray(array, MagicNum.EXIF) || startsWithArray(array, MagicNum.EXIF_ALT)) {
    return 'application';
  } else if (startsWithArray(array, MagicNum.PNG)) {
    return 'image/png';
  } else if (startsWithArray(array, MagicNum.WEBP, 0) && startsWithArray(array, MagicNum.WEBP8, 8)) {
    return 'image/webp';
  } else if (startsWithArray(array, MagicNum.BMFF4, 4)) {
    let brand = binaryDecoder.decode(array.subarray(8, 12));
    switch (brand) {
      case 'avif':
      case 'avis': return 'image/avif';
      case 'mif1': return 'image/heif';
      case 'msf1': return 'image/heif-sequence';
      case 'heic':
      case 'heix': return 'image/heic';
      case 'hevc':
      case 'hevx': return 'image/heic-sequence';
    }
  } else if (startsWithArray(array, MagicNum.JXL) || startsWithArray(array, MagicNum.JXL_RAW)) {
    return 'image/jxl';
  }
  return null;
}
