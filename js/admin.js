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
  
  // Navigation for Admin Dashboard
  function showAdminPage(pageId) {
    document.querySelectorAll(".page").forEach(page => page.classList.remove("active"));
    document.querySelectorAll(".nav button").forEach(btn => btn.classList.remove("active"));
    document.getElementById(`page-${pageId}`).classList.add("active");
    document.getElementById(`nav-${pageId}`).classList.add("active");
  
    if (pageId === "users") loadUsersPage();
    if (pageId === "suppliers") loadSuppliersAdminPage();
    if (pageId === "branches") loadBranchesPage();
  }
  
  // Admin: Users Page
  function loadUsersPage() {
    const branchSelect = document.getElementById("newUserBranch");
    const userList = document.getElementById("userList");
  
    db.ref("branches").on("value", (snapshot) => {
      branchSelect.innerHTML = '<option value="" disabled selected>Select Branch</option>';
      snapshot.forEach((child) => {
        const branch = child.val();
        const option = document.createElement("option");
        option.value = child.key;
        option.textContent = branch.name;
        branchSelect.appendChild(option);
      });
    });
  
    db.ref("users").on("value", (snapshot) => {
      userList.innerHTML = "";
      snapshot.forEach((child) => {
        const user = child.val();
        const li = document.createElement("li");
        li.textContent = `Email: ${user.email}, Branch ID: ${user.branchId}`;
        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "Delete";
        deleteBtn.onclick = () => db.ref("users/" + child.key).remove();
        li.appendChild(deleteBtn);
        userList.appendChild(li);
      });
    });
  }
  
  function addUser() {
    const email = document.getElementById("newUserEmail").value.trim();
    const password = document.getElementById("newUserPassword").value.trim();
    const branchId = document.getElementById("newUserBranch").value;
    if (!email || !password || !branchId) {
      alert("Please fill in all fields.");
      return;
    }
    auth.createUserWithEmailAndPassword(email, password)
      .then((userCredential) => {
        db.ref("users").push({ email, role: "user", branchId });
        document.getElementById("newUserEmail").value = "";
        document.getElementById("newUserPassword").value = "";
        document.getElementById("newUserBranch").value = "";
      })
      .catch((error) => alert("User creation error: " + error.message));
  }
  
  // Admin: Suppliers Page
  function loadSuppliersAdminPage() {
    const supplierList = document.getElementById("supplierList");
    db.ref("suppliers").on("value", (snapshot) => {
      supplierList.innerHTML = "";
      snapshot.forEach((child) => {
        const supplier = child.val();
        const li = document.createElement("li");
        li.textContent = `${supplier.name} - Contact: ${supplier.contact}, GCash: ${supplier.gcash}, Products: ${supplier.products}`;
        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "Delete";
        deleteBtn.onclick = () => db.ref("suppliers/" + child.key).remove();
        li.appendChild(deleteBtn);
        supplierList.appendChild(li);
      });
    });
  }
  
  function addSupplier() {
    const name = document.getElementById("newSupplierName").value.trim();
    const contact = document.getElementById("newSupplierContact").value.trim();
    const gcash = document.getElementById("newSupplierGCash").value.trim();
    const products = document.getElementById("newSupplierProduct").value.trim();
    if (!name || !contact || !gcash || !products) {
      alert("Please fill in all fields.");
      return;
    }
    db.ref("suppliers").push({ name, contact, gcash, products }).then(() => {
      document.getElementById("newSupplierName").value = "";
      document.getElementById("newSupplierContact").value = "";
      document.getElementById("newSupplierGCash").value = "";
      document.getElementById("newSupplierProduct").value = "";
    });
  }
  
  // Admin: Branches Page
  function loadBranchesPage() {
    const branchList = document.getElementById("branchList");
    db.ref("branches").on("value", (snapshot) => {
      branchList.innerHTML = "";
      snapshot.forEach((child) => {
        const branch = child.val();
        const li = document.createElement("li");
        li.textContent = `Branch: ${branch.name}`;
        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "Delete";
        deleteBtn.onclick = () => db.ref("branches/" + child.key).remove();
        li.appendChild(deleteBtn);
        branchList.appendChild(li);
      });
    });
  }
  
  function addBranch() {
    const name = document.getElementById("newBranchName").value.trim();
    if (!name) {
      alert("Please enter a branch name.");
      return;
    }
    db.ref("branches").push({ name }).then(() => {
      document.getElementById("newBranchName").value = "";
    });
  }
  
  // Initialize Dashboard on Load
  document.addEventListener("DOMContentLoaded", () => {
    console.log("Admin dashboard loaded...");
    const role = localStorage.getItem("userRole");
    if (!role || role !== "admin") {
      console.log("Invalid role or no role, redirecting to login...");
      window.location.href = "../login/login.html";
      return;
    }
    showAdminPage("users");
    loadUsersPage();
    loadSuppliersAdminPage();
    loadBranchesPage();
  });