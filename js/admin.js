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

// Image mapping
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
  }).catch(error => console.error("Sign out error:", error));
}

function showPage(pageId) {
  document.querySelectorAll(".page").forEach(page => page.classList.remove("active"));
  document.querySelectorAll(".nav-list a").forEach(link => link.classList.remove("active"));
  document.getElementById(`page-${pageId}`).classList.add("active");
  document.getElementById(`nav-${pageId}`).classList.add("active");
  document.getElementById("page-title").textContent = pageId === "inventory" ? "Stocks" : pageId.charAt(0).toUpperCase() + pageId.slice(1).replace("-", " ");

  if (pageId === "inventory") loadInventoryPage();
}

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
          <span>Admin</span> <i class="fas fa-caret-down"></i>
          <div class="dropdown">
            <ul class="dropdown-menu">
              <li><a href="#">Settings</a></li>
              <li><a href="#">Help</a></li>
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
  console.log("Attempting to load inventory from Firebase...");
  db.ref("inventory").on("value", (snapshot) => {
    console.log("Firebase snapshot received:", snapshot.val());
    inventoryData = [];
    if (snapshot.exists()) {
      snapshot.forEach((child) => {
        const item = child.val();
        item.id = child.key;
        item.image = item.image || (imageMap[item.name] || "../images/default.jpg");
        console.log(`Item: ${item.name}, Image Path: ${item.image}`);
        inventoryData.push(item);
      });
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
    noDataMessage.textContent = `Error loading data: ${error.message}.`;
    noDataMessage.style.display = "block";
    inventoryList.innerHTML = "";
    alerts.innerHTML = "";
  });

  // Fallback data for testing
  const fallbackData = [
    { id: "item1", name: "Adobo (Chicken)", stock: 40, minStock: 10, supplier: "supplier1", expiration: "2025-10-31", image: "../images/adobo.jpg" },
    { id: "item2", name: "Bagnet (Ilocano)", stock: 20, minStock: 5, supplier: "supplier2", expiration: "2024-11-04", image: "../images/bagnet.jpg" },
    { id: "item3", name: "Banana Cue", stock: 50, minStock: 15, supplier: "supplier3", expiration: "2024-11-04", image: "../images/banana-cue.jpg" },
    { id: "item4", name: "Bangus (Boneless)", stock: 30, minStock: 8, supplier: "supplier1", expiration: "2024-10-31", image: "../images/bangus.jpg" },
    { id: "item5", name: "Caldereta (Ready-to-Cook)", stock: 25, minStock: 5, supplier: "supplier2", expiration: "2025-12-01", image: "../images/caldereta.jpg" }
  ];

  // Force fallback data immediately for testing
  console.log("Using fallback data for testing...");
  renderInventory(fallbackData, inventoryList, alerts, searchInput.value, sortSelect.value);
  noDataMessage.style.display = "none";

  searchInput.addEventListener("input", () => renderInventory(inventoryData, inventoryList, alerts, searchInput.value, sortSelect.value));
  sortSelect.addEventListener("change", () => renderInventory(inventoryData, inventoryList, alerts, searchInput.value, sortSelect.value));
}

function renderInventory(data, inventoryList, alerts, searchTerm = "", sortOption = "name-asc") {
  console.log("Rendering inventory with data:", data);
  let filteredData = data.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (item.description || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  switch (sortOption) {
    case "name-asc": filteredData.sort((a, b) => a.name.localeCompare(b.name)); break;
    case "name-desc": filteredData.sort((a, b) => b.name.localeCompare(a.name)); break;
    case "stock-asc": filteredData.sort((a, b) => a.stock - b.stock); break;
    case "stock-desc": filteredData.sort((a, b) => b.stock - a.stock); break;
    case "expiration-asc": filteredData.sort((a, b) => parseExpirationDate(a.expiration) - parseExpirationDate(b.expiration)); break;
  }

  inventoryList.innerHTML = "";
  let lowStock = [], expired = [];
  const currentDate = new Date("2025-03-12");

  if (filteredData.length === 0) {
    inventoryList.innerHTML = "<p>No items match the search criteria.</p>";
    return;
  }

  filteredData.forEach(item => {
    const expirationDate = parseExpirationDate(item.expiration);
    const isLow = item.stock <= (item.minStock || 0);
    const isExpired = expirationDate < currentDate;
    const div = document.createElement("div");
    div.className = `food-item ${isLow ? 'low' : ''} ${isExpired ? 'expired' : ''}`;
    div.innerHTML = `
      <img src="${item.image}" alt="${item.name}" 
           onload="console.log('Image loaded: ${item.image}')" 
           onerror="console.error('Image failed to load: ${item.image}'); this.src='../images/default.jpg';">
      <div>${item.name}${isExpired ? ' (Expired)' : ''}</div>
      <div>Description: ${item.description || 'N/A'}</div>
      <div>Stock: ${item.stock} / Min: ${item.minStock || 0}</div>
      <div>Supplier: ${item.supplier || 'Unknown'}</div>
      <div>Expires: ${item.expiration || 'N/A'}</div>
      <div class="actions">
        <button onclick="editItem('${item.id}')">Edit</button>
        <button onclick="db.ref('inventory/${item.id}').remove()">Delete</button>
      </div>
    `;
    inventoryList.appendChild(div);

    if (isLow) lowStock.push(item.name);
    if (isExpired) expired.push(item.name);
  });

  alerts.innerHTML = "";
  if (lowStock.length) alerts.innerHTML += `<li>Low Stock: ${lowStock.join(", ")}</li>`;
  if (expired.length) alerts.innerHTML += `<li>Expired: ${expired.join(", ")}</li>`;
}

function parseExpirationDate(expiration) {
  if (!expiration || expiration === "N/A") return new Date(0);
  const [year, month, day] = expiration.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function addItem() {
  const name = prompt("Item Name:");
  const description = prompt("Description:");
  const stock = prompt("Stock:");
  const minStock = prompt("Min Stock:");
  const supplier = prompt("Supplier:");
  const expiration = prompt("Expiration (YYYY-MM-DD):");
  if (name && stock && minStock && expiration) {
    const image = imageMap[name] || "../images/default.jpg";
    db.ref("inventory").push({
      name,
      description: description || "",
      stock: parseInt(stock),
      minStock: parseInt(minStock),
      supplier: supplier || "",
      expiration,
      image
    }).then(() => {
      console.log("Item added successfully!");
      alert("Item added successfully!");
    }).catch(error => {
      console.error("Error adding item:", error.message);
      alert("Error adding item: " + error.message);
    });
  }
}

function editItem(id) {
  const itemRef = db.ref(`inventory/${id}`);
  itemRef.once("value", (snapshot) => {
    const item = snapshot.val();
    const name = prompt("New Name:", item.name);
    const description = prompt("New Description:", item.description || "");
    const stock = prompt("New Stock:", item.stock);
    const minStock = prompt("New Min Stock:", item.minStock);
    const supplier = prompt("New Supplier:", item.supplier);
    const expiration = prompt("New Expiration (YYYY-MM-DD):", item.expiration);
    if (name && stock && minStock && expiration) {
      const image = imageMap[name] || "../images/default.jpg";
      itemRef.update({
        name,
        description: description || "",
        stock: parseInt(stock),
        minStock: parseInt(minStock),
        supplier: supplier || "",
        expiration,
        image
      }).then(() => {
        console.log("Item updated successfully!");
      }).catch(error => {
        console.error("Error updating item:", error.message);
      });
    }
  });
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

function toggleDropdown() {
  const dropdown = document.querySelector('.dropdown');
  dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
}