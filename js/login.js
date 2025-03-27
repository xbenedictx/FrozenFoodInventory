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

//  credentials for validation 
const validCredentials = {
  admin: {
    email: "elevazobenedict@gmail.com", 
    password: "Benedict_123$$", 
    redirect: "../admin/admin.html"
  },
  user: { 
    email: "beme.mendavia.up@phinmaed.com",
    password: "Mendavia_123%%",
    redirect: "../manager/manager.html"
  }
};

// Sign In
function signIn() {
  console.log("Sign-in process started...");
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  const role = document.getElementById("role").value;

  console.log("Inputs - Email:", email, "Password:", password, "Role:", role);

  // Validate inputs
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

  // Validate role and credentials
  const expectedCredentials = validCredentials[role];
  if (!expectedCredentials) {
    alert("Invalid role selected.");
    console.log("Invalid role, aborting.");
    return;
  }

  // Check if the provided credentials match the selected role
  if (email !== expectedCredentials.email || password !== expectedCredentials.password) {
    alert(`Invalid credentials for ${role === "admin" ? "Admin" : "Manager"} role. Please use the correct email and password.`);
    console.log(`Credential mismatch for role ${role}. Expected: ${expectedCredentials.email}, Got: ${email}`);
    return;
  }

  // If credentials match, proceed with Firebase Authentication
  auth.signInWithEmailAndPassword(email, password)
    .then((userCredential) => {
      console.log("Sign-in successful for:", userCredential.user.email);
      localStorage.setItem("userRole", role);
      console.log("Role stored:", role);
      // Redirect to the appropriate dashboard based on role
      window.location.href = expectedCredentials.redirect;
    })
    .catch((error) => {
      console.error("Sign-in error:", error.code, error.message);
      alert("Login failed: " + error.message);
    });
}

// Forgot Password
function forgotPassword() {
  console.log("Forgot Password function called...");
  let email = document.getElementById("email").value.trim();
  const errorMessage = document.getElementById("error-message");

  // Reset error message
  if (errorMessage) {
    errorMessage.style.display = "none";
    errorMessage.textContent = "";
  }

  // Validate email, prompt if empty
  if (!email) {
    email = prompt("Please enter your email address to reset your password:") || "";
    email = email.trim();
    if (!email) {
      const message = "Email is required to reset your password.";
      console.log(message);
      if (errorMessage) {
        errorMessage.style.color = "red";
        errorMessage.textContent = message;
        errorMessage.style.display = "block";
      } else {
        alert(message);
      }
      return;
    }
  }

  // Send password reset email
  console.log("Sending password reset email to:", email);
  auth.sendPasswordResetEmail(email)
    .then(() => {
      const message = "Password reset email sent! Please check your inbox (and spam/junk folder).";
      console.log(message);
      if (errorMessage) {
        errorMessage.style.color = "green";
        errorMessage.textContent = message;
        errorMessage.style.display = "block";
      } else {
        alert(message);
      }
    })
    .catch((error) => {
      console.error("Password reset error:", error.code, error.message);
      let message;
      switch (error.code) {
        case "auth/invalid-email":
          message = "Invalid email format. Please enter a valid email address.";
          break;
        case "auth/user-not-found":
          message = "No user found with this email address.";
          break;
        default:
          message = `Failed to send password reset email: ${error.message}`;
      }
      if (errorMessage) {
        errorMessage.style.color = "red";
        errorMessage.textContent = message;
        errorMessage.style.display = "block";
      } else {
        alert(message);
      }
    });
}

// Initialize on Load
document.addEventListener("DOMContentLoaded", () => {
  console.log("Login page loaded...");

  // Check if user is already logged in
  const role = localStorage.getItem("userRole");
  if (role) {
    console.log("Role found:", role);
    if (role === "user") window.location.href = "../manager/manager.html";
    else if (role === "admin") window.location.href = "../admin/admin.html";
  }

  // Attach signIn to form submission
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    console.log("Login form found, attaching submit event listener...");
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      signIn();
    });
  } else {
    console.error("Login form with id='loginForm' not found!");
  }

  // Attach forgotPassword to the Forgot Password link
  const forgotPasswordLink = document.getElementById("forgot-password");
  if (forgotPasswordLink) {
    console.log("Forgot Password link found, attaching click event listener...");
    forgotPasswordLink.addEventListener("click", (e) => {
      e.preventDefault();
      console.log("Forgot Password link clicked!");
      forgotPassword();
    });
  } else {
    console.error("Forgot Password link with id='forgot-password' not found!");
  }

  // Attach password toggle functionality
  const toggleIcon = document.getElementById("toggleIcon");
  if (toggleIcon) {
    console.log("Toggle icon found, attaching click event listener...");
    toggleIcon.addEventListener("click", () => {
      const passwordInput = document.getElementById("password");
      const toggleContainer = toggleIcon.parentElement;
      if (passwordInput) {
        if (passwordInput.type === "password") {
          passwordInput.type = "text";
          toggleContainer.classList.add("revealed");
        } else {
          passwordInput.type = "password";
          toggleContainer.classList.remove("revealed");
        }
      } else {
        console.error("Password input with id='password' not found!");
      }
    });
  } else {
    console.error("Toggle icon with id='toggleIcon' not found!");
  }
});