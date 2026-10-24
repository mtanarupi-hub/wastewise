const WW_INV_KEY = 'wastewise-inventory';
const WW_DAYS_KEY = 'wastewise-reminder-days';
const WW_LAST_KEY = 'wastewise-last-notified';
const DAY_MS = 24 * 60 * 60 * 1000;

function wwGetInventory() {
  try { return JSON.parse(localStorage.getItem(WW_INV_KEY) || '[]'); }
  catch { return []; }
}

function wwSaveInventory(inv) {
  localStorage.setItem(WW_INV_KEY, JSON.stringify(inv));
}

function wwGetReminderDays() {
  const v = localStorage.getItem(WW_DAYS_KEY);
  return v === null ? 7 : parseInt(v, 10);
}

function wwDueAt(item) {
  return item.snooze_until || Number(item.id) + wwGetReminderDays() * DAY_MS;
}

function wwDaysLeft(item) {
  return Math.ceil((wwDueAt(item) - Date.now()) / DAY_MS);
}

function wwDueItems() {
  return wwGetInventory().filter(i => !i.disposed && wwDaysLeft(i) <= 0);
}

function wwUpdateBell() {
  const badge = document.getElementById('reminder-badge');
  if (!badge) return;
  const n = wwDueItems().length;
  badge.textContent = n;
  badge.style.display = n > 0 ? 'flex' : 'none';
}

function wwSendReminder() {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const due = wwDueItems();
  const today = new Date().toDateString();
  if (due.length === 0 || localStorage.getItem(WW_LAST_KEY) === today) return;

  const names = due.slice(0, 3).map(i => i.item_name).join(', ');
  const more = due.length > 3 ? ` and ${due.length - 3} more` : '';
  new Notification('WasteWise reminder', { body: `Ready for drop-off: ${names}${more}` });
  localStorage.setItem(WW_LAST_KEY, today);
}

function wwLocUrl(loc) {
  if (loc.link) return loc.link;
  return 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(loc.address || loc.name);
}
function wwLocLabel(loc) {
  return loc.link ? 'Find locations' : 'Get directions';
}
function wwOpenLoc(loc) {
  window.open(wwLocUrl(loc), '_blank');
}

(async function wwRefreshOldLocations() {
  const inv = wwGetInventory();
  const stale = inv.filter(i => i.category_key && i.locations && i.locations.some(l => 'lat' in l));
  if (!stale.length) return;
  try {
    const res = await fetch('/categories');
    const cats = (await res.json()).categories;
    stale.forEach(i => { if (cats[i.category_key]) i.locations = cats[i.category_key].locations; });
    wwSaveInventory(inv);
    if (typeof renderInventory === 'function') renderInventory();
    if (typeof renderList === 'function') renderList();
  } catch (e) { }
})();

wwUpdateBell();
wwSendReminder();