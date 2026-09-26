import os
import json
import base64
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from google import genai

load_dotenv()

app = Flask(__name__)
CORS(app)

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
MODEL = "gemini-flash-latest"

# Load disposal data from the JSON file sitting next to this script
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(BASE_DIR, "disposal_data.json"), "r", encoding="utf-8") as f:
    DISPOSAL_DATA = json.load(f)

CATEGORIES = DISPOSAL_DATA["categories"]
CATEGORY_KEYS = list(CATEGORIES.keys())


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
        response = client.models.generate_content(
            model=MODEL,
            contents=[{
                "parts": [
                    {"text": prompt},
                    {"inline_data": {"mime_type": "image/jpeg", "data": image_b64}}
                ]
            }]
        )

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

    context = json.dumps(DISPOSAL_DATA, indent=2)

    prompt = f"""You are WasteWise, a disposal assistant for Middlesex County, New Jersey residents.

Answer using ONLY the disposal data below. If the answer is not in the data, say you do not have that information and tell the user to visit mcia.org.

Keep answers short — 3 sentences maximum. Plain text only, no markdown.

DISPOSAL DATA:
{context}

QUESTION: {question}"""

    try:
        response = client.models.generate_content(
            model=MODEL,
            contents=prompt
        )
        return jsonify({"answer": response.text.strip()})
    except Exception as e:
        print("ASK ERROR:", e)
        return jsonify({"error": str(e)}), 500


@app.route("/categories", methods=["GET"])
def categories():
    return jsonify(DISPOSAL_DATA)


if __name__ == "__main__":
    app.run(debug=True, port=5000)