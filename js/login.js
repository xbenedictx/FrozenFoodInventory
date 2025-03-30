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

  
//  credentials for validation 
// const validCredentials = {
//   admin: {
//     email: "elevazobenedict@gmail.com", 
//     password: "Benedict_123$$", 
//     redirect: "../admin/admin.html"
//   },
//   user: { 
//     email: "beme.mendavia.up@phinmaed.com",
//     password: "Mendavia_123%%",
//     redirect: "../manager/manager.html"
//   }
// };


// Initialize on Load
document.addEventListener("DOMContentLoaded", () => {
    console.log("Login page loaded...");

    // Attach signIn to form submission
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
        loginForm.addEventListener("submit", (e) => {
            e.preventDefault();
            signIn();
        });
    }

    // Check auth state
    auth.onAuthStateChanged((user) => {
        if (user) {
            db.ref('users/' + user.uid).once('value')
                .then((snapshot) => {
                    if (!snapshot.exists()) {
                        console.error("No user data found");
                        return auth.signOut();
                    }
                    
                    // Just verify user exists, but don't redirect automatically
                    console.log("User is authenticated, but waiting for role verification");
                })
                .catch((error) => {
                    console.error("Database error:", error);
                    auth.signOut();
                });
        }
    });


    // Check if user is already logged in
    // const role = localStorage.getItem("userRole");
    // if (role) {
    //     console.log("Role found:", role);
    //     if (role === "manager") {
    //         window.location.href = "../manager/manager.html";
    //     } else if (role === "admin") {
    //         window.location.href = "../admin/admin.html";
    //     }
    // }


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

// Sign In
function signIn() {
    const email = document.getElementById("email").value.trim().toLowerCase();
    const password = document.getElementById("password").value.trim();
    const selectedRole = document.getElementById("role").value;
    const errorElement = document.getElementById("error-message");
    
    // Clear previous errors
    if (errorElement) {
        errorElement.style.display = "none";
        errorElement.textContent = "";
    }

    if (!selectedRole) {
        showLoginError("Please select your role");
        return;
    }

    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            const uid = userCredential.user.uid;
            // Store the UID immediately while we have access to userCredential
            localStorage.setItem("userId", uid);
            
            return db.ref(`users/${uid}`).once('value');
        })
        .then((snapshot) => {
            if (!snapshot.exists()) {
                auth.signOut();
                throw new Error("User account not properly configured");
            }

            const userData = snapshot.val();
            
            // Verify role BEFORE any redirection
            if (selectedRole !== userData.role) {
                auth.signOut();
                throw new Error(`Your account is registered as ${userData.role}. Please select the correct role.`);
            }

            // Store role
            localStorage.setItem("userRole", userData.role);

            // Redirect based on verified role
            window.location.href = userData.role === "admin" 
                ? "../admin/admin.html" 
                : "../manager/manager.html";
        })
        .catch((error) => {
            console.error("Login error:", error);
            showLoginError(error.message);
            auth.signOut();
        });
}

function showLoginError(message) {
    const errorElement = document.getElementById("error-message");
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = "block";
        errorElement.style.color = "#ff4d4f";
    } else {
        alert(message); // Fallback
    }
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
