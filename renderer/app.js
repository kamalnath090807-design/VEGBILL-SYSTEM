/* ═══════════════════════════════════════════════════════════════
   VEGBILL PRO — app.js  v9 (FULL UPGRADE)
   STEP 1: Mobile-first responsiveness hooks
   STEP 2: Multi-select delete (history + shops)
   STEP 3: Clear All floating button (bottom-right, confirmation)
   STEP 4: Neon mouse-parallax background motion
   STEP 5: Qty increment bug fix (debounced, no double-trigger)
   ═══════════════════════════════════════════════════════════════ */
'use strict';

const $  = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

function fmt(n) {
  return '₹ ' + (+n||0).toLocaleString('en-IN',
    { minimumFractionDigits:2, maximumFractionDigits:2 });
}
function fmtDate(d) {
  if (!d) return '';
  return new Date(d+'T00:00:00').toLocaleDateString('en-IN',
    { weekday:'short', day:'numeric', month:'short', year:'numeric' });
}
const todayStr = () => new Date().toISOString().slice(0,10);
const timeStr  = () => new Date().toLocaleTimeString('en-IN',
    { hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:true });
function esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;')
                      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

async function ipc(fn, ...args) {
  const res = await fn(...args);
  if (res && res.ok === false) throw new Error(res.error || 'Unknown error');
  return res?.data !== undefined ? res.data : res;
}

/* ════════════════════════════════════════════════════════════
   THE TYPING FIX
   ════════════════════════════════════════════════════════════ */
function refocusApp(targetSelector) {
  const prev = document.activeElement;
  if (prev && prev !== document.body) prev.blur();
  document.body.tabIndex = -1;
  document.body.focus();
  try { window.api.refocus(); } catch(_) {}
  requestAnimationFrame(() => {
    setTimeout(() => {
      const target = targetSelector ? $(targetSelector) : null;
      if (target) { target.style.pointerEvents = 'auto'; target.focus(); }
      document.body.tabIndex = '';
    }, 60);
  });
}

/* ════════════════════════════════════════════════════════════
   STEP 4 — NEON MOUSE PARALLAX BACKGROUND
   Lightweight: CSS transform only, no repaints
   ════════════════════════════════════════════════════════════ */
function setupMouseParallax() {
  const orbs = $$('.orb');
  const factors = [0.018, -0.025, 0.012, -0.015]; // each orb moves at different speed
  let lastX = 0, lastY = 0, rafId = null;

  document.addEventListener('mousemove', e => {
    const cx = window.innerWidth  / 2;
    const cy = window.innerHeight / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;

    // Throttle with rAF
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      rafId = null;
      orbs.forEach((orb, i) => {
        const f = factors[i] || 0.01;
        const tx = dx * f;
        const ty = dy * f;
        orb.style.transform = `translate(${tx}px, ${ty}px)`;
      });
      lastX = dx; lastY = dy;
    });
  });
}

/* ════════════════════════════════════════════════════════════
   TAMIL PRODUCT NAMES
   ════════════════════════════════════════════════════════════ */
const TA = {
  'Tomato':'தக்காளி','Onion':'வெங்காயம்','Potato':'உருளைக்கிழங்கு',
  'Green Chilli':'பச்சை மிளகாய்','Coriander':'கொத்தமல்லி',
  'Curry Leaves':'கறிவேப்பிலை','Beans':'பீன்ஸ்','Carrot':'கேரட்',
  'Brinjal':'கத்திரிக்காய்','Lady Finger':'வெண்டைக்காய்',
  'Cabbage':'முட்டைக்கோஸ்','Cauliflower':'காலிஃப்ளவர்',
  'Drumstick':'முருங்கைக்காய்','Bitter Gourd':'பாவக்காய்',
  'Garlic':'பூண்டு','Ginger':'இஞ்சி','Spinach':'கீரை',
  'Bottle Gourd':'சுரைக்காய்','Ridge Gourd':'பீர்க்கங்காய்',
  'Snake Gourd':'புடலங்காய்','Peas':'பட்டாணி',
  'Raw Banana':'வாழைக்காய்','Banana Flower':'வாழைப்பூ',
  'Beetroot':'பீட்ரூட்','Radish':'முள்ளங்கி',
  'Colocasia':'சேப்பங்கிழங்கு','Yam':'காராமணி கிழங்கு',
  'Spring Onion':'வசந்த வெங்காயம்','Mint':'புதினா','Turnip':'டர்னிப்',
};
function getTa(n) { return TA[n] || ''; }

const USAGE_ORDER = [
  'Tomato','Onion','Potato','Green Chilli','Coriander','Curry Leaves',
  'Beans','Carrot','Brinjal','Lady Finger','Cabbage','Cauliflower',
  'Drumstick','Bitter Gourd','Garlic','Ginger','Spinach',
  'Bottle Gourd','Ridge Gourd','Snake Gourd','Peas',
  'Raw Banana','Banana Flower','Beetroot','Radish',
  'Colocasia','Yam','Spring Onion','Mint','Turnip',
];
function usageIdx(name) {
  const i = USAGE_ORDER.indexOf(name);
  return i === -1 ? 999 : i;
}

/* ════════════════════════════════════════════════════════════
   TRANSLATIONS
   ════════════════════════════════════════════════════════════ */
const TR = {
  en:{
    navShops:'Shops',navBilling:'Billing',navHistory:'History',
    navPrices:'Prices',navExport:'Export',
    heroTitle:'Select a <em>Shop</em>',
    heroSub:'Choose a shop to start billing — or create a new one',
    quickBillLabel:'⚡ Quick Bill',quickBillSub:'Bill without a shop',
    cardBill:'🧾 Bill',cardEdit:'✏️ Edit',cardDel:'🗑️',
    addNew:'Add New Shop',addNewSub:'Click to create',
    lblItems:'Items',lblQty:'Qty (kg)',lblReset:'Reset',
    lblSaveBill:'Save Bill',lblNote:'NOTE',
    notePh:'Optional note for this bill…',
    lblFilled:'Items filled:',lblGrand:'Grand Total',
    thProduct:'Product',thQty:'Quantity (kg)',thRate:'Rate / kg',thAmt:'Amount (₹)',
    histTitle:'📋 Bill History',histSearch:'Search shop, date…',
    selectBill:'Select a Bill',selectBillSub:'Click any bill to view details',
    addShop:'🏪 Add New Shop',editShop:'✏️ Edit Shop',
    fShopName:'Shop Name *',fPhone:'Phone Number',
    fAddr:'Address',fMap:'Google Maps Link',
    cancel:'Cancel',addBtn:'➕ Add Shop',saveBtn:'💾 Save Changes',
    shopNamePh:'e.g. Ravi Stores',phonePh:'e.g. 9876543210',
    addrPh:'Street, Area, City',mapPh:'https://maps.google.com/…',
    shopNameReq:'Shop name is required',
    delShop:'Delete Shop?',delConfirm:'Are you sure you want to delete',
    delWarn:"Saved bills won't be removed.",yesDel:'Yes, Delete',
    priceSetup:'💰 Daily Price Setup',editPrices:'✏️ Edit Prices',
    setToday:"🌱 Set Today's Prices",perKg:'Price per kg (₹)',
    useSame:'Use Same Prices',useSameSub:'Continue with last set rates',
    editPriceBtn:'Edit Prices',editPriceSub:"Update today's rates",
    lastFrom:'Last prices from',prevDay:'a previous day',
    today:'Today',clearAll:'Clear All',savePrices:'💾 Save Prices',products:'products',
    expTitle:'📤 Export Bills',expSub:'Export all bills to a file',
    expJson:'JSON',expJsonSub:'Full structured backup',
    expCsv:'CSV',expCsvSub:'Open in Excel / Sheets',
    expPdf:'PDF',expPdfSub:'Print-ready history report',
    tAdded:'added! 🏪',tUpdated:'updated ✅',tDeleted:'deleted',
    tPricesSaved:'Prices saved! 💰',tCarried:'Prices carried forward ⚡',
    tBillSaved:'saved!',tBillDeleted:'Bill deleted',
    tAddItem:'Add at least one item first!',
    tExpJson:'Exported as JSON ✅',tExpCsv:'Exported as CSV ✅',tExpPdf:'PDF exported ✅',
    resetConfirm:'Reset all quantities in this bill?',
    delBillConfirm:'Delete this bill permanently?',
    printBtn:'🖨️ Print',delBtn:'🗑️ Delete',
    billNotFound:'Bill not found',billDeleted:'Bill deleted',
    noPrice:'— (no price)',
    dProduct:'Product',dQty:'Qty',dRate:'Rate',dAmount:'Amount',
    dTotal:'Grand Total',dBill:'Bill',quickBill:'⚡ Quick Bill',
    pinTip:'Pin to top',unpinTip:'Unpin',
  },
  ta:{
    navShops:'கடைகள்',navBilling:'பில்லிங்',navHistory:'வரலாறு',
    navPrices:'விலைகள்',navExport:'ஏற்றுமதி',
    heroTitle:'<em>கடை</em> தேர்ந்தெடு',
    heroSub:'பில்லிங் தொடங்க கடை தேர்வு செய் — அல்லது புதிது சேர்',
    quickBillLabel:'⚡ விரைவு பில்',quickBillSub:'கடை இல்லாமல் பில்',
    cardBill:'🧾 பில்',cardEdit:'✏️ திருத்து',cardDel:'🗑️',
    addNew:'புதிய கடை சேர்',addNewSub:'சொடுக்கி உருவாக்கு',
    lblItems:'பொருட்கள்',lblQty:'எடை (கிகி)',lblReset:'மீட்டமை',
    lblSaveBill:'பில் சேமி',lblNote:'குறிப்பு',
    notePh:'இந்த பில்லுக்கு குறிப்பு…',
    lblFilled:'நிரப்பப்பட்டவை:',lblGrand:'மொத்த தொகை',
    thProduct:'பொருள்',thQty:'அளவு (கிகி)',thRate:'விலை / கிகி',thAmt:'தொகை (₹)',
    histTitle:'📋 பில் வரலாறு',histSearch:'கடை, தேதி தேடு…',
    selectBill:'பில் தேர்ந்தெடு',selectBillSub:'விவரம் காண பட்டியலில் பில்லை சொடுக்கு',
    addShop:'🏪 புதிய கடை சேர்',editShop:'✏️ கடை திருத்து',
    fShopName:'கடை பெயர் *',fPhone:'தொலைபேசி எண்',
    fAddr:'முகவரி',fMap:'கூகுள் வரைபட இணைப்பு',
    cancel:'ரத்து',addBtn:'➕ கடை சேர்',saveBtn:'💾 மாற்றம் சேமி',
    shopNamePh:'எ.கா. ராவி ஸ்டோர்ஸ்',phonePh:'எ.கா. 9876543210',
    addrPh:'தெரு, பகுதி, நகரம்',mapPh:'https://maps.google.com/…',
    shopNameReq:'கடை பெயர் தேவை',
    delShop:'கடை நீக்கவா?',delConfirm:'நீக்க உறுதியா?',
    delWarn:'இந்த கடையின் பில்கள் நீக்கப்படாது.',yesDel:'ஆம், நீக்கு',
    priceSetup:'💰 தினசரி விலை அமைப்பு',editPrices:'✏️ விலைகள் திருத்து',
    setToday:'🌱 இன்றைய விலைகள் அமை',perKg:'கிலோவிற்கு விலை (₹)',
    useSame:'அதே விலை பயன்படுத்து',useSameSub:'கடைசி விலைகளுடன் தொடர்',
    editPriceBtn:'விலைகள் திருத்து',editPriceSub:'இன்றைய விலைகள் புதுப்பி',
    lastFrom:'கடைசி விலைகள்',prevDay:'முந்தைய நாள்',
    today:'இன்று',clearAll:'அனைத்தும் அழி',savePrices:'💾 விலைகள் சேமி',products:'பொருட்கள்',
    expTitle:'📤 பில்கள் ஏற்றுமதி',expSub:'அனைத்து பில்களையும் கோப்பாக சேமி',
    expJson:'JSON',expJsonSub:'முழு காப்பு',
    expCsv:'CSV',expCsvSub:'Excel-ல் திற',
    expPdf:'PDF',expPdfSub:'அச்சிடக்கூடிய வரலாறு',
    tAdded:'சேர்க்கப்பட்டது! 🏪',tUpdated:'புதுப்பிக்கப்பட்டது ✅',tDeleted:'நீக்கப்பட்டது',
    tPricesSaved:'விலைகள் சேமிக்கப்பட்டன! 💰',tCarried:'விலைகள் தொடர்கின்றன ⚡',
    tBillSaved:'சேமிக்கப்பட்டது!',tBillDeleted:'பில் நீக்கப்பட்டது',
    tAddItem:'குறைந்தது ஒரு பொருளாவது சேர்க்கவும்!',
    tExpJson:'JSON-ஆக ஏற்றுமதி ✅',tExpCsv:'CSV-ஆக ஏற்றுமதி ✅',tExpPdf:'PDF ஏற்றுமதி ✅',
    resetConfirm:'இந்த பில்லின் அனைத்து அளவுகளையும் மீட்டமைக்கவா?',
    delBillConfirm:'இந்த பில்லை நிரந்தரமாக நீக்கவா?',
    printBtn:'🖨️ அச்சு',delBtn:'🗑️ நீக்கு',
    billNotFound:'பில் கிடைக்கவில்லை',billDeleted:'பில் நீக்கப்பட்டது',
    noPrice:'— (விலை இல்லை)',
    dProduct:'பொருள்',dQty:'அளவு',dRate:'விலை',dAmount:'தொகை',
    dTotal:'மொத்த தொகை',dBill:'பில்',quickBill:'⚡ விரைவு பில்',
    pinTip:'மேலே நிலைநிறுத்து',unpinTip:'விடு',
  }
};
let lang = 'en';
function T(k) { return TR[lang][k] || TR.en[k] || k; }

/* ════════════════════════════════════════════════════════════
   PINNED PRODUCTS
   ════════════════════════════════════════════════════════════ */
let pinnedIds = [];

function togglePin(id) {
  const idx = pinnedIds.indexOf(id);
  if (idx === -1) pinnedIds.push(id);
  else            pinnedIds.splice(idx, 1);
  renderProductTable();
}

function sortedProducts() {
  const pinned   = pinnedIds.map(id => S.products.find(p => p.id === id)).filter(Boolean);
  const unpinned = S.products
    .filter(p => !pinnedIds.includes(p.id))
    .sort((a,b) => usageIdx(a.name) - usageIdx(b.name));
  return [...pinned, ...unpinned];
}

/* ════════════════════════════════════════════════════════════
   LANG / TRANSLATE
   ════════════════════════════════════════════════════════════ */
function applyLang() {
  const navMap = {
    'nav-shop':'navShops','nav-billing':'navBilling','nav-history':'navHistory',
    'btn-prices':'navPrices','btn-export':'navExport'
  };
  Object.entries(navMap).forEach(([id,key]) => {
    const lbl = $(`#${id} .nav-label`); if (lbl) lbl.textContent = T(key);
  });
  const ht = $('#shop-hero-title'); if (ht) ht.innerHTML  = T('heroTitle');
  const hs = $('#shop-hero-sub');   if (hs) hs.textContent = T('heroSub');
  setTxt('lbl-items',T('lblItems')); setTxt('lbl-qty',T('lblQty'));
  setTxt('lbl-reset',T('lblReset')); setTxt('lbl-save-top',T('lblSaveBill'));
  setTxt('lbl-save-bot',T('lblSaveBill')); setTxt('lbl-note',T('lblNote'));
  setTxt('lbl-grand',T('lblGrand'));
  const fe = $('#lbl-filled');
  if (fe) fe.innerHTML = T('lblFilled')+' <strong id="filled-ct">'+($('#filled-ct')?.textContent||'0')+'</strong>';
  setTxt('th-product',T('thProduct')); setTxt('th-qty',T('thQty'));
  setTxt('th-rate',T('thRate'));       setTxt('th-amt',T('thAmt'));
  setTxt('lbl-hist-title',T('histTitle'));
  setTxt('lbl-select-bill',T('selectBill'));
  setTxt('lbl-select-bill-sub',T('selectBillSub'));
  const hs2 = $('#hist-search'); if (hs2) hs2.placeholder = T('histSearch');
  const bn  = $('#bill-note');   if (bn)  bn.placeholder  = T('notePh');
  $('#lang-en')?.classList.toggle('active', lang==='en');
  $('#lang-ta')?.classList.toggle('active', lang==='ta');
  renderShops();
  if (S.screen==='billing') renderProductTable();
}
function setTxt(id,v){ const e=$(`#${id}`); if(e) e.textContent=v; }

/* ════════════════════════════════════════════════════════════
   STATE
   ════════════════════════════════════════════════════════════ */
const S = { screen:'shop', shop:null, products:[], prices:{}, items:{}, shops:[], bills:[] };

/* ════════════════════════════════════════════════════════════
   STEP 2 — MULTI-SELECT STATE
   ════════════════════════════════════════════════════════════ */
const histSel = {
  selected: new Set(),
  mode: false,

  enter() {
    this.mode = true;
    $$('.hi-check').forEach(c => c.classList.add('visible'));
    $('#hs-bulk-bar')?.classList.add('visible');
    this.updateUI();
  },
  exit() {
    this.mode = false;
    this.selected.clear();
    $$('.hi-check').forEach(c => { c.classList.remove('visible'); c.checked = false; });
    $$('.hi').forEach(h => h.classList.remove('selected'));
    $('#hs-bulk-bar')?.classList.remove('visible');
    $('#hist-check-all').checked = false;
    this.updateUI();
  },
  toggle(id, el) {
    if (this.selected.has(id)) { this.selected.delete(id); el?.classList.remove('selected'); }
    else                        { this.selected.add(id);    el?.classList.add('selected'); }
    // sync checkbox
    const cb = el?.querySelector('.hi-check');
    if (cb) cb.checked = this.selected.has(id);
    this.updateUI();
  },
  updateUI() {
    const n = this.selected.size;
    const info = $('#hs-bulk-info');
    if (info) info.textContent = `${n} bill${n!==1?'s':''} selected`;
    const count = $('#hs-count');
    if (count) count.textContent = S.bills.length ? `${S.bills.length} total` : '';
    // sync select-all checkbox
    const ca = $('#hist-check-all');
    if (ca) {
      const shown = $$('.hi').length;
      ca.checked = shown > 0 && n >= shown;
      ca.indeterminate = n > 0 && n < shown;
    }
  }
};

const shopSel = {
  selected: new Set(),
  mode: false,

  enter() {
    this.mode = true;
    $$('.sc-check-wrap').forEach(w => w.classList.add('visible'));
    $('#shop-select-bar')?.classList.add('visible');
    this.updateUI();
  },
  exit() {
    this.mode = false;
    this.selected.clear();
    $$('.sc-check-wrap').forEach(w => { w.classList.remove('visible'); w.querySelector('input').checked = false; });
    $$('.sc').forEach(c => c.classList.remove('selected'));
    $('#shop-select-bar')?.classList.remove('visible');
    this.updateUI();
  },
  toggle(id, el) {
    if (this.selected.has(id)) { this.selected.delete(id); el?.classList.remove('selected'); }
    else                        { this.selected.add(id);    el?.classList.add('selected'); }
    const cb = el?.querySelector('.sc-checkbox');
    if (cb) cb.checked = this.selected.has(id);
    this.updateUI();
  },
  updateUI() {
    const n = this.selected.size;
    const info = $('#shop-bulk-info');
    if (info) info.textContent = `${n} shop${n!==1?'s':''} selected`;
  }
};

/* ════════════════════════════════════════════════════════════
   TOAST
   ════════════════════════════════════════════════════════════ */
function toast(msg, type='ok', ms=3200) {
  const icons = { ok:'✅', err:'❌', info:'ℹ️' };
  const el = document.createElement('div');
  el.className = `toast t-${type}`;
  el.innerHTML = `<span>${icons[type]||'•'}</span><span>${msg}</span>`;
  $('#toast-wrap').appendChild(el);
  setTimeout(() => {
    el.classList.add('out');
    el.addEventListener('animationend', ()=>el.remove(), { once:true });
  }, ms);
}

/* ════════════════════════════════════════════════════════════
   RIPPLE
   ════════════════════════════════════════════════════════════ */
function ripple(el,e) {
  const rc=el.getBoundingClientRect();
  const x=(e?.clientX??rc.left+rc.width/2)-rc.left;
  const y=(e?.clientY??rc.top+rc.height/2)-rc.top;
  const sp=document.createElement('span');
  sp.className='rip';
  sp.style.cssText=`width:28px;height:28px;left:${x-14}px;top:${y-14}px`;
  el.appendChild(sp);
  sp.addEventListener('animationend',()=>sp.remove(),{once:true});
}

/* ════════════════════════════════════════════════════════════
   INPUT SAFETY
   ════════════════════════════════════════════════════════════ */
function makeInputSafe(inp) {
  if (!inp) return;
  inp.style.pointerEvents    = 'auto';
  inp.style.userSelect       = 'text';
  inp.style.webkitUserSelect = 'text';
  inp.style.webkitAppRegion  = 'no-drag';
  inp.addEventListener('mousedown',   e=>e.stopPropagation());
  inp.addEventListener('pointerdown', e=>e.stopPropagation());
}

/* ════════════════════════════════════════════════════════════
   MODAL
   ════════════════════════════════════════════════════════════ */
let _modals = [];
function openModal(html, opts={}) {
  const bk=document.createElement('div');
  bk.className='mbk';
  bk.innerHTML=`<div class="mo">${html}</div>`;
  document.body.appendChild(bk);
  const mo=bk.querySelector('.mo');
  mo.querySelectorAll('input,textarea,select').forEach(makeInputSafe);
  let closed=false;
  function close() {
    if (closed) return; closed=true;
    _modals=_modals.filter(m=>m.bk!==bk);
    bk.classList.add('out');
    const done=()=>{ bk.parentNode&&bk.remove(); opts.onClose?.(); };
    bk.addEventListener('animationend',done,{once:true});
    setTimeout(done,300);
  }
  if (!opts.persistent) bk.addEventListener('mousedown',e=>{ if(e.target===bk) close(); });
  mo.querySelector('.mo-x')?.addEventListener('click',e=>{ e.stopPropagation(); close(); });
  _modals.push({bk,mo,close});
  return {mo,close};
}
function closeTopModal() { if(_modals.length) _modals[_modals.length-1].close(); }

/* ════════════════════════════════════════════════════════════
   NAVIGATION
   ════════════════════════════════════════════════════════════ */
function navigate(screen) {
  $$('.screen').forEach(s=>s.classList.remove('active'));
  $$('.nb[data-screen]').forEach(b=>b.classList.remove('active'));
  $(`#screen-${screen}`)?.classList.add('active');
  $(`.nb[data-screen="${screen}"]`)?.classList.add('active');
  S.screen=screen;

  /* STEP 3 — Clear All button visible ONLY on history screen */
  const cdb=$('#clear-data-btn');
  if (cdb) {
    cdb.style.display = (screen==='history') ? 'flex' : 'none';
  }

  if (screen==='history') { loadHistory(); histSel.exit(); }
  if (screen==='billing') { renderBillingHeader(); renderProductTable(); }
  if (screen==='shop')    { shopSel.exit(); }
}

/* ════════════════════════════════════════════════════════════
   DATE BAR
   ════════════════════════════════════════════════════════════ */
function refreshDateBar() {
  const el=$('#tb-date');
  if (el) el.textContent=new Date().toLocaleDateString('en-IN',
    {weekday:'long',day:'numeric',month:'long',year:'numeric'});
}

/* ════════════════════════════════════════════════════════════
   SHOPS
   ════════════════════════════════════════════════════════════ */
async function loadShops() {
  try { S.shops=await ipc(window.api.getShops); renderShops(); }
  catch(err) { toast('Failed to load shops: '+err.message,'err'); }
}

function renderShops() {
  const grid=$('#shop-grid'); if (!grid) return;
  grid.innerHTML='';

  const pal=['#00ffc6','#38bdf8','#a855f7','#f59e0b','#ef4444','#06b6d4','#ec4899','#84cc16'];
  S.shops.forEach((sh,i)=>{
    const color=pal[sh.id%pal.length];
    const init=sh.name.slice(0,2).toUpperCase();
    const card=document.createElement('div');
    card.className='sc'; card.style.animationDelay=`${i*40}ms`;

    card.innerHTML=`
      <!-- STEP 2: checkbox overlay -->
      <div class="sc-check-wrap" data-sid="${sh.id}">
        <input type="checkbox" class="sc-checkbox" data-sid="${sh.id}">
      </div>
      <div class="sc-bar" style="background:${color}"></div>
      <div class="sc-body">
        <div class="sc-row1">
          <div class="sc-ico" style="background:${color}18;border-color:${color}30;color:${color}">${init}</div>
          <div class="sc-names">
            <div class="sc-name">${esc(sh.name)}</div>
            ${sh.phone?`<div class="sc-phone">📞 ${esc(sh.phone)}</div>`:''}
          </div>
        </div>
        ${sh.address?`<div class="sc-addr">📍 ${esc(sh.address)}</div>`:''}
        ${sh.map_link?`<div class="sc-map">🗺️ <a href="${esc(sh.map_link)}" target="_blank">Map</a></div>`:''}
      </div>
      <div class="sc-acts">
        <button class="sc-act go" data-a="bill">${T('cardBill')}</button>
        <button class="sc-act"    data-a="edit">${T('cardEdit')}</button>
        <button class="sc-act del" data-a="del">${T('cardDel')}</button>
      </div>`;

    card.querySelector('[data-a="bill"]').addEventListener('click',e=>{ e.stopPropagation(); if(shopSel.mode){shopSel.toggle(sh.id,card);return;} ripple(card,e); selectShop(sh); });
    card.querySelector('[data-a="edit"]').addEventListener('click',e=>{ e.stopPropagation(); showShopForm(sh); });
    card.querySelector('[data-a="del"]').addEventListener('click',e=>{ e.stopPropagation(); confirmDeleteShop(sh); });
    card.querySelector('.sc-body')?.addEventListener('click',e=>{
      if (shopSel.mode) { shopSel.toggle(sh.id, card); return; }
      ripple(card,e); selectShop(sh);
    });

    // STEP 2: long-press to enter select mode
    let lpTimer = null;
    card.addEventListener('pointerdown', e => {
      if (e.target.closest('.sc-acts') || e.target.closest('.sc-check-wrap')) return;
      lpTimer = setTimeout(() => { if (!shopSel.mode) shopSel.enter(); shopSel.toggle(sh.id, card); }, 600);
    });
    card.addEventListener('pointerup',   () => clearTimeout(lpTimer));
    card.addEventListener('pointerleave',() => clearTimeout(lpTimer));

    // STEP 2: checkbox click
    card.querySelector('.sc-checkbox').addEventListener('change', e => {
      e.stopPropagation();
      shopSel.toggle(sh.id, card);
    });
    // Show checkbox in select mode
    if (shopSel.mode) {
      card.querySelector('.sc-check-wrap').classList.add('visible');
      if (shopSel.selected.has(sh.id)) {
        card.classList.add('selected');
        card.querySelector('.sc-checkbox').checked = true;
      }
    }

    grid.appendChild(card);
  });

  /* Quick Bill card */
  const qc=document.createElement('div');
  qc.className='sc sc-quick'; qc.style.animationDelay=`${S.shops.length*40}ms`;
  qc.innerHTML=`<div class="sc-add-inner" style="gap:6px">
    <div class="sc-add-plus" style="background:rgba(245,158,11,.1);border-color:rgba(245,158,11,.25);color:#f59e0b;font-size:20px">⚡</div>
    <div class="sc-add-label" style="color:#f59e0b">${T('quickBillLabel')}</div>
    <div class="sc-add-sub">${T('quickBillSub')}</div>
  </div>`;
  qc.addEventListener('click',()=>{ S.shop=null; S.items={}; navigate('billing'); });
  grid.appendChild(qc);

  /* Add New Shop card */
  const ac=document.createElement('div');
  ac.className='sc sc-add'; ac.style.animationDelay=`${(S.shops.length+1)*40}ms`;
  ac.innerHTML=`<div class="sc-add-inner">
    <div class="sc-add-plus">+</div>
    <div class="sc-add-label">${T('addNew')}</div>
    <div class="sc-add-sub">${T('addNewSub')}</div>
  </div>`;
  ac.addEventListener('click',()=>showShopForm(null));
  grid.appendChild(ac);
}

/* ════════════════════════════════════════════════════════════
   STEP 2 — SHOP BULK DELETE
   ════════════════════════════════════════════════════════════ */
function setupShopBulkActions() {
  $('#shop-bulk-cancel')?.addEventListener('click', () => shopSel.exit());
  $('#shop-bulk-del')?.addEventListener('click', () => {
    const ids = [...shopSel.selected];
    if (!ids.length) return;
    const {mo, close} = openModal(`
      <div class="mo-head">
        <div class="mo-title">🗑️ Delete ${ids.length} Shop${ids.length>1?'s':''}?</div>
        <button class="mo-x">✕</button>
      </div>
      <p style="color:var(--t2);margin-bottom:6px">
        This will permanently delete <strong style="color:#ef4444">${ids.length} shop${ids.length>1?'s':''}</strong>.<br>
        <span style="font-size:12px;color:var(--t3)">Saved bills won't be removed.</span>
      </p>
      <div class="mo-foot">
        <button class="btn b-secondary b-sm" id="sb-cancel">Cancel</button>
        <button class="btn b-danger b-sm" id="sb-ok">🗑️ Yes, Delete All</button>
      </div>`);
    mo.querySelector('#sb-cancel').addEventListener('click', close);
    mo.querySelector('#sb-ok').addEventListener('click', async () => {
      const btn = mo.querySelector('#sb-ok');
      btn.disabled = true; btn.textContent = '⏳…';
      let ok = 0;
      for (const id of ids) {
        try { await ipc(window.api.deleteShop, id); ok++; } catch(_) {}
      }
      toast(`${ok} shop${ok>1?'s':''} deleted`,'info');
      close();
      shopSel.exit();
      await loadShops();
    });
  });
}

function showShopForm(shop) {
  const isEdit=!!shop;
  const {mo,close}=openModal(`
    <div class="mo-head">
      <div>
        <div class="mo-title">${isEdit?T('editShop'):T('addShop')}</div>
        <div class="mo-sub">${isEdit?'Update shop details':'Enter details for the new shop'}</div>
      </div>
      <button class="mo-x">✕</button>
    </div>
    <div class="form-group">
      <label>${T('fShopName')}</label>
      <input class="inp" id="f-name" placeholder="${T('shopNamePh')}" value="${esc(shop?.name||'')}">
      <div class="errmsg" id="f-name-err">${T('shopNameReq')}</div>
    </div>
    <div class="form-row2">
      <div class="form-group">
        <label>${T('fPhone')}</label>
        <input class="inp" id="f-phone" placeholder="${T('phonePh')}" value="${esc(shop?.phone||'')}">
      </div>
      <div class="form-group">
        <label>${T('fAddr')}</label>
        <input class="inp" id="f-addr" placeholder="${T('addrPh')}" value="${esc(shop?.address||'')}">
      </div>
    </div>
    <div class="form-group">
      <label>${T('fMap')}</label>
      <input class="inp" id="f-map" placeholder="${T('mapPh')}" value="${esc(shop?.map_link||'')}">
    </div>
    <div class="mo-foot">
      <button class="btn b-secondary b-sm" id="f-cancel">${T('cancel')}</button>
      <button class="btn b-primary" id="f-submit">${isEdit?T('saveBtn'):T('addBtn')}</button>
    </div>`);
  mo.querySelector('#f-cancel').addEventListener('click',close);
  const nameInp=mo.querySelector('#f-name');
  const errEl=mo.querySelector('#f-name-err');
  async function doSubmit(){
    const name=nameInp.value.trim(),phone=mo.querySelector('#f-phone').value.trim(),
          address=mo.querySelector('#f-addr').value.trim(),map_link=mo.querySelector('#f-map').value.trim();
    if (!name){nameInp.classList.add('err');errEl.classList.add('show');nameInp.focus();return;}
    nameInp.classList.remove('err');errEl.classList.remove('show');
    const btn=mo.querySelector('#f-submit');
    btn.disabled=true;btn.textContent='⏳…';
    try {
      if (isEdit){await ipc(window.api.updateShop,{id:shop.id,name,phone,address,map_link});toast(`"${name}" ${T('tUpdated')}`);}
      else       {await ipc(window.api.addShop,{name,phone,address,map_link});toast(`"${name}" ${T('tAdded')}`);}
      close(); await loadShops();
    } catch(err){toast(err.message,'err');btn.disabled=false;btn.textContent=isEdit?T('saveBtn'):T('addBtn');}
  }
  mo.querySelector('#f-submit').addEventListener('click',doSubmit);
  nameInp.addEventListener('keydown',e=>{if(e.key==='Enter')doSubmit();});
  setTimeout(()=>nameInp.focus(),100);
}

function confirmDeleteShop(sh) {
  const {mo,close}=openModal(`
    <div class="mo-head">
      <div class="mo-title">${T('delShop')}</div>
      <button class="mo-x">✕</button>
    </div>
    <p style="color:var(--t2);margin-bottom:4px">
      ${T('delConfirm')} <strong>${esc(sh.name)}</strong>?<br>
      <span style="font-size:12px;color:var(--t3)">${T('delWarn')}</span>
    </p>
    <div class="mo-foot">
      <button class="btn b-secondary b-sm" id="d-cancel">${T('cancel')}</button>
      <button class="btn b-danger b-sm" id="d-ok">${T('yesDel')}</button>
    </div>`);
  mo.querySelector('#d-cancel').addEventListener('click',close);
  mo.querySelector('#d-ok').addEventListener('click',async()=>{
    try {
      await ipc(window.api.deleteShop,sh.id);
      toast(`"${sh.name}" ${T('tDeleted')}`,'info');
      close();
      await loadShops();
    } catch(err){toast(err.message,'err');}
  });
}

function selectShop(sh){S.shop=sh;S.items={};navigate('billing');}

/* ════════════════════════════════════════════════════════════
   PRICE SETUP
   ════════════════════════════════════════════════════════════ */
async function checkAndSetupPrices(){
  try {
    const latest=await ipc(window.api.getLatestPrices);
    S.prices={};
    (latest||[]).forEach(p=>{S.prices[p.product_id]=Number(p.price)||0;});
    const todayP=await ipc(window.api.getPricesForDate,todayStr());
    const hasToday=(todayP||[]).some(p=>Number(p.price)>0);
    const hasAny=(latest||[]).some(p=>Number(p.price)>0);
    if (!hasAny)        openPriceEditor(latest||[],true);
    else if (!hasToday) openPriceChoice(latest||[]);
  } catch(err){toast('Price setup error: '+err.message,'err');}
}

function openPriceChoice(latest){
  const lastDate=latest.find(p=>p.date)?.date||'';
  const {close}=openModal(`
    <div class="mo-head">
      <div>
        <div class="mo-title">${T('priceSetup')}</div>
        <div class="mo-sub">${T('today')}: ${fmtDate(todayStr())}</div>
      </div>
    </div>
    <p style="color:var(--t2);margin-bottom:6px">
      ${T('lastFrom')} <strong>${lastDate?fmtDate(lastDate):T('prevDay')}</strong>
    </p>
    <div class="pchoices">
      <div class="pc" id="pc-same"><div class="pc-ic">⚡</div><div class="pc-ti">${T('useSame')}</div><div class="pc-de">${T('useSameSub')}</div></div>
      <div class="pc" id="pc-edit"><div class="pc-ic">✏️</div><div class="pc-ti">${T('editPriceBtn')}</div><div class="pc-de">${T('editPriceSub')}</div></div>
    </div>`,{persistent:true});
  document.getElementById('pc-same').addEventListener('click',async()=>{
    try{
      const arr=latest.map(p=>({product_id:p.product_id,price:Number(p.price)||0,date:todayStr()}));
      await ipc(window.api.savePrices,arr);
      arr.forEach(p=>{S.prices[p.product_id]=p.price;});
      toast(T('tCarried'));close();
    }catch(err){toast(err.message,'err');}
  });
  document.getElementById('pc-edit').addEventListener('click',()=>{close();setTimeout(()=>openPriceEditor(latest,false),200);});
}

function openPriceEditor(latest,firstRun=false){
  const rows=(latest||[]).map(p=>{
    const ta=getTa(p.product_name);
    return `<div class="pitem">
      <div class="pitem-name">${esc(p.product_name)}${ta?`<span class="pitem-ta">${esc(ta)}</span>`:''}</div>
      <input type="number" class="pinp" data-pid="${p.product_id}"
             value="${Number(p.price)>0?p.price:''}" placeholder="0.00" min="0" step="0.5" autocomplete="off">
    </div>`;
  }).join('');

  const {mo,close}=openModal(`
    <div class="mo-head">
      <div>
        <div class="mo-title">${firstRun?T('setToday'):T('editPrices')}</div>
        <div class="mo-sub">${fmtDate(todayStr())} &nbsp;·&nbsp; ${T('perKg')}</div>
      </div>
      ${firstRun?'':'<button class="mo-x">✕</button>'}
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
      <span style="font-size:11px;color:var(--t3)">${(latest||[]).length} ${T('products')}</span>
      <button class="btn b-ghost b-sm" id="clr-all">${T('clearAll')}</button>
    </div>
    <div class="plist-wrap">
      <div class="plist-head"><div>${T('thProduct')}</div><div>₹ / kg</div></div>
      <div id="plist-body">${rows}</div>
    </div>
    <div class="mo-foot">
      ${firstRun?'':`<button class="btn b-secondary b-sm" id="pe-cancel">${T('cancel')}</button>`}
      <button class="btn b-primary b-lg" id="pe-save">${T('savePrices')}</button>
    </div>`,{persistent:firstRun});

  if(!firstRun) mo.querySelector('#pe-cancel')?.addEventListener('click',close);
  mo.querySelector('#clr-all').addEventListener('click',()=>mo.querySelectorAll('.pinp').forEach(i=>i.value=''));
  mo.querySelector('#pe-save').addEventListener('click',async()=>{
    const inputs=[...mo.querySelectorAll('.pinp')];
    const priceArr=inputs.map(i=>({product_id:Number(i.dataset.pid),price:parseFloat(i.value)||0,date:todayStr()}));
    const btn=mo.querySelector('#pe-save');
    btn.disabled=true;btn.textContent='⏳…';
    try{
      await ipc(window.api.savePrices,priceArr);
      priceArr.forEach(p=>{S.prices[p.product_id]=p.price;});
      toast(T('tPricesSaved'));close();
      if(S.screen==='billing') renderProductTable();
    }catch(err){toast(err.message,'err');btn.disabled=false;btn.textContent=T('savePrices');}
  });
  const inputs=[...mo.querySelectorAll('.pinp')];
  inputs.forEach((inp,idx)=>{
    inp.addEventListener('keydown',e=>{
      if(e.key==='Enter'||e.key==='Tab'){e.preventDefault();(inputs[idx+1]||mo.querySelector('#pe-save'))?.focus();}
    });
    inp.closest('.pitem')?.addEventListener('click',()=>inp.focus());
  });
  setTimeout(()=>inputs[0]?.focus(),120);
}

/* ════════════════════════════════════════════════════════════
   BILLING HEADER
   ════════════════════════════════════════════════════════════ */
function renderBillingHeader(){
  const sh=S.shop;
  const dispName=sh?sh.name:T('quickBill');
  const initials=sh?sh.name.slice(0,2).toUpperCase():'⚡';
  if($('#bt-avatar')) $('#bt-avatar').textContent=initials;
  if($('#bt-name'))   $('#bt-name').textContent=dispName;
  if($('#bt-sub'))    $('#bt-sub').textContent=fmtDate(todayStr());
  if($('#bill-note')) $('#bill-note').value='';
}

/* ════════════════════════════════════════════════════════════
   STEP 5 — PRODUCT TABLE (QTY BUG FIX)
   Root cause: clicking + rapidly caused stale closure values and
   re-rendering the table mid-click, losing focus and doubling events.

   Fix:
   1. nudgeQty uses precise floating-point math with rounding
   2. Buttons use 'click' (not pointerdown) — click is debounced by browser
   3. touch-action:manipulation on .qb prevents double-tap zoom
   4. No table re-render on nudge — only updates DOM values in-place
   5. applyQty never re-renders the table row; it only patches text nodes
   ════════════════════════════════════════════════════════════ */
async function renderProductTable(){
  try {
    const tp=await ipc(window.api.getPricesForDate,todayStr());
    (tp||[]).forEach(p=>{S.prices[p.product_id]=Number(p.price)||0;});
  }catch(_){}

  const tbody=$('#ptbody'), ptable=$('#ptable');
  if(!tbody||!ptable) return;
  tbody.innerHTML='';
  ptable.classList.remove('show-rates');

  sortedProducts().forEach((prod,i)=>{
    const isPinned=pinnedIds.includes(prod.id);
    const ta=getTa(prod.name);
    const tr=document.createElement('tr');
    tr.className='pr'+(isPinned?' pinned':'');
    tr.dataset.pid=prod.id;
    tr.style.animation=`fup .35s ${i*12}ms both`;
    tr.innerHTML=`
      <td class="td-pin">
        <button class="pin-btn${isPinned?' active':''}" data-pid="${prod.id}"
                title="${isPinned?T('unpinTip'):T('pinTip')}">
          ${isPinned?'📌':'📍'}
        </button>
      </td>
      <td>
        <span class="pname" id="pname-en-${prod.id}">${esc(prod.name)}</span>
        ${ta?`<span class="pname-ta" id="pname-ta-${prod.id}">${esc(ta)}</span>`:''}
      </td>
      <td class="th-qty" style="text-align:center">
        <div class="qc">
          <button class="qb qm" data-pid="${prod.id}" tabindex="-1" type="button">−</button>
          <input class="qi" id="qi-${prod.id}" data-pid="${prod.id}"
                 type="number" value="" placeholder="0" min="0" step="0.5"
                 autocomplete="off" tabindex="${i+1}" inputmode="decimal">
          <button class="qb qp" data-pid="${prod.id}" tabindex="-1" type="button">+</button>
        </div>
      </td>
      <td class="td-rate"><div class="rv" id="rv-${prod.id}">—</div><div class="rs" id="rs-${prod.id}"></div></td>
      <td class="td-amt"><span class="av" id="av-${prod.id}">₹ 0.00</span></td>`;

    const qi=tr.querySelector('.qi');
    makeInputSafe(qi);

    tr.querySelector('.pin-btn').addEventListener('click',e=>{ e.stopPropagation(); togglePin(prod.id); });

    /* STEP 5 FIX — Use 'click' not 'pointerdown', and preventDefault on mousedown
       to prevent the browser from de-focusing the input before the click fires */
    const qpBtn = tr.querySelector('.qb.qp');
    const qmBtn = tr.querySelector('.qb.qm');

    qpBtn.addEventListener('mousedown', e => e.preventDefault()); // don't blur input
    qmBtn.addEventListener('mousedown', e => e.preventDefault());

    qpBtn.addEventListener('click', e => {
      e.preventDefault();
      ripple(qpBtn, e);
      nudgeQty(prod.id, +0.5);
      // keep focus on input without re-rendering
      requestAnimationFrame(() => qi.focus());
    });
    qmBtn.addEventListener('click', e => {
      e.preventDefault();
      ripple(qmBtn, e);
      nudgeQty(prod.id, -0.5);
      requestAnimationFrame(() => qi.focus());
    });

    qi.addEventListener('focus', () => qi.select());
    qi.addEventListener('click', () => qi.select());
    qi.addEventListener('input', () => {
      const v = parseFloat(qi.value);
      applyQty(prod.id, isNaN(v) ? 0 : Math.max(0, v));
    });
    qi.addEventListener('keydown', e => {
      if (e.key==='ArrowUp')   { e.preventDefault(); nudgeQty(prod.id,+0.5); }
      if (e.key==='ArrowDown') { e.preventDefault(); nudgeQty(prod.id,-0.5); }
      if (e.key==='Enter') {
        e.preventDefault();
        const all=$$('.qi'); const idx=all.indexOf(qi);
        if (all[idx+1]) all[idx+1].focus();
      }
    });
    tbody.appendChild(tr);
  });

  /* Restore quantities from S.items */
  Object.entries(S.items).forEach(([pid,it])=>{
    const qi=$(`#qi-${pid}`);
    if (qi) { qi.value=it.qty; applyQty(Number(pid),it.qty); }
  });
  updateBillTotals();
}

/* STEP 5 FIX — nudgeQty: use precise rounding to avoid floating-point drift
   e.g. 0.1 + 0.2 = 0.30000000000000004, so we round to 1 decimal place */
function nudgeQty(pid, delta) {
  const qi = $(`#qi-${pid}`); if (!qi) return;
  const current = parseFloat(qi.value) || 0;
  // Round to 1 decimal to prevent floating point accumulation bugs
  const next = Math.round((current + delta) * 10) / 10;
  const nv = Math.max(0, next);
  qi.value = nv === 0 ? '' : String(nv);
  applyQty(pid, nv);
}

function applyQty(pid, qty) {
  const price   = S.prices[pid] || 0;
  const amount  = Math.round(qty * price * 100) / 100;
  const tr      = $(`tr.pr[data-pid="${pid}"]`);
  const qi      = $(`#qi-${pid}`);
  const pname   = $(`#pname-en-${pid}`);
  const rv      = $(`#rv-${pid}`);
  const rs      = $(`#rs-${pid}`);
  const av      = $(`#av-${pid}`);
  const ptable  = $('#ptable');

  if (qty > 0) {
    S.items[pid] = { pid, qty, price, amount };
    qi?.classList.add('on');
    pname?.classList.add('on');
    tr?.classList.add('has-qty');
    if (ptable && !ptable.classList.contains('show-rates')) ptable.classList.add('show-rates');
    if (rv) rv.textContent = price > 0 ? `₹${price.toFixed(2)}/kg` : T('noPrice');
    if (rs) rs.textContent = price > 0 ? `${qty}kg × ₹${price}` : '';
    if (av) {
      av.textContent = fmt(amount);
      av.classList.remove('pop');
      void av.offsetWidth; // force reflow for animation restart
      av.classList.add('pop');
    }
    tr?.classList.remove('flash');
    void tr?.offsetWidth;
    tr?.classList.add('flash');
  } else {
    delete S.items[pid];
    qi?.classList.remove('on');
    pname?.classList.remove('on');
    tr?.classList.remove('has-qty');
    if (rv) rv.textContent = '—';
    if (rs) rs.textContent = '';
    if (av) av.textContent = '₹ 0.00';
    if (Object.keys(S.items).length === 0 && ptable) ptable.classList.remove('show-rates');
  }
  updateBillTotals();
}

function updateBillTotals() {
  const vals  = Object.values(S.items);
  const total = vals.reduce((s,x)=>s+x.amount, 0);
  const tqty  = vals.reduce((s,x)=>s+x.qty, 0);
  if ($('#st-items'))  $('#st-items').textContent  = vals.length;
  if ($('#st-qty'))    $('#st-qty').textContent    = tqty%1===0 ? tqty : tqty.toFixed(1);
  if ($('#filled-ct')) $('#filled-ct').textContent = vals.length;
  const gtEl=$('#grand-total'), tbar=$('#tot-bar');
  if (!gtEl) return;
  gtEl.textContent = fmt(total);
  if (total > 0) {
    gtEl.classList.add('lit'); tbar?.classList.add('lit');
    gtEl.classList.remove('pulse'); void gtEl.offsetWidth; gtEl.classList.add('pulse');
  } else {
    gtEl.classList.remove('lit'); tbar?.classList.remove('lit');
  }
}

async function saveBill() {
  const vals=Object.values(S.items);
  if (!vals.length) { toast(T('tAddItem'),'err'); return; }
  const shopName=S.shop?S.shop.name:T('quickBill');
  const total=vals.reduce((s,x)=>s+x.amount,0);
  const bill={
    shop_id:S.shop?.id||null, shop_name:shopName,
    date:todayStr(), time:timeStr(), total,
    note:$('#bill-note')?.value?.trim()||'',
    items:vals.map(x=>{ const prod=S.products.find(p=>p.id===x.pid);
      return {product_id:x.pid,product_name:prod?.name||`#${x.pid}`,quantity:x.qty,price:x.price,amount:x.amount}; })
  };
  const b1=$('#btn-save-top'),b2=$('#btn-save-bot');
  if (b1) b1.disabled=true; if (b2) b2.disabled=true;
  try {
    const res=await ipc(window.api.saveBill,bill);
    bill.id=res.bill_id;
    toast(`Bill #${res.bill_id} ${T('tBillSaved')} ${fmt(total)} 🎉`,'ok',4500);
    showSavedBanner(total);
    S.items={};
    renderProductTable();
    setTimeout(()=>showBillShareModal(bill),600);
  } catch(err) { toast('Save failed: '+err.message,'err'); }
  finally { if (b1) b1.disabled=false; if (b2) b2.disabled=false; }
}

function showSavedBanner(total) {
  const el=document.createElement('div');
  el.style.cssText=`position:fixed;left:50%;bottom:80px;transform:translateX(-50%);
    background:linear-gradient(135deg,var(--g),#009e78);color:#060a14;
    font-weight:800;font-size:16px;padding:12px 28px;border-radius:50px;
    box-shadow:0 8px 28px rgba(0,255,198,.4);z-index:3000;pointer-events:none;
    font-family:'JetBrains Mono',monospace;white-space:nowrap;
    animation:saved 1.8s ease-out forwards`;
  el.textContent=`✅ Bill Saved! ${fmt(total)}`;
  document.body.appendChild(el);
  el.addEventListener('animationend',()=>el.remove(),{once:true});
}

function resetBill() {
  if (!Object.keys(S.items).length) return;
  const {mo, close} = openModal(`
    <div class="mo-head" style="border-bottom:1px solid rgba(239,68,68,.25);margin-bottom:16px;padding-bottom:14px">
      <div>
        <div class="mo-title" style="color:#f87171">🔄 Reset Bill?</div>
        <div class="mo-sub">All entered quantities will be cleared</div>
      </div>
      <button class="mo-x">✕</button>
    </div>
    <div style="background:rgba(239,68,68,.07);border:1px solid rgba(239,68,68,.2);border-radius:10px;padding:14px 16px;margin-bottom:18px">
      <p style="color:var(--t2);margin:0;line-height:1.6;font-size:13px">
        This will <strong style="color:#f87171">clear all quantities</strong> entered in this bill.<br>
        <span style="font-size:11px;color:var(--t3)">The app will restart fresh — prices and shops are kept.</span>
      </p>
    </div>
    <div class="mo-foot">
      <button class="btn b-secondary b-sm" id="rb-cancel">Cancel</button>
      <button class="btn b-danger" id="rb-ok">
        🔄 Yes, Reset
      </button>
    </div>`);
  mo.querySelector('#rb-cancel').addEventListener('click', close);
  mo.querySelector('#rb-ok').addEventListener('click', () => {
    close();
    S.items = {};
    renderProductTable();
    const noteEl = $('#bill-note');
    if (noteEl) noteEl.value = '';
    toast('🔄 Bill reset','info',1800);
  });
}

/* ════════════════════════════════════════════════════════════
   BILL SHARE / CANVAS
   ════════════════════════════════════════════════════════════ */
function buildBillText(bill){
  const items=bill.items||[];
  const lines=items.map((it,idx)=>{
    const ta=getTa(it.product_name);
    const name=ta?`${it.product_name} (${ta})`:it.product_name;
    const num=String(idx+1).padStart(2,'0');
    const qty=`${it.quantity}kg`;
    const rate=`₹${Number(it.price).toFixed(0)}/kg`;
    const amt=`₹${Number(it.amount).toFixed(2)}`;
    return `  ${num}. ${name}\n      ${qty} × ${rate} = *${amt}*`;
  }).join('\n');
  const sep='━'.repeat(28);
  let msg=`🥦 *VegBill Pro*\n${sep}\n🏪 *${bill.shop_name||'Quick Bill'}*\n📅 ${bill.date}   🕐 ${bill.time}\n${sep}\n\n*Items:*\n${lines}\n\n${sep}\n💰 *Grand Total: ₹${Number(bill.total).toFixed(2)}*\n${sep}`;
  if(bill.note) msg+=`\n📝 _${bill.note}_`;
  msg+=`\n\n_Bill #${bill.id||'—'} · VegBill Pro_`;
  return msg;
}

function generateBillCanvas(bill){
  const items=bill.items||[];
  const W=520,rowH=34,headerH=130,footerH=90;
  const H=headerH+36+items.length*rowH+footerH;
  const canvas=document.createElement('canvas');
  canvas.width=W*2; canvas.height=H*2;
  const ctx=canvas.getContext('2d');
  ctx.scale(2,2);
  ctx.fillStyle='#0d1b2a'; ctx.fillRect(0,0,W,H);
  const hg=ctx.createLinearGradient(0,0,W,0);
  hg.addColorStop(0,'#00ffc6'); hg.addColorStop(.5,'#0ea5e9'); hg.addColorStop(1,'#6366f1');
  ctx.fillStyle=hg; ctx.fillRect(0,0,W,70);
  ctx.fillStyle='#fff'; ctx.font='bold 18px sans-serif';
  ctx.fillText('🥦 VegBill Pro',16,26);
  ctx.font='bold 13px sans-serif'; ctx.fillText(bill.shop_name||'Quick Bill',16,48);
  ctx.font='10px sans-serif'; ctx.fillStyle='rgba(255,255,255,.85)';
  ctx.fillText(`📅 ${bill.date}    🕐 ${bill.time}`,16,64);
  ctx.fillStyle='rgba(0,0,0,.25)'; ctx.beginPath();
  ctx.roundRect(W-90,10,78,28,8); ctx.fill();
  ctx.fillStyle='#fff'; ctx.font='bold 11px monospace'; ctx.textAlign='right';
  ctx.fillText(`Bill #${bill.id||'—'}`,W-18,29); ctx.textAlign='left';
  ctx.fillStyle='rgba(255,255,255,.06)'; ctx.fillRect(0,70,W,60);
  const itemCount=items.length;
  const totalQty=items.reduce((s,it)=>s+Number(it.quantity),0);
  ctx.fillStyle='#94a3b8'; ctx.font='9px sans-serif';
  ctx.fillText(`${itemCount} items`,16,90);
  ctx.fillText(`Total qty: ${totalQty} kg`,16,106);
  ctx.fillStyle='#00ffc6'; ctx.font='bold 16px sans-serif'; ctx.textAlign='right';
  ctx.fillText(`₹ ${Number(bill.total).toLocaleString('en-IN',{minimumFractionDigits:2})}`,W-16,100);
  ctx.fillStyle='#64748b'; ctx.font='9px sans-serif'; ctx.fillText('Grand Total',W-16,115);
  ctx.textAlign='left';
  const y0=headerH;
  ctx.fillStyle='#1e3a5f'; ctx.fillRect(0,y0,W,32);
  ctx.fillStyle='#7dd3fc'; ctx.font='bold 9px sans-serif';
  ctx.fillText('PRODUCT / பொருள்',14,y0+20);
  ctx.textAlign='right';
  ctx.fillText('QTY',W-220,y0+20); ctx.fillText('RATE',W-140,y0+20);
  ctx.fillText('AMOUNT',W-14,y0+20); ctx.textAlign='left';
  items.forEach((it,idx)=>{
    const y=headerH+32+idx*rowH;
    ctx.fillStyle=idx%2===0?'rgba(255,255,255,.03)':'rgba(255,255,255,.015)';
    ctx.fillRect(0,y,W,rowH);
    const ta=getTa(it.product_name);
    ctx.fillStyle='#e2e8f0'; ctx.font='10px sans-serif'; ctx.fillText(it.product_name,14,y+14);
    if(ta){ctx.fillStyle='#64748b'; ctx.font='8px sans-serif'; ctx.fillText(ta,14,y+27);}
    ctx.textAlign='right'; ctx.fillStyle='#94a3b8'; ctx.font='9px sans-serif';
    ctx.fillText(`${it.quantity}kg`,W-220,y+20); ctx.fillText(`₹${Number(it.price).toFixed(0)}`,W-140,y+20);
    ctx.fillStyle=Number(it.amount)>0?'#34d399':'#64748b'; ctx.font='bold 10px sans-serif';
    ctx.fillText(`₹${Number(it.amount).toFixed(2)}`,W-14,y+20); ctx.textAlign='left';
    ctx.strokeStyle='rgba(255,255,255,.05)'; ctx.lineWidth=.5;
    ctx.beginPath(); ctx.moveTo(0,y+rowH); ctx.lineTo(W,y+rowH); ctx.stroke();
  });
  const totY=headerH+32+items.length*rowH;
  const tg=ctx.createLinearGradient(0,totY,W,totY);
  tg.addColorStop(0,'#064e3b'); tg.addColorStop(1,'#0c4a6e');
  ctx.fillStyle=tg; ctx.fillRect(0,totY,W,50);
  ctx.strokeStyle='#00ffc6'; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.moveTo(0,totY); ctx.lineTo(W,totY); ctx.stroke();
  ctx.fillStyle='#6ee7b7'; ctx.font='10px sans-serif'; ctx.fillText('💰 Grand Total',14,totY+30);
  ctx.fillStyle='#fff'; ctx.font='bold 16px monospace'; ctx.textAlign='right';
  ctx.fillText(`₹ ${Number(bill.total).toLocaleString('en-IN',{minimumFractionDigits:2})}`,W-14,totY+32);
  ctx.textAlign='left';
  if(bill.note){ctx.fillStyle='#94a3b8';ctx.font='italic 9px sans-serif';ctx.fillText(`📝 ${bill.note}`,14,totY+65);}
  ctx.fillStyle='#1e293b'; ctx.fillRect(0,H-28,W,28);
  ctx.fillStyle='#475569'; ctx.font='8px sans-serif'; ctx.textAlign='center';
  ctx.fillText('Generated by VegBill Pro · Vegetable Wholesale Billing',W/2,H-10);
  ctx.textAlign='left';
  return canvas;
}

function showBillShareModal(bill){
  const canvas=generateBillCanvas(bill);
  const dataUrl=canvas.toDataURL('image/png');
  const {mo,close}=openModal(`
    <div class="mo-head">
      <div class="mo-title">📤 Share Bill #${bill.id||''}</div>
      <button class="mo-x">✕</button>
    </div>
    <div style="margin-bottom:12px">
      <img src="${dataUrl}" style="width:100%;border-radius:8px;display:block;" alt="Bill preview">
    </div>
    <div style="display:flex;gap:10px;flex-wrap:wrap">
      <button class="btn b-primary" id="sh-save" style="flex:1">💾 Save Image</button>
      <button class="btn b-primary" id="sh-wa"   style="flex:1;background:linear-gradient(135deg,#25d366,#128c7e)">💬 WhatsApp</button>
    </div>`);
  mo.querySelector('#sh-save').addEventListener('click',async()=>{
    const btn=mo.querySelector('#sh-save');btn.disabled=true;btn.textContent='⏳…';
    try{
      const r=await ipc(window.api.saveBillImage,{dataUrl,fileName:`bill-${bill.id||'q'}-${(bill.shop_name||'').replace(/\s+/g,'_')}-${bill.date}.png`});
      if(!r?.cancelled)toast('✅ Bill image saved!');
    }catch(err){toast('Save failed: '+err.message,'err');}
    btn.disabled=false;btn.textContent='💾 Save Image';
  });
  mo.querySelector('#sh-wa').addEventListener('click',async()=>{
    try{await ipc(window.api.openWhatsApp,{phone:S.shop?.phone||'',message:buildBillText(bill)});toast('📲 Opening WhatsApp…','info');}
    catch(err){toast('WhatsApp error: '+err.message,'err');}
  });
}

function printBill(det){
  const w=window.open('','_blank','width=440,height=700');
  if(!w){toast('Pop-ups blocked','info');return;}
  const rows=(det.items||[]).map(it=>{
    const ta=getTa(it.product_name);
    const label=ta?`${it.product_name}<br><small style="color:#888">${ta}</small>`:it.product_name;
    return `<tr><td>${label}</td><td align="right">${it.quantity}kg</td><td align="right">₹${Number(it.price).toFixed(2)}</td><td align="right">₹${Number(it.amount).toFixed(2)}</td></tr>`;
  }).join('');
  w.document.write(`<!DOCTYPE html><html><head><title>Bill #${det.id}</title>
  <style>body{font-family:sans-serif;padding:20px;font-size:13px}h2{font-size:18px;margin-bottom:3px}.m{color:#666;font-size:11px;margin-bottom:14px}table{width:100%;border-collapse:collapse}th{border-bottom:1px solid #333;padding:5px 4px;font-size:10px;text-transform:uppercase}td{padding:7px 4px;border-bottom:1px solid #eee;vertical-align:top}td:not(:first-child){text-align:right}.tot{font-size:17px;font-weight:bold;margin-top:12px;text-align:right}.foot{font-size:10px;color:#999;margin-top:6px}small{font-size:10px}</style>
  </head><body><h2>${det.shop_name}</h2>
  <div class="m">${det.date} · ${det.time}${det.note?' · '+det.note:''}</div>
  <table><thead><tr><th>Product / பொருள்</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead>
  <tbody>${rows}</tbody></table>
  <div class="tot">Total: ₹${Number(det.total).toFixed(2)}</div>
  <div class="foot">Bill #${det.id} · VegBill Pro</div>
  </body></html>`);
  w.document.close(); setTimeout(()=>w.print(),300);
}

/* ════════════════════════════════════════════════════════════
   STEP 2 — HISTORY MULTI-SELECT
   ════════════════════════════════════════════════════════════ */
async function loadHistory(){
  try { S.bills=await ipc(window.api.getAllBills); renderBillList(S.bills); }
  catch(err) { toast('Failed to load history: '+err.message,'err'); }
}

function renderBillList(bills){
  const el=$('#hist-list'); if (!el) return;
  el.innerHTML='';
  const count=$('#hs-count');
  if (count) count.textContent = bills?.length ? `${bills.length} bill${bills.length>1?'s':''}` : '';

  if (!bills?.length) {
    el.innerHTML='<div class="empty-state"><div class="ei">📋</div><h3>No Bills Yet</h3><p>Saved bills will appear here</p></div>';
    return;
  }
  bills.forEach((b,i)=>{
    const item=document.createElement('div');
    item.className='hi'; item.style.animation=`fup .3s ${i*18}ms both`; item.dataset.bid=b.id;
    if (histSel.selected.has(b.id)) item.classList.add('selected');

    item.innerHTML=`
      <input type="checkbox" class="hi-check${histSel.mode?' visible':''}" data-bid="${b.id}"
             ${histSel.selected.has(b.id)?'checked':''}>
      <div class="hi-content">
        <div class="hi-top">
          <div class="hi-shop">${esc(b.shop_name)}</div>
          <div class="hi-amt">${fmt(b.total)}</div>
        </div>
        <div class="hi-meta"><span>📅 ${fmtDate(b.date)}</span><span>⏰ ${b.time}</span></div>
      </div>`;

    const cb = item.querySelector('.hi-check');
    cb.addEventListener('change', e => {
      e.stopPropagation();
      if (!histSel.mode) histSel.enter();
      histSel.toggle(b.id, item);
    });
    cb.addEventListener('click', e => e.stopPropagation());

    // Long-press to enter select mode
    let lpTimer = null;
    item.addEventListener('pointerdown', e => {
      if (e.target === cb) return;
      lpTimer = setTimeout(() => { if (!histSel.mode) histSel.enter(); histSel.toggle(b.id, item); }, 600);
    });
    item.addEventListener('pointerup',    () => clearTimeout(lpTimer));
    item.addEventListener('pointerleave', () => clearTimeout(lpTimer));

    item.addEventListener('click', e => {
      if (e.target === cb) return;
      if (histSel.mode) { histSel.toggle(b.id, item); return; }
      $$('.hi').forEach(x=>x.classList.remove('active'));
      item.classList.add('active');
      loadBillDetail(b.id);
    });
    el.appendChild(item);
  });

  // Sync select-all state
  histSel.updateUI();
}

function setupHistoryBulkActions() {
  /* Select All checkbox */
  $('#hist-check-all')?.addEventListener('change', function() {
    const allItems = $$('.hi');
    if (this.checked) {
      if (!histSel.mode) histSel.enter();
      allItems.forEach(item => {
        const bid = Number(item.dataset.bid);
        if (!histSel.selected.has(bid)) histSel.toggle(bid, item);
      });
    } else {
      allItems.forEach(item => {
        const bid = Number(item.dataset.bid);
        if (histSel.selected.has(bid)) histSel.toggle(bid, item);
      });
    }
    histSel.updateUI();
  });

  /* Cancel bulk selection */
  $('#hist-bulk-cancel')?.addEventListener('click', () => histSel.exit());

  /* Delete selected bills */
  $('#hist-bulk-del')?.addEventListener('click', () => {
    const ids = [...histSel.selected];
    if (!ids.length) return;

    const {mo, close} = openModal(`
      <div class="mo-head">
        <div class="mo-title">🗑️ Delete ${ids.length} Bill${ids.length>1?'s':''}?</div>
        <button class="mo-x">✕</button>
      </div>
      <p style="color:var(--t2);margin-bottom:6px">
        This will permanently delete <strong style="color:#ef4444">${ids.length} bill${ids.length>1?'s':''}</strong>.<br>
        <span style="font-size:12px;color:var(--t3)">This cannot be undone.</span>
      </p>
      <div class="mo-foot">
        <button class="btn b-secondary b-sm" id="hb-cancel">Cancel</button>
        <button class="btn b-danger b-sm" id="hb-ok">🗑️ Yes, Delete All</button>
      </div>`);

    mo.querySelector('#hb-cancel').addEventListener('click', close);
    mo.querySelector('#hb-ok').addEventListener('click', async () => {
      const btn = mo.querySelector('#hb-ok');
      btn.disabled = true; btn.textContent = '⏳…';
      let ok = 0;
      for (const id of ids) {
        try { await ipc(window.api.deleteBill, id); ok++; } catch(_) {}
      }
      toast(`${ok} bill${ok>1?'s':''} deleted`, 'info');
      close();
      histSel.exit();
      // Show empty detail panel
      const panel = $('#hist-detail');
      if (panel) panel.innerHTML = `<div class="hs-empty"><div class="empty-state"><div class="ei">📄</div><h3>${T('selectBill')}</h3><p>${T('selectBillSub')}</p></div></div>`;
      await loadHistory();
    });
  });
}

async function loadBillDetail(bid){
  const panel=$('#hist-detail'); if (!panel) return;
  try {
    const det=await ipc(window.api.getBillDetail,bid);
    if (!det) {
      panel.innerHTML=`<div class="hs-empty"><div class="empty-state"><div class="ei">❌</div><h3>${T('billNotFound')}</h3></div></div>`;
      return;
    }
    const rows=(det.items||[]).map(it=>{
      const ta=getTa(it.product_name);
      return `<tr>
        <td><span>${esc(it.product_name)}</span>${ta?`<span class="pname-ta" style="display:block;font-size:10px;color:var(--t3)">${esc(ta)}</span>`:''}</td>
        <td class="r">${it.quantity} kg</td><td class="r">₹${Number(it.price).toFixed(2)}</td>
        <td class="r gr">₹${Number(it.amount).toFixed(2)}</td></tr>`;
    }).join('');

    panel.innerHTML=`
      <div class="bd">
        <div class="bd-top">
          <div>
            <div class="bd-shop">${esc(det.shop_name)}</div>
            <div class="bd-dt">📅 ${fmtDate(det.date)} &nbsp;⏰ ${det.time}</div>
            ${det.note?`<div class="bd-note">📝 ${esc(det.note)}</div>`:''}
          </div>
          <div class="bd-acts">
            <button class="btn b-secondary b-sm" id="bd-share">📤 Share</button>
            <button class="btn b-secondary b-sm" id="bd-print">${T('printBtn')}</button>
            <button class="btn b-danger b-sm"    id="bd-del">${T('delBtn')}</button>
          </div>
        </div>
        <table class="bd-table">
          <thead><tr><th>${T('dProduct')}</th><th class="r">${T('dQty')}</th><th class="r">${T('dRate')}</th><th class="r">${T('dAmount')}</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="bd-tot"><div class="bd-tot-l">${T('dTotal')}</div><div class="bd-tot-r">${fmt(det.total)}</div></div>
        <div class="bd-id">${T('dBill')} #${det.id} &nbsp;·&nbsp; ${det.created_at}</div>
      </div>`;

    panel.querySelector('#bd-share').addEventListener('click',()=>showBillShareModal(det));
    panel.querySelector('#bd-print').addEventListener('click',()=>printBill(det));
    panel.querySelector('#bd-del').addEventListener('click', () => {
      const {mo: delMo, close: delClose} = openModal(`
        <div class="mo-head" style="border-bottom:1px solid rgba(239,68,68,.2);margin-bottom:16px;padding-bottom:14px">
          <div>
            <div class="mo-title">🗑️ ${T('delBillConfirm').replace('?','')}</div>
            <div class="mo-sub">Bill #${det.id} · ${esc(det.shop_name)}</div>
          </div>
          <button class="mo-x">✕</button>
        </div>
        <div style="background:rgba(239,68,68,.07);border:1px solid rgba(239,68,68,.2);border-radius:10px;padding:14px 16px;margin-bottom:18px">
          <p style="color:var(--t2);margin:0;line-height:1.6;font-size:13px">
            This will <strong style="color:#f87171">permanently delete</strong> this bill.<br>
            <span style="font-size:11px;color:var(--t3)">This action cannot be undone.</span>
          </p>
        </div>
        <div class="mo-foot">
          <button class="btn b-secondary b-sm" id="dbd-cancel">Cancel</button>
          <button class="btn b-danger b-sm" id="dbd-ok">🗑️ Yes, Delete</button>
        </div>`);
      delMo.querySelector('#dbd-cancel').addEventListener('click', delClose);
      delMo.querySelector('#dbd-ok').addEventListener('click', async () => {
        const btn = delMo.querySelector('#dbd-ok');
        btn.disabled = true; btn.textContent = '⏳…';
        try {
          await ipc(window.api.deleteBill, det.id);
          toast(T('tBillDeleted'), 'info');
          delClose();
          await loadHistory();
          const panel = $('#hist-detail');
          if (panel) panel.innerHTML = `<div class="hs-empty"><div class="empty-state"><div class="ei">📄</div><h3>${T('selectBill')}</h3><p>${T('selectBillSub')}</p></div></div>`;
        } catch(err) { toast(err.message, 'err'); delClose(); }
      });
    });
  } catch(err) { toast('Failed to load bill: '+err.message,'err'); }
}

/* ════════════════════════════════════════════════════════════
   EXPORT
   ════════════════════════════════════════════════════════════ */
function showExport(){
  const {mo,close}=openModal(`
    <div class="mo-head">
      <div class="mo-title">${T('expTitle')}</div>
      <button class="mo-x">✕</button>
    </div>
    <p style="color:var(--t2);margin-bottom:14px">${T('expSub')}</p>
    <div class="pchoices">
      <div class="pc" id="ex-json"><div class="pc-ic">📋</div><div class="pc-ti">${T('expJson')}</div><div class="pc-de">${T('expJsonSub')}</div></div>
      <div class="pc" id="ex-csv"><div class="pc-ic">📊</div><div class="pc-ti">${T('expCsv')}</div><div class="pc-de">${T('expCsvSub')}</div></div>
      <div class="pc" id="ex-pdf"><div class="pc-ic">📄</div><div class="pc-ti">${T('expPdf')}</div><div class="pc-de">${T('expPdfSub')}</div></div>
    </div>`);
  mo.querySelector('#ex-json').addEventListener('click',async()=>{ close(); try{const r=await ipc(window.api.exportData,'json');if(!r?.cancelled)toast(T('tExpJson'));}catch(err){toast('Export failed: '+err.message,'err');} });
  mo.querySelector('#ex-csv').addEventListener('click',async()=>{  close(); try{const r=await ipc(window.api.exportData,'csv'); if(!r?.cancelled)toast(T('tExpCsv'));}catch(err){toast('Export failed: '+err.message,'err');} });
  mo.querySelector('#ex-pdf').addEventListener('click',async()=>{  close(); try{const r=await ipc(window.api.exportBillsPdf);if(!r?.cancelled)toast(T('tExpPdf'));}catch(err){toast('PDF failed: '+err.message,'err');} });
}

/* ════════════════════════════════════════════════════════════
   STEP 3 — CLEAR ALL DATA BUTTON (FLOATING, BOTTOM-RIGHT)
   ════════════════════════════════════════════════════════════ */
function setupClearDataButton(){
  const btn = document.createElement('button');
  btn.id    = 'clear-data-btn';
  btn.title = 'Clear All App Data';
  btn.innerHTML = '<span class="cdb-icon">🗑️</span><span class="cdb-label">Clear All</span>';
  btn.style.display = 'none';

  let clicks = 0;
  let resetTimer = null;

  function resetBtn(){
    clicks = 0;
    btn.className = '';
    btn.innerHTML = '<span class="cdb-icon">🗑️</span><span class="cdb-label">Clear All</span>';
    btn.title = 'Clear All App Data';
    btn.disabled = false;
  }

  function armReset(){
    clearTimeout(resetTimer);
    resetTimer = setTimeout(resetBtn, 6000);
  }

  btn.addEventListener('click', () => {
    clicks++;
    clearTimeout(resetTimer);

    if (clicks === 1){
      btn.className   = 'warn1';
      btn.innerHTML   = '<span class="cdb-icon">⚠️</span><span class="cdb-label">Sure? (2/3)</span>';
      btn.title       = 'Click 2 more times to activate';
      toast('⚠️ Clear All: click 2 more times to confirm','info',4000);
      armReset();

    } else if (clicks === 2){
      btn.className   = 'warn2';
      btn.innerHTML   = '<span class="cdb-icon">🔴</span><span class="cdb-label">Last chance</span>';
      btn.title       = 'Click once more — all data will be wiped!';
      toast('🔴 Last warning — click once more to wipe ALL data','info',4000);
      armReset();

    } else if (clicks >= 3){
      resetBtn();
      /* STEP 3 — Styled confirmation modal with smooth transition */
      const {mo, close} = openModal(`
        <div class="mo-head">
          <div class="mo-title">💥 Clear All Data?</div>
          <button class="mo-x">✕</button>
        </div>
        <div style="background:rgba(239,68,68,.07);border:1px solid rgba(239,68,68,.2);border-radius:12px;padding:16px;margin-bottom:16px">
          <p style="color:var(--t2);line-height:1.7;margin:0">
            This will permanently delete:<br>
            <strong style="color:#ef4444">• All saved bills<br>• All shops<br>• All price history</strong>
          </p>
        </div>
        <p style="font-size:12px;color:var(--t3);margin-bottom:4px">
          Products list will be kept. The app will restart fresh.
        </p>
        <div class="mo-foot">
          <button class="btn b-secondary b-sm" id="ca-cancel">Cancel</button>
          <button class="btn b-danger"         id="ca-ok">💥 Yes, Wipe Everything</button>
        </div>`);

      mo.querySelector('#ca-cancel').addEventListener('click', close);
      mo.querySelector('#ca-ok').addEventListener('click', async () => {
        const okBtn = mo.querySelector('#ca-ok');
        okBtn.disabled = true; okBtn.textContent = '⏳ Clearing…';
        try {
          await ipc(window.api.clearAllData);
        } catch(err){
          toast('Clear failed: '+err.message,'err');
          close();
        }
      });
    }
  });

  document.body.appendChild(btn);
}

/* ════════════════════════════════════════════════════════════
   BOOT
   ════════════════════════════════════════════════════════════ */
async function init(){
  refreshDateBar();
  setInterval(refreshDateBar, 60000);

  /* STEP 4 — Start mouse parallax */
  setupMouseParallax();

  $('#wb-min')?.addEventListener('click',   ()=>window.api.winMin());
  $('#wb-max')?.addEventListener('click',   ()=>window.api.winMax());
  $('#wb-close')?.addEventListener('click', ()=>window.api.winClose());

  $('#lang-en')?.addEventListener('click',()=>{lang='en';applyLang();});
  $('#lang-ta')?.addEventListener('click',()=>{lang='ta';applyLang();});

  $$('.nb[data-screen]').forEach(btn=>btn.addEventListener('click',()=>navigate(btn.dataset.screen)));
  $('#btn-prices')?.addEventListener('click',async()=>{
    try{const l=await ipc(window.api.getLatestPrices);openPriceEditor(l||[],false);}
    catch(err){toast(err.message,'err');}
  });
  $('#btn-export')?.addEventListener('click',showExport);
  $('#btn-back')?.addEventListener('click',()=>navigate('shop'));
  $('#btn-save-top')?.addEventListener('click',saveBill);
  $('#btn-save-bot')?.addEventListener('click',saveBill);
  $('#btn-reset')?.addEventListener('click',resetBill);

  const hSearch=$('#hist-search');
  if (hSearch) {
    makeInputSafe(hSearch);
    hSearch.addEventListener('input', function(){
      const q=this.value.toLowerCase().trim();
      if (!q) { renderBillList(S.bills); return; }
      renderBillList(S.bills.filter(b=>
        b.shop_name.toLowerCase().includes(q)||b.date.includes(q)||b.time.toLowerCase().includes(q)));
    });
  }

  const noteInp=$('#bill-note');
  if (noteInp) makeInputSafe(noteInp);

  /* STEP 2 — Setup bulk actions */
  setupHistoryBulkActions();
  setupShopBulkActions();

  /* STEP 3 — Setup clear all button */
  setupClearDataButton();

  /* Keyboard shortcuts */
  document.addEventListener('keydown', e=>{
    const tag=document.activeElement?.tagName;
    const isTyping=tag==='INPUT'||tag==='TEXTAREA'||document.activeElement?.isContentEditable;
    if (e.key==='Escape') {
      if (histSel.mode) { histSel.exit(); return; }
      if (shopSel.mode) { shopSel.exit(); return; }
      closeTopModal(); return;
    }
    if (isTyping) return;
    if (e.ctrlKey||e.metaKey) {
      if (e.key==='1') navigate('shop');
      if (e.key==='2') navigate('billing');
      if (e.key==='3') navigate('history');
      if (e.key==='s'&&S.screen==='billing'){e.preventDefault();saveBill();}
    }
  });

  window.addEventListener('focus',()=>{
    const ae=document.activeElement;
    if (ae&&(ae.tagName==='INPUT'||ae.tagName==='TEXTAREA')) {
      ae.blur(); requestAnimationFrame(()=>ae.focus());
    }
  });

  try { S.products=await ipc(window.api.getProducts); }
  catch(err) { toast('Failed to load products: '+err.message,'err'); S.products=[]; }

  await loadShops();
  await checkAndSetupPrices();
}

document.addEventListener('DOMContentLoaded', init);
