/**
 * 
 * @param {*} file 
 * @param {Object} options {colorSpace:'', alpha:false, type:'iamge/jpeg', quality: 0.85}
 * @returns 
 */
export function generateThumbnailFromFile(file, options) {
  let img = new Image();
  img.src = URL.createObjectURL(file);
  return img.decode().then(async () => {
    img.width = img.naturalWidth;
    img.height = img.naturalHeight;
    let rect = objectFit({width: 252, height: 252}, img, 'contain');
    let thumbnailWidth = Math.floor(rect.width);
    let thumbnailHeight = Math.floor(rect.height);
    let imageSource = img;
    let blob = await generateThumbnail(imageSource, thumbnailWidth, thumbnailHeight, {
      colorSpace: options.colorSpace,
      alpha: options.alpha,
      type: options.type || (file.type.endsWith('png') ? 'image/png' : 'image/jpeg'),
      quality: options.quality || 0.85,
    });
    return {width: thumbnailWidth, height: thumbnailHeight, blob};
  });
}
/**
 *  
 * @param {HTMLImageElement|SVGImageElement|HTMLCanvasElement|ImageBitmap|OffscreenCanvas|HTMLVideoElement|VideoFrame} imageSource 
 * @param {number} width 
 * @param {number} height 
 * @param {Object} [options] 
 * @returns 
 */
export function generateThumbnail(imageSource, width, height, options) {
  return new Promise((resolve, reject) => {
    let  {colorSpace = 'srgb', alpha, backgroundColor = '#ffffff', type, quality} = options;
    let canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    try {
      let context = canvas.getContext('2d', {colorSpace, alpha});
      if (type === 'image/jpeg' || alpha === false) {
        context.fillStyle = backgroundColor;
        context.fillRect(0, 0, width, height);
      }
      context.drawImage(imageSource, 0, 0, width, height);
      canvas.toBlob(resolve, type, quality);
    } catch (e) {
      reject(e);
    }
  });
}
/**
 * borrowed from [object-fit-math](https://github.com/nrkn/object-fit-math/blob/master/dist/fitter.js)
 * @param {Object} parent 
 * @param {Object} child 
 * @param {string} mode
 * @returns 
 */
function objectFit(parent, child, mode = 'fill') {
  let fitMode = mode;
  if (mode === 'scale-down') {
    fitMode = (child.width <= parent.width && child.height <= parent.height) ? 'none' : 'contain';
  }
  switch (fitMode) {
    case 'cover':
    case 'contain': {
      const wr = parent.width / child.width;
      const hr = parent.height / child.height;
      const ratio = fitMode === 'cover' ? Math.max(wr, hr) : Math.min(wr, hr);
      const width = child.width * ratio;
      const height = child.height * ratio;
      return {width, height};
    }
    case 'none':
      return child;
    case 'fill':
    default:
      return parent;
  }
}
