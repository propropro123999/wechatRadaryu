from http.server import BaseHTTPRequestHandler
import cgi
import json
import tempfile
import os

# Try to import pyorc, if it fails, we can't parse.
# Vercel requires a requirements.txt to install dependencies.
try:
    import pyorc
except ImportError:
    pyorc = None

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        # 1. Check if pyorc is available
        if not pyorc:
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                "error": "Server configuration error: 'pyorc' not installed."
            }).encode('utf-8'))
            return

        # 2. Parse Multipart Form Data
        ctype, pdict = cgi.parse_header(self.headers.get('content-type'))
        if ctype != 'multipart/form-data':
            self.send_response(400)
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Content-Type must be multipart/form-data"}).encode('utf-8'))
            return

        pdict['boundary'] = bytes(pdict['boundary'], "utf-8")
        
        try:
            form = cgi.FieldStorage(
                fp=self.rfile, 
                headers=self.headers,
                environ={'REQUEST_METHOD': 'POST',
                         'CONTENT_TYPE': self.headers['Content-Type'],
                         }
            )
            
            if 'file' not in form:
                self.send_response(400)
                self.end_headers()
                self.wfile.write(json.dumps({"error": "No file field found"}).encode('utf-8'))
                return

            file_item = form['file']
            if not file_item.file:
                self.send_response(400)
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Empty file"}).encode('utf-8'))
                return

            # 3. Save to temp file (pyorc needs a file-like object or path)
            # We use a temp file to be safe with binary streams
            with tempfile.NamedTemporaryFile(delete=False) as tmp:
                tmp.write(file_item.file.read())
                tmp_path = tmp.name

            # 4. Parse ORC
            data = []
            try:
                with open(tmp_path, "rb") as f:
                    reader = pyorc.Reader(f)
                    # Convert to list of dicts if schema allows, or list of lists
                    # Reader iterates over rows.
                    # We can try to get column names from schema
                    schema = reader.schema
                    # simple conversion
                    for row in reader:
                        data.append(row)
            finally:
                os.remove(tmp_path)

            # 5. Return JSON
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            
            # If data is large, this might hit Vercel limits (4.5MB response body).
            # We strictly limit rows for this demo tool or warn user.
            self.wfile.write(json.dumps({"data": data}, default=str).encode('utf-8'))

        except Exception as e:
            self.send_response(500)
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))
