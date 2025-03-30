/**
 * Firebase configuration object containing necessary credentials and settings
 * to connect to the Firebase backend for the Frozen Filipino Food Inventory app.
 */
const firebaseConfig = {
    apiKey: "AIzaSyCqRgwfenGMbnj_rclROcQwlj6LFRxaEac",
    authDomain: "frozenfilipinofoodinventory.firebaseapp.com",
    databaseURL: "https://frozenfilipinofoodinventory-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "frozenfilipinofoodinventory",
    storageBucket: "frozenfilipinofoodinventory.firebasestorage.app",
    messagingSenderId: "755457069655",
    appId: "1:755457069655:web:bccc922d8633e028a00912",
    measurementId: "G-PRQ73N6GGF"
  };
  

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

let currentBranch = null;
let currentUser = null;
let authChecked = false;

/**
 * Signs out the current user and redirects to the login page.
 * Removes the user role from local storage as part of the logout process.
 */
function signOut() {
    auth.signOut().then(() => {
      localStorage.removeItem("userRole");
      localStorage.removeItem("userId");
      window.location.href = "../login/login.html";
    });
  }

  async function getCurrentUserData() {
    return new Promise((resolve, reject) => {
      const unsubscribe = auth.onAuthStateChanged(async (user) => {
        unsubscribe(); // Remove the listener after first invocation
        
        if (!user) {
          reject(new Error("No user logged in"));
          return;
        }
  
        try {
          const snapshot = await db.ref(`users/${user.uid}`).once('value');
          const userData = snapshot.val();
          
          if (!userData) {
            reject(new Error("User data not found"));
            return;
          }
          
          resolve({
            authData: {
              uid: user.uid,
              email: user.email,
              emailVerified: user.emailVerified
            },
            dbData: userData
          });
        } catch (error) {
          console.error("Error fetching user data:", error);
          reject(error);
        }
      });
    });
  }
  
  
  // Usage:
  getCurrentUserData().then((userData) => {
    console.log("Full user data:", userData);
  });

  function updateUserProfile(name, branchId) {
    const user = auth.currentUser;
    if (!user) return;
    
    const updates = {};
    if (name) updates['users/' + user.uid + '/name'] = name;
    if (branchId) updates['users/' + user.uid + '/branchId'] = branchId;
    
    return db.ref().update(updates);
  }

// Keep only ONE DOMContentLoaded event listener
document.addEventListener("DOMContentLoaded", () => {
    // Prevent multiple initializations
    if (authChecked) return;
    authChecked = true;
  
    console.log("Manager page initializing...");
    
    // Set up a SINGLE auth state listener
    auth.onAuthStateChanged(async (user) => {
      console.log("Auth state changed. User:", user ? "logged in" : "logged out");
      
      if (!user) {
        console.log("No authenticated user, redirecting to login");
        window.location.href = "../login/login.html";
        return;
      }
  
      try {
        // Log the user's UID for debugging
        console.log("Current user UID:", user.uid);
        
        // Check user data from database with detailed logging
        const snapshot = await db.ref(`users/${user.uid}`).once('value');
        console.log("User data retrieved:", snapshot.exists() ? "exists" : "does not exist");
        
        if (!snapshot.exists()) {
          console.error("User data not found in database for UID:", user.uid);
          signOut();
          return;
        }
        
        const userData = snapshot.val();
        console.log("User role:", userData.role);
        
        // Verify the role
        if (userData.role !== "manager") {
          console.error("User role is not manager:", userData.role);
          signOut();
          return;
        }
        
        // Store necessary data
        localStorage.setItem("userRole", userData.role);
        localStorage.setItem("userId", user.uid);
        currentUser = user;
        
        // Check branch assignment
        console.log("Checking branch assignment, branchId:", userData.branchId);
        if (!userData.branchId) {
          console.error("No branch assigned to manager:", user.uid);
          alert("Error: No branch assigned to your account. Please contact admin.");
          signOut();
          return;
        }
        
        currentBranch = userData.branchId;
        
        // Load branch details
        try {
          const branchSnapshot = await db.ref(`branches/${currentBranch}`).once('value');
          console.log("Branch data retrieved:", branchSnapshot.exists() ? "exists" : "does not exist");
          
          if (!branchSnapshot.exists()) {
            console.error("Branch data not found for ID:", currentBranch);
            alert("Error: Branch data not found. Please contact admin.");
            signOut();
            return;
          }
          
          const branchData = branchSnapshot.val();
          
          // Update UI with branch name
          const branchNameElement = document.getElementById("branch-name");
          if (branchNameElement) {
            branchNameElement.textContent = branchData.name || "Unnamed Branch";
          }
          
          // Initialize dashboard now that everything is verified
          showPage("dashboard");
          
        } catch (branchError) {
          console.error("Error loading branch data:", branchError);
          alert("Error loading branch data: " + branchError.message);
          signOut();
        }
        
      } catch (error) {
        console.error("Session verification failed:", error);
        alert("Authentication error: " + error.message);
        signOut();
      }
    });
  });


  async function verifyUserSession() {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.log("No authenticated user");
        return false;
      }
  
      // Get fresh user data from database
      const snapshot = await db.ref(`users/${user.uid}`).once('value');
      const userData = snapshot.val();
      
      if (!userData) {
        console.error("User data not found in database");
        return false;
      }
  
      // Check if user has the correct role
      if (userData.role !== "manager") {
        console.error("User role mismatch:", userData.role);
        return false;
      }
  
      // Store minimal required data
      localStorage.setItem("userRole", userData.role);
      localStorage.setItem("userId", user.uid);
      currentUser = user;
  
      return true;
    } catch (error) {
      console.error("Session verification failed:", error);
      return false;
    }
  }

  async function initializeManagerDashboard() {
    // Add branch name display if not exists
    const header = document.querySelector("header");
    if (header && !document.getElementById("branch-name")) {
      header.insertAdjacentHTML("beforeend", '<div id="branch-name" style="margin-left: auto; padding: 0 20px;"></div>');
    }
  
    const isAuthenticated = await verifyUserSession();
    if (!isAuthenticated) {
      signOut();
      return;
    }
  
    // Only proceed if we have a valid session
    showPage("dashboard");
  }
  


//TODO: sa admin view, specify which account (or branch) to edit details na nasa dropdown list. nothing will show up unless the admin selects an account (categorized by branches)
//TODO: dun sa inventory management, change it to something not tedious (ung hindi dialog boxes per property)

/**
 * Shows a specific page in the manager dashboard and loads its content.
 * 
 * @param {string} pageId - The ID of the page to display (e.g., "dashboard", "inventory")
 */
function showPage(pageId) {
    document.querySelectorAll(".page").forEach(page => page.classList.remove("active"));
    document.querySelectorAll(".nav-list a").forEach(link => link.classList.remove("active"));
    document.getElementById(`page-${pageId}`).classList.add("active");
    document.getElementById(`nav-${pageId}`).classList.add("active");
    document.getElementById("page-title").textContent = pageId.charAt(0).toUpperCase() + pageId.slice(1).replace("-", " ");
  
    if (pageId === "inventory") loadInventoryPage();
    if (pageId === "dashboard") loadDashboardPage();
    if (pageId === "supplier") loadSupplierPage();
  }
  
  function loadDashboardPage() {
    const page = document.getElementById("page-dashboard");
    
    if (!page) {
        console.error("Dashboard page element not found");
        return;
    }

    // First completely set up the dashboard structure
    page.innerHTML = `
        <div class="dashboard-content">
            <h2>${currentBranch ? currentBranch + " Dashboard" : "Dashboard"}</h2>
            <div id="dashboard-metrics" class="metrics-container">
                <div class="loading-spinner">
                    <i class="fas fa-spinner fa-spin"></i> Loading metrics...
                </div>
            </div>
        </div>
    `;

    // Now we can safely get the metrics container
    const metrics = document.getElementById("dashboard-metrics");
    
    if (!currentBranch) {
        metrics.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p>No branch assigned to your account. Please contact admin.</p>
            </div>
        `;
        return;
    }

    // Show loading state
    metrics.innerHTML = `
        <div class="loading-spinner">
            <i class="fas fa-spinner fa-spin"></i> Loading branch data...
        </div>
    `;

    Promise.all([
        db.ref(`branch_inventory/${currentBranch}`).once("value"),
        db.ref(`branch_orders/${currentBranch}`).once("value"),
        db.ref(`branch_suppliers/${currentBranch}`).once("value"),
    ])
    .then(([inventorySnap, ordersSnap, suppliersSnap]) => {
        // [Previous data processing code remains the same...]
        
        // Build the dashboard HTML
        metrics.innerHTML = `
            <div class="metric-grid">
                <!-- Metric cards go here (same as before) -->
            </div>
        `;
    })
    .catch((error) => {
        console.error("Error loading dashboard metrics:", error);
        metrics.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                <p>Failed to load dashboard data</p>
                <p class="error-detail">${error.message}</p>
                <button class="retry-btn" onclick="loadDashboardPage()">
                    <i class="fas fa-sync-alt"></i> Try Again
                </button>
            </div>
        `;
    });
}

/**
 * Loads the manager's assigned branch from Firebase
 */
async function loadManagerBranch() {
    try {
      const userData = await getCurrentUserData();
      
      if (!userData?.dbData) {
        throw new Error("User data not found in database");
      }
  
      // Ensure the user has a branch assigned
      if (!userData.dbData.branchId) {
        console.error("Manager has no branch assigned:", userData.authData.email);
        throw new Error("No branch assigned to your account. Contact admin.");
      }
  
      currentBranch = userData.dbData.branchId;
      currentUser = userData.authData;
  
      // Load branch details (name, location, etc.)
      const branchSnapshot = await db.ref(`branches/${currentBranch}`).once('value');
      const branchData = branchSnapshot.val();
  
      if (!branchData) {
        throw new Error("Branch data not found");
      }
  
      // Update UI with branch name
      const branchNameElement = document.getElementById("branch-name");
      if (branchNameElement) {
        branchNameElement.textContent = branchData.name || "Unnamed Branch";
      }
  
      return true; // Success
    } catch (error) {
      console.error("loadManagerBranch failed:", error.message);
      alert(`Error: ${error.message}`); // Show specific error
      signOut(); // Force logout on failure
      return false;
    }
  }


/* ============================================= */
/* ============ INVENTORY SECTION ============== */
/* ============================================= */


/**
 * Loads the inventory page content from Firebase.
 * Sets up event listeners for searching inventory items.
 * Falls back to default data if Firebase retrieval fails.
 */
function loadInventoryPage() {
    const page = document.getElementById("page-inventory");
    
    // Set up the page structure
    page.innerHTML = `
      <div class="inventory-header">
        <h2>Inventory Management</h2>
        <div class="inventory-controls">
          <div class="search-container">
            <input type="text" id="inventorySearch" placeholder="Search inventory...">
            <i class="fas fa-search"></i>
          </div>
          <button class="add-item-btn" onclick="addItem()">
            <i class="fas fa-plus"></i> Add Item
          </button>
        </div>
      </div>
      <div id="inventoryList"></div>
    `;
  
    if (!currentBranch) {
      page.innerHTML += "<p>Error: No branch assigned to your account. Please contact admin.</p>";
      return;
    }
  
    const inventoryList = document.getElementById("inventoryList");
    const searchInput = document.getElementById("inventorySearch");
    let inventoryData = [];
  
    console.log("Attempting to load inventory from Firebase...");
  
    db.ref(`branch_inventory/${currentBranch}`)
      .once("value")
      .then((branchSnap) => {
        inventoryData = [];
        const branchItems = branchSnap.val() || {};
  
        // Process branch-specific data
        Object.keys(branchItems).forEach((id) => {
          const branchItem = branchItems[id] || {};
  
          const mergedItem = {
            ...branchItem,
            id: id,
            supplier: branchItem.supplier || "Unknown",
            expiration: normalizeDate(branchItem.expiration),
            image: branchItem.image || "../images/default.png",
          };
  
          inventoryData.push(mergedItem);
        });
  
        console.log("Processed inventory data:", inventoryData);
  
        if (inventoryData.length > 0) {
          renderInventory(inventoryData, inventoryList, searchInput.value);
        } else {
          console.warn("No inventory data found for this branch. Using fallback data.");
          const fallbackData = getFallbackInventoryData();
          renderInventory(inventoryData, inventoryList, searchInput.value);
        }
      })
      .catch((error) => {
        console.error("Error fetching inventory data:", error.message);
        inventoryList.innerHTML = `<p>Error loading data: ${error.message}. Using fallback data.</p>`;
        const fallbackData = getFallbackInventoryData();
        renderInventory(inventoryData, inventoryList, searchInput.value);
      });
  
    searchInput.addEventListener("input", () =>
      renderInventory(inventoryData, inventoryList, searchInput.value)
    );
  }
  
  // Helper function for fallback data
  function getFallbackInventoryData() {
    return [
      {
        id: "item1",
        name: "Adobo (Chicken)",
        stock: 40,
        minStock: 10,
        supplier: "supplier1",
        expiration: "2025-10-31",
        image: "../images/adobo.jpg",
      },
      {
        id: "item2",
        name: "Bagnet (Ilocano)",
        stock: 20,
        minStock: 5,
        supplier: "supplier2",
        expiration: "2024-11-04",
        image: "../images/bagnet.jpg",
      },
      {
        id: "item3",
        name: "Banana Cue",
        stock: 50,
        minStock: 15,
        supplier: "supplier3",
        expiration: "2024-11-04",
        image: "../images/banana-cue.jpg",
      },
    ];
  }
  
  /**
   * Renders inventory items to the UI based on the provided data.
   * @param {Array} data - Array of inventory items to render
   * @param {HTMLElement} inventoryList - DOM element to render inventory items into
   * @param {string} searchTerm - Optional search term to filter items
   */
  function renderInventory(data, inventoryList, searchTerm = "") {
    console.log("Rendering inventory with data:", data);
  
    // Filter data based on search term
    let filteredData = data.filter(
      (item) =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.description || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.supplier || "").toLowerCase().includes(searchTerm.toLowerCase())
    );
  
    const currentDate = new Date();
    inventoryList.innerHTML = "";
  
    if (filteredData.length === 0) {
      inventoryList.innerHTML = "<p>No items match the search criteria.</p>";
      return;
    }
  
    // Create a composite key using both name and supplier to ensure uniqueness
    const groupedItems = {};
    filteredData.forEach((item) => {
      const compositeKey = `${item.name}-${item.supplier || "Unknown"}`;
      if (!groupedItems[compositeKey]) {
        groupedItems[compositeKey] = item;
      }
    });
  
    // Convert back to array of unique items
    const uniqueItems = Object.values(groupedItems);
  
    // Separate items into categories (preserving your low stock and expired alerts)
    const lowStockItems = uniqueItems.filter(
      (item) => item.stock <= (item.minStock || 0)
    );
    const expiredItems = uniqueItems.filter((item) => {
      const expDate = new Date(item.expiration);
      return !isNaN(expDate) && expDate < currentDate;
    });
    const normalItems = uniqueItems.filter(
      (item) =>
        item.stock > (item.minStock || 0) &&
        (!item.expiration || new Date(item.expiration) >= currentDate)
    );
  
    // Create main inventory container with grid layout
    const inventoryContainer = document.createElement("div");
    inventoryContainer.className = "inventory-grid-container";
    inventoryList.appendChild(inventoryContainer);
  
    // Render Low Stock Alerts (First Row)
    if (lowStockItems.length > 0) {
      const lowStockSection = document.createElement("div");
      lowStockSection.className = "inventory-section low-stock-section";
  
      const lowStockHeader = document.createElement("h4");
      lowStockHeader.className = "sub-header low-stock";
      lowStockHeader.textContent = "Low Stock Alerts";
      lowStockSection.appendChild(lowStockHeader);
  
      renderItemList(lowStockItems, lowStockSection, true, false);
  
      inventoryContainer.appendChild(lowStockSection);
    }
  
    // Render Expired Items (Second Row)
    if (expiredItems.length > 0) {
      const expiredSection = document.createElement("div");
      expiredSection.className = "inventory-section expired-section";
  
      const expiredHeader = document.createElement("h4");
      expiredHeader.className = "sub-header expired";
      expiredHeader.textContent = "Expired Items";
      expiredSection.appendChild(expiredHeader);
  
      renderItemList(expiredItems, expiredSection, false, true);
  
      inventoryContainer.appendChild(expiredSection);
    }
  
    // Render Normal Stock Items (Third Row)
    if (normalItems.length > 0) {
      const normalSection = document.createElement("div");
      normalSection.className = "inventory-section normal-section";
  
      const normalHeader = document.createElement("h4");
      normalHeader.className = "sub-header normal";
      normalHeader.textContent = "All Stock Items";
      normalSection.appendChild(normalHeader);
  
      renderItemList(normalItems, normalSection, false, false);
  
      inventoryContainer.appendChild(normalSection);
    }
  }
  
  // Helper function to render item lists
  function renderItemList(items, container, isLowStock, isExpired) {
    const gridContainer = document.createElement("div");
    gridContainer.className = "inventory-row inventory-normal-grid";
    container.appendChild(gridContainer);
  
    items.forEach((item) => {
      const formattedExpiration = formatDisplayDate(item.expiration);
      const imageSrc = item.image || "../images/default.png";
  
      const itemElement = document.createElement("div");
      itemElement.className = `inventory-item-card ${
        isLowStock ? "low-stock" : ""
      } ${isExpired ? "expired" : ""}`;
      itemElement.innerHTML = `
        <img src="${imageSrc}" alt="${item.name}" class="inventory-item-image"
             onerror="this.src='../images/default.png'">
        <div class="inventory-item-details">
            <div class="inventory-item-name">${item.name} ${
        isExpired ? "(Expired)" : ""
      }</div>
            <div class="inventory-item-description">${
              item.description || "No description"
            }</div>
            <div class="inventory-item-stock">
                <span>Supplier: ${item.supplier || "Unknown"}</span>
                <span>Quantity: ${item.stock} kg</span>
                ${
                  item.minStock
                    ? `<span>Min Stock: ${item.minStock} kg</span>`
                    : ""
                }
                <span>Expiration: ${formattedExpiration}</span>
            </div>
        </div>
        <div class="inventory-item-actions">
            <button class="view" onclick="showItemDetails('${
              item.id
            }')">View</button>
            <button class="delete" onclick="if(confirm('Are you sure you want to delete this item?')) { deleteItem('${
              item.id
            }') }">Delete</button>
        </div>
      `;
      gridContainer.appendChild(itemElement);
    });
  }
  
  // Helper function to normalize date format
  function normalizeDate(dateString) {
    if (!dateString) return "";
    // If already in YYYY-MM-DD format, return as-is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return dateString;
    
    // Try to parse other formats
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";
    
    return date.toISOString().split('T')[0];
  }
  
  // Helper function to format date for display
  function formatDisplayDate(dateString) {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Invalid date";
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  /**
 * Shows detailed information about a specific inventory item including order history
 * @param {string} itemId - The unique identifier of the inventory item
 */
  function showItemDetails(itemId) {
    // Get item details
    db.ref(`branch_inventory/${currentBranch}/${itemId}`)
      .once('value')
      .then((itemSnap) => {
        const item = itemSnap.val() || {};
        item.id = itemId;
  
        // Create or update the modal
        let detailsModal = document.getElementById('itemDetailsModal');
        let detailsContent = document.getElementById('itemDetailsContent');
  
        if (!detailsModal) {
          const modalHTML = `
            <div id="itemDetailsModal" class="modal">
              <div class="modal-content">
                <span class="close-button">&times;</span>
                <div id="itemDetailsContent"></div>
              </div>
            </div>
          `;
          document.body.insertAdjacentHTML('beforeend', modalHTML);
          detailsModal = document.getElementById('itemDetailsModal');
          detailsContent = document.getElementById('itemDetailsContent');
        }
  
        // Set up modal closing behavior
        const closeButton = detailsModal.querySelector('.close-button');
        closeButton.onclick = () => (detailsModal.style.display = 'none');
        detailsModal.onclick = (event) => {
          if (event.target === detailsModal) {
            detailsModal.style.display = 'none';
          }
        };
        detailsModal.querySelector('.modal-content').onclick = (event) => {
          event.stopPropagation();
        };
  
        // Define switching functions
        window.switchToEditMode = function() {
          detailsContent.innerHTML = createEditMode(item);
        };
  
        window.switchToViewMode = function() {
          // Refresh the data before showing view mode
          showItemDetails(itemId);
        };
  
        // Render view mode
        detailsContent.innerHTML = createViewMode(item);
        detailsModal.style.display = 'block';
      })
      .catch((error) => {
        console.error('Error loading item details:', error);
        alert('Error loading item details. Please try again.');
      });
  }
  
  /**
   * Creates HTML for viewing item details including order history
   * @param {Object} item - The item object
   * @param {Array} orders - Array of order history for this item
   * @param {number} totalOrdered - Total quantity ordered
   * @param {number} totalSpent - Total amount spent on this item
   * @returns {string} HTML string for view mode
   */
  function createViewMode(item, orders = [], totalOrdered = 0, totalSpent = 0) {
    const formattedExpiration = formatDisplayDate(item.expiration);
  
    let sourceOrderInfo = "";
    if (item.sourceOrderId) {
      sourceOrderInfo = `<p><strong>Source Order:</strong> ${item.sourceOrderId}</p>`;
    }
  
    let orderHistoryHTML = `
      <div class="order-history-section">
        <h4>Order History</h4>
        <div class="order-history-summary">
          <p><strong>Total Ordered:</strong> ${totalOrdered} kg</p>
          <p><strong>Total Spent:</strong> ${totalSpent.toFixed(2)} PHP</p>
        </div>
        <table class="order-history-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Date</th>
              <th>Quantity</th>
              <th>Unit Price</th>
              <th>Total</th>
              <th>Supplier</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>`;
  
    // Add each order to the table
    orders.forEach((order) => {
      orderHistoryHTML += `
        <tr>
          <td>${order.orderId}</td>
          <td>${formatDisplayDate(order.date)}</td>
          <td>${order.quantity} kg</td>
          <td>${order.unitPrice ? order.unitPrice.toFixed(2) + " PHP" : "N/A"}</td>
          <td>${order.total ? order.total.toFixed(2) + " PHP" : "N/A"}</td>
          <td>${order.supplier}</td>
          <td class="status-${order.status.toLowerCase()}">${order.status}</td>
        </tr>`;
    });
  
    orderHistoryHTML += `
          </tbody>
        </table>
      </div>`;
  
    return `
      <div class="item-details-container">
        <div class="item-main-details">
          <h3>${item.name}</h3>
          <div class="item-image">
            <img src="${item.image || "../images/default.png"}" alt="${item.name}">
          </div>
          <div class="item-info">
            <p><strong>Description:</strong> ${item.description || "N/A"}</p>
            ${sourceOrderInfo}
            <p><strong>Current Stock:</strong> ${item.stock} kg</p>
            <p><strong>Minimum Stock:</strong> ${item.minStock || "N/A"} kg</p>
            <p><strong>Supplier:</strong> ${item.supplier || "Unknown"}</p>
            <p><strong>Expiration Date:</strong> ${formattedExpiration}</p>
          </div>
        </div>
        ${orderHistoryHTML}
        <div class="item-actions">
          <button onclick="switchToEditMode('${item.id}')">Edit</button>
          <button onclick="document.getElementById('itemDetailsModal').style.display='none'">Close</button>
        </div>
      </div>
    `;
  }
  
  /**
   * Creates HTML for editing item details
   * @param {Object} item - The item object to base the form on
   * @returns {string} HTML string for edit mode
   */
  function createEditMode(item) {
    return `
      <h3>Edit ${item.name}</h3>
      <form onsubmit="saveItemDetails('${item.id}'); return false;">
        <div class="form-group">
          <label for="edit-name">Product Name:</label>
          <input type="text" id="edit-name" value="${item.name || ''}" required>
        </div>
        <div class="form-group">
          <label for="edit-description">Description:</label>
          <textarea id="edit-description">${item.description || ''}</textarea>
        </div>
        <div class="form-group">
          <label for="edit-stock">Current Stock (kg):</label>
          <input type="number" id="edit-stock" value="${item.stock || 0}" min="0" required>
        </div>
        <div class="form-group">
          <label for="edit-minStock">Minimum Stock (kg):</label>
          <input type="number" id="edit-minStock" value="${item.minStock || 0}" min="0" required>
        </div>
        <div class="form-group">
          <label for="edit-supplier">Supplier:</label>
          <input type="text" id="edit-supplier" value="${item.supplier || ''}">
        </div>
        <div class="form-group">
          <label for="edit-expiration">Expiration Date:</label>
          <input type="date" id="edit-expiration" value="${item.expiration || ''}" required>
        </div>
        <div class="form-group">
          <label for="edit-image">Product Image:</label>
          <input type="file" id="edit-image" accept="image/*">
          <small>Leave empty to keep current image</small>
          <div id="editImagePreview" style="margin-top: 10px;">
            ${item.image ? `<img src="${item.image}" style="max-width: 200px; max-height: 200px;">` : ''}
          </div>
        </div>
        <div class="form-actions">
          <button type="submit">Save</button>
          <button type="button" onclick="switchToViewMode('${item.id}')">Cancel</button>
        </div>
      </form>
      <script>
        document.getElementById('edit-image').addEventListener('change', function(e) {
          const file = e.target.files[0];
          if (file) {
            // Validate file size (max 1MB)
            if (file.size > 1024 * 1024) {
              alert('Image size should be less than 1MB');
              this.value = ''; // Clear the file input
              return;
            }
            
            const reader = new FileReader();
            reader.onload = function(event) {
              const preview = document.getElementById('editImagePreview');
              preview.innerHTML = '<img src="' + event.target.result + '" style="max-width: 200px; max-height: 200px;">';
            };
            reader.readAsDataURL(file);
          }
        });
      </script>
    `;
  }
  
  /**
   * Saves the updated item details to the database, using the given item ID.
   * @param {string} itemId - The ID of the item to update
   */
  async function saveItemDetails(itemId) {
    // Collect values from input fields
    const newName = document.getElementById('edit-name').value;
    const newDescription = document.getElementById('edit-description').value;
    const newStock = parseInt(document.getElementById('edit-stock').value);
    const newMinStock = parseInt(document.getElementById('edit-minStock').value);
    const newSupplier = document.getElementById('edit-supplier').value;
    const newExpiration = document.getElementById('edit-expiration').value;
    const imageFile = document.getElementById('edit-image').files[0];
  
    // Validate inputs
    if (!newName || isNaN(newStock) || isNaN(newMinStock) || !newExpiration) {
      alert('Please fill in all required fields with valid data.');
      return;
    }
  
    // Prepare update data
    const updateData = {
      name: newName,
      description: newDescription,
      stock: newStock,
      minStock: newMinStock,
      supplier: newSupplier,
      expiration: newExpiration
    };
  
    try {
      // If an image file was uploaded, convert to Base64
      if (imageFile) {
        updateData.image = await convertImageToBase64(imageFile);
      } else {
        // Use the existing image if available
        const existingImage = document.getElementById('editImagePreview').querySelector('img');
        if (!existingImage) {
          // If no existing image and no new image uploaded, use default
          updateData.image = '../images/default.png';
        }
      }
  
      // Update the item in Firebase
      await db.ref(`branch_inventory/${currentBranch}/${itemId}`).update(updateData);
      
      console.log('Item updated successfully!');
      // Switch back to view mode
      switchToViewMode(itemId);
    } catch (error) {
      console.error('Error updating item:', error.message);
      alert('Error updating item: ' + error.message);
    }
  }
  
  // Helper function to convert image to Base64
  function convertImageToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  }
  
  /**
   * Adds a new inventory item to the database.
   * Prompts user for item details and saves to Firebase.
   */
  function addItem() {
    if (!currentBranch) {
      alert("No branch assigned to your account. Please contact admin.");
      return;
    }
  
    const itemName = prompt("Enter item name:");
    if (!itemName) return;
  
    const itemStock = prompt("Enter initial stock:");
    if (!itemStock) return;
  
    const itemMinStock = prompt("Enter minimum stock level:");
    if (!itemMinStock) return;
  
    const itemSupplier = prompt("Enter supplier name:");
    if (!itemSupplier) return;
  
    const itemExpiration = prompt("Enter expiration date (YYYY-MM-DD):");
    if (!itemExpiration) return;
  
    const newItem = {
      name: itemName,
      stock: parseInt(itemStock),
      minStock: parseInt(itemMinStock),
      supplier: itemSupplier,
      expiration: itemExpiration,
      timestamp: firebase.database.ServerValue.TIMESTAMP
    };
  
    // Push the new item to Firebase
    db.ref(`branch_inventory/${currentBranch}`).push(newItem)
      .then(() => {
        console.log("Item added successfully");
        loadInventoryPage(); // Refresh the inventory view
      })
      .catch((error) => {
        console.error("Error adding item:", error);
        alert("Error adding item: " + error.message);
      });
  }
  
  /**
   * Deletes an inventory item after confirmation
   * @param {string} itemId - The ID of the item to delete
   */
  function deleteItem(itemId) {
    if (!confirm("Are you sure you want to delete this item? This action cannot be undone.")) {
      return;
    }
  
    // Show loading indicator
    const deleteButton = document.querySelector(
      `button.delete[onclick="deleteItem('${itemId}')"]`
    );
    if (deleteButton) {
      deleteButton.disabled = true;
      deleteButton.textContent = "Deleting...";
    }
  
    db.ref(`branch_inventory/${currentBranch}/${itemId}`)
      .remove()
      .then(() => {
        console.log("Item deleted successfully");
        // Refresh the inventory view
        loadInventoryPage();
      })
      .catch((error) => {
        console.error("Error deleting item:", error);
        alert("Error deleting item: " + error.message);
        if (deleteButton) {
          deleteButton.disabled = false;
          deleteButton.textContent = "Delete";
        }
      });
  }

/**
 * Adjusts the stock amount of an inventory item.
 * Prompts the user for the new stock amount, then updates the item's stock field in Firebase.
 * 
 * @param {string} id - The ID of the item to adjust
 * @param {number} currentStock - The current stock amount of the item
 */
function adjustStock(id, currentStock) {
    const newStock = prompt("New Stock Amount:", currentStock);
    if (newStock) {
      db.ref(`branch_inventory/${currentBranch}/${id}`).update({ 
        stock: parseInt(newStock) 
      });
    }
  }



/* ============================================= */
/* ============ SUPPLIER SECTION =============== */
/* ============================================= */

let currentEditingSupplierId = null;

/**
 * Shows the supplier page and loads supplier data
 */
function loadSupplierPage() {
  const page = document.getElementById("page-supplier");
  
  // Set up the page structure
  page.innerHTML = `
    <div class="supplier-header">
      <h2>Supplier Management</h2>
      <button class="add-supplier-btn" onclick="addSupplier()">
        <i class="fas fa-plus"></i> Add Supplier
      </button>
    </div>
    <div id="supplierList"></div>
  `;

  if (!currentBranch) {
    page.innerHTML += "<p>Error: No branch assigned to your account. Please contact admin.</p>";
    return;
  }

  const supplierList = document.getElementById("supplierList");
  supplierList.innerHTML = "<p>Loading suppliers...</p>";

  db.ref(`branch_suppliers/${currentBranch}`)
    .once("value")
    .then((branchSnap) => {
      supplierList.innerHTML = "";

      if (branchSnap.exists()) {
        branchSnap.forEach((child) => {
          const supplier = child.val();
          supplier.id = child.key;

          const div = document.createElement("div");
          div.className = "supplier-item";

          // Create product list HTML
          let productsHtml = "";
          if (supplier.products) {
            if (typeof supplier.products === "string") {
              // Legacy format (comma-separated string)
              productsHtml = supplier.products.split(",")
                .map(product => `<li>${product.trim()}</li>`)
                .join("");
            } else {
              // New format (object with prices)
              productsHtml = Object.entries(supplier.products)
                .map(([productName, productData]) => {
                  // Handle different data formats
                  let price = '';
                  if (typeof productData === 'object') {
                    price = productData.price || productData.quantity || 'N/A';
                  } else {
                    price = productData;
                  }
                  return `<li>${productName} - ${parseFloat(price).toFixed(2)} PHP per kg</li>`;
                })
                .join("");
            }
          } else {
            productsHtml = "<li>N/A</li>";
          }

          div.innerHTML = `
            <div class="supplier-details">
              <strong>${supplier.name}</strong><br><br>
              <strong>Contact:</strong> ${supplier.contact || "N/A"}<br>
              <strong>GCash:</strong> ${supplier.gcash || "N/A"}<br>
              ${
                supplier.gcashQR
                  ? `<img src="${supplier.gcashQR}" style="max-width: 100px; display: block; margin: 5px 0;">`
                  : ""
              }
              <div class="products-container">
                <strong>Products:</strong>
                <ul class="products-list">
                  ${productsHtml}
                </ul>
              </div>
            </div>
            <div class="supplier-actions">
              <button onclick="editSupplier('${supplier.id}')">Edit</button>
              <button onclick="deleteSupplier('${supplier.id}')">Delete</button>
            </div>
          `;
          supplierList.appendChild(div);
        });
      } else {
        supplierList.innerHTML = "<p>No suppliers found for this branch. Add a supplier to start.</p>";
      }
    })
    .catch((error) => {
      console.error("Error loading suppliers:", error.message);
      supplierList.innerHTML = `<p>Error loading suppliers: ${error.message}</p>`;
    });
}

/**
 * Adds a new supplier to the database.
 * Prompts user for supplier details and saves to Firebase.
 */
function addSupplier() {
  currentEditingSupplierId = null;

  // Create modal if it doesn't exist
  if (!document.getElementById("supplierModal")) {
    createSupplierModal();
  }

  // Reset form and show modal
  document.getElementById("supplierModalTitle").textContent = "Add New Supplier";
  document.getElementById("saveSupplierBtn").textContent = "Save Supplier";
  document.getElementById("supplierForm").reset();
  document.getElementById("supplierModal").style.display = "block";
  document.getElementById("supplierName").focus();
}

/**
 * Edits an existing supplier in the database.
 * @param {string} supplierId - The ID of the supplier to edit
 */
function editSupplier(supplierId) {
  currentEditingSupplierId = supplierId;

  if (!document.getElementById("supplierModal")) {
    createSupplierModal();
  }

  db.ref(`branch_suppliers/${currentBranch}/${supplierId}`)
    .once("value")
    .then((snapshot) => {
      const supplier = snapshot.val();

      document.getElementById("supplierName").value = supplier.name || "";
      document.getElementById("supplierContact").value = supplier.contact || "";
      document.getElementById("supplierGCash").value = supplier.gcash || "";

      // Clear existing product entries
      document.getElementById("productEntries").innerHTML = "";

      // Add product entries
      if (supplier.products) {
        if (typeof supplier.products === "string") {
          // Legacy format (comma-separated string)
          const productNames = supplier.products.split(",").map((p) => p.trim());
          productNames.forEach((name) => {
            if (name) addProductEntry(name, "");
          });
        } else {
          // New format (object with prices)
          for (const [productName, productData] of Object.entries(supplier.products)) {
            addProductEntry(productName, productData.price);
          }
        }
      } else {
        // Add one empty product entry by default
        addProductEntry();
      }

      // Show existing QR code if available
      if (supplier.gcashQR) {
        document.getElementById("qrCodePreview").innerHTML = `<img src="${supplier.gcashQR}" style="max-width: 200px;">`;
      }

      document.getElementById("supplierModalTitle").textContent = "Edit Supplier";
      document.getElementById("saveSupplierBtn").textContent = "Update Supplier";
      document.getElementById("supplierModal").style.display = "block";
    })
    .catch((error) => {
      console.error("Error loading supplier for editing:", error);
      alert("Failed to load supplier data for editing.");
    });
}

/**
 * Deletes a supplier after confirmation
 * @param {string} id - The ID of the supplier to delete
 */
function deleteSupplier(id) {
  if (confirm("Are you sure you want to delete this supplier?")) {
    db.ref(`branch_suppliers/${currentBranch}/${id}`)
      .remove()
      .then(() => {
        console.log("Supplier deleted successfully");
        loadSupplierPage();
      })
      .catch((error) => {
        console.error("Error deleting supplier:", error);
        alert("Failed to delete supplier. Please try again.");
      });
  }
}

/**
 * Creates the supplier modal for adding/editing suppliers
 */
function createSupplierModal() {
  const modalHTML = `
    <div id="supplierModal" class="modal">
      <div class="modal-content">
        <span class="close-supplier-modal">&times;</span>
        <h2 id="supplierModalTitle">Add New Supplier</h2>
        <form id="supplierForm">
          <div class="form-group">
            <label for="supplierName">Supplier Name:</label>
            <input type="text" id="supplierName" required>
          </div>
          <div class="form-group">
            <label for="supplierContact">Contact Info:</label>
            <input type="text" id="supplierContact" required>
          </div>
          <div class="form-group">
            <label for="supplierGCash">GCash Number:</label>
            <input type="text" id="supplierGCash" required>
          </div>
          <div class="form-group">
            <label>Products:</label>
            <div id="productEntries">
              <!-- Product entries will be added here -->
            </div>
            <button type="button" id="addProductBtn">Add Product</button>
          </div>
          <div class="form-group">
            <label for="supplierQRCode">GCash QR Code:</label>
            <input type="file" id="supplierQRCode" accept="image/*">
            <div id="qrCodePreview" style="margin-top: 10px;"></div>
          </div>
          <div class="form-actions">
            <button type="submit" id="saveSupplierBtn">Save Supplier</button>
            <button type="button" id="cancelSupplier">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", modalHTML);

  // Add event listener for adding products
  document.getElementById("addProductBtn").addEventListener("click", addProductEntry);

  // Add event listener for QR code preview
  document.getElementById("supplierQRCode").addEventListener("change", function(e) {
    previewQRCode(e);
  });

  // Add event listeners
  document.querySelector(".close-supplier-modal").addEventListener("click", closeSupplierModal);
  document.getElementById("cancelSupplier").addEventListener("click", closeSupplierModal);
  document.getElementById("supplierForm").addEventListener("submit", handleSupplierSubmit);

  // Close modal when clicking outside
  document.getElementById("supplierModal").addEventListener("click", function(e) {
    if (e.target === this) {
      closeSupplierModal();
    }
  });
}

/**
 * Adds a product entry to the supplier form
 * @param {string} productName - The name of the product
 * @param {string} price - The price of the product
 */
function addProductEntry(productName = "", price = "") {
  const productEntries = document.getElementById("productEntries");
  const productId = Date.now(); // Unique ID for each product entry

  const productEntry = document.createElement("div");
  productEntry.className = "product-entry";
  productEntry.innerHTML = `
    <div class="product-inputs">
      <input type="text" placeholder="Product name" value="${productName}" class="product-name" required>
      <div class="price-input-container">
        <span class="currency-symbol">PHP</span>
        <input type="number" placeholder="0.00" value="${price}" class="product-price" min="0" step="0.01" required>
      </div>
      <span class="unit-label">per kg</span>
      <button type="button" class="remove-product" data-id="${productId}">×</button>
    </div>
  `;

  productEntries.appendChild(productEntry);

  // Add event listener for remove button
  productEntry.querySelector(".remove-product").addEventListener("click", function() {
    productEntries.removeChild(productEntry);
  });
}

/**
 * Closes the supplier modal
 */
function closeSupplierModal() {
  document.getElementById("supplierModal").style.display = "none";
  document.getElementById("supplierForm").reset();
  document.getElementById("supplierModalTitle").textContent = "Add New Supplier";
  document.getElementById("saveSupplierBtn").textContent = "Save Supplier";
  currentEditingSupplierId = null;
}

/**
 * Handles the submission of the supplier form
 * @param {Event} e - The form submission event
 */
async function handleSupplierSubmit(e) {
  e.preventDefault();

  const name = document.getElementById("supplierName").value.trim();
  const contact = document.getElementById("supplierContact").value.trim();
  const gcash = document.getElementById("supplierGCash").value.trim();
  const qrCodeFile = document.getElementById("supplierQRCode").files[0];

  if (!name || !contact || !gcash) {
    alert("Please fill in all required fields.");
    return;
  }

  if (!currentBranch) {
    alert("No branch assigned to your account. Please contact admin.");
    return;
  }

  // Collect product data
  const productEntries = document.querySelectorAll(".product-entry");
  const products = {};

  let hasEmptyProducts = false;
  productEntries.forEach((entry) => {
    const name = entry.querySelector(".product-name").value.trim();
    const price = parseFloat(entry.querySelector(".product-price").value);

    if (!name || isNaN(price)) {
      hasEmptyProducts = true;
      return;
    }

    products[name] = {
      price: price,
      unit: "kg" // Always use kg as the unit
    };
  });

  if (hasEmptyProducts || productEntries.length === 0) {
    alert("Please fill in all product fields and add at least one product.");
    return;
  }

  const saveBtn = document.getElementById("saveSupplierBtn");
  saveBtn.disabled = true;
  saveBtn.textContent = currentEditingSupplierId ? "Updating..." : "Saving...";

  try {
    let qrCodeBase64 = null;

    if (qrCodeFile) {
      // Validate file size (max 1MB)
      if (qrCodeFile.size > 1024 * 1024) {
        alert("Image size should be less than 1MB");
        return;
      }
      qrCodeBase64 = await convertImageToBase64(qrCodeFile);
    } else if (currentEditingSupplierId) {
      // Keep existing QR code if no new one was uploaded
      const snapshot = await db.ref(`branch_suppliers/${currentBranch}/${currentEditingSupplierId}/gcashQR`).once("value");
      qrCodeBase64 = snapshot.val();
    }

    const supplierData = {
      name,
      contact,
      gcash,
      products,
      updatedAt: firebase.database.ServerValue.TIMESTAMP,
    };

    if (qrCodeBase64) {
      supplierData.gcashQR = qrCodeBase64;
    }

    if (currentEditingSupplierId) {
      await db.ref(`branch_suppliers/${currentBranch}/${currentEditingSupplierId}`).update(supplierData);
      console.log("Supplier updated successfully");
    } else {
      const newSupplierId = await getNextSupplierId(currentBranch);
      await db.ref(`branch_suppliers/${currentBranch}/${newSupplierId}`).set(supplierData);
      console.log("Supplier added successfully with ID:", newSupplierId);
    }

    closeSupplierModal();
    loadSupplierPage();
  } catch (error) {
    console.error("Error saving supplier:", error.message);
    alert("Error saving supplier: " + error.message);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = currentEditingSupplierId ? "Update Supplier" : "Save Supplier";
  }
}

/**
 * Generates the next supplier ID
 * @param {string} branchId - The branch ID
 * @returns {Promise<string>} The next supplier ID
 */
async function getNextSupplierId(branchId) {
  const snapshot = await db.ref(`branch_suppliers/${branchId}`).once("value");
  const suppliers = snapshot.val() || {};

  // Extract all supplier IDs
  const supplierIds = Object.keys(suppliers);

  // Find the highest existing number
  let maxNumber = 0;
  supplierIds.forEach((id) => {
    const match = id.match(/^supplier(\d+)$/);
    if (match) {
      const num = parseInt(match[1]);
      if (num > maxNumber) maxNumber = num;
    }
  });

  return `supplier${maxNumber + 1}`;
}

/**
 * Previews the selected QR code image
 * @param {Event} event - The file input change event
 */
function previewQRCode(event) {
  const file = event.target.files[0];
  const preview = document.getElementById("qrCodePreview");

  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      preview.innerHTML = `<img src="${e.target.result}" style="max-width: 200px;">`;
    };
    reader.readAsDataURL(file);
  } else {
    preview.innerHTML = "";
  }
}