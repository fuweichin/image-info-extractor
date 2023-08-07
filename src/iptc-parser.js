import {binaryDecoder} from './commons.js';
import {tagTypeMap} from './iptc-tags.js';

export function parse(buffer) {
  let parsed = {};
  let iterable = {[Symbol.iterator]() { return findDatasets(buffer); }};
  let view = new DataView(buffer);
  for (let {recordNo, datasetNo, offset, length} of iterable) {
    let recordName = recordNameMap[recordNo] || recordNo.toString();
    let k = recordNo + ':' + datasetNo;
    let info = tagTypeMap[k];
    if (info) {
      let {name, type} = info;
      let record = parsed[recordName];
      if (!record) {
        record = parsed[recordName] = {};
      }
      let value;
      switch (type) {
        case 'string':
        case 'digits':
          value = binaryDecoder.decode(new Uint8Array(buffer, offset, length));
          break;
        case 'uint32':
          if (length !== 4) {
            throw new Error(`Unexpected length ${length} of type "${type}"`);
          }
          value = view.getUint32(offset);
          break;
        case 'uint16':
          if (length !== 2) {
            throw new Error(`Unexpected length ${length} of type "${type}"`);
          }
          value = view.getUint16(offset);
          break;
        case 'uint8':
          if (length !== 1) {
            throw new Error(`Unexpected length ${length} of type "${type}"`);
          }
          value = view.getUint8(offset);
          break;
        case 'undef':
        case 'no':
        default:
          value = new Uint8Array(buffer, offset, length);
          break;
      }
      record[name] = value;
    }
  }
  return parsed;
}

const recordNameMap = {
  1: 'Envelope',
  2: 'Application',
  3: 'NewsPhoto',
  7: 'PreObjectData',
  8: 'ObjectData',
  9: 'PostObjectData'
};

function* findDatasets(buffer) {
  let view = new DataView(buffer);
  let j = 0;
  while (j < view.byteLength) {
    let marker = view.getUint8(j);
    if (marker !== 0x1C) {
      throw new Error(`Expeted marker to be 0x1C but got 0x${marker.toString().padStart(2, '0')}`);
    }
    let recordNo = view.getUint8(j + 1);
    let datasetNo = view.getUint8(j + 2);
    let dataLength = view.getUint16(j + 3);
    if (dataLength < 32768) {
      yield {recordNo, datasetNo, offset: j + 5, length: dataLength};
    } else {
      // TODO
    }
    j += 5 + dataLength;
  }
}
