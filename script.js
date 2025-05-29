// Constants and Data Storage
const STORAGE_KEY = "web-hub-sites";
const FAVICON_CACHE_KEY = "favicon-cache";
const CATEGORY_STORAGE_KEY = "web-hub-categories";
const DEFAULT_CATEGORIES = ["Home"];

let categories = JSON.parse(
  localStorage.getItem(CATEGORY_STORAGE_KEY) || "null"
) || [...DEFAULT_CATEGORIES];
let currentCategory = "Home";

// DOM Elements
const websiteGrid = document.getElementById("website-grid");
const addWebsiteBtn = document.getElementById("add-website-btn");
const addWebsiteModal = document.getElementById("add-website-modal");
const addWebsiteForm = document.getElementById("add-website-form");
const settingsBtn = document.getElementById("settings-btn");
const settingsModal = document.getElementById("settings-modal");
const cancelAddBtn = document.getElementById("cancel-add");
const closeSettingsBtn = document.getElementById("close-settings");
const exportDataBtn = document.getElementById("export-data");
const importDataBtn = document.getElementById("import-data");

// Category Modal Elements
const addCategoryBtn = document.getElementById("add-category-btn");
const addCategoryModal = document.getElementById("add-category-modal");
const addCategoryForm = document.getElementById("add-category-form");
const cancelAddCategoryBtn = document.getElementById("cancel-add-category");

// State Management
let websites = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
let faviconCache = JSON.parse(localStorage.getItem(FAVICON_CACHE_KEY) || "{}");
let editingIndex = -1;

// Setup Sortable.js with animation
const sortable = new Sortable(websiteGrid, {
  animation: 150,
  ghostClass: "sortable-ghost",
  chosenClass: "sortable-chosen",
  dragClass: "sortable-drag",
  onEnd: () => {
    updateWebsitesOrder();
  },
});

// Initialize the grid
function initializeGrid() {
  websiteGrid.innerHTML = "";
  const fragment = document.createDocumentFragment();
  let filtered = websites;
  if (currentCategory && currentCategory !== "Home") {
    filtered = websites.filter((w) => w.category === currentCategory);
  }
  if (filtered.length === 0) {
    const emptyMsg = document.createElement("div");
    emptyMsg.className = "empty-message";
    emptyMsg.textContent =
      'No websites found. Click "Add Website" to get started!';
    websiteGrid.appendChild(emptyMsg);
    return;
  }
  filtered.forEach((website, index) => {
    const card = createWebsiteCard(website, index);
    fragment.appendChild(card);
  });
  websiteGrid.appendChild(fragment);
}

// Create website card
function createWebsiteCard(website, index) {
  const card = document.createElement("div");
  card.className = "website-card";
  card.dataset.index = index;
  card.dataset.category = website.category || "Other";
  // Do NOT set card.setAttribute("draggable", "true");

  // Optimized favicon loading
  const urlObj = (() => {
    try {
      return new URL(website.url);
    } catch {
      return null;
    }
  })();
  const faviconBase = urlObj ? urlObj.origin : "";
  const faviconCandidates = [
    `${faviconBase}/favicon.ico`,
    `${faviconBase}/favicon.png`,
    `${faviconBase}/favicon.svg`,
    "../Assets/icons/default-favicon.png",
  ];

  // Create favicon img element
  const faviconImg = document.createElement("img");
  faviconImg.src = faviconCandidates[0];
  faviconImg.alt = website.name;
  faviconImg.dataset.faviconIndex = "0";
  faviconImg.onerror = function () {
    let idx = parseInt(this.dataset.faviconIndex, 10) || 0;
    if (idx + 1 < faviconCandidates.length) {
      this.dataset.faviconIndex = idx + 1;
      this.src = faviconCandidates[idx + 1];
    } else {
      this.onerror = null;
    }
  };

  const contentDiv = document.createElement("div");
  contentDiv.className = "website-card-content";
  contentDiv.appendChild(faviconImg);
  const nameDiv = document.createElement("div");
  nameDiv.className = "website-card-name";
  nameDiv.textContent = website.name;
  contentDiv.appendChild(nameDiv);

  // Add a drag handle for category transfer
  const dragHandle = document.createElement("span");
  dragHandle.className = "website-card-draghandle";
  dragHandle.title = "Drag to category to move";
  dragHandle.innerHTML = '<i class="ri-share-forward-line"></i>';
  dragHandle.setAttribute("draggable", "true");
  dragHandle.style.cursor = "grab";
  dragHandle.addEventListener("dragstart", (e) => {
    e.dataTransfer.setData("text/plain", website.url);
    e.dataTransfer.effectAllowed = "move";
    dragHandle.classList.add("dragging-website");
    // Optionally, visually indicate dragging
  });
  dragHandle.addEventListener("dragend", () => {
    dragHandle.classList.remove("dragging-website");
  });
  contentDiv.appendChild(dragHandle);

  const actionsDiv = document.createElement("div");
  actionsDiv.className = "website-card-actions";
  actionsDiv.innerHTML = `
    <button class="website-card-btn edit-btn" title=""><i class="ri-pencil-fill"></i></button>
    <button class="website-card-btn delete-btn" title=""><i class="ri-delete-bin-line"></i></button>
  `;

  card.appendChild(contentDiv);
  card.appendChild(actionsDiv);

  // Event Listeners
  contentDiv.addEventListener("click", () => {
    incrementVisits(index);
    window.open(website.url, "_blank");
  });

  actionsDiv.querySelector(".edit-btn").addEventListener("click", (e) => {
    e.stopPropagation();
    editWebsite(index);
  });

  actionsDiv.querySelector(".delete-btn").addEventListener("click", (e) => {
    e.stopPropagation();
    deleteWebsite(index);
  });

  return card;
}

// Favicon Management
function getFaviconUrl(url) {
  try {
    const urlObj = new URL(url);
    const favicon = `${urlObj.origin}/favicon.ico`;
    cacheFavicon(url, favicon);
    return favicon;
  } catch {
    return "../Assets/icons/default-favicon.png";
  }
}

function getFaviconFromCache(url) {
  return faviconCache[url];
}

function cacheFavicon(url, faviconUrl) {
  faviconCache[url] = faviconUrl;
  localStorage.setItem(FAVICON_CACHE_KEY, JSON.stringify(faviconCache));
}

// Website Management
function addWebsite(website) {
  website.visits = 0;
  website.lastVisited = null;
  websites.push(website);
  saveWebsites();
  initializeGrid();
}

function editWebsite(index) {
  editingIndex = index;
  const website = websites[index];
  document.getElementById("website-name").value = website.name;
  document.getElementById("website-url").value = website.url;
  // Set modal title and button for edit mode
  document.querySelector("#add-website-modal h2").textContent = "Edit Website";
  document.querySelector('#add-website-form button[type="submit"]').innerHTML =
    '<i class="ri-save-line"></i> Save';
  showModal(addWebsiteModal);
}

function deleteWebsite(index) {
  if (confirm("Are you sure you want to delete this website?")) {
    websites.splice(index, 1);
    saveWebsites();
    initializeGrid();
  }
}

function incrementVisits(index) {
  websites[index].visits = (websites[index].visits || 0) + 1;
  websites[index].lastVisited = new Date().toISOString();
  saveWebsites();
}

// Order Management
function updateWebsitesOrder() {
  const cards = websiteGrid.querySelectorAll(".website-card");
  const newOrder = Array.from(cards).map(
    (card) => websites[parseInt(card.dataset.index)]
  );
  websites = newOrder;
  saveWebsites();
}

// Storage Management
function saveWebsites() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(websites));
}

// Modal Management
function showModal(modal) {
  modal.classList.add("active");
}

function hideModal(modal) {
  modal.classList.remove("active");
}

// Category Management
const categoryContainer = document.getElementById("category-container");
const currentCategoryTitle = document.getElementById("current-category-title");

function renderCategories() {
  categoryContainer.innerHTML = "";
  categories.forEach((cat) => {
    const btn = document.createElement("button");
    btn.className = "nav-item" + (cat === currentCategory ? " active" : "");
    btn.setAttribute("data-category", cat);
    btn.setAttribute("draggable", "false");
    // Label
    const labelSpan = document.createElement("span");
    labelSpan.className = "category-label";
    labelSpan.textContent = cat;
    btn.appendChild(labelSpan);
    // Add edit and delete buttons for categories except Home
    if (cat !== "Home") {
      const iconContainer = document.createElement("span");
      iconContainer.className = "category-icon-container";
      // Edit button
      const editBtn = document.createElement("button");
      editBtn.className = "category-edit-btn";
      editBtn.title = "Edit Collection";
      editBtn.innerHTML = '<i class="ri-pencil-fill"></i>';
      editBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const newName = prompt("Edit collection name:", cat);
        if (newName && newName.trim() && !categories.includes(newName.trim())) {
          const idx = categories.indexOf(cat);
          categories[idx] = newName.trim();
          // Update websites with new category name
          websites.forEach((w) => {
            if (w.category === cat) w.category = newName.trim();
          });
          localStorage.setItem(
            CATEGORY_STORAGE_KEY,
            JSON.stringify(categories)
          );
          saveWebsites();
          renderCategories();
          initializeGrid();
        }
      });
      // Delete button
      const deleteBtn = document.createElement("button");
      deleteBtn.className = "category-delete-btn";
      deleteBtn.title = "Delete Collection";
      deleteBtn.innerHTML = '<i class="ri-delete-bin-line"></i>';
      deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (
          confirm(
            `Delete collection '${cat}'? Websites in this collection will be moved to 'Other'.`
          )
        ) {
          // Move websites to 'Other'
          websites.forEach((w) => {
            if (w.category === cat) w.category = "Other";
          });
          categories = categories.filter((c) => c !== cat);
          localStorage.setItem(
            CATEGORY_STORAGE_KEY,
            JSON.stringify(categories)
          );
          saveWebsites();
          // If currentCategory was deleted, switch to Home
          if (currentCategory === cat) {
            currentCategory = "Home";
            currentCategoryTitle.textContent = currentCategory;
          }
          renderCategories();
          initializeGrid();
        }
      });
      iconContainer.appendChild(editBtn);
      iconContainer.appendChild(deleteBtn);
      btn.appendChild(iconContainer);
    }
    btn.addEventListener("click", () => {
      currentCategory = cat;
      currentCategoryTitle.textContent = cat;
      renderCategories();
      initializeGrid();
    });

    // Drag and drop handlers for website transfer (now only from drag handle)
    btn.addEventListener("dragover", (e) => {
      e.preventDefault();
      btn.classList.add("category-dragover");
    });
    btn.addEventListener("dragleave", () => {
      btn.classList.remove("category-dragover");
    });
    btn.addEventListener("drop", (e) => {
      e.preventDefault();
      btn.classList.remove("category-dragover");
      if (!e.dataTransfer.types.includes("text/plain")) return;
      const websiteUrl = e.dataTransfer.getData("text/plain");
      if (!websiteUrl) return;
      // Only allow drop if a drag handle is being dragged
      const draggingHandle = document.querySelector('.website-card-draghandle.dragging-website');
      if (!draggingHandle) return;
      const websiteObj = websites.find(w => w.url && w.url.toLowerCase() === websiteUrl.toLowerCase());
      if (websiteObj && websiteObj.category !== cat) {
        websiteObj.category = cat;
        saveWebsites();
        currentCategory = cat;
        currentCategoryTitle.textContent = cat;
        renderCategories();
        initializeGrid();
      }
    });

    categoryContainer.appendChild(btn);
  });
}

// Enable drag-and-drop for categories (except Home)
const sortableCategories = new Sortable(categoryContainer, {
  animation: 150,
  filter: '.nav-item[data-category="Home"]', // Prevent Home from being dragged
  preventOnFilter: false,
  onEnd: function (evt) {
    // Only allow reordering of categories after Home
    if (evt.oldIndex === 0 || evt.newIndex === 0) {
      renderCategories();
      return;
    }
    // Remove the dragged category from its old position
    const moved = categories.splice(evt.oldIndex, 1)[0];
    // Insert it at the new position
    categories.splice(evt.newIndex, 0, moved);
    // Ensure Home is always at index 0
    if (categories[0] !== "Home") {
      categories = ["Home", ...categories.filter((c) => c !== "Home")];
    }
    localStorage.setItem(CATEGORY_STORAGE_KEY, JSON.stringify(categories));
    renderCategories();
  },
});

// Event Handlers
addWebsiteForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = document.getElementById("website-name").value.trim();
  const url = document.getElementById("website-url").value.trim();
  let category = currentCategory !== "Home" ? currentCategory : "Other";

  if (!name || !url) {
    alert("Please fill in all required fields");
    return;
  }

  const formattedUrl = url.startsWith("http") ? url : `https://${url}`;

  if (editingIndex >= 0) {
    websites[editingIndex].name = name;
    websites[editingIndex].url = formattedUrl;
    websites[editingIndex].lastModified = new Date().toISOString();
    editingIndex = -1;
  } else {
    addWebsite({
      name,
      url: formattedUrl,
      category,
      visits: 0,
      dateAdded: new Date().toISOString(),
    });
  }

  saveWebsites();
  initializeGrid();
  resetForm();
  hideModal(addWebsiteModal);
});

function resetForm() {
  const form = document.getElementById("add-website-form");
  form.reset();
  editingIndex = -1;
  document.querySelector("#add-website-modal h2").textContent =
    "Add New Website";
  document.querySelector('#add-website-form button[type="submit"]').innerHTML =
    '<i class="ri-add-line"></i> Add';
}

// Button Event Listeners
addWebsiteBtn.addEventListener("click", () => {
  resetForm();
  showModal(addWebsiteModal);
});

settingsBtn.addEventListener("click", () => {
  showModal(settingsModal);
});

cancelAddBtn.addEventListener("click", () => {
  resetForm();
  editingIndex = -1;
  hideModal(addWebsiteModal);
});

closeSettingsBtn.addEventListener("click", () => {
  hideModal(settingsModal);
});

// Data Import/Export
exportDataBtn.innerHTML = '<i class="ri-upload-2-fill"></i> Export';
importDataBtn.innerHTML = '<i class="ri-download-fill"></i> Import';
exportDataBtn.addEventListener("click", () => {
  const dataStr = JSON.stringify(websites, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "web-hub-sites.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

importDataBtn.addEventListener("click", () => {
  // Show a dialog to choose import mode
  const mode = confirm(
    "Click OK to erase previous data and import new data.\nClick Cancel to merge new data with existing data."
  )
    ? "erase"
    : "merge";

  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json";

  input.onchange = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const importedData = JSON.parse(event.target.result);
        let newWebsites = [];
        if (Array.isArray(importedData)) {
          newWebsites = importedData;
        } else if (importedData.categories) {
          newWebsites = importedData.categories.flatMap((cat) =>
            (cat.websites || []).map((site) => ({
              ...site,
              category: cat.name || cat.id || "Other",
            }))
          );
        } else {
          throw new Error("Invalid data format");
        }
        if (mode === "erase") {
          websites = newWebsites;
        } else {
          // Merge: avoid duplicates by URL
          const urlSet = new Set(websites.map((w) => w.url));
          websites = [
            ...websites,
            ...newWebsites.filter((w) => !urlSet.has(w.url)),
          ];
        }
        saveWebsites();
        initializeGrid();
      } catch (error) {
        alert("Error importing data: Invalid format");
      }
    };

    reader.readAsText(file);
  };

  input.click();
});

// Import websites from test-data.json
const importTestDataBtn = document.getElementById("import-testdata-btn");
if (importTestDataBtn) {
  importTestDataBtn.addEventListener("click", async () => {
    try {
      const response = await fetch("/test-data.json");
      const data = await response.json();
      if (data.categories) {
        const importedWebsites = data.categories.flatMap((cat) =>
          (cat.websites || []).map((site) => ({
            ...site,
            category: cat.name || cat.id || "Other",
            visits: 0,
            dateAdded: new Date().toISOString(),
          }))
        );
        // Avoid duplicates by URL
        const urlSet = new Set(websites.map((w) => w.url));
        const newWebsites = importedWebsites.filter((w) => !urlSet.has(w.url));
        websites = [...websites, ...newWebsites];
        saveWebsites();
        initializeGrid();
        alert(`Imported ${newWebsites.length} websites from test-data.json.`);
      } else {
        alert("No categories found in test-data.json");
      }
    } catch (err) {
      alert("Failed to import test-data.json");
    }
  });
}

// Show Add Category Modal
addCategoryBtn.addEventListener("click", () => {
  addCategoryForm.reset();
  showModal(addCategoryModal);
});

// Hide Add Category Modal
cancelAddCategoryBtn.addEventListener("click", () => {
  addCategoryForm.reset();
  hideModal(addCategoryModal);
});

// Add new category
addCategoryForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = document.getElementById("category-name").value.trim();
  if (!name || categories.includes(name)) {
    hideModal(addCategoryModal);
    return;
  }
  categories.push(name);
  localStorage.setItem(CATEGORY_STORAGE_KEY, JSON.stringify(categories));
  renderCategories();
  hideModal(addCategoryModal);
});

// Initialize
renderCategories();
currentCategoryTitle.textContent = currentCategory;
initializeGrid();
