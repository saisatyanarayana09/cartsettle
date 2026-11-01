export function optimizeImage(url, width = null) {
  if (!url || typeof url !== 'string') return url;
  if (!url.includes('cloudinary.com')) return url;
  
  if (url.includes('f_auto')) return url;

  let params = 'f_auto,q_auto';
  if (width) {
    params += ',w_' + width + ',c_limit';
  }
  
  return url.replace('/upload/', '/upload/' + params + '/');
}