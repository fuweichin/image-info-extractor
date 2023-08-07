import {utf8Decoder} from './commons.js';
import {tagTypeMap} from './xmp-tags.js';

const rdfxmlns = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';

/**
 * @param {ArrayBuffer} buffer 
 * @returns {Object}
 */
export function parse(buffer) {
  let text;
  if (buffer instanceof ArrayBuffer) {
    text = utf8Decoder.decode(buffer);
  } else if (typeof buffer === 'string') {
    text = buffer;
  } else {
    throw new TypeError('param buffer can be either an ArrayBuffer or a string');
  }
  let parsed = {};
  let parser = new DOMParser();
  let doc = parser.parseFromString(text, 'text/xml');
  {
    let root = doc.documentElement;
    let attr;
    attr = root.getAttributeNodeNS('adobe:ns:meta/', 'xmptk');
    if (attr) {
      parsed[attr.prefix] = {
        [attr.localName]: attr.value
      };
    }
    attr = root.getAttributeNodeNS('http://ns.adobe.com/xmp/note/', 'HasExtendedXMP');
    if (attr) {
      parsed[attr.prefix] = {
        [attr.localName]: attr.value
      };
    }
  }
  let rdfEl;
  {
    rdfEl = doc.getElementsByTagNameNS(rdfxmlns, 'RDF').item(0);
    if (!rdfEl)
      return parsed;
  }
  for (let descEl of rdfEl.children) {
    if (descEl.localName !== 'Description') {
      continue;
    }
    let rdf_about = descEl.getAttributeNS(rdfxmlns, 'about');
    if (rdf_about !== '') { // skip non-empty subjects
      continue;
    }
    // iterate over attributes
    let nsMap = {rdf: rdfxmlns};
    for (let attr of descEl.attributes) {
      let {prefix, localName, value} = attr;
      if (prefix.length === 0) {
        continue;
      } else if (prefix === 'xmlns') {
        nsMap[localName] = value;
        let group = parsed[localName];
        if (!group) {
          group = parsed[localName] = {};
        }
      } else {
        let group = parsed[prefix];
        if (!group) {
          group = parsed[prefix] = {};
        }
        setProperty(group, attr.name, localName, value);
      }
    }
    // walk through chidren
    for (let tagEl of descEl.children) {
      let {prefix, localName} = tagEl;
      let group = parsed[prefix];
      if (!group) {
        continue;
      }
      let value = parseElementAsValue(tagEl);
      setProperty(group, tagEl.nodeName, localName, value);
    }
  }
  return parsed;
}
function setProperty(target, name, localName, value) {
  let type = tagTypeMap[name];
  if (type) {
    let val = value;
    switch (type) {
      case 'integer':
        val = parseInt(value);
        break;
      case 'boolean':
        val = value.length === 4;
        break;
      case 'real':
        val = Number(value);
        break;
      case 'rational':
        val = parseRational(value);
        break;
      // case 'integer[]':
      //   val = value.map(Number);
      //   break;
      // case 'boolean[]':
      //   val = value.map((s) => s.length === 4);
      //   break;
      case 'rational[]':
        val = value.map(parseRational);
        break;
      case 'real[]':
        val = value.map(Number);
        break;
      case 'Date':
        val = parseXMPDate(value);
        break;
      case 'Date[]':
        val = value.map((s) => parseXMPDate(s));
        break;
      case 'GPSCoordinate':
        val = parseGPSCoodinate(value);
        break;
      case 'base64':
        val = parseBase64(value);
        break;
      default:
        throw new Error('Unsupported type: ' + type + ' ' + value);
    }
    target[localName] = val;
  } else {
    target[localName] = value;
  }
}
function parseXMPDate(str) {
  if (str.charAt(10) === 'T') {
    return new Date(str);
  }
  return new Date(str.replace(/^(\d{4}):(\d\d):(\d\d) /, '$1-$2-$3T')); // (_, $1, $2, $3) => $1+'-'+$2+'-'+$3+'T')
}
function parseRational(str) {
  let p = str.indexOf('/');
  if (p === -1) {
    return NaN;
  } else {
    return Number(str.slice(0, p)) / Number(str.slice(p + 1));
  }
}
function parseBase64(data) {
  let text = atob(data);
  let array = new Uint8Array(text.length);
  for (let i = 0, len = array.length; i < len; i++) {
    array[i] = text.charCodeAt(i);
  }
  return array;
}
function parseGPSCoodinate(str) {
  let m;
  if ((m = str.match(/^(\d+),(\d+)[,.](\d+)([NSWE])$/)) !== null) { // from text content
    let deg = +m[1] + m[2] / 60 + m[3] / 3600;
    switch (m[4]) {
      case 'N':
      case 'E':
        break;
      case 'S':
      case 'W':
        deg = -deg;
        break;
    }
    return deg;
  } else if ((m = str.match(/^(-?\d+)\/(\d+) (-?\d+)\/(\d+) (-?\d+)\/(\d+)$/)) !== null) { // from attribute value
    let deg = m[1] / m[2] + m[2] / m[3] / 60 + m[4] / m[5] / 3600; // FIXME need more samples
    return deg;
  } else {
    throw new Error('Invalid GPSCoodinate: ' + str);
  }
}
function parseElementAsValue(el) {
  let {attributes, children} = el;
  let firstEl;
  if (children.length === 0) {
    if (attributes.length === 0) {
      return el.textContent;
    } else {
      return parseAttributesAsVaue(el);
    }
  } else if (children.length === 1 && (firstEl = el.firstElementChild).prefix === 'rdf') {
    return parseRDFAsValue(firstEl, el);
  } else { // 1+ children, 0+ attributes
    let parseType = el.getAttributeNS(rdfxmlns, 'parseType');
    if (parseType != null) {
      switch (parseType) {
        case 'Resource': {
          return parseChildrenAsValue(el);
        }
        default:
          console.warn('Unsupported parseType: ' + parseType);
          return null;
      }
    } else {
      console.warn('Expected parseType attribute on node ' + el.nodeName);
      return null;
    }
  }
}
function parseRDFAsValue(rdfEl, contextEl) {
  switch (rdfEl.localName) {
    case 'Seq': {
      let val = [];
      for (let li of rdfEl.children) {
        if (li.hasAttributes()) {
          let lastAttr = li.attributes[li.attributes.length - 1];
          if (li.getAttributeNS(rdfxmlns, 'parseType') === 'Resource') {
            val.push(parseChildrenAsValue(li));
          } else {
            val.push(parseAttributesAsVaue(li, lastAttr.prefix));
          }
        } else {
          val.push(li.textContent);
        }
      }
      return val;
    }
    case 'Alt': {
      let val;
      for (let li of rdfEl.children) {
        val = li.textContent;
        break;
      }
      return val;
    }
    case 'Bag': {
      let val = [];
      for (let li of rdfEl.children) {
        val = val.push(li.textContent);
        break;
      }
      return val;
    }
    default:
      console.warn('Unsupported child element: ' + rdfEl.nodeName);
      return null;
  }
}
function parseAttributesAsVaue(el, prefix = null) {
  let group = {};
  if (prefix) {
    for (let attr of el.attributes) {
      if (attr.prefix === prefix) {
        setProperty(group, attr.name, attr.localName, attr.value);
      }
    }
  } else {
    for (let attr of el.attributes) {
      if (attr.prefix !== 'rdf') {
        setProperty(group, attr.name, attr.localName, attr.value);
      }
    }
  }
  return group;
}

function parseChildrenAsValue(el, prefix = null) {
  let group = {};
  if (prefix) {
    for (let childEl of el.children) {
      if (childEl.prefix === prefix) {
        setProperty(group, childEl.nodeName, childEl.localName, parseElementAsValue(childEl));
      }
    }
  } else {
    for (let childEl of el.children) {
      setProperty(group, childEl.nodeName, childEl.localName, parseElementAsValue(childEl));
    }
  }
  return group;
}

export function parseExtendedXMP(buffer) {
  // TODO
}
