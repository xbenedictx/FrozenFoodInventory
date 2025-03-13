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

  if (pageId === "inventory") loadInventoryPage();
}

function loadInventoryPage() {
  const inventoryList = document.getElementById("inventoryList");
  const alerts = document.getElementById("alerts");
  const searchInput = document.getElementById("inventorySearch");

  let inventoryData = [];

  // Fetch data from Firebase
  console.log("Attempting to load inventory from Firebase...");
  db.ref("inventory").on("value", (snapshot) => {
    console.log("Firebase inventory data snapshot:", snapshot.val());
    inventoryData = [];
    if (snapshot.exists()) {
      snapshot.forEach((child) => {
        const item = child.val();
        item.id = child.key;
        item.supplier = item.supplier || "Unknown";
        item.expiration = item.expiration || "N/A";
        item.image = item.image || (imageMap[item.name] || "../images/default.jpg");
        inventoryData.push(item);
      });
      console.log("Processed inventory data:", inventoryData);
      renderInventory(inventoryData, inventoryList, alerts, searchInput.value);
    } else {
      console.warn("No inventory data found in Firebase.");
      inventoryList.innerHTML = "<p>No inventory data available. Add an item to start.</p>";
      alerts.innerHTML = "";
    }
  }, (error) => {
    console.error("Error fetching inventory data:", error.message);
    inventoryList.innerHTML = `<p>Error loading data: ${error.message}. Add an item to start.</p>`;
    alerts.innerHTML = "";
  });

  // Fallback static data for testing
  const fallbackData = [
    { id: "item1", name: "Adobo (Chicken)", stock: 40, minStock: 10, supplier: "supplier1", expiration: "2025-10-31", image: "../images/adobo.jpg" },
    { id: "item2", name: "Bagnet (Ilocano)", stock: 20, minStock: 5, supplier: "supplier2", expiration: "2024-11-04", image: "../images/bagnet.jpg" },
    { id: "item3", name: "Banana Cue", stock: 50, minStock: 15, supplier: "supplier3", expiration: "2024-11-04", image: "../images/banana-cue.jpg" },
    { id: "item4", name: "Bangus (Boneless)", stock: 30, minStock: 8, supplier: "supplier1", expiration: "2024-10-31", image: "../images/bangus.jpg" },
    { id: "item5", name: "Caldereta (Ready-to-Cook)", stock: 25, minStock: 5, supplier: "supplier2", expiration: "2025-12-01", image: "../images/caldereta.jpg" }
  ];

  // Force fallback data immediately for testing
  console.log("Using fallback data for testing...");
  renderInventory(fallbackData, inventoryList, alerts, searchInput.value);

  searchInput.addEventListener("input", () => renderInventory(inventoryData, inventoryList, alerts, searchInput.value));
}

function renderInventory(data, inventoryList, alerts, searchTerm = "") {
  console.log("Rendering inventory with data:", data);
  let filteredData = data.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.description || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  inventoryList.innerHTML = "";
  const currentDate = new Date("2025-03-12"); // Current date as per your system
  if (filteredData.length === 0) {
    inventoryList.innerHTML = "<p>No items match the search criteria.</p>";
    return;
  }

  filteredData.forEach(item => {
    const expirationDate = new Date(item.expiration);
    const isExpired = expirationDate < currentDate;
    const isLowStock = item.stock <= (item.minStock || 0);

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

  const lowStockItems = filteredData.filter(item => item.stock <= (item.minStock || 0));
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

  if (!name || !stock || !minStock || !expiration) {
    alert("Please fill in all required fields.");
    return;
  }

  const image = imageMap[name] || "../images/default.jpg";
  db.ref("inventory").push({
    name,
    description: description || "",
    stock: parseInt(stock),
    minStock: parseInt(minStock),
    supplier: supplier || "Unknown",
    expiration,
    image
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
  const itemRef = db.ref(`inventory/${itemId}`);
  itemRef.once("value", (snapshot) => {
    const item = snapshot.val();
    const newName = prompt("Enter new product name:", item.name);
    const newDesc = prompt("Enter new description:", item.description || "");
    const newStock = prompt("Enter new stock quantity:", item.stock);
    const newMinStock = prompt("Enter new minimum stock:", item.minStock);
    const newSupplier = prompt("Enter new supplier name:", item.supplier);
    const newExpiration = prompt("Enter new expiration date (YYYY-MM-DD):", item.expiration);
    if (newName && newStock && newMinStock && newExpiration) {
      const image = imageMap[newName] || "../images/default.jpg";
      itemRef.update({
        name: newName,
        description: newDesc || "",
        stock: parseInt(newStock),
        minStock: parseInt(newMinStock),
        supplier: newSupplier || "Unknown",
        expiration: newExpiration,
        image
      }).then(() => {
        console.log("Item updated successfully!");
      }).catch((error) => {
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