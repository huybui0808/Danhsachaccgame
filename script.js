// =====================================================
// Kho Acc Liên Quân — lưu trữ trên Cloudinary + JSONBin
// =====================================================

// ===== CONFIG (dùng lại từ web lưu bút) =====
const BIN_ID = "6a2402c8f5f4af5e29c210b3";
const API_KEY = "$2a$10$nQb8E2FsCr2IFBogT76xee7Obj2dzRiVQKxV9NEB4Qt6GDYxMfeve";
const API_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;
const CLOUD_NAME = "dbmutd7dy";
const UPLOAD_PRESET = "Luuacclq";

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

// ===== JSONBIN =====
async function layDuLieu() {
  const res = await fetch(API_URL + "/latest", {
    headers: { "X-Master-Key": API_KEY }
  });
  const json = await res.json();
  const record = json.record || {};
  const data = record.lq_accounts || [];
  // tương thích định dạng cũ
  return data.map(a => ({
    ...a,
    images: Array.isArray(a.images) ? a.images : a.image ? [a.image] : []
  }));
}

async function luuDuLieu(data) {
  // Đọc record hiện tại để giữ nguyên các key khác (luubut, v.v.)
  const res = await fetch(API_URL + "/latest", {
    headers: { "X-Master-Key": API_KEY }
  });
  const json = await res.json();
  const record = json.record || {};
  await fetch(API_URL, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "X-Master-Key": API_KEY
    },
    body: JSON.stringify({ ...record, lq_accounts: data })
  });
}

// ===== CLOUDINARY =====
async function uploadAnhCloudinary(dataUrl) {
  const blob = await (await fetch(dataUrl)).blob();
  const formData = new FormData();
  formData.append("file", blob);
  formData.append("upload_preset", UPLOAD_PRESET);
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: "POST", body: formData }
  );
  const data = await res.json();
  if (!data.secure_url) throw new Error("Upload ảnh thất bại");
  return data.secure_url;
}

// Upload nhiều ảnh, chỉ upload ảnh mới (base64), giữ nguyên link cũ
async function uploadNhieuAnh(images) {
  const results = [];
  for (const src of images) {
    if (src.startsWith("http")) {
      results.push(src); // link Cloudinary cũ → giữ nguyên
    } else {
      const url = await uploadAnhCloudinary(src);
      results.push(url);
    }
  }
  return results;
}

// ===== HELPERS =====
function genId() {
  return "acc_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ===== TRẠNG THÁI APP =====
let accounts = [];
let searchTerm = "";
let pendingDeleteId = null;
let currentImages = [];

// ===== DOM REFS =====
const grid = document.getElementById("grid");
const emptyState = document.getElementById("emptyState");
const countLabel = document.getElementById("countLabel");
const searchBox = document.getElementById("searchBox");

const modalOverlay = document.getElementById("modalOverlay");
const modalTitle = document.getElementById("modalTitle");
const accForm = document.getElementById("accForm");
const accIdField = document.getElementById("accId");
const fUsername = document.getElementById("fUsername");
const fPassword = document.getElementById("fPassword");
const fRank = document.getElementById("fRank");
const fStatus = document.getElementById("fStatus");
const fNote = document.getElementById("fNote");
const fImageFile = document.getElementById("fImageFile");

const imgPick = document.getElementById("imgPick");
const imgGrid = document.getElementById("imgGrid");

const btnAdd = document.getElementById("btnAdd");
const btnClose = document.getElementById("btnClose");
const btnCancel = document.getElementById("btnCancel");
const btnDelete = document.getElementById("btnDelete");
const togglePw = document.getElementById("togglePw");

const confirmOverlay = document.getElementById("confirmOverlay");
const confirmOk = document.getElementById("confirmOk");
const confirmCancel = document.getElementById("confirmCancel");

const galleryOverlay = document.getElementById("galleryOverlay");
const galleryTitle = document.getElementById("galleryTitle");
const galleryGrid = document.getElementById("galleryGrid");
const btnGalleryClose = document.getElementById("btnGalleryClose");

const lightboxOverlay = document.getElementById("lightboxOverlay");
const lightboxImg = document.getElementById("lightboxImg");
const lightboxCounter = document.getElementById("lightboxCounter");
const btnLightboxClose = document.getElementById("btnLightboxClose");
const btnLightboxPrev = document.getElementById("btnLightboxPrev");
const btnLightboxNext = document.getElementById("btnLightboxNext");

const toastEl = document.getElementById("toast");

// ===== LOADING STATE =====
function setLoading(on) {
  if (on) {
    grid.innerHTML = `<p style="color:#888;text-align:center;padding:40px;grid-column:1/-1;">⏳ Đang tải dữ liệu...</p>`;
    emptyState.hidden = true;
  }
}

// ===== RENDER =====
function render() {
  const term = searchTerm.trim().toLowerCase();
  const filtered = term
    ? accounts.filter(a => a.username.toLowerCase().includes(term))
    : accounts;

  countLabel.textContent = `${accounts.length} acc${term ? ` · ${filtered.length} khớp tìm kiếm` : ""}`;

  if (accounts.length === 0) {
    grid.innerHTML = "";
    emptyState.hidden = false;
    emptyState.querySelector("h2").textContent = "Chưa có acc nào";
    emptyState.querySelector("p").textContent = 'Bấm "Thêm acc" để lưu acc đầu tiên của bạn.';
    return;
  }

  if (filtered.length === 0) {
    grid.innerHTML = "";
    emptyState.hidden = false;
    emptyState.querySelector("h2").textContent = "Không tìm thấy";
    emptyState.querySelector("p").textContent = `Không có acc nào khớp với "${searchTerm}".`;
    return;
  }

  emptyState.hidden = true;
  grid.innerHTML = filtered.map(cardTemplate).join("");
}

function cardTemplate(a) {
  const isBanned = /cấm|ban|khóa|cam|khoa/i.test(a.status || "");
  const images = a.images || [];

  const imgHtml = images.length
    ? `
      <div class="card__imgwrap">
        <img class="card__img" src="${images[0]}" alt="Ảnh skin ${escapeHtml(a.username)}" />
        ${images.length > 1 ? `<span class="card__imgcount">+${images.length - 1} ảnh</span>` : ""}
      </div>
    `
    : "";

  return `
    <article class="card" data-id="${a.id}">
      ${imgHtml}
      <div class="card__top">
        ${a.rank ? `<span class="card__rank">${escapeHtml(a.rank)}</span>` : `<span></span>`}
        <button class="card__edit" aria-label="Sửa acc">✏️</button>
      </div>

      <div class="card__row">
        <span class="card__row-label">Tài khoản</span>
        <div class="card__pw">
          <span class="card__row-value">${escapeHtml(a.username)}</span>
          <button class="copybtn copybtn--user" type="button" aria-label="Sao chép tài khoản">⧉</button>
        </div>
      </div>

      <div class="card__row">
        <span class="card__row-label">Mật khẩu</span>
        <div class="card__pw">
          <span class="card__row-value">${escapeHtml(a.password)}</span>
          <button class="copybtn copybtn--pass" type="button" aria-label="Sao chép mật khẩu">⧉</button>
        </div>
      </div>

      ${a.status ? `<div class="card__status ${isBanned ? "card__status--banned" : ""}">${escapeHtml(a.status)}</div>` : ""}
      ${a.note ? `<div class="card__note">${escapeHtml(a.note)}</div>` : ""}
    </article>
  `;
}

// ===== EVENT DELEGATION =====
grid.addEventListener("click", e => {
  const editBtn = e.target.closest(".card__edit");
  if (editBtn) {
    const card = editBtn.closest(".card");
    if (card) openEditModal(card.dataset.id);
    return;
  }
  const copyUser = e.target.closest(".copybtn--user");
  if (copyUser) {
    const card = copyUser.closest(".card");
    if (card) {
      const acc = accounts.find(a => a.id === card.dataset.id);
      if (acc) copyToClipboard(acc.username, "Đã sao chép tài khoản");
    }
    return;
  }
  const copyPass = e.target.closest(".copybtn--pass");
  if (copyPass) {
    const card = copyPass.closest(".card");
    if (card) {
      const acc = accounts.find(a => a.id === card.dataset.id);
      if (acc) copyToClipboard(acc.password, "Đã sao chép mật khẩu");
    }
    return;
  }
  const imgWrap = e.target.closest(".card__imgwrap");
  if (imgWrap) {
    const card = imgWrap.closest(".card");
    if (card) {
      const acc = accounts.find(a => a.id === card.dataset.id);
      if (acc) openGallery(acc);
    }
  }
});

// ===== GALLERY =====
let lightboxImages = [];
let lightboxIndex = 0;

function openGallery(account) {
  const images = account.images || [];
  if (!images.length) return;
  galleryTitle.textContent = `Ảnh skin — ${account.username}`;
  galleryGrid.innerHTML = images
    .map((src, i) =>
      `<img src="${src}" alt="Ảnh skin ${i + 1} của ${escapeHtml(account.username)}" data-index="${i}" style="cursor:pointer;" />`
    )
    .join("");
  galleryGrid.querySelectorAll("img").forEach(img => {
    img.addEventListener("click", () => {
      openLightbox(images, Number(img.dataset.index));
    });
  });
  galleryOverlay.hidden = false;
}

function closeGallery() {
  galleryOverlay.hidden = true;
}

// ===== LIGHTBOX =====
function openLightbox(images, startIndex) {
  lightboxImages = images;
  lightboxIndex = startIndex;
  updateLightbox();
  lightboxOverlay.hidden = false;
}

function updateLightbox() {
  lightboxImg.src = lightboxImages[lightboxIndex];
  lightboxCounter.textContent = `${lightboxIndex + 1} / ${lightboxImages.length}`;
  btnLightboxPrev.hidden = lightboxIndex === 0;
  btnLightboxNext.hidden = lightboxIndex === lightboxImages.length - 1;
}

function closeLightbox() {
  lightboxOverlay.hidden = true;
  lightboxImg.src = "";
}

btnLightboxClose.addEventListener("click", closeLightbox);
btnLightboxPrev.addEventListener("click", () => {
  if (lightboxIndex > 0) { lightboxIndex--; updateLightbox(); }
});
btnLightboxNext.addEventListener("click", () => {
  if (lightboxIndex < lightboxImages.length - 1) { lightboxIndex++; updateLightbox(); }
});
lightboxOverlay.addEventListener("click", e => {
  if (e.target === lightboxOverlay) closeLightbox();
});
document.addEventListener("keydown", e => {
  if (!lightboxOverlay.hidden) {
    if (e.key === "ArrowLeft" && lightboxIndex > 0) { lightboxIndex--; updateLightbox(); }
    if (e.key === "ArrowRight" && lightboxIndex < lightboxImages.length - 1) { lightboxIndex++; updateLightbox(); }
    if (e.key === "Escape") closeLightbox();
  }
});

btnGalleryClose.addEventListener("click", closeGallery);
galleryOverlay.addEventListener("click", e => {
  if (e.target === galleryOverlay) closeGallery();
});

// ===== TOAST =====
let toastTimer = null;
function showToast(message) {
  toastEl.textContent = message;
  toastEl.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastEl.hidden = true; }, 2200);
}

async function copyToClipboard(text, successMessage) {
  try {
    await navigator.clipboard.writeText(text);
    showToast(successMessage || "Đã sao chép");
  } catch {
    showToast("Không sao chép được — hãy chọn và copy tay");
  }
}

// ===== MODAL THÊM / SỬA =====
function renderImageGrid() {
  imgGrid.innerHTML = currentImages
    .map((src, i) => `
      <div class="imggrid__item" data-index="${i}">
        <img src="${src}" alt="Ảnh skin ${i + 1}" />
        <button type="button" class="imggrid__remove" aria-label="Xoá ảnh này">✕</button>
      </div>
    `)
    .join("");

  imgGrid.querySelectorAll(".imggrid__remove").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      const item = btn.closest(".imggrid__item");
      const index = Number(item.dataset.index);
      currentImages.splice(index, 1);
      renderImageGrid();
    });
  });
}

function resetImagePicker() {
  currentImages = [];
  renderImageGrid();
}

function openAddModal() {
  modalTitle.textContent = "Thêm acc mới";
  accIdField.value = "";
  fUsername.value = "";
  fPassword.value = "";
  fRank.value = "";
  fStatus.value = "";
  fNote.value = "";
  btnDelete.hidden = true;
  resetImagePicker();
  fPassword.type = "password";
  togglePw.textContent = "👁";
  modalOverlay.hidden = false;
  setTimeout(() => fUsername.focus(), 50);
}

function openEditModal(id) {
  const a = accounts.find(x => x.id === id);
  if (!a) return;
  modalTitle.textContent = "Sửa acc";
  accIdField.value = a.id;
  fUsername.value = a.username;
  fPassword.value = a.password;
  fRank.value = a.rank || "";
  fStatus.value = a.status || "";
  fNote.value = a.note || "";
  btnDelete.hidden = false;
  currentImages = [...(a.images || [])];
  fImageFile.value = "";
  renderImageGrid();
  fPassword.type = "password";
  togglePw.textContent = "👁";
  modalOverlay.hidden = false;
  setTimeout(() => fUsername.focus(), 50);
}

function closeModal() {
  modalOverlay.hidden = true;
}

btnAdd.addEventListener("click", openAddModal);
btnClose.addEventListener("click", closeModal);
btnCancel.addEventListener("click", closeModal);
modalOverlay.addEventListener("click", e => {
  if (e.target === modalOverlay) closeModal();
});

togglePw.addEventListener("click", () => {
  const showing = fPassword.type === "text";
  fPassword.type = showing ? "password" : "text";
  togglePw.textContent = showing ? "👁" : "🙈";
});

const btnPickFallback = document.getElementById("btnPickFallback");
if (btnPickFallback) {
  btnPickFallback.addEventListener("click", () => {
    fImageFile.value = "";
    fImageFile.click();
  });
}

fImageFile.addEventListener("change", () => {
  const files = Array.from(fImageFile.files || []);
  if (!files.length) return;
  let oversizedCount = 0;
  files.forEach(file => {
    if (file.size > MAX_IMAGE_BYTES) { oversizedCount++; return; }
    const reader = new FileReader();
    reader.onload = () => {
      currentImages.push(reader.result);
      renderImageGrid();
    };
    reader.onerror = () => showToast("Không đọc được một ảnh, thử ảnh khác");
    reader.readAsDataURL(file);
  });
  if (oversizedCount > 0) showToast(`${oversizedCount} ảnh quá lớn (tối đa ~4MB) đã bị bỏ qua`);
});

// ===== SUBMIT: LƯU ACC =====
accForm.addEventListener("submit", async e => {
  e.preventDefault();

  const username = fUsername.value.trim();
  const password = fPassword.value.trim();
  if (!username || !password) {
    showToast("Cần nhập đủ tài khoản và mật khẩu");
    return;
  }

  const submitBtn = accForm.querySelector('[type="submit"]');
  submitBtn.textContent = "⏳ Đang upload...";
  submitBtn.disabled = true;

  try {
    // Upload ảnh mới lên Cloudinary, giữ nguyên link cũ
    const uploadedImages = await uploadNhieuAnh(currentImages);

    const id = accIdField.value;
    const payload = {
      username,
      password,
      rank: fRank.value.trim(),
      status: fStatus.value.trim(),
      note: fNote.value.trim(),
      images: uploadedImages
    };

    if (id) {
      accounts = accounts.map(a => a.id === id ? { ...a, ...payload } : a);
      showToast("Đã lưu thay đổi ✅");
    } else {
      accounts.push({ id: genId(), ...payload });
      showToast("Đã thêm acc mới ✅");
    }

    await luuDuLieu(accounts);
    closeModal();
    render();
  } catch (err) {
    console.error(err);
    showToast("❌ Lỗi kết nối, thử lại nhé!");
  } finally {
    submitBtn.textContent = "Lưu";
    submitBtn.disabled = false;
  }
});

// ===== XOÁ ACC =====
btnDelete.addEventListener("click", () => {
  pendingDeleteId = accIdField.value;
  if (!pendingDeleteId) return;
  closeModal();
  confirmOverlay.hidden = false;
});

confirmCancel.addEventListener("click", () => {
  pendingDeleteId = null;
  confirmOverlay.hidden = true;
});

confirmOverlay.addEventListener("click", e => {
  if (e.target === confirmOverlay) {
    pendingDeleteId = null;
    confirmOverlay.hidden = true;
  }
});

confirmOk.addEventListener("click", async () => {
  if (!pendingDeleteId) return;
  accounts = accounts.filter(a => a.id !== pendingDeleteId);
  try {
    await luuDuLieu(accounts);
    showToast("Đã xoá acc");
  } catch {
    showToast("❌ Lỗi khi xoá, thử lại!");
  }
  pendingDeleteId = null;
  confirmOverlay.hidden = true;
  render();
});

// ===== TÌM KIẾM =====
searchBox.addEventListener("input", () => {
  searchTerm = searchBox.value;
  render();
});

// ===== KHỞI ĐỘNG =====
(async () => {
  setLoading(true);
  try {
    accounts = await layDuLieu();
  } catch (err) {
    console.error(err);
    showToast("❌ Không tải được dữ liệu!");
    accounts = [];
  }
  render();
})();
