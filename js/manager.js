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

// Image mapping updated to match the exact filenames in the images folder
const imageMap = {
  "Adobo (Chicken)": "/images/adobo.jpg",
  "Bagnet (Ilocano)": "/images/bagnet.jpg",
  "Banana Cue": "/images/banana-cue.jpg",
  "Bangus (Boneless)": "/images/bangus.jpg",
  "Caldereta (Ready-to-Cook)": "/images/caldereta.jpg",
  "Empanada (Meat)": "/images/empanada.jpg",
  "Kare-kare (Oxtail)": "/images/kare-kare.jpg",
  "Longganisa (Ilocano)": "/images/longganisa.jpg",
  "Lumpia (Pork)": "/images/lumpia.jpg",
  "Menudo (Ready-to-Cook)": "/images/menudo.jpg",
  "Shrimp (Suahe)": "/images/shrimp.jpg",
  "Siomai (Shrimp)": "/images/siomai.jpg",
  "Siopao (Asado)": "/images/siopao.jpg",
  "Squid (Rings)": "/images/squid-rings.jpg",
  "Turon": "/images/turon.jpg"
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

  console.log("Attempting to load inventory from Firebase...");
  db.ref("inventory").on("value", (snapshot) => {
    console.log("Firebase snapshot received:", snapshot.val());
    inventoryList.innerHTML = "";
    alerts.innerHTML = "";
    if (!snapshot.exists()) {
      inventoryList.innerHTML = "<p>No inventory data available.</p>";
      console.log("No inventory data found in Firebase.");
      return;
    }

    let lowStock = [], expired = [];
    const currentDate = new Date();

    snapshot.forEach((child) => {
      const item = child.val();
      item.id = child.key;
      item.image = imageMap[item.name] || "/images/default.jpg";
      console.log(`Item: ${item.name}, Image Path: ${item.image}`);
      const expirationDate = parseExpirationDate(item.expiration);
      const isLow = item.stock <= item.minStock;
      const isExpired = expirationDate < currentDate;

      const div = document.createElement("div");
      div.className = `food-item ${isLow || isExpired ? 'low' : ''}`;
      div.innerHTML = `
        <img src="${item.image}" alt="${item.name}" onerror="this.onerror=null; this.src='/images/default.jpg'; console.log('Image load failed for ${item.image}, using default');">
        <div>${item.name}${isExpired ? ' (Expired)' : ''}</div>
        <div>Description: ${item.description}</div>
        <div>Stock: ${item.stock} / Min: ${item.minStock}</div>
        <div>Supplier: ${item.supplier}</div>
        <div>Expires: ${item.expiration}</div>
        <button onclick="adjustStock('${item.id}', ${item.stock})">Adjust Stock</button>
      `;
      inventoryList.appendChild(div);

      if (isLow) lowStock.push(item.name);
      if (isExpired) expired.push(item.name);
    });

    if (lowStock.length) alerts.innerHTML += `<li>Low Stock: ${lowStock.join(", ")}</li>`;
    if (expired.length) alerts.innerHTML += `<li>Expired: ${expired.join(", ")}</li>`;
  }, (error) => {
    console.error("Error loading inventory:", error);
  });
}

function parseExpirationDate(expiration) {
  const [month, day, year] = expiration.split('-').map(Number);
  const fullYear = 2000 + year;
  return new Date(fullYear, month - 1, day);
}

function adjustStock(id, currentStock) {
  const newStock = prompt("New Stock Amount:", currentStock);
  if (newStock) db.ref(`inventory/${id}`).update({ stock: parseInt(newStock) });
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