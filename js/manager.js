/**
 * Firebase configuration object containing necessary credentials and settings
 * to connect to the Firebase backend for the Frozen Filipino Food Inventory app.
 */
const firebaseConfig = {
  apiKey: "AIzaSyCqRgwfenGMbnj_rclROcQwlj6LFRxaEac",
  authDomain: "frozenfilipinofoodinventory.firebaseapp.com",
  databaseURL:
    "https://frozenfilipinofoodinventory-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "frozenfilipinofoodinventory",
  storageBucket: "frozenfilipinofoodinventory.firebasestorage.app",
  messagingSenderId: "755457069655",
  appId: "1:755457069655:web:bccc922d8633e028a00912",
  measurementId: "G-PRQ73N6GGF",
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
        const snapshot = await db.ref(`users/${user.uid}`).once("value");
        const userData = snapshot.val();

        if (!userData) {
          reject(new Error("User data not found"));
          return;
        }

        resolve({
          authData: {
            uid: user.uid,
            email: user.email,
            emailVerified: user.emailVerified,
          },
          dbData: userData,
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
  if (name) updates["users/" + user.uid + "/name"] = name;
  if (branchId) updates["users/" + user.uid + "/branchId"] = branchId;

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
      const snapshot = await db.ref(`users/${user.uid}`).once("value");
      console.log(
        "User data retrieved:",
        snapshot.exists() ? "exists" : "does not exist"
      );

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
        alert(
          "Error: No branch assigned to your account. Please contact admin."
        );
        signOut();
        return;
      }

      currentBranch = userData.branchId;

      // Load branch details
      try {
        const branchSnapshot = await db
          .ref(`branches/${currentBranch}`)
          .once("value");
        console.log(
          "Branch data retrieved:",
          branchSnapshot.exists() ? "exists" : "does not exist"
        );

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
    const snapshot = await db.ref(`users/${user.uid}`).once("value");
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
    header.insertAdjacentHTML(
      "beforeend",
      '<div id="branch-name" style="margin-left: auto; padding: 0 20px;"></div>'
    );
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
  document
    .querySelectorAll(".page")
    .forEach((page) => page.classList.remove("active"));
  document
    .querySelectorAll(".nav-list a")
    .forEach((link) => link.classList.remove("active"));
  document.getElementById(`page-${pageId}`).classList.add("active");
  document.getElementById(`nav-${pageId}`).classList.add("active");
  document.getElementById("page-title").textContent =
    pageId.charAt(0).toUpperCase() + pageId.slice(1).replace("-", " ");

  if (pageId === "inventory") loadInventoryPage();
  if (pageId === "dashboard") loadDashboardPage();
  if (pageId === "supplier") loadSupplierPage();
  if (pageId === "orders") loadOrderPage(); 
  if (pageId === "reports") loadReportPage();
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
            <h2>${
              currentBranch ? currentBranch + " Dashboard" : "Dashboard"
            }</h2>
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
    const branchSnapshot = await db
      .ref(`branches/${currentBranch}`)
      .once("value");
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
    page.innerHTML +=
      "<p>Error: No branch assigned to your account. Please contact admin.</p>";
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
        console.warn(
          "No inventory data found for this branch. Using fallback data."
        );
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
      (item.description || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
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

  return date.toISOString().split("T")[0];
}

// Helper function to format date for display
function formatDisplayDate(dateString) {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "Invalid date";

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Shows detailed information about a specific inventory item including order history
 * @param {string} itemId - The unique identifier of the inventory item
 */
function showItemDetails(itemId) {
  // Get item details
  db.ref(`branch_inventory/${currentBranch}/${itemId}`)
    .once("value")
    .then((itemSnap) => {
      const item = itemSnap.val() || {};
      item.id = itemId;

      // Create or update the modal
      let detailsModal = document.getElementById("itemDetailsModal");
      let detailsContent = document.getElementById("itemDetailsContent");

      if (!detailsModal) {
        const modalHTML = `
            <div id="itemDetailsModal" class="modal">
              <div class="modal-content">
                <span class="close-button">&times;</span>
                <div id="itemDetailsContent"></div>
              </div>
            </div>
          `;
        document.body.insertAdjacentHTML("beforeend", modalHTML);
        detailsModal = document.getElementById("itemDetailsModal");
        detailsContent = document.getElementById("itemDetailsContent");
      }

      // Set up modal closing behavior
      const closeButton = detailsModal.querySelector(".close-button");
      closeButton.onclick = () => (detailsModal.style.display = "none");
      detailsModal.onclick = (event) => {
        if (event.target === detailsModal) {
          detailsModal.style.display = "none";
        }
      };
      detailsModal.querySelector(".modal-content").onclick = (event) => {
        event.stopPropagation();
      };

      // Define switching functions
      window.switchToEditMode = function () {
        detailsContent.innerHTML = createEditMode(item);
      };

      window.switchToViewMode = function () {
        // Refresh the data before showing view mode
        showItemDetails(itemId);
      };

      // Render view mode
      detailsContent.innerHTML = createViewMode(item);
      detailsModal.style.display = "block";
    })
    .catch((error) => {
      console.error("Error loading item details:", error);
      alert("Error loading item details. Please try again.");
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
          <td>${
            order.unitPrice ? order.unitPrice.toFixed(2) + " PHP" : "N/A"
          }</td>
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
            <img src="${item.image || "../images/default.png"}" alt="${
    item.name
  }">
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
          <input type="text" id="edit-name" value="${item.name || ""}" required>
        </div>
        <div class="form-group">
          <label for="edit-description">Description:</label>
          <textarea id="edit-description">${item.description || ""}</textarea>
        </div>
        <div class="form-group">
          <label for="edit-stock">Current Stock (kg):</label>
          <input type="number" id="edit-stock" value="${
            item.stock || 0
          }" min="0" required>
        </div>
        <div class="form-group">
          <label for="edit-minStock">Minimum Stock (kg):</label>
          <input type="number" id="edit-minStock" value="${
            item.minStock || 0
          }" min="0" required>
        </div>
        <div class="form-group">
          <label for="edit-supplier">Supplier:</label>
          <input type="text" id="edit-supplier" value="${item.supplier || ""}">
        </div>
        <div class="form-group">
          <label for="edit-expiration">Expiration Date:</label>
          <input type="date" id="edit-expiration" value="${
            item.expiration || ""
          }" required>
        </div>
        <div class="form-group">
          <label for="edit-image">Product Image:</label>
          <input type="file" id="edit-image" accept="image/*">
          <small>Leave empty to keep current image</small>
          <div id="editImagePreview" style="margin-top: 10px;">
            ${
              item.image
                ? `<img src="${item.image}" style="max-width: 200px; max-height: 200px;">`
                : ""
            }
          </div>
        </div>
        <div class="form-actions">
          <button type="submit">Save</button>
          <button type="button" onclick="switchToViewMode('${
            item.id
          }')">Cancel</button>
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
  const newName = document.getElementById("edit-name").value;
  const newDescription = document.getElementById("edit-description").value;
  const newStock = parseInt(document.getElementById("edit-stock").value);
  const newMinStock = parseInt(document.getElementById("edit-minStock").value);
  const newSupplier = document.getElementById("edit-supplier").value;
  const newExpiration = document.getElementById("edit-expiration").value;
  const imageFile = document.getElementById("edit-image").files[0];

  // Validate inputs
  if (!newName || isNaN(newStock) || isNaN(newMinStock) || !newExpiration) {
    alert("Please fill in all required fields with valid data.");
    return;
  }

  // Prepare update data
  const updateData = {
    name: newName,
    description: newDescription,
    stock: newStock,
    minStock: newMinStock,
    supplier: newSupplier,
    expiration: newExpiration,
  };

  try {
    // If an image file was uploaded, convert to Base64
    if (imageFile) {
      updateData.image = await convertImageToBase64(imageFile);
    } else {
      // Use the existing image if available
      const existingImage = document
        .getElementById("editImagePreview")
        .querySelector("img");
      if (!existingImage) {
        // If no existing image and no new image uploaded, use default
        updateData.image = "../images/default.png";
      }
    }

    // Update the item in Firebase
    await db
      .ref(`branch_inventory/${currentBranch}/${itemId}`)
      .update(updateData);

    console.log("Item updated successfully!");
    // Switch back to view mode
    switchToViewMode(itemId);
  } catch (error) {
    console.error("Error updating item:", error.message);
    alert("Error updating item: " + error.message);
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
    timestamp: firebase.database.ServerValue.TIMESTAMP,
  };

  // Push the new item to Firebase
  db.ref(`branch_inventory/${currentBranch}`)
    .push(newItem)
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
  if (
    !confirm(
      "Are you sure you want to delete this item? This action cannot be undone."
    )
  ) {
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
      stock: parseInt(newStock),
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
  </div>
  <div id="supplierList"></div>
`;

  if (!currentBranch) {
    page.innerHTML +=
      "<p>Error: No branch assigned to your account. Please contact admin.</p>";
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
              productsHtml = supplier.products
                .split(",")
                .map((product) => `<li>${product.trim()}</li>`)
                .join("");
            } else {
              // New format (object with prices)
              productsHtml = Object.entries(supplier.products)
                .map(([productName, productData]) => {
                  // Handle different data formats
                  let price = "";
                  if (typeof productData === "object") {
                    price = productData.price || productData.quantity || "N/A";
                  } else {
                    price = productData;
                  }
                  return `<li>${productName} - ${parseFloat(price).toFixed(
                    2
                  )} PHP per kg</li>`;
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
`;
          supplierList.appendChild(div);
        });
      } else {
        supplierList.innerHTML =
          "<p>No suppliers found for this branch. Add a supplier to start.</p>";
      }
    })
    .catch((error) => {
      console.error("Error loading suppliers:", error.message);
      supplierList.innerHTML = `<p>Error loading suppliers: ${error.message}</p>`;
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
  document
    .getElementById("addProductBtn")
    .addEventListener("click", addProductEntry);

  // Add event listener for QR code preview
  document
    .getElementById("supplierQRCode")
    .addEventListener("change", function (e) {
      previewQRCode(e);
    });

  // Add event listeners
  document
    .querySelector(".close-supplier-modal")
    .addEventListener("click", closeSupplierModal);
  document
    .getElementById("cancelSupplier")
    .addEventListener("click", closeSupplierModal);
  document
    .getElementById("supplierForm")
    .addEventListener("submit", handleSupplierSubmit);

  // Close modal when clicking outside
  document
    .getElementById("supplierModal")
    .addEventListener("click", function (e) {
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
  productEntry
    .querySelector(".remove-product")
    .addEventListener("click", function () {
      productEntries.removeChild(productEntry);
    });
}

/**
 * Closes the supplier modal
 */
function closeSupplierModal() {
  document.getElementById("supplierModal").style.display = "none";
  document.getElementById("supplierForm").reset();
  document.getElementById("supplierModalTitle").textContent =
    "Add New Supplier";
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
      unit: "kg", // Always use kg as the unit
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
      const snapshot = await db
        .ref(
          `branch_suppliers/${currentBranch}/${currentEditingSupplierId}/gcashQR`
        )
        .once("value");
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
      await db
        .ref(`branch_suppliers/${currentBranch}/${currentEditingSupplierId}`)
        .update(supplierData);
      console.log("Supplier updated successfully");
    } else {
      const newSupplierId = await getNextSupplierId(currentBranch);
      await db
        .ref(`branch_suppliers/${currentBranch}/${newSupplierId}`)
        .set(supplierData);
      console.log("Supplier added successfully with ID:", newSupplierId);
    }

    closeSupplierModal();
    loadSupplierPage();
  } catch (error) {
    console.error("Error saving supplier:", error.message);
    alert("Error saving supplier: " + error.message);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = currentEditingSupplierId
      ? "Update Supplier"
      : "Save Supplier";
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
    reader.onload = function (e) {
      preview.innerHTML = `<img src="${e.target.result}" style="max-width: 200px;">`;
    };
    reader.readAsDataURL(file);
  } else {
    preview.innerHTML = "";
  }
}



/* ============================================= */
/* ============ ORDER SECTION ================== */
/* ============================================= */

// Global variables for order management
let selectedSupplierProducts = [];
let currentOrderItems = [];
let currentSupplierId = null;
let orderListListener = null;
let supplierProductsWithPrices = {};

/* ============================================= */
/* ============ ORDER DISPLAY FUNCTIONS ======== */
/* ============================================= */

/**
 * Loads and displays orders with real-time updates
 */
function loadOrderPage() {
  const page = document.getElementById("page-orders");
  
  // Set up the page structure
  page.innerHTML = `
    <div class="orders-header">
      <h2>Order Management</h2>
      <button class="add-order-btn" onclick="addOrder()">
        <i class="fas fa-plus"></i> Add Order
      </button>
    </div>
    <div id="orderList" class="orders-grid-container"></div>
  `;
  if (!currentBranch) {
    document.getElementById("orderList").innerHTML = 
      "<p>No branch assigned to your account. Please contact admin.</p>";
    return;
  }

  cleanupOrderListeners();

  const orderList = document.getElementById("orderList");
  orderList.innerHTML = "<p>Loading orders...</p>";

  // Set up real-time listener
  orderListListener = db.ref(`branch_orders/${currentBranch}`).on(
    "value",
    (snapshot) => {
      const branchOrders = snapshot.val() || {};
      renderOrderList(branchOrders);
    },
    (error) => {
      console.error("Error loading orders:", error.message);
      orderList.innerHTML = `<p>Error loading orders: ${error.message}</p>`;
    }
  );
}

/**
 * Renders the order list
 */
function renderOrderList(orders) {
  const orderList = document.getElementById("orderList");
  orderList.innerHTML = "";

  if (Object.keys(orders).length > 0) {
    Object.entries(orders).forEach(([id, order]) => {
      orderList.appendChild(createOrderListItem(id, order));
    });
  } else {
    orderList.innerHTML = 
      "<p>No orders found for this branch. Create an order to start.</p>";
  }
}

function createOrderListItem(id, order) {
    const orderTotal = order.total || 
      (order.products ? Object.values(order.products).reduce((sum, product) => {
        if (typeof product === "object") {
          const price = product.unitPrice || product.price || 0;
          return sum + (product.total || price * (product.quantity || 0));
        }
        return sum;
      }, 0) : 0);
  
    const div = document.createElement("div");
    div.className = "order-item-card";
    
    div.innerHTML = `
      <div class="order-card-header">
        <h4>
          Order #${id}
          <span class="order-status status-${order.status?.toLowerCase() || 'pending'}">
            ${order.status || "Pending"}
          </span>
        </h4>
        <p>Supplier: ${order.supplierName || order.supplierID}</p>
      </div>
      
      <div class="order-card-body">
        <div class="order-detail-row">
          <span class="label">Products:</span>
          <span class="value">${formatOrderProducts(order.products)}</span>
        </div>
        <div class="order-detail-row">
          <span class="label">Total:</span>
          <span class="value">${orderTotal.toFixed(2)} PHP</span>
        </div>
        <div class="order-detail-row">
          <span class="label">Payment:</span>
          <span class="value status-${order.paymentStatus?.toLowerCase() || 'pending'}">
            ${order.paymentStatus || "Pending"}
          </span>
        </div>
        <div class="order-detail-row">
          <span class="label">Date:</span>
          <span class="value">
            ${order.timestamp ? new Date(order.timestamp).toLocaleString() : "N/A"}
          </span>
        </div>
      </div>
      
      <div class="order-card-footer">
        <button onclick="viewOrderDetails('${id}')">View</button>
        ${order.paymentStatus === "Pending" && order.status === "Pending" ? 
          `<button onclick="showPaymentModal('${id}', '${order.supplierID}')">Pay</button>` : ''}
        <button onclick="editOrder('${id}')">Edit</button>
        <button onclick="deleteOrder('${id}')">Delete</button>
      </div>
    `;
    
    return div;
  }

/**
 * Formats order products for display with robust error handling
 * Supports both old (string) and new (object) product formats
 * Handles both 'price' and 'unitPrice' field names
 */
function formatOrderProducts(products) {
    if (!products) return "N/A";
    if (typeof products === "string") return products;
  
    try {
    //   return Object.keys(products).length + " items";
      // Or for more detail:
      return Object.entries(products)
        .map(([product]) => product)
        .slice(0, 2)
        .join(", ") + (Object.keys(products).length > 2 ? "..." : "");
    } catch (error) {
      console.error("Error formatting products:", error);
      return "Invalid data";
    }
  }

/**
 * Shows detailed view of an order
 */
function viewOrderDetails(orderId) {
  // Create modal if it doesn't exist
  if (!document.getElementById("orderDetailsModal")) {
    const modalHTML = `
    <div id="orderDetailsModal" class="modal">
      <div class="modal-content" style="max-width: 600px;">
        <span class="close-details-modal">&times;</span>
        <h2>Order Details</h2>
        <div id="orderDetailsContent"></div>
        <div class="modal-actions">
          <button onclick="editOrder('${orderId}')">Edit Order</button>
          <button onclick="document.getElementById('orderDetailsModal').style.display='none'">Close</button>
        </div>
      </div>
    </div>`;
    document.body.insertAdjacentHTML("beforeend", modalHTML);

    // Initialize modal close button
    document.querySelector(".close-details-modal").addEventListener("click", () => {
      document.getElementById("orderDetailsModal").style.display = "none";
    });

    // Add click handler to close modal when clicking outside content
    document.getElementById("orderDetailsModal").addEventListener("click", function(e) {
      if (e.target === this) {
        this.style.display = "none";
      }
    });
  }

  const modal = document.getElementById("orderDetailsModal");
  const content = document.getElementById("orderDetailsContent");

  // Show loading state
  modal.style.display = "block";
  content.innerHTML = "<p>Loading order details...</p>";

  // Load order data
  db.ref(`branch_orders/${currentBranch}/${orderId}`)
    .once("value")
    .then((snapshot) => {
      const order = snapshot.val();
      if (!order) {
        content.innerHTML = "<p>Order not found</p>";
        return;
      }

      // Format the order details
      let detailsHTML = `
      <div class="order-detail">
        <strong>Order ID:</strong> ${orderId}
      </div>
      <div class="order-detail">
        <strong>Supplier:</strong> ${order.supplierName || order.supplierID}
      </div>
      <div class="order-detail">
        <strong>Status:</strong> <span class="status-${order.status?.toLowerCase() || 'pending'}">
          ${order.status || "Pending"}
        </span>
      </div>
      <div class="order-detail">
        <strong>Payment Status:</strong> <span class="status-${order.paymentStatus?.toLowerCase() || 'pending'}">
          ${order.paymentStatus || "Pending"}
        </span>
      </div>
      <div class="order-detail">
        <strong>Date:</strong> ${order.timestamp ? new Date(order.timestamp).toLocaleString() : "N/A"}
      </div>
      <div class="order-detail">
        <strong>Products:</strong>
        <ul class="order-products-list">`;
  
    if (order.products) {
      Object.entries(order.products).forEach(([product, details]) => {
        if (typeof details === "object") {
          const quantity = details.quantity || 0;
          const price = details.unitPrice || details.price || 0;
          const total = details.total || price * quantity;
          detailsHTML += `
            <li>
              <strong>${product}</strong> - 
              ${quantity} kg × ${price.toFixed(2)} PHP = ${total.toFixed(2)} PHP
            </li>`;
        } else {
          detailsHTML += `<li><strong>${product}</strong> - ${details}</li>`;
        }
      });
    }
  
    // Add order total
    const orderTotal = order.total || 
      (order.products ? Object.values(order.products).reduce((sum, product) => {
        if (typeof product === "object") {
          const price = product.unitPrice || product.price || 0;
          return sum + (product.total || price * (product.quantity || 0));
        }
        return sum;
      }, 0) : 0);
  
    detailsHTML += `
        </ul>
      </div>
      <div class="order-detail">
        <strong>Order Total:</strong> ${orderTotal.toFixed(2)} PHP
      </div>`;
  

      // Add payment proof if available
      if (order.paymentProof) {
        detailsHTML += `
          <div class="order-detail">
            <strong>Payment Proof:</strong><br>
            <img src="${order.paymentProof}" style="max-width: 200px; margin-top: 10px;">
          </div>`;
      }

      content.innerHTML = detailsHTML;
    })
    .catch((error) => {
      console.error("Error loading order details:", error);
      content.innerHTML = `<p>Error loading order details: ${error.message}</p>`;
    });
}

/* ============================================= */
/* ============ ORDER CRUD OPERATIONS ========== */
/* ============================================= */

function addOrder() {
  // 1. Check if currentBranch is set
  if (!currentBranch) {
    alert("No branch assigned to your account. Please contact admin.");
    return;
  }

  // 2. Safely clear order items
  currentOrderItems = [];

  // 3. Check if modal exists or create it
  let orderModal = document.getElementById("orderModal");
  if (!orderModal) {
    createOrderModal();
    orderModal = document.getElementById("orderModal");

    // Double-check creation was successful
    if (!orderModal) {
      console.error("Failed to create order modal");
      return;
    }
  }

  // 4. Safely reset form elements
  const orderForm = document.getElementById("orderForm");
  if (orderForm) {
    orderForm.reset();
    orderForm.removeAttribute("data-edit-id");
    orderForm.removeAttribute("data-original-supplier");
  }

  // 5. Safely update UI
  try {
    updateOrderItemsDisplay();
    document.querySelector("#orderModal h2").textContent = "Add New Order";
    showOrderModal();
  } catch (error) {
    console.error("Error in addOrder:", error);
  }
}

/**
 * Edits an existing order in the database
 * @param {string} orderId - The ID of the order to edit
 */
function editOrder(orderId) {
  // Create modal if it doesn't exist
  if (!document.getElementById("orderModal")) {
    createOrderModal();
  }

  // Reset current order items before loading new ones
  currentOrderItems = [];
  updateOrderItemsDisplay();

  const orderRef = db.ref(`branch_orders/${currentBranch}/${orderId}`);
  orderRef
    .once("value")
    .then((snapshot) => {
      const order = snapshot.val();
      if (!order) {
        alert("Order not found");
        return;
      }

      populateOrderForm(orderId, order);
      showOrderModal();
    })
    .catch((error) => {
      console.error("Error loading order:", error);
      alert("Failed to load order details");
    });
}

/**
 * Deletes an order after confirmation
 */
function deleteOrder(orderId) {
  if (confirm("Are you sure you want to delete this order?")) {
    showLoading(true);

    db.ref(`branch_orders/${currentBranch}/${orderId}`)
      .remove()
      .then(() => showSuccessMessage("Order deleted successfully"))
      .catch((error) => {
        console.error("Error deleting order:", error);
        alert("Failed to delete order. Please try again.");
      })
      .finally(() => showLoading(false));
  }
}

/**
 * Populates order form with existing data
 * @param {string} orderId - The ID of the order being edited
 * @param {object} order - The order data
 */
function populateOrderForm(orderId, order) {
  // Store the original supplier ID before any changes
  const originalSupplierId = order.supplierID || "";
  currentSupplierId = originalSupplierId;

  // Set the form values
  document.getElementById("orderSupplier").value = originalSupplierId;
  document.getElementById("orderForm").dataset.editId = orderId;
  document.getElementById("orderForm").dataset.originalSupplier = originalSupplierId;

  // Add status fields to the form (since they're not in the template)
  const form = document.getElementById("orderForm");
  const supplierGroup = document.querySelector("#orderForm .form-group:first-child");

  // Create status field group
  const statusGroup = document.createElement("div");
  statusGroup.className = "form-group";
  statusGroup.innerHTML = `
    <label for="orderStatus">Status:</label>
    <select id="orderStatus" required>
      <option value="Pending">Pending</option>
      <option value="Processing">Processing</option>
      <option value="Completed">Completed</option>
      <option value="Cancelled">Cancelled</option>
    </select>
  `;

  // Create payment status field group
  const paymentStatusGroup = document.createElement("div");
  paymentStatusGroup.className = "form-group";
  paymentStatusGroup.innerHTML = `
    <label for="orderPaymentStatus">Payment Status:</label>
    <select id="orderPaymentStatus" required>
      <option value="Pending">Pending</option>
      <option value="Paid">Paid</option>
      <option value="Failed">Failed</option>
    </select>
  `;

  // Insert after supplier group
  supplierGroup.insertAdjacentElement("afterend", statusGroup);
  statusGroup.insertAdjacentElement("afterend", paymentStatusGroup);

  // Set values from the order
  document.getElementById("orderStatus").value = order.status || "Pending";
  document.getElementById("orderPaymentStatus").value = order.paymentStatus || "Pending";

  // Show product selection groups immediately
  document.getElementById("productSelectionGroup").style.display = "block";
  document.getElementById("quantityGroup").style.display = "block";

  // Load products for the supplier
  loadSupplierProducts(originalSupplierId)
    .then(() => {
      if (order.products) {
        currentOrderItems = Object.entries(order.products).map(([product, details]) => ({
          product,
          quantity: typeof details === "object" ? details.quantity : parseInt(details),
        }));
        updateOrderItemsDisplay();
      }
      document.querySelector("#orderModal h2").textContent = "Edit Order";
    })
    .catch((error) => {
      console.error("Error loading products:", error);
      alert("Failed to load supplier products");
    });
}

/* ============================================= */
/* ============ ORDER FORM MANAGEMENT ========== */
/* ============================================= */

/**
 * Creates and initializes the order modal
 */
function createOrderModal() {
  // Check if modal already exists
  if (document.getElementById("orderModal")) return;

  const modalHTML = `
    <div id="orderModal" class="modal">
      <div class="modal-content">
        <span class="close-order-modal">&times;</span>
        <h2>Add New Order</h2>
        <form id="orderForm">
          <div class="form-group">
            <label for="orderSupplier">Supplier:</label>
            <select id="orderSupplier" required>
              <option value="">Loading suppliers...</option>
            </select>
          </div>
          
          <!-- Status fields removed from here - they'll be added dynamically when needed -->
          
          <div id="productSelectionGroup" class="form-group" style="display: none;">
            <label for="orderProduct">Product:</label>
            <select id="orderProduct" disabled>
              <option value="">-- Select Product --</option>
            </select>
            <div id="productPriceDisplay" style="margin-top: 5px;"></div>
          </div>
          
          <div id="quantityGroup" class="form-group" style="display: none;">
            <label for="orderQuantity">Quantity (kg):</label>
            <input type="number" id="orderQuantity" min="0.1" step="0.1" value="1" disabled>
          </div>
          
          <div class="form-group">
            <button type="button" id="addProductBtn">Add Product</button>
          </div>
          
          <div id="orderItemsContainer"></div>
          
          <div class="order-summary">
            <div class="summary-row">
              <span>Subtotal:</span>
              <span id="orderSubtotal">0.00 PHP</span>
            </div>
            <div class="summary-row">
              <span>Total:</span>
              <span id="orderTotal">0.00 PHP</span>
            </div>
          </div>
          
          <div class="form-actions">
            <button type="submit" id="saveOrderBtn">Save Order</button>
            <button type="button" id="cancelOrder">Cancel</button>
          </div>
        </form>
      </div>
    </div>`;

  document.body.insertAdjacentHTML("beforeend", modalHTML);
  initializeOrderModal();
}

/**
 * Initializes order modal event listeners
 */
function initializeOrderModal() {
  const orderModal = document.getElementById("orderModal");
  if (!orderModal) {
    console.error("Failed to create order modal");
    return;
  }

  const orderForm = document.getElementById("orderForm");
  const orderSupplier = document.getElementById("orderSupplier");
  const orderProduct = document.getElementById("orderProduct");
  const addProductBtn = document.getElementById("addProductBtn");
  const closeButton = document.querySelector(".close-order-modal");
  const cancelButton = document.getElementById("cancelOrder");

  // Event listeners
  closeButton?.addEventListener("click", closeOrderModal);
  cancelButton?.addEventListener("click", closeOrderModal);
  orderForm.addEventListener("submit", function(e) {
    e.preventDefault();
    const orderId = this.dataset.editId;
    orderId ? handleOrderUpdate(orderId) : handleOrderSubmit(e);
  });

  orderSupplier?.addEventListener("change", function() {
    // Get the original supplier from the form data
    const originalSupplier = orderForm.dataset.originalSupplier;
    const isEditing = !!orderForm.dataset.editId;

    // If we're editing and the supplier is being changed from the original
    if (isEditing && this.value !== originalSupplier) {
      if (!confirm("Changing the supplier will clear your current order items. Continue?")) {
        // Reset to the original supplier if user cancels
        this.value = originalSupplier;
        return;
      }

      // Clear current order items if they proceed
      currentOrderItems = [];
      updateOrderItemsDisplay();
    }

    // Load products for the new supplier
    loadSupplierProducts(this.value);
  });

  orderProduct?.addEventListener("change", function() {
    const quantityInput = document.getElementById("orderQuantity");
    if (this.value && quantityInput) {
      quantityInput.disabled = false;
      quantityInput.focus();
    } else if (quantityInput) {
      quantityInput.disabled = true;
      quantityInput.value = "";
    }
  });

  addProductBtn?.addEventListener("click", addProductToOrder);
  orderModal.addEventListener("click", function(e) {
    if (e.target === this) closeOrderModal();
  });

  loadSuppliersForOrder();
}

/**
 * Shows the order modal
 */
function showOrderModal() {
  const orderModal = document.getElementById("orderModal");
  if (!orderModal) {
    console.error("Order modal not found");
    return;
  }

  orderModal.style.display = "block";

  // Focus on supplier dropdown if it exists
  const supplierSelect = document.getElementById("orderSupplier");
  if (supplierSelect) {
    supplierSelect.focus();
  }

  // Show product selection groups if we're adding a new order
  const isEditing = !!document.getElementById("orderForm").dataset.editId;
  const productGroup = document.getElementById("productSelectionGroup");
  const quantityGroup = document.getElementById("quantityGroup");

  if (!isEditing && productGroup && quantityGroup) {
    productGroup.style.display = currentOrderItems.length > 0 ? "block" : "none";
    quantityGroup.style.display = currentOrderItems.length > 0 ? "block" : "none";
  }
}

/**
 * Closes the order modal and resets form
 */
function closeOrderModal() {
  const orderModal = document.getElementById("orderModal");
  if (orderModal) {
    orderModal.style.display = "none";
  }

  const orderForm = document.getElementById("orderForm");
  if (orderForm) {
    // Remove any dynamically added status fields
    const statusSelect = document.getElementById("orderStatus");
    const paymentStatusSelect = document.getElementById("orderPaymentStatus");
    if (statusSelect) statusSelect.parentElement.remove();
    if (paymentStatusSelect) paymentStatusSelect.parentElement.remove();

    orderForm.reset();
    orderForm.removeAttribute("data-edit-id");
    orderForm.removeAttribute("data-original-supplier");
  }

  // Reset UI elements if they exist
  const productSelectionGroup = document.getElementById("productSelectionGroup");
  const quantityGroup = document.getElementById("quantityGroup");
  if (productSelectionGroup) productSelectionGroup.style.display = "none";
  if (quantityGroup) quantityGroup.style.display = "none";

  // Clear temporary data
  selectedSupplierProducts = [];
  currentOrderItems = [];
  currentSupplierId = null;
  updateOrderItemsDisplay();

  // Reset form title if it exists
  const modalTitle = document.querySelector("#orderModal h2");
  if (modalTitle) {
    modalTitle.textContent = "Add New Order";
  }
}

/* ============================================= */
/* ========== ORDER PAYMENT MANAGEMENT ========= */
/* ============================================= */

/**
 * Creates the payment modal
 */
function createPaymentModal() {
  const modalHTML = `
    <div id="paymentModal" class="modal">
      <div class="modal-content">
        <span class="close-payment-modal">&times;</span>
        <h2>Make Payment</h2>
        <form id="paymentForm">
          <div class="form-group">
            <label>Supplier Contact:</label>
            <p id="supplierContact">Loading...</p>
          </div>
          
          <div class="form-group">
            <label>GCash Number:</label>
            <p id="supplierGcash">Loading...</p>
          </div>
          
          <div class="form-group">
            <label>GCash QR Code:</label>
            <div id="gcashImageContainer">
              <p>Loading image...</p>
            </div>
          </div>
          
          <div id="paymentProofContainer"></div>
          
          <div class="form-group">
            <label for="paymentProof">Upload Proof of Payment:</label>
            <input type="file" id="paymentProof" accept="image/*" required>
            <p class="hint">(Max 2MB, JPG/PNG only)</p>
          </div>

          <div class="form-group">
            <label>New Payment Proof Preview:</label>
            <img id="paymentProofPreview" style="max-width: 200px; display: none;">
          </div>
          
          <div class="form-actions">
            <button type="submit" id="submitPaymentBtn">Submit Payment</button>
            <button type="button" id="cancelPayment">Cancel</button>
          </div>
        </form>
      </div>
    </div>`;

  document.body.insertAdjacentHTML("beforeend", modalHTML);
  initializePaymentModal();
}

/**
 * Shows the payment modal with supplier payment information
 */
function showPaymentModal(orderId, supplierId) {
  // Create modal if it doesn't exist
  if (!document.getElementById("paymentModal")) {
    createPaymentModal();
  }

  const modal = document.getElementById("paymentModal");
  const modalContent = modal.querySelector(".modal-content");

  // Store the original modal HTML before showing loading state
  const originalHTML = modalContent.innerHTML;

  // Show loading state
  modal.style.display = "block";
  modalContent.innerHTML = `
    <div style="padding: 20px; text-align: center;">
      <p>Loading payment details...</p>
    </div>
  `;

  // Load order and supplier information
  Promise.all([
    db.ref(`branch_orders/${currentBranch}/${orderId}`).once("value"),
    db.ref(`branch_suppliers/${currentBranch}/${supplierId}`).once("value"),
  ])
    .then(([orderSnapshot, supplierSnapshot]) => {
      const order = orderSnapshot.val();
      const supplier = supplierSnapshot.val();

      if (!supplier) {
        alert("Supplier information not found");
        closePaymentModal();
        return;
      }

      // Restore original modal content
      modalContent.innerHTML = originalHTML;

      // Populate the data
      document.getElementById("supplierContact").textContent = supplier.contact || "N/A";
      document.getElementById("supplierGcash").textContent = supplier.gcash || "N/A";

      // Handle GCash QR code
      const gcashImageContainer = document.getElementById("gcashImageContainer");
      if (supplier.gcashQR) {
        gcashImageContainer.innerHTML = `<img src="${supplier.gcashQR}" alt="GCash QR Code" style="max-width: 200px;">`;
      } else {
        gcashImageContainer.innerHTML = "<p>No GCash QR code available</p>";
      }

      // Handle payment proof image
      const paymentProofContainer = document.getElementById("paymentProofContainer");
      if (order.paymentProof) {
        paymentProofContainer.innerHTML = `
          <div class="form-group">
            <label>Previous Payment Proof:</label>
            <img src="${order.paymentProof}" style="max-width: 200px; display: block;">
          </div>
        `;
      } else {
        paymentProofContainer.innerHTML = "";
      }

      // Set the order ID in the form
      document.getElementById("paymentForm").dataset.orderId = orderId;

      // Reinitialize event listeners
      initializePaymentModal();
    })
    .catch((error) => {
      console.error("Error loading payment details:", error);
      modalContent.innerHTML = `
        <div style="padding: 20px; text-align: center;">
          <p>Error loading payment details: ${error.message}</p>
          <button onclick="closePaymentModal()" style="padding: 8px 16px; margin-top: 10px;">Close</button>
        </div>
      `;
    });
}

/**
 * Initializes payment modal event listeners
 */
function initializePaymentModal() {
  const paymentModal = document.getElementById("paymentModal");
  const paymentForm = document.getElementById("paymentForm");
  const closeButton = document.querySelector(".close-payment-modal");
  const cancelButton = document.getElementById("cancelPayment");

  // Event listeners
  closeButton?.addEventListener("click", closePaymentModal);
  cancelButton?.addEventListener("click", closePaymentModal);
  paymentForm.addEventListener("submit", handlePaymentSubmission);

  paymentModal.addEventListener("click", function(e) {
    if (e.target === this) closePaymentModal();
  });
  document.getElementById("paymentProof").addEventListener("change", function(e) {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function(event) {
        const preview = document.getElementById("paymentProofPreview");
        preview.src = event.target.result;
        preview.style.display = "block";
      };
      reader.readAsDataURL(file);
    }
  });
}

/**
 * Handles payment submission
 */
async function handlePaymentSubmission(e) {
  e.preventDefault();

  const orderId = e.target.dataset.orderId; // Get from form data attribute
  const proofFile = document.getElementById("paymentProof").files[0];

  if (!proofFile) {
    alert("Please select a payment proof file");
    return;
  }

  // Check file size (2MB limit)
  if (proofFile.size > 2 * 1024 * 1024) {
    alert("File too large. Maximum size is 2MB.");
    return;
  }

  // Check file type
  if (!["image/jpeg", "image/png"].includes(proofFile.type)) {
    alert("Only JPG and PNG images are allowed");
    return;
  }

  const submitBtn = document.getElementById("submitPaymentBtn");
  submitBtn.disabled = true;
  submitBtn.textContent = "Processing...";

  try {
    // Read the file as Data URL (Base64)
    const proofDataURL = await readFileAsDataURL(proofFile);

    // Update the order status in Realtime Database
    await db.ref(`branch_orders/${currentBranch}/${orderId}`).update({
      paymentStatus: "Paid",
      status: "Processing",
      paymentProof: proofDataURL,
      paymentTimestamp: firebase.database.ServerValue.TIMESTAMP,
    });

    showSuccessMessage("Payment submitted successfully");
    closePaymentModal();
  } catch (error) {
    console.error("Error submitting payment:", error);
    alert("Failed to submit payment. Please try again.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Submit Payment";
  }
}

// Helper function to read file as Data URL
function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Closes the payment modal
 */
function closePaymentModal() {
  const paymentModal = document.getElementById("paymentModal");
  if (paymentModal) {
    paymentModal.style.display = "none";
    document.getElementById("paymentForm").reset();
    document.getElementById("paymentForm").removeAttribute("data-order-id");
  }
}

/* ============================================= */
/* ============ ORDER ITEMS MANAGEMENT ========= */
/* ============================================= */

/**
 * Updates the displayed list of order items
 */
function updateOrderItemsDisplay() {
  const container = document.getElementById("orderItemsContainer");
  if (!container) return;

  container.innerHTML = "";

  if (currentOrderItems.length === 0) {
    container.innerHTML = "<p class='no-items'>No items added yet</p>";
    updateOrderTotals();
    return;
  }

  const list = document.createElement("ul");
  list.className = "order-items-list";

  currentOrderItems.forEach((item, index) => {
    const productPrice = supplierProductsWithPrices[item.product]?.price || 0;
    const itemTotal = productPrice * item.quantity;

    const li = document.createElement("li");
    li.className = "order-item-row";
    li.innerHTML = `
      <div class="item-details">
        <span class="product-name">${item.product}</span>
        <span class="product-quantity">${item.quantity} kg</span>
      </div>
      <div class="item-price">
        <span>${productPrice.toFixed(2)} PHP/kg</span>
        <span class="item-total">${itemTotal.toFixed(2)} PHP</span>
        <button onclick="removeOrderItem(${index})" class="remove-item-btn">×</button>
      </div>
    `;
    list.appendChild(li);
  });

  container.appendChild(list);
  updateOrderTotals();
}

function updateOrderTotals() {
  let subtotal = 0;

  currentOrderItems.forEach((item) => {
    const productPrice = supplierProductsWithPrices[item.product]?.price || 0;
    subtotal += productPrice * item.quantity;
  });

  document.getElementById("orderSubtotal").textContent = subtotal.toFixed(2) + " PHP";
  document.getElementById("orderTotal").textContent = subtotal.toFixed(2) + " PHP";
}

/**
 * Adds product to current order items
 */
function addProductToOrder() {
  const productSelect = document.getElementById("orderProduct");
  const quantityInput = document.getElementById("orderQuantity");

  const product = productSelect.value;
  const quantity = parseFloat(quantityInput.value);

  if (!product || isNaN(quantity)) {
    alert("Please select a product and enter a valid quantity");
    return;
  }

  // Verify the product belongs to the current supplier
  if (!selectedSupplierProducts.includes(product)) {
    alert("Selected product doesn't belong to the current supplier");
    return;
  }

  // Check if product already exists in order
  const existingItemIndex = currentOrderItems.findIndex(
    (item) => item.product === product
  );
  if (existingItemIndex >= 0) {
    currentOrderItems[existingItemIndex].quantity += quantity;
  } else {
    currentOrderItems.push({ product, quantity });
  }

  // Update display
  updateOrderItemsDisplay();

  // Reset selection
  productSelect.value = "";
  quantityInput.value = "";
  quantityInput.disabled = true;
  document.getElementById("productPriceDisplay").innerHTML = "";
}

/**
 * Removes an item from the current order
 */
function removeOrderItem(index) {
  currentOrderItems.splice(index, 1);
  updateOrderItemsDisplay();
}

/* ============================================= */
/* ============ SUPPLIER/PRODUCT LOADING ======= */
/* ============================================= */

/**
 * Loads suppliers into dropdown
 */
function loadSuppliersForOrder() {
  const supplierSelect = document.getElementById("orderSupplier");
  if (!supplierSelect) {
    console.error("Supplier select element not found");
    return;
  }

  supplierSelect.innerHTML = currentBranch 
    ? '<option value="">Loading suppliers...</option>' 
    : '<option value="">No branch selected</option>';

  if (!currentBranch) return;

  db.ref(`branch_suppliers/${currentBranch}`)
    .once("value")
    .then((snapshot) => {
      supplierSelect.innerHTML = '<option value="">-- Select Supplier --</option>';

      if (snapshot.exists()) {
        snapshot.forEach((child) => {
          const supplier = child.val();
          supplierSelect.innerHTML += `<option value="${child.key}">${supplier.name}</option>`;
        });
      } else {
        supplierSelect.innerHTML = '<option value="">No suppliers available</option>';
      }
    })
    .catch((error) => {
      console.error("Error loading suppliers:", error);
      supplierSelect.innerHTML = '<option value="">Error loading suppliers</option>';
    });
}

function loadSupplierProducts(supplierId) {
  return new Promise((resolve, reject) => {
    currentSupplierId = supplierId;
    supplierProductsWithPrices = {}; // Reset prices

    const productSelect = document.getElementById("orderProduct");
    const productGroup = document.getElementById("productSelectionGroup");
    const quantityGroup = document.getElementById("quantityGroup");

    productSelect.innerHTML = '<option value="">-- Select Product --</option>';
    productSelect.disabled = true;
    document.getElementById("orderQuantity").value = "";

    if (!supplierId) {
      productGroup.style.display = "none";
      quantityGroup.style.display = "none";
      resolve();
      return;
    }

    // Always show these groups when loading products
    productGroup.style.display = "block";
    quantityGroup.style.display = "block";

    productSelect.innerHTML = '<option value="">Loading products...</option>';

    db.ref(`branch_suppliers/${currentBranch}/${supplierId}`)
      .once("value")
      .then((snapshot) => {
        const supplier = snapshot.val();
        if (!supplier || !supplier.products) {
          productSelect.innerHTML = '<option value="">No products found</option>';
          resolve();
          return;
        }

        // Handle both old (string) and new (object) product formats
        if (typeof supplier.products === "string") {
          selectedSupplierProducts = supplier.products.split(",").map(p => p.trim());
          selectedSupplierProducts.forEach((product) => {
            productSelect.innerHTML += `<option value="${product}">${product}</option>`;
            supplierProductsWithPrices[product] = { price: 0, unit: "kg" }; // Default price
          });
        } else {
          selectedSupplierProducts = Object.keys(supplier.products);
          Object.entries(supplier.products).forEach(([product, details]) => {
            productSelect.innerHTML += `<option value="${product}" data-price="${details.price}">${product} (${details.price} PHP/kg)</option>`;
            supplierProductsWithPrices[product] = details;
          });
        }

        productSelect.disabled = false;

        // Add event listener for product selection
        productSelect.addEventListener("change", function() {
          const selectedProduct = this.value;
          const priceDisplay = document.getElementById("productPriceDisplay");

          if (selectedProduct && supplierProductsWithPrices[selectedProduct]) {
            const price = supplierProductsWithPrices[selectedProduct].price;
            priceDisplay.innerHTML = `Price: ${price.toFixed(2)} PHP per kg`;
          } else {
            priceDisplay.innerHTML = "";
          }
        });

        resolve();
      })
      .catch((error) => {
        console.error("Error loading supplier products:", error);
        productSelect.innerHTML = '<option value="">Error loading products</option>';
        reject(error);
      });
  });
}

/* ============================================= */
/* ============ ORDER SUBMISSION HANDLERS ====== */
/* ============================================= */

/**
 * Handles new order submission
 */
async function handleOrderSubmit(e) {
  e.preventDefault();

  const supplierSelect = document.getElementById("orderSupplier");
  const saveBtn = document.getElementById("saveOrderBtn");

  // Check if elements exist
  if (!supplierSelect || !saveBtn) {
    console.error("Required form elements not found");
    return;
  }

  const supplierId = supplierSelect.value;
  // Set default status values for new orders
  const status = "Pending";
  const paymentStatus = "Pending";

  // Validate form
  if (!validateOrderForm(supplierId, status, paymentStatus)) {
    return;
  }

  saveBtn.disabled = true;
  saveBtn.textContent = "Saving...";

  try {
    // Get supplier name for display
    const supplierSnap = await db
      .ref(`branch_suppliers/${currentBranch}/${supplierId}`)
      .once("value");
    const supplierName = supplierSnap.val()?.name || supplierId;

    // Format products with prices
    const products = {};
    currentOrderItems.forEach((item) => {
      const productPrice = supplierProductsWithPrices[item.product]?.price || 0;
      products[item.product] = {
        quantity: item.quantity,
        price: productPrice,
        total: productPrice * item.quantity,
      };
    });

    // Calculate order total
    const orderTotal = currentOrderItems.reduce((total, item) => {
      const productPrice = supplierProductsWithPrices[item.product]?.price || 0;
      return total + productPrice * item.quantity;
    }, 0);

    // Get the next sequential ID
    const newOrderId = await getNextOrderId(currentBranch);
    const timestamp = new Date().toISOString();

    const orderData = {
      supplierID: supplierId,
      supplierName,
      products,
      status,
      paymentStatus,
      subtotal: orderTotal,
      total: orderTotal,
      timestamp,
    };

    await db.ref(`branch_orders/${currentBranch}/${newOrderId}`).set(orderData);

    console.log("Order added successfully with ID:", newOrderId);
    showSuccessMessage("Order saved successfully");
    closeOrderModal();

    // Refresh the order list to show the new order
    loadOrderPage();
  } catch (error) {
    console.error("Error adding order:", error.message);
    alert("Error adding order: " + error.message);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "Save Order";
  }
}

/**
 * Handles order update
 */
async function handleOrderUpdate(orderId) {
  const supplierId = document.getElementById("orderSupplier").value;
  const status = document.getElementById("orderStatus").value;
  const paymentStatus = document.getElementById("orderPaymentStatus").value;
  const originalSupplier = document.getElementById("orderForm").dataset.originalSupplier;

  // Validate form
  if (!validateOrderForm(supplierId, status, paymentStatus)) return;

  const saveBtn = document.querySelector('#orderForm button[type="submit"]');
  saveBtn.disabled = true;
  saveBtn.textContent = "Updating...";

  try {
    // If supplier changed, we need to verify all products belong to new supplier
    if (supplierId !== originalSupplier) {
      const invalidProducts = currentOrderItems.filter(
        (item) => !selectedSupplierProducts.includes(item.product)
      );

      if (invalidProducts.length > 0) {
        alert("All products must belong to the selected supplier");
        return;
      }
    }

    await updateOrder(orderId, supplierId, status, paymentStatus);
    showSuccessMessage("Order updated successfully");
    closeOrderModal();
  } catch (error) {
    console.error("Error updating order:", error.message);
    alert("Error updating order: " + error.message);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "Save Order";
  }
}

/**
 * Validates order form inputs
 */
function validateOrderForm(supplierId, status, paymentStatus) {
  // Only check for supplier, status, and payment status
  if (!supplierId || !status || !paymentStatus) {
    alert("Please select a supplier and set statuses");
    return false;
  }

  // Check if at least one order item exists
  if (currentOrderItems.length === 0) {
    alert("Please add at least one product to the order");
    return false;
  }

  return true;
}

/**
 * Updates existing order in database
 */
async function updateOrder(orderId, supplierId, status, paymentStatus) {
  const supplierSnap = await db
    .ref(`branch_suppliers/${currentBranch}/${supplierId}`)
    .once("value");
  const supplierName = supplierSnap.val()?.name || supplierId;

  // Format products with prices
  const products = {};
  currentOrderItems.forEach((item) => {
    const productPrice = supplierProductsWithPrices[item.product]?.price || 0;
    products[item.product] = {
      quantity: item.quantity,
      price: productPrice,
      total: productPrice * item.quantity,
    };
  });

  // Calculate order total
  const orderTotal = currentOrderItems.reduce((total, item) => {
    const productPrice = supplierProductsWithPrices[item.product]?.price || 0;
    return total + productPrice * item.quantity;
  }, 0);

  const updateData = {
    supplierID: supplierId,
    supplierName,
    products,
    status,
    paymentStatus,
    subtotal: orderTotal,
    total: orderTotal,
    updatedAt: firebase.database.ServerValue.TIMESTAMP,
  };

  await db.ref(`branch_orders/${currentBranch}/${orderId}`).update(updateData);
}

/* ============================================= */
/* ============ UTILITY FUNCTIONS ============== */
/* ============================================= */

/**
 * Generates the next sequential order ID
 */
async function getNextOrderId(branchId) {
  const snapshot = await db.ref(`branch_orders/${branchId}`).once("value");
  const orders = snapshot.val() || {};

  // Extract all order IDs
  const orderIds = Object.keys(orders);

  // Find the highest existing number
  let maxNumber = 0;
  orderIds.forEach((id) => {
    const match = id.match(/^order(\d+)$/);
    if (match) {
      const num = parseInt(match[1]);
      if (num > maxNumber) maxNumber = num;
    }
  });

  return `order${maxNumber + 1}`;
}

/**
 * Shows loading state
 */
function showLoading(show) {
  const saveBtn = document.getElementById("saveOrderBtn");
  if (saveBtn) {
    saveBtn.disabled = show;
    saveBtn.textContent = show ? "Processing..." : "Save Order";
  }
}

/**
 * Shows success message
 */
function showSuccessMessage(message) {
  const alertDiv = document.createElement("div");
  alertDiv.className = "alert success";
  alertDiv.textContent = message;
  document.body.appendChild(alertDiv);
  setTimeout(() => alertDiv.remove(), 3000);
}

/**
 * Clean up real-time listeners
 */
function cleanupOrderListeners() {
  if (orderListListener) {
    db.ref(`branch_orders/${currentBranch}`).off("value", orderListListener);
    orderListListener = null;
  }
}

/* ============================================= */
/* ============ REPORTS SECTION ================ */
/* ============================================= */

/**
 * Shows the reports page and initializes the UI
 */
function loadReportPage() {
    const page = document.getElementById("page-reports");
    
    // Set up the page structure
    page.innerHTML = `
      <div class="reports-header">
        <h2>Branch Reports</h2>
      </div>
      <div class="report-controls">
        <div class="form-group">
          <label for="reportType">Report Type:</label>
          <select id="reportType">
            <option value="inventory">Inventory Report</option>
            <option value="supplier">Supplier Report</option>
            <option value="order">Order Report</option>
          </select>
        </div>
        <button class="generate-btn" onclick="generateReport()">
          <i class="fas fa-chart-bar"></i> Generate Report
        </button>
      </div>
      <div id="reportOutput"></div>
    `;
  
    // Initialize with empty output
    document.getElementById("reportOutput").innerHTML = 
      "<p>Select a report type and click 'Generate Report' to view data.</p>";
  }
  
  /**
   * Generates the selected report for the manager's branch
   */
  async function generateReport() {
    const reportType = document.getElementById("reportType").value;
    const reportOutput = document.getElementById("reportOutput");
    
    // Show loading state
    reportOutput.innerHTML = "<div class='loading-spinner'><i class='fas fa-spinner fa-spin'></i> Generating report...</div>";
  
    try {
      let snapshot;
      switch (reportType) {
        case "inventory":
          snapshot = await db.ref(`branch_inventory/${currentBranch}`).once("value");
          const inventoryData = snapshot.val();
          reportOutput.innerHTML = `
            <h3>Inventory Report - ${currentBranch}</h3>
            <div class="chart-container small">
              <canvas id="inventoryChart"></canvas>
            </div>
            ${formatInventoryReport(inventoryData)}
            <div class="export-buttons"></div>
          `;
          createInventoryChart(inventoryData);
          addExportButtons("inventory", inventoryData);
          break;
  
        case "supplier":
          snapshot = await db.ref(`branch_suppliers/${currentBranch}`).once("value");
          const supplierData = snapshot.val();
          reportOutput.innerHTML = `
            <h3>Supplier Report - ${currentBranch}</h3>
            <div class="chart-container bar-chart">
              <canvas id="supplierChart"></canvas>
            </div>
            ${formatSupplierReport(supplierData)}
            <div class="export-buttons"></div>
          `;
          createSupplierChart(supplierData);
          addExportButtons("supplier", supplierData);
          break;
  
        case "order":
          snapshot = await db.ref(`branch_orders/${currentBranch}`).once("value");
          const orderData = snapshot.val();
          reportOutput.innerHTML = `
            <h3>Order Report - ${currentBranch}</h3>
            <div class="chart-container pie-chart">
              <canvas id="orderChart"></canvas>
            </div>
            <div class="chart-container line-chart">
              <canvas id="orderTimelineChart"></canvas>
            </div>
            ${formatOrderReport(orderData)}
            <div class="export-buttons"></div>
          `;
          createOrderChart(orderData);
          createOrderTimelineChart(orderData);
          addExportButtons("order", orderData);
          break;
      }
    } catch (error) {
      console.error(`Error generating ${reportType} report:`, error);
      reportOutput.innerHTML = `
        <p class="error">Error generating report: ${error.message}</p>
        ${error.stack ? `<details><summary>Technical details</summary>${error.stack}</details>` : ""}
      `;
    }
  }
  
  /* ============ REPORT FORMATTING FUNCTIONS ============ */
  
  function formatInventoryReport(data) {
    if (!data) return "<p>No inventory data found</p>";
  
    const items = Object.entries(data).map(([id, item]) => ({
      id,
      ...item,
      status: item.stock <= item.minStock ? "Low Stock" : "OK",
      formattedExpiration: formatDisplayDate(item.expiration),
    }));
  
    return `
      <div class="report-summary">
        <p>Total Items: ${items.length}</p>
        <p>Low Stock Items: ${items.filter((i) => i.status === "Low Stock").length}</p>
      </div>
      <table class="report-table">
        <thead>
          <tr>
            <th>Item</th>
            <th>Stock</th>
            <th>Min Stock</th>
            <th>Status</th>
            <th>Expiration</th>
          </tr>
        </thead>
        <tbody>
          ${items.map((item) => `
            <tr class="${item.status === "Low Stock" ? "low-stock" : ""}">
              <td>${item.name}</td>
              <td>${item.stock}</td>
              <td>${item.minStock}</td>
              <td>${item.status}</td>
              <td>${item.formattedExpiration}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
  }
  
  function formatSupplierReport(data) {
    if (!data || Object.keys(data).length === 0) {
      return `
        <div class="empty-state">
          <i class="fas fa-box-open"></i>
          <p>No supplier data found for ${currentBranch}</p>
        </div>
      `;
    }
  
    const suppliers = Object.entries(data).map(([id, supplier]) => ({
      id,
      ...supplier,
      formattedProducts: supplier.products
        ? Object.keys(supplier.products).join(", ")
        : "No products",
    }));
  
    return `
      <table class="report-table">
        <thead>
          <tr>
            <th>Supplier</th>
            <th>Contact</th>
            <th>GCash</th>
            <th>Products</th>
          </tr>
        </thead>
        <tbody>
          ${suppliers.map((supplier) => `
            <tr>
              <td>${supplier.name}</td>
              <td>${supplier.contact}</td>
              <td>${supplier.gcash}</td>
              <td>${supplier.formattedProducts}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
  }
  
  function formatOrderReport(data) {
    if (!data) return "<p>No order data found</p>";
  
    const orders = Object.entries(data).map(([id, order]) => ({
      id,
      ...order,
      date: formatDisplayDate(new Date(order.timestamp)),
    }));
  
    // Calculate summary statistics
    const totalOrders = orders.length;
    const completedOrders = orders.filter(o => o.status === "Completed").length;
    const pendingOrders = orders.filter(o => o.status === "Pending").length;
    const totalSpent = orders.reduce((sum, order) => sum + (order.total || 0), 0);
  
    return `
      <div class="report-summary">
        <p>Total Orders: ${totalOrders}</p>
        <p>Completed Orders: ${completedOrders}</p>
        <p>Pending Orders: ${pendingOrders}</p>
        <p>Total Spent: ${totalSpent.toFixed(2)} PHP</p>
      </div>
      <table class="report-table">
        <thead>
          <tr>
            <th>Order ID</th>
            <th>Date</th>
            <th>Supplier</th>
            <th>Status</th>
            <th>Payment</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${orders.map((order) => `
            <tr>
              <td>${order.id}</td>
              <td>${order.date}</td>
              <td>${order.supplierName || order.supplierID}</td>
              <td>${order.status}</td>
              <td>${order.paymentStatus}</td>
              <td>${order.total ? order.total.toFixed(2) + " PHP" : "N/A"}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
  }
  
  /* ============ CHART GENERATION ============ */
  
  function createInventoryChart(data) {
    if (!data) return;
  
    const ctx = document.getElementById("inventoryChart");
  
    // Destroy previous chart if exists
    if (ctx.chart) {
      ctx.chart.destroy();
    }
  
    const items = Object.values(data);
    const lowStockItems = items.filter((item) => item.stock <= item.minStock).length;
    const healthyItems = items.length - lowStockItems;
  
    ctx.chart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: ["Low Stock", "Healthy Stock"],
        datasets: [{
          data: [lowStockItems, healthyItems],
          backgroundColor: ["rgba(255, 99, 132, 0.7)", "rgba(54, 162, 235, 0.7)"],
          borderWidth: 1,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: "Inventory Status Overview",
          },
        },
      },
    });
  }
  
  function createSupplierChart(data) {
    if (!data) return;
  
    const ctx = document.getElementById("supplierChart");
  
    // Destroy previous chart if exists
    if (ctx.chart) {
      ctx.chart.destroy();
    }
  
    const suppliers = Object.values(data);
    const productCounts = suppliers.map((supplier) =>
      supplier.products ? Object.keys(supplier.products).length : 0
    );
    const supplierNames = suppliers.map((supplier) => supplier.name);
  
    ctx.chart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: supplierNames,
        datasets: [{
          label: "Number of Products Supplied",
          data: productCounts,
          backgroundColor: "rgba(75, 192, 192, 0.7)",
          borderColor: "rgba(75, 192, 192, 1)",
          borderWidth: 1,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1,
              precision: 0,
            },
          },
        },
        plugins: {
          title: {
            display: true,
            text: "Products per Supplier",
            padding: {
              top: 0,
              bottom: 10,
            },
          },
        },
        layout: {
          padding: {
            top: 10,
            bottom: 10,
            left: 10,
            right: 10,
          },
        },
      },
    });
  }
  
  function createOrderChart(data) {
    if (!data) return;
  
    const ctx = document.getElementById("orderChart");
  
    // Destroy previous chart if exists
    if (ctx.chart) {
      ctx.chart.destroy();
    }
  
    const orders = Object.values(data);
    const statusCounts = orders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {});
  
    ctx.chart = new Chart(ctx, {
      type: "pie",
      data: {
        labels: Object.keys(statusCounts),
        datasets: [{
          data: Object.values(statusCounts),
          backgroundColor: [
            "rgba(255, 99, 132, 0.7)",
            "rgba(54, 162, 235, 0.7)",
            "rgba(255, 206, 86, 0.7)",
            "rgba(75, 192, 192, 0.7)",
            "rgba(153, 102, 255, 0.7)",
          ],
          borderWidth: 1,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: "Order Status Distribution",
            padding: {
              top: 0,
              bottom: 10,
            },
          },
        },
        layout: {
          padding: {
            top: 10,
            bottom: 10,
            left: 10,
            right: 10,
          },
        },
      },
    });
  }
  
  function createOrderTimelineChart(data) {
    if (!data) return;
  
    const ctx = document.getElementById("orderTimelineChart");
  
    // Destroy previous chart if exists
    if (ctx.chart) {
      ctx.chart.destroy();
    }
  
    const orders = Object.values(data);
    const monthlyData = orders.reduce((acc, order) => {
      const date = new Date(order.timestamp);
      const monthYear = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}`;
      acc[monthYear] = (acc[monthYear] || 0) + 1;
      return acc;
    }, {});
  
    const sortedMonths = Object.keys(monthlyData).sort();
    const monthNames = sortedMonths.map((monthStr) => {
      const [year, month] = monthStr.split("-");
      return new Date(year, month - 1).toLocaleString("default", {
        month: "short",
        year: "numeric",
      });
    });
  
    ctx.chart = new Chart(ctx, {
      type: "line",
      data: {
        labels: monthNames,
        datasets: [{
          label: "Orders per Month",
          data: sortedMonths.map((month) => monthlyData[month]),
          backgroundColor: "rgba(54, 162, 235, 0.2)",
          borderColor: "rgba(54, 162, 235, 1)",
          borderWidth: 2,
          tension: 0.1,
          fill: true,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: "Order Volume Over Time",
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1,
              precision: 0,
            },
          },
        },
      },
    });
  }
  
  /* ============ EXPORT FUNCTIONS ============ */
  
  function addExportButtons(reportType, data) {
    const buttonsDiv = document.querySelector(".export-buttons");
    buttonsDiv.innerHTML = "";
  
    // CSV Button
    const csvBtn = document.createElement("button");
    csvBtn.className = "export-btn";
    csvBtn.innerHTML = '<i class="fas fa-file-csv"></i> Export to CSV';
    csvBtn.addEventListener("click", () => exportToCSV(reportType, data));
    buttonsDiv.appendChild(csvBtn);
  
    // PDF Button (commented out as in original)
    // const pdfBtn = document.createElement("button");
    // pdfBtn.className = "export-btn";
    // pdfBtn.innerHTML = '<i class="fas fa-file-pdf"></i> Export to PDF';
    // pdfBtn.addEventListener("click", () => exportToPDF(reportType, data));
    // buttonsDiv.appendChild(pdfBtn);
  }
  
  function exportToCSV(reportType, data) {
    let csvContent = "";
  
    switch (reportType) {
      case "inventory":
        csvContent = "Name,Current Stock,Min Stock,Status,Expiration,Supplier\n";
        Object.values(data).forEach((item) => {
          const status = item.stock < item.minStock ? "Low Stock" : "OK";
          const formattedExpiration = formatDisplayDate(item.expiration);
          csvContent += `"${item.name}",${item.stock},${item.minStock},${status},"${formattedExpiration}","${item.supplier}"\n`;
        });
        break;
  
      case "supplier":
        csvContent = "Name,Contact,GCash,Products\n";
        Object.values(data).forEach((supplier) => {
          const products = supplier.products
            ? Object.keys(supplier.products).join(", ")
            : "No products";
          csvContent += `"${supplier.name}","${supplier.contact}","${supplier.gcash}","${products}"\n`;
        });
        break;
  
      case "order":
        csvContent = "Order ID,Date,Supplier,Status,Payment,Total,Products\n";
        Object.entries(data).forEach(([id, order]) => {
          const date = formatDisplayDate(new Date(order.timestamp));
          const products = order.products 
            ? Object.entries(order.products)
                .map(([name, details]) => {
                  const qty = typeof details === "object" ? details.quantity : details;
                  return `${name} (${qty})`;
                })
                .join(", ")
            : "No products";
          csvContent += `"${id}","${date}","${order.supplierName || order.supplierID}","${order.status}","${order.paymentStatus}","${order.total ? order.total.toFixed(2) : "0"}","${products}"\n`;
        });
        break;
    }
  
    // Create download link
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${reportType}_report_${currentBranch}_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }