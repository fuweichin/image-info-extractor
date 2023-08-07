
export async function readFile(file) {
  let result = {};
  let flags = 0;
  let text = await file.text();
  let xmpText;
  let start = text.indexOf('<x:xmpmeta');
  if (start > -1) {
    let end = text.indexOf('</x:xmpmeta>', start);
    if (end > -1) {
      xmpText = text.slice(start, end + 12);
    }
  }
  if (xmpText) {
    result.XMP = {content: xmpText};
    flags |= 0b10;
  }
  let domParser = new DOMParser();
  let doc = domParser.parseFromString(text, 'text/xml');
  let {documentElement: root} = doc;
  let width = root.getAttribute('width');
  let height = root.getAttribute('height');
  if (!width) {
    let m = /\d+ \d+ (\d+) (\d+)/.exec(root.getAttribute('viewBox'));
    if (m) {
      width = m[1];
      height = m[2];
    }
  }
  let info = {width: +width, height: +height, flags, alpha: true, lossless: true};
  result.INFO = {parsed: info};
  return result;
}
