from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from google import genai
from google.genai import types
import base64
import json
import os

load_dotenv()
app = Flask(__name__)
CORS(app)

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

with open(os.path.join(os.path.dirname(__file__), "..", "data", "disposal_data.json"), encoding="utf-8") as file:
    disposal_data = json.load(file)

@app.route('/ping')
def ping():
    return jsonify({"status": "ok"})

@app.route("/scan", methods=["POST"])
def scan():
    try:
        data = request.get_json(silent=True) or {}
        image_data = data.get("image", "")
        if not image_data.startswith("data:image/") or ";base64," not in image_data:
            return jsonify({"error": "A base64 image is required."}), 400

        header, encoded_image = image_data.split(",", 1)
        mime_type = header.split(";", 1)[0][5:]
        image_bytes = base64.b64decode(encoded_image, validate=True)

        response = client.models.generate_content(
            model="gemini-flash-latest",
            contents=[
                "Identify the household item in this image. Return only the closest disposal_data category key as plain text, or unknown if it is not represented.",
                types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
            ],
        )
        category_key = response.text.strip().lower()
        category = disposal_data["categories"].get(category_key)

        if category is None:
            return jsonify({
                "item_name": "Unknown item",
                "category": "Unknown",
                "rules_summary": "We could not identify this item from the photo.",
                "locations": [],
            })

        return jsonify({
            "item_name": category["display_name"],
            "category": category["display_name"],
            "rules_summary": category["rules_summary"],
            "locations": category.get("locations", []),
        })

    except (ValueError, base64.binascii.Error) as error:
        print("SCAN INPUT ERROR:", str(error))
        return jsonify({"error": "Invalid image data."}), 400
    except Exception as error:
        print("SCAN ERROR:", str(error))
        return jsonify({"error": "Unable to analyze the image."}), 500

@app.route("/ask", methods=["POST"])
def ask():
    try:
        data = request.get_json()
        question = data.get("question", "")

        context = """You are a waste disposal assistant for Middlesex County, New Jersey.
You only answer questions about waste disposal, recycling, and the following Middlesex County rules:

- Rechargeable batteries: HHW events only, never trash, tape terminals
- Paint: HHW events, must be labeled, dried latex paint OK for trash
- Tires: max 4 per household per month, residents only, must see attendant
- Medicine: take-back boxes at pharmacies and police stations, never flush
- Hazardous waste: HHW events only, never pour down drain
- Electronics: required by NJ law to recycle, contact local public works
- Textiles: required by law, donation boxes only, not curbside bin
- Cooking oil: liquid vegetable oils only, residents only, proof of residency
- Paper shredding: residential only, max 5 boxes, no plastic bags

If the question is not about waste disposal, politely say you can only help with disposal questions.
Keep answers short, clear, and helpful."""

        response = client.models.generate_content(
            model="gemini-flash-latest",
            contents=[
                {
                    "role": "user",
                    "parts": [{"text": f"Context: {context}\n\nQuestion: {question}"}]
                }
            ]
        )

        return jsonify({"answer": response.text.strip()})

    except Exception as e:
        print("ASK ERROR:", str(e))
        return jsonify({"answer": "Sorry, something went wrong. Please try again."}), 500


if __name__ == '__main__':
    app.run(debug=True)