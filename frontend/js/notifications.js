const freqSelect = document.getElementById('freq');
const enableBtn = document.getElementById('enable-btn');
const permStatus = document.getElementById('perm-status');

function esc(s) {
  const d = document.createElement('div');
  d.textContent = s ?? '';
  return d.innerHTML;
}

function renderPermission() {
  if (!('Notification' in window)) {
    permStatus.textContent = 'Not supported in this browser';
    enableBtn.disabled = true;
    return;
  }
  const p = Notification.permission;
  if (p === 'granted') {
    permStatus.textContent = 'On';
    enableBtn.textContent = 'Send test';
    enableBtn.disabled = false;
  } else if (p === 'denied') {
    permStatus.textContent = 'Blocked. Allow notifications in browser site settings.';
    enableBtn.disabled = true;
  } else {
    permStatus.textContent = 'Off';
    enableBtn.textContent = 'Turn on';
  }
}

enableBtn.onclick = async () => {
  if (Notification.permission === 'granted') {
    new Notification('WasteWise', { body: 'Notifications are working.' });
    return;
  }
  await Notification.requestPermission();
  renderPermission();
  wwSendReminder();
};

freqSelect.value = String(wwGetReminderDays());
freqSelect.onchange = () => {
  localStorage.setItem(WW_DAYS_KEY, freqSelect.value);
  localStorage.removeItem(WW_LAST_KEY);
  renderList();
  wwSendReminder();
};

function whenText(days) {
  if (days < 0) return `${-days} day${days === -1 ? '' : 's'} overdue`;
  if (days === 0) return 'Due today';
  return `In ${days} day${days === 1 ? '' : 's'}`;
}

function card(item) {
  const days = wwDaysLeft(item);
  const due = days <= 0;
  const loc = item.locations && item.locations[0];
  const cat = item.display_name || item.category || '';
  return `
    <div class="notif-card ${due ? 'overdue' : ''}">
      <div class="notif-card-top">
        <span class="notif-item">${esc(item.item_name)}</span>
        <span class="notif-when">${whenText(days)}</span>
      </div>
      <div class="notif-cat">${esc(cat)}${loc ? ' &middot; ' + esc(loc.name) : ''}</div>
      <div class="notif-actions">
        <button class="notif-btn" data-action="done" data-id="${item.id}">Mark disposed</button>
        ${due ? `<button class="notif-btn secondary" data-action="snooze" data-id="${item.id}">Snooze 3 days</button>` : ''}
        ${loc ? `<button class="notif-btn secondary" data-action="directions" data-id="${item.id}">${wwLocLabel(loc)}</button>` : ''}
      </div>
    </div>`;
}

function renderList() {
  const pending = wwGetInventory()
    .filter(i => !i.disposed)
    .sort((a, b) => wwDueAt(a) - wwDueAt(b));
  const due = pending.filter(i => wwDaysLeft(i) <= 0);
  const upcoming = pending.filter(i => wwDaysLeft(i) > 0);

  document.getElementById('due-list').innerHTML =
    due.map(card).join('') || '<div class="notif-sub">Nothing due right now.</div>';
  document.getElementById('upcoming-list').innerHTML =
    upcoming.map(card).join('') || '<div class="notif-sub">No other items waiting.</div>';

  const count = document.getElementById('due-count');
  count.textContent = due.length;
  count.style.display = due.length ? 'inline-block' : 'none';

  document.getElementById('notif-sections').style.display = pending.length ? 'block' : 'none';
  document.getElementById('notif-empty').style.display = pending.length ? 'none' : 'block';
  wwUpdateBell();
}

document.addEventListener('click', e => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const inv = wwGetInventory();
  const item = inv.find(i => String(i.id) === btn.dataset.id);
  if (!item) return;

  if (btn.dataset.action === 'directions') {
    wwOpenLoc(item.locations[0]);
    return;
  }
  if (btn.dataset.action === 'done') item.disposed = true;
  if (btn.dataset.action === 'snooze') item.snooze_until = Date.now() + 3 * DAY_MS;

  wwSaveInventory(inv);
  renderList();
});

renderPermission();
renderList();