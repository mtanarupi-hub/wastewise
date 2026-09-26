const categoryData = {
  rechargeable_batteries: {
    name: "Rechargeable Batteries",
    rules: "Must go to HHW drop-off event. Never put in trash or curbside bin. Prevents fires.",
    accepted: ["Rechargeable AA/AAA batteries", "Button cell batteries", "Lithium batteries", "Power tool batteries", "Phone and laptop batteries"],
    not_accepted: ["Alkaline batteries (regular trash is OK)"],
    nuances: ["Tape each terminal or bag each battery individually before transport", "Found in phones, laptops, power tools, cameras", "DO NOT throw in trash — fire hazard"]
  },
  paint: {
    name: "Paint & Stains",
    rules: "Latex and oil-based paint accepted at HHW events. All items must be labeled. Dried latex paint can go in regular trash.",
    accepted: ["Latex paint", "Oil-based paint", "Stains", "Varnishes", "Lacquers", "Paint thinner", "Spray paint", "Driveway sealer"],
    not_accepted: ["Empty containers", "Dried-out latex paint (regular trash OK)", "Contractor or business generated material"],
    nuances: ["All items must be labeled", "Dried latex paint is OK for regular trash", "No business-generated material accepted"]
  },
  medicine: {
    name: "Medicine & Medications",
    rules: "Never flush medications — it contaminates waterways. Use designated drug take-back locations.",
    accepted: ["Prescription medications", "Over the counter medications", "Vitamins and supplements"],
    not_accepted: ["Needles and syringes (use sharps disposal)", "Some locations only accept pills — call ahead"],
    nuances: ["Flushing medications pollutes Middlesex County waterways", "Many pharmacies and police stations have drop boxes", "Sharps require separate disposal containers"]
  },
  household_hazardous_waste: {
    name: "Household Hazardous Waste",
    rules: "Bring to HHW events only. Never pour down drain or on ground. Put materials in trunk, stay in vehicle at events.",
    accepted: ["Adhesives", "Aerosol cans", "Antifreeze", "Brake fluid", "Car batteries", "Cleaners", "Fire extinguishers", "Fluorescent bulbs (unbroken)", "Gasoline", "Kerosene", "Motor oil", "Paint and paint thinner", "Pesticides", "Pool chemicals", "Propane tanks", "Thermometers", "Thermostats"],
    not_accepted: ["Appliances and furniture", "Computers and electronics", "Empty containers", "Explosives", "Medical waste", "Smoke detectors", "Tires", "Containers over 10 gallons"],
    nuances: ["Materials must go in trunk — cannot roll or spill", "Remain in your vehicle at all times during events", "Asbestos: must pre-register, must be double bagged", "Alkaline batteries are OK for regular trash"]
  },
  electronics: {
    name: "Electronics (E-Waste)",
    rules: "Required by NJ State Law to recycle. Contact your local public works department for your town's program.",
    accepted: ["Computers", "Monitors", "Televisions", "Printers", "Fax machines", "Phones", "Tablets"],
    not_accepted: [],
    nuances: ["Recycling electronics is required by NJ State Law", "Most municipalities have their own program — check with your town", "NJDEP has a list of free drop-off locations for towns without programs"]
  },
  tires: {
    name: "Tires",
    rules: "Maximum 4 tires per household per month. Residents only. Must see attendant before unloading.",
    accepted: ["Automobile tires", "Light truck tires"],
    not_accepted: ["Oversized tires", "Business tires"],
    nuances: ["4 tires per household per month — maximum", "No businesses", "Must see attendant before unloading your vehicle", "Proof of residency may be required"]
  },
  textiles: {
    name: "Textiles & Clothing",
    rules: "Required by law to recycle. Must be clean and dry. Do NOT put in curbside recycling bin. Use donation boxes.",
    accepted: ["Clean dry clothing", "Fabric items at least 1ft x 1ft", "Worn or imperfect clothing"],
    not_accepted: ["Wet or moldy items", "Items smaller than 1ft x 1ft"],
    nuances: ["Every resident AND business must recycle textiles by law", "Do NOT put in curbside recycling", "Hundreds of donation boxes across Middlesex County", "Worn clothing is still recyclable — can be made into rags or padding"]
  },
  cooking_oil: {
    name: "Cooking Oil",
    rules: "Liquid vegetable oils only. Middlesex County residents only. Must show proof of residency.",
    accepted: ["Liquid vegetable oils", "Olive oil", "Canola oil"],
    not_accepted: ["Shortening", "Coconut oil", "Lard", "Motor oil"],
    nuances: ["Proof of Middlesex County residency required", "No businesses", "Must see attendant before unloading"]
  },
  paper_shredding: {
    name: "Paper Shredding",
    rules: "Residential personal paper only. No plastic bags. Bring in a box or crate. Max 5 file boxes or 100 lbs.",
    accepted: ["Personal documents", "Tax documents", "Bank statements", "Paper with paper clips and staples OK"],
    not_accepted: ["Business documents", "Plastic binders", "Sheet protectors", "Newspapers", "Magazines", "Hardcover books", "Junk mail", "Photos", "X-rays", "CDs", "Shredded paper"],
    nuances: ["Shredding done on-site — you can watch", "Stay in your vehicle during the visit", "No plastic bags — box or crate only, containers returned to you", "Paper clips and staples can stay in"]
  }
};

function showCategory(key) {
  const data = categoryData[key];
  if (!data) return;

  document.getElementById('cat-detail-name').textContent = data.name;
  document.getElementById('cat-detail-rules').textContent = data.rules;
  document.getElementById('cat-accepted').innerHTML = data.accepted.map(i => `<li>${i}</li>`).join('');
  document.getElementById('cat-not-accepted').innerHTML = data.not_accepted.map(i => `<li>${i}</li>`).join('');
  document.getElementById('cat-nuances').innerHTML = data.nuances.map(i => `<li>${i}</li>`).join('');

  document.getElementById('cat-detail').style.display = 'block';
  document.querySelector('.info-grid').style.display = 'none';
  document.getElementById('chatbot-wrap').style.display = 'none';
}

function hideCategory() {
  document.getElementById('cat-detail').style.display = 'none';
  document.querySelector('.info-grid').style.display = 'grid';
  document.getElementById('chatbot-wrap').style.display = 'block';
}

// Chatbot
document.getElementById('chat-send-btn').addEventListener('click', sendMessage);
document.getElementById('chat-input').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') sendMessage();
});

async function sendMessage() {
  const input = document.getElementById('chat-input');
  const question = input.value.trim();
  if (!question) return;

  input.value = '';
  addBubble(question, 'user');
  addBubble('Thinking...', 'assistant thinking');

  try {
    const response = await fetch('http://127.0.0.1:5000/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question })
    });
    const data = await response.json();
    removeThinking();
    addBubble(data.answer, 'assistant');
  } catch (err) {
    removeThinking();
    addBubble('Something went wrong. Make sure the backend is running.', 'assistant');
  }
}

function addBubble(text, type) {
  const messages = document.getElementById('chat-messages');
  const bubble = document.createElement('div');
  bubble.className = `chat-bubble ${type}`;
  bubble.textContent = text;
  messages.appendChild(bubble);
  messages.scrollTop = messages.scrollHeight;
}

function removeThinking() {
  const thinking = document.querySelector('.chat-bubble.thinking');
  if (thinking) thinking.remove();
}
