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

function signIn() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  const role = document.getElementById("role").value;

  if (!role || !email || !password) {
    alert("Please fill in all fields.");
    return;
  }

  auth.signInWithEmailAndPassword(email, password)
    .then((userCredential) => {
      localStorage.setItem("userRole", role);
      window.location.href = role === "user" ? "../manager/manager.html" : "../admin/admin.html";
    })
    .catch((error) => alert("Login failed: " + error.message));
}

document.addEventListener("DOMContentLoaded", () => {
  const role = localStorage.getItem("userRole");
  if (role) window.location.href = role === "user" ? "../manager/manager.html" : "../admin/admin.html";
});