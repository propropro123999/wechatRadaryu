from flask import Flask, request, jsonify
import tempfile
import os

try:
    import pyorc
except ImportError:
    pyorc = None

app = Flask(__name__)

@app.route('/api/parse-orc', methods=['POST', 'OPTIONS'])
def parse_orc():
    if request.method == 'OPTIONS':
        response = jsonify({})
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
        return response

    if not pyorc:
        resp = jsonify({"error": "pyorc not installed"})
        resp.headers['Access-Control-Allow-Origin'] = '*'
        return resp, 500

    if 'file' not in request.files:
        resp = jsonify({"error": "No file uploaded"})
        resp.headers['Access-Control-Allow-Origin'] = '*'
        return resp, 400

    file = request.files['file']
    
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix='.orc') as tmp:
            file.save(tmp.name)
            tmp_path = tmp.name

        data = []
        with open(tmp_path, "rb") as f:
            reader = pyorc.Reader(f)
            for row in reader:
                data.append(row)
        
        os.remove(tmp_path)
        
        response = jsonify({"data": data})
        response.headers['Access-Control-Allow-Origin'] = '*'
        return response

    except Exception as e:
        resp = jsonify({"error": str(e)})
        resp.headers['Access-Control-Allow-Origin'] = '*'
        return resp, 500

@app.route('/')
def health():
    return jsonify({"status": "ok", "pyorc": pyorc is not None})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port)
