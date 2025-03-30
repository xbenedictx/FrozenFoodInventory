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
          // Directly access using auth UID
          db.ref('users/' + user.uid).once('value')
            .then((snapshot) => {
              if (!snapshot.exists()) {
                console.error("No user data found for UID:", user.uid);
                return auth.signOut();
              }
      
              const userData = snapshot.val();
              if (userData.role === "manager") {
                window.location.href = "../manager/manager.html";
              } else if (userData.role === "admin") {
                window.location.href = "../admin/admin.html";
              }
            })
            .catch((error) => {
              console.error("Database error:", error);
              auth.signOut();
            });
        }
      });

    // Check if user is already logged in
    const role = localStorage.getItem("userRole");
    if (role) {
        console.log("Role found:", role);
        if (role === "manager") {
            window.location.href = "../manager/manager.html";
        } else if (role === "admin") {
            window.location.href = "../admin/admin.html";
        }
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

// Add this at the top of your login.js (after DOMContentLoaded)
const registerModal = document.createElement('div');
registerModal.id = 'registerModal';
registerModal.className = 'modal';
registerModal.innerHTML = `
  <div class="modal-content">
    <span class="close">&times;</span>
    <h2>Register New Account</h2>
    <form id="registerForm">
      <input type="text" id="registerName" placeholder="Full Name" required>
      <input type="email" id="registerEmail" placeholder="Email" required>
      <input type="password" id="registerPassword" placeholder="Password" required>
      <select id="registerRole" required>
        <option value="" disabled selected>Select role</option>
        <option value="manager">Manager</option>
        <option value="admin">Admin</option>
      </select>
      <input type="text" id="registerBranch" placeholder="Branch ID (optional)">
      <button type="submit">Register</button>
    </form>
    <p id="register-error" style="color: red; display: none;"></p>
  </div>
`;
document.body.appendChild(registerModal);

// Add this inside your DOMContentLoaded event listener
const registerLink = document.getElementById('register-link');
if (registerLink) {
  registerLink.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('registerModal').style.display = 'block';
  });
}

// Close modal when clicking X
const closeBtn = document.querySelector('.close');
if (closeBtn) {
  closeBtn.addEventListener('click', () => {
    registerModal.style.display = 'none';
  });
}

// Close modal when clicking outside
window.addEventListener('click', (e) => {
  if (e.target === registerModal) {
    registerModal.style.display = 'none';
  }
});

// Handle registration form submission
const registerForm = document.getElementById('registerForm');
if (registerForm) {
  registerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    // Get form values
    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim().toLowerCase();
    const password = document.getElementById('registerPassword').value;
    const role = document.getElementById('registerRole').value;
    const branchId = document.getElementById('registerBranch').value.trim() || 'default_branch';
    
    // Validate inputs
    if (!name || !email || !password || !role) {
      showRegisterError('Please fill all required fields');
      return;
    }

    if (password.length < 6) {
      showRegisterError('Password must be at least 6 characters');
      return;
    }

    // Disable button during registration
    const submitBtn = registerForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Registering...';

    // Register user
    auth.createUserWithEmailAndPassword(email, password)
      .then((userCredential) => {
        const user = userCredential.user;
        console.log('Registered user UID:', user.uid); // Debug log

        // Create user document under their UID
        return db.ref(`users/${user.uid}`).set({
          name: name,
          email: email,
          role: role,
          branchId: branchId,
          createdAt: firebase.database.ServerValue.TIMESTAMP,
          lastLogin: null,
          status: 'active'
        });
      })
      .then(() => {
        // Success handling
        registerModal.style.display = 'none';
        registerForm.reset();
        
        // Show success message (better than alert)
        const successElement = document.createElement('div');
        successElement.className = 'success-message';
        successElement.textContent = 'Registration successful! You can now login.';
        registerForm.appendChild(successElement);
        setTimeout(() => successElement.remove(), 5000);
      })
      .catch((error) => {
        console.error('Registration error:', error);
        
        // Enhanced error messages
        let errorMessage;
        switch (error.code) {
          case 'auth/email-already-in-use':
            errorMessage = 'This email is already registered.';
            break;
          case 'auth/invalid-email':
            errorMessage = 'Please enter a valid email address.';
            break;
          case 'auth/weak-password':
            errorMessage = 'Password must be at least 6 characters.';
            break;
          case 'auth/operation-not-allowed':
            errorMessage = 'Registration is currently disabled.';
            break;
          default:
            errorMessage = `Registration failed: ${error.message}`;
        }
        
        showRegisterError(errorMessage);
      })
      .finally(() => {
        // Re-enable button
        submitBtn.disabled = false;
        submitBtn.textContent = 'Register';
      });
  });
}

// Enhanced error display function
function showRegisterError(message) {
  const errorElement = document.getElementById('register-error');
  errorElement.textContent = message;
  errorElement.style.display = 'block';
  errorElement.style.color = '#ff4d4f';
  errorElement.style.marginTop = '10px';
  
  // Auto-hide error after 5 seconds
  setTimeout(() => {
    errorElement.style.display = 'none';
  }, 5000);
}
// Modified registerUser function to ensure data is saved correctly
function registerUser(email, password, name, role = "manager") {
    auth.createUserWithEmailAndPassword(email, password)
    .then((userCredential) => {
      const user = userCredential.user;
      
      // Save under the UID with additional metadata
      return db.ref(`users/${user.uid}`).set({
        name: name,
        email: email,
        role: role,
        branchId: branchId || null,
        createdAt: firebase.database.ServerValue.TIMESTAMP,
        lastLogin: null,
        status: 'active',
        // Add any other required fields
        isCustomId: false // Mark as using Firebase UID
      });
    })
      .then(() => {
        console.log("User created successfully with UID as key");
        alert("Registration successful! You can now login.");
      })
      .catch((error) => {
        console.error("Registration error:", error);
        let errorMessage = "Registration failed: ";
        
        // More specific error messages
        switch(error.code) {
          case "auth/email-already-in-use":
            errorMessage += "This email is already registered.";
            break;
          case "auth/invalid-email":
            errorMessage += "Please enter a valid email address.";
            break;
          case "auth/weak-password":
            errorMessage += "Password should be at least 6 characters.";
            break;
          default:
            errorMessage += error.message;
        }
        
        alert(errorMessage);
      });
  }


//   function loginUser(email, password) {
//     auth.signInWithEmailAndPassword(email, password)
//       .then((userCredential) => {
//         // User logged in - get their database record
//         const userId = userCredential.user.uid;
        
//         return db.ref('users/' + userId).once('value');
//       })
//       .then((snapshot) => {
//         const userData = snapshot.val();
//         if (userData) {
//           // Store user role in localStorage/session
//           localStorage.setItem('userRole', userData.role);
//           // Redirect based on role
//           if (userData.role === 'manager') {
//             window.location.href = '/manager-dashboard.html';
//           } else {
//             window.location.href = '/user-dashboard.html';
//           }
//         }
//       })
//       .catch((error) => {
//         console.error("Login error:", error);
//       });
//   }


// Sign In


// Sign In
function signIn() {
    const email = document.getElementById("email").value.trim().toLowerCase();
    const password = document.getElementById("password").value.trim();
  
    auth.signInWithEmailAndPassword(email, password)
      .then((userCredential) => {
        const userId = userCredential.user.uid;
        console.log("Attempting login with UID:", userId);
  
        // Try direct UID lookup first
        return db.ref(`users/${userId}`).once('value')
          .then((snapshot) => {
            if (snapshot.exists()) {
              console.log("User found by UID");
              return snapshot.val();
            }
  
            // Fallback: Search by email if UID lookup fails
            console.log("Falling back to email search");
            return db.ref('users').orderByChild('email').equalTo(email).once('value')
              .then((emailSnapshot) => {
                if (!emailSnapshot.exists()) {
                  throw new Error("User data not found by UID or email");
                }
  
                let userData = null;
                emailSnapshot.forEach((child) => {
                  userData = child.val();
                  return true; // Exit after first match
                });
                return userData;
              });
          });
      })
      .then((userData) => {
        if (!userData) throw new Error("User data exists but is empty");
  
        // Store user info
        localStorage.setItem("userRole", userData.role || "");
        localStorage.setItem("userId", userCredential.user.uid);
        localStorage.setItem("userEmail", userData.email || "");
  
        // Debug output
        console.log("Login successful, user data:", {
          role: userData.role,
          branchId: userData.branchId,
          name: userData.name
        });
  
        // Redirect
        if (userData.role === "manager") {
          window.location.href = "../manager/manager.html";
        } else if (userData.role === "admin") {
          window.location.href = "../admin/admin.html";
        } else {
          throw new Error("Unauthorized role: " + userData.role);
        }
      })
      .catch((error) => {
        console.error("Login error details:", {
          code: error.code,
          message: error.message,
          email: email
        });
        alert(`Login failed: ${error.message}`);
        auth.signOut();
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
