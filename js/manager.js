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

let currentBranch = null;
let currentUser = null;
let authChecked = false;

/**
 * Signs out the current user and redirects to the login page.
 * Removes the user role from local storage as part of the logout process.
 */
function signOut() {
    auth.signOut().then(() => {
      localStorage.removeItem("userRole");
      localStorage.removeItem("userId");
      window.location.href = "../login/login.html";
    });
  }

  async function getCurrentUserData() {
    return new Promise((resolve, reject) => {
      const unsubscribe = auth.onAuthStateChanged(async (user) => {
        unsubscribe(); // Remove the listener after first invocation
        
        if (!user) {
          reject(new Error("No user logged in"));
          return;
        }
  
        try {
          const snapshot = await db.ref(`users/${user.uid}`).once('value');
          const userData = snapshot.val();
          
          if (!userData) {
            reject(new Error("User data not found"));
            return;
          }
          
          resolve({
            authData: {
              uid: user.uid,
              email: user.email,
              emailVerified: user.emailVerified
            },
            dbData: userData
          });
        } catch (error) {
          console.error("Error fetching user data:", error);
          reject(error);
        }
      });
    });
  }
  
  
  // Usage:
  getCurrentUserData().then((userData) => {
    console.log("Full user data:", userData);
  });

  function updateUserProfile(name, branchId) {
    const user = auth.currentUser;
    if (!user) return;
    
    const updates = {};
    if (name) updates['users/' + user.uid + '/name'] = name;
    if (branchId) updates['users/' + user.uid + '/branchId'] = branchId;
    
    return db.ref().update(updates);
  }

// Keep only ONE DOMContentLoaded event listener
document.addEventListener("DOMContentLoaded", () => {
    // Prevent multiple initializations
    if (authChecked) return;
    authChecked = true;
  
    console.log("Manager page initializing...");
    
    // Set up a SINGLE auth state listener
    auth.onAuthStateChanged(async (user) => {
      console.log("Auth state changed. User:", user ? "logged in" : "logged out");
      
      if (!user) {
        console.log("No authenticated user, redirecting to login");
        window.location.href = "../login/login.html";
        return;
      }
  
      try {
        // Log the user's UID for debugging
        console.log("Current user UID:", user.uid);
        
        // Check user data from database with detailed logging
        const snapshot = await db.ref(`users/${user.uid}`).once('value');
        console.log("User data retrieved:", snapshot.exists() ? "exists" : "does not exist");
        
        if (!snapshot.exists()) {
          console.error("User data not found in database for UID:", user.uid);
          signOut();
          return;
        }
        
        const userData = snapshot.val();
        console.log("User role:", userData.role);
        
        // Verify the role
        if (userData.role !== "manager") {
          console.error("User role is not manager:", userData.role);
          signOut();
          return;
        }
        
        // Store necessary data
        localStorage.setItem("userRole", userData.role);
        localStorage.setItem("userId", user.uid);
        currentUser = user;
        
        // Check branch assignment
        console.log("Checking branch assignment, branchId:", userData.branchId);
        if (!userData.branchId) {
          console.error("No branch assigned to manager:", user.uid);
          alert("Error: No branch assigned to your account. Please contact admin.");
          signOut();
          return;
        }
        
        currentBranch = userData.branchId;
        
        // Load branch details
        try {
          const branchSnapshot = await db.ref(`branches/${currentBranch}`).once('value');
          console.log("Branch data retrieved:", branchSnapshot.exists() ? "exists" : "does not exist");
          
          if (!branchSnapshot.exists()) {
            console.error("Branch data not found for ID:", currentBranch);
            alert("Error: Branch data not found. Please contact admin.");
            signOut();
            return;
          }
          
          const branchData = branchSnapshot.val();
          
          // Update UI with branch name
          const branchNameElement = document.getElementById("branch-name");
          if (branchNameElement) {
            branchNameElement.textContent = branchData.name || "Unnamed Branch";
          }
          
          // Initialize dashboard now that everything is verified
          showPage("dashboard");
          
        } catch (branchError) {
          console.error("Error loading branch data:", branchError);
          alert("Error loading branch data: " + branchError.message);
          signOut();
        }
        
      } catch (error) {
        console.error("Session verification failed:", error);
        alert("Authentication error: " + error.message);
        signOut();
      }
    });
  });


  async function verifyUserSession() {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.log("No authenticated user");
        return false;
      }
  
      // Get fresh user data from database
      const snapshot = await db.ref(`users/${user.uid}`).once('value');
      const userData = snapshot.val();
      
      if (!userData) {
        console.error("User data not found in database");
        return false;
      }
  
      // Check if user has the correct role
      if (userData.role !== "manager") {
        console.error("User role mismatch:", userData.role);
        return false;
      }
  
      // Store minimal required data
      localStorage.setItem("userRole", userData.role);
      localStorage.setItem("userId", user.uid);
      currentUser = user;
  
      return true;
    } catch (error) {
      console.error("Session verification failed:", error);
      return false;
    }
  }

  async function initializeManagerDashboard() {
    // Add branch name display if not exists
    const header = document.querySelector("header");
    if (header && !document.getElementById("branch-name")) {
      header.insertAdjacentHTML("beforeend", '<div id="branch-name" style="margin-left: auto; padding: 0 20px;"></div>');
    }
  
    const isAuthenticated = await verifyUserSession();
    if (!isAuthenticated) {
      signOut();
      return;
    }
  
    // Only proceed if we have a valid session
    showPage("dashboard");
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
    if (pageId === "dashboard") loadDashboardPage();
  }
  
  function loadDashboardPage() {
    const page = document.getElementById("page-dashboard");
    
    if (!page) {
        console.error("Dashboard page element not found");
        return;
    }

    // First completely set up the dashboard structure
    page.innerHTML = `
        <div class="dashboard-content">
            <h2>${currentBranch ? currentBranch + " Dashboard" : "Dashboard"}</h2>
            <div id="dashboard-metrics" class="metrics-container">
                <div class="loading-spinner">
                    <i class="fas fa-spinner fa-spin"></i> Loading metrics...
                </div>
            </div>
        </div>
    `;

    // Now we can safely get the metrics container
    const metrics = document.getElementById("dashboard-metrics");
    
    if (!currentBranch) {
        metrics.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p>No branch assigned to your account. Please contact admin.</p>
            </div>
        `;
        return;
    }

    // Show loading state
    metrics.innerHTML = `
        <div class="loading-spinner">
            <i class="fas fa-spinner fa-spin"></i> Loading branch data...
        </div>
    `;

    Promise.all([
        db.ref(`branch_inventory/${currentBranch}`).once("value"),
        db.ref(`branch_orders/${currentBranch}`).once("value"),
        db.ref(`branch_suppliers/${currentBranch}`).once("value"),
    ])
    .then(([inventorySnap, ordersSnap, suppliersSnap]) => {
        // [Previous data processing code remains the same...]
        
        // Build the dashboard HTML
        metrics.innerHTML = `
            <div class="metric-grid">
                <!-- Metric cards go here (same as before) -->
            </div>
        `;
    })
    .catch((error) => {
        console.error("Error loading dashboard metrics:", error);
        metrics.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                <p>Failed to load dashboard data</p>
                <p class="error-detail">${error.message}</p>
                <button class="retry-btn" onclick="loadDashboardPage()">
                    <i class="fas fa-sync-alt"></i> Try Again
                </button>
            </div>
        `;
    });
}

/**
 * Loads the manager's assigned branch from Firebase
 */
async function loadManagerBranch() {
    try {
      const userData = await getCurrentUserData();
      
      if (!userData?.dbData) {
        throw new Error("User data not found in database");
      }
  
      // Ensure the user has a branch assigned
      if (!userData.dbData.branchId) {
        console.error("Manager has no branch assigned:", userData.authData.email);
        throw new Error("No branch assigned to your account. Contact admin.");
      }
  
      currentBranch = userData.dbData.branchId;
      currentUser = userData.authData;
  
      // Load branch details (name, location, etc.)
      const branchSnapshot = await db.ref(`branches/${currentBranch}`).once('value');
      const branchData = branchSnapshot.val();
  
      if (!branchData) {
        throw new Error("Branch data not found");
      }
  
      // Update UI with branch name
      const branchNameElement = document.getElementById("branch-name");
      if (branchNameElement) {
        branchNameElement.textContent = branchData.name || "Unnamed Branch";
      }
  
      return true; // Success
    } catch (error) {
      console.error("loadManagerBranch failed:", error.message);
      alert(`Error: ${error.message}`); // Show specific error
      signOut(); // Force logout on failure
      return false;
    }
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
    
    if (!currentBranch) {
      page.innerHTML += "<p>Error: No branch assigned to your account. Please contact admin.</p>";
      return;
    }
  
    const inventoryList = document.getElementById("inventoryList");
    const alerts = document.getElementById("alerts");
  
    db.ref(`branch_inventory/${currentBranch}`).on("value", (snapshot) => {
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
    if (newStock) {
      db.ref(`branch_inventory/${currentBranch}/${id}`).update({ 
        stock: parseInt(newStock) 
      });
    }
  }

