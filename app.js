const controlPanels = [
  {
    id: "pulson",
    name: "pulson",
    price: 900,
    offerPrice: 900,
    initials: "PUL",
    desc: "Centrala systemu alarmowego dobrana do standardowej instalacji zabezpieczenia obiektu.",
  },
  {
    id: "genevo",
    name: "genevo",
    price: 1000,
    offerPrice: 1000,
    initials: "GEN",
    desc: "Centrala alarmowa do profesjonalnych instalacji przewodowych, z obsługą stref i konfiguracją pod potrzeby obiektu.",
  },
  {
    id: "ajax",
    name: "ajax",
    price: 1700,
    offerPrice: 1700,
    initials: "AJX",
    desc: "Bezprzewodowa centrala alarmowa z komunikacją przez aplikację mobilną i powiadomieniami o zdarzeniach.",
  },
  {
    id: "satel",
    name: "satel",
    price: 1100,
    offerPrice: 1100,
    initials: "SAT",
    desc: "Przewodowa centrala alarmowa do ochrony domu lub lokalu, przygotowana do obsługi czujników, klawiatur i sygnalizacji.",
  },
];

const panelAccessories = [
  {
    id: "obudowa-transformator",
    name: "Obudowa + transformator",
    price: 130,
    offerPrice: 130,
    initials: "OB",
    image: "assets/obudowa-transformator.png",
    desc: "Obudowa z zasilaczem i miejscem na akumulator systemu alarmowego.",
  },
  {
    id: "akumulator-7ah",
    name: "Akumulator 7Ah/12V",
    price: 120,
    offerPrice: 120,
    initials: "AKU",
    image: "assets/akumulator.png",
    desc: "Bezobsługowy akumulator podtrzymujący pracę systemu alarmowego.",
  },
];

const representative = {
  name: "Piotr Półtorak",
  phone: "665-004-419",
  email: "ppoltorak@solidsecurity.pl",
};

const company = {
  name: "Solid Security",
  subtitle: "Wycena systemu alarmowego",
};

const DEFAULT_CONTROL_PANEL_ID = "pulson";
const MONTHLY_FEE_VAT_RATE = 0.23;
const formIds = ["clientContact", "projectName", "offerNumber", "vatRate", "discount", "monthlyFee"];

const state = {};
const STORAGE_KEYS = {
  productPrices: "solidOffer.productPrices.v1",
  formPrices: "solidOffer.formPrices.v1",
  extraItems: "solidOffer.extraItems.v1",
  catalogPrices: "solidOffer.catalogPrices.v1",
  projects: "solidOffer.projects.v1",
  templates: "solidOffer.templates.v1",
  itemDescriptions: "solidOffer.itemDescriptions.v1",
  itemOrder: "solidOffer.itemOrder.v1",
  catalogCollapsed: "solidOffer.catalogCollapsed.v1",
  accessoryIncluded: "solidOffer.accessoryIncluded.v1",
};
const persistentFormIds = [
  "vatRate",
  "discount",
  "monthlyFee",
];
let productPriceState = {};
let catalogPriceState = {};
let extraItems = [];
let templates = [];
let itemDescriptions = {};
let itemOrder = [];
let catalogCollapsed = false;
let accessoryIncluded = {};
let currentProjectKey = null;
let projectSearchQuery = "";

function formatMoney(value) {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    minimumFractionDigits: 2,
  }).format(value);
}

function roundUpToFullTens(value) {
  return value > 0 ? Math.ceil(value / 10) * 10 : 0;
}

function monthlyFeeGross(monthlyFeeNet) {
  return monthlyFeeNet * (1 + MONTHLY_FEE_VAT_RATE);
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function offerNumber() {
  const date = new Date();
  const stamp = date.toISOString().slice(0, 10).replaceAll("-", "");
  const suffix = String(Math.floor(Math.random() * 900) + 100);
  return `OF/${stamp}/${suffix}`;
}

function safeJsonParse(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function numberValue(id) {
  const value = Number(document.getElementById(id).value);
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function textValue(id) {
  const element = document.getElementById(id);
  return element ? element.value.trim() : "";
}

function selectedControlPanel() {
  return controlPanels.find((item) => item.id === DEFAULT_CONTROL_PANEL_ID) || controlPanels[0];
}

function editableProducts() {
  return [...controlPanels, ...panelAccessories];
}

function defaultAccessoryIncluded() {
  return Object.fromEntries(panelAccessories.map((accessory) => [accessory.id, true]));
}

function isAccessoryIncluded(accessory) {
  return accessoryIncluded[accessory.id] !== false;
}

function defaultPriceRecord(item) {
  return {
    price: item.price,
    offerPrice: Number.isFinite(item.offerPrice) ? item.offerPrice : item.price,
  };
}

function productPriceRecord(item) {
  return productPriceState[item.id] || defaultPriceRecord(item);
}

function internalPrice(item) {
  return Number(productPriceRecord(item).price) || 0;
}

function offerPrice(item) {
  return Number(productPriceRecord(item).offerPrice) || 0;
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function itemDescription(item) {
  if (item.descKey && hasOwn(itemDescriptions, item.descKey)) {
    return itemDescriptions[item.descKey];
  }
  return item.desc || "";
}

function orderedItems(items) {
  const positions = new Map(itemOrder.map((key, index) => [key, index]));
  return [...items].sort((a, b) => {
    const aPosition = positions.has(a.rowKey) ? positions.get(a.rowKey) : Number.MAX_SAFE_INTEGER;
    const bPosition = positions.has(b.rowKey) ? positions.get(b.rowKey) : Number.MAX_SAFE_INTEGER;
    return aPosition - bPosition;
  });
}

function productImage(item) {
  if (item.image) {
    return `<img class="product-image" src="${item.image}" alt="${item.name}" referrerpolicy="no-referrer" onerror="this.replaceWith(imageFallback('${item.initials || "SS"}'))" />`;
  }
  return `<span class="image-fallback">${item.initials || "SS"}</span>`;
}

window.imageFallback = function imageFallback(text) {
  const element = document.createElement("span");
  element.className = "image-fallback";
  element.textContent = text;
  return element;
};

function tableRow(item) {
  const internalPriceHint =
    item.totalNet !== item.offerTotalNet
      ? `<div class="internal-price-note">Cena cennikowa: ${formatMoney(item.unitNet)} netto</div>`
      : "";
  const description = itemDescription(item);
  const descriptionMarkup = item.descKey
    ? `<div class="product-desc editable-desc" contenteditable="true" spellcheck="true" data-row-desc="${escapeHtml(item.descKey)}">${escapeHtml(description)}</div>`
    : `<div class="product-desc">${escapeHtml(description)}</div>`;
  const priceEditor = item.priceKey
    ? `<input class="row-price" type="number" min="0" inputmode="decimal" value="${item.offerUnitNet}" data-row-price="${escapeHtml(item.priceKey)}" />`
    : formatMoney(item.offerUnitNet);
  const actions = item.editableQty || item.deletable
    ? `
        <div class="row-actions">
          ${item.editableQty ? `
            <input class="row-qty" type="number" min="0" inputmode="numeric" value="${item.qty}" data-row-qty="${escapeHtml(item.extraIndex || item.name)}" />
          ` : `<span class="row-qty-static">${item.qty}</span>`}
          ${item.deletable ? `<button class="row-delete" type="button" data-row-delete="${escapeHtml(item.extraIndex || item.name)}">Usuń</button>` : ""}
        </div>
      `
    : `<span class="row-qty-static">${item.qty}</span>`;

  return `
    <tr data-row-key="${escapeHtml(item.rowKey)}">
      <td>
        <div class="product-cell">
          <button class="drag-handle no-print" type="button" aria-label="Zmień kolejność" title="Przeciągnij pozycję">::</button>
          ${productImage(item)}
          <div>
            <div class="product-name">${escapeHtml(item.name)}</div>
            ${descriptionMarkup}
            ${internalPriceHint}
          </div>
        </div>
      </td>
      <td>${actions}</td>
      <td>${priceEditor}</td>
      <td>${formatMoney(item.offerTotalNet)}</td>
    </tr>
  `;
}

function readState() {
  for (const id of formIds) {
    const element = document.getElementById(id);
    state[id] = element.type === "number" ? numberValue(id) : element.value;
  }
}

function buildItems() {
  const items = [];

  for (const accessory of panelAccessories) {
    if (!isAccessoryIncluded(accessory)) {
      continue;
    }

    items.push({
      rowKey: `product:${accessory.id}`,
      name: accessory.name,
      desc: accessory.desc,
      descKey: `product:${accessory.id}`,
      initials: accessory.initials,
      image: accessory.image,
      qty: 1,
      unitNet: internalPrice(accessory),
      offerUnitNet: offerPrice(accessory),
      totalNet: internalPrice(accessory),
      offerTotalNet: offerPrice(accessory),
      priceKey: `product:${accessory.id}`,
      fixed: true,
    });
  }

  for (const item of extraItems) {
    if (item.qty <= 0) {
      continue;
    }

    items.push({
      rowKey: `extra:${item.index}`,
      name: item.name,
      desc: item.desc || item.shortDesc || item.index,
      descKey: `extra:${item.index}`,
      initials: "DOD",
      image: item.image,
      qty: item.qty,
      unitNet: item.price,
      offerUnitNet: item.offerPrice,
      totalNet: item.qty * item.price,
      offerTotalNet: item.qty * item.offerPrice,
      priceKey: `extra:${item.index}`,
      valuationItem: true,
      editableQty: true,
      deletable: true,
      extraIndex: item.index,
    });
  }

  const valuationItems = items.filter((item) => item.valuationItem);
  const catalogSubtotalNet = valuationItems.reduce((sum, item) => sum + item.totalNet, 0);
  const valuationOfferSubtotalNet = valuationItems.reduce((sum, item) => sum + item.offerTotalNet, 0);
  const discountValue = catalogSubtotalNet * ((Number(state.discount) || 0) / 100);
  const discountedCatalogNet = Math.max(0, catalogSubtotalNet - discountValue);
  const laborPrice = roundUpToFullTens(Math.max(0, discountedCatalogNet - valuationOfferSubtotalNet));

  if (laborPrice > 0) {
    items.push({
      rowKey: "labor",
      name: "Robocizna - montaż i uruchomienie",
      desc: "Montaż urządzeń, podłączenie elementów systemu, podstawowa konfiguracja i sprawdzenie działania instalacji.",
      descKey: "labor",
      initials: "M",
      qty: 1,
      unitNet: laborPrice,
      offerUnitNet: laborPrice,
      totalNet: laborPrice,
      offerTotalNet: laborPrice,
      fixed: true,
    });
  }

  return orderedItems(items);
}

function loadPersistentState() {
  productPriceState = safeJsonParse(localStorage.getItem(STORAGE_KEYS.productPrices), {});
  catalogPriceState = safeJsonParse(localStorage.getItem(STORAGE_KEYS.catalogPrices), {});
  extraItems = safeJsonParse(localStorage.getItem(STORAGE_KEYS.extraItems), []);
  templates = safeJsonParse(localStorage.getItem(STORAGE_KEYS.templates), []);
  itemDescriptions = safeJsonParse(localStorage.getItem(STORAGE_KEYS.itemDescriptions), {}) || {};
  itemOrder = safeJsonParse(localStorage.getItem(STORAGE_KEYS.itemOrder), []) || [];
  catalogCollapsed = localStorage.getItem(STORAGE_KEYS.catalogCollapsed) === "true";
  accessoryIncluded = {
    ...defaultAccessoryIncluded(),
    ...(safeJsonParse(localStorage.getItem(STORAGE_KEYS.accessoryIncluded), {}) || {}),
  };

  for (const product of editableProducts()) {
    if (!productPriceState[product.id]) {
      productPriceState[product.id] = defaultPriceRecord(product);
    }
  }
}

function saveProductPrices() {
  localStorage.setItem(STORAGE_KEYS.productPrices, JSON.stringify(productPriceState));
}

function saveCatalogPrices() {
  localStorage.setItem(STORAGE_KEYS.catalogPrices, JSON.stringify(catalogPriceState));
}

function saveExtraItems() {
  localStorage.setItem(STORAGE_KEYS.extraItems, JSON.stringify(extraItems));
}

function saveTemplates() {
  localStorage.setItem(STORAGE_KEYS.templates, JSON.stringify(templates));
}

function saveItemDescriptions() {
  localStorage.setItem(STORAGE_KEYS.itemDescriptions, JSON.stringify(itemDescriptions));
}

function saveItemOrder() {
  localStorage.setItem(STORAGE_KEYS.itemOrder, JSON.stringify(itemOrder));
}

function saveCatalogCollapsed() {
  localStorage.setItem(STORAGE_KEYS.catalogCollapsed, String(catalogCollapsed));
}

function saveAccessoryIncluded() {
  localStorage.setItem(STORAGE_KEYS.accessoryIncluded, JSON.stringify(accessoryIncluded));
}

function loadProjects() {
  return safeJsonParse(localStorage.getItem(STORAGE_KEYS.projects), {});
}

function saveProjects(projects) {
  localStorage.setItem(STORAGE_KEYS.projects, JSON.stringify(projects));
}

function slugValue(value) {
  return String(value || "").toLowerCase().replace(/\s+/g, "");
}

function searchValue(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function projectKey() {
  const name = slugValue(textValue("projectName"));
  const contact = slugValue(textValue("clientContact"));
  return [name, contact].filter(Boolean).join("|");
}

function projectMatchesSearch(project, query) {
  if (!query) {
    return true;
  }

  const haystack = searchValue(
    [
      project.name,
      project.contact,
      project.offerNumber,
      project.key,
      project.form?.projectName,
      project.form?.clientContact,
    ].join(" "),
  );
  return haystack.includes(query);
}

function latestProject() {
  const projects = Object.values(loadProjects());
  if (!projects.length) {
    return null;
  }

  return projects.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))[0] || null;
}

function captureFormValues() {
  const values = {};
  for (const id of formIds) {
    const element = document.getElementById(id);
    if (element) {
      values[id] = element.value;
    }
  }
  return values;
}

function applyFormValues(values) {
  for (const [id, value] of Object.entries(values || {})) {
    const element = document.getElementById(id);
    if (element) {
      element.value = value;
    }
  }
}

function captureTemplateState() {
  return {
    form: {
      vatRate: document.getElementById("vatRate").value,
      discount: document.getElementById("discount").value,
      monthlyFee: document.getElementById("monthlyFee").value,
    },
    extraItems: structuredClone(extraItems),
    productPriceState: structuredClone(productPriceState),
    catalogPriceState: structuredClone(catalogPriceState),
    itemDescriptions: structuredClone(itemDescriptions),
    itemOrder: structuredClone(itemOrder),
    accessoryIncluded: structuredClone(accessoryIncluded),
  };
}

function applyTemplateState(template) {
  if (!template) {
    return;
  }

  applyFormValues(template.form);
  extraItems = structuredClone(template.extraItems || []);
  productPriceState = structuredClone(template.productPriceState || productPriceState);
  catalogPriceState = structuredClone(template.catalogPriceState || catalogPriceState);
  itemDescriptions = structuredClone(template.itemDescriptions || {});
  itemOrder = structuredClone(template.itemOrder || []);
  accessoryIncluded = {
    ...defaultAccessoryIncluded(),
    ...(structuredClone(template.accessoryIncluded || {})),
  };
  saveExtraItems();
  saveProductPrices();
  saveCatalogPrices();
  saveItemDescriptions();
  saveItemOrder();
  saveAccessoryIncluded();
  fillSelects();
  renderAccessoryOptions();
  renderExtraItemsEditor();
  renderTemplateHistory();
  renderProjectHistory();
  renderOffer();
}

function saveProject({ silent = false, noAlert = false } = {}) {
  readState();
  const typedKey = projectKey();
  const key = silent ? currentProjectKey : typedKey || currentProjectKey;
  const contact = textValue("clientContact");
  const name = textValue("projectName");

  if (silent && !currentProjectKey) {
    return;
  }

  if (silent && typedKey && typedKey !== currentProjectKey) {
    return;
  }

  if (!key) {
    if (!silent && !noAlert) {
      alert("Wpisz nazwę projektu albo telefon/e-mail klienta, żeby zapisać projekt.");
    }
    return;
  }

  const projects = loadProjects();
  projects[key] = {
    key,
    name,
    contact,
    offerNumber: textValue("offerNumber"),
    updatedAt: new Date().toISOString(),
    form: captureFormValues(),
    extraItems: structuredClone(extraItems),
    productPriceState: structuredClone(productPriceState),
    catalogPriceState: structuredClone(catalogPriceState),
    itemDescriptions: structuredClone(itemDescriptions),
    itemOrder: structuredClone(itemOrder),
    accessoryIncluded: structuredClone(accessoryIncluded),
  };
  saveProjects(projects);
  currentProjectKey = key;
  renderProjectHistory();
}

function loadProject(key) {
  const project = loadProjects()[key];
  if (!project) {
    return;
  }

  applyFormValues(project.form);
  if (!textValue("projectName") && project.name) {
    document.getElementById("projectName").value = project.name;
  }
  extraItems = structuredClone(project.extraItems || []);
  productPriceState = structuredClone(project.productPriceState || productPriceState);
  catalogPriceState = structuredClone(project.catalogPriceState || catalogPriceState);
  itemDescriptions = structuredClone(project.itemDescriptions || {});
  itemOrder = structuredClone(project.itemOrder || []);
  accessoryIncluded = {
    ...defaultAccessoryIncluded(),
    ...(structuredClone(project.accessoryIncluded || {})),
  };
  currentProjectKey = key;
  saveExtraItems();
  saveProductPrices();
  saveCatalogPrices();
  saveItemDescriptions();
  saveItemOrder();
  saveAccessoryIncluded();
  fillSelects();
  renderAccessoryOptions();
  renderExtraItemsEditor();
  renderProjectHistory();
  renderTemplateHistory();
  renderOffer();
}

function newProject() {
  currentProjectKey = null;
  document.getElementById("clientContact").value = "";
  document.getElementById("projectName").value = "";
  document.getElementById("offerNumber").value = offerNumber();
  document.getElementById("templateName").value = "";
  document.getElementById("discount").value = "0";
  document.getElementById("monthlyFee").value = "";
  extraItems = [];
  itemDescriptions = {};
  itemOrder = [];
  accessoryIncluded = defaultAccessoryIncluded();
  savePersistentFormPrices();
  saveExtraItems();
  saveItemDescriptions();
  saveItemOrder();
  saveAccessoryIncluded();
  renderAccessoryOptions();
  renderExtraItemsEditor();
  renderProjectHistory();
  renderTemplateHistory();
  renderOffer();
}

function renderProjectHistory() {
  const container = document.getElementById("projectHistory");
  const query = searchValue(projectSearchQuery || document.getElementById("projectSearch")?.value || "");
  const allProjects = Object.values(loadProjects()).sort((a, b) =>
    String(b.updatedAt).localeCompare(String(a.updatedAt)),
  );
  const projects = allProjects.filter((project) => projectMatchesSearch(project, query));

  if (!allProjects.length) {
    container.innerHTML = "";
    return;
  }

  if (!projects.length) {
    container.innerHTML = `
      <div class="history-title">Historia projektów</div>
      <div class="history-empty">Brak projektów dla wpisanej frazy.</div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="history-title">Historia projektów (${projects.length})</div>
    <div class="history-list">
      ${projects
        .map(
          (project) => `
            <button class="history-item ${project.key === currentProjectKey ? "is-active" : ""}" type="button" data-project-key="${escapeHtml(project.key)}">
              <span>${escapeHtml(project.name || project.contact || "Projekt bez nazwy")}</span>
              <small>${escapeHtml(project.contact || "bez kontaktu")} | ${escapeHtml(project.offerNumber || "bez numeru")} | ${new Date(project.updatedAt).toLocaleString("pl-PL")}</small>
            </button>
          `,
        )
        .join("")}
    </div>
  `;

  container.querySelectorAll("[data-project-key]").forEach((button) => {
    button.addEventListener("click", () => loadProject(button.dataset.projectKey));
  });
}

function loadTemplates() {
  if (Array.isArray(templates)) {
    return templates;
  }

  if (templates && typeof templates === "object") {
    return Object.values(templates);
  }

  return [];
}

function saveTemplate({ silent = false } = {}) {
  readState();
  const name = textValue("templateName");

  if (!name) {
    if (!silent) {
      alert("Podaj nazwę szablonu.");
    }
    return;
  }

  const item = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name,
    updatedAt: new Date().toISOString(),
    state: captureTemplateState(),
  };

  templates = [item, ...loadTemplates().filter((entry) => entry.name !== name)];
  saveTemplates();
  renderTemplateHistory();
}

function loadTemplateById(id) {
  const template = loadTemplates().find((entry) => entry.id === id);
  if (!template) {
    return;
  }

  document.getElementById("templateName").value = template.name || "";
  applyTemplateState(template.state);
}

function renderTemplateHistory() {
  const container = document.getElementById("templateHistory");
  const templateList = loadTemplates().sort((a, b) =>
    String(b.updatedAt).localeCompare(String(a.updatedAt)),
  );

  if (!templateList.length) {
    container.innerHTML = "";
    return;
  }

  container.innerHTML = `
    <div class="history-title">Szablony</div>
    ${templateList
      .slice(0, 12)
      .map(
        (template) => `
          <button class="history-item" type="button" data-template-id="${escapeHtml(template.id)}">
            <span>${escapeHtml(template.name)}</span>
            <small>${new Date(template.updatedAt).toLocaleString("pl-PL")}</small>
          </button>
        `,
      )
      .join("")}
  `;

  container.querySelectorAll("[data-template-id]").forEach((button) => {
    button.addEventListener("click", () => loadTemplateById(button.dataset.templateId));
  });
}

function loadPersistentFormPrices() {
  const saved = safeJsonParse(localStorage.getItem(STORAGE_KEYS.formPrices), {});
  for (const id of persistentFormIds) {
    if (saved[id] !== undefined && document.getElementById(id)) {
      document.getElementById(id).value = saved[id];
    }
  }
}

function savePersistentFormPrices() {
  const saved = {};
  for (const id of persistentFormIds) {
    const element = document.getElementById(id);
    if (element) {
      saved[id] = element.value;
    }
  }
  localStorage.setItem(STORAGE_KEYS.formPrices, JSON.stringify(saved));
}

function numberValueFromElement(element) {
  const value = Number(element.value);
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function catalogItems() {
  const baseItems = Array.isArray(window.CATALOG_ITEMS)
    ? window.CATALOG_ITEMS
    : typeof CATALOG_ITEMS !== "undefined"
      ? CATALOG_ITEMS
      : [];
  const customItems = Array.isArray(window.CUSTOM_CATALOG_ITEMS) ? window.CUSTOM_CATALOG_ITEMS : [];
  return [...customItems, ...baseItems];
}

function catalogPriceRecord(item) {
  const saved = catalogPriceState[item.index];
  return {
    price: saved?.price ?? item.price,
    offerPrice: saved?.offerPrice ?? item.price,
  };
}

function addCatalogItem(index) {
  const item = catalogItems().find((entry) => entry.index === index);
  if (!item) {
    return;
  }

  if (item.customBlank) {
    const blankIndex = `PUSTE-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    extraItems.push({
      id: blankIndex,
      index: blankIndex,
      name: "Nowa pozycja",
      desc: "",
      image: "",
      qty: 1,
      price: 0,
      offerPrice: 0,
    });
    saveExtraItems();
    renderExtraItemsEditor();
    renderCatalogResults();
    renderOffer();
    saveProject({ silent: true });
    return;
  }

  const existing = extraItems.find((entry) => entry.index === index);
  if (existing) {
    existing.qty += 1;
  } else {
    const prices = catalogPriceRecord(item);
    extraItems.push({
      id: item.id,
      index: item.index,
      name: item.name,
      desc: item.shortDesc || item.desc || item.category,
      image: item.image,
      qty: 1,
      price: prices.price,
      offerPrice: prices.offerPrice,
    });
  }

  saveExtraItems();
  renderExtraItemsEditor();
  renderCatalogResults();
  renderOffer();
  saveProject({ silent: true });
}

function renderCatalogResults() {
  const query = document.getElementById("catalogSearch").value.trim().toLowerCase();
  const container = document.getElementById("catalogResults");

  if (query.length < 2) {
    container.innerHTML = "";
    return;
  }

  const results = catalogItems()
    .filter((item) => {
      const haystack = `${item.index} ${item.name} ${item.producer || ""} ${item.category || ""} ${item.searchAliases || ""}`.toLowerCase();
      return haystack.includes(query);
    })
    .slice(0, 12);

  container.innerHTML = results
    .map((item) => {
      const image = item.image
        ? `<img class="catalog-thumb" src="${item.image}" alt="${escapeHtml(item.name)}" />`
        : `<span class="catalog-thumb">IMG</span>`;
      return `
        <div class="catalog-result">
          ${image}
          <div>
            <div class="catalog-title">${escapeHtml(item.index)} - ${escapeHtml(item.name)}</div>
            <div class="catalog-meta">${escapeHtml(item.shortDesc || item.category || item.sheet)} | ${formatMoney(item.price)} netto</div>
          </div>
          <button class="small-action" type="button" data-add-index="${escapeHtml(item.index)}">Dodaj</button>
        </div>
      `;
    })
    .join("");

  container.querySelectorAll("[data-add-index]").forEach((button) => {
    button.addEventListener("click", () => addCatalogItem(button.dataset.addIndex));
  });
}

function renderExtraItemsEditor() {
  const container = document.getElementById("extraItemsEditor");

  if (!extraItems.length) {
    container.innerHTML = "";
    return;
  }

  container.innerHTML = extraItems
    .map(
      (item, index) => `
        <div class="extra-row">
          <div>
            <div class="extra-title">${escapeHtml(item.index)} - ${escapeHtml(item.name)}</div>
          </div>
          <label class="mini-label">
            Nazwa pozycji
            <input class="extra-name-input" data-extra-name="${index}" type="text" value="${escapeHtml(item.name)}" />
          </label>
          <label class="mini-label">
            Opis pozycji
            <textarea class="extra-desc-input" data-extra-desc="${index}" rows="3">${escapeHtml(item.desc || "")}</textarea>
          </label>
          <div class="extra-controls">
            <label class="mini-label">
              Ilość
              <input class="extra-input" data-extra="${index}" data-field="qty" type="number" min="0" inputmode="numeric" value="${item.qty}" />
            </label>
            <label class="mini-label">
              Moja cena
              <input class="extra-input" data-extra="${index}" data-field="price" type="number" min="0" inputmode="decimal" value="${item.price}" />
            </label>
            <label class="mini-label">
              Cena klienta
              <input class="extra-input" data-extra="${index}" data-field="offerPrice" type="number" min="0" inputmode="decimal" value="${item.offerPrice}" />
            </label>
            <button class="ghost-action" type="button" data-remove-extra="${index}">Usuń</button>
          </div>
        </div>
      `,
    )
    .join("");

  container.querySelectorAll(".extra-input").forEach((input) => {
    input.addEventListener("input", () => {
      const index = Number(input.dataset.extra);
      const field = input.dataset.field;
      extraItems[index][field] = numberValueFromElement(input);
      catalogPriceState[extraItems[index].index] = {
        price: extraItems[index].price,
        offerPrice: extraItems[index].offerPrice,
      };
      saveCatalogPrices();
      saveExtraItems();
      renderOffer();
      saveProject({ silent: true });
    });
  });

  container.querySelectorAll(".extra-name-input").forEach((input) => {
    input.addEventListener("input", () => {
      const index = Number(input.dataset.extraName);
      extraItems[index].name = input.value || "Nowa pozycja";
      saveExtraItems();
      renderOffer();
      saveProject({ silent: true });
    });
  });

  container.querySelectorAll(".extra-desc-input").forEach((input) => {
    input.addEventListener("input", () => {
      const index = Number(input.dataset.extraDesc);
      extraItems[index].desc = input.value;
      itemDescriptions[`extra:${extraItems[index].index}`] = input.value;
      saveItemDescriptions();
      saveExtraItems();
      renderOffer();
      saveProject({ silent: true });
    });
  });

  container.querySelectorAll("[data-remove-extra]").forEach((button) => {
    button.addEventListener("click", () => {
      extraItems.splice(Number(button.dataset.removeExtra), 1);
      saveExtraItems();
      renderExtraItemsEditor();
      renderOffer();
      saveProject({ silent: true });
    });
  });
}

function renderAccessoryOptions() {
  const container = document.getElementById("accessoryOptions");
  if (!container) {
    return;
  }

  container.innerHTML = `
    <div class="accessory-options-title">Elementy bazowe</div>
    ${panelAccessories
      .map(
        (accessory) => `
          <label class="accessory-option">
            <input type="checkbox" data-accessory-id="${escapeHtml(accessory.id)}" ${isAccessoryIncluded(accessory) ? "checked" : ""} />
            <span>${escapeHtml(accessory.name)}</span>
          </label>
        `,
      )
      .join("")}
  `;

  container.querySelectorAll("[data-accessory-id]").forEach((input) => {
    input.addEventListener("change", () => {
      accessoryIncluded[input.dataset.accessoryId] = input.checked;
      saveAccessoryIncluded();
      renderOffer();
      saveProject({ silent: true });
    });
  });
}

function updateExtraItemQuantity(index, qty) {
  const item = extraItems.find((entry) => entry.index === index);
  if (!item) {
    return;
  }

  item.qty = qty;
  saveExtraItems();
  renderExtraItemsEditor();
  renderOffer();
  saveProject({ silent: true });
}

function deleteExtraItem(index) {
  const position = extraItems.findIndex((entry) => entry.index === index);
  if (position < 0) {
    return;
  }

  extraItems.splice(position, 1);
  saveExtraItems();
  renderExtraItemsEditor();
  renderOffer();
  saveProject({ silent: true });
}

function updateItemDescription(key, description) {
  itemDescriptions[key] = description;
  if (key.startsWith("extra:")) {
    const index = key.slice("extra:".length);
    const item = extraItems.find((entry) => entry.index === index);
    if (item) {
      item.desc = description;
      saveExtraItems();
    }
  }
  saveItemDescriptions();
  saveProject({ silent: true });
}

function updateRowOfferPrice(key, price) {
  if (key.startsWith("product:")) {
    const id = key.slice("product:".length);
    const product = editableProducts().find((item) => item.id === id);
    productPriceState[id] = productPriceState[id] || defaultPriceRecord(product || { price: 0 });
    productPriceState[id].offerPrice = price;
    saveProductPrices();
  } else if (key.startsWith("extra:")) {
    const index = key.slice("extra:".length);
    const item = extraItems.find((entry) => entry.index === index);
    if (item) {
      item.offerPrice = price;
      catalogPriceState[item.index] = {
        price: item.price,
        offerPrice: item.offerPrice,
      };
      saveCatalogPrices();
      saveExtraItems();
      renderExtraItemsEditor();
    }
  }

  renderOffer();
  saveProject({ silent: true });
}

function persistCurrentRowOrder() {
  itemOrder = Array.from(document.querySelectorAll("[data-row-key]")).map((row) => row.dataset.rowKey);
  saveItemOrder();
  saveProject({ silent: true });
}

function enableRowDragging() {
  document.querySelectorAll(".drag-handle").forEach((handle) => {
    handle.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) {
        return;
      }

      const draggedRow = handle.closest("[data-row-key]");
      if (!draggedRow) {
        return;
      }

      let moved = false;
      draggedRow.classList.add("dragging-row");
      document.body.classList.add("is-row-dragging");
      handle.setPointerCapture?.(event.pointerId);

      const onPointerMove = (moveEvent) => {
        moveEvent.preventDefault();
        const target = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY)?.closest("[data-row-key]");
        if (!target || target === draggedRow || target.parentElement !== draggedRow.parentElement) {
          return;
        }

        const targetRect = target.getBoundingClientRect();
        const insertAfter = moveEvent.clientY > targetRect.top + targetRect.height / 2;
        target.parentElement.insertBefore(draggedRow, insertAfter ? target.nextSibling : target);
        moved = true;
      };

      const onPointerUp = () => {
        document.removeEventListener("pointermove", onPointerMove);
        document.removeEventListener("pointerup", onPointerUp);
        document.removeEventListener("pointercancel", onPointerUp);
        draggedRow.classList.remove("dragging-row");
        document.body.classList.remove("is-row-dragging");
        handle.releasePointerCapture?.(event.pointerId);

        if (moved) {
          persistCurrentRowOrder();
          renderOffer();
        }
      };

      document.addEventListener("pointermove", onPointerMove, { passive: false });
      document.addEventListener("pointerup", onPointerUp);
      document.addEventListener("pointercancel", onPointerUp);
      event.preventDefault();
    });
  });
}

function renderCatalogCollapseState() {
  const body = document.getElementById("catalogSectionBody");
  const button = document.getElementById("toggleCatalogSection");
  if (!body || !button) {
    return;
  }

  body.hidden = catalogCollapsed;
  button.textContent = catalogCollapsed ? "Rozwiń" : "Zwiń";
  button.setAttribute("aria-expanded", String(!catalogCollapsed));
}

function renderOffer() {
  readState();
  const items = buildItems();
  const clientSubtotalNet = items.reduce((sum, item) => sum + item.offerTotalNet, 0);
  const valuationItems = items.filter((item) => item.valuationItem);
  const laborItem = items.find((item) => item.rowKey === "labor");
  const catalogSubtotalNet = valuationItems.reduce((sum, item) => sum + item.totalNet, 0);
  const valuationOfferSubtotalNet = valuationItems.reduce((sum, item) => sum + item.offerTotalNet, 0);
  const calculatedLaborNet = laborItem ? laborItem.offerTotalNet : 0;
  const discountRate = Number(state.discount) || 0;
  const discountValue = catalogSubtotalNet * (discountRate / 100);
  const discountedCatalogNet = Math.max(0, catalogSubtotalNet - discountValue);
  const valuationDifference = valuationOfferSubtotalNet + calculatedLaborNet - discountedCatalogNet;
  const vatValue = clientSubtotalNet * Number(state.vatRate);
  const gross = clientSubtotalNet + vatValue;
  const warrantyExtensionCost = gross * 0.13;
  const monthlyFeeText =
    state.monthlyFee > 0
      ? `${formatMoney(monthlyFeeGross(state.monthlyFee))} brutto (23% VAT).`
      : "...";
  const valuationRows = valuationItems
    .map(
      (item) => `
        <div class="valuation-row">
          <span>${escapeHtml(item.name)} × ${item.qty}</span>
          <strong>${formatMoney(item.totalNet)}</strong>
        </div>
      `,
    )
    .join("") || `<div class="valuation-empty">Dodaj pozycje z cennika, żeby sprawdzić wycenę.</div>`;

  document.getElementById("offerPreview").innerHTML = `
    <article>
      <div class="offer-watermark">SOLID SECURITY</div>
      <div class="offer-watermark small">SOLID SECURITY</div>

      <div class="offer-banner-strip">
        <img src="assets/solid-security-banner.jpg" alt="Solid Security" />
      </div>

      <header class="offer-header">
        <div class="offer-brand">
          <div class="offer-mark">S</div>
          <div>
            <p>${company.name}</p>
            <h2>${company.subtitle}</h2>
          </div>
        </div>
        <div class="offer-title">
          <h2>Oferta</h2>
          <p>Nr ${textValue("offerNumber") || "-"}</p>
          <p>Data: ${todayIso()}</p>
        </div>
      </header>

      <section class="meta-grid">
        <div class="meta-card">
          <h3>Klient</h3>
          <p><strong>${textValue("clientContact") || "Telefon lub e-mail do uzupełnienia"}</strong></p>
        </div>
        <div class="meta-card">
          <h3>Kierownik</h3>
          <p>
            <strong>${representative.name}</strong><br />
            tel. ${representative.phone}<br />
            mail. ${representative.email}
          </p>
        </div>
      </section>

      <table class="items-table">
        <thead>
          <tr>
            <th>Pozycja</th>
            <th>Ilość</th>
            <th>Cena netto</th>
            <th>Wartość netto</th>
          </tr>
        </thead>
        <tbody>
          ${items.map(tableRow).join("")}
        </tbody>
      </table>

      <section class="summary-box">
        <div class="valuation-card no-print">
          <h3>Kontrola wyceny</h3>
          <div class="valuation-list">
            ${valuationRows}
          </div>
          <label class="discount-inline">
            Rabat od cennika %
            <input id="summaryDiscount" type="number" min="0" max="100" inputmode="decimal" value="${state.discount}" />
          </label>
          <div class="summary-table compact-summary">
            <div class="summary-row">
              <span>Suma cennikowa netto</span>
              <strong>${formatMoney(catalogSubtotalNet)}</strong>
            </div>
            <div class="summary-row">
              <span>Kwota rabatu</span>
              <strong>${formatMoney(discountValue)}</strong>
            </div>
            <div class="summary-row">
              <span>Po rabacie netto</span>
              <strong>${formatMoney(discountedCatalogNet)}</strong>
            </div>
            <div class="summary-row">
              <span>Pozycje z cennika w tabeli</span>
              <strong>${formatMoney(valuationOfferSubtotalNet)}</strong>
            </div>
            <div class="summary-row">
              <span>Robocizna automatyczna</span>
              <strong>${formatMoney(calculatedLaborNet)}</strong>
            </div>
            <div class="summary-row ${Math.abs(valuationDifference) < 0.01 ? "match-row" : "warning-row"}">
              <span>Różnica oferta / wycena</span>
              <strong>${formatMoney(valuationDifference)}</strong>
            </div>
          </div>
        </div>
        <div class="summary-table">
          <div class="summary-row">
            <span>Suma netto</span>
            <strong>${formatMoney(clientSubtotalNet)}</strong>
          </div>
          <div class="summary-row">
            <span>VAT ${(Number(state.vatRate) * 100).toFixed(0)}%</span>
            <strong>${formatMoney(vatValue)}</strong>
          </div>
          <div class="summary-row total">
            <span>Razem brutto</span>
            <strong>${formatMoney(gross)}</strong>
          </div>
        </div>
      </section>

      <section class="service-notes">
        <h3>Warunki serwisu i monitoringu</h3>
        <p>
          System SSWIN objęty jest 24-miesięczną gwarancją oraz serwisem całodobowym.
        </p>
        <p>
          Możliwość przedłużenia gwarancji do lat 5 - ${formatMoney(warrantyExtensionCost)} brutto koszt jednorazowy.
        </p>
        <p>
          Abonament miesięczny za podjazdy grup interwencyjnych wynosi ${monthlyFeeText}
        </p>
      </section>

      <section class="offer-notes-grid">
        <div>
          <strong>Kierownik</strong><br />
          ${representative.name}<br />
          tel. ${representative.phone}<br />
          e-mail: ${representative.email}
        </div>
        <div>
          <strong>Uwagi</strong><br />
          Podane ceny są cenami netto przed doliczeniem wybranej stawki VAT.
          Szczegółowy zakres prac może zostać doprecyzowany po wizji lokalnej.
        </div>
      </section>

      <p class="fineprint">
        Oferta została wygenerowana automatycznie na podstawie wybranej konfiguracji. Zdjęcia produktów mają charakter poglądowy.
      </p>
    </article>
  `;

  document.querySelectorAll("[data-row-qty]").forEach((input) => {
    input.addEventListener("input", () => {
      const index = input.dataset.rowQty;
      updateExtraItemQuantity(index, numberValueFromElement(input));
    });
  });

  document.querySelectorAll("[data-row-delete]").forEach((button) => {
    button.addEventListener("click", () => {
      deleteExtraItem(button.dataset.rowDelete);
    });
  });

  document.querySelectorAll("[data-row-price]").forEach((input) => {
    input.addEventListener("change", () => {
      updateRowOfferPrice(input.dataset.rowPrice, numberValueFromElement(input));
    });
  });

  document.querySelectorAll("[data-row-desc]").forEach((element) => {
    element.addEventListener("input", () => {
      updateItemDescription(element.dataset.rowDesc, element.textContent);
    });
  });

  enableRowDragging();

  document.getElementById("summaryDiscount").addEventListener("change", (event) => {
    document.getElementById("discount").value = String(numberValueFromElement(event.target));
    savePersistentFormPrices();
    renderOffer();
    saveProject({ silent: true });
  });
}

async function generatePdf() {
  // zapis projektu przy generowaniu PDF, żeby można było do niego wrócić
  saveProject({ noAlert: true });
  renderOffer();
  const button = document.getElementById("printOffer");
  const element = document.getElementById("offerPreview");
  const filename = `${textValue("offerNumber") || "oferta"}`
    .replaceAll("/", "-")
    .replaceAll(" ", "-")
    .toLowerCase();

  if (!window.html2pdf) {
    window.print();
    return;
  }

  button.disabled = true;
  button.textContent = "...";
  document.body.classList.add("exporting-pdf");
  window.scrollTo(0, 0);

  try {
    await window
      .html2pdf()
      .set({
        margin: [7, 7, 7, 7],
        filename: `${filename}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff", scrollX: 0, scrollY: 0 },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: {
          mode: ["css", "legacy"],
          avoid: [".items-table tr", ".summary-box", ".service-notes", ".offer-notes-grid"],
        },
      })
      .from(element)
      .save();
  } finally {
    document.body.classList.remove("exporting-pdf");
    button.disabled = false;
    button.textContent = "PDF";
  }
}

function fillSelects() {
  const panelSelect = document.getElementById("controlPanel");
  if (!panelSelect) {
    return;
  }
  const selectedPanel = panelSelect.value;
  panelSelect.innerHTML = controlPanels
    .map((item) => `<option value="${item.id}">${item.name} - ${formatMoney(internalPrice(item))} netto</option>`)
    .join("");
  if (selectedPanel) {
    panelSelect.value = selectedPanel;
  }
}

function init() {
  loadPersistentState();
  fillSelects();
  loadPersistentFormPrices();
  renderExtraItemsEditor();
  renderProjectHistory();
  renderTemplateHistory();

  const lastProject = latestProject();
  if (lastProject) {
    applyFormValues(lastProject.form);
    if (!textValue("projectName") && lastProject.name) {
      document.getElementById("projectName").value = lastProject.name;
    }
    extraItems = structuredClone(lastProject.extraItems || []);
    productPriceState = structuredClone(lastProject.productPriceState || productPriceState);
    catalogPriceState = structuredClone(lastProject.catalogPriceState || catalogPriceState);
    itemDescriptions = structuredClone(lastProject.itemDescriptions || {});
    itemOrder = structuredClone(lastProject.itemOrder || []);
    accessoryIncluded = {
      ...defaultAccessoryIncluded(),
      ...(structuredClone(lastProject.accessoryIncluded || {})),
    };
    currentProjectKey = lastProject.key;
    saveExtraItems();
    saveProductPrices();
    saveCatalogPrices();
    saveItemDescriptions();
    saveItemOrder();
    saveAccessoryIncluded();
  } else if (!textValue("offerNumber")) {
    document.getElementById("offerNumber").value = offerNumber();
  }

  fillSelects();
  renderAccessoryOptions();
  renderExtraItemsEditor();
  renderProjectHistory();
  renderTemplateHistory();

  for (const id of formIds) {
    document.getElementById(id).addEventListener("input", () => {
      if (persistentFormIds.includes(id)) {
        savePersistentFormPrices();
      }
      renderOffer();
      saveProject({ silent: true });
    });
    document.getElementById(id).addEventListener("change", () => {
      if (persistentFormIds.includes(id)) {
        savePersistentFormPrices();
      }
      renderOffer();
      saveProject({ silent: true });
    });
  }

  document.getElementById("catalogSearch").addEventListener("input", renderCatalogResults);
  document.getElementById("projectSearch").addEventListener("input", (event) => {
    projectSearchQuery = event.target.value;
    renderProjectHistory();
  });
  document.getElementById("toggleCatalogSection").addEventListener("click", () => {
    catalogCollapsed = !catalogCollapsed;
    saveCatalogCollapsed();
    renderCatalogCollapseState();
  });
  document.getElementById("saveTemplate").addEventListener("click", () => saveTemplate());
  document.getElementById("loadTemplate").addEventListener("click", () => {
    renderTemplateHistory();
    document.getElementById("templateHistory").scrollIntoView({ block: "nearest", behavior: "smooth" });
  });
  document.getElementById("saveProject").addEventListener("click", () => saveProject());
  document.getElementById("newProject").addEventListener("click", newProject);
  document.getElementById("printOffer").addEventListener("click", generatePdf);

  renderCatalogCollapseState();
  renderOffer();
}

init();
