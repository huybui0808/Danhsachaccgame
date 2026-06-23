// =====================================================
// Kho Acc Liên Quân — Bản gốc tích hợp bảo mật Telegram
// =====================================================

// ===== CẤU HÌNH ĐĂNG NHẬP TELEGRAM (CHỈ THÊM PHẦN NÀY) =====
const TELEGRAM_BOT_TOKEN = "8579197602:AAGahqeXMm_pr48XMGHsKcIckc1wUu_QXI8";
const TELEGRAM_CHAT_ID = "6091315052";
const OTP_TTL_MS = 5 * 60 * 1000; 
const SESSION_KEY = "lq_session_v1";

let currentOtp = null;
let otpExpiresAt = 0;
let otpCooldownTimer = null;
let checkApprovalInterval = null; 

const loginScreen = document.getElementById("loginScreen");
const loginStep1 = document.getElementById("loginStep1");
const loginStep2 = document.getElementById("loginStep2");
const btnSendOtp = document.getElementById("btnSendOtp");
const btnVerifyOtp = document.getElementById("btnVerifyOtp");
const btnResendOtp = document.getElementById("btnResendOtp");
const otpInput = document.getElementById("otpInput");
const loginMsg1 = document.getElementById("loginMsg1");
const loginMsg2 = document.getElementById("loginMsg2");
const appHeaderEl = document.getElementById("appHeader");
const appMainEl = document.getElementById("appMain");

function setLoginMsg(el, text, kind) {
  el.textContent = text;
  el.className = "login__msg" + (kind ? ` login__msg--${kind}` : "");
}

async function sendOtpViaTelegram() {
  currentOtp = String(Math.floor(100000 + Math.random() * 900000));
  otpExpiresAt = Date.now() + OTP_TTL_MS;

  const text = `🚨 Có yêu cầu đăng nhập mới vào Kho Acc Liên Quân từ máy của bạn!\n\nHãy bấm nút bên dưới để xử lý nhanh:`;
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

  const reply_markup = {
    inline_keyboard: [
      [
        { text: "✅ Cho phép đăng nhập", callback_data: `approve_${currentOtp}` },
        { text: "❌ Từ chối", callback_data: `deny_${currentOtp}` }
      ]
    ]
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text, reply_markup }),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.description || "Gửi yêu cầu thất bại");
    return true;
  } catch (err) {
    console.error(err);
    setLoginMsg(loginMsg1, `❌ Không gửi được yêu cầu: ${err.message}`, "error");
    return false;
  }
}

function startResendCooldown(seconds) {
  let remaining = seconds;
  btnResendOtp.disabled = true;
  btnResendOtp.textContent = `Gửi lại yêu cầu (${remaining}s)`;
  clearInterval(otpCooldownTimer);
  otpCooldownTimer = setInterval(() => {
    remaining--;
    if (remaining <= 0) {
      clearInterval(otpCooldownTimer);
      btnResendOtp.disabled = false;
      btnResendOtp.textContent = "Gửi lại yêu cầu";
    } else {
      btnResendOtp.textContent = `Gửi lại yêu cầu (${remaining}s)`;
    }
  }, 1000);
}

btnSendOtp.addEventListener("click", async () => {
  btnSendOtp.disabled = true;
  btnSendOtp.textContent = "⏳ Đang gửi yêu cầu...";
  setLoginMsg(loginMsg1, "");

  const ok = await sendOtpViaTelegram();

  btnSendOtp.disabled = false;
  btnSendOtp.textContent = "Gửi yêu cầu qua Telegram";

  if (ok) {
    loginStep1.hidden = true;
    loginStep2.hidden = false;
    
    if (otpInput) otpInput.style.display = "none";
    if (btnVerifyOtp) btnVerifyOtp.style.display = "none";
    
    setLoginMsg(loginMsg2, "🔔 Đã gửi yêu cầu phê duyệt! Hãy mở Telegram và bấm [Cho phép đăng nhập].", "ok");
    startResendCooldown(30);

    clearInterval(checkApprovalInterval);
    checkApprovalInterval = setInterval(async () => {
      try {
        const res = await fetch(`https://dry-term-6e83.buitrunghuy20082.workers.dev/check-status?session=${currentOtp}`);
        const statusData = await res.json();
        
        if (statusData.approved === true) {
          clearInterval(checkApprovalInterval);
          sessionStorage.setItem(SESSION_KEY, "1");
          currentOtp = null;
          unlockApp(); 
        } else if (statusData.approved === false) {
          clearInterval(checkApprovalInterval);
          setLoginMsg(loginMsg2, "❌ Yêu cầu đăng nhập của bạn đã bị từ chối.", "error");
          loginStep1.hidden = false;
          loginStep2.hidden = true;
        }
      } catch (err) {
        console.error("Lỗi kiểm tra trạng thái:", err);
      }
    }, 2000); 
  }
});

btnResendOtp.addEventListener("click", async () => {
  setLoginMsg(loginMsg2, "⏳ Đang gửi lại...");
  const ok = await sendOtpViaTelegram();
  if (ok) {
    setLoginMsg(loginMsg2, "Đã gửi lại yêu cầu mới, kiểm tra Telegram.", "ok");
    startResendCooldown(30);
  } else {
    setLoginMsg(loginMsg2, "❌ Gửi lại thất bại, thử lại.", "error");
  }
});

function unlockApp() {
  loginScreen.hidden = true;
  appHeaderEl.hidden = false;
  appMainEl.hidden = false;
  if (typeof initAppData === "function") initAppData();
}

function checkExistingSession() {
  if (sessionStorage.getItem(SESSION_KEY) === "1") unlockApp();
}
checkExistingSession();


// ===== GIỮ NGUYÊN TOÀN BỘ CẤU TRÚC GỐC BAN ĐẦU CỦA BẠN =====
const BIN_ID = "6a3aababf5f4af5e2923fe57";
const API_KEY = "$2a$10$nQb8E2FsCr2IFBogT76xee7Obj2dzRiVQKxV9NEB4Qt6GDYxMfeve";
const API_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;
const CLOUD_NAME = "dbmutd7dy";
const UPLOAD_PRESET = "Luuacclq";
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

async function layDuLieu() {
  const res = await fetch(API_URL + "/latest", { headers: { "X-Master-Key": API_KEY } });
  if (!res.ok) throw new Error(`Không tải được dữ liệu`);
  const json = await res.json();
  const record = json.record || {};
  const data = record.lq_accounts || [];
  return data.map(a => ({ ...a, images: Array.isArray(a.images) ? a.images : a.image ? [a.image] : [] }));
}

async function luuDuLieu(data) {
  await fetch(API_URL, {
    method: "PUT",
    headers: { "Content-Type": "application/json", "X-Master-Key": API_KEY },
    body: JSON.stringify({ lq_accounts: data })
  });
}

async function uploadAnhCloudinary(dataUrl) {
  const blob = await (await fetch(dataUrl)).blob();
  const formData = new FormData();
  formData.append("file", blob);
  formData.append("upload_preset", UPLOAD_PRESET);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: "POST", body: formData });
  const data = await res.json();
  return data.secure_url;
}

async function uploadNhieuAnh(images) {
  const results = [];
  for (const src of images) {
    if (src.startsWith("http")) results.push(src);
    else results.push(await uploadAnhCloudinary(src));
  }
  return results;
}

function genId() { return "acc_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8); }
function escapeHtml(str) { return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

let accounts = [];
let searchTerm = "";
let pendingDeleteId = null;
let currentImages = [];

// Gallery / Lightbox variables
let currentGalleryImages = [];
let currentLightboxIndex = 0;

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

function setLoading(on) { if (on) { grid.innerHTML = `<p style="color:#888;text-align:center;padding:40px;grid-column:1/-1;">⏳ Đang tải dữ liệu...</p>`; emptyState.hidden = true; } }

function render() {
  const term = searchTerm.trim().toLowerCase();
  const filtered = term ? accounts.filter(a => a.username.toLowerCase().includes(term)) : accounts;
  countLabel.textContent = `${accounts.length} acc`;
  if (accounts.length === 0 || filtered.length === 0) { grid.innerHTML = ""; emptyState.hidden = false; return; }
  emptyState.hidden = true;
  grid.innerHTML = filtered.map(cardTemplate).join("");
}

function cardTemplate(a) {
  const images = a.images || [];
  const imgHtml = images.length ? `<div class="card__imgwrap"><img class="card__img" src="${images[0]}" /><hr></div>` : "";
  return `
    <article class="card" data-id="${a.id}">
      ${imgHtml}
      <div class="card__top"><span class="card__rank">${escapeHtml(a.rank || "Chưa rõ")}</span><button class="card__edit">✏️</button></div>
      <div class="card__row"><span class="card__row-label">Tài khoản</span><div class="card__pw"><span>${escapeHtml(a.username)}</span><button class="copybtn copybtn--user">⧉</button></div></div>
      <div class="card__row"><span class="card__row-label">Mật khẩu</span><div class="card__pw"><span>${escapeHtml(a.password)}</span><button class="copybtn copybtn--pass">⧉</button></div></div>
      ${a.status ? `<div class="card__status">${escapeHtml(a.status)}</div>` : ""}
    </article>
  `;
}

// Xử lý sự kiện bấm trên Card bao gồm copy, sửa acc và XEM ẢNH GỐC BAN ĐẦU
grid.addEventListener("click", e => {
  const card = e.target.closest(".card");
  if (!card) return;
  
  if (e.target.closest(".card__edit")) openEditModal(card.dataset.id);
  
  if (e.target.closest(".card__img")) {
    const a = accounts.find(x => x.id === card.dataset.id);
    if (a && a.images && a.images.length > 0) {
      currentGalleryImages = a.images;
      openGallery(a.username || "Xem ảnh");
    }
  }
  
  if (e.target.closest(".copybtn--user")) { 
    const a = accounts.find(x => x.id === card.dataset.id); 
    navigator.clipboard.writeText(a.username); 
    showToast("Đã copy tài khoản!"); 
  }
  if (e.target.closest(".copybtn--pass")) { 
    const a = accounts.find(x => x.id === card.dataset.id); 
    navigator.clipboard.writeText(a.password); 
    showToast("Đã copy mật khẩu!"); 
  }
});

function showToast(m) { toastEl.textContent = m; toastEl.hidden = false; setTimeout(() => toastEl.hidden = true, 2000); }
function openAddModal() { modalTitle.textContent = "Thêm acc mới"; accIdField.value = ""; fUsername.value = ""; fPassword.value = ""; fRank.value = ""; fStatus.value = ""; fNote.value = ""; btnDelete.hidden = true; currentImages = []; imgGrid.innerHTML = ""; modalOverlay.hidden = false; }
function openEditModal(id) { const a = accounts.find(x => x.id === id); modalTitle.textContent = "Sửa acc"; accIdField.value = a.id; fUsername.value = a.username; fPassword.value = a.password; fRank.value = a.rank || ""; fStatus.value = a.status || ""; fNote.value = a.note || ""; btnDelete.hidden = false; currentImages = [...(a.images || [])]; hienThiAnhTrongModal(); modalOverlay.hidden = false; }
function closeModal() { modalOverlay.hidden = true; }
btnAdd.addEventListener("click", openAddModal);
btnClose.addEventListener("click", closeModal);
btnCancel.addEventListener("click", closeModal);

// Đọc và xử lý file ảnh khi thêm/sửa
fImageFile.addEventListener("change", e => {
  const files = Array.from(e.target.files);
  files.forEach(file => {
    if (file.size > MAX_IMAGE_BYTES) { alert(`File ${file.name} quá lớn (Max 4MB)`); return; }
    const reader = new FileReader();
    reader.onload = ev => { currentImages.push(ev.target.result); hienThiAnhTrongModal(); };
    reader.readAsDataURL(file);
  });
  fImageFile.value = "";
});

function hienThiAnhTrongModal() {
  imgGrid.innerHTML = currentImages.map((src, idx) => `
    <div class="img-thumb" data-index="${idx}">
      <img src="${src}" />
      <button type="button" class="img-thumb__del">×</button>
    </div>
  `).join("");
}

imgGrid.addEventListener("click", e => {
  const delBtn = e.target.closest(".img-thumb__del");
  if (!delBtn) return;
  const idx = parseInt(delBtn.closest(".img-thumb").dataset.index, 10);
  currentImages.splice(idx, 1);
  hienThiAnhTrongModal();
});

accForm.addEventListener("submit", async e => {
  e.preventDefault();
  const id = accIdField.value;
  setLoading(true);
  try {
    const uploadedUrls = await uploadNhieuAnh(currentImages);
    const payload = { username: fUsername.value.trim(), password: fPassword.value.trim(), rank: fRank.value.trim(), status: fStatus.value.trim(), note: fNote.value.trim(), images: uploadedUrls };
    if (id) accounts = accounts.map(a => a.id === id ? { ...a, ...payload } : a);
    else accounts.push({ id: genId(), ...payload });
    await luuDuLieu(accounts);
    closeModal();
  } catch (err) { alert(err.message); }
  render();
});

// Xóa tài khoản
btnDelete.addEventListener("click", () => { pendingDeleteId = accIdField.value; if (pendingDeleteId) confirmOverlay.hidden = false; });
confirmCancel.addEventListener("click", () => { confirmOverlay.hidden = true; pendingDeleteId = null; });
confirmOk.addEventListener("click", async () => {
  if (pendingDeleteId) {
    setLoading(true);
    accounts = accounts.filter(a => a.id !== pendingDeleteId);
    try { await luuDuLieu(accounts); } catch (err) { alert(err.message); }
    confirmOverlay.hidden = true;
    closeModal();
    pendingDeleteId = null;
    render();
  }
});

// Tìm kiếm tài khoản
searchBox.addEventListener("input", e => { searchTerm = e.target.value; render(); });

// Ẩn / hiện mật khẩu trong Form
togglePw.addEventListener("click", () => { fPassword.type = fPassword.type === "password" ? "text" : "password"; });

// ===== CÁC HÀM XỬ LÝ BỘ SƯU TẬP ẢNH GỐC BAN ĐẦU =====
function openGallery(title) {
  if (!galleryOverlay || !galleryGrid || !galleryTitle) return;
  galleryTitle.textContent = title;
  galleryGrid.innerHTML = currentGalleryImages.map((src, idx) => `
    <div class="gallery__item" data-index="${idx}">
      <img src="${src}" class="gallery__img" />
    </div>
  `).join("");
  galleryOverlay.hidden = false;
}

if (galleryGrid) {
  galleryGrid.addEventListener("click", e => {
    const item = e.target.closest(".gallery__item");
    if (!item) return;
    currentLightboxIndex = parseInt(item.dataset.index, 10);
    openLightbox();
  });
}

function openLightbox() {
  if (!lightboxOverlay || !lightboxImg || !lightboxCounter) return;
  lightboxImg.src = currentGalleryImages[currentLightboxIndex];
  lightboxCounter.textContent = `${currentLightboxIndex + 1} / ${currentGalleryImages.length}`;
  lightboxOverlay.hidden = false;
}

if (btnGalleryClose) btnGalleryClose.addEventListener("click", () => galleryOverlay.hidden = true);
if (btnLightboxClose) btnLightboxClose.addEventListener("click", () => lightboxOverlay.hidden = true);

if (btnLightboxPrev) {
  btnLightboxPrev.addEventListener("click", () => {
    if (currentGalleryImages.length <= 1) return;
    currentLightboxIndex = (currentLightboxIndex - 1 + currentGalleryImages.length) % currentGalleryImages.length;
    openLightbox();
  });
}

if (btnLightboxNext) {
  btnLightboxNext.addEventListener("click", () => {
    if (currentGalleryImages.length <= 1) return;
    currentLightboxIndex = (currentLightboxIndex + 1) % currentGalleryImages.length;
    openLightbox();
  });
}

// Khởi tạo ứng dụng sau khi đã qua bước duyệt bảo mật
let appDataInitialized = false;
async function initAppData() {
  if (appDataInitialized) return;
  appDataInitialized = true;
  setLoading(true);
  try { accounts = await layDuLieu(); } catch { accounts = []; }
  render();
}
