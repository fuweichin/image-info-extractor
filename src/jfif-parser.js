export function parse(buffer, offset = 0) {
  let array = new Uint8Array(buffer, offset);
  let view = new DataView(buffer, offset);
  let parsed = {
    JFIFVersion: [view.getUint8(0), view.getUint8(1)],
    DensityUints: view.getUint8(2),
    Xdensity: view.getUint16(3),
    Ydensity: view.getUint16(5),
    Xthumbnail: view.getUint8(7),
    Ythumbnail: view.getUint8(8),
  };
  let start = 9;
  parsed.ThumbnailData = start < array.length ? array.slice(9).buffer : new ArrayBuffer(0);
  return parsed;
}

export function parseJFXX(buffer, offset = 0) {
  let array = new Uint8Array(buffer, offset);
  let view = new DataView(buffer, offset);
  
  let format = view.getUint8(0);
  let parsed = {
    ThumbnailFormat: format
  };
  let start;
  switch (format) {
    case 0x10: // JPEG encoding
      start = 1;
      break;
    case 0x11: // one byte per pixel
      parsed.Xthumbnail = view.getUint8(1);
      parsed.Ythumbnail = view.getUint8(2);
      parsed.ThumbnailPalette = array.slice(3, 771);
      start = 771;
      break;
    case 0x13: // three byte per pixel
      parsed.Xthumbnail = view.getUint8(1);
      parsed.Ythumbnail = view.getUint8(2);
      start = 3;
      break;
    default:
      console.warn('Unexpected thumbnail format: ' + format);
      return null;
  }
  parsed.ThumbnailData = start < array.length ? array.slice(start).buffer : new ArrayBuffer(0);
  return parsed;
}
