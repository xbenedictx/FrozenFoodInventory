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

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

console.log("Firebase initialized with config:", firebaseConfig);

// Image mapping for inventory items
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
  "Turon": "../images/turon.jpg"
};

function signOut() {
  auth.signOut().then(() => {
    localStorage.removeItem("userRole");
    window.location.href = "../login/login.html";
  }).catch(error => {
    console.error("Sign out error:", error);
  });
}

function showPage(pageId) {
  document.querySelectorAll(".page").forEach(page => page.classList.remove("active"));
  document.querySelectorAll(".nav-list a").forEach(link => link.classList.remove("active"));
  document.getElementById(`page-${pageId}`).classList.add("active");
  document.getElementById(`nav-${pageId}`).classList.add("active");
  document.getElementById("page-title").textContent = pageId.charAt(0).toUpperCase() + pageId.slice(1).replace("-", " ");

  switch (pageId) {
    case "dashboard": loadDashboardPage(); break;
    case "inventory": loadInventoryPage(); break;
    case "suppliers": loadSupplierPage(); break;
    case "orders": loadOrderPage(); break;
    case "reports": loadReportPage(); break;
  }
}

function loadDashboardPage() {
  const metrics = document.getElementById("dashboard-metrics");
  metrics.innerHTML = "<p>Loading metrics...</p>";

  Promise.all([
    db.ref("inventory").once("value"),
    db.ref("orders").once("value")
  ]).then(([inventorySnap, ordersSnap]) => {
    const inventoryData = [];
    inventorySnap.forEach(child => inventoryData.push({ id: child.key, ...child.val() }));
    const lowStock = inventoryData.filter(item => item.stock <= (item.minStock || 0)).length;

    const recentOrders = [];
    if (ordersSnap.val()) {
      ordersSnap.forEach(child => {
        const order = child.val();
        order.id = child.key;
        recentOrders.push(order);
      });
    }
    const recentOrdersList = recentOrders.slice(-3);

    metrics.innerHTML = `
      <div class="metric-card">
        <h3>Low Stock Alerts</h3>
        <p>${lowStock} items</p>
      </div>
      <div class="metric-card">
        <h3>Recent Orders</h3>
        <ul>
          ${recentOrdersList.map(o => `
            <li>
              <strong>Order #${o.id}</strong><br>
              Supplier: ${o.supplierID}<br>
              Product: ${o.product}<br>
              Quantity: ${o.quantity}<br>
              Status: ${o.status}<br>
              Payment Status: ${o.paymentStatus}<br>
              Timestamp: ${new Date(o.timestamp).toLocaleString()}
            </li>
          `).join("")}
        </ul>
      </div>
    `;
  }).catch(error => {
    console.error("Error loading dashboard metrics:", error.message);
    metrics.innerHTML = `<p>Error loading metrics: ${error.message}</p>`;
  });
}

function loadInventoryPage() {
  const inventoryList = document.getElementById("inventoryList");
  const alerts = document.getElementById("alerts");
  const searchInput = document.getElementById("inventorySearch");

  let inventoryData = [];

  console.log("Attempting to load inventory from Firebase...");
  db.ref("inventory").on("value", (snapshot) => {
    console.log("Firebase inventory data snapshot:", snapshot.val());
    inventoryData = [];
    if (snapshot.exists()) {
      snapshot.forEach((child) => {
        const item = child.val();
        item.id = child.key;
        item.supplier = item.supplier || "Unknown";
        const [month, day, year] = item.expiration.split('-');
        item.expiration = `20${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        item.image = item.image || (imageMap[item.name] || "../images/default.jpg");
        inventoryData.push(item);
      });
      console.log("Processed inventory data:", inventoryData);
      renderInventory(inventoryData, inventoryList, alerts, searchInput.value);
    } else {
      console.warn("No inventory data found in Firebase.");
      inventoryList.innerHTML = "<p>No inventory data available.</p>";
      alerts.innerHTML = "";
    }
  }, (error) => {
    console.error("Error fetching inventory data:", error.message);
    inventoryList.innerHTML = `<p>Error loading data: ${error.message}</p>`;
    alerts.innerHTML = "";
  });

  searchInput.addEventListener("input", () => renderInventory(inventoryData, inventoryList, alerts, searchInput.value));
}

function renderInventory(data, inventoryList, alerts, searchTerm = "") {
  console.log("Rendering inventory with data:", data);
  let filteredData = data.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.description || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  inventoryList.innerHTML = "";
  const currentDate = new Date("2025-03-12");
  if (filteredData.length === 0) {
    inventoryList.innerHTML = "<p>No items match the search criteria.</p>";
    return;
  }

  filteredData.forEach(item => {
    const expirationDate = new Date(item.expiration);
    const isExpired = !isNaN(expirationDate) && expirationDate < currentDate;
    const isLowStock = item.stock <= (item.minStock || 0);

    const formattedExpiration = !isNaN(expirationDate) ? expirationDate.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }) : item.expiration;

    const container = document.createElement("div");
    container.className = `food-item ${isExpired ? 'expired' : ''} ${isLowStock ? 'low' : ''}`;
    const imageSrc = item.image || "../images/default.jpg";
    container.innerHTML = `
      <img src="${imageSrc}" alt="${item.name}" onload="console.log('Image loaded: ${imageSrc}')" onerror="console.error('Image failed to load: ${imageSrc}'); this.src='../images/default.jpg';">
      <div class="item-details">
        <div class="item-name">${item.name} ${isExpired ? '(Expired)' : ''}</div>
        <div class="item-description">Item ID: ${item.id.slice(0, 5)}</div>
        <div class="stock-info">
          <span>Supplier: ${item.supplier || 'Unknown'}</span>
          <span>Quantity: ${item.stock} kg</span>
          <span>Expiration: ${formattedExpiration} ${isExpired ? '(Expired)' : ''}</span>
        </div>
      </div>
      <div class="actions">
        <button onclick="adjustStock('${item.id}', ${item.stock})">Adjust Stock</button>
      </div>
    `;
    inventoryList.appendChild(container);
  });

  const lowStockItems = filteredData.filter(item => item.stock <= (item.minStock || 0));
  const expiredItems = filteredData.filter(item => {
    const expDate = new Date(item.expiration);
    return !isNaN(expDate) && expDate < currentDate;
  });
  alerts.innerHTML = "";
  if (lowStockItems.length) alerts.innerHTML += `<li>Low Stock Alert: ${lowStockItems.map(item => item.name).join(", ")}</li>`;
  if (expiredItems.length) alerts.innerHTML += `<li>Expired Items Alert: ${expiredItems.map(item => item.name).join(", ")}</li>`;
}

function adjustStock(id, currentStock) {
  const newStock = prompt("New Stock Amount:", currentStock);
  if (newStock) db.ref(`inventory/${id}`).update({ stock: parseInt(newStock) });
}

function loadSupplierPage() {
  const supplierList = document.getElementById("supplierList");
  supplierList.innerHTML = "<p>Loading suppliers...</p>";

  db.ref("suppliers").on("value", (snapshot) => {
    supplierList.innerHTML = "";
    if (snapshot.exists()) {
      snapshot.forEach((child) => {
        const supplier = child.val();
        supplier.id = child.key;
        const div = document.createElement("div");
        div.className = "supplier-item";
        div.innerHTML = `
          <div>${supplier.name} - ${supplier.contact}</div>
        `;
        supplierList.appendChild(div);
      });
    } else {
      supplierList.innerHTML = "<p>No suppliers found.</p>";
    }
  }, (error) => {
    console.error("Error loading suppliers:", error.message);
    supplierList.innerHTML = `<p>Error loading suppliers: ${error.message}</p>`;
  });
}

function loadOrderPage() {
  const orderList = document.getElementById("orderList");
  orderList.innerHTML = "<p>Loading orders...</p>";

  db.ref("orders").on("value", (snapshot) => {
    orderList.innerHTML = "";
    if (snapshot.exists()) {
      snapshot.forEach((child) => {
        const order = child.val();
        order.id = child.key;
        const div = document.createElement("div");
        div.className = "order-item";
        div.innerHTML = `
          <div>
            <strong>Order #${order.id}</strong><br>
            Supplier: ${order.supplierID}<br>
            Product: ${order.product}<br>
            Quantity: ${order.quantity}<br>
            Status: ${order.status}<br>
            Payment Status: ${order.paymentStatus}<br>
            Timestamp: ${new Date(order.timestamp).toLocaleString()}
          </div>
          <div class="actions">
            <button onclick="editOrder('${order.id}')">Edit</button>
          </div>
        `;
        orderList.appendChild(div);
      });
    } else {
      orderList.innerHTML = "<p>No orders found. Create an order to start.</p>";
    }
  }, (error) => {
    console.error("Error loading orders:", error.message);
    orderList.innerHTML = `<p>Error loading orders: ${error.message}</p>`;
  });
}

function addOrder() {
  const orderId = prompt("Enter order ID (e.g., order3):");
  const supplierID = prompt("Enter supplier ID:");
  const product = prompt("Enter product name:");
  const quantity = prompt("Enter quantity:");
  const status = prompt("Enter status (e.g., Pending, Shipped):");
  const paymentStatus = prompt("Enter payment status (e.g., Paid, Unpaid):");

  if (orderId && supplierID && product && quantity && status && paymentStatus) {
    const orderData = {
      supplierID,
      product,
      quantity: parseInt(quantity),
      status,
      paymentStatus,
      timestamp: new Date().toISOString()
    };

    db.ref(`orders/${orderId}`).set(orderData).then(() => {
      console.log("Order added successfully!");
      alert("Order added successfully!");
    }).catch((error) => {
      console.error("Error adding order:", error.message);
      alert("Error adding order: " + error.message);
    });
  } else {
    alert("Please fill in all required fields.");
  }
}

function editOrder(orderId) {
  const orderRef = db.ref(`orders/${orderId}`);
  orderRef.once("value", (snapshot) => {
    const order = snapshot.val();
    const newSupplierID = prompt("Enter new supplier ID:", order.supplierID);
    const newProduct = prompt("Enter new product name:", order.product);
    const newQuantity = prompt("Enter new quantity:", order.quantity);
    const newStatus = prompt("Enter new status:", order.status);
    const newPaymentStatus = prompt("Enter new payment status:", order.paymentStatus);
    if (newSupplierID && newProduct && newQuantity && newStatus && newPaymentStatus) {
      orderRef.update({
        supplierID: newSupplierID,
        product: newProduct,
        quantity: parseInt(newQuantity),
        status: newStatus,
        paymentStatus: newPaymentStatus
      }).then(() => {
        console.log("Order updated successfully!");
      }).catch((error) => {
        console.error("Error updating order:", error.message);
      });
    }
  });
}

function loadReportPage() {
  const reportOutput = document.getElementById("reportOutput");
  reportOutput.innerHTML = "<p>Select a report type and generate to view details.</p>";
}

function generateReport() {
  const reportType = document.getElementById("reportType").value;
  const reportOutput = document.getElementById("reportOutput");
  reportOutput.innerHTML = "<p>Generating report...</p>";

  switch (reportType) {
    case "inventory":
      db.ref("inventory").once("value").then((snapshot) => {
        const data = snapshot.val() ? Object.values(snapshot.val()) : [];
        reportOutput.innerHTML = `<h3>Inventory Report</h3><pre>${JSON.stringify(data, null, 2)}</pre>`;
      }).catch(error => {
        console.error("Error generating inventory report:", error.message);
        reportOutput.innerHTML = `<p>Error: ${error.message}</p>`;
      });
      break;
    case "order":
      db.ref("orders").once("value").then((snapshot) => {
        const data = snapshot.val() ? Object.entries(snapshot.val()).map(([id, order]) => ({ id, ...order })) : [];
        reportOutput.innerHTML = `<h3>Order Report</h3><pre>${JSON.stringify(data, null, 2)}</pre>`;
      }).catch(error => {
        console.error("Error generating order report:", error.message);
        reportOutput.innerHTML = `<p>Error: ${error.message}</p>`;
      });
      break;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const role = localStorage.getItem("userRole");
  console.log("DOM loaded, userRole:", role);
  if (role !== "user") {
    console.log("Redirecting to login because role is not user.");
    window.location.href = "../login/login.html";
  } else {
    showPage("dashboard");
  }
});