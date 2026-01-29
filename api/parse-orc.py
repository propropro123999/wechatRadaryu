from http.server import BaseHTTPRequestHandler
import cgi
import json
import tempfile
import os

try:
    import pyorc
except ImportError:
    pyorc = None

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        if not pyorc:
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({
                "error": "Server configuration error: 'pyorc' not installed."
            }).encode('utf-8'))
            return

        ctype, pdict = cgi.parse_header(self.headers.get('content-type'))
        if ctype != 'multipart/form-data':
            self.send_response(400)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
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
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "No file field found"}).encode('utf-8'))
                return

            file_item = form['file']
            if not file_item.file:
                self.send_response(400)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Empty file"}).encode('utf-8'))
                return

            with tempfile.NamedTemporaryFile(delete=False) as tmp:
                tmp.write(file_item.file.read())
                tmp_path = tmp.name

            data = []
            try:
                with open(tmp_path, "rb") as f:
                    reader = pyorc.Reader(f)
                    for row in reader:
                        data.append(row)
            finally:
                os.remove(tmp_path)

            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"data": data}, default=str).encode('utf-8'))

        except Exception as e:
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
