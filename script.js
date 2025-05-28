// Data Structure
// collections = [{ id: string, name: string, order: number, color: string }]
// websites = [{ id: string, collectionId: string, name: string, url: string, favicon: string, order: number, color: string }]

// DOM Elements
const collectionsList = document.getElementById('collectionsList');
const websitesGrid = document.getElementById('websitesGrid');
const currentCollectionTitle = document.getElementById('currentCollection');
const addWebsiteBtn = document.getElementById('addWebsiteBtn');
const newCollectionBtn = document.getElementById('newCollectionBtn');
const settingsBtn = document.getElementById('settingsBtn');

// Modals
const newCollectionModal = document.getElementById('newCollectionModal');
const addWebsiteModal = document.getElementById('addWebsiteModal');
const editCollectionModal = document.getElementById('editCollectionModal');
const overlay = document.getElementById('overlay');
const closeModalBtns = document.querySelectorAll('.close-modal');
const saveCollectionBtn = document.getElementById('saveCollectionBtn');
const updateCollectionBtn = document.getElementById('updateCollectionBtn');
const saveWebsiteBtn = document.getElementById('saveWebsiteBtn');
const collectionNameInput = document.getElementById('collectionName');
const collectionColorInput = document.getElementById('collectionColor');
const editCollectionNameInput = document.getElementById('editCollectionName');
const editCollectionColorInput = document.getElementById('editCollectionColor');
const editingCollectionIdInput = document.getElementById('editingCollectionId');
const websiteNameInput = document.getElementById('websiteName');
const websiteUrlInput = document.getElementById('websiteUrl');
const editingWebsiteIdInput = document.getElementById('editingWebsiteId');
const websiteModalTitle = document.getElementById('websiteModalTitle');

// State
let collections = [];
let websites = [];
let activeCollectionId = null;

// Initialize
function init() {
  loadFromLocalStorage();
  // Create a default 'Home' collection if none exists
  if (collections.length === 0) {
    createDefaultHomeCollection();
  }
  renderCollections();
  setupEventListeners();
}

function createDefaultHomeCollection() {
  const homeCollection = {
    id: 'home-' + generateId(),
    name: 'Home',
    order: 0, // Home always has order 0
    color: '#5e72e4' // Default color
  };
  
  collections.push(homeCollection);
  activeCollectionId = homeCollection.id;
  saveToLocalStorage();
}

// Local Storage Functions
function loadFromLocalStorage() {
  const storedCollections = localStorage.getItem('collections');
  const storedWebsites = localStorage.getItem('websites');
  const storedActiveCollection = localStorage.getItem('activeCollectionId');
  
  collections = storedCollections ? JSON.parse(storedCollections) : [];
  websites = storedWebsites ? JSON.parse(storedWebsites) : [];
  activeCollectionId = storedActiveCollection || null;
  
  if (activeCollectionId) {
    renderWebsites(activeCollectionId);
  }
}

function saveToLocalStorage() {
  localStorage.setItem('collections', JSON.stringify(collections));
  localStorage.setItem('websites', JSON.stringify(websites));
  if (activeCollectionId) {
    localStorage.setItem('activeCollectionId', activeCollectionId);
  }
}

// Render Functions
function renderCollections() {
  collectionsList.innerHTML = '';
  
  if (collections.length === 0) {
    // This shouldn't happen now that we have a default Home collection
    return;
  }
  
  // Sort collections by order property
  const sortedCollections = [...collections].sort((a, b) => {
    // Always keep Home collection first
    if (a.name.toLowerCase() === 'home') return -1;
    if (b.name.toLowerCase() === 'home') return 1;
    return a.order - b.order;
  });
  
  sortedCollections.forEach(collection => {
    const li = document.createElement('li');
    li.className = `collection-item ${collection.id === activeCollectionId ? 'active' : ''}`;
    li.dataset.id = collection.id;
    
    // Don't show edit/delete buttons for the Home collection
    const isHome = collection.name.toLowerCase() === 'home';
    
    // Apply collection color if available
    if (collection.color) {
      li.style.backgroundColor = collection.color;
      // Adjust text color based on background brightness
      const brightness = getBrightness(collection.color);
      li.style.color = brightness > 128 ? '#000000' : '#ffffff';
    }
    
    li.innerHTML = `
      <span class="collection-name">${collection.name}</span>
      <button class="edit-btn" data-id="${collection.id}">
        <i class="ri-pencil-fill"></i>
      </button>
    `;
    
    // Make collections draggable (except Home)
    if (!isHome) {
      li.setAttribute('draggable', true);
      li.classList.add('draggable-collection');
      
      // Add drag event listeners
      li.addEventListener('dragstart', handleCollectionDragStart);
      li.addEventListener('dragend', handleCollectionDragEnd);
    } else {
      // Add a special class to the Home collection for styling
      li.classList.add('home-collection');
    }
    
    // Add drop zone for receiving websites from other collections
    li.addEventListener('dragover', handleCollectionDragOver);
    li.addEventListener('dragleave', handleCollectionDragLeave);
    li.addEventListener('drop', handleCollectionDrop);
    
    collectionsList.appendChild(li);
  });
  
  // Add click event to collection items
  document.querySelectorAll('.collection-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (!e.target.closest('.edit-btn') && !e.target.closest('.drag-handle')) {
        const collectionId = item.dataset.id;
        setActiveCollection(collectionId);
      }
    });
  });
  
  // Add click event to edit buttons
  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const collectionId = btn.dataset.id;
      
      // Get collection info
      const collection = collections.find(c => c.id === collectionId);
      const isHome = collection && collection.name.toLowerCase() === 'home';
      
      // Show context menu with appropriate options
      const menuOptions = [
        { 
          label: 'Edit Collection', 
          icon: 'ri-edit-line',
          action: () => openEditCollectionModal(collectionId) 
        }
      ];
      
      // Only add delete option for non-Home collections
      if (!isHome) {
        menuOptions.push({ 
          label: 'Delete Collection', 
          icon: 'ri-delete-bin-line',
          action: () => deleteCollection(collectionId) 
        });
      }
      
      showContextMenu(e, menuOptions);
    });
  });
  
  // Setup collection drag zone
  setupCollectionsDragZone();
}

function renderWebsites(collectionId) {
  websitesGrid.innerHTML = '';
  currentCollectionTitle.textContent = collections.find(c => c.id === collectionId)?.name || 'Home';
  
  // Add Website button should always be enabled since we now have a default collection
  addWebsiteBtn.disabled = false;
  
  // Filter websites by collection ID and sort by order if available
  let collectionWebsites = websites.filter(website => website.collectionId === collectionId);
  
  // Sort websites by order property, ensuring higher order values appear at the bottom
  collectionWebsites = collectionWebsites.sort((a, b) => {
    // If both have order property, sort by it (ascending order puts higher values at the bottom)
    if (a.order !== undefined && b.order !== undefined) {
      return a.order - b.order;
    }
    // If only one has order property, put the one without order at the top
    if (a.order === undefined) return -1;
    if (b.order === undefined) return 1;
    // If neither has order property, maintain original order
    return 0;
  });
  
  if (collectionWebsites.length === 0) {
    websitesGrid.innerHTML = `
      <div class="empty-state">
        <i class="ri-links-line"></i>
        <h3>No websites yet</h3>
        <p>Add your first website to this collection.</p>
      </div>
    `;
    return;
  }
  
  // Make the grid a drop target for rearranging websites
  websitesGrid.addEventListener('dragover', handleWebsiteGridDragOver);
  websitesGrid.addEventListener('drop', handleWebsiteGridDrop);
  
  collectionWebsites.forEach(website => {
    const websiteCard = document.createElement('div');
    websiteCard.className = 'website-card';
    websiteCard.dataset.id = website.id;
    websiteCard.dataset.collectionId = website.collectionId;
    
    // Apply custom card color if available
    if (website.color && website.color !== '#252525') {
      websiteCard.style.backgroundColor = website.color;
      // Adjust text color based on background brightness for better readability
      const brightness = getBrightness(website.color);
      websiteCard.style.color = brightness > 128 ? '#000000' : '#ffffff';
    }
    
    // Make the card draggable
    websiteCard.setAttribute('draggable', true);
    
    // Get domain for favicon if not stored
    const faviconUrl = website.favicon || getFaviconUrl(website.url);
    
    websiteCard.innerHTML = `
      <div class="website-actions">
        <button class="edit-website-btn" data-id="${website.id}">
          <i class="ri-pencil-fill"></i>
        </button>
        <div class="drag-handle" title="Drag to reorder or move to another collection">
          <i class="ri-drag-move-fill"></i>
        </div>
      </div>
      <div class="website-favicon">
        ${faviconUrl ? `<img src="${faviconUrl}" alt="${website.name} favicon" onerror="this.onerror=null; this.src='https://via.placeholder.com/48?text=${website.name.charAt(0)}'">` : 
        `<i class="ri-global-line"></i>`}
      </div>
      <h3 class="website-name">${website.name}</h3>
      <p class="website-url">${website.url}</p>
    `;
    
    websitesGrid.appendChild(websiteCard);
    
    // Add drag event listeners
    websiteCard.addEventListener('dragstart', handleWebsiteDragStart);
    websiteCard.addEventListener('dragend', handleWebsiteDragEnd);
    
    // Add click event to open website
    websiteCard.addEventListener('click', (e) => {
      if (!e.target.closest('.website-actions') && !e.target.closest('.drag-handle')) {
        window.open(website.url, '_blank');
      }
    });
  });
  
  // Add click event to edit buttons
  document.querySelectorAll('.edit-website-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const websiteId = btn.dataset.id;
      
      // Show a context menu with edit and delete options
      showContextMenu(e, [
        { 
          label: 'Edit Website', 
          icon: 'ri-edit-line',
          action: () => openEditWebsiteModal(websiteId) 
        },
        { 
          label: 'Delete Website', 
          icon: 'ri-delete-bin-line',
          action: () => deleteWebsite(websiteId) 
        }
      ]);
    });
  });
}

// Action Functions
function createCollection(name, color = '#5e72e4') {
  // Check if collection with same name already exists (case insensitive)
  const normalizedName = name.trim().toLowerCase();
  const duplicateCollection = collections.find(c => c.name.toLowerCase() === normalizedName);
  
  if (duplicateCollection) {
    showToast(`Collection "${name}" already exists!`, 'error');
    return null;
  }
  
  const newCollection = {
    id: 'collection-' + generateId(),
    name: name,
    order: collections.length, // New collections go to the end
    color: color
  };
  
  collections.push(newCollection);
  saveToLocalStorage();
  renderCollections();
  
  // Set the new collection as active
  setActiveCollection(newCollection.id);
  
  // Close modal and show success message
  closeModal(newCollectionModal);
  collectionNameInput.value = ''; // Clear input
  collectionColorInput.value = '#5e72e4'; // Reset color picker
  showToast(`Collection "${name}" created!`);
  
  return newCollection;
}

function setActiveCollection(collectionId) {
  activeCollectionId = collectionId;
  localStorage.setItem('activeCollectionId', collectionId);
  
  // Update active class in UI
  document.querySelectorAll('.collection-item').forEach(item => {
    item.classList.toggle('active', item.dataset.id === collectionId);
  });
  
  renderWebsites(collectionId);
}

function deleteCollection(collectionId) {
  // Don't allow deleting the Home collection
  const collection = collections.find(c => c.id === collectionId);
  if (collection && collection.name.toLowerCase() === 'home') {
    showToast('The Home collection cannot be deleted.', 'error');
    return;
  }
  
  // Ask for confirmation with custom dialog
  showConfirm(`Are you sure you want to delete "${collection.name}"? All websites in this collection will be deleted as well.`, (confirmed) => {
    if (!confirmed) return;
    
    // Remove collection
    collections = collections.filter(collection => collection.id !== collectionId);
    
    // Remove all websites in this collection
    websites = websites.filter(website => website.collectionId !== collectionId);
    
    // If active collection is deleted, set active collection to Home or first available
    if (activeCollectionId === collectionId) {
      const homeCollection = collections.find(c => c.name.toLowerCase() === 'home');
      activeCollectionId = homeCollection ? homeCollection.id : (collections.length > 0 ? collections[0].id : null);
      renderWebsites(activeCollectionId);
    }
    
    saveToLocalStorage();
    renderCollections();
    showToast('Collection deleted successfully!', 'success');
  });
}

function addWebsite(name, url, color) {
  if (!activeCollectionId) return;
  
  // Enforce maximum name length
  const trimmedName = name.substring(0, 15);
  
  // Normalize URL for comparison (remove trailing slash, protocol, etc.)
  const normalizedUrl = normalizeUrl(url);
  
  // Check if website with same URL already exists in this collection
  const collectionWebsites = websites.filter(w => w.collectionId === activeCollectionId);
  const duplicateWebsite = collectionWebsites.find(w => normalizeUrl(w.url) === normalizedUrl);
  
  if (duplicateWebsite) {
    showToast(`Website with URL "${url}" already exists in this collection!`, 'error');
    return;
  }
  
  // Find highest order in current collection
  const highestOrder = collectionWebsites.reduce((max, website) => 
    website.order !== undefined && website.order > max ? website.order : max, -1);
  
  const newWebsite = {
    id: 'website-' + generateId(),
    collectionId: activeCollectionId,
    name: trimmedName,
    url: url,
    favicon: getFaviconUrl(url),
    color: color || '#252525', // Default card color if none provided
    order: highestOrder + 1 // Place at the end
  };
  
  websites.push(newWebsite);
  saveToLocalStorage();
  renderWebsites(activeCollectionId);
  showToast(`Website "${trimmedName}" added!`);
}

function updateWebsite(websiteId, name, url, color) {
  // Enforce maximum name length
  const trimmedName = name.substring(0, 15);
  
  const website = websites.find(w => w.id === websiteId);
  if (website) {
    // Normalize URL for comparison
    const normalizedUrl = normalizeUrl(url);
    
    // Check if another website with the same URL exists in this collection
    const duplicateWebsite = websites.find(w => 
      w.id !== websiteId && 
      w.collectionId === website.collectionId && 
      normalizeUrl(w.url) === normalizedUrl
    );
    
    if (duplicateWebsite) {
      showToast(`Website with URL "${url}" already exists in this collection!`, 'error');
      return;
    }
    
    website.name = trimmedName;
    website.url = url;
    website.favicon = getFaviconUrl(url);
    website.color = color || website.color || '#252525'; // Use provided color, existing color, or default
    
    saveToLocalStorage();
    renderWebsites(activeCollectionId);
    closeModal(addWebsiteModal);
    showToast(`Website "${trimmedName}" updated!`);
  }
}

function updateCollection(collectionId, name, color) {
  // Enforce maximum name length
  const trimmedName = name.substring(0, 20);
  
  const collection = collections.find(c => c.id === collectionId);
  if (collection) {
    // Check for Home collection
    const isHome = collection.name.toLowerCase() === 'home';
    
    // Don't allow renaming Home collection to something else
    if (isHome && trimmedName.toLowerCase() !== 'home') {
      showAlert('The Home collection cannot be renamed.');
      return;
    }
    
    collection.name = trimmedName;
    collection.color = color;
    
    saveToLocalStorage();
    renderCollections();
    
    // If this is the active collection, update the title
    if (collection.id === activeCollectionId) {
      currentCollectionTitle.textContent = trimmedName;
    }
    
    closeModal(editCollectionModal);
    showToast(`Collection "${trimmedName}" updated!`);
  }
}

function openEditWebsiteModal(websiteId) {
  const website = websites.find(w => w.id === websiteId);
  
  if (!website) return;
  
  websiteNameInput.value = website.name;
  websiteUrlInput.value = website.url;
  editingWebsiteIdInput.value = websiteId;
  websiteModalTitle.textContent = 'Edit Website';
  saveWebsiteBtn.textContent = 'Update';
  
  // Set the color if available, or use default
  const websiteColorInput = document.getElementById('websiteColor');
  websiteColorInput.value = website.color || '#252525';
  
  // Update the preview
  updateCardColorPreview(website.color || '#252525');
  
  openModal(addWebsiteModal);
}

function openEditCollectionModal(collectionId) {
  const collection = collections.find(c => c.id === collectionId);
  if (collection) {
    editCollectionNameInput.value = collection.name;
    editCollectionColorInput.value = collection.color || '#5e72e4';
    editingCollectionIdInput.value = collectionId;
    openModal(editCollectionModal);
  }
}

// Helper function to determine if a color is light or dark
function getBrightness(hexColor) {
  // Convert hex to RGB
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Calculate brightness using the formula (0.299*R + 0.587*G + 0.114*B)
  return (0.299 * r + 0.587 * g + 0.114 * b);
}

// Context Menu for Edit/Delete actions
function showContextMenu(event, options) {
  // Remove any existing context menus
  removeContextMenu();
  
  // Create context menu
  const contextMenu = document.createElement('div');
  contextMenu.className = 'context-menu';
  contextMenu.style.position = 'fixed';
  contextMenu.style.zIndex = '1000';
  contextMenu.style.backgroundColor = 'var(--bg-secondary)';
  contextMenu.style.border = '1px solid var(--border-color)';
  contextMenu.style.borderRadius = '4px';
  contextMenu.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.2)';
  contextMenu.style.overflow = 'hidden';
  
  // Add options to the menu
  options.forEach(option => {
    const item = document.createElement('div');
    item.className = 'context-menu-item';
    item.style.padding = '8px 12px';
    item.style.cursor = 'pointer';
    item.style.display = 'flex';
    item.style.alignItems = 'center';
    item.style.gap = '8px';
    item.style.transition = 'background-color 0.2s';
    
    // Add hover effect
    item.addEventListener('mouseover', () => {
      item.style.backgroundColor = 'var(--bg-tertiary)';
    });
    
    item.addEventListener('mouseout', () => {
      item.style.backgroundColor = 'transparent';
    });
    
    // Add icon if provided
    if (option.icon) {
      const icon = document.createElement('i');
      icon.className = option.icon;
      icon.style.fontSize = '14px';
      item.appendChild(icon);
    }
    
    // Add label
    const label = document.createElement('span');
    label.textContent = option.label;
    label.style.fontSize = '14px';
    item.appendChild(label);
    
    // Add click handler
    item.addEventListener('click', () => {
      removeContextMenu();
      if (option.action) option.action();
    });
    
    contextMenu.appendChild(item);
  });
  
  // Position the menu near the click event
  document.body.appendChild(contextMenu);
  
  // Position the menu
  const rect = contextMenu.getBoundingClientRect();
  const x = Math.min(event.clientX, window.innerWidth - rect.width - 5);
  const y = Math.min(event.clientY, window.innerHeight - rect.height - 5);
  
  contextMenu.style.left = `${x}px`;
  contextMenu.style.top = `${y}px`;
  
  // Close the menu when clicking outside
  setTimeout(() => {
    document.addEventListener('click', removeContextMenu);
  }, 0);
  
  // Prevent the event from bubbling
  event.stopPropagation();
}

function removeContextMenu() {
  const existingMenu = document.querySelector('.context-menu');
  if (existingMenu) {
    existingMenu.remove();
    document.removeEventListener('click', removeContextMenu);
  }
}

function deleteWebsite(websiteId) {
  // Get website info for confirmation message
  const website = websites.find(site => site.id === websiteId);
  
  // Ask for confirmation with custom dialog
  showConfirm(`Are you sure you want to remove "${website?.name || 'this website'}" from your collection?`, (confirmed) => {
    if (!confirmed) return;
    
    // Remove website
    websites = websites.filter(website => website.id !== websiteId);
    saveToLocalStorage();
    renderWebsites(activeCollectionId);
    showToast('Website removed successfully!', 'success');
  });
}

// Helper Functions
function generateId() {
return Math.random().toString(36).substring(2, 15);
}

function getFaviconUrl(url) {
try {
  const urlObj = new URL(url.startsWith('http') ? url : `http://${url}`);
  return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=64`;
} catch (e) {
  return '';
}
}

function normalizeUrl(url) {
try {
  // Add protocol if missing
  if (!url.match(/^[a-zA-Z]+:\/\//)) {
    url = 'http://' + url;
  }
  
  // Create URL object to normalize
  const urlObj = new URL(url);
  
  // Get hostname and path, remove www. prefix and trailing slashes
  let normalized = urlObj.hostname.replace(/^www\./, '') + urlObj.pathname.replace(/\/$/, '');
  
  // Convert to lowercase
  return normalized.toLowerCase();
} catch (e) {
  // If URL parsing fails, just return the lowercase input
  return url.toLowerCase();
}
}

function showToast(message, type = 'success') {
  // Remove existing toast
  const existingToast = document.querySelector('.toast');
  if (existingToast) {
    existingToast.remove();
  }
  
  // Create a toast container if it doesn't exist
  let toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.style.position = 'fixed';
    toastContainer.style.top = '80px';
    toastContainer.style.left = '50%';
    toastContainer.style.transform = 'translateX(-50%)';
    toastContainer.style.zIndex = '99999';
    toastContainer.style.pointerEvents = 'none';
    document.body.appendChild(toastContainer);
  }
  
  // Create new toast
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <i class="${type === 'success' ? 'ri-check-line' : 'ri-error-warning-line'}"></i>
    <span>${message}</span>
  `;
  
  // Add toast to container instead of body
  toastContainer.appendChild(toast);
  
  // Show toast with animation
  setTimeout(() => toast.classList.add('show'), 10);
  
  // Hide toast after 3 seconds
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Modal Functions
function openModal(modal) {
  modal.style.display = 'block';
  overlay.style.display = 'block';
}

function closeModal(modal) {
  modal.style.display = 'none';
  overlay.style.display = 'none';
  
  // Clear inputs
  const inputs = modal.querySelectorAll('input');
  inputs.forEach(input => {
    input.value = '';
  });
}

// Custom Alert Function
function showAlert(message, callback) {
  const alertDialog = document.getElementById('alertDialog');
  const alertMessage = document.getElementById('alertMessage');
  const okBtn = document.getElementById('okBtn');
  const closeAlertBtn = document.getElementById('closeAlertBtn');
  
  // Set the message
  alertMessage.textContent = message;
  
  // Open the dialog
  openModal(alertDialog);
  
  // Handle OK button click
  const handleOk = () => {
    closeModal(alertDialog);
    okBtn.removeEventListener('click', handleOk);
    closeAlertBtn.removeEventListener('click', handleOk);
    overlay.removeEventListener('click', handleOk);
    if (callback) callback(true);
  };
  
  // Add event listeners
  okBtn.addEventListener('click', handleOk);
  closeAlertBtn.addEventListener('click', handleOk);
  overlay.addEventListener('click', handleOk);
}

// Custom Confirm Function
function showConfirm(message, callback) {
  const confirmDialog = document.getElementById('confirmDialog');
  const confirmMessage = document.getElementById('confirmMessage');
  const yesBtn = document.getElementById('yesBtn');
  const noBtn = document.getElementById('noBtn');
  const cancelConfirmBtn = document.getElementById('cancelConfirmBtn');
  
  // Set the message
  confirmMessage.textContent = message;
  
  // Open the dialog
  openModal(confirmDialog);
  
  // Handle Yes button click
  const handleYes = () => {
    closeModal(confirmDialog);
    removeListeners();
    if (callback) callback(true);
  };
  
  // Handle No button click
  const handleNo = () => {
    closeModal(confirmDialog);
    removeListeners();
    if (callback) callback(false);
  };
  
  // Remove all event listeners
  const removeListeners = () => {
    yesBtn.removeEventListener('click', handleYes);
    noBtn.removeEventListener('click', handleNo);
    cancelConfirmBtn.removeEventListener('click', handleNo);
    overlay.removeEventListener('click', handleNo);
  };
  
  // Add event listeners
  yesBtn.addEventListener('click', handleYes);
  noBtn.addEventListener('click', handleNo);
  cancelConfirmBtn.addEventListener('click', handleNo);
  overlay.addEventListener('click', handleNo);
}

// Event Listeners
function setupEventListeners() {
  // New Collection button
  newCollectionBtn.addEventListener('click', () => {
    openModal(newCollectionModal);
  });
  
  // Save Collection button
  saveCollectionBtn.addEventListener('click', () => {
    const name = collectionNameInput.value.trim();
    const color = collectionColorInput.value;
    if (name) {
      createCollection(name, color);
    } else {
      showAlert('Please enter a collection name.');
    }
  });
  
  // Update Collection button
  updateCollectionBtn.addEventListener('click', () => {
    const name = editCollectionNameInput.value.trim();
    const color = editCollectionColorInput.value;
    const collectionId = editingCollectionIdInput.value;
    
    if (name && collectionId) {
      updateCollection(collectionId, name, color);
    } else {
      showAlert('Please enter a collection name.');
    }
  });
  
  // Add Website button
  addWebsiteBtn.addEventListener('click', () => {
    // Clear form fields and reset modal state
    websiteNameInput.value = '';
    websiteUrlInput.value = '';
    editingWebsiteIdInput.value = '';
    websiteModalTitle.textContent = 'Add New Website';
    saveWebsiteBtn.textContent = 'Add';
    
    // Reset color to default
    const websiteColorInput = document.getElementById('websiteColor');
    websiteColorInput.value = '#252525';
    updateCardColorPreview('#252525');
    
    openModal(addWebsiteModal);
  });
  
  // Save Website button
  saveWebsiteBtn.addEventListener('click', () => {
    const name = websiteNameInput.value.trim();
    let url = websiteUrlInput.value.trim();
    const color = document.getElementById('websiteColor').value;
    const websiteId = editingWebsiteIdInput.value;
    
    // Validate inputs
    if (!name) {
      showAlert('Please enter a website name.');
      return;
    }
    
    if (!url) {
      showAlert('Please enter a website URL.');
      return;
    }
    
    // Add protocol if missing
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    if (websiteId) {
      // Update existing website
      updateWebsite(websiteId, name, url, color);
    } else {
      // Add new website
      addWebsite(name, url, color);
    }
    
    closeModal(addWebsiteModal);
  });
  
  // Close modal buttons
  closeModalBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const modal = btn.closest('.modal');
      closeModal(modal);
    });
  });
  
  // Close modal when clicking on overlay
  overlay.addEventListener('click', () => {
    document.querySelectorAll('.modal').forEach(modal => {
      closeModal(modal);
    });
  });
  
  // Allow pressing Enter in input fields
  collectionNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      saveCollectionBtn.click();
    }
  });
  
  websiteUrlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      saveWebsiteBtn.click();
    }
  });
  
  websiteNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      saveWebsiteBtn.click();
    }
  });
  
  // Settings button
  settingsBtn.addEventListener('click', () => {
    openModal(document.getElementById('settingsModal'));
  });
  
  // Export Data button
  document.getElementById('exportDataBtn').addEventListener('click', () => {
    exportData();
  });
  
  // Import Data button
  document.getElementById('importDataBtn').addEventListener('click', () => {
    document.getElementById('importFileInput').click();
  });
  
  // Import File Input
  document.getElementById('importFileInput').addEventListener('change', (e) => {
    importData(e);
  });
  
  // No longer needed - drag and drop provides this functionality
}

// Data Import/Export Functions
function exportData() {
  // Prepare data object with collections and websites
  const exportData = {
    collections: collections,
    websites: websites,
    version: '1.0',
    exportDate: new Date().toISOString()
  };
  
  // Convert to JSON
  const jsonData = JSON.stringify(exportData, null, 2);
  
  // Create downloadable file
  const blob = new Blob([jsonData], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  // Create temporary link and trigger download
  const link = document.createElement('a');
  link.href = url;
  link.download = `web-hub-data-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  
  // Cleanup
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  
  // Close settings modal and show confirmation
  closeModal(document.getElementById('settingsModal'));
  showAlert('Data exported successfully!');
}

function importData(event) {
  const file = event.target.files[0];
  
  if (!file) {
    showAlert('No file selected.');
    return;
  }
  
  // Check if it's a JSON file
  if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
    showAlert('Please select a valid JSON file.');
    event.target.value = ''; // Clear the input
    return;
  }
  
  const reader = new FileReader();
  
  reader.onload = function(e) {
    try {
      const importedData = JSON.parse(e.target.result);
      
      // Validate imported data structure
      if (!importedData.collections || !importedData.websites || !Array.isArray(importedData.collections) || !Array.isArray(importedData.websites)) {
        throw new Error('Invalid data format');
      }
      
      // Show confirmation before importing
      showConfirm(`Import will replace your current data with ${importedData.collections.length} collections and ${importedData.websites.length} websites. Continue?`, (confirmed) => {
        if (confirmed) {
          // Replace current data
          collections = importedData.collections;
          websites = importedData.websites;
          
          // Ensure we have a Home collection
          if (!collections.some(c => c.name.toLowerCase() === 'home')) {
            createDefaultHomeCollection();
          }
          
          // Set active collection to Home or first available
          const homeCollection = collections.find(c => c.name.toLowerCase() === 'home');
          activeCollectionId = homeCollection ? homeCollection.id : (collections.length > 0 ? collections[0].id : null);
          
          // Save to localStorage and update UI
          saveToLocalStorage();
          renderCollections();
          renderWebsites(activeCollectionId);
          
          // Close settings modal and show success message
          closeModal(document.getElementById('settingsModal'));
          showAlert('Data imported successfully!');
        }
      });
    } catch (error) {
      showAlert('Error importing data. Please make sure the file is a valid Web Hub export.');
      console.error('Import error:', error);
    }
    
    // Clear the input
    event.target.value = '';
  };
  
  reader.onerror = function() {
    showAlert('Error reading file. Please try again.');
    event.target.value = ''; // Clear the input
  };
  
  reader.readAsText(file);
}

// Order management is now handled through drag and drop
// These functions have been removed as they're no longer needed

// Drag and Drop Functionality for Collections
function handleCollectionDragStart(e) {
  // Store the collection ID in the dataTransfer object
  e.dataTransfer.setData('application/json', JSON.stringify({
    type: 'collection',
    id: this.dataset.id
  }));
  
  this.classList.add('dragging-collection');
  
  // Set the drag image to be the collection tab
  if (e.dataTransfer.setDragImage) {
    e.dataTransfer.setDragImage(this, 0, 0);
  }
}

function handleCollectionDragEnd() {
  this.classList.remove('dragging-collection');
  document.querySelectorAll('.collection-item').forEach(item => {
    item.classList.remove('drag-over');
  });
}

function setupCollectionsDragZone() {
  // Enable drag and drop for the collections list
  collectionsList.addEventListener('dragover', (e) => {
    e.preventDefault();
    const draggingCollection = document.querySelector('.dragging-collection');
    
    if (draggingCollection) {
      const targetCollection = getDragAfterElement(collectionsList, e.clientX, 'horizontal');
      
      // Don't allow placing items before Home
      const homeItem = Array.from(collectionsList.children).find(item => 
        item.querySelector('.collection-name')?.textContent.trim().toLowerCase() === 'home');
      
      // If target is null, append to the end
      if (targetCollection === null) {
        collectionsList.appendChild(draggingCollection);
      } else if (targetCollection !== homeItem) {
        // Only insert if the target is not the Home collection
        collectionsList.insertBefore(draggingCollection, targetCollection);
      }
    }
  });
  
  collectionsList.addEventListener('drop', (e) => {
    e.preventDefault();
    
    const data = e.dataTransfer.getData('application/json');
    if (!data) return;
    
    try {
      const { type, id } = JSON.parse(data);
      
      if (type === 'collection') {
        // Update collection order based on current DOM order
        const items = collectionsList.querySelectorAll('.collection-item');
        
        // Update order property for each collection
        items.forEach((item, index) => {
          const collectionId = item.dataset.id;
          const collection = collections.find(c => c.id === collectionId);
          
          // Skip the Home collection - it should always have order 0
          if (collection && collection.name.toLowerCase() !== 'home') {
            collection.order = index;
          }
        });
        
        // Save to localStorage and update UI
        saveToLocalStorage();
        showToast('Collection order updated!', 'success');
      }
    } catch (error) {
      console.error('Error processing drop data:', error);
    }
  });
}

// Drag and Drop Functionality for Websites
function handleWebsiteDragStart(e) {
  // Store the website ID in the dataTransfer object
  e.dataTransfer.setData('application/json', JSON.stringify({
    type: 'website',
    id: this.dataset.id,
    collectionId: this.dataset.collectionId
  }));
  
  this.classList.add('dragging-website');
  
  // Set the drag image to be the website card
  if (e.dataTransfer.setDragImage) {
    e.dataTransfer.setDragImage(this, 30, 30);
  }
}

function handleWebsiteDragEnd() {
  this.classList.remove('dragging-website');
  document.querySelectorAll('.website-card').forEach(card => {
    card.classList.remove('drag-over');
  });
  document.querySelectorAll('.collection-item').forEach(item => {
    item.classList.remove('collection-drop-target');
  });
}

function handleWebsiteGridDragOver(e) {
  e.preventDefault();
  const draggingWebsite = document.querySelector('.dragging-website');
  
  if (draggingWebsite) {
    // Find the element we're dragging after
    const targetWebsite = getDragAfterElement(websitesGrid, e.clientY, 'vertical');
    
    // If target is null, append to the end
    if (targetWebsite === null) {
      websitesGrid.appendChild(draggingWebsite);
    } else {
      websitesGrid.insertBefore(draggingWebsite, targetWebsite);
    }
  }
}

function handleWebsiteGridDrop(e) {
  e.preventDefault();
  
  const data = e.dataTransfer.getData('application/json');
  if (!data) return;
  
  try {
    const { type, id } = JSON.parse(data);
    
    if (type === 'website') {
      // Update website order based on current DOM order
      const items = websitesGrid.querySelectorAll('.website-card');
      
      // Update order property for each website
      items.forEach((item, index) => {
        const websiteId = item.dataset.id;
        const website = websites.find(w => w.id === websiteId);
        
        if (website) {
          website.order = index;
        }
      });
      
      // Save to localStorage and update UI
      saveToLocalStorage();
      showToast('Website order updated!', 'success');
    }
  } catch (error) {
    console.error('Error processing drop data:', error);
  }
}

function handleCollectionDragOver(e) {
  e.preventDefault();
  
  // Check if we're dragging a website over a collection
  const draggingWebsite = document.querySelector('.dragging-website');
  
  if (draggingWebsite) {
    // Show visual indicator that this is a drop target
    this.classList.add('collection-drop-target');
  }
}

function handleCollectionDragLeave() {
  this.classList.remove('collection-drop-target');
}

function handleCollectionDrop(e) {
  e.preventDefault();
  this.classList.remove('collection-drop-target');
  
  const data = e.dataTransfer.getData('application/json');
  if (!data) return;
  
  try {
    const { type, id } = JSON.parse(data);
    
    if (type === 'website') {
      const targetCollectionId = this.dataset.id;
      const website = websites.find(w => w.id === id);
      
      if (website && targetCollectionId && website.collectionId !== targetCollectionId) {
        // Move website to the new collection
        website.collectionId = targetCollectionId;
        
        // Save to localStorage
        saveToLocalStorage();
        
        // Update UI
        renderWebsites(activeCollectionId);
        showToast(`Website moved to ${collections.find(c => c.id === targetCollectionId)?.name}`, 'success');
      }
    }
  } catch (error) {
    console.error('Error processing drop data:', error);
  }
}

// Helper function to find element to drag after (works for both horizontal and vertical layouts)
function getDragAfterElement(container, clientPosition, direction = 'vertical') {
  const draggableElements = [...container.querySelectorAll('[draggable="true"]:not(.dragging-website):not(.dragging-collection)')];
  
  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = direction === 'vertical' ?
      clientPosition - box.top - box.height / 2 :
      clientPosition - box.left - box.width / 2;
    
    if (offset < 0 && offset > closest.offset) {
      return { offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// Function to update the card color preview
function updateCardColorPreview(color) {
  const preview = document.getElementById('cardColorPreview');
  if (preview) {
    preview.style.backgroundColor = color;
    
    // Adjust text color based on background brightness
    const brightness = getBrightness(color);
    preview.style.color = brightness > 128 ? '#000000' : '#ffffff';
  }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
  init();
  
  // Add event listener for color picker
  const websiteColorInput = document.getElementById('websiteColor');
  if (websiteColorInput) {
    websiteColorInput.addEventListener('input', (e) => {
      updateCardColorPreview(e.target.value);
    });
  }
});