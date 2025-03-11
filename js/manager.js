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
  
    if (pageId === "inventory") loadInventoryPage();
    if (pageId === "orders") loadOrdersPage();
    if (pageId === "suppliers") loadSuppliersPage();
    if (pageId === "reports") loadReportsPage();
  }
  
  // Manager: Inventory Page
  function loadInventoryPage() {
    const inventoryList = document.getElementById("inventoryList");
    const alerts = document.getElementById("alerts");
    const searchInput = document.getElementById("inventorySearch");
    const sortSelect = document.getElementById("inventorySort");
  
    let inventoryData = [];
  
    db.ref("inventory").on("value", (snapshot) => {
      inventoryData = [];
      snapshot.forEach((child) => {
        const item = child.val();
        item.id = child.key;
        item.supplier = item.supplier || "Supplier A";
        item.expiration = item.expiration || "10-31-25";
        inventoryData.push(item);
      });
      renderInventory(inventoryData, inventoryList, alerts, searchInput.value, sortSelect.value);
    });
  
    searchInput.addEventListener("input", () => renderInventory(inventoryData, inventoryList, alerts, searchInput.value, sortSelect.value));
    sortSelect.addEventListener("change", () => renderInventory(inventoryData, inventoryList, alerts, searchInput.value, sortSelect.value));
  }
  
  function renderInventory(data, inventoryList, alerts, searchTerm, sortOption) {
    let filteredData = data.filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase())
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
    filteredData.forEach(item => {
      const isLowStock = item.stock <= item.minStock;
      const container = document.createElement("div");
      container.className = `food-item ${isLowStock ? 'low' : ''}`;
      container.innerHTML = `
        <img src="${imageMap[item.name] || '../images/placeholder.jpg'}" alt="${item.name}">
        <div class="item-details">
          <div class="item-name">${item.name}</div>
          <div class="item-description">Item ID: ${item.id.slice(0, 5)}</div>
          <div class="stock-info">
            <span>Supplier: ${item.supplier}</span>
            <span>Quantity: ${item.stock} kg</span>
            <span>Expiration: ${item.expiration}</span>
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
    alerts.innerHTML = lowStockItems.length ? `<li>Low Stock Alert: ${lowStockItems.map(item => item.name).join(", ")}</li>` : "";
  }
  
  function addItem() {
    const name = prompt("Enter product name:");
    const description = prompt("Enter description:");
    const stock = prompt("Enter initial stock:");
    const minStock = prompt("Enter minimum stock:");
    const supplier = prompt("Enter supplier name:");
    const expiration = prompt("Enter expiration date (MM-DD-YY):");
  
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
      alert("Item added successfully!");
    });
  }
  
  function editItem(itemId) {
    const newName = prompt("Enter new product name:");
    const newDesc = prompt("Enter new description:");
    const newStock = prompt("Enter new stock quantity:");
    const newMinStock = prompt("Enter new minimum stock:");
    const newSupplier = prompt("Enter new supplier name:");
    const newExpiration = prompt("Enter new expiration date (MM-DD-YY):");
    if (newName && newDesc && newStock && newMinStock && newSupplier && newExpiration) {
      db.ref(`inventory/${itemId}`).update({
        name: newName,
        description: newDesc,
        stock: parseInt(newStock),
        minStock: parseInt(newMinStock),
        supplier: newSupplier,
        expiration: newExpiration
      });
    }
  }
  
  // Manager: Orders Page
  function loadOrdersPage() {
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
    // Placeholder for report loading logic
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
    showManagerPage("inventory");
    loadInventoryPage();
    loadOrdersPage();
    loadSuppliersPage();
    loadReportsPage();
  });