let currentFilter = 'pending';

function getInventory() {
  return JSON.parse(localStorage.getItem('wastewise-inventory') || '[]');
}

function saveInventory(inventory) {
  localStorage.setItem('wastewise-inventory', JSON.stringify(inventory));
}

function renderInventory() {
  const inventory = getInventory();
  const list = document.getElementById('inventory-list');
  const emptyState = document.getElementById('empty-state');

  let filtered = inventory;
  if (currentFilter === 'pending') filtered = inventory.filter(i => !i.disposed);
  if (currentFilter === 'done') filtered = inventory.filter(i => i.disposed);

  if (filtered.length === 0) {
    emptyState.style.display = 'block';
    list.innerHTML = '';
    return;
  }

  emptyState.style.display = 'none';
  list.innerHTML = filtered.map(item => `
    <div class="inventory-card ${item.disposed ? 'disposed' : ''}" data-id="${item.id}">
      <div class="inv-card-top">
        <div class="inv-info">
          <div class="inv-item-name">${item.item_name}</div>
          <div class="inv-category">${item.category}</div>
          <div class="inv-date">Scanned ${item.date_scanned}</div>
        </div>
        <label class="checkbox-wrap">
          <input type="checkbox" ${item.disposed ? 'checked' : ''} onchange="toggleDisposed(${item.id})" />
          <span class="checkmark"></span>
        </label>
      </div>
      <div class="inv-rules">${item.rules_summary}</div>
      ${item.locations && item.locations.length > 0 ? `
        <div class="inv-location">
          <div class="inv-location-name">${item.locations[0].name}</div>
          <div class="inv-location-address">${item.locations[0].address}</div>
          <button class="directions-btn" onclick="openDirections('${item.locations[0].address}')">Get directions</button>
        </div>
      ` : ''}
    </div>
  `).join('');
}

function toggleDisposed(id) {
  const inventory = getInventory();
  const item = inventory.find(i => i.id === id);
  if (item) {
    item.disposed = !item.disposed;
    saveInventory(inventory);
    renderInventory();
  }
}

function openDirections(address) {
  const url = 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(address);
  window.open(url, '_blank');
}

// Filter tabs
document.querySelectorAll('.filter-tab').forEach(tab => {
  tab.addEventListener('click', function() {
    document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
    this.classList.add('active');
    currentFilter = this.dataset.filter;
    renderInventory();
  });
});

// Clear disposed
document.getElementById('clear-done-btn').addEventListener('click', function() {
  const inventory = getInventory().filter(i => !i.disposed);
  saveInventory(inventory);
  renderInventory();
});

renderInventory();