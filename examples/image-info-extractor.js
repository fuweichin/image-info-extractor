import Vue from 'vue2';
import * as extractor from 'image-info-extractor';
import {generateThumbnailFromFile} from './thumbnail.js';

// to support vendor-specific XMP tags
import {tagTypeMap as googleTagTypeMap} from '../support/xmp-tags-google.js';
import {tagTypeMap as adobeTagTypeMap} from '../support/xmp-tags-adobe.js';
Object.assign(extractor.xmpTagTypeMap, googleTagTypeMap, adobeTagTypeMap);

let {exifHelpers} = extractor;

function main() {
  let app = new Vue(App);
  app.$mount(document.querySelector('template'));
}
queueMicrotask(main);

const App = {
  data() {
    return {
      fileName: '',
      infoEntries: [],
      metaEntries: [],
      gpsCoords: '',
      gpsTimeStamp: '',
      thumbnail: null,
      thumbnailSource: '',
    };
  },
  methods: {
    async handleFileChange(e) {
      let input = e.target;
      let file = input.files[0];
      if (!file) {
        return;
      }
      input.value = '';

      console.time('read');
      let result;
      try {
        result = await extractor.readFile(file).then(extractor.parseResult);
      } catch (e) {
        console.error(e);
        return;
      } finally {
        console.timeEnd('read');
      }
      console.log('result', result);
      this.fileName = file.name;
      
      // show image info
      let info = result.INFO.parsed;
      let infoEntries = [];
      let infoKeys = ['width', 'height', 'bitDepth', 'alpha', 'lossless', 'progressive', 'animation', 
        'rotation', 'mirror', 'creationTime', 'modificationTime'];
      for (let key of infoKeys) {
        let value = info[key];
        if (value !== undefined) {
          infoEntries.push({key, value});
        }
      }
      this.infoEntries = infoEntries;

      // show metadata
      let {EXIF, XMP, ExtendedXMP, ICC} = result;
      let metaEntries = [];
      if (EXIF) {
        let blob = new File([EXIF.content], file.name + '.exif', {type: 'application/octet-stream'});
        metaEntries.push({label: 'EXIF', file: blob, url: URL.createObjectURL(blob)});
      }
      if (XMP) {
        let blob = new File([XMP.content], file.name + '.xmp', {type: 'application/rdf+xml'});
        metaEntries.push({label: 'XMP', file: blob, url: URL.createObjectURL(blob)});
      }
      if (ExtendedXMP) {
        let blob = new File([ExtendedXMP.content], file.name + '.extended.xmp', {type: 'application/rdf+xml'});
        metaEntries.push({label: 'XMP', file: blob, url: URL.createObjectURL(blob)});
      }
      if (ICC) {
        let blob = new File([ICC.content], file.name + '.icc', {type: 'application/vnd.iccprofile'});
        metaEntries.push({label: 'ICC', file: blob, url: URL.createObjectURL(blob)});
      }
      this.metaEntries = metaEntries;
      
      // show GPS
      let parsed = result.EXIF?.parsed;
      let gpsCoords;
      if (parsed?.gps && (gpsCoords = exifHelpers.getGPSCoords(parsed.gps))) {
        this.gpsCoords = JSON.stringify(gpsCoords);
        let date = exifHelpers.getGPSTimeStamp(parsed.gps);
        this.gpsTimeStamp = date === null ? '' : date.toISOString();
      } else {
        this.gpsCoords = '';
        this.gpsTimeStamp = '';
      }

      // show thumbnail
      let thumbnail = parsed?.thumbnail;
      if (thumbnail && thumbnail.ThumbnailLength > 0) {
        let blob = exifHelpers.getThumbnail(EXIF.parsed, EXIF.content);
        this.showThumbnail(thumbnail.ImageWidth, thumbnail.ImageHeight, blob);
        this.thumbnailSource = 'EXIF';
      } else if (canDecode(file)) {
        let colorSpace = 'srgb';
        let iccInfo;
        if ((iccInfo = result.ICC?.parsed) !== undefined) {
          let desc = iccInfo.tags.profileDescription;
          if (/(Display |image |DCI-)P3/.test(desc)) {
            colorSpace = 'display-p3';
          }
        }
        let {width, height, blob} = await generateThumbnailFromFile(file, {colorSpace});
        this.showThumbnail(width, height, blob);
        this.thumbnailSource = 'generated';
      } else {
        this.showThumbnail(0, 0, null);
        this.thumbnailSource = '';
      }
    },
    showThumbnail(width, height, blob) {
      let t = this.thumbnail;
      if (t) {
        URL.revokeObjectURL(t.src);
      }
      if (!(blob instanceof Blob)) {
        this.thumbnail = null;
        return;
      }
      let src = URL.createObjectURL(blob);
      let ext = '.' + blob.type.split('/')[1];
      this.thumbnail = {width, height, src, name: 'thumbnail' + ext, size: blob.size, type: blob.type};
    }
  }
};

function canDecode(file) {
  switch (file.type) {
    case 'image/jpeg':
    case 'image/png':
    case 'image/apng':
    case 'image/webp':
    case 'image/avif':
    case 'image/avif-sequence': return true;
    default: return /\.(jpe?g|a?png|webp|avifs?)/i.test(file.name || '');
  }
}
