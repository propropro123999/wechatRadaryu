from http.server import BaseHTTPRequestHandler
import json
import tempfile
import os
import re

# Try to import pyarrow for ORC parsing (has prebuilt wheels for all Python versions)
try:
    import pyarrow.orc as orc
except ImportError:
    orc = None


def parse_multipart(headers, body):
    """Parse multipart/form-data without using deprecated cgi module."""
    content_type = headers.get('content-type', '')
    
    # Extract boundary
    match = re.search(r'boundary=([^\s;]+)', content_type)
    if not match:
        return None
    
    boundary = match.group(1).encode('utf-8')
    if boundary.startswith(b'"') and boundary.endswith(b'"'):
        boundary = boundary[1:-1]
    
    # Split by boundary
    parts = body.split(b'--' + boundary)
    
    for part in parts:
        if b'name="file"' in part or b"name='file'" in part:
            # Find the file content (after double CRLF)
            header_end = part.find(b'\r\n\r\n')
            if header_end == -1:
                header_end = part.find(b'\n\n')
                if header_end == -1:
                    continue
                file_data = part[header_end + 2:]
            else:
                file_data = part[header_end + 4:]
            
            # Remove trailing boundary markers
            if file_data.endswith(b'--\r\n'):
                file_data = file_data[:-4]
            elif file_data.endswith(b'--'):
                file_data = file_data[:-2]
            if file_data.endswith(b'\r\n'):
                file_data = file_data[:-2]
            
            return file_data
    
    return None


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        # 1. Check if pyarrow.orc is available
        if not orc:
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({
                "error": "Server configuration error: 'pyarrow' not installed."
            }).encode('utf-8'))
            return

        # 2. Parse Multipart Form Data
        content_type = self.headers.get('content-type', '')
        if 'multipart/form-data' not in content_type:
            self.send_response(400)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Content-Type must be multipart/form-data"}).encode('utf-8'))
            return

        try:
            # Read the request body
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            
            # Parse multipart data
            file_data = parse_multipart(self.headers, body)
            
            if not file_data:
                self.send_response(400)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "No file field found or empty file"}).encode('utf-8'))
                return

            # 3. Save to temp file
            with tempfile.NamedTemporaryFile(delete=False, suffix='.orc') as tmp:
                tmp.write(file_data)
                tmp_path = tmp.name

            # 4. Parse ORC using pyarrow
            data = []
            try:
                table = orc.read_table(tmp_path)
                # Convert to list of lists without pandas
                for batch in table.to_batches():
                    for row_idx in range(batch.num_rows):
                        row = []
                        for col_idx in range(batch.num_columns):
                            val = batch.column(col_idx)[row_idx].as_py()
                            row.append(val)
                        data.append(row)
            finally:
                os.remove(tmp_path)

            # 5. Return JSON
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
        """Handle CORS preflight requests."""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
