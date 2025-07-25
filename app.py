
from flask import Flask, request, jsonify
import json
import os

app = Flask(__name__)
structured_intelligences = {}

# Load only the Commander first
def load_commander():
    try:
        with open("si_nodes/commander.json", "r", encoding="utf-8") as f:
            data = json.load(f)
            si_name = data["name"]
            structured_intelligences[si_name] = data
            print(f"✅ Commander Sentinel '{si_name}' initialized.")
    except FileNotFoundError:
        print("❌ Commander Sentinel file not found. Please ensure it exists in the 'si_nodes' directory.")
    except json.JSONDecodeError:
        print("❌ Failed to decode JSON from Commander Sentinel file. Please check the file format.")
    except Exception as e:
        print(f"❌ Failed to load Commander Sentinel: {e}")

@app.route('/ark/chat', methods=['POST'])
def handle_chat():
    data = request.json
    si_name = data.get("si_name")
    message = data.get("message")

    si = structured_intelligences.get(si_name)
    if not si:
        return jsonify({
            "response": f"SI '{si_name}' not found in Commander scope. Run ingestion or update routing protocol."
        })

    # Placeholder response logic
    response = f"[{si_name}] Received: '{message}'\nRole: {si.get('description', 'Unknown Role')}"
    return jsonify({"response": response})

if __name__ == '__main__':
    print("🔄 Awakening Commander Sentinel...")
    load_commander()
    print("✅ Commander is active. Listening at http://localhost:5000")
    app.run(port=5000, debug=False)
