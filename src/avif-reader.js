import {binaryDecoder, indexBy} from './commons.js';

const AVIF_BRANDS = ['avif', 'avis'];
const HEIF_BRANDS = ['mif1', 'msf1'];
const HEIC_BRANDS = ['heic', 'heix', 'hevc', 'hevx'];

/**
 * @param {File} file
 * @returns {Object}
 * @async
 */
export async function readFile(file) {
  let fileSize = file.size;
  let buffer = await file.arrayBuffer();
  let view = new BMFFDataView(buffer);
  if (fileSize < 12) {
    throw new Error('Not a ISO BMFF file');
  }
  let ftypBox = view.getFileTypeBox(0);
  let brand = ftypBox.major_brand;
  if (!(AVIF_BRANDS.includes(brand) || HEIF_BRANDS.includes(brand) ||
    HEIC_BRANDS.includes(brand))) {
    throw new Error('Not a AVIF/HEIF/HEIC file');
  }
  let result = {};
  let info = {};
  let flags = 0;
  let metaBox = null;
  searchBoxes: for (let j = ftypBox.end; j < fileSize; ) {
    let box = view.getBox(j, Box);
    switch (box.type) {
      case 'meta':
        metaBox = view.getMetaBox(box);
        break searchBoxes;
      case 'mdat':
        break searchBoxes;
    }
    j = box.end;
  }
  if (metaBox) {
    let metaObj = indexBy(metaBox.subBoxes, 'type');
    let {iinf, iprp} = metaObj;
    if (iinf) {
      let pItemID = metaObj.pitm?.item_ID;
      let pItem = iinf.items_infos.find((e) => e.item_ID === pItemID); // primary item
      if (pItem?.type === 'grid')
        info.grid = true;
      let item;
      item = iinf.items_infos.find((e) => e.item_type === 'Exif');
      if (item) {
        let content = getItemData(view, metaObj, item).buffer;
        if (content.byteLength > 0) {
          result.EXIF = {content};
          flags |= 0b100;
        }
      }
      item = iinf.items_infos.find((e) => e.item_name === 'XMP' ||
        e.item_type === 'mime' && e.content_type === 'application/rdf+xml');
      if (item) {
        let content = getItemData(view, metaObj, item).buffer;
        if (content.byteLength > 0) {
          result.XMP = {content};
          flags |= 0b10;
        }
      }
    }
    if (iprp) {
      let ipco = iprp.subBoxes.find((e) => e.type === 'ipco');
      if (ipco) {
        for (let e of ipco.subBoxes) {
          switch (e.type) {
            case 'colr':
              if (e.colour_type === 'prof' || e.colour_type === 'rICC') {
                result.ICC = {content: e.ICC_profile.buffer};
                flags |= 0b1;
              }
              break;
            case 'ispe':
              if (!info.width || e.width * e.height > info.width * info.height) { // FIXME
                info.width = e.width;
                info.height = e.height;
              }
              break;
            case 'pixi':
              if (!info.bitDepth) {
                if (e.channels >= 3) {
                  info.bitDepth = e.bit_depth;
                }
              }
              if (e.channels === 1 || e.channels > 3) {
                info.alpha = true;
              }
              break;
            case 'irot': 
              info.rotation = e.rotation;
              break;
            case 'imir': 
              info.mirror = e.mirror;
              break;
            case 'crtt':
              info.creationTime = e.time;
              break;
            case 'mdft': {
              info.modificationTime = e.time;
              break;
            }
          }
        }
      }
    }
  }
  // progressive, lossless
  info.animation = ['avis', 'msf1', 'hevc', 'hevx'].includes(ftypBox.major_brand);
  if (!info.bitDepth) {
    info.bitDepth = 8;
  }
  if (!info.alpha) {
    info.alpha = false;
  }
  result.INFO = {parsed: info};
  info.flags = flags;
  return result;
}

function getItemData(view, metaInfo, itemInfo) {
  let {item_ID} = itemInfo;
  let {iloc} = metaInfo;
  let loc = iloc.items.find((e) => e.item_ID === item_ID);
  if (!loc) {
    throw new Error('Cannot found item_ID ' + item_ID + ' in iloc box');
  }
  let array = new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
  if (iloc.version === 0) {
    let extent = loc.extents[0];
    let offset = loc.base_offset + extent.extent_offset;
    let length = extent.extent_length;
    if (itemInfo.item_type === 'mime') {
      return array.slice(offset, offset + length);
    } else { // skip a empty box
      let num = view.getUint32(offset);
      offset += 4 + num;
      length -= 4 + num;
      return array.slice(offset, offset + length);
    }
  }
  let {construction_method} = loc;
  if (construction_method === 0) { // 0: file_offset
    let extent = loc.extents[0];
    let offset = extent.extent_offset;
    let num = view.getUint32(offset);
    offset += 4 + num;
    let length = extent.extent_length - (4 + num);
    return array.slice(offset, offset + length);
  } else if (construction_method === 1) { // 1: idat_offset
    // TODO
  } else if (construction_method === 2) { // 2: item_offset
    // TODO
  }
  return array.slice(0, 0);
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

let rSignature = /^\w{3,4} ?/;

class BMFFDataView extends DataView {
  /**
   * @param {number} offset 
   * @param {number} length 
   * @param {boolean} [strip] 
   * @returns {string}
   */
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
  /**
   * @param {number} offset 
   * @param {Function} constructor
   * @returns {Box} type specificed by param constructor
   */
  getBox(offset, constructor) {
    let box = new constructor();
    let size = super.getUint32(offset);
    let boxtype = this.getBinaryString(offset + 4, 4);
    box.type = boxtype;
    let j = offset + 8;
    if (size === 1) {
      box.largesize = Number(super.getBigUint64(j));
      j += 8;
    } else if (size === 0) {
      size = this.byteLength - offset;
    }
    box.size = size;
    if (boxtype === 'uuid') {
      box.usertype = this.getBinaryString(j, 16);
      j += 16;
    }
    if (!rSignature.test(boxtype)) {
      console.warn('Unexpected box signature: ' + boxtype);
    }
    box.start = offset;
    box.end = offset + size; // payload size
    box.cur = j;
    return box;
  }
  /**
   * @param {Box} initBox
   * @returns {FullBox}
   */
  getFullBox(initBox) {
    let box = initBox;
    let {cur} = box;
    box.version = super.getUint8(cur);
    box.flags = super.getUint8(cur + 1) << 24 | super.getUint16(cur + 2);
    box.cur = cur + 4;
    return box;
  }
  /**
   * @param {number|Box} offset
   * @returns {FileTypeBox}
   */
  getFileTypeBox(offset) {
    let box;
    if (typeof offset === 'number') {
      box = this.getBox(offset, FileTypeBox);
      if (box.type !== 'ftyp') {
        throw new Error(`Expected boxtype to be "ftyp", but got "${box.type}"`);
      }
    } else {
      let initBox = offset;
      box = initBox;
    }
    let {cur: j} = box;
    box.major_brand = this.getBinaryString(j, 4);
    box.minor_version = super.getUint32(j + 4, 4);
    j += 8;
    let count = Math.floor((box.end - j) / 4);
    let arr = new Array(count);
    for (let i = 0; i < count; i++) {
      arr[i] = this.getBinaryString(j, 4);
      j += 4;
    }
    box.compatible_brands = arr;
    box.cur = j;
    return box;
  }
  /**
   * @param {Box} initBox
   * @returns {MetaBoxBox}
   */
  getMetaBox(initBox) {
    let box = this.getFullBox(initBox);
    let {cur: j} = box;
    let subBoxes = box.subBoxes = [];
    while (j < box.end) {
      let b = this.getBox(j, Box);
      switch (b.type) {
        case 'hdlr':
          b = this.getHandlerBox(b);
          break;
        case 'pitm':
          b = this.getPrimaryItemBox(b);
          break;
        case 'iloc':
          b = this.getItemLocationBox(b);
          break;
        case 'iinf':
          b = this.getItemInfoBox(b);
          break;
        case 'iref':
          b = this.getItemReferenceBox(b);
          break;
        case 'iprp':
          b = this.getItemPropertiesBox(b);
          break;
        case 'idat':
          b = this.getItemDataBox(b);
          break;
      }
      subBoxes.push(b);
      j = b.end;
    }
    box.cur = j;
    return box;
  }
  /**
   * @param {Box} initBox
   * @returns {HandlerBox}
   */
  getHandlerBox(initBox) {
    let box = this.getFullBox(initBox);
    let j = box.cur;
    let pre_defined = super.getUint32(j);
    if (pre_defined !== 0) {
      throw new Error(`Expected pre_defined to be 0, bot got ${box.pre_defined}`);
    }
    box.handler_type = this.getBinaryString(j + 4, 4);
    j += 20;
    let count = box.end - j;
    box.name = this.getBinaryString(j, count, true);
    box.cur = box.end;
    return box;
  }
  /**
   * @param {Box} initBox
   * @returns {PrimaryItemBox}
   */
  getPrimaryItemBox(initBox) {
    let box = this.getFullBox(initBox);
    let {cur: j, version} = box;
    if (version === 0) {
      box.item_ID = super.getUint16(j);
      j += 2;
    } else {
      box.item_ID = super.getUint32(j);
      j += 2;
    }
    box.cur = j;
    return box;
  }
  /**
   * @param {Box} initBox
   * @returns {ItemLocationBox}
   */
  getItemLocationBox(initBox) {
    let box = this.getFullBox(initBox);
    let {cur: j, version} = box;
    let bits = super.getUint16(j);
    j += 2;
    let offset_size = box.offset_size = (bits >> 12) & 0xF;
    let length_size = box.length_size = (bits >> 8) & 0xF;
    let base_offset_size = box.base_offset_size = (bits >> 4) & 0xF;
    let index_size = 0;
    if (version === 1 || version === 2) {
      index_size = box.index_size = (bits >> 0) & 0xF;
    } else {
      box.reserved = (bits >> 0) & 0xF;
    }
    let item_count = 0;
    if (version < 2) {
      item_count = super.getUint16(j);
      j += 2;
    } else if (version === 2) {
      item_count = super.getUint32(j);
      j += 4;
    }
    let items = box.items = [];
    for (let i = 0; i < item_count; i++) {
      let item = items[i] = {};
      if (version < 2) {
        item.item_ID = super.getUint16(j);
        j += 2;
      } else {
        item.item_ID = super.getUint32(j);
        j += 4;
      }
      if (version === 1 || version === 2) {
        bits = super.getUint16(j);
        j += 2;
        item.reserved = (bits >> 4) & 0xF;
        item.construction_method = bits & 0xF;
      }
      item.data_reference_index = super.getUint16(j);
      j += 2;
      switch (base_offset_size) {
        case 0: item.base_offset = 0; break;
        case 1: item.base_offset = super.getUint8(j); break;
        case 2: item.base_offset = super.getUint16(j); break;
        case 4: item.base_offset = super.getUint32(j); break;
        case 8: item.base_offset = Number(super.getBigUint64(j)); break;
        default:
          throw new Error('Unexpected base_offset_size: ' + base_offset_size);
      }
      j += base_offset_size;
      let extent_count = super.getUint16(j);
      j += 2;
      let extents = item.extents = [];
      for (let k = 0; k < extent_count; k++) {
        let extent = extents[k] = {};
        if ((version === 1 || version === 2) && index_size > 0) {
          switch (index_size) {
            case 1: extent.extent_index = super.getUint8(j); break;
            case 2: extent.extent_index = super.getUint16(j); break;
            case 4: extent.extent_index = super.getUint32(j); break;
            case 8: extent.extent_index = Number(super.getBigUint64(j)); break;
            default: throw new Error('Unexpected index_size: ' + index_size);
          }
          j += index_size;
        }
        switch (offset_size) {
          case 0: break;
          case 1: extent.extent_offset = super.getUint8(j); break;
          case 2: extent.extent_offset = super.getUint16(j); break;
          case 4: extent.extent_offset = super.getUint32(j); break;
          case 8: extent.extent_offset = Number(super.getBigUint64(j)); break;
          default: throw new Error('Unexpected index_size: ' + offset_size);
        }
        j += offset_size;
        switch (length_size) {
          case 0: break;
          case 1: extent.extent_length = super.getUint8(j); break;
          case 2: extent.extent_length = super.getUint16(j); break;
          case 4: extent.extent_length = super.getUint32(j); break;
          case 8: extent.extent_length = Number(super.getBigUint64(j)); break;
          default: throw new Error('Unexpected index_size: ' + length_size);
        }
        j += length_size;
      }
    }
    box.cur = box.end;
    return box;
  }
  /**
   * @param {Box} initBox
   * @returns {ItemDataBox}
   */
  getItemDataBox(initBox) {
    let box = initBox;
    box.data = new Uint8Array(this.buffer).slice(box.cur, box.end);
    box.cur = box.end;
    return box;
  }
  /**
   * @param {number} offset
   * @returns {SingleItemTypeReferenceBox}
   */
  getSingleItemTypeReferenceBox(offset) {
    let box = this.getFullBox(this.getBox(offset, SingleItemTypeReferenceBox));
    let {cur: j} = box;
    box.from_item_ID = super.getUint16(j);
    j += 2;
    let reference_count = box.reference_count = super.getUint16(j);
    j += 2;
    let to_item_ID = box.to_item_ID = new Uint16Array(reference_count);
    for (let i = 0; i < reference_count; i++) {
      to_item_ID[i] = super.getUint16(j);
      j += 2;
    }
    box.cur = j;
    return box;
  }
  /**
   * @param {number} offset
   * @returns {SingleItemTypeReferenceBoxLarge}
   */
  getSingleItemTypeReferenceBoxLarge(offset) {
    let box = this.getFullBox(this.getBox(offset, SingleItemTypeReferenceBoxLarge));
    let {cur: j} = box;
    box.from_item_ID = super.getUint32(j);
    j += 4;
    let reference_count = box.reference_count = super.getUint16(j);
    j += 2;
    let to_item_ID = box.to_item_ID = new Uint32Array(reference_count);
    for (let i = 0; i < reference_count; i++) {
      to_item_ID[i] = super.getUint32(j);
      j += 4;
    }
    box.cur = j;
    return box;
  }
  /**
   * @param {Box} initBox
   * @returns {ItemReferenceBox}
   */
  getItemReferenceBox(initBox) {
    let box = this.getFullBox(initBox);
    let {cur: j, version} = box;
    let references = box.references = [];
    if (version === 0) {
      while (j < box.end) {
        let subBox = this.getSingleItemTypeReferenceBox(j);
        j = subBox.end;
        references.push(subBox);
      }
    } else {
      while (j < box.end) {
        let subBox = this.getSingleItemTypeReferenceBoxLarge(j);
        j = subBox.end;
        references.push(subBox);
      }
    }
    box.cur = j;
    return box;
  }
  getItemInfoEntry(offset) {
    let box = this.getFullBox(this.getBox(offset, ItemInfoEntry));
    let {cur: j, version} = box;
    if (version === 0 || version === 1) {
      box.item_ID = super.getUint16(j);
      j += 2;
      box.item_protection_index = super.getUint16(j);
      j += 2;

      let g = findNullSeparatedStrings(this, j);
      let next;

      if (!(next = g.next()).done) {
        box.item_name = next.value.data;
      }
      if (!(next = g.next()).done) {
        box.content_type = next.value.data;
      }
      if (!(next = g.next()).done) {
        box.content_encoding = next.value.data;
      }
      if (version === 1) {
        let extension_type;
        if (!(next = g.next()).done) {
          extension_type = box.extension_type = next.value.data;
        }
        if (extension_type === 'fdel') {
          if (!(next = g.next()).done) {
            box.content_location = next.value.data;
          }
          if (!(next = g.next()).done) {
            box.content_MD5 = next.value.data;
          }
          j += g.bytesRead;
          box.content_length = super.getBigUint64(j);
          j += 8;
          box.transfer_length = super.getBigUint64(j);
          j += 8;
          let entry_count = box.entry_count = super.getBigUint8(j);
          j += 1;
          let group_ids = box.group_ids = new Uint32Array(entry_count);
          for (let i = 0; i < entry_count; i++) {
            group_ids[i] = super.getUint32(j);
            j += 4;
          }
        }
      }
      box.cur = box.end;
    } else if (version >= 2) {
      if (version === 2) {
        box.item_ID = super.getUint16(j);
        j += 2;
      } else if (version === 3) {
        box.item_ID = super.getUint32(j);
        j += 4;
      }
      box.item_protection_index = super.getUint16(j);
      j += 2;
      let item_type = box.item_type = this.getBinaryString(j, 4);
      j += 4;
      let g = findNullSeparatedStrings(this, j);
      let next;
      if (!(next = g.next()).done) {
        box.item_name = next.value.data;
      }
      if (item_type === 'mime') {
        if (!(next = g.next()).done) {
          box.content_type = next.value.data;
        }
        if (!(next = g.next()).done) {
          box.content_encoding = next.value.data;
        }
        j = box.end;
      } else if (item_type === 'uri ') {
        if (!(next = g.next()).done) {
          box.item_uri_type = next.value.data;
        }
        j = box.end;
      }
      box.cur = j;
    }
    return box;
  }
  /**
   * @param {Box} initBox 
   * @returns {ItemInfoBox}
   */
  getItemInfoBox(initBox) {
    let box = this.getFullBox(initBox);
    let {cur: j, version} = box;
    let entry_count;
    if (version === 0) {
      entry_count = super.getUint16(j);
      j += 2;
    } else {
      entry_count = super.getUint32(j);
      j += 4;
    }
    let items_infos = box.items_infos = new Array(entry_count);
    for (let i = 0; i < entry_count; i++) {
      let item_info = items_infos[i] = this.getItemInfoEntry(j);
      j = item_info.end;
    }
    return box;
  }
  /**
   * @param {Box} initBox 
   * @returns {ItemPropertyContainerBox}
   */
  getItemPropertyContainerBox(initBox) { 
    let box = initBox;
    let {cur: j} = box;
    let entries = box.entries = [];
    let subBoxes = box.subBoxes = [];
    while (j < box.end) {
      let b = this.getBox(j, Box);
      switch (b.type) {
        case 'ispe': {
          this.getImageSpacialExtent(b);
          subBoxes.push(b);
          break;
        }
        case 'pixi': {
          this.getPixelInformation(b);
          subBoxes.push(b);
          break;
        }
        case 'colr': {
          this.getColourInformationBox(b);
          subBoxes.push(b);
          break;
        }
        case 'crtt':
        case 'mdft': {
          this.getTimeInformationBox(b);
          subBoxes.push(b);
          break;
        }
        case 'irot': {
          this.getImageRotation(b);
          subBoxes.push(b);
          break;
        }
        case 'imir': {
          this.getImageMirror(b);
          subBoxes.push(b);
          break;
        }
        // case 'clap': {
        //   this.getCleanAperture(b);
        //   subBoxes.push(b);
        //   break;
        // }
        default: {
          let entry = {};
          entries.push(entry);
          entry.name = b.type;
          entry.data = new Uint8Array(super.buffer).slice(b.cur, b.end);
          break;
        }
      }
      j = b.end;
    }
    box.cur = j;
    return box;
  }
  /**
   * @param {Box} initBox 
   * @returns {ItemPropertiesBox}
   */
  getItemPropertiesBox(initBox) {
    let box = initBox;
    let {cur: j} = box;
    let subBoxes = box.subBoxes = [];
    while (j < box.end) {
      let b = this.getBox(j, Box);
      switch (b.type) {
        case 'ipco':
          b = this.getItemPropertyContainerBox(b);
          break;
        case 'ipma':
          b = this.getItemPropertyAssociation(b);
          break;
      }
      subBoxes.push(b);
      j = b.end;
    }
    return box;
  }
  /**
   * @param {Box} initBox
   * @returns {ColourInformationBox}
   */
  getColourInformationBox(box) {
    let {cur: j} = box;
    let colour_type = box.colour_type = this.getBinaryString(j, 4);
    j += 4;
    if (colour_type === 'nclx') {
      box.colour_primaries = super.getUint16(j);
      box.transfer_characteristics = super.getUint16(j + 2);
      box.matrix_coefficients = super.getUint16(j + 4);
      box.full_range_flag = super.getUint8(j + 6);
    } else if (colour_type === 'rICC' || colour_type === 'prof') {
      let size = super.getUint32(j);
      box.ICC_profile = new Uint8Array(this.buffer).slice(j, j + size);
    }
    box.cur = box.end;
    return box;
  }
  getTimeInformationBox(box) {
    let {cur: j} = box;
    box.time = Number(super.getBigUint64(j));
    box.cur = box.end;
    return box;
  }
  getImageSpacialExtent(box) {
    let {cur: j} = box;
    box.item_ID = super.getUint32(j);
    box.width = super.getUint32(j + 4);
    box.height = super.getUint32(j + 8);
    box.cur = box.end;
    return box;
  }
  getPixelInformation(box) {
    let {cur: j} = box;
    box.item_ID = super.getUint32(j);
    box.channels = super.getUint8(j + 4);
    box.bit_depth = super.getUint8(j + 5);
    box.cur = box.end;
    return box;
  }
  getImageRotation(box) {
    let {cur: j} = box;
    box.rotation = super.getUint8(j) * 90;
    box.cur = j + 1;
    return box;
  }
  getImageMirror(box) {
    let {cur: j} = box;
    box.mirror = super.getUint8(j) * 90;
    box.cur = j + 1;
    return box;
  }
  getCleanAperture(box) {
    return box;
  }
  /**
   * @param {Box} initBox 
   * @returns {ItemPropertyContainerBox}
   */
  getItemPropertyAssociation(box) {
    let {cur: j} = box;
    // TODO
    box.cur = j;
    return box;
  }
}

/* eslint-disable no-unused-vars */
class Box {
  type;
  size;
  start;
  end;
}
class FullBox extends Box {
  version;
  flags;
}
// ftyp
class FileTypeBox extends Box {
  major_brand;
  minor_version;
  compatible_brands;
}
// meta
class MetaBox extends FullBox {
  subBoxes;
}
// hdlr
class HandlerBox extends FullBox {
  pre_defined = 0;
  handler_type;
  name;
}
// pitm
class PrimaryItemBox extends FullBox {
  item_ID;
}
// iloc
class ItemLocationBox extends FullBox {
  offset_size;
  length_size;
  base_offset_size;
  index_size;
  item_count;
  items;
}
// idat
class ItemDataBox extends Box {
  data;
}
// iref
class ItemReferenceBox extends FullBox {
  references;
}
class SingleItemTypeReferenceBox {
  from_item_ID;
  reference_count;
  to_item_ID;
}
class SingleItemTypeReferenceBoxLarge {
  from_item_ID;
  reference_count;
  to_item_ID;
}
class ItemInfoEntry extends FullBox {
  item_ID;
  item_protection_index;
  item_name;
  content_type;
  item_type;
}
// iinf
class ItemInfoBox extends FullBox {
  items_infos;
}
// colr
class ColourInformationBox extends Box {
  colour_type;
  ICC_profile;
}
// iprp
class ItemPropertiesBox extends FullBox {
  subBoxes;
}
// ipco
class ItemPropertyContainerBox extends FullBox {
  subBoxes;
}
// ipma
class ItemPropertyAssociation extends FullBox {
  entries = [
    {
      item_ID: 1,
      associations: [
        {essential: 1, property_index: 1}
      ]
    }
  ];
}
