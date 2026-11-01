import imageCompression from 'browser-image-compression';

export async function compressImage(file, maxSizeMB = 0.5, maxWidthOrHeight = 1024) {
  if (!file || !file.type.startsWith('image/')) return file;
  
  const options = {
    maxSizeMB: maxSizeMB,
    maxWidthOrHeight: maxWidthOrHeight,
    useWebWorker: true,
    initialQuality: 0.8
  };

  try {
    const compressedFile = await imageCompression(file, options);
    // Keep the original filename but update the extension if needed
    return new File([compressedFile], file.name, { type: compressedFile.type });
  } catch (error) {
    console.error('Image compression failed:', error);
    return file; // fallback to original file if compression fails
  }
}
