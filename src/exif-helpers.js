import {startsWithArray} from './commons.js';

export default {
  getModifyDate(parsed) {
    let {tiff, exif} = parsed;
    if (tiff.ModifyDate) {
      return parseEXIFDate(tiff.ModifyDate, exif?.SubSecTime, exif?.OffsetTime);
    }
    return null;
  },
  getDateTimeOriginal(parsed) {
    let {exif} = parsed;
    if (exif?.DateTimeOriginal) {
      return parseEXIFDate(exif.DateTimeOriginal, exif.SubSecTimeOriginal,
        exif.OffsetTimeOriginal);
    }
    return null;
  },
  getDateTimeDigitized(parsed) {
    let {exif} = parsed;
    if (exif?.DateTimeDigitized) {
      return parseEXIFDate(exif.DateTimeDigitized, exif.SubSecTimeDigitized,
        exif.OffsetTimeDigitized);
    }
    return null;
  },
  getThumbnail(parsed, content) {
    let array = new Uint8Array(content);
    let {thumbnail: t} = parsed;
    if (!t || t.ThumbnailLength === 0) {
      return null;
    }
    let {ThumbnailOffset: offset, ThumbnailLength: length} = t;
    let type = '';
    if (startsWithArray(array, [0xFF, 0xD8], offset)) {
      type = 'image/jpeg';
    } else if (startsWithArray(array, [0x89, 0x50, 0x4E, 0x47], offset)) {
      type = 'image/png';
    }
    return new Blob([array.subarray(offset, offset + length)], {type});
  },
  /**
   * @param {Object} gps 
   * @returns {Date}
   */
  getGPSTimeStamp(gps) {
    if (gps && gps.GPSDateStamp && gps.GPSTimeStamp) {
      let d = gps.GPSDateStamp.split(':').map(parseFloat);
      let t = gps.GPSTimeStamp;
      return new Date(Date.UTC(d[0], d[1] - 1, d[2], t[0], t[1], Math.floor(t[2]), t[2] % 1 * 1000));
    }
    return null;
  },
  /**
   * @param {Object} parsed 
   * @returns {GeolocationCoordinates}
   */
  getGPSCoords(gps) {
    if (gps && 'GPSLongitude' in gps && 'GPSLatitude' in gps) {
      let obj = {};
      obj.longitude = toDegree(gps.GPSLongitude, gps.GPSLongitudeRef);
      obj.latitude = toDegree(gps.GPSLatitude, gps.GPSLatitudeRef);
      if ('GPSAltitude' in gps) {
        obj.altitude = toAltitude(gps.GPSAltitude, gps.GPSAltitudeRef);
      }
      if ('GPSHPositioningError' in gps) {
        obj.accuracy = gps.GPSHPositioningError;
      }
      if ('GPSImgDirection' in gps) {
        obj.heading = toImgDirection(gps.GPSImgDirection, gps.GPSImgDirectionRef);
      }
      if ('GPSSpeed' in gps) {
        obj.speed = toSpeed(gps.GPSAltitude, gps.GPSAltitudeRef);
      }
      return obj;
    }
    return null;
  },
};
/**
 * @param {string} str - like "2023:06:13 15:28:01" or "2023:06:13 15:28:01.487+08:00"
 * @param {string} [subSec]
 * @param {string} [timeOffset] 
 * @returns {Date}
 */
function parseEXIFDate(str, subSec = undefined, timeOffset = undefined) {
  let s = str.slice(0, 10).split(':').join('-') + 'T' + str.slice(11);
  if (str.length < 29) {
    s = s.slice(0, 19); 
    if (subSec) {
      s += '.' + (subSec.length === 3 ? subSec : subSec.slice(0, 3));
    }
    if (timeOffset) {
      s += timeOffset;
    }
  }
  return new Date(s);
}
/**
 * @param {Array<number>} a 
 * @param {string} ref 
 * @returns {degree in WGS84 datum}
 */
function toDegree(a, ref) {
  let deg = a[0] + a[1] / 60 + a[2] / 3600;
  switch (ref) {
    case 'N':
    case 'E':
      return deg;
    case 'S':
    case 'W':
      return -deg;
    default:
      return deg;
  }
}
/**
 * @param {number} n 
 * @param {string} ref 
 * @returns {number} height above sea level
 */
function toAltitude(n, ref) {
  return (ref === 1) ? -n : n;
}
/**
 * @param {number} n 
 * @param {string} ref 
 * @returns {number} speed in km/h
 */
function toSpeed(n, ref) {
  switch (ref) {
    case 'K': return n;
    case 'M': return n * 1.609344; // convert mph to km/h
    case 'N': return n * 1.852; // convert knots to km/h
    default: return n;
  }
}
function toImgDirection(n, ref) {
  switch (ref) {
    case 'T': return n;
    case 'M': return n; // FIXME
    default: return n;
  }
}
