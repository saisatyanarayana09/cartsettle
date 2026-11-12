export function optimizeImage(url, width = null) {
  if (!url || typeof url !== 'string') return url;

  // Cloudinary dynamic optimization
  if (url.includes('cloudinary.com')) {
    if (url.includes('f_auto')) return url;

    let params = 'f_auto,q_auto';
    if (width) {
      params += ',w_' + width + ',c_limit';
    }
    
    return url.replace('/upload/', '/upload/' + params + '/');
  }

  // Normalize product packshots to frontend public assets
  if (url.includes('/products/packshots/')) {
    const filename = url.split('/products/packshots/').pop();
    return `/products/packshots/${filename}`;
  }

  // Normalize category photos/icons to frontend public assets
  if (url.includes('/categories/')) {
    const filename = url.split('/categories/').pop();
    return `/categories/${filename}`;
  }

  // Normalize banner images to frontend public assets
  if (url.includes('/banners/')) {
    const filename = url.split('/banners/').pop();
    return `/media/banners/${filename}`;
  }

  // Normalize pumpkin seeds asset
  if (url.includes('pumpkin_seeds.jpg')) {
    return '/products/pumpkin_seeds.jpg';
  }

  // Normalize Render backend media URL to relative /media/
  if (url.includes('/media/')) {
    const mediaPath = url.substring(url.indexOf('/media/'));
    return mediaPath.replace('/media/media/', '/media/');
  }

  return url;
}
