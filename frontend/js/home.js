
const HHW_EVENTS = [
    { date: '2026-03-15', place: 'Middlesex College, Edison' },
    { date: '2026-05-16', place: 'County Public Works, North Brunswick' },
    { date: '2026-09-19', place: 'County Public Works, Sayreville' },
    { date: '2026-11-15', place: 'Middlesex College, Edison' }
  ];
  
  const CATEGORY_GROUPS = [
    {
      title: 'Handle with care',
      note: 'Never put these in the trash.',
      style: 'careful',
      items: [
        ['rechargeable_batteries', 'Batteries'],
        ['paint', 'Paint'],
        ['household_hazardous_waste', 'Hazardous waste'],
        ['medicine', 'Medicine']
      ]
    },
    {
      title: 'Everyday drop-offs',
      note: 'Special programs, not your curbside bin.',
      style: 'everyday',
      items: [
        ['electronics', 'Electronics'],
        ['tires', 'Tires'],
        ['textiles', 'Clothing and textiles'],
        ['cooking_oil', 'Cooking oil'],
        ['paper_shredding', 'Paper shredding']
      ]
    }
  ];
  
  const ICON_CAREFUL = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
  const ICON_EVERYDAY = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>';
  const ICON_LIST = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>';
  
  function renderNextEvent() {
    const el = document.getElementById('next-event');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const next = HHW_EVENTS
      .map(e => ({ ...e, d: new Date(e.date + 'T00:00:00') }))
      .find(e => e.d >= today);
  
    if (!next) {
      el.innerHTML = `
        <div class="status-icon">${ICON_CAREFUL}</div>
        <div>
          <div class="status-head">Hazardous waste drop-off</div>
          <div class="status-body">Next dates will be posted on <a href="https://www.middlesexcountynj.gov/recycle" target="_blank">the county site</a>.</div>
        </div>`;
      return;
    }
  
    const month = next.d.toLocaleDateString('en-US', { month: 'short' });
    const weekday = next.d.toLocaleDateString('en-US', { weekday: 'long' });
    const days = Math.round((next.d - today) / 86400000);
    const when = days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `In ${days} days`;
  
    el.innerHTML = `
      <div class="status-date"><b>${next.d.getDate()}</b><span>${month}</span></div>
      <div>
        <div class="status-head">Hazardous waste drop-off</div>
        <div class="status-body">${weekday}, 8 am to 2 pm at ${next.place}. ${when}.</div>
      </div>`;
  }
  
  function renderMyItems() {
    const el = document.getElementById('my-items-row');
    const pending = wwGetInventory().filter(i => !i.disposed);
    const due = pending.filter(i => wwDaysLeft(i) <= 0).length;
  
    let body = 'Nothing saved yet. Scan an item to add it.';
    if (pending.length) {
      body = `${pending.length} item${pending.length === 1 ? '' : 's'} waiting for drop-off`;
      if (due) body += `, <span class="status-due">${due} due now</span>`;
    }
  
    el.innerHTML = `
      <div class="status-icon">${ICON_LIST}</div>
      <div>
        <div class="status-head">My items</div>
        <div class="status-body">${body}</div>
      </div>`;
  }
  
  function renderCategories() {
    document.getElementById('category-groups').innerHTML = CATEGORY_GROUPS.map(g => `
      <div class="cat-group">
        <div class="cat-group-title">${g.title}</div>
        <div class="cat-group-note">${g.note}</div>
        <div class="cat-grid">
          ${g.items.map(([key, label]) => `
            <a class="cat-btn ${g.style}" href="info.html?cat=${key}">
              <span class="cat-icon">${g.style === 'careful' ? ICON_CAREFUL : ICON_EVERYDAY}</span>
              ${label}
            </a>`).join('')}
        </div>
      </div>`).join('');
  }
  
  renderNextEvent();
  renderMyItems();
  renderCategories();