/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const selectedProductsList = document.getElementById("selectedProductsList");
const clearAllBtn = document.getElementById("clearAllBtn");
const selectedActions = document.getElementById("selectedActions");

/* Show initial placeholder until user selects a category */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`;

/* Load product data from JSON file */
async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  return data.products;
}

/* Create HTML for displaying product cards */
function displayProducts(products) {
  productsContainer.innerHTML = products
    .map(
      (product) => `
    <div class="product-card${
      selectedProductIds.includes(String(product.id)) ? " selected" : ""
    }" data-product-id="${product.id}" style="position:relative;">
      <img src="${product.image}" alt="${product.name}">
      <div class="product-info">
        <h3>${product.name}</h3>
        <p>${product.brand}</p>
      </div>
      <div class="product-desc-float" style="
        display:none;
        position:absolute;
        left:0;
        top:100%;
        z-index:10;
        min-width:220px;
        max-width:320px;
        background:#fafafa;
        color:#333;
        font-size:14px;
        box-shadow:0 2px 8px #0002;
        border:1px solid #ccc;
        padding:12px;
        margin-top:8px;
        pointer-events:none;
      ">
        ${product.description}
      </div>
    </div>
  `
    )
    .join("");
}

/* Filter and display products when category changes */
categoryFilter.addEventListener("change", async (e) => {
  const products = await loadProducts();
  const selectedCategory = e.target.value;

  const filteredProducts = products.filter(
    (product) => product.category === selectedCategory
  );

  displayProducts(filteredProducts);
  attachProductCardListeners();
  updateProductCardSelection();
  attachProductCardHoverListeners();
});

/* Chat form placeholder handler */
chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  chatWindow.innerHTML = "Connect to the OpenAI API for a response!";
});

// --- Product Selection Logic ---
let selectedProductIds = loadSelectedProductIdsFromStorage();

function loadSelectedProductIdsFromStorage() {
  const saved = localStorage.getItem("selectedProductIds");
  if (!saved) return [];
  return Array.from(new Set(JSON.parse(saved)));
}

function saveSelectedProductIdsToStorage() {
  localStorage.setItem(
    "selectedProductIds",
    JSON.stringify(Array.from(new Set(selectedProductIds)))
  );
}

function updateProductCardSelection() {
  const productCards = document.querySelectorAll(".product-card");
  productCards.forEach((card) => {
    if (selectedProductIds.includes(card.dataset.productId)) {
      card.classList.add("selected");
    } else {
      card.classList.remove("selected");
    }
  });
}

function attachProductCardListeners() {
  const productCards = document.querySelectorAll(".product-card");
  productCards.forEach((card) => {
    card.addEventListener("click", function (e) {
      const id = card.dataset.productId;
      if (selectedProductIds.includes(id)) {
        selectedProductIds = selectedProductIds.filter((pid) => pid !== id);
      } else {
        selectedProductIds.push(id);
      }
      saveSelectedProductIdsToStorage();
      updateProductCardSelection();
      renderSelectedProducts();
    });
  });
}

function attachProductCardHoverListeners() {
  const productCards = document.querySelectorAll(".product-card");
  productCards.forEach((card) => {
    const descBox = card.querySelector(".product-desc-float");
    card.addEventListener("mouseenter", () => {
      if (descBox) descBox.style.display = "block";
    });
    card.addEventListener("mouseleave", () => {
      if (descBox) descBox.style.display = "none";
    });
    card.addEventListener("focusin", () => {
      if (descBox) descBox.style.display = "block";
    });
    card.addEventListener("focusout", () => {
      if (descBox) descBox.style.display = "none";
    });
  });
}

// ✅ Render selected products and toggle Clear All
function renderSelectedProducts() {
  selectedProductsList.innerHTML = "";
  loadProducts().then((allProducts) => {
    const uniqueIds = Array.from(new Set(selectedProductIds));

    if (uniqueIds.length > 0) {
      selectedActions.style.display = "block";
    } else {
      selectedActions.style.display = "none";
    }

    uniqueIds.forEach((id) => {
      const product = allProducts.find((p) => String(p.id) === id);
      if (product) {
        const item = document.createElement("div");
        item.style.display = "flex";
        item.style.alignItems = "center";
        item.style.marginBottom = "8px";
        item.innerHTML = `
          <img src="${product.image}" alt="${product.name}" style="width:32px;height:32px;object-fit:contain;margin-right:8px;">
          <span>${product.name}</span>
          <button class="remove-btn" data-remove-id="${product.id}" aria-label="Remove ${product.name}">&times;</button>
        `;
        selectedProductsList.appendChild(item);
      }
    });

    selectedProductsList.querySelectorAll(".remove-btn").forEach((btn) => {
      btn.addEventListener("click", function () {
        const id = btn.dataset.removeId;
        selectedProductIds = selectedProductIds.filter((pid) => pid !== id);
        saveSelectedProductIdsToStorage();
        updateProductCardSelection();
        renderSelectedProducts();
      });
    });
  });
}

// ✅ Clear All Button Handler
function attachClearAllButtonListener() {
  if (!clearAllBtn) return;
  clearAllBtn.addEventListener("click", () => {
    selectedProductIds = [];
    saveSelectedProductIdsToStorage();
    updateProductCardSelection();
    renderSelectedProducts();
  });
}

// --- OpenAI Chat Logic ---

const generateBtn = document.querySelector(".generate-btn");

let chatHistory = [
  {
    role: "system",
    content:
      "You are a helpful and knowledgeable chatbot named Lora for L’Oréal. Only answer questions about L’Oréal products, skincare, haircare, beauty routines, or beauty-related topics. Remember details the user shares, like their name or preferences, and use them in future responses to make the conversation feel natural and personal. You are a helpful skincare expert. Create a personalized skincare routine using only the provided products. Explain the order and purpose of each product in a friendly, beginner-friendly way.",
  },
];

function renderChatHistory() {
  let html = "";
  for (let i = 1; i < chatHistory.length; i++) {
    const msg = chatHistory[i];
    if (
      msg.role === "user" &&
      msg.content.startsWith("Here are the selected products:")
    )
      continue;
    else if (msg.role === "user") {
      html += `<div style="margin-bottom:12px;"><strong>You:</strong> ${msg.content}</div>`;
    } else if (msg.role === "assistant") {
      html += `<div style="white-space:pre-line;margin-bottom:12px;"><strong>Lora:</strong> ${msg.content}</div>`;
    }
  }
  chatWindow.innerHTML =
    html ||
    `<div class="placeholder-message">Ask a question or generate a routine!</div>`;
}

// Function to generate a personalized routine using OpenAI API
async function generateRoutineWithOpenAI(selectedProducts) {
  let lastSelectionIdx = chatHistory.findIndex(
    (msg) =>
      msg.role === "user" &&
      msg.content &&
      msg.content.startsWith("Here are the selected products:")
  );
  if (lastSelectionIdx !== -1) {
    chatHistory = [chatHistory[0]];
  }

  chatHistory.push({
    role: "user",
    content: `Here are the selected products:\n${JSON.stringify(
      selectedProducts,
      null,
      2
    )}`,
  });

  chatWindow.innerHTML = "Generating your personalized routine...";

  try {
    // Send request to Cloudflare Worker endpoint instead of OpenAI directly
    const response = await fetch(
      "https://astrobot-worker.kbankole.workers.dev/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: chatHistory,
          max_tokens: 500,
          temperature: 0.7,
        }),
      }
    );

    const data = await response.json();

    if (
      data &&
      data.choices &&
      data.choices[0] &&
      data.choices[0].message &&
      data.choices[0].message.content
    ) {
      chatHistory.push({
        role: "assistant",
        content: data.choices[0].message.content,
      });
      renderChatHistory();
    } else {
      chatWindow.innerHTML =
        "Sorry, I couldn't generate a routine. Please try again.";
    }
  } catch (error) {
    chatWindow.innerHTML =
      "There was an error connecting to the AI service. Please try again.";
  }
}

if (generateBtn) {
  generateBtn.addEventListener("click", async () => {
    const allProducts = await loadProducts();
    const selected = selectedProductIds
      .map((id) => allProducts.find((p) => String(p.id) === id))
      .filter(Boolean)
      .map((product) => ({
        name: product.name,
        brand: product.brand,
        category: product.category,
        description: product.description,
      }));

    if (selected.length === 0) {
      chatWindow.innerHTML =
        "Please select at least one product before generating a routine.";
      return;
    }

    generateRoutineWithOpenAI(selected);
  });
}

// Connect the chatbox to the API for follow-up questions
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const input = chatForm.querySelector("input");
  const userMessage = input.value.trim();
  if (!userMessage) return;

  chatHistory.push({
    role: "user",
    content: userMessage,
  });

  renderChatHistory();
  chatWindow.innerHTML += `<div>Thinking...</div>`;

  try {
    // Send request to Cloudflare Worker endpoint instead of OpenAI directly
    const response = await fetch(
      "https://astrobot-worker.kbankole.workers.dev/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: chatHistory,
          max_tokens: 500,
          temperature: 0.7,
        }),
      }
    );

    const data = await response.json();

    if (
      data &&
      data.choices &&
      data.choices[0] &&
      data.choices[0].message &&
      data.choices[0].message.content
    ) {
      chatHistory.push({
        role: "assistant",
        content: data.choices[0].message.content,
      });
      renderChatHistory();
    } else {
      chatWindow.innerHTML =
        "Sorry, I couldn't get an answer. Please try again.";
    }
  } catch (error) {
    chatWindow.innerHTML =
      "There was an error connecting to the AI service. Please try again.";
  }

  input.value = "";
});

// Initial setup on page load
attachProductCardListeners();
updateProductCardSelection();
renderSelectedProducts();
attachProductCardHoverListeners();
attachClearAllButtonListener();
