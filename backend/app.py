import os
import json
import time
from datetime import date

from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from google import genai

load_dotenv()

app = Flask(__name__)
CORS(app)

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

MODELS = ["gemini-flash-latest", "gemini-flash-lite-latest"]


def generate(contents):
    """Call Gemini with retry on 503 and fallback to the lite model."""
    last_error = None
    for model in MODELS:
        for attempt in range(3):
            try:
                return client.models.generate_content(model=model, contents=contents)
            except Exception as e:
                last_error = e
                if "503" in str(e) or "UNAVAILABLE" in str(e):
                    time.sleep(2 ** attempt)
                    continue
                raise
    raise last_error


# Load disposal data from the JSON file sitting next to this script
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(BASE_DIR, "disposal_data.json"), "r", encoding="utf-8") as f:
    DISPOSAL_DATA = json.load(f)

CATEGORIES = DISPOSAL_DATA["categories"]
CATEGORY_KEYS = list(CATEGORIES.keys())


COUNTY_CONTEXT = """You are a waste disposal assistant for Middlesex County, New Jersey.
You only answer questions about waste disposal and recycling in Middlesex County.
Only ever give locations inside Middlesex County. Never suggest sites in other counties (Somerset County, Essex County, Sussex County, Union County, Monmouth County, etc.).
If a question is not about waste disposal, politely say you can only help with disposal questions.
Keep answers short, clear, and helpful. Use plain text, no markdown symbols like ** or #. Never use em dashes or en dashes; use commas or periods instead.

WHEN SOMEONE ASKS WHERE OR WHEN TO DROP SOMETHING OFF:
- Give the specific location(s), address, and hours/date from the data below.
- Only mention dates that are still upcoming based on today's date. Do not suggest events that already passed.
- If they ask about an item with several locations, list the closest-matching ones and their hours.
- End with: "Always confirm on middlesexcountynj.gov/recycle or call 732-745-4170 before you go, since schedules can change."
- If the data below does not cover the question, say so and point them to that website or phone number. Never invent locations, dates, or hours.

=== HOUSEHOLD HAZARDOUS WASTE (HHW) EVENTS - 2026 SCHEDULE ===
Time at every event: 8 am - 2 pm, rain or shine. Free. Middlesex County residents only (residential license plates only, no commercial vehicles).
- Sun, March 15, 2026: Middlesex College, 2600 Woodbridge Avenue, Edison 08837
- Sat, May 16, 2026: Middlesex County Public Works, 97 Apple Orchard Lane, North Brunswick 08902
- Sat, Sept 19, 2026: Middlesex County Public Works, 750 Jernee Mill Road, Sayreville 08872
- Sun, Nov 15, 2026: Middlesex College, 2600 Woodbridge Avenue, Edison 08837
Rules: put materials in the trunk or truck bed and stay in your vehicle. No containers over 10 gallons. Asbestos must be pre-registered and double bagged.
Bring a non-perishable food item to donate to REPLENISH, the county food bank.
Accepted: adhesives, aerosol cans, antifreeze, brake fluid, car batteries, cleaners, drain cleaners, fire extinguishers, road flares, unbroken fluorescent bulbs, gasoline, gas/oil mix, kerosene, lighter fluid, mercury, motor oil/filters, paint and thinner, pesticides/herbicides, photographic chemicals, pool chemicals, propane tanks, stains/varnishes, thermometers, thermostats.
NOT accepted: appliances/furniture, computers/electronics, empty containers, explosives, medical waste, smoke detectors, tires.

=== RECHARGEABLE AND BUTTON CELL BATTERIES ===
Accepted at the HHW events above. Never put in trash or curbside bin (fire risk). Tape each terminal or bag each battery individually.
Alkaline batteries (AA, AAA, C, D, 9-V) can go in regular trash.
Damaged or swelling batteries: call 732-745-4170 or the County Hazardous Materials Unit at 732-727-6626.
Retail drop-off locator: 1-877-2-RECYCLE (1-877-273-2925).

=== TIRES ===
Rules: 4 tires per household per month, residents only, no businesses, see an attendant before unloading. Automobile and light truck tires only, no oversized tires.
Locations:
- East Brunswick Recycling Center, 357 Dunhams Corner Road, East Brunswick 08816: Mon-Sat 7:30 am - 3:30 pm
- Plainsboro Conservation Center, off Grovers Mill Road, Plainsboro 08536: Summer hours (April 1 - Nov 30): Mon and Thu 5:30 - 7:30 pm, Sat 10 am - 5 pm. Winter hours (Dec 1 - Mar 30): Sat 10 am - 2 pm
- Sayreville Recycling Center (Fort Grumpy), 3750 Bordentown Avenue, Sayreville 08872: Mon and Fri 7:30 am - 1 pm; 1st and 3rd Sat 7 am - 12 pm
- Woodbridge Public Works, 225 Smith Street, Keasbey 08832: Mon-Sat 8 am - 2 pm
All tire sites are closed Sundays and holidays.

=== PAINT DROP-OFF ===
Free, residents only, 8 am - 12 pm. Items must be labeled. Accepted: latex, oil-based, stains, varnishes, lacquers, thinners, spray paint, driveway sealer. NOT accepted: empty containers, dried-out latex paint (regular trash is OK), contractor/business material.
Monthly schedule:
- First Friday: Sayreville Recycling Center (Fort Grumpy), 3750 Bordentown Ave, Sayreville
- First Saturday: Middlesex Borough Recycling Center, 1200 Mountain Ave, Middlesex; East Brunswick Recycling Center, 357 Dunhams Corner Rd, East Brunswick
- Second Saturday: Dunellen Public Works, 235 Hall St, Dunellen; New Brunswick Public Works, 400 Jersey Ave, New Brunswick; Old Bridge Recycling Center, 1 Old Bridge Plaza, Old Bridge
- Third Saturday: South Plainfield Recycling Center, 882 Kenneth Ave, South Plainfield; Helmetta Borough Hall, 51 Main St, Helmetta; Monroe Public Works, 76 Gravel Hill-Spotswood Rd, Monroe
- Fourth Saturday: Woodbridge Public Works, 225 Smith St, Keasbey; South Brunswick Recycling Center, 540 Ridge Rd, Monmouth Junction

=== COOKING OIL ===
Liquid vegetable oils only (no shortening, coconut oil, lard, or motor oil). Middlesex County residents only, proof of residency required, no businesses, see an attendant before unloading.
- East Brunswick Recycling Center, 357 Dunhams Corner Rd, East Brunswick: every Saturday 8 am - 12 pm
- Monroe Department of Public Works, 76 Gravel Hill-Spotswood Rd, Monroe: every Friday 8 am - 12 pm
- Old Bridge Recycling Center, 1 Old Bridge Plaza, Old Bridge: every Saturday 8 am - 12 pm
- South Plainfield Recycling Center, 882 Kenneth Ave, South Plainfield: every Friday 8 am - 12 pm
- Woodbridge Public Works, 225 Smith St, Keasbey: every Saturday 8 am - 12 pm

=== PAPER SHREDDING ===
Residential personal paper only, county residents only, no businesses. Shredding is done on site and you stay in your vehicle.
Limit 5 file boxes or 100 lbs per vehicle. No plastic bags (use a box or crate, returned to you). Paper clips and staples can stay in.
Do NOT bring: plastic binders, sheet protectors, newspapers, magazines, hardcover books, junk mail, photos, X-rays, CDs, shredded paper, garbage.
Events happen several times a year. The only 2026 event in the data was Sun, March 22, 2026, 9 am - 12 pm at the Old Bridge Recycling Center, 1 Old Bridge Plaza (already passed). For upcoming dates, send people to the events calendar on middlesexcountynj.gov/recycle.

=== ELECTRONICS (E-WASTE) ===
Recycling computers, monitors, TVs, printers, and fax machines is required by NJ law. Most towns have their own program, so contact your local public works department first.
If your town has no program, the NJDEP lists free drop-off locations. Examples:
- Staples stores: printers, computers, monitors, fax machines only (no TVs)
- NewTech Recycling, 732-564-3110, all covered electronics
- AIT Electronic Recycling, 908-533-9373: computers, laptops, servers, hard drives, phones, tablets (no TVs)
Call ahead to confirm hours and what they accept. NJ E-cycles: 866-DEP-KNOW.

=== TEXTILES ===
Required by law for every resident and business. Clean, dry fabric at least 1 ft x 1 ft. Not in the curbside bin. Use donation boxes or pickup services (hundreds across the county). Worn clothing is still recyclable.
Organizations with boxes/pickup: Helpsy 877-382-7417; American Textile Recycling Service 866-900-9308; Usagain 800-604-9533; Turnkey Enterprises 908-213-9202; Planet Aid 973-882-7956; Catholic Charities 877-343-3651.

=== MEDICINE ===
Never flush. Use take-back boxes, commonly at police stations and pharmacies. Find Middlesex County boxes at njconsumeraffairs.gov/meddrop. Hours vary by location, so tell people to call the specific location. Needles/syringes need separate sharps disposal. Infectious/medical waste is not accepted at HHW events.
"""


@app.route("/scan", methods=["POST"])
def scan():
    data = request.get_json(silent=True) or {}
    image_b64 = data.get("image")

    if not image_b64:
        return jsonify({"error": "No image provided"}), 400

    # Strip the data-url prefix if the frontend sent one
    if "," in image_b64:
        image_b64 = image_b64.split(",", 1)[1]

    prompt = f"""You are a waste disposal assistant for Middlesex County, New Jersey.

Look at the image and identify the single main household item.

Then assign it to exactly ONE of these category keys:
{", ".join(CATEGORY_KEYS)}

If the item does not fit any category, use the key "none".

Respond with ONLY raw JSON, no markdown, no backticks, in this exact shape:
{{"item_name": "short name of the item", "category": "one_of_the_keys_above", "confidence": "high or medium or low", "reason": "one short sentence"}}"""

    try:
        response = generate([{
            "parts": [
                {"text": prompt},
                {"inline_data": {"mime_type": "image/jpeg", "data": image_b64}}
            ]
        }])

        raw = response.text.strip()
        raw = raw.replace("```json", "").replace("```", "").strip()
        result = json.loads(raw)

    except Exception as e:
        print("SCAN ERROR:", e)
        return jsonify({"error": str(e)}), 500

    key = result.get("category")

    if key in CATEGORIES:
        info = CATEGORIES[key]
        return jsonify({
            "found": True,
            "item_name": result.get("item_name", "Unknown item"),
            "category_key": key,
            "confidence": result.get("confidence", "medium"),
            "reason": result.get("reason", ""),
            "display_name": info["display_name"],
            "rules_summary": info["rules_summary"],
            "accepted": info["accepted"],
            "not_accepted": info["not_accepted"],
            "nuances": info["nuances"],
            "locations": info["locations"]
        })

    return jsonify({
        "found": False,
        "item_name": result.get("item_name", "Unknown item"),
        "reason": result.get("reason", ""),
        "message": "This item is not part of a special disposal program in Middlesex County. Check your town's curbside recycling and trash rules."
    })


@app.route("/ask", methods=["POST"])
def ask():
    data = request.get_json(silent=True) or {}
    question = (data.get("question") or "").strip()

    if not question:
        return jsonify({"error": "No question provided"}), 400

    today = date.today().strftime("%A, %B %d, %Y")
    prompt = f"{COUNTY_CONTEXT}\n\nToday's date is {today}.\n\nUser question: {question}"

    try:
        response = generate(prompt)
        return jsonify({"answer": response.text.strip()})
    except Exception as e:
        print("ASK ERROR:", e)
        return jsonify({"answer": "Sorry, something went wrong. Please try again."}), 500


@app.route("/categories", methods=["GET"])
def categories():
    return jsonify(DISPOSAL_DATA)


if __name__ == "__main__":
    app.run(debug=True, port=5000)