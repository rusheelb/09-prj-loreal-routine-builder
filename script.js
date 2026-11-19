/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productSearch = document.getElementById("productSearch");
const rtlToggleBtn = document.getElementById("rtlToggleBtn");
const productsContainer = document.getElementById("productsContainer");
const productCount = document.getElementById("productCount");
const selectedProductsList = document.getElementById("selectedProductsList");
const selectedCount = document.getElementById("selectedCount");
const generateRoutineBtn = document.getElementById("generateRoutine");
const clearSelectedBtn = document.getElementById("clearSelectedBtn");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const productModal = document.getElementById("productModal");
const closeModalBtn = document.getElementById("closeModalBtn");
const modalImage = document.getElementById("modalImage");
const modalImageFallback = document.getElementById("modalImageFallback");
const modalMeta = document.getElementById("modalMeta");
const modalTitle = document.getElementById("modalTitle");
const modalDescription = document.getElementById("modalDescription");
const modalSelectBtn = document.getElementById("modalSelectBtn");

/* Cloudflare Worker endpoint that forwards requests to OpenAI securely */
const WORKER_URL = "https://loreal-chatbot.rbarata2.workers.dev/";

/* Keys used to save selected products and text direction in localStorage */
const STORAGE_KEY = "loreal_selected_product_ids";
const DIRECTION_STORAGE_KEY = "loreal_text_direction";

/* Track all loaded products, selected products, modal state, and chat history */
let allProducts = [];
let selectedProducts = [];
let conversationHistory = [];
let activeModalProductId = null;
let lastFocusedElement = null;

/* Load product data from JSON file */
async function loadProducts() {
  if (allProducts.length > 0) {
    return allProducts;
  }
  const response = await fetch("products.json");
  const data = await response.json();
  allProducts = data.products;
  return allProducts;
}

/* Format category names cleanly for display */
function formatCategory(category) {
  return category.replace(/\b\w/g, (char) => char.toUpperCase());
}

/* Check whether a product is currently selected */
function isProductSelected(productId) {
  return selectedProducts.some((item) => item.id === productId);
}

/* Render product cards inside the grid */
function displayProducts(products) {
  productCount.textContent = `${products.length} ${products.length === 1 ? "item" : "items"}`;

  if (products.length === 0) {
    productsContainer.innerHTML = `
      <div class="placeholder-message">
        No products found in this category. Try another selection above.
      </div>
    `;
    return;
  }

  productsContainer.innerHTML = products
    .map((product) => {
      const selected = isProductSelected(product.id);
      return `
        <article
          class="product-card ${selected ? "is-selected" : ""}"
          data-product-id="${product.id}"
          tabindex="0"
          role="button"
          aria-pressed="${selected}"
        >
          <div class="product-media">
            ${
              selected
                ? `<span class="selected-corner-mark" aria-label="Selected"><i class="fa-solid fa-check" aria-hidden="true"></i></span>`
                : ""
            }
            <img
              src="${product.image}"
              alt="${product.brand} ${product.name}"
              referrerpolicy="no-referrer"
              onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
            />
            <div class="product-img-fallback">${product.brand}</div>
          </div>
          <div class="product-info">
            <div class="product-meta">
              <span>${product.brand}</span>
              <span class="meta-sep" aria-hidden="true">&middot;</span>
              <span>${formatCategory(product.category)}</span>
            </div>
            <h3>${product.name}</h3>
            <p class="product-description">${product.description}</p>
            <div class="product-card-footer">
              <span class="select-indicator">
                <i class="fa-solid ${selected ? "fa-check" : "fa-plus"} select-dot-marker" aria-hidden="true"></i>
                ${selected ? "Selected" : "Add to Routine"}
              </span>
              <button
                type="button"
                class="details-btn"
                data-details-id="${product.id}"
                aria-label="View description for ${product.name}"
              >
                View Details
              </button>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

/* Render the selected products list */
function displaySelectedProducts() {
  selectedCount.textContent = `${selectedProducts.length} selected`;

  if (selectedProducts.length === 0) {
    selectedProductsList.innerHTML = `
      <div class="selected-empty">
        Select any product card above to include it in your personalized routine.
      </div>
    `;
    return;
  }

  selectedProductsList.innerHTML = selectedProducts
    .map(
      (product) => `
        <div class="selected-item">
          <div class="selected-item-info">
            <span class="selected-item-brand">${product.brand} &middot; ${formatCategory(product.category)}</span>
            <span class="selected-item-name">${product.name}</span>
          </div>
          <button
            type="button"
            class="remove-item-btn"
            data-remove-id="${product.id}"
            aria-label="Remove ${product.name}"
          >
            <i class="fa-solid fa-xmark" aria-hidden="true"></i>
          </button>
        </div>
      `
    )
    .join("");
}

/* Save selected product IDs to localStorage */
function saveSelectedProducts() {
  const selectedIds = selectedProducts.map((product) => product.id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedIds));
}

/* Restore saved product selections from localStorage */
function loadSavedProducts() {
  const savedJson = localStorage.getItem(STORAGE_KEY);
  if (!savedJson) {
    return;
  }

  try {
    const savedIds = JSON.parse(savedJson);
    if (Array.isArray(savedIds)) {
      selectedProducts = allProducts.filter((product) =>
        savedIds.includes(product.id)
      );
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
}

/* Toggle a product in or out of the selected list */
function toggleProductSelection(productId) {
  const existingIndex = selectedProducts.findIndex((item) => item.id === productId);

  if (existingIndex !== -1) {
    selectedProducts.splice(existingIndex, 1);
  } else {
    const productToAdd = allProducts.find((item) => item.id === productId);
    if (productToAdd) {
      selectedProducts.push(productToAdd);
    }
  }

  saveSelectedProducts();
  displaySelectedProducts();
  filterAndRenderProducts();
}

/* Filter products by both selected category and search keyword */
async function filterAndRenderProducts() {
  const products = await loadProducts();
  const selectedCategory = categoryFilter.value;
  const searchQuery = productSearch.value.trim().toLowerCase();

  const filteredProducts = products.filter((product) => {
    const matchesCategory =
      selectedCategory === "all" ||
      selectedCategory === "" ||
      product.category === selectedCategory;

    const matchesSearch =
      searchQuery === "" ||
      product.name.toLowerCase().includes(searchQuery) ||
      product.brand.toLowerCase().includes(searchQuery) ||
      product.category.toLowerCase().includes(searchQuery) ||
      product.description.toLowerCase().includes(searchQuery);

    return matchesCategory && matchesSearch;
  });

  displayProducts(filteredProducts);
}

/* Append a message bubble to the chat window and return its element */
function appendChatMessage(sender, htmlContent) {
  const messageEl = document.createElement("div");
  messageEl.className = `chat-message ${sender}`;
  const label = sender === "user" ? "You" : "Routine Advisor";

  messageEl.innerHTML = `
    <span class="chat-sender">${label}</span>
    <div class="chat-body" dir="auto">${htmlContent}</div>
  `;

  chatWindow.appendChild(messageEl);
  chatWindow.scrollTop = chatWindow.scrollHeight;
  return messageEl;
}

/* System prompt encouraging live L'Oréal info with citations while staying on topic */
function getSystemPrompt() {
  return (
    "You are a knowledgeable L'Oréal skincare and beauty advisor with real-time web search access. " +
    "Build clear, practical, step-by-step routines (morning/evening or order of application) " +
    "using the selected products provided by the user. " +
    "When helpful or when asked about current L'Oréal products, ingredients, or trends, search the web " +
    "for up-to-date information and include source links or citations. " +
    "Only answer questions related to the generated routine or beauty topics such as skincare, " +
    "haircare, hair color, hair styling, makeup, men's grooming, suncare, and fragrance. " +
    "If the user asks about an unrelated topic, politely redirect them back to their routine or beauty questions."
  );
}

/* Call the Cloudflare Worker using a web-search-capable OpenAI model */
async function fetchAdvisorReply(messages) {
  if (WORKER_URL.includes("your-subdomain")) {
    throw new Error(
      "Please update WORKER_URL in script.js with your Cloudflare Worker URL to connect to OpenAI."
    );
  }

  const response = await fetch(WORKER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-5-search-api",
      web_search_options: {},
      messages: messages,
    }),
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  const data = await response.json();
  if (!data.choices || !data.choices[0] || !data.choices[0].message) {
    throw new Error("Unexpected response format from the OpenAI Worker.");
  }

  const message = data.choices[0].message;
  return {
    content: message.content || "",
    annotations: Array.isArray(message.annotations) ? message.annotations : [],
  };
}

/* Apply LTR or RTL direction to the document and update the toggle button */
function applyDirection(dir) {
  const normalizedDir = dir === "rtl" ? "rtl" : "ltr";
  document.documentElement.setAttribute("dir", normalizedDir);
  rtlToggleBtn.setAttribute("aria-pressed", String(normalizedDir === "rtl"));
  rtlToggleBtn.textContent = normalizedDir === "rtl" ? "RTL: On" : "RTL: Off";
}

/* Detect initial direction from URL (?dir=rtl), HTML dir attribute, saved setting, or browser language */
function initDirection() {
  const urlParams = new URLSearchParams(window.location.search);
  const urlDir = urlParams.get("dir");
  const savedDir = localStorage.getItem(DIRECTION_STORAGE_KEY);
  const htmlDir = document.documentElement.getAttribute("dir");
  const rtlLangs = ["ar", "he", "fa", "ur"];
  const browserLang = (navigator.language || "").toLowerCase().split("-")[0];

  if (urlDir === "rtl" || urlDir === "ltr") {
    applyDirection(urlDir);
  } else if (savedDir === "rtl" || savedDir === "ltr") {
    applyDirection(savedDir);
  } else if (htmlDir === "rtl") {
    applyDirection("rtl");
  } else if (rtlLangs.includes(browserLang)) {
    applyDirection("rtl");
  } else {
    applyDirection("ltr");
  }
}

/* Initialize page content on load */
async function initApp() {
  initDirection();
  await loadProducts();
  loadSavedProducts();
  displaySelectedProducts();
  appendChatMessage(
    "advisor",
    "Welcome to the L'Oréal Routine Advisor. Select products from the collection above and click <strong>Generate Routine</strong> to create your personalized regimen."
  );
  await filterAndRenderProducts();
}

/* Filter products when category dropdown changes or search input updates */
categoryFilter.addEventListener("change", () => {
  filterAndRenderProducts();
});

productSearch.addEventListener("input", () => {
  filterAndRenderProducts();
});

/* Toggle RTL / LTR mode on button click */
rtlToggleBtn.addEventListener("click", () => {
  const currentDir = document.documentElement.getAttribute("dir");
  const nextDir = currentDir === "rtl" ? "ltr" : "rtl";
  applyDirection(nextDir);
  localStorage.setItem(DIRECTION_STORAGE_KEY, nextDir);
});

/* Update the selection button text inside the open product modal */
function updateModalSelectButton() {
  if (activeModalProductId === null) {
    return;
  }
  const selected = isProductSelected(activeModalProductId);
  modalSelectBtn.innerHTML = selected
    ? `<span>Remove from Routine</span> <i class="fa-solid fa-xmark" aria-hidden="true"></i>`
    : `<span>Add to Routine</span> <i class="fa-solid fa-plus" aria-hidden="true"></i>`;
}

/* Open the product description modal for a specific product */
function openProductModal(productId) {
  const product = allProducts.find((item) => item.id === productId);
  if (!product) {
    return;
  }

  activeModalProductId = productId;
  lastFocusedElement = document.activeElement;

  modalImage.style.display = "block";
  modalImageFallback.style.display = "none";
  modalImage.src = product.image;
  modalImage.alt = `${product.brand} ${product.name}`;
  modalImageFallback.textContent = product.brand;
  modalImage.onerror = () => {
    modalImage.style.display = "none";
    modalImageFallback.style.display = "flex";
  };

  modalMeta.innerHTML = `
    <span>${product.brand}</span>
    <span class="meta-sep" aria-hidden="true">&middot;</span>
    <span>${formatCategory(product.category)}</span>
  `;
  modalTitle.textContent = product.name;
  modalDescription.textContent = product.description;
  updateModalSelectButton();

  productModal.hidden = false;
  closeModalBtn.focus();
}

/* Close the product description modal */
function closeProductModal() {
  productModal.hidden = true;
  activeModalProductId = null;
  if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
    lastFocusedElement.focus();
  }
}

/* Handle product card clicks and View Details button clicks */
productsContainer.addEventListener("click", (e) => {
  const detailsBtn = e.target.closest(".details-btn");
  if (detailsBtn) {
    e.stopPropagation();
    const productId = Number(detailsBtn.dataset.detailsId);
    openProductModal(productId);
    return;
  }

  const card = e.target.closest(".product-card");
  if (!card) {
    return;
  }
  const productId = Number(card.dataset.productId);
  toggleProductSelection(productId);
});

/* Allow keyboard Enter or Space to select/unselect a focused product card */
productsContainer.addEventListener("keydown", (e) => {
  if (e.target.closest(".details-btn")) {
    return;
  }
  if (e.key === "Enter" || e.key === " ") {
    const card = e.target.closest(".product-card");
    if (!card) {
      return;
    }
    e.preventDefault();
    const productId = Number(card.dataset.productId);
    toggleProductSelection(productId);
  }
});

/* Modal close and selection handlers */
closeModalBtn.addEventListener("click", closeProductModal);

productModal.addEventListener("click", (e) => {
  if (e.target.dataset.closeModal === "true") {
    closeProductModal();
  }
});

modalSelectBtn.addEventListener("click", () => {
  if (activeModalProductId !== null) {
    toggleProductSelection(activeModalProductId);
    updateModalSelectButton();
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !productModal.hidden) {
    closeProductModal();
  }
});

/* Handle remove button clicks inside the selected products panel */
selectedProductsList.addEventListener("click", (e) => {
  const removeBtn = e.target.closest(".remove-item-btn");
  if (!removeBtn) {
    return;
  }
  const productId = Number(removeBtn.dataset.removeId);
  toggleProductSelection(productId);
});

/* Clear all selected products from state and localStorage */
clearSelectedBtn.addEventListener("click", () => {
  selectedProducts = [];
  localStorage.removeItem(STORAGE_KEY);
  displaySelectedProducts();
  filterAndRenderProducts();
});

/* Escape HTML characters for safe text rendering */
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/* Validate that a link URL uses http or https */
function isSafeHttpUrl(url) {
  return /^https?:\/\//i.test(url);
}

/* Format AI reply safely with bold text, clickable links, and citation sources */
function formatAdvisorReply(text, annotations = []) {
  let formatted = escapeHtml(text);

  /* Convert Markdown links [Label](https://...) into clickable links */
  formatted = formatted.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    (match, label, url) => {
      if (!isSafeHttpUrl(url)) {
        return label;
      }
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="advisor-link">${label}</a>`;
    }
  );

  /* Convert remaining plain URLs into clickable links */
  formatted = formatted.replace(
    /(^|[\s(>])(https?:\/\/[^\s<)]+)/g,
    (match, prefix, url) => {
      if (!isSafeHttpUrl(url)) {
        return match;
      }
      return `${prefix}<a href="${url}" target="_blank" rel="noopener noreferrer" class="advisor-link">${url}</a>`;
    }
  );

  formatted = formatted
    .replace(/^#{1,3}\s+(.+)$/gm, "<strong>$1</strong>")
    .replace(/^---+$/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br />");

  /* Collect unique citation links returned in OpenAI annotations */
  const citationMap = new Map();
  annotations.forEach((annotation) => {
    const citation = annotation.url_citation || annotation;
    if (citation && isSafeHttpUrl(citation.url)) {
      citationMap.set(citation.url, citation.title || citation.url);
    }
  });

  if (citationMap.size > 0) {
    const sourceItems = Array.from(citationMap.entries())
      .map(
        ([url, title]) =>
          `<li><a href="${url}" target="_blank" rel="noopener noreferrer" class="advisor-link">${escapeHtml(
            title
          )}</a></li>`
      )
      .join("");

    formatted += `
      <div class="advisor-sources">
        <span class="advisor-sources-label">Sources</span>
        <ul>${sourceItems}</ul>
      </div>
    `;
  }

  return formatted;
}

/* Generate a personalized routine via the OpenAI Cloudflare Worker */
generateRoutineBtn.addEventListener("click", async () => {
  if (selectedProducts.length === 0) {
    appendChatMessage(
      "advisor",
      "Please select at least one product from the catalog first so I can generate your routine."
    );
    return;
  }

  /* Collect only the selected product details to send to OpenAI */
  const selectedProductData = selectedProducts.map((product) => ({
    name: product.name,
    brand: product.brand,
    category: product.category,
    description: product.description,
  }));

  /* Start a fresh conversation history anchored to the selected products */
  conversationHistory = [
    {
      role: "system",
      content: getSystemPrompt(),
    },
    {
      role: "user",
      content: `Build a personalized routine using these selected L'Oréal products:\n${JSON.stringify(
        selectedProductData,
        null,
        2
      )}`,
    },
  ];

  generateRoutineBtn.disabled = true;
  const loadingBubble = appendChatMessage(
    "advisor",
    "Generating your personalized routine..."
  );

  try {
    const replyData = await fetchAdvisorReply(conversationHistory);
    conversationHistory.push({ role: "assistant", content: replyData.content });
    loadingBubble.remove();
    appendChatMessage(
      "advisor",
      formatAdvisorReply(replyData.content, replyData.annotations)
    );
  } catch (error) {
    loadingBubble.remove();
    appendChatMessage("advisor", escapeHtml(error.message));
  } finally {
    generateRoutineBtn.disabled = false;
  }
});

/* Chat form submission handler for follow-up questions */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const question = userInput.value.trim();
  if (!question) {
    return;
  }

  /* Display the user's question and clear the input */
  appendChatMessage("user", escapeHtml(question));
  userInput.value = "";

  /* Initialize conversation history if the user asks a question before generating a routine */
  if (conversationHistory.length === 0) {
    conversationHistory = [
      {
        role: "system",
        content: getSystemPrompt(),
      },
    ];

    if (selectedProducts.length > 0) {
      const selectedSummary = selectedProducts.map((item) => ({
        name: item.name,
        brand: item.brand,
        category: item.category,
        description: item.description,
      }));
      conversationHistory.push({
        role: "system",
        content: `The user currently has these products selected: ${JSON.stringify(
          selectedSummary
        )}`,
      });
    }
  }

  /* Add the new user message so OpenAI sees the full conversation history */
  conversationHistory.push({ role: "user", content: question });

  sendBtn.disabled = true;
  const loadingBubble = appendChatMessage("advisor", "Thinking...");

  try {
    const replyData = await fetchAdvisorReply(conversationHistory);
    conversationHistory.push({ role: "assistant", content: replyData.content });
    loadingBubble.remove();
    appendChatMessage(
      "advisor",
      formatAdvisorReply(replyData.content, replyData.annotations)
    );
  } catch (error) {
    /* Remove the failed user message so history stays clean on retry */
    conversationHistory.pop();
    loadingBubble.remove();
    appendChatMessage("advisor", escapeHtml(error.message));
  } finally {
    sendBtn.disabled = false;
  }
});

initApp();
