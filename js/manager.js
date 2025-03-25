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

/**
 * Signs out the current user and redirects to the login page.
 * Removes the user role from local storage as part of the logout process.
 */
function signOut() {
  auth.signOut().then(() => {
    localStorage.removeItem("userRole");
    window.location.href = "../login/login.html";
  });
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
  // Add other page loaders as needed
}

/**
 * Loads the inventory page content from Firebase.
 * Sets up event listeners for searching inventory items.
 * Falls back to default data if Firebase retrieval fails.
 */
function loadInventoryPage() {
  const page = document.getElementById("page-inventory");
  page.innerHTML = `
    <h2>Inventory Management</h2>
    <div id="inventoryList"></div>
    <h3>Alerts</h3>
    <ul id="alerts"></ul>
  `;
  const inventoryList = document.getElementById("inventoryList");
  const alerts = document.getElementById("alerts");

  db.ref("inventory").on("value", (snapshot) => {
    inventoryList.innerHTML = "";
    alerts.innerHTML = "";
    let lowStock = [], expired = [];
    snapshot.forEach((child) => {
      const item = child.val();
      item.id = child.key;
      const li = document.createElement("li");
      li.textContent = `${item.name} - Stock: ${item.stock}, Expires: ${item.expiration}`;
      const adjustBtn = document.createElement("button");
      adjustBtn.textContent = "Adjust Stock";
      adjustBtn.onclick = () => adjustStock(item.id, item.stock);
      li.appendChild(adjustBtn);
      inventoryList.appendChild(li);

      if (item.stock <= item.minStock) lowStock.push(item.name);
      if (new Date(item.expiration) < new Date()) expired.push(item.name);
    });
    if (lowStock.length) alerts.innerHTML += `<li>Low Stock: ${lowStock.join(", ")}</li>`;
    if (expired.length) alerts.innerHTML += `<li>Expired: ${expired.join(", ")}</li>`;
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
  if (newStock) db.ref(`inventory/${id}`).update({ stock: parseInt(newStock) });
}

document.addEventListener("DOMContentLoaded", () => {
  const role = localStorage.getItem("userRole");
  if (role !== "user") window.location.href = "../login/login.html";
  showPage("dashboard");
});