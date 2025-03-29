/* 
This code is divided into sections:
1. INITIALIZATION SECTION
2. FIREBASE CONFIGURATION
3. UTILITY FUNCTIONS
4. PAGE MANAGEMENT
5. DASHBOARD SECTION
6. INVENTORY SECTION
7. SUPPLIER SECTION
8. ORDER SECTION
9. REPORTS SECTION
10. BRANCH SECTION
11. USER SECTION
12. SETTINGS MANAGEMENT
13. DATE UTILITIES
14. EVENT LISTENERS
*/

/* ============================================= */
/* ============ INITIALIZATION SECTION ========= */
/* ============================================= */

// Global variables
let currentBranch = null;
let branches = {};
let currentEditingSupplierId = null;
let currentEditingUserId = null;
let currentEditingBranchId = null;
let branchModalCreated = false;

// Expose functions to window
window.editBranch = editBranch;
window.deleteBranch = deleteBranch;

/* ============================================= */
/* ============ FIREBASE CONFIGURATION ========= */
/* ============================================= */

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

console.log("Firebase initialized with config:", firebaseConfig);

/* ============================================= */
/* ============ UTILITY FUNCTIONS ============== */
/* ============================================= */

/**
 * Product images mapping
 * Key: Product name
 * Value: Image path
 */

const imageMap = {
  "Adobo (Chicken)": "../images/adobo.jpg",
  "Bagnet (Ilocano)": "../images/bagnet.jpg",
  "Banana Cue": "../images/banana-cue.jpg",
  "Bangus (Boneless)": "../images/bangus.jpg",
  "Caldereta (Ready-to-Cook)": "../images/caldereta.jpg",
  "Empanada (Meat)": "../images/empanada.jpg",
  "Kare-kare (Oxtail)": "../images/kare-kare.jpg",
  "Longganisa (Ilocano)": "../images/longganisa.jpg",
  "Lumpia (Pork)": "../images/lumpia.jpg",
  "Menudo (Ready-to-Cook)": "../images/menudo.jpg",
  "Shrimp (Suahe)": "../images/shrimp.jpg",
  "Siomai (Shrimp)": "../images/siomai.jpg",
  "Siopao (Asado)": "../images/siopao.jpg",
  "Squid (Rings)": "../images/squid-rings.jpg",
  Turon: "../images/turon.jpg",
};

/**
 * Signs out the current user and redirects to the login page.
 * Removes the user role from local storage as part of the logout process.
 */
function signOut() {
  auth
    .signOut()
    .then(() => {
      localStorage.removeItem("userRole");
      window.location.href = "../login/login.html";
    })
    .catch((error) => {
      console.error("Sign out error:", error);
    });
}

/**
 * Helper function to create form groups
 */
function createFormGroup(id, labelText, inputType, isRequired = false) {
  const group = document.createElement("div");
  group.className = "form-group";

  const label = document.createElement("label");
  label.htmlFor = id;
  label.textContent = labelText;

  const input = document.createElement("input");
  input.type = inputType;
  input.id = id;
  if (isRequired) input.required = true;

  group.appendChild(label);
  group.appendChild(input);

  return group;
}

/* ============================================= */
/* ============ PAGE MANAGEMENT ================ */
/* ============================================= */

/**
 * Shows the specified page and hides others
 * @param {string} pageId - ID of the page to show
 */
async function showPage(pageId) {
  // Hide all pages and deactivate nav links
  document
    .querySelectorAll(".page")
    .forEach((page) => page.classList.remove("active"));
  document
    .querySelectorAll(".nav-list a")
    .forEach((link) => link.classList.remove("active"));

  // Activate selected page and nav link
  document.getElementById(`page-${pageId}`).classList.add("active");
  document.getElementById(`nav-${pageId}`).classList.add("active");
  document.getElementById("page-title").textContent =
    pageId.charAt(0).toUpperCase() + pageId.slice(1).replace("-", " ");

  // Load branches if needed
  if (pageId !== "branches" && Object.keys(branches).length === 0) {
    await loadBranches();
  }

  // Add branch selector to all pages except branches page
  if (pageId !== "branches") {
    addBranchSelector(pageId);
  }

  // Load page-specific content
  switch (pageId) {
    case "dashboard":
      loadDashboardPage();
      break;
    case "inventory":
      loadInventoryPage();
      break;
    case "suppliers":
      loadSupplierPage();
      break;
    case "orders":
      loadOrderPage();
      break;
    case "reports":
      loadReportPage();
      break;
    case "users":
      loadUserPage();
      break;
    case "branches":
      loadBranchPage();
      break;
    case "settings":
      loadSettingsPage();
      break;
  }
}

/* ============================================= */
/* =============== DASHBOARD SECTION =========== */
/* ============================================= */

/**
 * Loads dashboard page content including key metrics and recent data.
 * Displays low stock alerts, recent orders, and supplier performance.
 */
function loadDashboardPage() {
  const metrics = document.getElementById("dashboard-metrics");
  metrics.innerHTML = "<p>Loading metrics...</p>";

  if (!currentBranch) {
    metrics.innerHTML = "<p>Please select a branch first</p>";
    return;
  }

  Promise.all([
    db.ref(`branch_inventory/${currentBranch}`).once("value"),
    db.ref(`branch_orders/${currentBranch}`).once("value"),
    db.ref(`branch_suppliers/${currentBranch}`).once("value"),
  ])
    .then(([inventorySnap, ordersSnap, suppliersSnap]) => {
      const inventoryData = [];
      inventorySnap.forEach((child) => {
        const item = child.val();
        // Ensure numeric values and handle undefined minStock
        item.stock = typeof item.stock === "number" ? item.stock : 0;
        item.minStock = typeof item.minStock === "number" ? item.minStock : 0;
        inventoryData.push({ id: child.key, ...item });
      });

      // Improved low stock calculation (only counts if minStock > 0)
      const lowStockItems = inventoryData.filter(
        (item) => item.minStock > 0 && item.stock <= item.minStock
      );
      const lowStock = lowStockItems.length;

      const recentOrders = [];
      const ordersBySupplier = {};
      if (ordersSnap.val()) {
        ordersSnap.forEach((child) => {
          const order = child.val();
          order.id = child.key;

          // Process products - this is the key fix
          let productsInfo = "No products";
          if (order.products && typeof order.products === "object") {
            productsInfo = Object.entries(order.products)
              .map(([product, quantity]) => `${product} (${quantity})`)
              .join(", ");
          }

          recentOrders.push({
            ...order,
            productsInfo, // Add the formatted products string
          });

          const supplierId = order.supplierID;
          ordersBySupplier[supplierId] =
            (ordersBySupplier[supplierId] || 0) + 1;
        });
      }

      // Sort orders by timestamp (newest first) and take the last 3
      const recentOrdersList = recentOrders
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 3);

      const suppliers = suppliersSnap.val()
        ? Object.entries(suppliersSnap.val()).reduce((acc, [id, supplier]) => {
            acc[id] = supplier;
            return acc;
          }, {})
        : {};

      const supplierPerformance = suppliersSnap.val()
        ? Object.entries(suppliersSnap.val()).map(([id, s]) => ({
            name: s.name,
            orders: ordersBySupplier[id] || 0,
          }))
        : [];

      metrics.innerHTML = `
          <div class="metric-card">
            <h3>Low Stock Alerts</h3>
            <p>${lowStock} items</p>
            ${
              lowStock > 0
                ? `
              <div class="low-stock-details">
                <ul>
                  ${lowStockItems
                    .slice(0, 3)
                    .map(
                      (item) => `
                    <li>
                      <strong>${item.name}</strong>: 
                      ${item.stock} in stock (min: ${item.minStock})
                    </li>
                  `
                    )
                    .join("")}
                </ul>
              </div>
            `
                : ""
            }
          </div>
          <div class="metric-card">
            <h3>Recent Orders</h3>
            <ul>
              ${recentOrdersList
                .map(
                  (o) => `
                <li>
                  <strong>Order #${o.id}</strong><br>
                  Supplier: ${suppliers[o.supplierID]?.name || "Unknown"}<br>
                  Products: ${o.productsInfo}<br>
                  Status: ${o.status || "N/A"}<br>
                  Payment Status: ${o.paymentStatus || "N/A"}<br>
                  Date: ${
                    o.timestamp ? new Date(o.timestamp).toLocaleString() : "N/A"
                  }
                </li>
              `
                )
                .join("")}
            </ul>
          </div>
          <div class="metric-card">
            <h3>Supplier Performance</h3>
            <ul>${supplierPerformance
              .map((s) => `<li>${s.name}: ${s.orders} orders</li>`)
              .join("")}</ul>
          </div>
        `;
    })
    .catch((error) => {
      console.error("Error loading dashboard metrics:", error.message);
      metrics.innerHTML = `<p>Error loading metrics: ${error.message}</p>`;
    });
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
  if (!currentBranch) {
    document.getElementById("inventoryList").innerHTML =
      "<p>Please select a branch first</p>";
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
          image:
            branchItem.image ||
            imageMap[branchItem.name] ||
            "../images/default.png",
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
      // renderInventory(fallbackData, inventoryList, searchInput.value);
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
 * Creates HTML for viewing item details
 * @returns {string} HTML string for view mode
 */
function createViewMode(item) {
  return `
            <h3>${item.name}</h3>
            <div class="item-image">
                <img src="${item.image || "../images/default.png"}" alt="${
    item.name
  }">
            </div>
            <div class="item-info">
                <p><strong>Description:</strong> ${
                  item.description || "N/A"
                }</p>
                <p><strong>Current Stock:</strong> ${item.stock} kg</p>
                <p><strong>Minimum Stock:</strong> ${
                  item.minStock || "N/A"
                } kg</p>
                <p><strong>Supplier:</strong> ${item.supplier || "Unknown"}</p>
                <p><strong>Expiration Date:</strong> ${formatDisplayDate(
                  item.expiration
                )}</p>
            </div>
            <div class="item-actions">
                <button onclick="switchToEditMode('${item.id}')">Edit</button>
                <button onclick="document.getElementById('itemDetailsModal').style.display='none'">Close</button>
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
                    <input type="text" id="edit-name" value="${
                      item.name || ""
                    }" required>
                </div>
                <div class="form-group">
                    <label for="edit-description">Description:</label>
                    <textarea id="edit-description">${
                      item.description || ""
                    }</textarea>
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
                    <input type="text" id="edit-supplier" value="${
                      item.supplier || ""
                    }">
                </div>
                <div class="form-group">
                    <label for="edit-expiration">Expiration Date:</label>
                    <input type="date" id="edit-expiration" value="${formatDateForInput(
                      item.expiration
                    )}" required>
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
 * Shows detailed information about a specific inventory item.
 *
 * @param {string} itemId - The unique identifier of the inventory item
 */
function showItemDetails(itemId) {
  db.ref(`branch_inventory/${currentBranch}/${itemId}`)
    .once("value")
    .then((branchSnap) => {
      const branchItem = branchSnap.val() || {};
      const item = { ...branchItem, id: itemId };

      // Get or create the modal elements
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

      // Always set up the close button listener (in case modal was recreated)
      const closeButton = detailsModal.querySelector(".close-button");
      closeButton.onclick = function () {
        detailsModal.style.display = "none";
      };

      // Set up the outside click handler
      detailsModal.onclick = function (event) {
        if (event.target === detailsModal) {
          detailsModal.style.display = "none";
        }
      };

      // Prevent clicks inside modal content from closing the modal
      const modalContent = detailsModal.querySelector(".modal-content");
      modalContent.onclick = function (event) {
        event.stopPropagation();
      };

      if (item) {
        // Define the switching functions in the global scope
        window.switchToEditMode = function () {
          detailsContent.innerHTML = createEditMode(item);
        };

        window.switchToViewMode = function () {
          // Refresh the item data before showing view mode
          db.ref(`branch_inventory/${currentBranch}/${itemId}`)
            .once("value")
            .then((snap) => {
              const updatedItem = { ...snap.val(), id: itemId };
              detailsContent.innerHTML = createViewMode(updatedItem);
            });
        };

        // Render view mode by default
        detailsContent.innerHTML = createViewMode(item);

        // Show the modal
        detailsModal.style.display = "block";
      }
    })
    .catch((error) => {
      console.error("Error loading item details:", error);
      alert("Error loading item details. Please try again.");
    });
}

/**
 * Saves the updated item details to the database, using the given item ID.
 *
 * @param {string} itemId - The ID of the item to update
 *
 * @throws {Error} If any of the input fields are invalid
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
      // Use the existing image if available, or fallback to mapped/default image
      const existingImage = document
        .getElementById("editImagePreview")
        .querySelector("img");
      if (!existingImage || newName !== updateData.name) {
        updateData.image = imageMap[newName] || "../images/default.png";
      }
    }

    // Update branch-specific data
    await db
      .ref(`branch_inventory/${currentBranch}/${itemId}`)
      .update(updateData);

    console.log("Item updated successfully!");

    // Switch back to view mode and refresh
    const item = {
      id: itemId,
      ...updateData,
    };
    document.getElementById("itemDetailsContent").innerHTML =
      createViewMode(item);

    const currentPage = document
      .querySelector(".page.active")
      .id.replace("page-", "");
    if (currentPage === "inventory") {
      loadInventoryPage();
    }
  } catch (error) {
    console.error("Error updating item:", error.message);
    alert("Error updating item: " + error.message);
  }
}

/**
 * Uploads an image file to Firebase Storage and returns the download URL
 * @param {File} file - The image file to upload
 * @param {string} path - The storage path to upload to
 * @returns {Promise<string>} The download URL of the uploaded image
 */
async function uploadImageToStorage(file, path) {
  // Create a storage reference
  const storageRef = firebase.storage().ref(`${path}/${file.name}`);

  // Upload the file
  const snapshot = await storageRef.put(file);

  // Get the download URL
  const downloadURL = await snapshot.ref.getDownloadURL();

  return downloadURL;
}

/**
 * Renders inventory items to the UI based on the provided data.
 * Implements search filtering and highlights low stock or expired items.
 *
 * @param {Array} data - Array of inventory items to render
 * @param {HTMLElement} inventoryList - DOM element to render inventory items into
 * @param {HTMLElement} alerts - DOM element to display alerts
 * @param {string} searchTerm - Optional search term to filter items
 */
function renderInventory(data, inventoryList, searchTerm = "") {
  console.log("Rendering inventory with data:", data);

  // Filter data based on search term
  let filteredData = data.filter(
    (item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.description || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const currentDate = new Date();
  inventoryList.innerHTML = "";

  if (filteredData.length === 0) {
    inventoryList.innerHTML = "<p>No items match the search criteria.</p>";
    return;
  }

  // Separate items into categories
  const lowStockItems = filteredData.filter(
    (item) => item.stock <= (item.minStock || 0)
  );
  const expiredItems = filteredData.filter((item) => {
    const expDate = new Date(item.expiration);
    return !isNaN(expDate) && expDate < currentDate;
  });
  const normalItems = filteredData.filter(
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

    renderItemList(lowStockItems, lowStockSection, true, false); // Use renderItemList instead of createInventoryItemCard

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

    renderItemList(expiredItems, expiredSection, false, true); // Use renderItemList instead of createInventoryItemCard

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

    renderItemList(normalItems, normalSection, false, false); // Use renderItemList instead of createInventoryItemCard

    inventoryContainer.appendChild(normalSection);
  }
}
// Helper function to create inventory item cards
function createInventoryItemCard(item, isLowStock, isExpired) {
  const formattedExpiration = formatDisplayDate(item.expiration);
  const imageSrc = item.image || "../images/default.png";

  const itemElement = document.createElement("div");
  itemElement.className = `inventory-item-card ${
    isLowStock ? "low-stock" : ""
  } ${isExpired ? "expired" : ""}`;
  itemElement.innerHTML = `
            <img src="${imageSrc}" alt="${
    item.name
  }" class="inventory-item-image"
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
                <button class="delete" onclick="deleteItem('${
                  item.id
                }')">Delete</button>
            </div>
        `;
  return itemElement;
}

// TODO: Helper function to create order for low stock item
function createOrderForItem(itemId) {
  // Implement your order creation logic here
  console.log(`Creating order for item ${itemId}`);
  // You might want to open a modal or navigate to order page
  alert(`Dapat mapupunta sa order page`);
}

// Helper function to render item lists
function renderItemList(items, container, isLowStock, isExpired) {
  const gridContainer = document.createElement("div");
  gridContainer.className = "inventory-row inventory-normal-grid"; // Use the same grid class as in renderInventory
  container.appendChild(gridContainer);

  items.forEach((item) => {
    const formattedExpiration = formatDisplayDate(item.expiration);
    const imageSrc = item.image || "../images/default.png";

    const itemElement = document.createElement("div");
    itemElement.className = `inventory-item-card ${
      isLowStock ? "low-stock" : ""
    } ${isExpired ? "expired" : ""}`; // Use the same card class as in createInventoryItemCard
    itemElement.innerHTML = `
            <img src="${imageSrc}" alt="${
      item.name
    }" class="inventory-item-image"
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
                <button class="delete" onclick="deleteItem('${
                  item.id
                }')">Delete</button>
            </div>
          `;
    gridContainer.appendChild(itemElement);
  });
}

/**
 * Creates the modal for adding new inventory items dynamically and adds it to the DOM
 * @returns {void}
 */
function createItemModal() {
  const modalHTML = `
            <div id="itemModal" class="modal">
              <div class="modal-content">
                <span class="close-item-modal">&times;</span>
                <h2>Add New Inventory Item</h2>
                <form id="itemForm">
                  <div class="form-group">
                    <label for="itemName">Product Name:</label>
                    <input type="text" id="itemName" required>
                  </div>
                  <div class="form-group">
                    <label for="itemDescription">Description:</label>
                    <textarea id="itemDescription"></textarea>
                  </div>
                  <div class="form-group">
                    <label for="itemStock">Initial Stock (kg):</label>
                    <input type="number" id="itemStock" min="0" required>
                  </div>
                  <div class="form-group">
                    <label for="itemMinStock">Minimum Stock (kg):</label>
                    <input type="number" id="itemMinStock" min="0" required>
                  </div>
                  <div class="form-group">
                    <label for="itemSupplier">Supplier:</label>
                    <input type="text" id="itemSupplier">
                  </div>
                  <div class="form-group">
                    <label for="itemExpiration">Expiration Date:</label>
                    <input type="date" id="itemExpiration" required>
                  </div>
                  <div class="form-group">
                    <label for="itemImage">Product Image:</label>
                    <input type="file" id="itemImage" accept="image/*">
                    <small>Recommended size: 500x500 pixels (max 1MB)</small>
                    <div id="imagePreview" style="margin-top: 10px;"></div>
                  </div>
                  <div class="form-actions">
                    <button type="submit">Save Item</button>
                    <button type="button" id="cancelItem">Cancel</button>
                  </div>
                </form>
              </div>
            </div>
          `;

  document.body.insertAdjacentHTML("beforeend", modalHTML);

  // Add event listeners for closing the modal
  const modal = document.getElementById("itemModal");
  const closeButton = modal.querySelector(".close-item-modal");
  const cancelButton = modal.querySelector("#cancelItem");

  // Close modal when clicking X button
  closeButton.addEventListener("click", closeItemModal);

  // Close modal when clicking Cancel button
  cancelButton.addEventListener("click", closeItemModal);

  // Close modal when clicking outside the modal content
  modal.addEventListener("click", function (event) {
    if (event.target === modal) {
      closeItemModal();
    }
  });

  // Prevent clicks inside modal content from closing the modal
  const modalContent = modal.querySelector(".modal-content");
  modalContent.addEventListener("click", function (event) {
    event.stopPropagation();
  });

  // Add form submission handler
  document
    .getElementById("itemForm")
    .addEventListener("submit", handleItemSubmit);

  // Add image preview and size validation
  document.getElementById("itemImage").addEventListener("change", function (e) {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (max 1MB)
      if (file.size > 1024 * 1024) {
        alert("Image size should be less than 1MB");
        this.value = ""; // Clear the file input
        return;
      }

      const reader = new FileReader();
      reader.onload = function (event) {
        const preview = document.getElementById("imagePreview");
        preview.innerHTML = `<img src="${event.target.result}" style="max-width: 200px; max-height: 200px;">`;
      };
      reader.readAsDataURL(file);
    }
  });
}

function closeItemModal() {
  document.getElementById("itemModal").style.display = "none";
  document.getElementById("itemForm").reset();
}

function showItemModal() {
  // Create modal if it doesn't exist
  if (!document.getElementById("itemModal")) {
    createItemModal();
  }

  // Set today's date as default expiration date
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("itemExpiration").value = today;

  document.getElementById("itemModal").style.display = "block";
  document.getElementById("itemName").focus();
}

/**
 * Adds a new inventory item to the database.
 * Prompts user for item details and saves to Firebase. (This uses dialog boxes)
 */
function addItem() {
  if (!currentBranch) {
    alert("Please select a branch first");
    return;
  }

  showItemModal();
}

/**
 * Handles the submission of the item form, adds the new item to the database and refreshes the inventory page
 * @param {Event} e The submit event
 * @returns {Promise<void>}
 */
async function handleItemSubmit(e) {
  e.preventDefault();

  const name = document.getElementById("itemName").value.trim();
  const description = document.getElementById("itemDescription").value.trim();
  const stock = parseInt(document.getElementById("itemStock").value);
  const minStock = parseInt(document.getElementById("itemMinStock").value);
  const supplier = document.getElementById("itemSupplier").value.trim();
  const expiration = document.getElementById("itemExpiration").value;
  const imageFile = document.getElementById("itemImage").files[0];

  if (!name || isNaN(stock) || isNaN(minStock) || !expiration) {
    alert("Please fill in all required fields with valid data.");
    return;
  }

  const saveBtn = e.target.querySelector('button[type="submit"]');
  saveBtn.disabled = true;
  saveBtn.textContent = "Saving...";

  try {
    // Get the next sequential ID
    const newItemId = await getNextItemId(currentBranch);

    // Default to the mapped image or default image if no file is uploaded
    let imageData = imageMap[name] || "../images/default.png";

    // If an image file was uploaded, convert to Base64
    if (imageFile) {
      imageData = await convertImageToBase64(imageFile);
    }

    const itemData = {
      name,
      description: description || "",
      stock,
      minStock,
      supplier: supplier || "Unknown",
      expiration,
      image: imageData,
      timestamp: firebase.database.ServerValue.TIMESTAMP,
    };

    await db
      .ref(`branch_inventory/${currentBranch}/${newItemId}`)
      .set(itemData);

    console.log("Item added successfully with ID:", newItemId);
    closeItemModal();
    loadInventoryPage();
  } catch (error) {
    console.error("Error adding item:", error.message);
    alert("Error adding item: " + error.message);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "Save Item";
  }
}

function convertImageToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

async function getNextItemId(branchId) {
  const snapshot = await db.ref(`branch_inventory/${branchId}`).once("value");
  const items = snapshot.val() || {};

  // Extract all item IDs
  const itemIds = Object.keys(items);

  // Find the highest existing number
  let maxNumber = 0;
  itemIds.forEach((id) => {
    const match = id.match(/^item(\d+)$/);
    if (match) {
      const num = parseInt(match[1]);
      if (num > maxNumber) maxNumber = num;
    }
  });

  return `item${maxNumber + 1}`;
}

/* ============================================= */
/* ============ SUPPLIER SECTION =============== */
/* ============================================= */

/**
 * Loads supplier information from Firebase (both global and branch-specific)
 * and displays merged results. Falls back to a default message if no suppliers are found.
 */
function loadSupplierPage() {
    const supplierList = document.getElementById("supplierList");
  
    if (!currentBranch) {
      supplierList.innerHTML = "<p>Please select a branch first</p>";
      return;
    }
  
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
            let productsHtml = "<strong>Products:</strong><ul>";
            if (supplier.products) {
              if (typeof supplier.products === 'string') {
                // Legacy format (comma-separated string)
                productsHtml += `<li>${supplier.products.replace(/,/g, '</li><li>')}</li>`;
              } else {
                // New format (object with prices)
                for (const [productName, productData] of Object.entries(supplier.products)) {
                  productsHtml += `<li>${productName} - ${productData.price.toFixed(2)} PHP per kg</li>`;
                }
              }
            } else {
              productsHtml += "<li>N/A</li>";
            }
            productsHtml += "</ul>";
  
            div.innerHTML = `
              <div>
                <strong>${supplier.name}</strong><br><br>
                <strong>Contact:</strong> ${supplier.contact || "N/A"}<br>
                <strong>GCash:</strong> ${supplier.gcash || "N/A"}<br>
                ${
                  supplier.gcashQR
                    ? `<img src="${supplier.gcashQR}" style="max-width: 100px; display: block; margin: 5px 0;">`
                    : ""
                }
                ${productsHtml}
              </div>
              <div class="actions">
                <button onclick="editSupplier('${supplier.id}')">Edit</button>
                <button onclick="deleteSupplier('${supplier.id}')">Delete</button>
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
  document.getElementById("supplierModalTitle").textContent =
    "Add New Supplier";
  document.getElementById("saveSupplierBtn").textContent = "Save Supplier";
  document.getElementById("supplierForm").reset();
  document.getElementById("supplierModal").style.display = "block";
  document.getElementById("supplierName").focus();
}
/**
 * Edits an existing supplier in the database.
 * Prompts user for updated supplier details and saves changes.
 *
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
          if (typeof supplier.products === 'string') {
            // Legacy format (comma-separated string)
            const productNames = supplier.products.split(',').map(p => p.trim());
            productNames.forEach(name => {
              if (name) addProductEntry(name, '');
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
          document.getElementById("qrCodePreview").innerHTML = 
            `<img src="${supplier.gcashQR}" style="max-width: 200px;">`;
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

function deleteSupplier(id) {
  if (confirm("Are you sure you want to delete this supplier?")) {
    db.ref(`branch_suppliers/${currentBranch}/${id}`)
      .remove()
      .then(() => {
        console.log("Supplier deleted successfully");
      })
      .catch((error) => {
        console.error("Error deleting supplier:", error);
        alert("Failed to delete supplier. Please try again.");
      });
  }
}
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
    document.getElementById('addProductBtn').addEventListener('click', addProductEntry);
  
  
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
  
  
  
function addProductEntry(productName = '', price = '') {
    const productEntries = document.getElementById('productEntries');
    const productId = Date.now(); // Unique ID for each product entry
    
    const productEntry = document.createElement('div');
    productEntry.className = 'product-entry';
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
    productEntry.querySelector('.remove-product').addEventListener('click', function() {
      productEntries.removeChild(productEntry);
    });
}
function showSupplierModal() {
  document.getElementById("supplierModal").style.display = "block";
  document.getElementById("supplierName").focus();
}
function closeSupplierModal() {
  document.getElementById("supplierModal").style.display = "none";
  document.getElementById("supplierForm").reset();
  document.getElementById("supplierModalTitle").textContent =
    "Add New Supplier";
  document.getElementById("saveSupplierBtn").textContent = "Save Supplier";
  currentEditingSupplierId = null;
}
/**
 * Handles the submission of the supplier form.
 * @param {Event} e - The form submission event.
 * @returns {void}
 * @description
 * Prevents the default form submission behavior and validates the form fields.
 * If all fields are valid, it creates a new supplier reference under the current
 * branch and saves the supplier data. If the save is successful, it closes the
 * supplier modal and refreshes the supplier list. If there's an error, it shows
 * an alert with the error message.
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
      alert("Please select a branch first.");
      return;
    }
  
    // Collect product data
    const productEntries = document.querySelectorAll('.product-entry');
    const products = {};
    
    let hasEmptyProducts = false;
    productEntries.forEach(entry => {
      const name = entry.querySelector('.product-name').value.trim();
      const price = parseFloat(entry.querySelector('.product-price').value);
      
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
        qrCodeBase64 = await convertImageToBase64(qrCodeFile);
      } else if (currentEditingSupplierId) {
        const snapshot = await db
          .ref(`branch_suppliers/${currentBranch}/${currentEditingSupplierId}/gcashQR`)
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

async function uploadQRCode(file, supplierId) {
  return new Promise((resolve, reject) => {
    const storageRef = firebase.storage().ref();
    const fileRef = storageRef.child(
      `suppliers/${currentBranch}/${supplierId}/gcash_qr_${Date.now()}`
    );

    const uploadTask = fileRef.put(file);

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        // Progress monitoring if needed
      },
      (error) => {
        console.error("Upload failed:", error);
        reject(error);
      },
      () => {
        uploadTask.snapshot.ref.getDownloadURL().then((downloadURL) => {
          resolve(downloadURL);
        });
      }
    );
  });
}

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

/* ============================================= */
/* ============ ORDER DISPLAY FUNCTIONS ======== */
/* ============================================= */

/**
 * Loads and displays orders with real-time updates
 */
function loadOrderPage() {
  if (!currentBranch) {
    document.getElementById("orderList").innerHTML =
      "<p>Please select a branch first</p>";
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

/**
 * Creates an order list item element
 */
/**
 * Creates an order list item element
 */
function createOrderListItem(id, order) {
  const div = document.createElement("div");
  div.className = "order-item";
  div.innerHTML = `
            <div>
                <strong>Order ID: </strong>${id}<br>
                <strong>Supplier: </strong>${
                  order.supplierName || order.supplierID
                }<br>
                <strong>Products: </strong>${formatOrderProducts(
                  order.products
                )}<br>
                <strong>Status: </strong>${order.status || "Pending"}<br>
                <strong>Payment Status: </strong>${
                  order.paymentStatus || "Pending"
                }<br>
                <strong>Timestamp: </strong>${
                  order.timestamp
                    ? new Date(order.timestamp).toLocaleString()
                    : "N/A"
                }
            </div>
            <div class="actions">
                <button onclick="viewOrderDetails('${id}')">View Details</button>
                ${
                  order.paymentStatus === "Pending" &&
                  order.status === "Pending"
                    ? `<button onclick="showPaymentModal('${id}', '${order.supplierID}')">Pay</button>`
                    : ""
                }
                <button onclick="editOrder('${id}')">Edit</button>
                <button onclick="deleteOrder('${id}')">Delete</button>
            </div>
        `;
  return div;
}
/**
 * Formats order products for display
 */
function formatOrderProducts(products) {
  if (!products) return "N/A";
  return Object.entries(products)
    .map(([product, quantity]) => `${product} (${quantity})`)
    .join(", ");
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
                </div>
            </div>`;
    document.body.insertAdjacentHTML("beforeend", modalHTML);

    // Initialize modal close button
    document
      .querySelector(".close-details-modal")
      .addEventListener("click", () => {
        document.getElementById("orderDetailsModal").style.display = "none";
      });

    // Add click handler to close modal when clicking outside content
    document
      .getElementById("orderDetailsModal")
      .addEventListener("click", function (e) {
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
                    <strong>Supplier:</strong> ${
                      order.supplierName || order.supplierID
                    }
                </div>
                <div class="order-detail">
                    <strong>Status:</strong> ${order.status || "Pending"}
                </div>
                <div class="order-detail">
                    <strong>Payment Status:</strong> ${
                      order.paymentStatus || "Pending"
                    }
                </div>
                <div class="order-detail">
                    <strong>Date:</strong> ${
                      order.timestamp
                        ? new Date(order.timestamp).toLocaleString()
                        : "N/A"
                    }
                </div>
                <div class="order-detail">
                    <strong>Products:</strong>
                    <ul class="order-products-list">`;

      // Add each product to the list
      if (order.products) {
        Object.entries(order.products).forEach(([product, quantity]) => {
          detailsHTML += `<li>${product} - ${quantity}</li>`;
        });
      } else {
        detailsHTML += `<li>No products found</li>`;
      }

      detailsHTML += `</ul></div>`;

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
      alert("Please select a branch first");
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
  document.getElementById("orderStatus").value = order.status || "Pending";
  document.getElementById("orderPaymentStatus").value =
    order.paymentStatus || "Pending";
  document.getElementById("orderForm").dataset.editId = orderId;
  document.getElementById("orderForm").dataset.originalSupplier =
    originalSupplierId;

  // Load products for the supplier
  loadSupplierProducts(originalSupplierId)
    .then(() => {
      if (order.products) {
        currentOrderItems = Object.entries(order.products).map(
          ([product, quantity]) => ({
            product,
            quantity: parseInt(quantity),
          })
        );
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
            
            <div id="productSelectionGroup" class="form-group" style="display: none;">
              <label for="orderProduct">Product:</label>
              <select id="orderProduct" disabled>
                <option value="">-- Select Product --</option>
              </select>
            </div>
            
            <div id="quantityGroup" class="form-group" style="display: none;">
              <label for="orderQuantity">Quantity:</label>
              <input type="number" id="orderQuantity" min="1" value="1" disabled>
            </div>
            
            <div class="form-group">
              <button type="button" id="addProductBtn">Add Product</button>
            </div>
            
            <div id="orderItemsContainer"></div>
            
            <div class="form-group">
              <label for="orderStatus">Status:</label>
              <select id="orderStatus">
                <option value="Pending">Pending</option>
                <option value="Processing">Processing</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
            
            <div class="form-group">
              <label for="orderPaymentStatus">Payment Status:</label>
              <select id="orderPaymentStatus">
                <option value="Pending">Pending</option>
                <option value="Paid">Paid</option>
              </select>
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
  orderForm.addEventListener("submit", function (e) {
    e.preventDefault();
    const orderId = this.dataset.editId;
    orderId ? handleOrderUpdate(orderId) : handleOrderSubmit(e);
  });

  orderSupplier?.addEventListener("change", function () {
    // Get the original supplier from the form data
    const originalSupplier = orderForm.dataset.originalSupplier;
    const isEditing = !!orderForm.dataset.editId;

    // If we're editing and the supplier is being changed from the original
    if (isEditing && this.value !== originalSupplier) {
      if (
        !confirm(
          "Changing the supplier will clear your current order items. Continue?"
        )
      ) {
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

  orderProduct?.addEventListener("change", function () {
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
  orderModal.addEventListener("click", function (e) {
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
  
    // Show product selection if items exist
    const productGroup = document.getElementById("productSelectionGroup");
    const quantityGroup = document.getElementById("quantityGroup");
    
    if (productGroup && quantityGroup) {
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

  // Check if all products belong to the selected supplier
  const invalidProducts = currentOrderItems.filter(
    (item) => !selectedSupplierProducts.includes(item.product)
  );

  if (invalidProducts.length > 0) {
    alert("All products must belong to the selected supplier");
    return false;
  }

  return true;
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
      document.getElementById("supplierContact").textContent =
        supplier.contact || "N/A";
      document.getElementById("supplierGcash").textContent =
        supplier.gcash || "N/A";

      // Handle GCash QR code
      const gcashImageContainer = document.getElementById(
        "gcashImageContainer"
      );
      if (supplier.gcashQR) {
        gcashImageContainer.innerHTML = `<img src="${supplier.gcashQR}" alt="GCash QR Code" style="max-width: 200px;">`;
      } else {
        gcashImageContainer.innerHTML = "<p>No GCash QR code available</p>";
      }

      // Handle payment proof image
      const paymentProofContainer = document.getElementById(
        "paymentProofContainer"
      );
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

  paymentModal.addEventListener("click", function (e) {
    if (e.target === this) closePaymentModal();
  });
  document
    .getElementById("paymentProof")
    .addEventListener("change", function (e) {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function (event) {
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

/**
 * Loads the GCash image for a supplier
 */
function loadGcashImage(supplierId) {
  const imageContainer = document.getElementById("gcashImageContainer");

  db.ref(`branch_suppliers/${currentBranch}/${supplierId}/gcashQR`)
    .once("value")
    .then((snapshot) => {
      const imageData = snapshot.val();
      if (imageData) {
        imageContainer.innerHTML = `<img src="${imageData}" alt="GCash QR Code" style="max-width: 200px;">`;
      } else {
        imageContainer.innerHTML = "<p>No GCash QR code available</p>";
      }
    })
    .catch((error) => {
      console.error("Error loading GCash QR code:", error);
      imageContainer.innerHTML = "<p>Error loading QR code</p>";
    });
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
    return;
  }

  const list = document.createElement("ul");
  list.className = "order-items-list";

  currentOrderItems.forEach((item, index) => {
    const li = document.createElement("li");
    li.className = "order-item-row";
    li.innerHTML = `
            <span class="product-name">${item.product}</span>
            <span class="product-quantity">${item.quantity}</span>
            <button onclick="removeOrderItem(${index})" class="remove-item-btn">×</button>
        `;
    list.appendChild(li);
  });

  container.appendChild(list);

  // Update save button state
  const saveBtn = document.getElementById("saveOrderBtn");
  if (saveBtn) {
    saveBtn.disabled = currentOrderItems.length === 0;
  }
}

/**
 * Creates HTML list of order items
 */
function createOrderItemsList() {
  const list = document.createElement("ul");
  currentOrderItems.forEach((item, index) => {
    const li = document.createElement("li");
    li.innerHTML = `
            ${item.product} - ${item.quantity}
            <button onclick="removeOrderItem(${index})" class="remove-item-btn">×</button>
        `;
    list.appendChild(li);
  });
  return list;
}

/**
 * Adds product to current order items
 */
function addProductToOrder() {
  const productSelect = document.getElementById("orderProduct");
  const quantityInput = document.getElementById("orderQuantity");

  const product = productSelect.value;
  const quantity = parseInt(quantityInput.value);

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

  // Reset selection (but don't clear if we want to add same product again)
  productSelect.value = "";
  quantityInput.value = "";
  quantityInput.disabled = true;
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
      supplierSelect.innerHTML =
        '<option value="">-- Select Supplier --</option>';

      if (snapshot.exists()) {
        snapshot.forEach((child) => {
          const supplier = child.val();
          supplierSelect.innerHTML += `<option value="${child.key}">${supplier.name}</option>`;
        });
      } else {
        supplierSelect.innerHTML =
          '<option value="">No suppliers available</option>';
      }
    })
    .catch((error) => {
      console.error("Error loading suppliers:", error);
      supplierSelect.innerHTML =
        '<option value="">Error loading suppliers</option>';
    });
}

/**
 * Loads products for selected supplier
 * @param {string} supplierId - The ID of the supplier
 * @returns {Promise} A promise that resolves when products are loaded
 */
function loadSupplierProducts(supplierId) {
  return new Promise((resolve, reject) => {
    currentSupplierId = supplierId;

    const productSelect = document.getElementById("orderProduct");
    const productGroup = document.getElementById("productSelectionGroup");
    const quantityGroup = document.getElementById("quantityGroup");

    // Reset product selection
    productSelect.innerHTML = '<option value="">-- Select Product --</option>';
    productSelect.disabled = true;
    document.getElementById("orderQuantity").value = "";

    if (!supplierId) {
      productGroup.style.display = "none";
      quantityGroup.style.display = "none";
      resolve(); // Resolve even when no supplier is selected
      return;
    }

    productGroup.style.display = "block";
    productSelect.innerHTML = '<option value="">Loading products...</option>';

    db.ref(`branch_suppliers/${currentBranch}/${supplierId}`)
      .once("value")
      .then((snapshot) => {
        const supplier = snapshot.val();
        if (!supplier || !supplier.products) {
          productSelect.innerHTML =
            '<option value="">No products found</option>';
          resolve();
          return;
        }

        selectedSupplierProducts = supplier.products
          .split(",")
          .map((p) => p.trim());
        productSelect.innerHTML =
          '<option value="">-- Select Product --</option>';
        selectedSupplierProducts.forEach((product) => {
          productSelect.innerHTML += `<option value="${product}">${product}</option>`;
        });

        productSelect.disabled = false;
        quantityGroup.style.display = "block";
        resolve();
      })
      .catch((error) => {
        console.error("Error loading supplier products:", error);
        productSelect.innerHTML =
          '<option value="">Error loading products</option>';
        reject(error); // Reject the promise on error
      });
  });
}

function loadSupplierProductsWithRetry(supplierId, retries = 3) {
  return loadSupplierProducts(supplierId).catch((error) => {
    if (retries > 0) {
      console.log(`Retrying... ${retries} attempts left`);
      return loadSupplierProductsWithRetry(supplierId, retries - 1);
    }
    throw error;
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

  const supplierId = document.getElementById("orderSupplier").value;
  const status = document.getElementById("orderStatus").value;
  const paymentStatus = document.getElementById("orderPaymentStatus").value;

  // Validate form (won't check product/quantity fields)
  if (!validateOrderForm(supplierId, status, paymentStatus)) {
    return;
  }

  const saveBtn = document.getElementById("saveOrderBtn");
  saveBtn.disabled = true;
  saveBtn.textContent = "Saving...";

  try {
    // Get supplier name for display
    const supplierSnap = await db
      .ref(`branch_suppliers/${currentBranch}/${supplierId}`)
      .once("value");
    const supplierName = supplierSnap.val()?.name || supplierId;

    // Format products as an object {productName: quantity}
    const products = {};
    currentOrderItems.forEach((item) => {
      products[item.product] = item.quantity;
    });

    // Get the next sequential ID
    const newOrderId = await getNextOrderId(currentBranch);
    const timestamp = new Date().toISOString();

    const orderData = {
      supplierID: supplierId,
      supplierName,
      products,
      status,
      paymentStatus,
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
  const originalSupplier =
    document.getElementById("orderForm").dataset.originalSupplier;

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
 * Saves new order to database
 */
async function saveOrder(orderId, supplierId, status, paymentStatus) {
  const supplierSnap = await db
    .ref(`branch_suppliers/${currentBranch}/${supplierId}`)
    .once("value");
  const supplierName = supplierSnap.val()?.name || supplierId;

  const products = {};
  currentOrderItems.forEach((item) => {
    products[item.product] = item.quantity;
  });

  const orderData = {
    supplierID: supplierId,
    supplierName,
    products,
    status,
    paymentStatus,
    timestamp: new Date().toISOString(),
  };

  await db.ref(`branch_orders/${currentBranch}/${orderId}`).set(orderData);
}

/**
 * Updates existing order in database
 */
async function updateOrder(orderId, supplierId, status, paymentStatus) {
  const supplierSnap = await db
    .ref(`branch_suppliers/${currentBranch}/${supplierId}`)
    .once("value");
  const supplierName = supplierSnap.val()?.name || supplierId;

  const products = {};
  currentOrderItems.forEach((item) => {
    products[item.product] = item.quantity;
  });

  const updateData = {
    supplierID: supplierId,
    supplierName,
    products,
    status,
    paymentStatus,
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
  const orderIds = Object.keys(orders);

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

function showProductLoading(show) {
  const productSelect = document.getElementById("orderProduct");
  if (productSelect) {
    productSelect.disabled = show;
    if (show) {
      productSelect.innerHTML = '<option value="">Loading...</option>';
    }
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
 * Fetches data from Firebase using Firebase SDK
 * @param {string} path - Database path (e.g. 'branch_inventory/branch1')
 * @returns {Promise} Promise with the data
 */
// Replace your fetchFirebaseData function with:
async function fetchFirebaseData(path) {
  try {
    const snapshot = await db.ref(path).once("value");
    return snapshot.val();
  } catch (error) {
    console.error("Error fetching data:", error);
    throw error;
  }
}

function loadReportPage() {
  const reportOutput = document.getElementById("reportOutput");
  reportOutput.innerHTML =
    "<p>Select a report type and generate to view details.</p>";
}

async function generateReport() {
  const reportType = document.getElementById("reportType").value;
  const reportOutput = document.getElementById("reportOutput");
  reportOutput.innerHTML = "<p>Generating report...</p>";

  try {
    let snapshot;
    switch (reportType) {
      case "inventory":
        snapshot = await db
          .ref(`branch_inventory/${currentBranch}`)
          .once("value");
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
        addExportButtons("inventory", inventoryData, reportOutput);
        break;

      case "supplier":
        snapshot = await db
          .ref(`branch_suppliers/${currentBranch}`)
          .once("value");
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
        addExportButtons("supplier", supplierData, reportOutput);
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
        addExportButtons("order", orderData, reportOutput);
        break;
    }
  } catch (error) {
    console.error(`Error generating ${reportType} report:`, error);
    reportOutput.innerHTML = `
        <p class="error">Error generating report: ${error.message}</p>
        ${
          error.stack
            ? `<details><summary>Technical details</summary>${error.stack}</details>`
            : ""
        }
      `;
  }
}
function addExportButtons(reportType, data, container) {
  const buttonsDiv = container.querySelector(".export-buttons");

  // CSV Button
  const csvBtn = document.createElement("button");
  csvBtn.textContent = "Export to CSV";
  csvBtn.addEventListener("click", () => exportToCSV(reportType, data));
  buttonsDiv.appendChild(csvBtn);

//   // PDF Button
//   const pdfBtn = document.createElement("button");
//   pdfBtn.textContent = "Export to PDF";
//   pdfBtn.addEventListener("click", () => exportToPDF(reportType, data));
//   buttonsDiv.appendChild(pdfBtn);
}

/* ============ REPORT FORMATTING FUNCTIONS ============ */

function formatInventoryReport(data) {
    if (!data) return "<p>No inventory data found</p>";
  
    const items = Object.entries(data).map(([id, item]) => ({
      id,
      ...item,
      status: item.stock <= item.minStock ? "Low Stock" : "OK",
      formattedExpiration: formatDisplayDate(item.expiration) // Use your display formatter
    }));
  
    return `
        <div class="report-summary">
          <p>Total Items: ${items.length}</p>
          <p>Low Stock Items: ${
            items.filter((i) => i.status === "Low Stock").length
          }</p>
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
            ${items
              .map(
                (item) => `
              <tr class="${item.status === "Low Stock" ? "low-stock" : ""}">
                <td>${item.name}</td>
                <td>${item.stock}</td>
                <td>${item.minStock}</td>
                <td>${item.status}</td>
                <td>${item.formattedExpiration}</td>
              </tr>
            `
              )
              .join("")}
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
          ${suppliers
            .map(
              (supplier) => `
            <tr>
              <td>${supplier.name}</td>
              <td>${supplier.contact}</td>
              <td>${supplier.gcash}</td>
              <td>${supplier.products}</td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    `;
}

function formatOrderReport(data) {
    if (!data) return "<p>No order data found</p>";
  
    const orders = Object.entries(data).map(([id, order]) => ({
      id,
      ...order,
      date: formatDisplayDate(new Date(order.timestamp)) // Use your display formatter
    }));
  
    return `
        <table class="report-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Date</th>
              <th>Supplier</th>
              <th>Status</th>
              <th>Payment</th>
            </tr>
          </thead>
          <tbody>
            ${orders
              .map(
                (order) => `
              <tr>
                <td>${order.id}</td>
                <td>${order.date}</td>
                <td>${order.supplierName}</td>
                <td>${order.status}</td>
                <td>${order.paymentStatus}</td>
              </tr>
            `
              )
              .join("")}
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
  const lowStockItems = items.filter(
    (item) => item.stock <= item.minStock
  ).length;
  const healthyItems = items.length - lowStockItems;

  ctx.chart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Low Stock", "Healthy Stock"],
      datasets: [
        {
          data: [lowStockItems, healthyItems],
          backgroundColor: [
            "rgba(255, 99, 132, 0.7)",
            "rgba(54, 162, 235, 0.7)",
          ],
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false, // Important
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
  
    const ctx = document.getElementById('supplierChart');
    
    // Destroy previous chart if exists
    if (ctx.chart) {
      ctx.chart.destroy();
    }
  
    const suppliers = Object.values(data);
    const productCounts = suppliers.map(supplier => 
      supplier.products ? supplier.products.split(',').length : 0
    );
    const supplierNames = suppliers.map(supplier => supplier.name);
  
    ctx.chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: supplierNames,
        datasets: [{
          label: 'Number of Products Supplied',
          data: productCounts,
          backgroundColor: 'rgba(75, 192, 192, 0.7)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1,
              precision: 0
            }
          }
        },
        plugins: {
          title: {
            display: true,
            text: 'Products per Supplier',
            padding: {
              top: 0,
              bottom: 10
            }
          }
        },
        layout: {
          padding: {
            top: 10,
            bottom: 10,
            left: 10,
            right: 10
          }
        }
      }
    });
  }
  
  function createOrderChart(data) {
    if (!data) return;
  
    const ctx = document.getElementById('orderChart');
    
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
      type: 'pie',
      data: {
        labels: Object.keys(statusCounts),
        datasets: [{
          data: Object.values(statusCounts),
          backgroundColor: [
            'rgba(255, 99, 132, 0.7)',
            'rgba(54, 162, 235, 0.7)',
            'rgba(255, 206, 86, 0.7)',
            'rgba(75, 192, 192, 0.7)',
            'rgba(153, 102, 255, 0.7)'
          ],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Order Status Distribution',
            padding: {
              top: 0,
              bottom: 10
            }
          }
        },
        layout: {
          padding: {
            top: 10,
            bottom: 10,
            left: 10,
            right: 10
          }
        }
      }
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
    const monthYear = `${date.getFullYear()}-${(date.getMonth() + 1)
      .toString()
      .padStart(2, "0")}`;
    acc[monthYear] = (acc[monthYear] || 0) + 1;
    return acc;
  }, {});

  const sortedMonths = Object.keys(monthlyData).sort();
  const monthNames = sortedMonths.map((monthStr) => {
    // Changed parameter name from 'month' to 'monthStr'
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
      datasets: [
        {
          label: "Orders per Month",
          data: sortedMonths.map((month) => monthlyData[month]),
          backgroundColor: "rgba(54, 162, 235, 0.2)",
          borderColor: "rgba(54, 162, 235, 1)",
          borderWidth: 2,
          tension: 0.1,
          fill: true,
        },
      ],
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

function exportToCSV(reportType, data) {
  let csvContent = "";

  switch (reportType) {
    case "inventory":
      csvContent = "Name,Current Stock,Min Stock,Status,Expiration,Supplier\n";
      Object.values(data).forEach(item => {
        const status = item.stock < item.minStock ? 'Low Stock' : 'OK';
        const formattedExpiration = formatDisplayDate(item.expiration); // Use display formatter
        csvContent += `"${item.name}",${item.stock},${item.minStock},${status},"${formattedExpiration}","${item.supplier}"\n`;
      });
      break;

    case "supplier":
      csvContent = "Name,Contact,GCash,Products\n";
      Object.values(data).forEach((supplier) => {
        csvContent += `"${supplier.name}","${supplier.contact}","${supplier.gcash}","${supplier.products}"\n`;
      });
      break;

      case "order":
        csvContent = "Order ID,Date,Supplier,Status,Payment,Products\n";
        Object.entries(data).forEach(([id, order]) => {
          const date = formatDisplayDate(new Date(order.timestamp)); // Use display formatter
          const products = Object.entries(order.products || {}).map(([name, qty]) => `${name} (${qty})`).join(", ");
          csvContent += `"${id}","${date}","${order.supplierName}","${order.status}","${order.paymentStatus}","${products}"\n`;
        });
        break;
  }

  // Create download link
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${reportType}_report_${currentBranch}_${
    new Date().toISOString().split("T")[0]
  }.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/* ============================================= */
/* ============ BRANCH SECTION ================= */
/* ============================================= */

/**
 * Loads the branch management page content by retrieving branch data from Firebase.
 * Displays each branch's name, location, and assigned managers, with options to view, edit or delete.
 */
function loadBranchPage() {
  const branchList = document.getElementById("branchList");
  branchList.innerHTML = "<p>Loading branches...</p>";

  // Create modals if they don't exist
  if (!document.getElementById("branchModal")) {
    createBranchModal();
  }
  if (!document.getElementById("branchDetailsModal")) {
    createBranchDetailsModal();
  }

  db.ref("branches").on(
    "value",
    (snapshot) => {
      branchList.innerHTML = "";
      if (snapshot.exists()) {
        snapshot.forEach((child) => {
          const branch = child.val();
          branch.id = child.key;
          displayBranchItem(branch);
        });
      } else {
        branchList.innerHTML =
          "<p>No branches found. Add a branch to start.</p>";
      }
    },
    (error) => {
      console.error("Error loading branches:", error.message);
      branchList.innerHTML = `<p>Error loading branches: ${error.message}</p>`;
    }
  );
}

// Function to load branches from Firebase
function loadBranches() {
  return db
    .ref("branches")
    .once("value")
    .then((snapshot) => {
      if (snapshot.exists()) {
        branches = snapshot.val();
        return true;
      }
      return false;
    })
    .catch((error) => {
      console.error("Error loading branches:", error);
      return false;
    });
}

/**
 * Initializes branch management functionality
 */
function initializeBranchManagement() {
  const branchList = document.getElementById("branchList");
  branchList.innerHTML = "<p>Loading branches...</p>";

  // Load branches from Firebase
  db.ref("branches").on(
    "value",
    (snapshot) => {
      branchList.innerHTML = "";
      if (snapshot.exists()) {
        snapshot.forEach((child) => {
          const branch = child.val();
          branch.id = child.key;
          displayBranchItem(branch);
        });
      } else {
        branchList.innerHTML =
          "<p>No branches found. Add a branch to start.</p>";
      }
    },
    (error) => {
      console.error("Error loading branches:", error.message);
      branchList.innerHTML = `<p>Error loading branches: ${error.message}</p>`;
    }
  );

  // Load managers for the dropdown
  loadManagersDropdown();

  // Set up form submission
  document
    .getElementById("branchForm")
    .addEventListener("submit", handleBranchFormSubmit);
  document
    .getElementById("cancelEditBtn")
    .addEventListener("click", cancelEdit);
}

/**
 * Displays a single branch item in the list with view, edit and delete buttons
 * @param {Object} branch - The branch data
 */
function displayBranchItem(branch) {
  const branchList = document.getElementById("branchList");
  const div = document.createElement("div");
  div.className = "branch-item";

  // Format managers list
  let managersList = "No managers assigned";
  if (branch.managers && typeof branch.managers === "object") {
    managersList = Object.values(branch.managers).join(", ");
  }

  div.innerHTML = `
      <div class="branch-info">
        <h4>${branch.name}</h4>
        <p><strong>Location:</strong> ${branch.location}</p>
        <p><strong>Managers:</strong> ${managersList}</p>
      </div>
      <div class="actions">
        <button class="view" onclick="viewBranchDetails('${branch.id}')">View</button>
        <button class="edit" onclick="editBranch('${branch.id}')">Edit</button>
        <button class="delete" onclick="deleteBranch('${branch.id}')">Delete</button>
      </div>
    `;

  branchList.appendChild(div);
}

/**
 * Sets the current branch to the given branch ID and reloads the current page.
 * This function is called when a branch is selected in the branch selector.
 * @param {string} branchId - ID of the branch to select
 */
function selectBranch(branchId) {
  currentBranch = branchId;

  // Update all branch selectors
  document.querySelectorAll(".branch-selector select").forEach((select) => {
    select.value = branchId;
  });

  // Reload the current page
  const currentPage = document
    .querySelector(".page.active")
    .id.replace("page-", "");
  showPage(currentPage);
}

/**
 * Adds a branch selector to the given page element with the
 * specified pageId. If a branch selector already exists, it
 * is replaced with a new one. The branch selector is inserted
 * as the first child of the page element.
 * @param {string} pageId - The id of the page element to add the
 * branch selector to.
 */
function addBranchSelector(pageId) {
  const pageElement = document.getElementById(`page-${pageId}`);

  const existingSelector = pageElement.querySelector(".branch-selector");
  if (existingSelector) {
    existingSelector.remove();
  }

  const branchSelector = document.createElement("div");
  branchSelector.className = "branch-selector";
  branchSelector.innerHTML = `
            <select onchange="selectBranch(this.value)">
                <option value="">-- Select Branch --</option>
                ${Object.entries(branches)
                  .map(
                    ([id, branch]) =>
                      `<option value="${id}" ${
                        currentBranch === id ? "selected" : ""
                      }>
                        ${branch.name}
                    </option>`
                  )
                  .join("")}
            </select>
        `;

  pageElement.insertBefore(branchSelector, pageElement.firstChild);
}

/**
 * Edits an existing branch
 * @param {string} branchId - The ID of the branch to edit
 */
function editBranch(branchId) {
  createBranchModal();
  currentEditingBranchId = branchId;

  db.ref(`branches/${branchId}`)
    .once("value")
    .then((snapshot) => {
      const branch = snapshot.val();

      // Set basic fields
      document.getElementById("branchName").value = branch.name || "";
      document.getElementById("branchLocation").value = branch.location || "";
      document.getElementById("branchModalTitle").textContent = "Edit Branch";
      document.getElementById("saveBranchBtn").textContent = "Update Branch";

      // Load managers and select the assigned ones
      loadManagersForBranch(branchId).then(() => {
        // Update the selected managers display
        updateSelectedManagersDisplay();
        showBranchModal();
      });
    });
}
function deleteBranch(branchId) {
  if (
    confirm(
      "Are you sure you want to delete this branch? This action cannot be undone."
    )
  ) {
    db.ref(`branches/${branchId}`)
      .remove()
      .then(() => {
        console.log("Branch deleted successfully");
        // If we're deleting the current branch, reset the current branch
        if (currentBranch === branchId) {
          currentBranch = null;
          // Update all branch selectors
          document
            .querySelectorAll(".branch-selector select")
            .forEach((select) => {
              select.value = "";
            });
        }
      })
      .catch((error) => {
        console.error("Error deleting branch:", error);
        alert("Failed to delete branch. Please try again.");
      });
  }
}

/**
 * Creates the branch edit modal with manager assignment
 */
function createBranchModal() {
  const modalHTML = `
      <div id="branchModal" class="modal">
        <div class="modal-content">
          <span class="close-branch-modal">&times;</span>
          <h2 id="branchModalTitle">Add New Branch</h2>
          <form id="branchForm">
            <div class="form-group">
              <label for="branchName">Branch Name:</label>
              <input type="text" id="branchName" required>
            </div>
            <div class="form-group">
              <label for="branchLocation">Location:</label>
              <input type="text" id="branchLocation" required>
            </div>
            <div class="form-group">
              <label for="branchManagers">Managers:</label>
              <div class="managers-selection">
                <select id="branchManagers" multiple class="managers-select">
                  <option value="">Loading managers...</option>
                </select>
                <div class="selected-managers" id="selectedManagersList"></div>
              </div>
              <small>Hold Ctrl/Cmd to select multiple managers</small>
            </div>
            <div class="form-actions">
              <button type="submit" id="saveBranchBtn">Save Branch</button>
              <button type="button" id="cancelBranchBtn">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    `;

  document.body.insertAdjacentHTML("beforeend", modalHTML);

  // Add event listeners
  document
    .querySelector(".close-branch-modal")
    .addEventListener("click", closeBranchModal);
  document
    .getElementById("cancelBranchBtn")
    .addEventListener("click", closeBranchModal);
  document
    .getElementById("branchForm")
    .addEventListener("submit", handleBranchSubmit);

  // Manager selection handler
  const managersSelect = document.getElementById("branchManagers");
  managersSelect.addEventListener("change", updateSelectedManagersDisplay);

  // Close modal when clicking outside
  document
    .getElementById("branchModal")
    .addEventListener("click", function (e) {
      if (e.target === this) {
        closeBranchModal();
      }
    });
}

/**
 * Updates the display of selected managers in the edit modal
 */
function updateSelectedManagersDisplay() {
  const select = document.getElementById("branchManagers");
  const selectedList = document.getElementById("selectedManagersList");

  selectedList.innerHTML = "";

  Array.from(select.selectedOptions).forEach((option) => {
    if (option.value) {
      const managerDiv = document.createElement("div");
      managerDiv.className = "selected-manager";
      managerDiv.innerHTML = `
          <span>${option.text}</span>
          <button type="button" onclick="deselectManager('${option.value}')" class="remove-manager">×</button>
        `;
      selectedList.appendChild(managerDiv);
    }
  });
}

/**
 * Deselects a manager in the dropdown
 */
function deselectManager(managerId) {
  const select = document.getElementById("branchManagers");
  const option = Array.from(select.options).find(
    (opt) => opt.value === managerId
  );
  if (option) {
    option.selected = false;
    updateSelectedManagersDisplay();
  }
}

/**
 * Creates the branch details modal (read-only)
 */
function createBranchDetailsModal() {
  const modalHTML = `
      <div id="branchDetailsModal" class="modal">
        <div class="modal-content">
          <span class="close-details-modal">&times;</span>
          <h2>Branch Details</h2>
          <div id="branchDetailsContent"></div>
        </div>
      </div>
    `;

  document.body.insertAdjacentHTML("beforeend", modalHTML);

  // Add event listeners
  document
    .querySelector(".close-details-modal")
    .addEventListener("click", () => {
      document.getElementById("branchDetailsModal").style.display = "none";
    });

  // Close modal when clicking outside
  document
    .getElementById("branchDetailsModal")
    .addEventListener("click", function (e) {
      if (e.target === this) {
        this.style.display = "none";
      }
    });
}

/**
 * Shows detailed information about a branch (read-only)
 * @param {string} branchId - The ID of the branch to view
 */
function viewBranchDetails(branchId) {
  const modal = document.getElementById("branchDetailsModal");
  const content = document.getElementById("branchDetailsContent");

  // Show loading state
  modal.style.display = "block";
  content.innerHTML = "<p>Loading branch details...</p>";

  // Load branch data
  db.ref(`branches/${branchId}`)
    .once("value")
    .then((snapshot) => {
      const branch = snapshot.val();
      if (!branch) {
        content.innerHTML = "<p>Branch not found</p>";
        return;
      }

      // Format managers list
      let managersHTML = "<p>No managers assigned</p>";
      if (branch.managers && Object.keys(branch.managers).length > 0) {
        managersHTML = "<ul class='manager-list'>";

        // Load manager details from users node
        const managerPromises = Object.keys(branch.managers).map(
          (managerId) => {
            return db
              .ref(`users/${managerId}`)
              .once("value")
              .then((userSnap) => {
                const user = userSnap.val();
                return {
                  id: managerId,
                  email: branch.managers[managerId],
                  name: user?.name || "No name",
                  role: user?.role || "manager",
                };
              });
          }
        );

        Promise.all(managerPromises).then((managers) => {
          managers.forEach((manager) => {
            managersHTML += `
              <li class="manager-item">
                <div class="manager-info">
                  <strong>${manager.name}</strong>
                  <p>Email: ${manager.email}</p>
                  <p>Role: ${manager.role}</p>
                </div>
              </li>
            `;
          });

          managersHTML += "</ul>";

          // Render the full details
          content.innerHTML = `
            <div class="branch-details">
              <h3>${branch.name}</h3>
              <p><strong>Location:</strong> ${branch.location}</p>
              <p><strong>Last Updated:</strong> ${formatDisplayDate(
                branch.updatedAt
              )}</p>
              
              <div class="managers-section">
                <h4>Assigned Managers</h4>
                ${managersHTML}
              </div>
              
              <div class="modal-actions">
                <button onclick="editBranch('${branchId}')">Edit Branch</button>
                <button onclick="document.getElementById('branchDetailsModal').style.display='none'">Close</button>
              </div>
            </div>
          `;
        });
      } else {
        // Render without manager details
        content.innerHTML = `
          <div class="branch-details">
            <h3>${branch.name}</h3>
            <p><strong>Location:</strong> ${branch.location}</p>
            <p><strong>Last Updated:</strong> ${formatDisplayDate(
              branch.updatedAt
            )}</p>
            
            <div class="managers-section">
              <h4>Assigned Managers</h4>
              ${managersHTML}
            </div>
            
            <div class="modal-actions">
              <button onclick="editBranch('${branchId}')">Edit Branch</button>
              <button onclick="document.getElementById('branchDetailsModal').style.display='none'">Close</button>
            </div>
          </div>
        `;
      }
    })
    .catch((error) => {
      console.error("Error loading branch details:", error);
      content.innerHTML = `<p>Error loading branch details: ${error.message}</p>`;
    });
}

/**
 * Shows the branch edit modal
 */
function showBranchModal() {
  document.getElementById("branchModal").style.display = "block";
  document.getElementById("branchName").focus();
}
/**
 * Closes the branch edit modal
 */
function closeBranchModal() {
  const modal = document.getElementById("branchModal");
  if (modal) {
    modal.style.display = "none";
    document.getElementById("branchForm").reset();
    document.getElementById("branchModalTitle").textContent = "Add New Branch";
    document.getElementById("saveBranchBtn").textContent = "Save Branch";
    document.getElementById("selectedManagersList").innerHTML = "";
    currentEditingBranchId = null;
  }
}
/**
 * Handles branch form submission (both add and edit)
 * @param {Event} e - The form submission event
 */
async function handleBranchSubmit(e) {
  e.preventDefault();

  const name = document.getElementById("branchName").value.trim();
  const location = document.getElementById("branchLocation").value.trim();
  const managersSelect = document.getElementById("branchManagers");

  if (!name || !location) {
    alert("Please fill in all required fields.");
    return;
  }

  // Get selected managers as an object {managerId: managerEmail}
  const managers = {};
  const selectedOptions = Array.from(managersSelect.selectedOptions);

  // We need to get the email for each selected manager
  const managerPromises = selectedOptions
    .filter((option) => option.value)
    .map((option) => {
      return db
        .ref(`users/${option.value}`)
        .once("value")
        .then((snapshot) => {
          const user = snapshot.val();
          return {
            id: option.value,
            email: user.email,
          };
        });
    });

  try {
    const managerResults = await Promise.all(managerPromises);
    managerResults.forEach((manager) => {
      managers[manager.id] = manager.email;
    });

    const branchData = {
      name,
      location,
      managers,
      updatedAt: firebase.database.ServerValue.TIMESTAMP,
    };

    const saveBtn = document.getElementById("saveBranchBtn");
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving...";

    if (currentEditingBranchId) {
      // Update existing branch
      await db.ref(`branches/${currentEditingBranchId}`).update(branchData);
      console.log("Branch updated successfully");
    } else {
      // Add new branch
      await db.ref("branches").push(branchData);
      console.log("Branch added successfully");
    }

    closeBranchModal();
    loadBranchPage(); // Refresh the branch list
  } catch (error) {
    console.error("Error saving branch:", error);
    alert("Error saving branch: " + error.message);
  } finally {
    const saveBtn = document.getElementById("saveBranchBtn");
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = currentEditingBranchId
        ? "Update Branch"
        : "Save Branch";
    }
  }
}

/**
 * Handles branch form submission (both add and edit)
 * @param {Event} e - The form submission event
 */
function handleBranchFormSubmit(e) {
  e.preventDefault();

  const name = document.getElementById("branchName").value.trim();
  const location = document.getElementById("branchLocation").value.trim();
  const managersSelect = document.getElementById("branchManagers");

  // Get selected managers
  const selectedManagers = {};
  for (let i = 0; i < managersSelect.options.length; i++) {
    if (managersSelect.options[i].selected) {
      const managerId = managersSelect.options[i].value;
      const managerName = managersSelect.options[i].text.split(" (")[0];
      selectedManagers[managerId] = managerName;
    }
  }

  const branchData = {
    name,
    location,
    managers: selectedManagers,
    updatedAt: new Date().toISOString(),
  };

  const saveBtn = document.getElementById("saveBranchBtn");
  saveBtn.disabled = true;
  saveBtn.textContent = "Saving...";

  if (currentEditingBranchId) {
    // Update existing branch
    db.ref(`branches/${currentEditingBranchId}`)
      .update(branchData)
      .then(() => {
        resetBranchForm();
        saveBtn.textContent = "Save Branch";
        saveBtn.disabled = false;
        currentEditingBranchId = null;
      })
      .catch((error) => {
        console.error("Error updating branch:", error);
        alert("Failed to update branch. Please try again.");
        saveBtn.textContent = "Save Branch";
        saveBtn.disabled = false;
      });
  } else {
    // Add new branch
    db.ref("branches")
      .push(branchData)
      .then(() => {
        resetBranchForm();
        saveBtn.textContent = "Save Branch";
        saveBtn.disabled = false;
      })
      .catch((error) => {
        console.error("Error adding branch:", error);
        alert("Failed to add branch. Please try again.");
        saveBtn.textContent = "Save Branch";
        saveBtn.disabled = false;
      });
  }
}

/**
 * Resets the branch form to its initial state
 */
function resetBranchForm() {
  document.getElementById("branchForm").reset();
  document.getElementById("cancelEditBtn").style.display = "none";
  document.getElementById("saveBranchBtn").textContent = "Save Branch";
  currentEditingBranchId = null;
}

/**
 * Cancels the current edit operation
 */
function cancelEdit() {
  resetBranchForm();
}

/**
 * Loads managers for the branch edit modal dropdown
 * @param {string} branchId - The branch ID (optional)
 */
async function loadManagersForBranch(branchId) {
  const managersSelect = document.getElementById("branchManagers");
  if (!managersSelect) return;

  managersSelect.innerHTML = '<option value="">Loading managers...</option>';

  try {
    // Load all users with manager role
    const usersSnapshot = await db
      .ref("users")
      .orderByChild("role")
      .equalTo("manager")
      .once("value");

    // Load managers already assigned to this branch (if branchId provided)
    let assignedManagers = {};
    if (branchId) {
      const branchManagersSnapshot = await db
        .ref(`branches/${branchId}/managers`)
        .once("value");
      assignedManagers = branchManagersSnapshot.val() || {};
    }

    // Populate the select element
    managersSelect.innerHTML = "";

    if (usersSnapshot.exists()) {
      usersSnapshot.forEach((child) => {
        const user = child.val();
        const option = document.createElement("option");
        option.value = child.key;
        option.textContent = `${user.name || "No name"} (${user.email})`;

        // Mark as selected if already assigned to branch
        if (branchId) {
          option.selected = assignedManagers[child.key] !== undefined;
        }

        managersSelect.appendChild(option);
      });
    } else {
      managersSelect.innerHTML = '<option value="">No managers found</option>';
    }
  } catch (error) {
    console.error("Error loading managers:", error);
    managersSelect.innerHTML =
      '<option value="">Error loading managers</option>';
  }
}
/**
 * Removes a manager from a branch
 * @param {string} branchId - The branch ID
 * @param {string} managerId - The manager ID to remove
 */
function removeManagerFromBranch(branchId, managerId) {
  if (
    confirm("Are you sure you want to remove this manager from the branch?")
  ) {
    db.ref(`branches/${branchId}/managers/${managerId}`)
      .remove()
      .then(() => {
        // Refresh the details view
        viewBranchDetails(branchId);
        // Also refresh the branch list
        loadBranchPage();
      })
      .catch((error) => {
        console.error("Error removing manager:", error);
        alert("Failed to remove manager. Please try again.");
      });
  }
}

window.viewBranchDetails = viewBranchDetails;
window.editBranch = editBranch;
window.deselectManager = deselectManager;

/* ============================================= */
/* ============ USER SECTION =================== */
/* ============================================= */

/**
 * Loads users - shows all users when no branch is selected, or branch managers when branch is selected
 */
function loadUserPage() {
  const userList = document.getElementById("userList");
  userList.innerHTML = "<p>Loading users...</p>";

  // First load all branches for reference
  db.ref("branches")
    .once("value")
    .then((branchesSnap) => {
      const allBranches = branchesSnap.val() || {};

      if (!currentBranch) {
        // Load ALL users when no branch is selected
        db.ref("users")
          .once("value")
          .then((usersSnap) => {
            userList.innerHTML = "";

            if (usersSnap.exists()) {
              usersSnap.forEach((userSnap) => {
                const user = userSnap.val();
                const userId = userSnap.key;

                // Get all branches this user manages
                const managedBranches = [];
                for (const branchId in allBranches) {
                  if (
                    allBranches[branchId].managers &&
                    allBranches[branchId].managers[userId]
                  ) {
                    managedBranches.push(
                      allBranches[branchId].name || branchId
                    );
                  }
                }

                // Create user item display
                const div = document.createElement("div");
                div.className = "user-item";
                div.innerHTML = `
                            <div>
                                <strong>${user.email}</strong><br>
                                Name: ${user.name || "N/A"}<br>
                                Role: ${user.role || "N/A"}<br>
                                ${
                                  managedBranches.length > 0
                                    ? `Branches: ${managedBranches.join(", ")}`
                                    : "Not assigned to any branches"
                                }
                            </div>
                            <div class="actions">
                                <button onclick="viewUserDetails('${userId}')">View</button>
                                ${
                                  user.role === "manager"
                                    ? `
                                    <button onclick="editUser('${userId}')">Edit</button>
                                    <button onclick="deleteUser('${userId}')">Remove</button>
                                `
                                    : `
                                    <small>Admin users require special permissions</small>
                                `
                                }
                            </div>
                        `;
                userList.appendChild(div);
              });
            } else {
              userList.innerHTML = "<p>No users found in the system</p>";
            }
          })
          .catch((error) => {
            console.error("Error loading all users:", error);
            userList.innerHTML = `<p>Error loading users: ${error.message}</p>`;
          });
        return;
      }

      // Load branch-specific managers when branch is selected
      userList.innerHTML = "<p>Loading branch managers...</p>";

      // Load the managers for the current branch
      db.ref(`branches/${currentBranch}/managers`)
        .once("value")
        .then((managersSnap) => {
          userList.innerHTML = "";

          if (managersSnap.exists()) {
            const managers = managersSnap.val();
            const userPromises = Object.keys(managers).map((managerId) => {
              return db
                .ref(`users/${managerId}`)
                .once("value")
                .then((userSnap) => {
                  return {
                    id: managerId,
                    email: managers[managerId],
                    ...userSnap.val(),
                  };
                });
            });

            return Promise.all(userPromises);
          } else {
            userList.innerHTML = "<p>No managers assigned to this branch</p>";
            return [];
          }
        })
        .then((managers) => {
          if (managers.length === 0) return;

          managers.forEach((user) => {
            // Create user item display
            const div = document.createElement("div");
            div.className = "user-item";
            div.innerHTML = `
                        <div>
                            <strong>${user.email}</strong><br>
                            Name: ${user.name || "N/A"}<br>
                            Role: ${user.role || "manager"}<br>
                            Branch: ${
                              allBranches[currentBranch]?.name || currentBranch
                            }
                        </div>
                        <div class="actions">
                            <button onclick="viewUserDetails('${
                              user.id
                            }')">View</button>
                            <button onclick="editUser('${
                              user.id
                            }', '${currentBranch}')">Edit</button>
                            <button onclick="removeManager('${
                              user.id
                            }', '${currentBranch}')">Remove</button>
                        </div>
                    `;
            userList.appendChild(div);
          });
        })
        .catch((error) => {
          console.error("Error loading branch managers:", error);
          userList.innerHTML = `<p>Error loading managers: ${error.message}</p>`;
        });
    });
}

function addUser() {
  // Create modal if it doesn't exist
  if (!document.getElementById("userModal")) {
    createUserModal();
  }
  showUserModal();
}

function editUser(userId, branchId = null) {
  currentEditingUserId = userId;

  if (!document.getElementById("userModal")) {
    createUserModal();
  }

  // Load user data and their branch assignments
  Promise.all([
    db.ref(`users/${userId}`).once("value"),
    db.ref("branches").once("value"),
  ])
    .then(([userSnap, branchesSnap]) => {
      const user = userSnap.val();
      const allBranches = branchesSnap.val() || {};

      document.getElementById("userEmail").value = user?.email || "";
      document.getElementById("userName").value = user?.name || "";
      document.getElementById("userRole").value = user?.role || "manager";

      // For password field - show placeholder but don't pre-fill
      document.getElementById("userPassword").value = "";
      document.getElementById("userPassword").placeholder =
        "New password (leave blank to keep current)";

      // Load branch assignments if no specific branch is selected
      if (!currentBranch) {
        const branchCheckboxes = document.getElementById("branchCheckboxes");
        branchCheckboxes.innerHTML = "";

        for (const branchId in allBranches) {
          const branch = allBranches[branchId];
          const isAssigned = branch.managers && branch.managers[userId];

          const checkboxDiv = document.createElement("div");
          checkboxDiv.className = "checkbox-item";
          checkboxDiv.innerHTML = `
                    <input type="checkbox" id="branch_${branchId}" 
                           ${isAssigned ? "checked" : ""} value="${branchId}">
                    <label for="branch_${branchId}">${
            branch.name || branchId
          }</label>
                `;
          branchCheckboxes.appendChild(checkboxDiv);
        }
      }

      document.getElementById("userModalTitle").textContent = "Edit User";
      document.getElementById("saveUserBtn").textContent = currentBranch
        ? "Update Manager"
        : "Update User";
      showUserModal();
    })
    .catch((error) => {
      console.error("Error loading user for editing:", error);
      alert("Failed to load user data for editing.");
    });
}

/**
 * Updated delete function to handle both scenarios
 */
function deleteUser(userId, branchId = null) {
  const message = branchId
    ? "Are you sure you want to remove this user from the branch?"
    : "Are you sure you want to delete this user entirely?";

  if (confirm(message)) {
    const updates = {};

    if (branchId) {
      // Only remove from branch managers
      updates[`branches/${branchId}/managers/${userId}`] = null;
    } else {
      // Remove from all branches and users collection
      // First find all branches this user might be assigned to
      db.ref("branches")
        .once("value")
        .then((branchesSnap) => {
          branchesSnap.forEach((branchSnap) => {
            if (branchSnap.child(`managers/${userId}`).exists()) {
              updates[`branches/${branchSnap.key}/managers/${userId}`] = null;
            }
          });
          // Add user deletion to updates
          updates[`users/${userId}`] = null;

          return db.ref().update(updates);
        })
        .then(() => {
          console.log("User deleted successfully");
          loadUserPage(); // Refresh the list
        })
        .catch((error) => {
          console.error("Error deleting user:", error);
          alert("Failed to delete user. Please try again.");
        });
      return;
    }

    db.ref()
      .update(updates)
      .then(() => {
        console.log("User removed from branch successfully");
        loadUserPage(); // Refresh the list
      })
      .catch((error) => {
        console.error("Error removing user:", error);
        alert("Failed to remove user. Please try again.");
      });
  }
}

/**
 * Creates the user edit modal (add or edit existing user)
 */
function createUserModal() {
  const modalHTML = `
        <div id="userModal" class="modal">
            <div class="modal-content">
                <span class="close-user-modal">&times;</span>
                <h2 id="userModalTitle">Add New User</h2>
                <form id="userForm">
                    <div class="form-group">
                        <label for="userEmail">Email:</label>
                        <input type="email" id="userEmail" required>
                    </div>
                    <div class="form-group">
                        <label for="userName">Name:</label>
                        <input type="text" id="userName">
                    </div>
                    <div class="form-group">
                        <label for="userRole">Role:</label>
                        <select id="userRole" required>
                            <option value="admin">Admin</option>
                            <option value="manager">Manager</option>
                        </select>
                    </div>
                    <div class="form-group" id="passwordGroup">
                        <label for="userPassword">Password:</label>
                        <input type="password" id="userPassword" placeholder="Enter new password">
                        <small>${
                          currentEditingUserId
                            ? "Leave blank to keep current password"
                            : "Password is required"
                        }</small>
                    </div>
                    ${
                      !currentBranch
                        ? `
                    <div class="form-group" id="branchAssignmentGroup">
                        <label for="userBranches">Assign to Branches:</label>
                        <div id="branchCheckboxes"></div>
                    </div>
                    `
                        : ""
                    }
                    <div class="form-actions">
                        <button type="submit" id="saveUserBtn">Save User</button>
                        <button type="button" id="cancelUserBtn">Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    `;

  document.body.insertAdjacentHTML("beforeend", modalHTML);

  // Add event listeners
  document
    .querySelector(".close-user-modal")
    .addEventListener("click", closeUserModal);
  document
    .getElementById("cancelUserBtn")
    .addEventListener("click", closeUserModal);
  document
    .getElementById("userForm")
    .addEventListener("submit", handleUserSubmit);

  // Close modal when clicking outside
  document.getElementById("userModal").addEventListener("click", function (e) {
    if (e.target === this) {
      closeUserModal();
    }
  });
}
function showUserModal() {
  document.getElementById("userModal").style.display = "block";
  document.getElementById("userEmail").focus();
}
function closeUserModal() {
  document.getElementById("userModal").style.display = "none";
  document.getElementById("userForm").reset();
  document.getElementById("userModalTitle").textContent = "Add New User";
  document.getElementById("saveUserBtn").textContent = "Save User";
  document.getElementById("passwordGroup").style.display = "block";
  currentEditingUserId = null;
}
/**
 * Handles the submission of the user form to create a new manager.
 *
 * @param {Event} e - The form submission event.
 *
 * @description
 * - Prevents the default form submission behavior.
 * - Validates the form fields, ensuring email and password are provided.
 * - Ensures a current branch is selected before proceeding.
 * - Attempts to create a new authentication user with the provided email and password.
 * - Adds the new manager to the current branch's managers list in the database.
 * - Stores additional user information in a separate users node in the database.
 * - Closes the user modal and refreshes the user list on successful submission.
 * - Displays an error message if there is an error during the process.
 */

async function handleUserSubmit(e) {
  e.preventDefault();

  const email = document.getElementById("userEmail").value.trim();
  const name = document.getElementById("userName").value.trim();
  const role = document.getElementById("userRole").value;
  const password = document.getElementById("userPassword").value;

  if (!email) {
    alert("Email is required.");
    return;
  }

  // Password is required for new users, optional for existing
  if (!currentEditingUserId && !password) {
    alert("Password is required for new users.");
    return;
  }

  const saveBtn = document.getElementById("saveUserBtn");
  saveBtn.disabled = true;
  saveBtn.textContent = "Saving...";

  try {
    if (currentEditingUserId) {
      // Update existing user
      const updates = {};
      updates[`users/${currentEditingUserId}/name`] = name || null;
      updates[`users/${currentEditingUserId}/role`] = role;

      // Handle branch assignments if no specific branch is selected
      if (!currentBranch) {
        const branchCheckboxes = document.querySelectorAll(
          "#branchCheckboxes input[type='checkbox']"
        );
        const allBranchesSnap = await db.ref("branches").once("value");
        const allBranches = allBranchesSnap.val() || {};

        for (const checkbox of branchCheckboxes) {
          const branchId = checkbox.value;
          const path = `branches/${branchId}/managers/${currentEditingUserId}`;
          updates[path] = checkbox.checked ? email : null;
        }
      }

      // Update password if provided
      if (password) {
        try {
          // Reauthenticate current user if changing their own password
          const currentUser = auth.currentUser;
          if (currentUser && currentUser.uid === currentEditingUserId) {
            // Need to reauthenticate before changing password
            // You might want to add a reauthentication step here
          }

          // Update password
          await auth.currentUser.updatePassword(password);
        } catch (error) {
          console.error("Error updating password:", error);
          throw new Error("Failed to update password. Please reauthenticate.");
        }
      }

      await db.ref().update(updates);
      console.log("User updated successfully");
    } else {
      // Create new user
      if (!currentBranch) {
        alert("Please select a branch first.");
        return;
      }

      const authUser = await auth.createUserWithEmailAndPassword(
        email,
        password
      );
      const userId = authUser.user.uid;

      const userData = {
        email,
        name: name || null,
        role,
        createdAt: firebase.database.ServerValue.TIMESTAMP,
      };

      if (currentBranch) {
        userData.branchId = currentBranch;
        await db.ref(`branches/${currentBranch}/managers/${userId}`).set(email);
      }

      await db.ref(`users/${userId}`).set(userData);
      console.log("User created successfully");
    }

    closeUserModal();
    loadUserPage(); // Refresh the user list
  } catch (error) {
    console.error("Error saving user:", error);
    alert("Error saving user: " + error.message);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = currentEditingUserId ? "Update User" : "Save User";
  }
}

function viewUserDetails(userId) {
  // Create modal if it doesn't exist
  if (!document.getElementById("userDetailsModal")) {
    const modalHTML = `
            <div id="userDetailsModal" class="modal">
                <div class="modal-content">
                    <span class="close-details-modal">&times;</span>
                    <h2>User Details</h2>
                    <div id="userDetailsContent"></div>
                </div>
            </div>
        `;
    document.body.insertAdjacentHTML("beforeend", modalHTML);

    document
      .querySelector(".close-details-modal")
      .addEventListener("click", () => {
        document.getElementById("userDetailsModal").style.display = "none";
      });
  }

  const modal = document.getElementById("userDetailsModal");
  const content = document.getElementById("userDetailsContent");

  modal.style.display = "block";
  content.innerHTML = "<p>Loading user details...</p>";

  // Load user data and their branch assignments
  Promise.all([
    db.ref(`users/${userId}`).once("value"),
    db.ref("branches").once("value"),
  ])
    .then(([userSnap, branchesSnap]) => {
      const user = userSnap.val();
      const allBranches = branchesSnap.val() || {};

      if (!user) {
        content.innerHTML = "<p>User not found</p>";
        return;
      }

      // Find all branches this user manages
      const managedBranches = [];
      for (const branchId in allBranches) {
        if (
          allBranches[branchId].managers &&
          allBranches[branchId].managers[userId]
        ) {
          managedBranches.push(allBranches[branchId].name || branchId);
        }
      }

      content.innerHTML = `
            <div class="user-details">
                <h3>${user.name || "Unnamed User"}</h3>
                <p><strong>Email:</strong> ${user.email}</p>
                <p><strong>Role:</strong> ${user.role || "N/A"}</p>
                <p><strong>Account Created:</strong> ${
                  user.createdAt
                    ? new Date(user.createdAt).toLocaleString()
                    : "Unknown"
                }</p>
                
                <div class="branches-section">
                    <h4>Branch Assignments</h4>
                    ${
                      managedBranches.length > 0
                        ? `<ul>${managedBranches
                            .map((b) => `<li>${b}</li>`)
                            .join("")}</ul>`
                        : "<p>Not assigned to any branches</p>"
                    }
                </div>
                
                <div class="modal-actions">
                    <button onclick="editUser('${userId}')">Edit User</button>
                    <button onclick="document.getElementById('userDetailsModal').style.display='none'">Close</button>
                </div>
            </div>
        `;
    })
    .catch((error) => {
      console.error("Error loading user details:", error);
      content.innerHTML = `<p>Error loading user details: ${error.message}</p>`;
    });
}

/**
 * Removes a manager from a branch (doesn't delete the user entirely)
 */
function removeManager(managerId, branchId) {
  if (
    confirm("Are you sure you want to remove this manager from the branch?")
  ) {
    db.ref(`branches/${branchId}/managers/${managerId}`)
      .remove()
      .then(() => {
        console.log("Manager removed from branch successfully");
        loadUserPage(); // Refresh the list
      })
      .catch((error) => {
        console.error("Error removing manager:", error);
        alert("Failed to remove manager. Please try again.");
      });
  }
}

/* ============================================= */
/* ============ SETTINGS MANAGEMENT ============ */
/* ============================================= */

/**
 * Loads the settings page content.
 * Sets the inner HTML of the element with ID "settingsOutput" to a placeholder
 * message.
 */
function loadSettingsPage() {
  const settingsOutput = document.getElementById("settingsOutput");
  settingsOutput.innerHTML =
    "<p>Settings and backup options available below.</p>";
}

/**
 * Creates a comprehensive backup of current branch's data (orders, inventory, suppliers)
 */
async function backupData() {
    if (!currentBranch) {
      alert("Please select a branch first");
      return;
    }
  
    // Use your existing showLoading function
    showLoading(true);
  
    try {
      // Get all relevant data for the branch
      const [ordersSnapshot, inventorySnapshot, suppliersSnapshot] = await Promise.all([
        db.ref(`branch_orders/${currentBranch}`).once("value"),
        db.ref(`branch_inventory/${currentBranch}`).once("value"),
        db.ref(`branch_suppliers/${currentBranch}`).once("value")
      ]);
  
      const backupData = {
        metadata: {
          branch: currentBranch,
          timestamp: new Date().toISOString(),
          version: 1.0
        },
        orders: ordersSnapshot.val() || {},
        inventory: inventorySnapshot.val() || {},
        suppliers: suppliersSnapshot.val() || {}
      };
  
      // Create and download the backup file
      const blob = new Blob([JSON.stringify(backupData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `branch_backup_${currentBranch}_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
  
      // Use your existing showSuccessMessage function
      showSuccessMessage(`Backup created successfully for ${currentBranch}!`);
    } catch (error) {
      console.error("Error creating backup:", error);
      alert("Error creating backup: " + error.message);
    } finally {
      showLoading(false);
    }
  }
/**
 * Restores all branch data (orders, inventory, suppliers) from a JSON backup file
 */
function restoreData() {
    if (!currentBranch) {
      alert("Please select a branch first");
      return;
    }
  
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
  
      showLoading(true, "Validating backup file...");
  
      try {
        const fileContents = await readFileAsText(file);
        const backupData = JSON.parse(fileContents);
  
        // Validate backup file structure
        if (!backupData.metadata || !backupData.metadata.branch) {
          throw new Error("Invalid backup file format (missing metadata)");
        }
  
        if (backupData.metadata.branch !== currentBranch) {
          if (!confirm(`This backup is for branch "${backupData.metadata.branch}". Restore to current branch "${currentBranch}" anyway?`)) {
            return;
          }
        }
  
        // Show restoration summary
        const summary = [
          `Orders: ${Object.keys(backupData.orders || {}).length} records`,
          `Inventory Items: ${Object.keys(backupData.inventory || {}).length} records`,
          `Suppliers: ${Object.keys(backupData.suppliers || {}).length} records`
        ].join('\n');
  
        if (!confirm(`This will overwrite current data for ${currentBranch}.\n\n${summary}\n\nContinue?`)) {
          return;
        }
  
        showLoading(true, "Restoring data...");
  
        // Restore all data in parallel
        await Promise.all([
          db.ref(`branch_orders/${currentBranch}`).set(backupData.orders || {}),
          db.ref(`branch_inventory/${currentBranch}`).set(backupData.inventory || {}),
          db.ref(`branch_suppliers/${currentBranch}`).set(backupData.suppliers || {})
        ]);
  
        showSuccessMessage(`All data restored successfully for ${currentBranch}!`);
        
        // Refresh all relevant pages
        loadOrderPage();
        loadInventoryPage();
        loadSuppliersPage();
      } catch (error) {
        console.error("Restoration failed:", error);
        alert(`Restoration failed: ${error.message}`);
      } finally {
        showLoading(false);
      }
    };
    
    input.click();
  }
  
/**
 * Restores all branch data from a JSON backup file
 */
async function restoreData() {
    if (!currentBranch) {
      alert("Please select a branch first");
      return;
    }
  
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
  
      // Use your existing showLoading function
      showLoading(true);
  
      try {
        const fileContents = await readFileAsText(file);
        const backupData = JSON.parse(fileContents);
  
        // Validate backup file structure
        if (!backupData.metadata || !backupData.metadata.branch) {
          throw new Error("Invalid backup file format (missing metadata)");
        }
  
        if (backupData.metadata.branch !== currentBranch) {
          if (!confirm(`This backup is for branch "${backupData.metadata.branch}". Restore to current branch "${currentBranch}" anyway?`)) {
            return;
          }
        }
  
        if (!confirm(`This will overwrite ALL current data for ${currentBranch}. Continue?`)) {
          return;
        }
  
        // Restore all data
        await Promise.all([
          db.ref(`branch_orders/${currentBranch}`).set(backupData.orders || {}),
          db.ref(`branch_inventory/${currentBranch}`).set(backupData.inventory || {}),
          db.ref(`branch_suppliers/${currentBranch}`).set(backupData.suppliers || {})
        ]);
  
        // Use your existing showSuccessMessage function
        showSuccessMessage(`Data restored successfully for ${currentBranch}!`);
        
        // Refresh data if these functions exist
        if (typeof loadOrderPage === 'function') loadOrderPage();
        if (typeof loadInventoryPage === 'function') loadInventoryPage();
        if (typeof loadSuppliersPage === 'function') loadSuppliersPage();
      } catch (error) {
        console.error("Restoration failed:", error);
        alert(`Restoration failed: ${error.message}`);
      } finally {
        showLoading(false);
      }
    };
    
    input.click();
  }
  
  // New helper function to complement your existing ones
  function readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => resolve(event.target.result);
      reader.onerror = (error) => reject(error);
      reader.readAsText(file);
    });
  }

/* ============================================= */
/* ============ DATE UTILITIES ================= */
/* ============================================= */

/**
 * Converts various date formats to a consistent MM-DD-YYYY format
 * @param {string} dateString - Input date string
 * @returns {string} Formatted date string in MM-DD-YYYY format
 */
function normalizeDate(dateString) {
  if (!dateString) return "";

  // Handle YYYY-MM-DD format (from date inputs)
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const [year, month, day] = dateString.split("-");
    return `${month}-${day}-${year}`;
  }

  // Handle MM-DD-YY format (2-digit year)
  const shortYearRegex = /^(\d{1,2})-(\d{1,2})-(\d{2})$/;
  const shortYearMatch = dateString.match(shortYearRegex);

  if (shortYearMatch) {
    const month = shortYearMatch[1].padStart(2, "0");
    const day = shortYearMatch[2].padStart(2, "0");
    const year = `20${shortYearMatch[3]}`; // Assuming 21st century
    return `${month}-${day}-${year}`;
  }

  // Handle MM-DD-YYYY format
  const fullYearRegex = /^(\d{1,2})-(\d{1,2})-(\d{4})$/;
  const fullYearMatch = dateString.match(fullYearRegex);

  if (fullYearMatch) {
    const month = fullYearMatch[1].padStart(2, "0");
    const day = fullYearMatch[2].padStart(2, "0");
    const year = fullYearMatch[3];
    return `${month}-${day}-${year}`;
  }

  // Fallback to original input if parsing fails
  console.warn(`Unable to parse date: ${dateString}`);
  return dateString;
}
/**
 * Formats a date for display in MM-DD-YYYY format
 * @param {string} dateString - Input date string
 * @returns {string} Formatted date string
 */
function formatDisplayDate(dateString) {
  try {
    const date = new Date(dateString);
    if (isNaN(date)) {
      console.warn(`Invalid date: ${dateString}`);
      return dateString;
    }

    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    const year = date.getFullYear();

    return `${month}-${day}-${year}`;
  } catch (error) {
    console.error(`Error formatting date: ${dateString}`, error);
    return dateString;
  }
}

/**
 * Formats a date for input field in YYYY-MM-DD format (for HTML date input compatibility)
 * @param {string} dateString - Input date string
 * @returns {string} Formatted date string for input
 */
function formatDateForInput(dateString) {
  if (!dateString) return "";

  // Try to create a Date object
  const date = new Date(dateString);

  // Check if the date is valid
  if (isNaN(date)) return "";

  // Format the date to YYYY-MM-DD for input compatibility
  return date.toISOString().split("T")[0];
}

function validateDate(dateString) {
  // Try to create a Date object
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

function formatDateForDisplay(dateString) {
  const normalized = normalizeDate(dateString);
  const [month, day, year] = normalized.split("-");
  return `${month}/${day}/${year}`;
}

/* ============================================= */
/* ============ EVENT LISTENERS ================ */
/* ============================================= */

document.addEventListener("DOMContentLoaded", () => {
  const role = localStorage.getItem("userRole");
  console.log("DOM loaded, userRole:", role);
  if (role !== "admin") {
    console.log("Redirecting to login because role is not admin.");
    window.location.href = "../login/login.html";
  } else {
    showPage("dashboard");
  }
});
