let currentBranch = null;
let branches = {};

window.editBranch = editBranch;
window.deleteBranch = deleteBranch;


/* ====================== */
/*     Firebase Stuff     */
/* ====================== */


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

console.log("Firebase initialized with config:", firebaseConfig);

/**
 * Map of product names to their corresponding image paths.
 * Used to automatically assign images to inventory items.
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


/* ====================== */
/*  General Utility Stuff */
/* ====================== */


async function showPage(pageId) {
    // Hide all pages and deactivate all nav links
    document.querySelectorAll(".page").forEach((page) => page.classList.remove("active"));
    document.querySelectorAll(".nav-list a").forEach((link) => link.classList.remove("active"));
    
    // Activate the selected page and nav link
    document.getElementById(`page-${pageId}`).classList.add("active");
    document.getElementById(`nav-${pageId}`).classList.add("active");
    document.getElementById("page-title").textContent =
        pageId.charAt(0).toUpperCase() + pageId.slice(1).replace("-", " ");

    // Load branches if needed (except on the branches page itself)
    if (pageId !== "branches" && Object.keys(branches).length === 0) {
        await loadBranches();
    }

    // Add branch selector to all pages except branches page
    if (pageId !== "branches") {
        addBranchSelector(pageId);
    }

    // Load the appropriate page content
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
            ${Object.entries(branches).map(([id, branch]) => 
                `<option value="${id}" ${currentBranch === id ? 'selected' : ''}>
                    ${branch.name}
                </option>`
            ).join('')}
        </select>
    `;
    
    pageElement.insertBefore(branchSelector, pageElement.firstChild);
}


/* ====================== */
/*       Dashboard        */
/* ====================== */

/**
 * Loads dashboard page content including key metrics and recent data.
 * Displays low stock alerts, recent orders, and supplier performance.
 */
function loadDashboardPage() {
  const metrics = document.getElementById("dashboard-metrics");
  metrics.innerHTML = "<p>Loading metrics...</p>";

  Promise.all([
    db.ref("inventory").once("value"),
    db.ref("orders").once("value"),
    db.ref("suppliers").once("value"),
  ])
    .then(([inventorySnap, ordersSnap, suppliersSnap]) => {
      const inventoryData = [];
      inventorySnap.forEach((child) =>
        inventoryData.push({ id: child.key, ...child.val() })
      );
      const lowStock = inventoryData.filter(
        (item) => item.stock <= (item.minStock || 0)
      ).length;

      const recentOrders = [];
      const ordersBySupplier = {};
      if (ordersSnap.val()) {
        ordersSnap.forEach((child) => {
          const order = child.val();
          order.id = child.key;
          recentOrders.push(order);
          const supplierId = order.supplierID;
          ordersBySupplier[supplierId] =
            (ordersBySupplier[supplierId] || 0) + 1;
        });
      }
      const recentOrdersList = recentOrders.slice(-3);

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
              Product: ${o.product}<br>
              Quantity: ${o.quantity}<br>
              Status: ${o.status}<br>
              Payment Status: ${o.paymentStatus}<br>
              Timestamp: ${new Date(o.timestamp).toLocaleString()}
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



/* ====================== */
/*       Inventory        */
/* ====================== */

/**
 * Loads the inventory page content from Firebase.
 * Sets up event listeners for searching inventory items.
 * Falls back to default data if Firebase retrieval fails.
 */
function loadInventoryPage() {
    if (!currentBranch) {
        document.getElementById("inventoryList").innerHTML = "<p>Please select a branch first</p>";
        return;
    }

    const inventoryList = document.getElementById("inventoryList");
    const alerts = document.getElementById("alerts");
    const searchInput = document.getElementById("inventorySearch");

    let inventoryData = [];

    console.log("Attempting to load inventory from Firebase...");
    
    db.ref(`branch_inventory/${currentBranch}`).once("value").then((branchSnap) => {
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
                image: branchItem.image || imageMap[branchItem.name] || "../images/default.jpg"
            };
            
            inventoryData.push(mergedItem);
        });

        console.log("Processed inventory data:", inventoryData);
        
        if (inventoryData.length > 0) {
            renderInventory(inventoryData, inventoryList, alerts, searchInput.value);
        } else {
            console.warn("No inventory data found for this branch. Using fallback data.");
            const fallbackData = getFallbackInventoryData();
            renderInventory(fallbackData, inventoryList, alerts, searchInput.value);
        }
    }).catch((error) => {
        console.error("Error fetching inventory data:", error.message);
        inventoryList.innerHTML = `<p>Error loading data: ${error.message}. Using fallback data.</p>`;
        const fallbackData = getFallbackInventoryData();
        renderInventory(fallbackData, inventoryList, alerts, searchInput.value);
    });

    searchInput.addEventListener("input", () =>
        renderInventory(inventoryData, inventoryList, alerts, searchInput.value)
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
        }
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
            <img src="${item.image || '../images/default.jpg'}" alt="${item.name}">
        </div>
        <div class="item-info">
            <p><strong>Description:</strong> ${item.description || 'N/A'}</p>
            <p><strong>Current Stock:</strong> ${item.stock} kg</p>
            <p><strong>Minimum Stock:</strong> ${item.minStock || 'N/A'} kg</p>
            <p><strong>Supplier:</strong> ${item.supplier || 'Unknown'}</p>
            <p><strong>Expiration Date:</strong> ${formatDisplayDate(item.expiration)}</p>
        </div>
        <div class="item-actions">
            <button onclick="switchToEditMode('${item.id}')">Edit</button>
            <button onclick="document.getElementById('itemDetailsModal').style.display='none'">Close</button>
        </div>
    `;
}

/**
 * Creates HTML for editing item details
 * @returns {string} HTML string for edit mode
 */
function createEditMode(item) {
    return `
        <h3>Edit ${item.name}</h3>
        <form onsubmit="saveItemDetails('${item.id}'); return false;">
            <div class="form-group">
                <label for="edit-name">Name:</label>
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
                <input type="date" id="edit-expiration" value="${formatDateForInput(item.expiration)}" required>
            </div>
            <div class="form-actions">
                <button type="submit">Save</button>
                <button type="button" onclick="switchToViewMode('${item.id}')">Cancel</button>
            </div>
        </form>
    `;
}


/**
 * Shows detailed information about a specific inventory item.
 *
 * @param {string} itemId - The unique identifier of the inventory item
 */
function showItemDetails(itemId) {
    db.ref(`branch_inventory/${currentBranch}/${itemId}`).once("value").then((branchSnap) => {
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

            // Add event listener to close button
            document.querySelector(".close-button").addEventListener("click", () => {
                detailsModal.style.display = "none";
            });
        }

        if (item) {
            // Define the switching functions in the global scope
            window.switchToEditMode = function() {
                detailsContent.innerHTML = createEditMode(item);
            };
            
            window.switchToViewMode = function() {
                // Refresh the item data before showing view mode
                db.ref(`branch_inventory/${currentBranch}/${itemId}`).once("value").then((snap) => {
                    const updatedItem = { ...snap.val(), id: itemId };
                    detailsContent.innerHTML = createViewMode(updatedItem);
                });
            };

            // Render view mode by default
            detailsContent.innerHTML = createViewMode(item);

            // Show the modal
            detailsModal.style.display = "block";
            
            // Close modal when clicking outside content
            window.onclick = function(event) {
                if (event.target == detailsModal) {
                    detailsModal.style.display = "none";
                }
            }
        }
    }).catch((error) => {
        console.error("Error loading item details:", error);
        alert("Error loading item details. Please try again.");
    });
}
/**
 * Converts various date formats to a consistent MM-DD-YYYY format
 * @param {string} dateString - Input date string
 * @returns {string} Formatted date string in MM-DD-YYYY format
 */
function normalizeDate(dateString) {
    if (!dateString) return '';
    
    // Handle YYYY-MM-DD format (from date inputs)
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        const [year, month, day] = dateString.split('-');
        return `${month}-${day}-${year}`;
    }
  
    // Handle MM-DD-YY format (2-digit year)
    const shortYearRegex = /^(\d{1,2})-(\d{1,2})-(\d{2})$/;
    const shortYearMatch = dateString.match(shortYearRegex);
    
    if (shortYearMatch) {
        const month = shortYearMatch[1].padStart(2, '0');
        const day = shortYearMatch[2].padStart(2, '0');
        const year = `20${shortYearMatch[3]}`; // Assuming 21st century
        return `${month}-${day}-${year}`;
    }
  
    // Handle MM-DD-YYYY format
    const fullYearRegex = /^(\d{1,2})-(\d{1,2})-(\d{4})$/;
    const fullYearMatch = dateString.match(fullYearRegex);
    
    if (fullYearMatch) {
        const month = fullYearMatch[1].padStart(2, '0');
        const day = fullYearMatch[2].padStart(2, '0');
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
      
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
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
    if (!dateString) return '';
    
    // Try to create a Date object
    const date = new Date(dateString);
    
    // Check if the date is valid
    if (isNaN(date)) return '';
    
    // Format the date to YYYY-MM-DD for input compatibility
    return date.toISOString().split('T')[0];
}


function validateDate(dateString) {
    // Try to create a Date object
    const date = new Date(dateString);
    return !isNaN(date.getTime());
}

function formatDateForDisplay(dateString) {
    const normalized = normalizeDate(dateString);
    const [month, day, year] = normalized.split('-');
    return `${month}/${day}/${year}`;
}

/**
 * Saves updated details of an inventory item.
 *
 * Collects new values from input fields, validates them, and updates the
 * item in the Firebase database. Switches the UI back to view mode and
 * refreshes the inventory list upon successful update.
 *
 * @param {string} itemId - The unique identifier of the inventory item to update
 */
function saveItemDetails(itemId) {
    // Collect values from input fields
    const newName = document.getElementById("edit-name").value;
    const newDescription = document.getElementById("edit-description").value;
    const newStock = parseInt(document.getElementById("edit-stock").value);
    const newMinStock = parseInt(document.getElementById("edit-minStock").value);
    const newSupplier = document.getElementById("edit-supplier").value;
    const newExpiration = document.getElementById("edit-expiration").value;

    // Validate inputs
    if (!newName || isNaN(newStock) || isNaN(newMinStock) || !newExpiration) {
        alert("Please fill in all required fields with valid data.");
        return;
    }

    // Use the existing image map or default image
    const image = imageMap[newName] || "../images/default.jpg";

    // Prepare update data
    const updateData = {
        name: newName,
        description: newDescription,
        stock: newStock,
        minStock: newMinStock,
        supplier: newSupplier,
        expiration: newExpiration,
        image: image
    };

    // Update branch-specific data
    db.ref(`branch_inventory/${currentBranch}/${itemId}`).update(updateData)
    .then(() => {
        console.log("Item updated successfully!");
        
        // 1. Switch back to view mode
        const item = {
            id: itemId,
            ...updateData
        };
        document.getElementById("itemDetailsContent").innerHTML = createViewMode(item);
        
        // 2. Refresh the inventory list
        const currentPage = document.querySelector(".page.active").id.replace("page-", "");
        if (currentPage === "inventory") {
            loadInventoryPage();
        }
    }).catch((error) => {
        console.error("Error updating item:", error.message);
        alert("Error updating item: " + error.message);
    });
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
function renderInventory(data, inventoryList, alerts, searchTerm = "") {
    console.log("Rendering inventory with data:", data);
    let filteredData = data.filter(
      (item) =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.description || "").toLowerCase().includes(searchTerm.toLowerCase())
    );
  
    inventoryList.innerHTML = "";
    const currentDate = new Date("2025-03-12");
    if (filteredData.length === 0) {
      inventoryList.innerHTML = "<p>No items match the search criteria.</p>";
      return;
    }
  
    filteredData.forEach((item) => {
      const expirationDate = new Date(item.expiration);
      const isExpired = !isNaN(expirationDate) && expirationDate < currentDate;
      const isLowStock = item.stock <= (item.minStock || 0);
  
      const formattedExpiration = formatDisplayDate(item.expiration);
  
      const container = document.createElement("div");
      container.className = `food-item ${isExpired ? "expired" : ""} ${
        isLowStock ? "low" : ""
      }`;
      const imageSrc = item.image || "../images/default.jpg";
      container.innerHTML = `
        <img src="${imageSrc}" alt="${
        item.name
      }" onload="console.log('Image loaded: ${imageSrc}')" onerror="console.error('Image failed to load: ${imageSrc}'); this.src='../images/default.jpg';">
        <div class="item-details">
          <div class="item-name">${item.name} ${
        isExpired ? "(Expired)" : ""
      }</div>
          <div class="item-description">Item ID: ${item.id}</div>
          <div class="stock-info">
            <span>Supplier: ${item.supplier || "Unknown"}</span>
            <span>Quantity: ${item.stock} kg</span>
            <span>Expiration: ${formattedExpiration} ${
        isExpired ? "(Expired)" : ""
      }</span>
          </div>
        </div>
        <div class="actions">
          <button onclick="showItemDetails('${item.id}')">View Details</button>
          <button onclick="db.ref('inventory/${
            item.id
          }').remove()">Delete</button>
        </div>
      `;
      inventoryList.appendChild(container);
  
      console.log(`Item: ${item.name}, Full ID: ${item.id}`);
    });
  
  const lowStockItems = filteredData.filter(
    (item) => item.stock <= (item.minStock || 0)
  );
  const expiredItems = filteredData.filter((item) => {
    const expDate = new Date(item.expiration);
    return !isNaN(expDate) && expDate < currentDate;
  });
  alerts.innerHTML = "";
  if (lowStockItems.length)
    alerts.innerHTML += `<li>Low Stock Alert: ${lowStockItems
      .map((item) => item.name)
      .join(", ")}</li>`;
  if (expiredItems.length)
    alerts.innerHTML += `<li>Expired Items Alert: ${expiredItems
      .map((item) => item.name)
      .join(", ")}</li>`;
}

/**
 * Adds a new inventory item to the database.
 * Prompts user for item details and saves to Firebase. (This uses dialog boxes)
 */
function addItem() {
  console.log("Adding new item...");
  const name = prompt("Enter product name:");
  const description = prompt("Enter description:");
  const stock = prompt("Enter initial stock:");
  const minStock = prompt("Enter minimum stock:");
  const supplier = prompt("Enter supplier name:");
  let expiration = prompt("Enter expiration date (MM-DD-YY):");

  if (!name || !stock || !minStock || !expiration) {
    alert("Please fill in all required fields.");
    return;
  }

  const [month, day, year] = expiration.split("-");
  expiration = `20${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;

  const image = imageMap[name] || "../images/default.jpg";
  db.ref("inventory")
    .push({
      name,
      description: description || "",
      stock: parseInt(stock),
      minStock: parseInt(minStock),
      supplier: supplier || "Unknown",
      expiration,
      image,
    })
    .then(() => {
      console.log("Item added successfully!");
      alert("Item added successfully!");
    })
    .catch((error) => {
      console.error("Error adding item:", error.message);
      alert("Error adding item: " + error.message);
    });
}

/**
 * Edits an existing inventory item.
 * Prompts user for updated item details and saves changes to Firebase.
 *
 * @param {string} itemId - The ID of the item to edit
 */
// function editItem(itemId) {
//   console.log("Editing item:", itemId);
//   const itemRef = db.ref(`inventory/${itemId}`);
//   itemRef.once("value", (snapshot) => {
//     const item = snapshot.val();
//     const newName = prompt("Enter new product name:", item.name);
//     const newDesc = prompt("Enter new description:", item.description || "");
//     const newStock = prompt("Enter new stock quantity:", item.stock);
//     const newMinStock = prompt("Enter new minimum stock:", item.minStock);
//     const newSupplier = prompt("Enter new supplier name:", item.supplier);
//     let newExpiration = prompt(
//       "Enter new expiration date (MM-DD-YY):",
//       item.expiration.split("-").slice(1).join("-")
//     );
//     if (newName && newStock && newMinStock && newExpiration) {
//       const [month, day, year] = newExpiration.split("-");
//       newExpiration = `20${year}-${month.padStart(2, "0")}-${day.padStart(
//         2,
//         "0"
//       )}`;
//       const image = imageMap[newName] || "../images/default.jpg";
//       itemRef
//         .update({
//           name: newName,
//           description: newDesc || "",
//           stock: parseInt(newStock),
//           minStock: parseInt(newMinStock),
//           supplier: newSupplier || "Unknown",
//           expiration: newExpiration,
//           image,
//         })
//         .then(() => {
//           console.log("Item updated successfully!");
//         })
//         .catch((error) => {
//           console.error("Error updating item:", error.message);
//         });
//     }
//   });
// }


/* ====================== */
/*        Supplier        */
/* ====================== */

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

    db.ref(`branch_suppliers/${currentBranch}`).once("value").then((branchSnap) => {
        supplierList.innerHTML = "";
        
        if (branchSnap.exists()) {
            branchSnap.forEach((child) => {
                const supplier = child.val();
                supplier.id = child.key;
                
                const div = document.createElement("div");
                div.className = "supplier-item";
                div.innerHTML = `
                    <div>
                        <strong>${supplier.name}</strong><br>
                        Contact: ${supplier.contact || 'N/A'}<br>
                        GCash: ${supplier.gcash || 'N/A'}<br>
                        Products: ${supplier.products || 'N/A'}
                    </div>
                    <div class="actions">
                        <button onclick="editSupplier('${supplier.id}')">Edit</button>
                        <button onclick="deleteSupplier('${supplier.id}')">Delete</button>
                    </div>
                `;
                supplierList.appendChild(div);
            });
        } else {
            supplierList.innerHTML = "<p>No suppliers found for this branch. Add a supplier to start.</p>";
        }
    }).catch((error) => {
        console.error("Error loading suppliers:", error.message);
        supplierList.innerHTML = `<p>Error loading suppliers: ${error.message}</p>`;
    });
}

function createSupplierModal() {
    const modalHTML = `
      <div id="supplierModal" class="modal">
        <div class="modal-content">
          <span class="close-supplier-modal">&times;</span>
          <h2>Add New Supplier</h2>
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
              <label for="supplierProducts">Products (comma-separated):</label>
              <textarea id="supplierProducts" required></textarea>
            </div>
            <div class="form-actions">
              <button type="submit">Save Supplier</button>
              <button type="button" id="cancelSupplier">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Add event listeners
    document.querySelector('.close-supplier-modal').addEventListener('click', closeSupplierModal);
    document.getElementById('cancelSupplier').addEventListener('click', closeSupplierModal);
    document.getElementById('supplierForm').addEventListener('submit', handleSupplierSubmit);
    
    // Close modal when clicking outside
    document.getElementById('supplierModal').addEventListener('click', function(e) {
      if (e.target === this) {
        closeSupplierModal();
      }
    });
  }
  
  function closeSupplierModal() {
    document.getElementById('supplierModal').style.display = 'none';
    document.getElementById('supplierForm').reset();
  }
  
  function showSupplierModal() {
    document.getElementById('supplierModal').style.display = 'block';
    document.getElementById('supplierName').focus();
  }

  async function getNextSupplierId(branchId) {
    const snapshot = await db.ref(`branch_suppliers/${branchId}`).once('value');
    const suppliers = snapshot.val() || {};
    
    // Extract all supplier IDs
    const supplierIds = Object.keys(suppliers);
    
    // Find the highest existing number
    let maxNumber = 0;
    supplierIds.forEach(id => {
      const match = id.match(/^supplier(\d+)$/);
      if (match) {
        const num = parseInt(match[1]);
        if (num > maxNumber) maxNumber = num;
      }
    });
    
    return `supplier${maxNumber + 1}`;
  }

  // You'll need to update these functions to handle the source parameter
  function editSupplier(id, source) {
    // Implementation needs to consider whether it's a global or branch supplier
  }
  
  function deleteSupplier(id) {
    if (confirm("Are you sure you want to delete this supplier?")) {
        db.ref(`branch_suppliers/${currentBranch}/${id}`).remove()
        .then(() => {
            console.log("Supplier deleted successfully");
        }).catch((error) => {
            console.error("Error deleting supplier:", error);
            alert("Failed to delete supplier. Please try again.");
        });
    }
}

/**
 * Adds a new supplier to the database.
 * Prompts user for supplier details and saves to Firebase.
 */
function addSupplier() {
  // Create modal if it doesn't exist
  if (!document.getElementById('supplierModal')) {
    createSupplierModal();
  }
  showSupplierModal();
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
    
    const name = document.getElementById('supplierName').value.trim();
    const contact = document.getElementById('supplierContact').value.trim();
    const gcash = document.getElementById('supplierGCash').value.trim();
    const products = document.getElementById('supplierProducts').value.trim();
    
    if (!name || !contact || !gcash || !products) {
      alert('Please fill in all required fields.');
      return;
    }
  
    if (!currentBranch) {
      alert('Please select a branch first.');
      return;
    }
  
    const saveBtn = e.target.querySelector('button[type="submit"]');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';
  
    try {
      // Get the next sequential ID
      const newSupplierId = await getNextSupplierId(currentBranch);
      
      await db.ref(`branch_suppliers/${currentBranch}/${newSupplierId}`).set({ 
        name, 
        contact, 
        gcash, 
        products,
        timestamp: firebase.database.ServerValue.TIMESTAMP
      });
      
      console.log('Supplier added successfully with ID:', newSupplierId);
      closeSupplierModal();
      loadSupplierPage();
    } catch (error) {
      console.error('Error adding supplier:', error.message);
      alert('Error adding supplier: ' + error.message);
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Supplier';
    }
  }
/**
 * Edits an existing supplier in the database.
 * Prompts user for updated supplier details and saves changes.
 *
 * @param {string} supplierId - The ID of the supplier to edit
 */
function editSupplier(supplierId) {
    const supplierRef = db.ref(`branch_suppliers/${currentBranch}/${supplierId}`);
    supplierRef.once("value", (snapshot) => {
      const supplier = snapshot.val();
      const newName = prompt("Enter new supplier name:", supplier.name);
      const newContact = prompt("Enter new contact info:", supplier.contact);
      const newGcash = prompt("Enter new GCash number:", supplier.gcash);
      const newProducts = prompt(
        "Enter new products (comma-separated):",
        supplier.products
      );
      if (newName && newContact && newGcash && newProducts) {
        supplierRef
          .update({
            name: newName,
            contact: newContact,
            gcash: newGcash,
            products: newProducts,
            updatedAt: firebase.database.ServerValue.TIMESTAMP
          })
          .then(() => {
            console.log("Supplier updated successfully!");
            loadSupplierPage(); // Refresh the list
          })
          .catch((error) => {
            console.error("Error updating supplier:", error.message);
            alert("Error updating supplier: " + error.message);
          });
      }
    });
  }



/* ====================== */
/*         Order          */
/* ====================== */

/**
 * Loads the orders page content from Firebase.
 * Sets up event listeners for searching orders.
 * Falls back to default data if Firebase retrieval fails.
 */
function loadOrderPage() {
    if (!currentBranch) {
        document.getElementById("orderList").innerHTML = "<p>Please select a branch first</p>";
        return;
    }

    const orderList = document.getElementById("orderList");
    orderList.innerHTML = "<p>Loading orders...</p>";

    db.ref(`branch_orders/${currentBranch}`).once("value").then((branchOrdersSnap) => {
        const branchOrders = branchOrdersSnap.val() || {};

        orderList.innerHTML = "";
        
        if (Object.keys(branchOrders).length > 0) {
            Object.entries(branchOrders).forEach(([id, order]) => {
                const div = document.createElement("div");
                div.className = "order-item";
                div.innerHTML = `
                    <div>
                        <strong>Order #${id}</strong><br>
                        Product: ${order.product}<br>
                        Quantity: ${order.quantity}<br>
                        Status: ${order.status || 'Pending'}<br>
                        Payment Status: ${order.paymentStatus || 'Pending'}<br>
                        Timestamp: ${order.timestamp ? new Date(order.timestamp).toLocaleString() : 'N/A'}
                    </div>
                    <div class="actions">
                        <button onclick="editOrder('${id}')">Edit</button>
                        <button onclick="deleteOrder('${id}')">Delete</button>
                    </div>
                `;
                orderList.appendChild(div);
            });
        } else {
            orderList.innerHTML = "<p>No orders found for this branch. Create an order to start.</p>";
        }
    }).catch((error) => {
        console.error("Error loading orders:", error.message);
        orderList.innerHTML = `<p>Error loading orders: ${error.message}</p>`;
    });
}

function createOrderModal() {
    const modalHTML = `
      <div id="orderModal" class="modal">
        <div class="modal-content">
          <span class="close-order-modal">&times;</span>
          <h2>Add New Order</h2>
          <form id="orderForm">
            <div class="form-group">
              <label for="orderProduct">Product:</label>
              <input type="text" id="orderProduct" required>
            </div>
            <div class="form-group">
              <label for="orderQuantity">Quantity:</label>
              <input type="number" id="orderQuantity" min="1" required>
            </div>
            <div class="form-group">
              <label for="orderSupplier">Supplier ID:</label>
              <input type="text" id="orderSupplier" required>
            </div>
            <div class="form-group">
              <label for="orderStatus">Status:</label>
              <select id="orderStatus" required>
                <option value="Pending">Pending</option>
                <option value="Processing">Processing</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
            <div class="form-group">
              <label for="orderPaymentStatus">Payment Status:</label>
              <select id="orderPaymentStatus" required>
                <option value="Pending">Pending</option>
                <option value="Paid">Paid</option>
                <option value="Partially Paid">Partially Paid</option>
              </select>
            </div>
            <div class="form-actions">
              <button type="submit">Save Order</button>
              <button type="button" id="cancelOrder">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Add event listeners
    document.querySelector('.close-order-modal').addEventListener('click', closeOrderModal);
    document.getElementById('cancelOrder').addEventListener('click', closeOrderModal);
    document.getElementById('orderForm').addEventListener('submit', handleOrderSubmit);
    
    // Close modal when clicking outside
    document.getElementById('orderModal').addEventListener('click', function(e) {
      if (e.target === this) {
        closeOrderModal();
      }
    });
}

function closeOrderModal() {
    document.getElementById('orderModal').style.display = 'none';
    document.getElementById('orderForm').reset();
}
  
function showOrderModal() {
    document.getElementById('orderModal').style.display = 'block';
    document.getElementById('orderProduct').focus();
}

// Updated delete function
function deleteOrder(orderId) {
    if (confirm("Are you sure you want to delete this order?")) {
        db.ref(`branch_orders/${currentBranch}/${orderId}`).remove()
        .then(() => {
            console.log("Order deleted successfully");
        }).catch((error) => {
            console.error("Error deleting order:", error);
            alert("Failed to delete order. Please try again.");
        });
    }
}

/**
 * Opens the order modal to create a new order for the selected branch.
 * If no branch is selected, shows an alert and exits.
 * If the order modal doesn't exist yet, creates it first.
 */
function addOrder() {
    if (!currentBranch) {
        alert("Please select a branch first");
        return;
    }
    
    // Create modal if it doesn't exist
    if (!document.getElementById('orderModal')) {
        createOrderModal();
    }
    showOrderModal();
}

async function getNextOrderId(branchId) {
    const snapshot = await db.ref(`branch_orders/${branchId}`).once('value');
    const orders = snapshot.val() || {};
    
    // Extract all order IDs
    const orderIds = Object.keys(orders);
    
    // Find the highest existing number
    let maxNumber = 0;
    orderIds.forEach(id => {
        const match = id.match(/^order(\d+)$/);
        if (match) {
            const num = parseInt(match[1]);
            if (num > maxNumber) maxNumber = num;
        }
    });
    
    return `order${maxNumber + 1}`;
}

async function handleOrderSubmit(e) {
    e.preventDefault();
    
    const product = document.getElementById('orderProduct').value.trim();
    const quantity = parseInt(document.getElementById('orderQuantity').value);
    const supplierID = document.getElementById('orderSupplier').value.trim();
    const status = document.getElementById('orderStatus').value;
    const paymentStatus = document.getElementById('orderPaymentStatus').value;
    
    if (!product || isNaN(quantity) || !supplierID || !status || !paymentStatus) {
        alert('Please fill in all required fields with valid data.');
        return;
    }

    const saveBtn = e.target.querySelector('button[type="submit"]');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    try {
        // Get the next sequential ID
        const newOrderId = await getNextOrderId(currentBranch);
        const timestamp = new Date().toISOString();
        
        const orderData = {
            product,
            quantity,
            supplierID,
            status,
            paymentStatus,
            timestamp
        };
        
        await db.ref(`branch_orders/${currentBranch}/${newOrderId}`).set(orderData);
        
        console.log('Order added successfully with ID:', newOrderId);
        closeOrderModal();
        loadOrderPage(); // Refresh the order list
    } catch (error) {
        console.error('Error adding order:', error.message);
        alert('Error adding order: ' + error.message);
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Order';
    }
}
/**
 * Edits an existing order in the database.
 * Prompts the user for order details, including supplier ID, product name, quantity,
 * status, and payment status. Updates the order information in Firebase if all
 * required fields are filled in. Displays an error message if not all fields are
 * filled in or if there is an error updating the order.
 * @param {string} orderId - The ID of the order to edit.
 */
function editOrder(orderId) {
    // Create modal if it doesn't exist
    if (!document.getElementById('orderModal')) {
        createOrderModal();
    }
    
    const orderRef = db.ref(`branch_orders/${currentBranch}/${orderId}`);
    orderRef.once("value", (snapshot) => {
        const order = snapshot.val();
        
        // Fill the form with existing data
        document.getElementById('orderProduct').value = order.product || '';
        document.getElementById('orderQuantity').value = order.quantity || '';
        document.getElementById('orderSupplier').value = order.supplierID || '';
        document.getElementById('orderStatus').value = order.status || 'Pending';
        document.getElementById('orderPaymentStatus').value = order.paymentStatus || 'Pending';
        
        // Change the form title and submit behavior
        document.querySelector('#orderModal h2').textContent = 'Edit Order';
        const form = document.getElementById('orderForm');
        form.onsubmit = function(e) {
            e.preventDefault();
            handleOrderUpdate(orderId);
        };
        
        showOrderModal();
    });
}

async function handleOrderUpdate(orderId) {
    const product = document.getElementById('orderProduct').value.trim();
    const quantity = parseInt(document.getElementById('orderQuantity').value);
    const supplierID = document.getElementById('orderSupplier').value.trim();
    const status = document.getElementById('orderStatus').value;
    const paymentStatus = document.getElementById('orderPaymentStatus').value;
    
    if (!product || isNaN(quantity) || !supplierID || !status || !paymentStatus) {
        alert('Please fill in all required fields with valid data.');
        return;
    }

    const saveBtn = document.querySelector('#orderForm button[type="submit"]');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Updating...';

    try {
        const updateData = {
            product,
            quantity,
            supplierID,
            status,
            paymentStatus,
            updatedAt: firebase.database.ServerValue.TIMESTAMP
        };
        
        await db.ref(`branch_orders/${currentBranch}/${orderId}`).update(updateData);
        
        console.log('Order updated successfully');
        closeOrderModal();
        loadOrderPage(); // Refresh the order list
    } catch (error) {
        console.error('Error updating order:', error.message);
        alert('Error updating order: ' + error.message);
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Order';
    }
}



// TODO: USE CHART API
/* ====================== */
/*       Reports          */
/* ====================== */

/**
 * Loads the report page by setting a default message in the report output element.
 * This function is used to prompt the user to select a report type and generate it
 * to view the details.
 */
function loadReportPage() {
  const reportOutput = document.getElementById("reportOutput");
  reportOutput.innerHTML =
    "<p>Select a report type and generate to view details.</p>";
}

/**
 * Generates a report based on the selected report type.
 * Reports are generated by reading data from the corresponding Firebase
 * Realtime Database location and displaying it in a formatted manner.
 * If there is an error generating the report, an error message is displayed.
 * @param {string} reportType - The type of report to generate. One of "inventory",
 * "supplier", or "order".
 */
function generateReport() {
  const reportType = document.getElementById("reportType").value;
  const reportOutput = document.getElementById("reportOutput");
  reportOutput.innerHTML = "<p>Generating report...</p>";

  switch (reportType) {
    case "inventory":
      db.ref("inventory")
        .once("value")
        .then((snapshot) => {
          const data = snapshot.val() ? Object.values(snapshot.val()) : [];
          reportOutput.innerHTML = `<h3>Inventory Report</h3><pre>${JSON.stringify(
            data,
            null,
            2
          )}</pre>`;
        })
        .catch((error) => {
          console.error("Error generating inventory report:", error.message);
          reportOutput.innerHTML = `<p>Error: ${error.message}</p>`;
        });
      break;
    case "supplier":
      db.ref("suppliers")
        .once("value")
        .then((snapshot) => {
          const data = snapshot.val() ? Object.values(snapshot.val()) : [];
          reportOutput.innerHTML = `<h3>Supplier Report</h3><pre>${JSON.stringify(
            data,
            null,
            2
          )}</pre>`;
        })
        .catch((error) => {
          console.error("Error generating supplier report:", error.message);
          reportOutput.innerHTML = `<p>Error: ${error.message}</p>`;
        });
      break;
    case "order":
      db.ref("orders")
        .once("value")
        .then((snapshot) => {
          const data = snapshot.val()
            ? Object.entries(snapshot.val()).map(([id, order]) => ({
                id,
                ...order,
              }))
            : [];
          reportOutput.innerHTML = `<h3>Order Report</h3><pre>${JSON.stringify(
            data,
            null,
            2
          )}</pre>`;
        })
        .catch((error) => {
          console.error("Error generating order report:", error.message);
          reportOutput.innerHTML = `<p>Error: ${error.message}</p>`;
        });
      break;
  }
}


/* ====================== */
/*     User Management    */
/* ====================== */

/**
 * Loads users (managers) for the currently selected branch
 */
function loadUserPage() {
    if (!currentBranch) {
        document.getElementById("userList").innerHTML = "<p>Please select a branch first</p>";
        return;
    }

    const userList = document.getElementById("userList");
    userList.innerHTML = "<p>Loading branch managers...</p>";

    // Load the managers for the current branch
    db.ref(`branches/${currentBranch}/managers`).once('value')
      .then((managersSnap) => {
          userList.innerHTML = "";
          
          if (managersSnap.exists()) {
              const managers = managersSnap.val();
              Object.keys(managers).forEach(managerId => {
                  const email = managers[managerId];
                  
                  // Create user item display
                  const div = document.createElement("div");
                  div.className = "user-item";
                  div.innerHTML = `
                      <div>
                          <strong>${email}</strong><br>
                          Manager ID: ${managerId}<br>
                          Role: Manager
                      </div>
                      <div class="actions">
                          <button onclick="editUser('${managerId}', '${currentBranch}')">Edit</button>
                          <button onclick="removeManager('${managerId}', '${currentBranch}')">Remove</button>
                      </div>
                  `;
                  userList.appendChild(div);
              });
              
              if (userList.innerHTML === "") {
                  userList.innerHTML = "<p>No managers found for this branch</p>";
              }
          } else {
              userList.innerHTML = "<p>No managers assigned to this branch</p>";
          }
      })
      .catch((error) => {
          console.error("Error loading branch managers:", error);
          userList.innerHTML = `<p>Error loading managers: ${error.message}</p>`;
      });
}

/**
 * Removes a manager from a branch (doesn't delete the user entirely)
 */
function removeManager(managerId, branchId) {
    if (confirm('Are you sure you want to remove this manager from the branch?')) {
        db.ref(`branches/${branchId}/managers/${managerId}`).remove()
          .then(() => {
              console.log('Manager removed from branch successfully');
              loadUserPage(); // Refresh the list
          })
          .catch((error) => {
              console.error('Error removing manager:', error);
              alert('Failed to remove manager. Please try again.');
          });
    }
}
/**
 * Creates a modal for adding/editing users
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
              <input type="password" id="userPassword">
              <small>Leave blank to keep existing password</small>
            </div>
            <div class="form-actions">
              <button type="submit" id="saveUserBtn">Save User</button>
              <button type="button" id="cancelUserBtn">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Add event listeners
    document.querySelector('.close-user-modal').addEventListener('click', closeUserModal);
    document.getElementById('cancelUserBtn').addEventListener('click', closeUserModal);
    document.getElementById('userForm').addEventListener('submit', handleUserSubmit);
    
    // Close modal when clicking outside
    document.getElementById('userModal').addEventListener('click', function(e) {
      if (e.target === this) {
        closeUserModal();
      }
    });
}

function closeUserModal() {
    document.getElementById('userModal').style.display = 'none';
    document.getElementById('userForm').reset();
    document.getElementById('userModalTitle').textContent = 'Add New User';
    document.getElementById('saveUserBtn').textContent = 'Save User';
    document.getElementById('passwordGroup').style.display = 'block';
    currentEditingUserId = null;
}

function showUserModal() {
    document.getElementById('userModal').style.display = 'block';
    document.getElementById('userEmail').focus();
}

let currentEditingUserId = null;

/**
 * Adds a user to the current branch
 *//**
 * Handles adding a new manager to the current branch
 */
async function handleUserSubmit(e) {
    e.preventDefault();
    
    const email = document.getElementById('userEmail').value.trim();
    const name = document.getElementById('userName').value.trim();
    const password = document.getElementById('userPassword').value;
    
    if (!email || !password) {
        alert('Please fill in all required fields.');
        return;
    }
    
    if (!currentBranch) {
        alert('Please select a branch first.');
        return;
    }
    
    const saveBtn = document.getElementById('saveUserBtn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';
    
    try {
        // Create auth user
        const authUser = await auth.createUserWithEmailAndPassword(email, password);
        const userId = authUser.user.uid;
        
        // Add to branch managers
        await db.ref(`branches/${currentBranch}/managers/${userId}`).set(email);
        
        // Optionally store additional user info in a separate users node
        await db.ref(`users/${userId}`).set({
            email,
            name: name || null,
            role: "manager",
            branchId: currentBranch,
            createdAt: firebase.database.ServerValue.TIMESTAMP
        });
        
        console.log('Manager added successfully to branch');
        closeUserModal();
        loadUserPage(); // Refresh the user list
    } catch (error) {
        console.error('Error adding manager:', error);
        alert('Error adding manager: ' + error.message);
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Manager';
    }
}

function addUser() {
    // Create modal if it doesn't exist
    if (!document.getElementById('userModal')) {
        createUserModal();
    }
    showUserModal();
}


/**
 * Edits a manager's information
 */
function editUser(managerId, branchId) {
    currentEditingUserId = managerId;
    
    // Create modal if it doesn't exist
    if (!document.getElementById('userModal')) {
        createUserModal();
    }
    
    // Load user data from the users node (if available)
    db.ref(`users/${managerId}`).once('value')
      .then((snapshot) => {
          const user = snapshot.val();
          
          document.getElementById('userEmail').value = user?.email || '';
          document.getElementById('userName').value = user?.name || '';
          document.getElementById('userRole').value = user?.role || 'manager';
          document.getElementById('passwordGroup').style.display = 'none';
          
          document.getElementById('userModalTitle').textContent = 'Edit Manager';
          document.getElementById('saveUserBtn').textContent = 'Update Manager';
          showUserModal();
      })
      .catch((error) => {
          console.error('Error loading manager for editing:', error);
          alert('Failed to load manager data for editing.');
      });
}

/**
 * Deletes a user from both the branch and the users collection
 */
function deleteUser(userId, branchId) {
    if (confirm('Are you sure you want to remove this user from the branch?')) {
        // First remove from branch managers
        const updates = {};
        updates[`branches/${branchId}/managers/${userId}`] = null;
        
        // Then delete from users collection if needed
        // (Note: You might not want to delete the user entirely, just remove from branch)
        
        db.ref().update(updates)
          .then(() => {
              console.log('User removed from branch successfully');
              loadUserPage(); // Refresh the list
          })
          .catch((error) => {
              console.error('Error removing user:', error);
              alert('Failed to remove user. Please try again.');
          });
    }
}


/* ====================== */
/*    Branch Management   */
/* ====================== */

/**
 * Loads the branch management page content by retrieving branch data from Firebase.
 * Displays each branch's name, location, and assigned managers, with options to edit or delete.
 */
function loadBranchPage() {
    const branchList = document.getElementById("branchList");
    branchList.innerHTML = "<p>Loading branches...</p>";

    // Create modal if it doesn't exist
    if (!document.getElementById('branchModal')) {
        createBranchModal();
    }

    db.ref("branches").on(
        "value",
        (snapshot) => {
            branchList.innerHTML = "";
            if (snapshot.exists()) {
                snapshot.forEach((child) => {
                    const branch = child.val();
                    branch.id = child.key;
                    const div = document.createElement("div");
                    div.className = "branch-item";
                    
                    // Format managers list
                    let managersList = "No managers assigned";
                    if (branch.managers && Object.keys(branch.managers).length > 0) {
                        managersList = Object.values(branch.managers).join(", ");
                    }
                    
                    div.innerHTML = `
                        <div>
                            <strong>${branch.name}</strong><br>
                            Location: ${branch.location}<br>
                            Managers: ${managersList}
                        </div>
                        <div class="actions">
                            <button onclick="editBranch('${branch.id}')">Edit</button>
                            <button onclick="deleteBranch('${branch.id}')">Delete</button>
                        </div>
                    `;
                    branchList.appendChild(div);
                });
            } else {
                branchList.innerHTML = "<p>No branches found. Add a branch to start.</p>";
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
    return db.ref("branches").once("value").then((snapshot) => {
        if (snapshot.exists()) {
            branches = snapshot.val();
            return true;
        }
        return false;
    }).catch((error) => {
        console.error("Error loading branches:", error);
        return false;
    });
}

// Global variable to track if the branch modal has been created
let branchModalCreated = false;

/**
 * Creates the branch modal dynamically and adds it to the DOM
 */
function createBranchModal() {
    if (branchModalCreated) return;
    
    // Create modal elements
    const modal = document.createElement('div');
    modal.id = 'branchModal';
    modal.className = 'modal';
    
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    
    const closeButton = document.createElement('span');
    closeButton.className = 'close-branch-modal';
    closeButton.innerHTML = '&times;';
    closeButton.addEventListener('click', closeBranchModal);
    
    const title = document.createElement('h2');
    title.id = 'branchModalTitle';
    title.textContent = 'Add New Branch';
    
    const form = document.createElement('form');
    form.id = 'branchForm';
    
    // Create form groups
    const nameGroup = createFormGroup('branchName', 'Branch Name:', 'text', true);
    const locationGroup = createFormGroup('branchLocation', 'Location:', 'text', true);
    
    // Create managers select
    const managersGroup = document.createElement('div');
    managersGroup.className = 'form-group';
    
    const managersLabel = document.createElement('label');
    managersLabel.htmlFor = 'branchManagers';
    managersLabel.textContent = 'Managers:';
    
    const managersSelect = document.createElement('select');
    managersSelect.id = 'branchManagers';
    managersSelect.multiple = true;
    
    const managersNote = document.createElement('small');
    managersNote.textContent = 'Hold Ctrl/Cmd to select multiple';
    
    managersGroup.appendChild(managersLabel);
    managersGroup.appendChild(managersSelect);
    managersGroup.appendChild(managersNote);
    
    // Create form actions
    const actionsGroup = document.createElement('div');
    actionsGroup.className = 'form-actions';
    
    const saveButton = document.createElement('button');
    saveButton.type = 'submit';
    saveButton.id = 'saveBranchBtn';
    saveButton.textContent = 'Save Branch';
    
    const cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.id = 'cancelBranchBtn';
    cancelButton.textContent = 'Cancel';
    cancelButton.addEventListener('click', closeBranchModal);
    
    actionsGroup.appendChild(saveButton);
    actionsGroup.appendChild(cancelButton);
    
    // Assemble the form
    form.appendChild(nameGroup);
    form.appendChild(locationGroup);
    form.appendChild(managersGroup);
    form.appendChild(actionsGroup);
    
    // Assemble the modal content
    modalContent.appendChild(closeButton);
    modalContent.appendChild(title);
    modalContent.appendChild(form);
    
    // Assemble the modal
    modal.appendChild(modalContent);
    
    // Add modal to the body
    document.body.appendChild(modal);
    
    // Add form submit handler
    form.addEventListener('submit', handleBranchSubmit);
    
    // Close modal when clicking outside
    modal.addEventListener('click', function(e) {
        if (e.target === this) {
            closeBranchModal();
        }
    });
    
    branchModalCreated = true;
    
    // Load managers into the dropdown
    loadManagersForBranch();
}

/**
 * Helper function to create form groups
 */
function createFormGroup(id, labelText, inputType, isRequired = false) {
    const group = document.createElement('div');
    group.className = 'form-group';
    
    const label = document.createElement('label');
    label.htmlFor = id;
    label.textContent = labelText;
    
    const input = document.createElement('input');
    input.type = inputType;
    input.id = id;
    if (isRequired) input.required = true;
    
    group.appendChild(label);
    group.appendChild(input);
    
    return group;
}

/**
 * Shows the branch modal
 */
function showBranchModal() {
    createBranchModal(); // Ensure modal exists
    document.getElementById('branchModal').style.display = 'block';
    document.getElementById('branchName').focus();
}

/**
 * Closes the branch modal
 */
function closeBranchModal() {
    const modal = document.getElementById('branchModal');
    if (modal) {
        modal.style.display = 'none';
        document.getElementById('branchForm').reset();
        document.getElementById('branchModalTitle').textContent = 'Add New Branch';
        document.getElementById('saveBranchBtn').textContent = 'Save Branch';
        currentEditingBranchId = null;
    }
}

/**
 * Loads managers into the branch managers dropdown
 */
function loadManagersForBranch() {
    const managersSelect = document.getElementById('branchManagers');
    if (!managersSelect) return;
    
    managersSelect.innerHTML = '<option value="">Loading managers...</option>';
    
    db.ref('users').orderByChild('role').equalTo('manager').once('value')
      .then((snapshot) => {
        managersSelect.innerHTML = '';
        
        if (snapshot.exists()) {
            snapshot.forEach((child) => {
                const user = child.val();
                const option = document.createElement('option');
                option.value = child.key;
                option.textContent = `${user.email} (${user.name || 'No name'})`;
                managersSelect.appendChild(option);
            });
        } else {
            managersSelect.innerHTML = '<option value="">No managers found</option>';
        }
      })
      .catch((error) => {
        console.error('Error loading managers:', error);
        managersSelect.innerHTML = '<option value="">Error loading managers</option>';
      });
}

let currentEditingBranchId = null;

async function handleBranchSubmit(e) {
    e.preventDefault();
    
    const name = document.getElementById('branchName').value.trim();
    const location = document.getElementById('branchLocation').value.trim();
    const managersSelect = document.getElementById('branchManagers');
    
    if (!name || !location) {
        alert('Please fill in all required fields.');
        return;
    }
    
    // Get selected managers
    const managers = {};
    for (let i = 0; i < managersSelect.options.length; i++) {
        if (managersSelect.options[i].selected) {
            const managerId = managersSelect.options[i].value;
            const managerEmail = managersSelect.options[i].text.split(' (')[0];
            managers[managerId] = managerEmail;
        }
    }
    
    const branchData = {
        name,
        location,
        managers,
        updatedAt: firebase.database.ServerValue.TIMESTAMP
    };
    
    const saveBtn = document.getElementById('saveBranchBtn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';
    
    try {
        if (currentEditingBranchId) {
            // Update existing branch
            await db.ref(`branches/${currentEditingBranchId}`).update(branchData);
            console.log('Branch updated successfully');
        } else {
            // Add new branch
            await db.ref('branches').push(branchData);
            console.log('Branch added successfully');
        }
        
        closeBranchModal();
        loadBranchPage(); // Refresh the branch list
    } catch (error) {
        console.error('Error saving branch:', error);
        alert('Error saving branch: ' + error.message);
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Branch';
        currentEditingBranchId = null;
    }
}

function editBranch(branchId) {
    // Ensure modal exists
    createBranchModal();

    // Add a delay to ensure DOM is ready
    setTimeout(() => {
        const modalTitle = document.getElementById('branchModalTitle');
        const branchName = document.getElementById('branchName');
        const branchLocation = document.getElementById('branchLocation');
        const managersSelect = document.getElementById('branchManagers');
        const saveButton = document.getElementById('saveBranchBtn');

        // Log all elements to diagnose
        console.log('Modal elements:', {
            modalTitle,
            branchName,
            branchLocation,
            managersSelect,
            saveButton
        });

        // Validate elements exist
        const elementsToCheck = [
            { element: modalTitle, name: 'Modal Title' },
            { element: branchName, name: 'Branch Name Input' },
            { element: branchLocation, name: 'Branch Location Input' },
            { element: managersSelect, name: 'Managers Select' },
            { element: saveButton, name: 'Save Button' }
        ];

        const missingElements = elementsToCheck
            .filter(item => !item.element)
            .map(item => item.name);

        if (missingElements.length > 0) {
            console.error('Missing DOM elements:', missingElements);
            alert(`Unable to edit branch: Missing elements: ${missingElements.join(', ')}`);
            return;
        }

        currentEditingBranchId = branchId;

        db.ref(`branches/${branchId}`).once('value')
          .then((snapshot) => {
              const branch = snapshot.val();
              
              if (!branch) {
                  console.error('No branch data found for ID:', branchId);
                  alert('Branch not found');
                  return;
              }
              
              // Safely set form values with additional checks
              if (branchName) branchName.value = branch.name || '';
              if (branchLocation) branchLocation.value = branch.location || '';
              
              // Select assigned managers
              if (branch.managers && managersSelect) {
                  for (let i = 0; i < managersSelect.options.length; i++) {
                      const optionValue = managersSelect.options[i].value;
                      managersSelect.options[i].selected = branch.managers[optionValue] !== undefined;
                  }
              }
              
              // Update UI
              if (modalTitle) modalTitle.textContent = 'Edit Branch';
              if (saveButton) saveButton.textContent = 'Update Branch';
              
              showBranchModal();
          })
          .catch((error) => {
              console.error("Error loading branch for editing:", error);
              alert("Failed to load branch data for editing.");
          });
    }, 100);  // Small delay to ensure DOM is ready
}
function deleteBranch(branchId) {
    if (confirm('Are you sure you want to delete this branch? This action cannot be undone.')) {
        db.ref(`branches/${branchId}`).remove()
          .then(() => {
              console.log('Branch deleted successfully');
              // If we're deleting the current branch, reset the current branch
              if (currentBranch === branchId) {
                  currentBranch = null;
                  // Update all branch selectors
                  document.querySelectorAll('.branch-selector select').forEach(select => {
                      select.value = '';
                  });
              }
          })
          .catch((error) => {
              console.error('Error deleting branch:', error);
              alert('Failed to delete branch. Please try again.');
          });
    }
}


function selectBranch(branchId) {
    currentBranch = branchId;
    
    // Update all branch selectors
    document.querySelectorAll('.branch-selector select').forEach(select => {
        select.value = branchId;
    });
    
    // Reload the current page
    const currentPage = document.querySelector(".page.active").id.replace("page-", "");
    showPage(currentPage);
}

  
//   let currentEditingBranchId = null;y
  
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
          branchList.innerHTML = "<p>No branches found. Add a branch to start.</p>";
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
    document.getElementById("branchForm").addEventListener("submit", handleBranchFormSubmit);
    document.getElementById("cancelEditBtn").addEventListener("click", cancelEdit);
  }
  
  /**
   * Displays a single branch item in the list
   * @param {Object} branch - The branch data
   */
  function displayBranchItem(branch) {
    const branchList = document.getElementById("branchList");
    const div = document.createElement("div");
    div.className = "branch-item";
    
    // Format managers list
    let managersList = "No managers assigned";
    if (branch.managers && Object.keys(branch.managers).length > 0) {
      managersList = Object.values(branch.managers).join(", ");
    }
    
    div.innerHTML = `
      <div class="branch-info">
        <h4>${branch.name}</h4>
        <p><strong>Location:</strong> ${branch.location}</p>
        <p><strong>Managers:</strong> ${managersList}</p>
      </div>
      <div class="actions">
        <button onclick="editBranch('${branch.id}')">Edit</button>
        <button onclick="deleteBranch('${branch.id}')">Delete</button>
      </div>
    `;
    
    branchList.appendChild(div);
  }
  
  /**
   * Loads available managers into the dropdown select
   */
  function loadManagersDropdown() {
    const managersSelect = document.getElementById("branchManagers");
    managersSelect.innerHTML = "<option value=''>Loading managers...</option>";
    
    db.ref("users").orderByChild("role").equalTo("manager").on(
      "value",
      (snapshot) => {
        managersSelect.innerHTML = "";
        
        if (snapshot.exists()) {
          snapshot.forEach((child) => {
            const user = child.val();
            const option = document.createElement("option");
            option.value = user.id;
            option.textContent = `${user.email} (${user.name || 'No name'})`;
            managersSelect.appendChild(option);
          });
        } else {
          managersSelect.innerHTML = "<option value=''>No managers found</option>";
        }
      },
      (error) => {
        console.error("Error loading managers:", error);
        managersSelect.innerHTML = "<option value=''>Error loading managers</option>";
      }
    );
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
        const managerName = managersSelect.options[i].text.split(' (')[0];
        selectedManagers[managerId] = managerName;
      }
    }
    
    const branchData = {
      name,
      location,
      managers: selectedManagers,
      updatedAt: new Date().toISOString()
    };
    
    const saveBtn = document.getElementById("saveBranchBtn");
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving...";
    
    if (currentEditingBranchId) {
      // Update existing branch
      db.ref(`branches/${currentEditingBranchId}`).update(branchData)
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
      db.ref("branches").push(branchData)
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
  


// TODO: Finish this
/* ====================== */
/*        Settings        */
/* ====================== */

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
 * Creates a backup of the current state of the Firebase Realtime Database
 * by downloading the data as a JSON file. The file is named "backup.json"
 * and is created in the user's Downloads folder.
 * @returns {undefined}
 */
function backupData() {
  db.ref()
    .once("value")
    .then((snapshot) => {
      const data = snapshot.val();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "backup.json";
      a.click();
      URL.revokeObjectURL(url);
      console.log("Backup created successfully!");
      alert("Backup created successfully!");
    })
    .catch((error) => {
      console.error("Error creating backup:", error.message);
      alert("Error creating backup: " + error.message);
    });
}

/**
 * Creates a file input element and prompts the user to select a JSON file.
 * If the user selects a file, reads the file and attempts to restore the
 * Firebase Realtime Database with the data from the file. If the operation
 * is successful, alerts the user with a success message. If there is an
 * error, alerts the user with an error message.
 * @returns {undefined}
 */
function restoreData() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json";
  input.onchange = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      const data = JSON.parse(event.target.result);
      db.ref()
        .set(data)
        .then(() => {
          console.log("Data restored successfully!");
          alert("Data restored successfully!");
        })
        .catch((error) => {
          console.error("Error restoring data:", error.message);
          alert("Error restoring data: " + error.message);
        });
    };
    reader.readAsText(file);
  };
  input.click();
}

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
