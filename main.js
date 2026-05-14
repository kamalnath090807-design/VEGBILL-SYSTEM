'use strict';
const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs   = require('fs');
const os   = require('os');

let win = null;
let DB  = null;

function createWindow() {
  win = new BrowserWindow({
    width: 1400, height: 900,
    minWidth: 1050, minHeight: 680,
    frame: false,
    backgroundColor: '#080d1a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      spellcheck: false
    }
  });
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  win.on('closed', () => { win = null; });

  /* OS window focus → re-deliver keyboard to renderer */
  win.on('focus', () => {
    if (win && !win.isDestroyed()) win.webContents.focus();
  });
}

app.whenReady().then(() => { DB = require('./db'); createWindow(); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (!win) createWindow(); });

/* ── Window controls ── */
ipcMain.on('win-min',   () => win?.minimize());
ipcMain.on('win-max',   () => win?.isMaximized() ? win.unmaximize() : win?.maximize());
ipcMain.on('win-close', () => win?.close());

/* ── THE KEY FIX: renderer asks main to re-deliver IME focus ──────────────
   Called after every innerHTML replacement that destroys a focused element.
   win.webContents.focus() re-initialises Electron's keyboard pipeline.     */
ipcMain.on('win-refocus', () => {
  if (win && !win.isDestroyed()) win.webContents.focus();
});

/* ── IPC helper ── */
function handle(channel, fn) {
  ipcMain.handle(channel, async (_e, ...args) => {
    try   { return { ok: true,  data: await fn(...args) }; }
    catch (err) {
      console.error(`[${channel}]`, err.message);
      return { ok: false, error: err.message };
    }
  });
}

handle('shops:all',    ()   => DB.getAllShops());
handle('shops:add',    (d)  => DB.addShop(d));
handle('shops:update', (d)  => DB.updateShop(d));
handle('shops:delete', (id) => DB.deleteShop(id));

handle('products:all', ()  => DB.getAllProducts());

handle('prices:latest',  ()    => DB.getLatestPrices());
handle('prices:forDate', (d)   => DB.getPricesForDate(d));
handle('prices:save',    (arr) => DB.savePrices(arr));

handle('bills:save',   (b)  => DB.saveBill(b));
handle('bills:all',    ()   => DB.getAllBills());
handle('bills:detail', (id) => DB.getBillDetail(id));
handle('bills:delete', (id) => DB.deleteBill(id));

/* ── RESTART — used after any delete operation ── */
ipcMain.on('win-restart', () => {
  app.relaunch();
  app.quit();
});

/* ── CLEAR ALL DATA — wipes shops, bills, prices; keeps products ── */
handle('data:clearAll', async () => {
  DB.clearAllData();
  /* Full app restart after wipe */
  setTimeout(() => {
    app.relaunch();
    app.quit();
  }, 400);
  return true;
});

/* ── Save bill PNG ── */
handle('bill:saveImage', async ({ dataUrl, fileName }) => {
  const { filePath, canceled } = await dialog.showSaveDialog(win, {
    defaultPath: fileName || 'bill.png',
    filters: [{ name: 'PNG Image', extensions: ['png'] }]
  });
  if (canceled || !filePath) return { cancelled: true };
  const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
  fs.writeFileSync(filePath, Buffer.from(base64, 'base64'));
  return { filePath };
});

/* ── Open WhatsApp ── */
handle('bill:openWhatsApp', async ({ phone, message }) => {
  const cleaned = (phone || '').replace(/\D/g, '');
  const encoded = encodeURIComponent(message || '');
  const url = cleaned ? `https://wa.me/${cleaned}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
  shell.openExternal(url);
  return { ok: true };
});

/* ── PDF export ── beautiful design with Tamil names + colors ── */
handle('bills:exportPdf', async () => {
  const ts = new Date().toISOString().replace(/[:.]/g,'-').slice(0,19);
  const { filePath, canceled } = await dialog.showSaveDialog(win, {
    defaultPath: `veg-bills-${ts}.pdf`,
    filters: [{ name: 'PDF', extensions: ['pdf'] }]
  });
  if (canceled || !filePath) return { cancelled: true };

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
  const tName = n => TA[n] || '';
  const esc   = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  const bills      = DB.getAllBills().map(b => ({ ...b, items: DB.getBillDetail(b.id)?.items || [] }));
  const grandTotal = bills.reduce((s, b) => s + Number(b.total), 0);
  const totalItems = bills.reduce((s, b) => s + b.items.length, 0);

  const rowsHtml = bills.map((b, bi) => {
    const stripe = bi % 2 === 0 ? '#f8fffd' : '#ffffff';
    if (!b.items.length) {
      return `<tr style="background:${stripe}">
        <td class="cid">${b.id}</td><td class="cshop">${esc(b.shop_name)}</td>
        <td class="cdate">${b.date}</td><td class="ctime">${b.time}</td>
        <td colspan="4" style="color:#aaa;font-style:italic;font-size:8px">No items</td>
        <td class="r tot">₹${Number(b.total).toFixed(2)}</td></tr>`;
    }
    return b.items.map((it, idx) => {
      const taName  = tName(it.product_name);
      const prodCell = taName
        ? `<b style="color:#0f4c35">${esc(it.product_name)}</b><br><span style="font-size:7.5px;color:#777">${esc(taName)}</span>`
        : `<b>${esc(it.product_name)}</b>`;
      return `<tr style="background:${stripe}">
        ${idx===0 ? `
          <td class="cid" rowspan="${b.items.length}" style="border-left:3px solid #00d4a0;vertical-align:middle">${b.id}</td>
          <td class="cshop" rowspan="${b.items.length}" style="vertical-align:middle;font-weight:700">${esc(b.shop_name)}${b.note?`<br><span style="font-size:7px;color:#888;font-weight:400">📝 ${esc(b.note)}</span>`:''}</td>
          <td class="cdate" rowspan="${b.items.length}" style="vertical-align:middle">${b.date}</td>
          <td class="ctime" rowspan="${b.items.length}" style="vertical-align:middle">${b.time}</td>` : ''}
        <td class="cprod">${prodCell}</td>
        <td class="r cqty">${it.quantity}&nbsp;kg</td>
        <td class="r crate">₹${Number(it.price).toFixed(2)}</td>
        <td class="r camt">₹${Number(it.amount).toFixed(2)}</td>
        ${idx===0 ? `<td class="r tot" rowspan="${b.items.length}" style="vertical-align:middle">₹${Number(b.total).toFixed(2)}</td>` : ''}
      </tr>`;
    }).join('');
  }).join('');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Segoe UI',Arial,sans-serif;font-size:9.5px;color:#1a1a1a;background:#fff}
    .ph{background:linear-gradient(135deg,#064e3b 0%,#0c4a6e 55%,#312e81 100%);
        color:#fff;padding:16px 20px 12px;margin-bottom:14px}
    .ph h1{font-size:19px;font-weight:800;letter-spacing:-.5px}
    .ph .sub{font-size:9px;opacity:.75;margin-top:2px}
    .stats{display:flex;gap:16px;margin-top:10px}
    .st{background:rgba(255,255,255,.13);border-radius:7px;padding:5px 12px}
    .sv{font-size:14px;font-weight:800}.sk{font-size:7.5px;opacity:.7;text-transform:uppercase;letter-spacing:.4px}
    table{width:100%;border-collapse:collapse}
    thead tr{background:linear-gradient(90deg,#064e3b,#0c4a6e);color:#fff}
    th{padding:7px 5px;text-align:left;font-weight:700;font-size:8px;text-transform:uppercase;letter-spacing:.3px}
    th.r{text-align:right}
    td{padding:4px 5px;border-bottom:1px solid #e0f2ed;vertical-align:top}
    .r{text-align:right}
    .cid{width:26px;font-weight:800;color:#064e3b;font-size:10px}
    .cshop{width:85px}.cdate{width:68px;color:#555}.ctime{width:55px;color:#555}
    .cprod{width:125px}.cqty{width:38px;color:#374151}
    .crate{width:46px;color:#374151}.camt{width:54px;color:#059669;font-weight:600}
    .tot{width:60px;font-weight:800;color:#064e3b;font-size:10.5px;
         background:linear-gradient(135deg,#ecfdf5,#d1fae5)!important}
    .pf{margin-top:12px;padding:8px 0;border-top:2px solid #00d4a0;
        display:flex;justify-content:space-between;align-items:center}
    .pf .brand{font-weight:700;color:#064e3b;font-size:9px}
    .pf .grand{font-size:13px;font-weight:800;color:#064e3b}
    .pf .gl{font-size:7.5px;color:#888;text-transform:uppercase;letter-spacing:.3px}
    @page{size:A4 landscape;margin:8mm 10mm}
    @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
  </style></head><body>

  <div class="ph">
    <h1>🥦 VegBill Pro — Bill History</h1>
    <div class="sub">Exported: ${new Date().toLocaleString('en-IN')} &nbsp;|&nbsp; ${bills.length} bill${bills.length!==1?'s':''}</div>
    <div class="stats">
      <div class="st"><div class="sv">${bills.length}</div><div class="sk">Bills</div></div>
      <div class="st"><div class="sv">${totalItems}</div><div class="sk">Line Items</div></div>
      <div class="st"><div class="sv">₹${grandTotal.toLocaleString('en-IN',{minimumFractionDigits:2})}</div><div class="sk">Grand Total</div></div>
    </div>
  </div>

  <table>
    <thead><tr>
      <th class="cid">#</th><th class="cshop">Shop</th><th class="cdate">Date</th>
      <th class="ctime">Time</th><th class="cprod">Product / பொருள்</th>
      <th class="r cqty">Qty</th><th class="r crate">Rate/kg</th>
      <th class="r camt">Amount</th><th class="r tot">Bill Total</th>
    </tr></thead>
    <tbody>${rowsHtml}</tbody>
  </table>

  <div class="pf">
    <div class="brand">🥦 VegBill Pro · Vegetable Wholesale Billing System</div>
    <div style="text-align:right">
      <div class="gl">Grand Total</div>
      <div class="grand">₹${grandTotal.toLocaleString('en-IN',{minimumFractionDigits:2})}</div>
    </div>
  </div>
  </body></html>`;

  const tmpHtml = path.join(os.tmpdir(), `vegbill-${Date.now()}.html`);
  fs.writeFileSync(tmpHtml, html, 'utf8');
  const pdfWin = new BrowserWindow({ show: false, webPreferences: { sandbox: false } });
  await pdfWin.loadFile(tmpHtml);
  const pdfData = await pdfWin.webContents.printToPDF({
    pageSize: 'A4', landscape: true, printBackground: true
  });
  pdfWin.destroy();
  try { fs.unlinkSync(tmpHtml); } catch(_) {}
  fs.writeFileSync(filePath, pdfData);
  return { filePath };
});

handle('export', async (type) => {
  const ts  = new Date().toISOString().replace(/[:.]/g,'-').slice(0,19);
  const ext = type === 'csv' ? 'csv' : 'json';
  const { filePath, canceled } = await dialog.showSaveDialog(win, {
    defaultPath: `veg-bills-${ts}.${ext}`,
    filters: [{ name: ext.toUpperCase(), extensions: [ext] }]
  });
  if (canceled || !filePath) return { cancelled: true };

  const bills = DB.getAllBills().map(b => ({ ...b, items: DB.getBillDetail(b.id)?.items || [] }));
  let content;
  if (type === 'json') {
    content = JSON.stringify(bills, null, 2);
  } else {
    const q = v => `"${String(v??'').replace(/"/g,'""')}"`;
    const rows = ['BillID,Shop,Date,Time,Product,Qty,Rate,Amount,BillTotal'];
    bills.forEach(b => {
      if (!b.items.length) rows.push([b.id,q(b.shop_name),q(b.date),q(b.time),'','','','',b.total].join(','));
      else b.items.forEach(it => rows.push([b.id,q(b.shop_name),q(b.date),q(b.time),q(it.product_name),it.quantity,it.price,it.amount,b.total].join(',')));
    });
    content = rows.join('\n');
  }
  fs.writeFileSync(filePath, content, 'utf8');
  return { filePath };
});
