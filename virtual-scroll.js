/**
 * VirtualScroll - A utility for efficiently rendering large lists
 * 
 * This class implements a virtual scrolling mechanism that only renders
 * elements that are visible in the viewport, improving performance for
 * collections with many items.
 */
class VirtualScroll {
  constructor(options) {
    this.container = options.container;
    this.itemHeight = options.itemHeight || 200; // Default card height
    this.renderItem = options.renderItem;
    this.items = [];
    this.visibleItems = new Set();
    this.observer = null;
    this.itemElements = new Map(); // Map of item id to DOM element
    this.bufferSize = options.bufferSize || 5; // Number of items to render outside viewport
    
    this.init();
  }
  
  init() {
    // Create intersection observer for lazy loading
    this.observer = new IntersectionObserver(this.handleIntersection.bind(this), {
      root: null,
      rootMargin: `${this.itemHeight * this.bufferSize}px 0px`,
      threshold: 0.01
    });
    
    // Add scroll event listener to update visible items
    this.container.addEventListener('scroll', this.throttle(this.updateVisibleItems.bind(this), 100));
    window.addEventListener('resize', this.throttle(this.updateVisibleItems.bind(this), 100));
  }
  
  setItems(items) {
    this.items = items;
    this.updateContainer();
    this.updateVisibleItems();
  }
  
  updateContainer() {
    // Set container height based on total number of items
    const totalHeight = this.items.length * this.itemHeight;
    this.container.style.height = `${totalHeight}px`;
  }
  
  updateVisibleItems() {
    const containerRect = this.container.getBoundingClientRect();
    const parentRect = this.container.parentElement.getBoundingClientRect();
    
    // Calculate visible range
    const scrollTop = this.container.parentElement.scrollTop;
    const viewportHeight = parentRect.height;
    
    const startIndex = Math.max(0, Math.floor(scrollTop / this.itemHeight) - this.bufferSize);
    const endIndex = Math.min(this.items.length, Math.ceil((scrollTop + viewportHeight) / this.itemHeight) + this.bufferSize);
    
    const newVisibleItems = new Set();
    
    // Add placeholders for all items
    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];
      const isVisible = i >= startIndex && i < endIndex;
      
      if (isVisible) {
        newVisibleItems.add(item.id);
        
        if (!this.visibleItems.has(item.id)) {
          // Item wasn't visible before, render it
          this.renderItemElement(item, i);
        }
      } else if (this.visibleItems.has(item.id) && !newVisibleItems.has(item.id)) {
        // Item was visible but isn't anymore, remove it
        const element = this.itemElements.get(item.id);
        if (element && element.parentNode) {
          element.parentNode.removeChild(element);
        }
        this.itemElements.delete(item.id);
      }
    }
    
    this.visibleItems = newVisibleItems;
  }
  
  renderItemElement(item, index) {
    const element = this.renderItem(item);
    element.style.position = 'absolute';
    element.style.top = `${index * this.itemHeight}px`;
    element.style.width = '100%';
    element.dataset.index = index;
    
    this.container.appendChild(element);
    this.itemElements.set(item.id, element);
    
    // Observe for lazy loading of content
    this.observer.observe(element);
  }
  
  handleIntersection(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        // Load any deferred content (like images)
        const element = entry.target;
        const lazyImages = element.querySelectorAll('.lazy-image');
        
        lazyImages.forEach(img => {
          if (img.dataset.src) {
            img.src = img.dataset.src;
            img.classList.remove('lazy-image');
            delete img.dataset.src;
          }
        });
        
        // Stop observing once loaded
        this.observer.unobserve(element);
      }
    });
  }
  
  refresh() {
    // Clear all rendered items
    this.container.innerHTML = '';
    this.itemElements.clear();
    this.visibleItems.clear();
    
    // Re-render
    this.updateContainer();
    this.updateVisibleItems();
  }
  
  // Utility function to limit the rate at which a function is called
  throttle(func, limit) {
    let inThrottle;
    return function() {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }
}
