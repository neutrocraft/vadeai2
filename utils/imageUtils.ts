/**
 * Scans image pixel data to find the bounding box of the non-transparent subject.
 */
const getBoundingBox = (imageData: ImageData) => {
  const { data, width, height } = imageData;
  let minX = width, minY = height, maxX = 0, maxY = 0;
  let found = false;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha > 10) { // Threshold for transparency
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        found = true;
      }
    }
  }

  return found ? { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY } : null;
};

/**
 * Automatically centers the non-transparent content of an image within the canvas.
 */
export const autoCenterImage = async (base64Image: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = base64Image;
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject("No context");

      // Draw original to analyze
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const bbox = getBoundingBox(imageData);

      if (!bbox) {
        // Image is empty or fully transparent
        resolve(base64Image); 
        return;
      }

      // Clear and redraw centered
      // We keep original canvas size to preserve resolution, but move content
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const objectCenterX = bbox.minX + (bbox.width / 2);
      const objectCenterY = bbox.minY + (bbox.height / 2);

      const dx = centerX - objectCenterX;
      const dy = centerY - objectCenterY;

      ctx.drawImage(img, dx, dy);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
  });
};

/**
 * Generates a black and white mask image from paths.
 */
export const generateMaskFromCanvas = (
  width: number, 
  height: number, 
  paths: { x: number, y: number }[][]
): string => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Background: Black (Protected)
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, width, height);

  // Strokes: White (Masked area)
  ctx.strokeStyle = 'white';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 40; // Brush size in image pixels

  paths.forEach(path => {
    if (path.length < 1) return;
    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) {
      ctx.lineTo(path[i].x, path[i].y);
    }
    ctx.stroke();
  });

  return canvas.toDataURL('image/png'); 
};

/**
 * Applies a watermark pattern to the image for Free users.
 */
export const applyWatermark = async (base64Image: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Image;
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(base64Image); return; }

      // Draw original
      ctx.drawImage(img, 0, 0);

      // Watermark Logic
      ctx.save();
      ctx.font = `bold ${Math.max(20, img.width * 0.05)}px sans-serif`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Rotate for diagonal repeating pattern
      ctx.rotate(-45 * Math.PI / 180);
      
      const stepX = img.width * 0.4;
      const stepY = img.height * 0.4;
      
      // Draw repeating text
      for (let x = -img.width; x < img.width * 2; x += stepX) {
        for (let y = -img.height; y < img.height * 2; y += stepY) {
            ctx.fillText('LUMINA FREE', x, y);
        }
      }
      
      ctx.restore();
      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };
    img.onerror = () => resolve(base64Image); // Fallback
  });
};

/**
 * Creates a small thumbnail for the dashboard to save memory.
 */
export const createThumbnail = async (base64Image: string): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = base64Image;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const targetSize = 300;
            const scale = Math.min(targetSize / img.width, targetSize / img.height);
            canvas.width = img.width * scale;
            canvas.height = img.height * scale;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.onerror = () => resolve('');
    });
};