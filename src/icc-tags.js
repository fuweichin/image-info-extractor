/**
 * List of ICC profiel tag names
 * https://www.color.org/specification/ICC.1-2022-05.pdf
 */
export const tagSignatureMap = {
  'A2B0': 'AToB0',
  'A2B1': 'AToB1',
  'A2B2': 'AToB2',
  'bXYZ': 'blueMatrixColumn',
  'bTRC': 'blueTRC',
  'B2A0': 'BToA0',
  'B2A1': 'BToA1',
  'B2A2': 'BToA2',
  'B2D0': 'BToD0',
  'B2D1': 'BToD1',
  'B2D2': 'BToD2',
  'B2D3': 'BToD3',
  'calt': 'calibrationDateTime',
  'targ': 'charTarget',
  'chad': 'chromaticAdaptation',
  'chrm': 'chromaticity',
  'cicp': 'cipc',
  'clro': 'colorantOrder',
  'clrt': 'colorantTable',
  'clot': 'colorantTableOut',
  'ciis': 'colorimetricIntentImageState',
  'cprt': 'copyright',
  'crdi': 'creditInfo', // removed in v4
  'data': 'data', // removed in v4
  'dtim': 'dateTime', // removed in v4
  'dmnd': 'deviceMfgDesc',
  'dmdd': 'deviceModelDesc',
  'devs': 'deviceSettings', // removed in v4
  'D2B0': 'DToB0',
  'D2B1': 'DToB1',
  'D2B2': 'DToB2',
  'D2B3': 'DToB3',
  'gamt': 'gamut',
  'kTRC': 'grayTRC',
  'gXYZ': 'greenMatrixColumn',
  'gTRC': 'greenTRC',
  'lumi': 'luminance',
  'meas': 'measurement',
  'meta': 'metadata',
  'bkpt': 'mediaBlackPoint', // removed in v4.4
  'wtpt': 'mediaWhitePoint',
  'ncol': 'namedColor', // obselete, use ncl2
  'ncl2': 'namedColor2',
  'resp': 'outputResponse',
  'rig0': 'perceptualRenderingIntentGamut',
  'pre0': 'preview0',
  'pre1': 'preview1',
  'pre2': 'preview2',
  'desc': 'profileDescription',
  'pseq': 'profileSequenceDesc',
  'psd0': 'ps2CRD0', // removed in v4
  'psd1': 'ps2CRD1', // removed in v4
  'psd2': 'ps2CRD2', // removed in v4
  'psd3': 'ps2CRD3', // removed in v4
  'ps2s': 'ps2CSA', // removed in v4.4
  'ps2i': 'ps2RenderingIntent', // removed in v4.4
  'rXYZ': 'redMatrixColumn',
  'rTRC': 'redTRC',
  'rig2': 'saturationRenderingIntentGamut',
  'scrd': 'screeningDesc', // removed in v4
  'scrn': 'screening', // removed in v4
  'tech': 'technology',
  'bfd ': 'ucrBg', // removed in v4
  'vued': 'viewingCondDesc',
  'view': 'viewingConditions',
};

export let tagParsers = {
  // ====== v2 ======
  // 6.5.17
  'desc': function textDescription(view, offset, length) {
    let asciiLength = view.getUint32(offset + 8);
    let description = view.getBinaryString(offset + 12, asciiLength, true);
    let j = offset + 12 + asciiLength;
    let _languageCode = view.getUint32(j);
    let unicodeLength = view.getUint32(j + 4);
    let unicodeDescription = view.getUTF16BEString(j + 8, unicodeLength, true);
    j += 4 + unicodeLength;
    let _scriptCode = view.getUint16(j);
    let localizedLength = view.getUint8(j + 2);
    let localizedDescription = view.getBinaryString(j + 3, localizedLength, true);
    // return {
    //   description,
    //   unicodeDescription,
    //   localizedDescription,
    //   languageCode,
    //   scriptCode,
    // };
    return description || unicodeDescription || localizedDescription;
  },
  // ====== v4 ======
  // 10.2
  'chrm': function chromaticity(view, offset, length) {
    let channelCount = view.getUint16(offset + 8);
    let channels = [];
    for (let i = 0, j = offset + 12; i < channelCount; i++, j += 8) {
      let a = new Float64Array(2);
      a[0] = view.getU16Fixed16Number(j);
      a[1] = view.getU16Fixed16Number(j + 4);
      channels.push(a);
    }
    return {
      colorantType: view.getUint16(offset + 10),
      channels,
    };
  },
  // 10.3
  'cipc': function cipc(view, offset, length) {
    return {
      colorPrimaries: view.getUint8(offset + 8),
      transferCharacteristics: view.getUint8(offset + 8),
      matrixCoefficients: view.getUint8(offset + 10),
      videoFullRangeFlag: view.getUint8(offset + 11),
    };
  },
  // 10.4
  'clro': function colorantOrder(view, offset, length) {
    let count = view.getUint32(offset + 8);
    let order = new Uint8Array(count);
    for (let i = 0, j = offset + 11; i < count; i++, j++) {
      order[i] = view.getUint8(j);
    }
    return order;
  },
  // 10.5
  'clrt': function colorantTable(view, offset, length) {
    let colorantCount = view.getUint32(offset + 8);
    let colorants = [];
    for (let i = 0, j = offset + 12; i < colorantCount; i++, j += 38) {
      let name = view.getBinaryString(j, 32, true);
      let pcsValues = new Uint16Array(3);
      pcsValues[0] = view.getUint16(j + 32);
      pcsValues[1] = view.getUint16(j + 34);
      pcsValues[2] = view.getUint16(j + 36);
      colorants.push({colorantName: name, pcsValues});
    }
    return colorants;
  },
  // 10.6
  'curv': function colorantTable(view, offset, length) {
    let count = view.getUint32(offset + 8);
    let array = new Uint16Array(count);
    for (let i = 0, j = offset + 12; i < count; i++, j += 2) {
      array[i] = view.getUint16(j);
    }
    return array;
  },
  // 10.7
  'data': function data(view, offset, length) {
    let dataType = view.getUint32(offset + 8);
    if (dataType === 0) { // ascii text
      return view.getBinaryString(offset + 12, length - 12);
    }
    return new Uint8Array(view.buffer, view.byteOffset, offset + 12, length - 12);
  },
  // 10.8
  'dtim': function dateTime(view, offset, length) {
    return view.getDateTimeNumber(offset + 8);
  },
  // 10.9
  'dict': function dict(view, offset, length) {
    let count = view.getDateTimeNumber(offset + 8);
    let dict = [];
    let recordSize = view.getUint32(offset + 12);
    for (let i = 0, j = offset + 16; i < count; i++, j += recordSize) {
      let namePos = view.getPositionNumber(j);
      let valuePos = view.getPositionNumber(j + 8);
      let name = view.getUTF16BEString(offset + namePos.offset, namePos.length);
      let value = view.getUTF16BEString(offset + valuePos.offset, valuePos.length);
      let entry = {name, value};
      if (recordSize >= 24) {
        let displayNamePos = view.getPositionNumber(j + 16);
        entry.displayName = view.getUTF16BEString(offset + displayNamePos.offset, displayNamePos.length);
        if (recordSize >= 32) {
          let displayValuePos = view.getPositionNumber(j + 24);
          entry.displayValue = view.getUTF16BEString(offset + displayValuePos.offset, displayValuePos.length);
        }
      }
      dict.push(entry);
    }
    return dict;
  },
  // 10.10
  'mft2': function lut16(view, offset, length) {
    let numInputChannels = view.getUint8(offset + 8);
    let numOutputChannels = view.getUint8(offset + 9);
    let numGridPoints = view.getUint8(offset + 9);
    let parameters = new Float64Array(9);
    let j = offset + 12;
    for (let i = 0; i < 9; i++, j += 2) {
      parameters[i] = view.getS15Fixed16Number(j);
    }
    let numInputEntries = view.getUint16(offset + 48);
    let numOutputEntries = view.getUint16(offset + 50);
    let inputLength = numInputChannels * numInputEntries;
    let inputTables = new Uint16Array(inputLength);
    j = offset + 52;
    for (let i = 0; i < inputLength; i++, j += 2) {
      inputTables[i] = view.getUint16(j);
    }
    let clutLength = Math.pow(numGridPoints, numInputChannels) * numOutputChannels;
    let clutTables = new Uint16Array(clutLength);
    for (let i = 0; i < clutLength; i++, j += 2) {
      clutTables[i] = view.getUint16(j);
    }
    let outputLength = numOutputChannels * numOutputEntries;
    let outputTables = new Uint16Array(outputLength);
    for (let i = 0; i < outputLength; i++, j += 2) {
      outputTables[i] = view.getUint16(j);
    }
    return {
      numInputChannels,
      numOutputChannels,
      numGridPoints,
      numInputEntries,
      numOutputEntries,
      inputTables,
      clutTables,
      outputTables,
    };
  },
  // 10.11
  'mft1': function lut16(view, offset, length) {
    let numInputChannels = view.getUint8(offset + 8);
    let numOutputChannels = view.getUint8(offset + 9);
    let numGridPoints = view.getUint8(offset + 9);
    let parameters = new Float64Array(9);
    let j = offset + 12;
    for (let i = 0; i < 9; i++, j += 2) {
      parameters[i] = view.getS15Fixed16Number(j);
    }
    let numInputEntries = 256;
    let numOutputEntries = 256;
    let inputLength = numInputChannels * numInputEntries;
    let inputTables = new Uint8Array(inputLength);
    j = offset + 52;
    for (let i = 0; i < inputLength; i++, j++) {
      inputTables[i] = view.getUint8(j);
    }
    let clutLength = Math.pow(numGridPoints, numInputChannels) * numOutputChannels;
    let clutTables = new Uint8Array(clutLength);
    for (let i = 0; i < clutLength; i++, j++) {
      clutTables[i] = view.getUint8(j);
    }
    let outputLength = numOutputChannels * numOutputEntries;
    let outputTables = new Uint8Array(outputLength);
    for (let i = 0; i < outputLength; i++, j++) {
      outputTables[i] = view.getUint8(j);
    }
    return {
      numInputChannels,
      numOutputChannels,
      numGridPoints,
      numInputEntries,
      numOutputEntries,
      inputTables,
      clutTables,
      outputTables,
    };
  },
  // 10.12
  'mAB ': null, // lutAToB
  // 10.13
  'mBA ': null, // lutBToA
  // 10.14
  'meas': function measurement(view, offset, length) {
    return {
      standardObserver: view.getUint32(offset + 8),
      nCIEXYZ: view.getXYZNumber(offset + 12),
      measurementGeometry: view.getUint32(offset + 24),
      measurementFlare: view.getUint32(offset + 28),
      standardIlluminant: view.getUint32(offset + 32),
    };
  },
  // 10.15
  'mluc': function multiLocalizedUnicode(view, offset, length) {
    let numRecords = view.getUint32(offset + 8);
    let recordSize = view.getUint32(offset + 12);
    if (recordSize !== 12) {
      throw new Error('Invalid mluc record size: ' + recordSize);
    }
    let records = [];
    for (let i = 0, j = offset + 16; i < numRecords; i++, j += 12) {
      let language = view.getBinaryString(j, 2, true);
      let country = view.getBinaryString(j + 2, 2, true);
      let textPos = {length: view.getUint32(j + 4), offset: view.getUint32(j + 8)};
      let locale = country ? language + '-' + country : language;
      records.push({
        locale,
        text: view.getUTF16BEString(offset + textPos.offset, textPos.length, true),
      });
    }
    return records[0].text;
  },
  // 10.16
  'mpet': null, // multiProcessElements
  // 10.17
  'ncl2': null, // namedColor2
  // 10.18
  'para': function parametricCurve(view, offset, length) {
    let functionType = view.getUint16(offset + 8);
    let count = (length - 12) / 4;
    let parameters = new Float64Array(count);
    for (let i = 0, j = offset + 12; i < count; i++, j += 4) {
      parameters[i] = view.getS15Fixed16Number(offset + 12);
    }
    return {functionType, parameters};
  },
  // 10.19
  'pseq': null, // profileSequenceDesc
  // 10.20
  'psid': null, // profileSequenceIdentifier
  // 10.21
  'rcs2': null, // responseCurveSet16
  // 10.22
  'sf32': function s15Fixed16Array(view, offset, length) {
    let count = (length - 8) / 4;
    let array = new Float64Array(count);
    for (let i = 0, j = offset + 8; i < count; i++, j += 4) {
      array[i] = view.getS15Fixed16Number(j);
    }
    return array;
  },
  // 10.23
  'sig ': function signature(view, offset, length) {
    return view.getBinaryString4(offset + 8);
  },
  // 10.24
  'text': function text(view, offset, length) {
    return view.getBinaryString(offset + 8, length - 8, true);
  },
  // 10.25
  'uf32': function u16Fixed16Array(view, offset, length) {
    let count = (length - 8) / 4;
    let array = new Float64Array(count);
    for (let i = 0, j = offset + 8; i < count; i++, j += 4) {
      array[i] = view.getU16Fixed16Number(j);
    }
    return array;
  },
  // 10.26
  'ui16': function uInt16Array(view, offset, length) {
    let count = (length - 8) / 2;
    let array = new Uint16Array(count);
    for (let i = 0, j = offset + 8; i < count; i++, j += 2) {
      array[i] = view.getUint16(j);
    }
    return array;
  },
  // 10.27
  'ui32': function uInt32Array(view, offset, length) {
    let count = (length - 8) / 4;
    let array = new Uint32Array(count);
    for (let i = 0, j = offset + 8; i < count; i++, j += 4) {
      array[i] = view.getUint32(j);
    }
    return array;
  },
  // 10.28
  'ui64': function uInt64Array(view, offset, length) {
    let count = (length - 8) / 8;
    let array = new BigUint64Array(count);
    for (let i = 0, j = offset + 8; i < count; i++, j += 8) {
      array[i] = view.getBigUint64(j);
    }
    return array;
  },
  // 10.29
  'ui08': function uInt8Array(view, offset, length) {
    let count = (length - 8);
    let array = new Uint8Array(count);
    for (let i = 0, j = offset + 8; i < count; i++, j += 1) {
      array[i] = view.getUint8(j);
    }
    return array;
  },
  // 10.30
  'view': function viewingConditions(view, offset, length) {
    return {
      illuminant: view.getXYZNumber(offset + 8),
      surround: view.getXYZNumber(offset + 10),
      illuminantType: tagParsers['meas'](view, offset + 32, length - 32)
    };
  },
  // 10.31
  'XYZ ': function viewingConditions(view, offset, length) {
    return view.getXYZNumber(offset + 8);
  },
};
