const photoInput = document.getElementById('photo-input');
const uploadState = document.getElementById('upload-state');
const previewState = document.getElementById('preview-state');
const resultsState = document.getElementById('results-state');
const errorState = document.getElementById('error-state');
const previewImg = document.getElementById('preview-img');
const analyzingMsg = document.getElementById('analyzing-msg');

// When user picks a photo
photoInput.addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(ev) {
    previewImg.src = ev.target.result;
    showState('preview');
    analyzeImage(ev.target.result);
  };
  reader.readAsDataURL(file);
});

// Send image to backend
async function analyzeImage(base64DataUrl) {
  analyzingMsg.style.display = 'block';

  try {
    const response = await fetch('/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64DataUrl })
    });

    if (!response.ok) throw new Error('Server error');

    const data = await response.json();
    showResults(data);

  } catch (err) {
    console.error(err);
    showState('error');
    document.getElementById('error-msg').textContent =
      'Something went wrong analyzing your item. Make sure the backend is running and try again.';
  }
}

// Display results
function showResults(data) {
  const addBtn = document.getElementById('add-inventory-btn');
  const locContainer = document.getElementById('result-locations');
  locContainer.innerHTML = '';

  document.getElementById('result-name').textContent = data.item_name || 'Unknown item';

  // Item is not in any special disposal category (e.g. cardboard)
  if (!data.found) {
    document.getElementById('result-category').textContent = 'Category: Regular recycling or trash';
    document.getElementById('result-rules').textContent = data.message;
    locContainer.innerHTML = '<div class="result-rules">No special drop-off needed.</div>';
    addBtn.style.display = 'none';
    showState('results');
    return;
  }

  document.getElementById('result-category').textContent = 'Category: ' + data.display_name;
  document.getElementById('result-rules').textContent = data.rules_summary;

  if (data.locations && data.locations.length > 0) {
    data.locations.forEach(loc => {
      const card = document.createElement('div');
      card.className = 'location-card';
      card.innerHTML = `
        <div class="location-name">${loc.name}</div>
        ${loc.address ? `<div class="location-address">${loc.address}</div>` : ''}
        <div class="location-hours">${loc.hours || ''}</div>
        <button class="directions-btn">${wwLocLabel(loc)}</button>
      `;
      card.querySelector('.directions-btn').onclick = () => wwOpenLoc(loc);
      locContainer.appendChild(card);
    });
  } else {
    locContainer.innerHTML = '<div class="result-rules">Contact your local municipality for drop-off options.</div>';
  }

  addBtn.style.display = 'block';
  addBtn.onclick = function() {
    saveToInventory(data);
    alert('Added to your inventory!');
  };

  showState('results');
}

// Save item to localStorage inventory
function saveToInventory(data) {
  const inventory = JSON.parse(localStorage.getItem('wastewise-inventory') || '[]');
  inventory.push({
    id: Date.now(),
    item_name: data.item_name,
    category: data.display_name,
    category_key: data.category_key,
    rules_summary: data.rules_summary,
    locations: data.locations,
    date_scanned: new Date().toLocaleDateString(),
    disposed: false
  });
  localStorage.setItem('wastewise-inventory', JSON.stringify(inventory));
}

// Switch between UI states
function showState(state) {
  uploadState.style.display = 'none';
  previewState.style.display = 'none';
  resultsState.style.display = 'none';
  errorState.style.display = 'none';

  if (state === 'upload') uploadState.style.display = 'block';
  if (state === 'preview') previewState.style.display = 'block';
  if (state === 'results') resultsState.style.display = 'block';
  if (state === 'error') errorState.style.display = 'block';
}

// Rescan buttons
document.getElementById('rescan-btn-2').onclick = () => showState('upload');
document.getElementById('error-retry-btn').onclick = () => showState('upload');