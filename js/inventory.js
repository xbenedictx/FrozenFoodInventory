// /* ====================== */
// /*    Cat: Inventory      */
// /* ====================== */

// /**
//  * Loads the inventory page content from Firebase.
//  * Sets up event listeners for searching inventory items.
//  * Falls back to default data if Firebase retrieval fails.
//  */
// function loadInventoryPage() {
//   if (!currentBranch) {
//     document.getElementById("inventoryList").innerHTML =
//       "<p>Please select a branch first</p>";
//     return;
//   }

//   const inventoryList = document.getElementById("inventoryList");
//   const searchInput = document.getElementById("inventorySearch");
//   let inventoryData = [];

//   console.log("Attempting to load inventory from Firebase...");

//   db.ref(`branch_inventory/${currentBranch}`)
//     .once("value")
//     .then((branchSnap) => {
//       inventoryData = [];
//       const branchItems = branchSnap.val() || {};

//       // Process branch-specific data
//       Object.keys(branchItems).forEach((id) => {
//         const branchItem = branchItems[id] || {};

//         const mergedItem = {
//           ...branchItem,
//           id: id,
//           supplier: branchItem.supplier || "Unknown",
//           expiration: normalizeDate(branchItem.expiration),
//           image:
//             branchItem.image ||
//             imageMap[branchItem.name] ||
//             "../images/default.png",
//         };

//         inventoryData.push(mergedItem);
//       });

//       console.log("Processed inventory data:", inventoryData);

//       if (inventoryData.length > 0) {
//         renderInventory(inventoryData, inventoryList, searchInput.value);
//       } else {
//         console.warn(
//           "No inventory data found for this branch. Using fallback data."
//         );
//         const fallbackData = getFallbackInventoryData();
//         renderInventory(inventoryData, inventoryList, searchInput.value);
//       }
//     })
//     .catch((error) => {
//       console.error("Error fetching inventory data:", error.message);
//       inventoryList.innerHTML = `<p>Error loading data: ${error.message}. Using fallback data.</p>`;
//       const fallbackData = getFallbackInventoryData();
//       renderInventory(inventoryData, inventoryList, searchInput.value);
//       // renderInventory(fallbackData, inventoryList, searchInput.value);
//     });

//   searchInput.addEventListener("input", () =>
//     renderInventory(inventoryData, inventoryList, searchInput.value)
//   );
// }
// // Helper function for fallback data
// function getFallbackInventoryData() {
//   return [
//     {
//       id: "item1",
//       name: "Adobo (Chicken)",
//       stock: 40,
//       minStock: 10,
//       supplier: "supplier1",
//       expiration: "2025-10-31",
//       image: "../images/adobo.jpg",
//     },
//     {
//       id: "item2",
//       name: "Bagnet (Ilocano)",
//       stock: 20,
//       minStock: 5,
//       supplier: "supplier2",
//       expiration: "2024-11-04",
//       image: "../images/bagnet.jpg",
//     },
//     {
//       id: "item3",
//       name: "Banana Cue",
//       stock: 50,
//       minStock: 15,
//       supplier: "supplier3",
//       expiration: "2024-11-04",
//       image: "../images/banana-cue.jpg",
//     },
//   ];
// }

// /**
//  * Creates HTML for viewing item details
//  * @returns {string} HTML string for view mode
//  */
// function createViewMode(item) {
//   return `
//         <h3>${item.name}</h3>
//         <div class="item-image">
//             <img src="${item.image || "../images/default.png"}" alt="${
//     item.name
//   }">
//         </div>
//         <div class="item-info">
//             <p><strong>Description:</strong> ${item.description || "N/A"}</p>
//             <p><strong>Current Stock:</strong> ${item.stock} kg</p>
//             <p><strong>Minimum Stock:</strong> ${item.minStock || "N/A"} kg</p>
//             <p><strong>Supplier:</strong> ${item.supplier || "Unknown"}</p>
//             <p><strong>Expiration Date:</strong> ${formatDisplayDate(
//               item.expiration
//             )}</p>
//         </div>
//         <div class="item-actions">
//             <button onclick="switchToEditMode('${item.id}')">Edit</button>
//             <button onclick="document.getElementById('itemDetailsModal').style.display='none'">Close</button>
//         </div>
//     `;
// }

// /**
//  * Creates HTML for editing item details
//  * @param {Object} item - The item object to base the form on
//  * @returns {string} HTML string for edit mode
//  */
// function createEditMode(item) {
//   return `
//         <h3>Edit ${item.name}</h3>
//         <form onsubmit="saveItemDetails('${item.id}'); return false;">
//             <div class="form-group">
//                 <label for="edit-name">Product Name:</label>
//                 <input type="text" id="edit-name" value="${
//                   item.name || ""
//                 }" required>
//             </div>
//             <div class="form-group">
//                 <label for="edit-description">Description:</label>
//                 <textarea id="edit-description">${
//                   item.description || ""
//                 }</textarea>
//             </div>
//             <div class="form-group">
//                 <label for="edit-stock">Current Stock (kg):</label>
//                 <input type="number" id="edit-stock" value="${
//                   item.stock || 0
//                 }" min="0" required>
//             </div>
//             <div class="form-group">
//                 <label for="edit-minStock">Minimum Stock (kg):</label>
//                 <input type="number" id="edit-minStock" value="${
//                   item.minStock || 0
//                 }" min="0" required>
//             </div>
//             <div class="form-group">
//                 <label for="edit-supplier">Supplier:</label>
//                 <input type="text" id="edit-supplier" value="${
//                   item.supplier || ""
//                 }">
//             </div>
//             <div class="form-group">
//                 <label for="edit-expiration">Expiration Date:</label>
//                 <input type="date" id="edit-expiration" value="${formatDateForInput(
//                   item.expiration
//                 )}" required>
//             </div>
//             <div class="form-group">
//                 <label for="edit-image">Product Image:</label>
//                 <input type="file" id="edit-image" accept="image/*">
//                 <small>Leave empty to keep current image</small>
//                 <div id="editImagePreview" style="margin-top: 10px;">
//                     ${
//                       item.image
//                         ? `<img src="${item.image}" style="max-width: 200px; max-height: 200px;">`
//                         : ""
//                     }
//                 </div>
//             </div>
//             <div class="form-actions">
//                 <button type="submit">Save</button>
//                 <button type="button" onclick="switchToViewMode('${
//                   item.id
//                 }')">Cancel</button>
//             </div>
//         </form>
//         <script>
//             document.getElementById('edit-image').addEventListener('change', function(e) {
//                 const file = e.target.files[0];
//                 if (file) {
//                     // Validate file size (max 1MB)
//                     if (file.size > 1024 * 1024) {
//                         alert('Image size should be less than 1MB');
//                         this.value = ''; // Clear the file input
//                         return;
//                     }
                    
//                     const reader = new FileReader();
//                     reader.onload = function(event) {
//                         const preview = document.getElementById('editImagePreview');
//                         preview.innerHTML = '<img src="' + event.target.result + '" style="max-width: 200px; max-height: 200px;">';
//                     };
//                     reader.readAsDataURL(file);
//                 }
//             });
//         </script>
//     `;
// }

// /**
//  * Shows detailed information about a specific inventory item.
//  *
//  * @param {string} itemId - The unique identifier of the inventory item
//  */
// function showItemDetails(itemId) {
//   db.ref(`branch_inventory/${currentBranch}/${itemId}`)
//     .once("value")
//     .then((branchSnap) => {
//       const branchItem = branchSnap.val() || {};
//       const item = { ...branchItem, id: itemId };

//       // Get or create the modal elements
//       let detailsModal = document.getElementById("itemDetailsModal");
//       let detailsContent = document.getElementById("itemDetailsContent");

//       if (!detailsModal) {
//         const modalHTML = `
//                 <div id="itemDetailsModal" class="modal">
//                   <div class="modal-content">
//                     <span class="close-button">&times;</span>
//                     <div id="itemDetailsContent"></div>
//                   </div>
//                 </div>
//               `;
//         document.body.insertAdjacentHTML("beforeend", modalHTML);
//         detailsModal = document.getElementById("itemDetailsModal");
//         detailsContent = document.getElementById("itemDetailsContent");
//       }

//       // Always set up the close button listener (in case modal was recreated)
//       const closeButton = detailsModal.querySelector(".close-button");
//       closeButton.onclick = function () {
//         detailsModal.style.display = "none";
//       };

//       // Set up the outside click handler
//       detailsModal.onclick = function (event) {
//         if (event.target === detailsModal) {
//           detailsModal.style.display = "none";
//         }
//       };

//       // Prevent clicks inside modal content from closing the modal
//       const modalContent = detailsModal.querySelector(".modal-content");
//       modalContent.onclick = function (event) {
//         event.stopPropagation();
//       };

//       if (item) {
//         // Define the switching functions in the global scope
//         window.switchToEditMode = function () {
//           detailsContent.innerHTML = createEditMode(item);
//         };

//         window.switchToViewMode = function () {
//           // Refresh the item data before showing view mode
//           db.ref(`branch_inventory/${currentBranch}/${itemId}`)
//             .once("value")
//             .then((snap) => {
//               const updatedItem = { ...snap.val(), id: itemId };
//               detailsContent.innerHTML = createViewMode(updatedItem);
//             });
//         };

//         // Render view mode by default
//         detailsContent.innerHTML = createViewMode(item);

//         // Show the modal
//         detailsModal.style.display = "block";
//       }
//     })
//     .catch((error) => {
//       console.error("Error loading item details:", error);
//       alert("Error loading item details. Please try again.");
//     });
// }

// /**
//  * Saves the updated item details to the database, using the given item ID.
//  *
//  * @param {string} itemId - The ID of the item to update
//  *
//  * @throws {Error} If any of the input fields are invalid
//  */

// async function saveItemDetails(itemId) {
//   // Collect values from input fields
//   const newName = document.getElementById("edit-name").value;
//   const newDescription = document.getElementById("edit-description").value;
//   const newStock = parseInt(document.getElementById("edit-stock").value);
//   const newMinStock = parseInt(document.getElementById("edit-minStock").value);
//   const newSupplier = document.getElementById("edit-supplier").value;
//   const newExpiration = document.getElementById("edit-expiration").value;
//   const imageFile = document.getElementById("edit-image").files[0];

//   // Validate inputs
//   if (!newName || isNaN(newStock) || isNaN(newMinStock) || !newExpiration) {
//     alert("Please fill in all required fields with valid data.");
//     return;
//   }

//   // Prepare update data
//   const updateData = {
//     name: newName,
//     description: newDescription,
//     stock: newStock,
//     minStock: newMinStock,
//     supplier: newSupplier,
//     expiration: newExpiration,
//   };

//   try {
//     // If an image file was uploaded, convert to Base64
//     if (imageFile) {
//       updateData.image = await convertImageToBase64(imageFile);
//     } else {
//       // Use the existing image if available, or fallback to mapped/default image
//       const existingImage = document
//         .getElementById("editImagePreview")
//         .querySelector("img");
//       if (!existingImage || newName !== updateData.name) {
//         updateData.image = imageMap[newName] || "../images/default.png";
//       }
//     }

//     // Update branch-specific data
//     await db
//       .ref(`branch_inventory/${currentBranch}/${itemId}`)
//       .update(updateData);

//     console.log("Item updated successfully!");

//     // Switch back to view mode and refresh
//     const item = {
//       id: itemId,
//       ...updateData,
//     };
//     document.getElementById("itemDetailsContent").innerHTML =
//       createViewMode(item);

//     const currentPage = document
//       .querySelector(".page.active")
//       .id.replace("page-", "");
//     if (currentPage === "inventory") {
//       loadInventoryPage();
//     }
//   } catch (error) {
//     console.error("Error updating item:", error.message);
//     alert("Error updating item: " + error.message);
//   }
// }

// /**
//  * Uploads an image file to Firebase Storage and returns the download URL
//  * @param {File} file - The image file to upload
//  * @param {string} path - The storage path to upload to
//  * @returns {Promise<string>} The download URL of the uploaded image
//  */
// async function uploadImageToStorage(file, path) {
//   // Create a storage reference
//   const storageRef = firebase.storage().ref(`${path}/${file.name}`);

//   // Upload the file
//   const snapshot = await storageRef.put(file);

//   // Get the download URL
//   const downloadURL = await snapshot.ref.getDownloadURL();

//   return downloadURL;
// }

// /**
//  * Renders inventory items to the UI based on the provided data.
//  * Implements search filtering and highlights low stock or expired items.
//  *
//  * @param {Array} data - Array of inventory items to render
//  * @param {HTMLElement} inventoryList - DOM element to render inventory items into
//  * @param {HTMLElement} alerts - DOM element to display alerts
//  * @param {string} searchTerm - Optional search term to filter items
//  */
// function renderInventory(data, inventoryList, searchTerm = "") {
//     console.log("Rendering inventory with data:", data);
  
//     // Filter data based on search term
//     let filteredData = data.filter(
//       (item) =>
//         item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
//         (item.description || "").toLowerCase().includes(searchTerm.toLowerCase())
//     );
  
//     const currentDate = new Date();
//     inventoryList.innerHTML = "";
  
//     if (filteredData.length === 0) {
//       inventoryList.innerHTML = "<p>No items match the search criteria.</p>";
//       return;
//     }
  
//     // Separate items into categories
//     const lowStockItems = filteredData.filter(
//       (item) => item.stock <= (item.minStock || 0)
//     );
//     const expiredItems = filteredData.filter((item) => {
//       const expDate = new Date(item.expiration);
//       return !isNaN(expDate) && expDate < currentDate;
//     });
//     const normalItems = filteredData.filter(
//       (item) =>
//         item.stock > (item.minStock || 0) &&
//         (!item.expiration || new Date(item.expiration) >= currentDate)
//     );
  
//     // Create main inventory container with grid layout
//     const inventoryContainer = document.createElement("div");
//     inventoryContainer.className = "inventory-grid-container";
//     inventoryList.appendChild(inventoryContainer);
  
//     // Render Low Stock Alerts (First Row)
//     if (lowStockItems.length > 0) {
//       const lowStockSection = document.createElement("div");
//       lowStockSection.className = "inventory-section low-stock-section";
  
//       const lowStockHeader = document.createElement("h4");
//       lowStockHeader.className = "sub-header low-stock";
//       lowStockHeader.textContent = "Low Stock Alerts";
//       lowStockSection.appendChild(lowStockHeader);
  
//       renderItemList(lowStockItems, lowStockSection, true, false); // Use renderItemList instead of createInventoryItemCard
  
//       inventoryContainer.appendChild(lowStockSection);
//     }
  
//     // Render Expired Items (Second Row)
//     if (expiredItems.length > 0) {
//       const expiredSection = document.createElement("div");
//       expiredSection.className = "inventory-section expired-section";
  
//       const expiredHeader = document.createElement("h4");
//       expiredHeader.className = "sub-header expired";
//       expiredHeader.textContent = "Expired Items";
//       expiredSection.appendChild(expiredHeader);
  
//       renderItemList(expiredItems, expiredSection, false, true); // Use renderItemList instead of createInventoryItemCard
  
//       inventoryContainer.appendChild(expiredSection);
//     }
  
//     // Render Normal Stock Items (Third Row)
//     if (normalItems.length > 0) {
//       const normalSection = document.createElement("div");
//       normalSection.className = "inventory-section normal-section";
  
//       const normalHeader = document.createElement("h4");
//       normalHeader.className = "sub-header normal";
//       normalHeader.textContent = "Normal Stock Items";
//       normalSection.appendChild(normalHeader);
  
//       renderItemList(normalItems, normalSection, false, false); // Use renderItemList instead of createInventoryItemCard
  
//       inventoryContainer.appendChild(normalSection);
//     }
//   }
// // Helper function to create inventory item cards
// function createInventoryItemCard(item, isLowStock, isExpired) {
//   const formattedExpiration = formatDisplayDate(item.expiration);
//   const imageSrc = item.image || "../images/default.png";

//   const itemElement = document.createElement("div");
//   itemElement.className = `inventory-item-card ${
//     isLowStock ? "low-stock" : ""
//   } ${isExpired ? "expired" : ""}`;
//   itemElement.innerHTML = `
//         <img src="${imageSrc}" alt="${item.name}" class="inventory-item-image"
//              onerror="this.src='../images/default.png'">
//         <div class="inventory-item-details">
//             <div class="inventory-item-name">${item.name} ${
//     isExpired ? "(Expired)" : ""
//   }</div>
//             <div class="inventory-item-description">${
//               item.description || "No description"
//             }</div>
//             <div class="inventory-item-stock">
//                 <span>Supplier: ${item.supplier || "Unknown"}</span>
//                 <span>Quantity: ${item.stock} kg</span>
//                 ${
//                   item.minStock
//                     ? `<span>Min Stock: ${item.minStock} kg</span>`
//                     : ""
//                 }
//                 <span>Expiration: ${formattedExpiration}</span>
//             </div>
//         </div>
//         <div class="inventory-item-actions">
//             <button class="view" onclick="showItemDetails('${
//               item.id
//             }')">View</button>
//             <button class="delete" onclick="deleteItem('${
//               item.id
//             }')">Delete</button>
//         </div>
//     `;
//   return itemElement;
// }

// // TODO: Helper function to create order for low stock item
// function createOrderForItem(itemId) {
//   // Implement your order creation logic here
//   console.log(`Creating order for item ${itemId}`);
//   // You might want to open a modal or navigate to order page
//   alert(`Dapat mapupunta sa order page`);
// }

// // Helper function to render item lists
// function renderItemList(items, container, isLowStock, isExpired) {
//     const gridContainer = document.createElement("div");
//     gridContainer.className = "inventory-row inventory-normal-grid"; // Use the same grid class as in renderInventory
//     container.appendChild(gridContainer);
  
//     items.forEach((item) => {
//       const formattedExpiration = formatDisplayDate(item.expiration);
//       const imageSrc = item.image || "../images/default.png";
  
//       const itemElement = document.createElement("div");
//       itemElement.className = `inventory-item-card ${
//         isLowStock ? "low-stock" : ""
//       } ${isExpired ? "expired" : ""}`; // Use the same card class as in createInventoryItemCard
//       itemElement.innerHTML = `
//         <img src="${imageSrc}" alt="${item.name}" class="inventory-item-image"
//              onerror="this.src='../images/default.png'">
//         <div class="inventory-item-details">
//             <div class="inventory-item-name">${item.name} ${
//         isExpired ? "(Expired)" : ""
//       }</div>
//             <div class="inventory-item-description">${
//               item.description || "No description"
//             }</div>
//             <div class="inventory-item-stock">
//                 <span>Supplier: ${item.supplier || "Unknown"}</span>
//                 <span>Quantity: ${item.stock} kg</span>
//                 ${
//                   item.minStock
//                     ? `<span>Min Stock: ${item.minStock} kg</span>`
//                     : ""
//                 }
//                 <span>Expiration: ${formattedExpiration}</span>
//             </div>
//         </div>
//         <div class="inventory-item-actions">
//             <button class="view" onclick="showItemDetails('${
//               item.id
//             }')">View</button>
//             <button class="delete" onclick="deleteItem('${
//               item.id
//             }')">Delete</button>
//         </div>
//       `;
//       gridContainer.appendChild(itemElement);
//     });
//   }

// /**
//  * Creates the modal for adding new inventory items dynamically and adds it to the DOM
//  * @returns {void}
//  */
// function createItemModal() {
//   const modalHTML = `
//       <div id="itemModal" class="modal">
//         <div class="modal-content">
//           <span class="close-item-modal">&times;</span>
//           <h2>Add New Inventory Item</h2>
//           <form id="itemForm">
//             <div class="form-group">
//               <label for="itemName">Product Name:</label>
//               <input type="text" id="itemName" required>
//             </div>
//             <div class="form-group">
//               <label for="itemDescription">Description:</label>
//               <textarea id="itemDescription"></textarea>
//             </div>
//             <div class="form-group">
//               <label for="itemStock">Initial Stock (kg):</label>
//               <input type="number" id="itemStock" min="0" required>
//             </div>
//             <div class="form-group">
//               <label for="itemMinStock">Minimum Stock (kg):</label>
//               <input type="number" id="itemMinStock" min="0" required>
//             </div>
//             <div class="form-group">
//               <label for="itemSupplier">Supplier:</label>
//               <input type="text" id="itemSupplier">
//             </div>
//             <div class="form-group">
//               <label for="itemExpiration">Expiration Date:</label>
//               <input type="date" id="itemExpiration" required>
//             </div>
//             <div class="form-group">
//               <label for="itemImage">Product Image:</label>
//               <input type="file" id="itemImage" accept="image/*">
//               <small>Recommended size: 500x500 pixels (max 1MB)</small>
//               <div id="imagePreview" style="margin-top: 10px;"></div>
//             </div>
//             <div class="form-actions">
//               <button type="submit">Save Item</button>
//               <button type="button" id="cancelItem">Cancel</button>
//             </div>
//           </form>
//         </div>
//       </div>
//     `;

//   document.body.insertAdjacentHTML("beforeend", modalHTML);

//   // Add image preview and size validation
//   document.getElementById("itemImage").addEventListener("change", function (e) {
//     const file = e.target.files[0];
//     if (file) {
//       // Validate file size (max 1MB)
//       if (file.size > 1024 * 1024) {
//         alert("Image size should be less than 1MB");
//         this.value = ""; // Clear the file input
//         return;
//       }

//       const reader = new FileReader();
//       reader.onload = function (event) {
//         const preview = document.getElementById("imagePreview");
//         preview.innerHTML = `<img src="${event.target.result}" style="max-width: 200px; max-height: 200px;">`;
//       };
//       reader.readAsDataURL(file);
//     }
//   });

//   // Rest of your event listeners...
// }

// function closeItemModal() {
//   document.getElementById("itemModal").style.display = "none";
//   document.getElementById("itemForm").reset();
// }

// function showItemModal() {
//   // Create modal if it doesn't exist
//   if (!document.getElementById("itemModal")) {
//     createItemModal();
//   }

//   // Set today's date as default expiration date
//   const today = new Date().toISOString().split("T")[0];
//   document.getElementById("itemExpiration").value = today;

//   document.getElementById("itemModal").style.display = "block";
//   document.getElementById("itemName").focus();
// }

// /**
//  * Adds a new inventory item to the database.
//  * Prompts user for item details and saves to Firebase. (This uses dialog boxes)
//  */
// function addItem() {
//   if (!currentBranch) {
//     alert("Please select a branch first");
//     return;
//   }

//   showItemModal();
// }

// /**
//  * Handles the submission of the item form, adds the new item to the database and refreshes the inventory page
//  * @param {Event} e The submit event
//  * @returns {Promise<void>}
//  */
// async function handleItemSubmit(e) {
//   e.preventDefault();

//   const name = document.getElementById("itemName").value.trim();
//   const description = document.getElementById("itemDescription").value.trim();
//   const stock = parseInt(document.getElementById("itemStock").value);
//   const minStock = parseInt(document.getElementById("itemMinStock").value);
//   const supplier = document.getElementById("itemSupplier").value.trim();
//   const expiration = document.getElementById("itemExpiration").value;
//   const imageFile = document.getElementById("itemImage").files[0];

//   if (!name || isNaN(stock) || isNaN(minStock) || !expiration) {
//     alert("Please fill in all required fields with valid data.");
//     return;
//   }

//   const saveBtn = e.target.querySelector('button[type="submit"]');
//   saveBtn.disabled = true;
//   saveBtn.textContent = "Saving...";

//   try {
//     // Get the next sequential ID
//     const newItemId = await getNextItemId(currentBranch);

//     // Default to the mapped image or default image if no file is uploaded
//     let imageData = imageMap[name] || "../images/default.png";

//     // If an image file was uploaded, convert to Base64
//     if (imageFile) {
//       imageData = await convertImageToBase64(imageFile);
//     }

//     const itemData = {
//       name,
//       description: description || "",
//       stock,
//       minStock,
//       supplier: supplier || "Unknown",
//       expiration,
//       image: imageData,
//       timestamp: firebase.database.ServerValue.TIMESTAMP,
//     };

//     await db
//       .ref(`branch_inventory/${currentBranch}/${newItemId}`)
//       .set(itemData);

//     console.log("Item added successfully with ID:", newItemId);
//     closeItemModal();
//     loadInventoryPage();
//   } catch (error) {
//     console.error("Error adding item:", error.message);
//     alert("Error adding item: " + error.message);
//   } finally {
//     saveBtn.disabled = false;
//     saveBtn.textContent = "Save Item";
//   }
// }

// function convertImageToBase64(file) {
//   return new Promise((resolve, reject) => {
//     const reader = new FileReader();
//     reader.onload = () => resolve(reader.result);
//     reader.onerror = (error) => reject(error);
//     reader.readAsDataURL(file);
//   });
// }

// async function getNextItemId(branchId) {
//   const snapshot = await db.ref(`branch_inventory/${branchId}`).once("value");
//   const items = snapshot.val() || {};

//   // Extract all item IDs
//   const itemIds = Object.keys(items);

//   // Find the highest existing number
//   let maxNumber = 0;
//   itemIds.forEach((id) => {
//     const match = id.match(/^item(\d+)$/);
//     if (match) {
//       const num = parseInt(match[1]);
//       if (num > maxNumber) maxNumber = num;
//     }
//   });

//   return `item${maxNumber + 1}`;
// }
