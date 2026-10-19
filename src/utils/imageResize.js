export function resizeImageToSquare(file, targetSize = 300, quality = 0.7) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      return reject(new Error('Selected file must be an image.'));
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = targetSize;
          canvas.height = targetSize;
          const ctx = canvas.getContext('2d');

          // Center crop to a square
          const minDim = Math.min(img.width, img.height);
          const sx = (img.width - minDim) / 2;
          const sy = (img.height - minDim) / 2;

          ctx.drawImage(
            img,
            sx,
            sy,
            minDim,
            minDim,
            0,
            0,
            targetSize,
            targetSize
          );

          // Export as compressed JPEG
          const dataUrl = canvas.toDataURL('image/jpeg', quality);

          // Verify length does not exceed Firestore Spark constraints (~60KB)
          if (dataUrl.length > 60000) {
            // Compress with lower quality if needed
            const recompressed = canvas.toDataURL('image/jpeg', 0.5);
            resolve(recompressed);
          } else {
            resolve(dataUrl);
          }
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = () => reject(new Error('Failed to load image.'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });
}
