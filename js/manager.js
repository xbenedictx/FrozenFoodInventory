// Firebase configuration
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
try {
  firebase.initializeApp(firebaseConfig);
  console.log("Firebase initialized successfully!");
} catch (error) {
  console.error("Firebase initialization error:", error.message);
  alert("Firebase initialization failed: " + error.message);
}

const auth = firebase.auth();
const db = firebase.database();

// Sign Out
function signOut() {
  auth.signOut().then(() => {
    localStorage.removeItem("userRole");
    window.location.href = "../login/login.html";
  }).catch((error) => {
    console.error("Sign-out error:", error.message);
  });
}

// Navigation for Manager Dashboard
function showManagerPage(pageId) {
  document.querySelectorAll(".page").forEach(page => page.classList.remove("active"));
  document.querySelectorAll(".nav-list a").forEach(link => link.classList.remove("active"));
  document.getElementById(`page-${pageId}`).classList.add("active");
  document.getElementById(`nav-${pageId}`).classList.add("active");

  if (pageId === "home") {
    loadHomePage();
  } else if (pageId === "inventory") {
    loadInventoryPage();
  } else if (pageId === "orders") {
    loadOrdersPage();
  } else if (pageId === "suppliers") {
    loadSuppliersPage();
  } else if (pageId === "reports") {
    loadReportsPage();
  }
}

// Manager: Home Page
function loadHomePage() {
  const mainContent = document.getElementById("main-content");
  mainContent.innerHTML = `
    <div class="dashboard-header">
      <h1>Welcome, Manager</h1>
      <div class="user-info">
        <div class="support"><i class="fas fa-phone"></i></div>
        <div class="notifications"><i class="fas fa-bell"></i></div>
        <div class="profile" onclick="toggleDropdown()">
          <span>Manager X</span> <i class="fas fa-caret-down"></i>
          <div class="dropdown">
            <ul class="dropdown-menu">
              <li><a href="settings.html">Settings</a></li>
              <li><a href="help.html">Help</a></li>
              <li><button onclick="signOut()" class="signout-btn">Sign Out</button></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
    <div id="pages">
      <div id="page-home" class="page active">
        <h2>Manager Dashboard</h2>
        <p>Welcome to your dashboard! Use the sidebar to navigate to Inventory, Orders, Suppliers, and Reports.</p>
      </div>
    </div>
  `;
}

// Manager: Inventory Page
function loadInventoryPage() {
  console.log("Loading inventory page...");
  const mainContent = document.getElementById("main-content");
  mainContent.innerHTML = `
    <div class="dashboard-header">
      <h1>Stocks</h1>
      <div class="user-info">
        <div class="support"><i class="fas fa-phone"></i></div>
        <div class="notifications"><i class="fas fa-bell"></i></div>
        <div class="profile" onclick="toggleDropdown()">
          <span>Manager X</span> <i class="fas fa-caret-down"></i>
          <div class="dropdown">
            <ul class="dropdown-menu">
              <li><a href="settings.html">Settings</a></li>
              <li><a href="help.html">Help</a></li>
              <li><button onclick="signOut()" class="signout-btn">Sign Out</button></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
    <div id="pages">
      <div id="page-inventory" class="page active">
        <div class="filter-sort">
          <div>
            <select id="inventorySort">
              <option value="name-asc">Sort by Item Name</option>
              <option value="name-desc">Sort by Item Name (Z-A)</option>
              <option value="stock-asc">Sort by Stock (Low to High)</option>
              <option value="stock-desc">Sort by Stock (High to Low)</option>
              <option value="expiration-asc">Sort by Expiration Date</option>
            </select>
          </div>
          <div>
            <input type="text" id="inventorySearch" placeholder="Search stock item...">
            <button onclick="addItem()">+ Add Item</button>
          </div>
        </div>
        <div id="inventoryList" class="inventory-container">
          <p id="noDataMessage" style="display: none;">No inventory data available. Add an item to start.</p>
        </div>
        <h3>Low Stock Alerts</h3>
        <ul id="alerts"></ul>
      </div>
    </div>
  `;

  const inventoryList = document.getElementById("inventoryList");
  const alerts = document.getElementById("alerts");
  const searchInput = document.getElementById("inventorySearch");
  const sortSelect = document.getElementById("inventorySort");
  const noDataMessage = document.getElementById("noDataMessage");

  let inventoryData = [];

  // Fetch data from Firebase
  db.ref("inventory").on("value", (snapshot) => {
    console.log("Firebase inventory data snapshot:", snapshot.val());
    inventoryData = [];
    if (snapshot.exists()) {
      snapshot.forEach((child) => {
        const item = child.val();
        item.id = child.key;
        item.supplier = item.supplier || "Unknown";
        item.expiration = item.expiration || "N/A";
        inventoryData.push(item);
      });
      console.log("Processed inventory data:", inventoryData);
      renderInventory(inventoryData, inventoryList, alerts, searchInput.value, sortSelect.value);
      noDataMessage.style.display = "none";
    } else {
      console.warn("No inventory data found in Firebase.");
      noDataMessage.style.display = "block";
      inventoryList.innerHTML = "";
      alerts.innerHTML = "";
    }
  }, (error) => {
    console.error("Error fetching inventory data:", error.message);
    noDataMessage.textContent = `Error loading data: ${error.message}. Add an item to start.`;
    noDataMessage.style.display = "block";
    inventoryList.innerHTML = "";
    alerts.innerHTML = "";
  });

  // Fallback static data for testing
  const fallbackData = [
    { id: "item1", name: "Adobo (Chicken)", stock: 40, minStock: 10, supplier: "supplier1", expiration: "2025-10-31" },
    { id: "item2", name: "Bagnet (Ilocano)", stock: 20, minStock: 5, supplier: "supplier2", expiration: "2024-11-04" },
    { id: "item3", name: "Banana Cue", stock: 50, minStock: 15, supplier: "supplier3", expiration: "2024-11-04" },
    { id: "item4", name: "Bangus (Boneless)", stock: 30, minStock: 8, supplier: "supplier1", expiration: "2024-10-31" },
    { id: "item5", name: "Caldereta (Ready-to-Cook)", stock: 25, minStock: 5, supplier: "supplier2", expiration: "2025-12-01" }
  ];

  // If no Firebase data after 2 seconds, use fallback
  setTimeout(() => {
    if (inventoryData.length === 0) {
      console.log("Using fallback data due to no Firebase response.");
      renderInventory(fallbackData, inventoryList, alerts, searchInput.value, sortSelect.value);
      noDataMessage.style.display = "none";
    }
  }, 2000);

  searchInput.addEventListener("input", () => renderInventory(inventoryData, inventoryList, alerts, searchInput.value, sortSelect.value));
  sortSelect.addEventListener("change", () => renderInventory(inventoryData, inventoryList, alerts, searchInput.value, sortSelect.value));
}

function renderInventory(data, inventoryList, alerts, searchTerm, sortOption) {
  console.log("Rendering inventory with data:", data);
  let filteredData = data.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  switch (sortOption) {
    case "name-asc":
      filteredData.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case "name-desc":
      filteredData.sort((a, b) => b.name.localeCompare(a.name));
      break;
    case "stock-asc":
      filteredData.sort((a, b) => a.stock - b.stock);
      break;
    case "stock-desc":
      filteredData.sort((a, b) => b.stock - a.stock);
      break;
    case "expiration-asc":
      filteredData.sort((a, b) => new Date(a.expiration) - new Date(b.expiration));
      break;
  }

  const imageMap = {
    "Adobo (Chicken)": "../images/adobo.jpg",
    "Bagnet (Ilocano)": "../images/bagnet.jpg",
    "Banana Cue": "../images/banana-cue.jpg",
    "Bangus (Boneless)": "../images/bangus.jpg",
    "Caldereta (Ready-to-Cook)": "../images/caldereta.jpg",
    "Dinengdeng (Ilocano)": "../images/dinengdeng.jpg",
    "Empanada (Meat)": "../images/empanada.jpg",
    "Kare-kare (Oxtail)": "../images/kare-kare.jpg",
    "Longganisa (Ilocano)": "../images/longganisa.jpg",
    "Lumpia (Pork)": "../images/lumpia.jpg",
    "Menudo (Ready-to-Cook)": "../images/menudo.jpg",
    "Shrimp (Suahe)": "../images/shrimp.jpg",
    "Sinigang (Pork)": "../images/sinigang.jpg",
    "Siomai (Shrimp)": "../images/siomai.jpg",
    "Siopao (Asado)": "../images/siopao.jpg",
    "Squid (Rings)": "../images/squid-rings.jpg",
    "Turon": "../images/turon.jpg"
  };

  inventoryList.innerHTML = "";
  const currentDate = new Date("2025-03-11"); // Current date as per your system
  if (filteredData.length === 0) {
    inventoryList.innerHTML = "<p>No items match the search or sort criteria.</p>";
    return;
  }

  filteredData.forEach(item => {
    const expirationDate = new Date(item.expiration);
    const isExpired = expirationDate < currentDate;
    const isLowStock = item.stock <= item.minStock;

    const container = document.createElement("div");
    container.className = `food-item ${isExpired ? 'expired' : ''} ${isLowStock ? 'low' : ''}`;
    const imageSrc = imageMap[item.name] || "../images/placeholder.jpg";
    container.innerHTML = `
      <img src="${imageSrc}" alt="${item.name}" onload="console.log('Image loaded: ${imageSrc}')" onerror="console.error('Image failed to load: ${imageSrc}')">
      <div class="item-details">
        <div class="item-name">${item.name} ${isExpired ? '(Expired)' : ''}</div>
        <div class="item-description">Item ID: ${item.id.slice(0, 5)}</div>
        <div class="stock-info">
          <span>Supplier: ${item.supplier}</span>
          <span>Quantity: ${item.stock} kg</span>
          <span>Expiration: ${item.expiration} ${isExpired ? '(Expired)' : ''}</span>
        </div>
      </div>
      <div class="actions">
        <button onclick="editItem('${item.id}')">Edit</button>
        <button onclick="db.ref('inventory/${item.id}').remove()">Delete</button>
      </div>
    `;
    inventoryList.appendChild(container);
  });

  const lowStockItems = filteredData.filter(item => item.stock <= item.minStock);
  const expiredItems = filteredData.filter(item => new Date(item.expiration) < currentDate);
  alerts.innerHTML = "";
  if (lowStockItems.length) alerts.innerHTML += `<li>Low Stock Alert: ${lowStockItems.map(item => item.name).join(", ")}</li>`;
  if (expiredItems.length) alerts.innerHTML += `<li>Expired Items Alert: ${expiredItems.map(item => item.name).join(", ")}</li>`;
}

function addItem() {
  console.log("Adding new item...");
  const name = prompt("Enter product name:");
  const description = prompt("Enter description:");
  const stock = prompt("Enter initial stock:");
  const minStock = prompt("Enter minimum stock:");
  const supplier = prompt("Enter supplier name:");
  const expiration = prompt("Enter expiration date (YYYY-MM-DD):");

  if (!name || !description || !stock || !minStock || !supplier || !expiration) {
    alert("Please fill in all fields.");
    return;
  }

  db.ref("inventory").push({
    name,
    description,
    stock: parseInt(stock),
    minStock: parseInt(minStock),
    supplier,
    expiration
  }).then(() => {
    console.log("Item added successfully!");
    alert("Item added successfully!");
  }).catch((error) => {
    console.error("Error adding item:", error.message);
    alert("Error adding item: " + error.message);
  });
}

function editItem(itemId) {
  console.log("Editing item:", itemId);
  const newName = prompt("Enter new product name:");
  const newDesc = prompt("Enter new description:");
  const newStock = prompt("Enter new stock quantity:");
  const newMinStock = prompt("Enter new minimum stock:");
  const newSupplier = prompt("Enter new supplier name:");
  const newExpiration = prompt("Enter new expiration date (YYYY-MM-DD):");
  if (newName && newDesc && newStock && newMinStock && newSupplier && newExpiration) {
    db.ref(`inventory/${itemId}`).update({
      name: newName,
      description: newDesc,
      stock: parseInt(newStock),
      minStock: parseInt(newMinStock),
      supplier: newSupplier,
      expiration: newExpiration
    }).then(() => {
      console.log("Item updated successfully!");
    }).catch((error) => {
      console.error("Error updating item:", error.message);
    });
  }
}

// Manager: Orders Page
function loadOrdersPage() {
  const mainContent = document.getElementById("main-content");
  mainContent.innerHTML = `
    <div class="dashboard-header">
      <h1>Orders</h1>
      <div class="user-info">
        <div class="support"><i class="fas fa-phone"></i></div>
        <div class="notifications"><i class="fas fa-bell"></i></div>
        <div class="profile" onclick="toggleDropdown()">
          <span>Manager X</span> <i class="fas fa-caret-down"></i>
          <div class="dropdown">
            <ul class="dropdown-menu">
              <li><a href="settings.html">Settings</a></li>
              <li><a href="help.html">Help</a></li>
              <li><button onclick="signOut()" class="signout-btn">Sign Out</button></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
    <div id="pages">
      <div id="page-orders" class="page active">
        <h2>Orders Management</h2>
        <p>Manage your orders here.</p>
        <div id="orderList"></div>
      </div>
    </div>
  `;

  const supplierSelect = document.getElementById("order-supplier");
  const productSelect = document.getElementById("order-product");
  const orderList = document.getElementById("orderList");

  db.ref("suppliers").on("value", (snapshot) => {
    supplierSelect.innerHTML = '<option value="" disabled selected>Select Supplier</option>';
    snapshot.forEach((child) => {
      const supplier = child.val();
      const option = document.createElement("option");
      option.value = child.key;
      option.textContent = supplier.name;
      supplierSelect.appendChild(option);
    });
  });

  supplierSelect.addEventListener("change", (e) => {
    const supplierId = e.target.value;
    productSelect.innerHTML = '<option value="" disabled selected>Select Product</option>';
    if (supplierId) {
      db.ref(`suppliers/${supplierId}`).once("value", (snap) => {
        const products = snap.val()?.products?.split(",") || [];
        products.forEach(product => {
          const option = document.createElement("option");
          option.value = product.trim();
          option.textContent = product.trim();
          productSelect.appendChild(option);
        });
      });
    }
  });

  db.ref("orders").on("value", (snapshot) => {
    orderList.innerHTML = "";
    snapshot.forEach((child) => {
      const order = child.val();
      const statusColor = order.status === "Pending" ? "#f39c12" : order.status === "Processing" ? "#3498db" : "#2ecc71";
      const li = document.createElement("li");
      li.innerHTML = `Order #${child.key}: ${order.product} (Qty: ${order.quantity}) - <span style="color: ${statusColor}">${order.status || "Pending"}</span><br>Order Date: ${new Date(order.timestamp).toLocaleDateString()}`;
      const detailsBtn = document.createElement("button");
      detailsBtn.textContent = "Details";
      detailsBtn.onclick = () => showOrderDetails(child.key, order);
      const statusBtn = document.createElement("button");
      statusBtn.textContent = "Update Status";
      statusBtn.onclick = () => updateOrderStatus(child.key);
      li.appendChild(detailsBtn);
      li.appendChild(statusBtn);
      orderList.appendChild(li);
    });
  });
}

function showOrderDetails(orderId, order) {
  const supplierId = order.supplierId;
  db.ref(`suppliers/${supplierId}`).once("value", (snap) => {
    const supplier = snap.val();
    const details = `
      Order #${orderId}<br>
      Product: ${order.product}<br>
      Quantity: ${order.quantity}<br>
      Status: ${order.status || "Pending"}<br>
      Order Date: ${new Date(order.timestamp).toLocaleDateString()}<br>
      Supplier: ${supplier.name}<br>
      Contact: ${supplier.contact}<br>
      GCash: ${supplier.gcash}<br>
      Payment Status: ${order.paymentStatus || "Pending"}
    `;
    alert(details);
  });
}

function placeOrder() {
  const supplierId = document.getElementById("order-supplier").value;
  const product = document.getElementById("order-product").value;
  const quantity = document.getElementById("order-quantity").value;
  if (!supplierId || !product || !quantity) {
    alert("Please fill in all fields.");
    return;
  }
  db.ref("orders").push({ supplierId, product, quantity: parseInt(quantity), status: "Pending", paymentStatus: "Pending", timestamp: new Date().toISOString() })
    .then(() => {
      alert("Order placed! Contact supplier to proceed.");
      document.getElementById("order-supplier").value = "";
      document.getElementById("order-product").value = "";
      document.getElementById("order-quantity").value = "";
    });
}

function updateOrderStatus(orderId) {
  const status = prompt("Enter new status (e.g., Processing, Delivered):");
  if (status) db.ref(`orders/${orderId}`).update({ status });
}

// Manager: Suppliers Page
function loadSuppliersPage() {
  const mainContent = document.getElementById("main-content");
  mainContent.innerHTML = `
    <div class="dashboard-header">
      <h1>Suppliers</h1>
      <div class="user-info">
        <div class="support"><i class="fas fa-phone"></i></div>
        <div class="notifications"><i class="fas fa-bell"></i></div>
        <div class="profile" onclick="toggleDropdown()">
          <span>Manager X</span> <i class="fas fa-caret-down"></i>
          <div class="dropdown">
            <ul class="dropdown-menu">
              <li><a href="settings.html">Settings</a></li>
              <li><a href="help.html">Help</a></li>
              <li><button onclick="signOut()" class="signout-btn">Sign Out</button></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
    <div id="pages">
      <div id="page-suppliers" class="page active">
        <h2>Suppliers Management</h2>
        <p>Manage your suppliers here.</p>
        <ul id="supplierList"></ul>
      </div>
    </div>
  `;

  const supplierList = document.getElementById("supplierList");
  db.ref("suppliers").on("value", (snapshot) => {
    supplierList.innerHTML = "";
    snapshot.forEach((child) => {
      const supplier = child.val();
      const li = document.createElement("li");
      li.innerHTML = `
        ${supplier.name} - Contact: <span onclick="copyText('${supplier.contact}')">${supplier.contact}</span>, 
        GCash: <span onclick="copyText('${supplier.gcash}')">${supplier.gcash}</span><br>
        Products: ${supplier.products}
      `;
      supplierList.appendChild(li);
    });
  });
}

function copyText(text) {
  navigator.clipboard.writeText(text).then(() => alert("Copied: " + text));
}

// Manager: Reports Page
function loadReportsPage() {
  const mainContent = document.getElementById("main-content");
  mainContent.innerHTML = `
    <div class="dashboard-header">
      <h1>Reports</h1>
      <div class="user-info">
        <div class="support"><i class="fas fa-phone"></i></div>
        <div class="notifications"><i class="fas fa-bell"></i></div>
        <div class="profile" onclick="toggleDropdown()">
          <span>Manager X</span> <i class="fas fa-caret-down"></i>
          <div class="dropdown">
            <ul class="dropdown-menu">
              <li><a href="settings.html">Settings</a></li>
              <li><a href="help.html">Help</a></li>
              <li><button onclick="signOut()" class="signout-btn">Sign Out</button></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
    <div id="pages">
      <div id="page-reports" class="page active">
        <h2>Reports Management</h2>
        <p>Generate reports here.</p>
        <div id="inventory-report"></div>
        <div id="order-report"></div>
      </div>
    </div>
  `;
}

function generateInventoryReport() {
  const reportDiv = document.getElementById("inventory-report");
  db.ref("inventory").once("value", (snapshot) => {
    let totalItems = 0, lowStockItems = 0;
    let reportHTML = "<h4>Inventory Report</h4><ul>";
    snapshot.forEach((child) => {
      const item = child.val();
      totalItems++;
      if (item.stock <= item.minStock) lowStockItems++;
      reportHTML += `<li>${item.name} - Stock: ${item.stock} (Min: ${item.minStock})</li>`;
    });
    reportHTML += "</ul>";
    reportHTML += `<p>Total Items: ${totalItems}, Low Stock Items: ${lowStockItems}</p>`;
    reportDiv.innerHTML = reportHTML;
  });
}

function generateOrderReport() {
  const reportDiv = document.getElementById("order-report");
  db.ref("orders").once("value", (snapshot) => {
    let totalOrders = 0, products = {};
    let reportHTML = "<h4>Order Report</h4><ul>";
    snapshot.forEach((child) => {
      const order = child.val();
      totalOrders++;
      products[order.product] = (products[order.product] || 0) + order.quantity;
      reportHTML += `<li>Order #${child.key}: ${order.product} (Qty: ${order.quantity}) - Status: ${order.status || "Pending"}</li>`;
    });
    reportHTML += "</ul>";
    reportHTML += `<p>Total Orders: ${totalOrders}</p>`;
    reportHTML += "<h4>Popular Products</h4><ul>";
    for (let product in products) {
      reportHTML += `<li>${product}: ${products[product]} units</li>`;
    }
    reportHTML += "</ul>";
    reportDiv.innerHTML = reportHTML;
  });
}

// Initialize Dashboard on Load
document.addEventListener("DOMContentLoaded", () => {
  console.log("Manager dashboard loaded...");
  const role = localStorage.getItem("userRole");
  if (!role || role !== "user") {
    console.log("Invalid role or no role, redirecting to login...");
    window.location.href = "../login/login.html";
    return;
  }
  showManagerPage("inventory"); // Default to inventory page for testing
  loadInventoryPage();
});