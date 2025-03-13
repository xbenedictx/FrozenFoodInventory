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

function signOut() {
  auth.signOut().then(() => {
    localStorage.removeItem("userRole");
    window.location.href = "../login/login.html";
  });
}

function showPage(pageId) {
  document.querySelectorAll(".page").forEach(page => page.classList.remove("active"));
  document.querySelectorAll(".nav-list a").forEach(link => link.classList.remove("active"));
  document.getElementById(`page-${pageId}`).classList.add("active");
  document.getElementById(`nav-${pageId}`).classList.add("active");
  document.getElementById("page-title").textContent = pageId.charAt(0).toUpperCase() + pageId.slice(1).replace("-", " ");

  if (pageId === "inventory") loadInventoryPage();
  // Add other page loaders as needed
}

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

function adjustStock(id, currentStock) {
  const newStock = prompt("New Stock Amount:", currentStock);
  if (newStock) db.ref(`inventory/${id}`).update({ stock: parseInt(newStock) });
}

document.addEventListener("DOMContentLoaded", () => {
  const role = localStorage.getItem("userRole");
  if (role !== "user") window.location.href = "../login/login.html";
  showPage("dashboard");
});