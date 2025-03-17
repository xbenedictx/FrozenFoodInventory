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

// Sign In
function signIn() {
  console.log("Sign-in process started...");
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  const role = document.getElementById("role").value;

  console.log("Inputs - Email:", email, "Password:", password, "Role:", role);

  if (!role) {
    alert("Please select a role.");
    console.log("Role not selected, aborting.");
    return;
  }
  if (!email || !password) {
    alert("Please enter both email and password.");
    console.log("Email or password missing, aborting.");
    return;
  }

  auth.signInWithEmailAndPassword(email, password)
    .then((userCredential) => {
      console.log("Sign-in successful for:", userCredential.user.email);
      localStorage.setItem("userRole", role);
      console.log("Role stored:", role);
      if (role === "user") {
        console.log("Redirecting to Manager dashboard...");
        window.location.href = "../manager/manager.html";
      } else if (role === "admin") {
        console.log("Redirecting to Admin dashboard...");
        window.location.href = "../admin/admin.html";
      }
    })
    .catch((error) => {
      console.error("Sign-in error:", error.code, error.message);
      alert("Login failed: " + error.message);
    });
}

// Initialize on Load
document.addEventListener("DOMContentLoaded", () => {
  console.log("Login page loaded...");
  const role = localStorage.getItem("userRole");
  if (role) {
    console.log("Role found:", role);
    if (role === "user") window.location.href = "../manager/manager.html";
    else if (role === "admin") window.location.href = "../admin/admin.html";
  }
});