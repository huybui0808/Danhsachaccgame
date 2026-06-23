// =====================================================
// Kho Acc Liên Quân — logic lưu trữ + thao tác trên web
// Dữ liệu được lưu trong localStorage của trình duyệt
// (chỉ tồn tại trên máy/trình duyệt đang dùng)
// =====================================================

const STORAGE_KEY = "lq_accounts_v1";

/** @typedef {{id:string, username:string, password:string, rank:string, status:string, note:string, image:string|null}} Account */

// ---------- Helpers lưu trữ ----------

/** @returns {Account[]} */
function loadAccounts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedAccounts();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : seedAccounts();
  } catch (err) {
    console.error("Không đọc được dữ liệu acc:", err);
    return seedAccounts();
  }
}

/** Dữ liệu mẫu hiển thị lần đầu mở trang (khi chưa lưu gì) */
function seedAccounts() {
  return [
    {
      id: genId(),
      username: "ghosttrip123",
      password: "QC@1312dom04",
      rank: "",
      status: "Bị cấm chơi hết hạn vào 23 giờ 20 phút, ngày 24 tháng 6",
      note: "",
      image: null,
    },
    {
      id: genId(),
      username: "nhatthien101998",
      password: "thien1998",
      rank: "",
      status: "Bị cấm chơi hết hạn vào 23 giờ 20 phút, ngày 24 tháng 6",
      note: "",
      image: null,
    },
  ];
}

/** @param {Account[]} accounts */
function saveAccounts(accounts) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
    return true;
  } catch (err) {
    console.error("Không lưu được dữ liệu acc:", err);
    showToast("Lưu thất bại — bộ nhớ trình duyệt có thể đã đầy.");
    return false;
  }
}

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

// ---------- Trạng thái app ----------

let accounts = loadAccounts();
let searchTerm = "";
let pendingDeleteId = null;
let currentImageData = null; // base64 ảnh đang chọn trong form

// ---------- DOM refs ----------

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
const imgPreview = document.getElementById("imgPreview");
const imgPlaceholder = document.getElementById("imgPlaceholder");
const btnRemoveImg = document.getElementById("btnRemoveImg");

const btnAdd = document.getElementById("btnAdd");
const btnClose = document.getElementById("btnClose");
const btnCancel = document.getElementById("btnCancel");
const btnDelete = document.getElementById("btnDelete");
const togglePw = document.getElementById("togglePw");

const confirmOverlay = document.getElementById("confirmOverlay");
const confirmOk = document.getElementById("confirmOk");
const confirmCancel = document.getElementById("confirmCancel");

const toastEl = document.getElementById("toast");

// ---------- Render ----------

function render() {
  const term = searchTerm.trim().toLowerCase();
  const filtered = term
    ? accounts.filter((a) => a.username.toLowerCase().includes(term))
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

  // gắn lại event listeners cho từng card vừa render
  filtered.forEach((a) => {
    const card = grid.querySelector(`[data-id="${a.id}"]`);
    if (!card) return;
    card.querySelector(".card__edit").addEventListener("click", () => openEditModal(a.id));
    const copyUserBtn = card.querySelector(".copybtn--user");
    if (copyUserBtn) {
      copyUserBtn.addEventListener("click", () => copyToClipboard(a.username, "Đã sao chép tài khoản"));
    }
    const copyPassBtn = card.querySelector(".copybtn--pass");
    if (copyPassBtn) {
      copyPassBtn.addEventListener("click", () => copyToClipboard(a.password, "Đã sao chép mật khẩu"));
    }
  });
}

function cardTemplate(a) {
  const isBanned = /cấm|ban|khóa|cam|khoa/i.test(a.status || "");
  const imgHtml = a.image
    ? `<img class="card__img" src="${a.image}" alt="Ảnh nhân vật ${escapeHtml(a.username)}" />`
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

      ${
        a.status
          ? `<div class="card__status ${isBanned ? "card__status--banned" : ""}">${escapeHtml(a.status)}</div>`
          : ""
      }

      ${a.note ? `<div class="card__note">${escapeHtml(a.note)}</div>` : ""}
    </article>
  `;
}

// ---------- Toast ----------

let toastTimer = null;
function showToast(message) {
  toastEl.textContent = message;
  toastEl.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.hidden = true;
  }, 2200);
}

async function copyToClipboard(text, successMessage) {
  try {
    await navigator.clipboard.writeText(text);
    showToast(successMessage || "Đã sao chép");
  } catch {
    showToast("Không sao chép được — hãy chọn và copy tay");
  }
}

// ---------- Modal: thêm / sửa ----------

function resetImagePicker() {
  currentImageData = null;
  imgPreview.hidden = true;
  imgPreview.src = "";
  imgPlaceholder.hidden = false;
  btnRemoveImg.hidden = true;
  fImageFile.value = "";
}

function setImagePicker(dataUrl) {
  currentImageData = dataUrl;
  imgPreview.src = dataUrl;
  imgPreview.hidden = false;
  imgPlaceholder.hidden = true;
  btnRemoveImg.hidden = false;
}

function openAddModal() {
  modalTitle.textContent = "Thêm acc mới";
  accForm.reset();
  accIdField.value = "";
  btnDelete.hidden = true;
  resetImagePicker();
  fPassword.type = "password";
  togglePw.textContent = "👁";
  modalOverlay.hidden = false;
  setTimeout(() => fUsername.focus(), 50);
}

function openEditModal(id) {
  const a = accounts.find((x) => x.id === id);
  if (!a) return;
  modalTitle.textContent = "Sửa acc";
  accIdField.value = a.id;
  fUsername.value = a.username;
  fPassword.value = a.password;
  fRank.value = a.rank || "";
  fStatus.value = a.status || "";
  fNote.value = a.note || "";
  btnDelete.hidden = false;
  if (a.image) {
    setImagePicker(a.image);
  } else {
    resetImagePicker();
  }
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
modalOverlay.addEventListener("click", (e) => {
  if (e.target === modalOverlay) closeModal();
});

togglePw.addEventListener("click", () => {
  const showing = fPassword.type === "text";
  fPassword.type = showing ? "password" : "text";
  togglePw.textContent = showing ? "👁" : "🙈";
});

// chọn ảnh
imgPick.addEventListener("click", () => fImageFile.click());

fImageFile.addEventListener("change", () => {
  const file = fImageFile.files && fImageFile.files[0];
  if (!file) return;

  if (file.size > 4 * 1024 * 1024) {
    showToast("Ảnh quá lớn (tối đa ~4MB)");
    fImageFile.value = "";
    return;
  }

  const reader = new FileReader();
  reader.onload = () => setImagePicker(reader.result);
  reader.onerror = () => showToast("Không đọc được ảnh, thử ảnh khác");
  reader.readAsDataURL(file);
});

btnRemoveImg.addEventListener("click", (e) => {
  e.stopPropagation();
  resetImagePicker();
});

// submit thêm / sửa
accForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const username = fUsername.value.trim();
  const password = fPassword.value.trim();

  if (!username || !password) {
    showToast("Cần nhập đủ tài khoản và mật khẩu");
    return;
  }

  const id = accIdField.value;
  const payload = {
    username,
    password,
    rank: fRank.value.trim(),
    status: fStatus.value.trim(),
    note: fNote.value.trim(),
    image: currentImageData || null,
  };

  if (id) {
    accounts = accounts.map((a) => (a.id === id ? { ...a, ...payload } : a));
    showToast("Đã lưu thay đổi");
  } else {
    accounts.push({ id: genId(), ...payload });
    showToast("Đã thêm acc mới");
  }

  saveAccounts(accounts);
  closeModal();
  render();
});

// ---------- Xoá acc ----------

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

confirmOverlay.addEventListener("click", (e) => {
  if (e.target === confirmOverlay) {
    pendingDeleteId = null;
    confirmOverlay.hidden = true;
  }
});

confirmOk.addEventListener("click", () => {
  if (!pendingDeleteId) return;
  accounts = accounts.filter((a) => a.id !== pendingDeleteId);
  saveAccounts(accounts);
  pendingDeleteId = null;
  confirmOverlay.hidden = true;
  showToast("Đã xoá acc");
  render();
});

// ---------- Tìm kiếm ----------

searchBox.addEventListener("input", () => {
  searchTerm = searchBox.value;
  render();
});

// ---------- Khởi động ----------

render();
