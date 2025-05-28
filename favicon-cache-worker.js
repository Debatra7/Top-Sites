// Web Worker for favicon caching and processing
const faviconCache = new Map();

self.addEventListener('message', async (e) => {
  const { type, url, websiteId } = e.data;
  
  if (type === 'getFavicon') {
    try {
      // Check if favicon is already in cache
      if (faviconCache.has(url)) {
        self.postMessage({
          type: 'faviconResult',
          websiteId,
          url,
          faviconUrl: faviconCache.get(url)
        });
        return;
      }
      
      // Get favicon from Google's service
      const normalizedUrl = url.startsWith('http') ? url : `http://${url}`;
      let urlObj;
      try {
        urlObj = new URL(normalizedUrl);
      } catch (err) {
        self.postMessage({
          type: 'faviconError',
          websiteId,
          url,
          error: 'Invalid URL'
        });
        return;
      }
      
      const faviconUrl = `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=64`;
      
      // Cache the favicon URL
      faviconCache.set(url, faviconUrl);
      
      // Return the favicon URL
      self.postMessage({
        type: 'faviconResult',
        websiteId,
        url,
        faviconUrl
      });
    } catch (error) {
      self.postMessage({
        type: 'faviconError',
        websiteId,
        url,
        error: error.message
      });
    }
  } else if (type === 'clearCache') {
    faviconCache.clear();
    self.postMessage({ type: 'cacheCleared' });
  }
});
