'use strict';
const { contextBridge, ipcRenderer } = require('electron');

const call = (ch, ...args) => ipcRenderer.invoke(ch, ...args);

contextBridge.exposeInMainWorld('api', {
  winMin:   () => ipcRenderer.send('win-min'),
  winMax:   () => ipcRenderer.send('win-max'),
  winClose: () => ipcRenderer.send('win-close'),
  restartApp: () => ipcRenderer.send('win-restart'),

  /* THE FIX: lets renderer tell main to re-deliver keyboard focus */
  refocus:  () => ipcRenderer.send('win-refocus'),

  getShops:    ()  => call('shops:all'),
  addShop:     d   => call('shops:add',    d),
  updateShop:  d   => call('shops:update', d),
  deleteShop:  id  => call('shops:delete', id),

  getProducts: ()  => call('products:all'),

  getLatestPrices:  ()  => call('prices:latest'),
  getPricesForDate: d   => call('prices:forDate', d),
  savePrices:       arr => call('prices:save',    arr),

  saveBill:      b   => call('bills:save',   b),
  getAllBills:    ()  => call('bills:all'),
  getBillDetail: id  => call('bills:detail', id),
  deleteBill:    id  => call('bills:delete', id),

  saveBillImage:  d   => call('bill:saveImage',    d),
  openWhatsApp:   d   => call('bill:openWhatsApp', d),
  exportBillsPdf: ()  => call('bills:exportPdf'),
  exportData:   type  => call('export', type),

  /* Clear all user data and restart */
  clearAllData: () => call('data:clearAll'),
});
