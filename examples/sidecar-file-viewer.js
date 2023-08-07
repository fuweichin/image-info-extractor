import {parseResult, isSupportedSidecarFile, commons} from '../src/extractor.js';
const {extname} = commons;

function main() {
  let viewSidecarFile = (file) => {
    console.time('read');
    let ext = extname(file.name).toLowerCase();
    file.arrayBuffer().then((buffer) => {
      let result = {};
      switch (ext) {
        case '.exif':
        case '.exf': result.EXIF = {content: buffer}; break;
        case '.xmp':
        case '.rdf': result.XMP = {content: buffer}; break;
        case '.icc':
        case '.icm': result.ICC = {content: buffer}; break;
      }
      return result;
    }).then(parseResult).then((result) => {
      console.timeEnd('read');
      console.log('result', result);
    }, (e) => {
      console.error(e);
      console.timeEnd('read');
    });
  };
  let btn = document.getElementById('openFile');
  btn.addEventListener('click', async () => {
    let [fileHandle] = await window.showOpenFilePicker({
      types: [
        {
          description: 'Metadata',
          accept: {
            'application/rdf+xml': ['.xmp', '.rdf'],
            'application/octet-stream': ['.exif', '.exf'],
            'application/vnd.iccprofile': ['.icc', '.icm']
          },
        }
      ],
    });
    let file = await fileHandle.getFile();
    if (isSupportedSidecarFile(file)) {
      viewSidecarFile(file);
    }
  });
  btn.addEventListener('dragenter', (e) => {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0) {
      btn.classList.add('dragover');
    }
  });
  btn.addEventListener('dragover', (e) => {
    e.preventDefault();
  });
  btn.addEventListener('dragleave', (e) => {
    e.preventDefault();
    btn.classList.remove('dragover');
  });
  btn.addEventListener('drop', (e) => {
    e.preventDefault();
    let file = e.dataTransfer.files[0];
    if (!file || file.size < 128) {
      return;
    }
    if (!isSupportedSidecarFile(file)) {
      return;
    }
    viewSidecarFile(file);
  });
}
queueMicrotask(main);
