from http.server import BaseHTTPRequestHandler
from email.parser import BytesParser
from email.policy import default
from datetime import date, datetime
from decimal import Decimal
import base64
import io
import json
import pyorc


def json_value(value):
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, Decimal):
        return str(value)
    if isinstance(value, bytes):
        return base64.b64encode(value).decode('ascii')
    raise TypeError(f'Unsupported value: {type(value).__name__}')


class handler(BaseHTTPRequestHandler):
    def reply(self, status, data):
        body = json.dumps(data, default=json_value, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        content_type = self.headers.get('Content-Type', '')
        try:
            length = int(self.headers.get('Content-Length', '0'))
        except ValueError:
            return self.reply(400, {'error': 'Invalid Content-Length'})
        if length <= 0:
            return self.reply(400, {'error': 'No file uploaded'})
        if length > 4 * 1024 * 1024:
            return self.reply(413, {'error': '文件过大，请使用本地解析'})
        if not content_type.lower().startswith('multipart/form-data;') or '\r' in content_type or '\n' in content_type:
            return self.reply(400, {'error': 'Content-Type must be multipart/form-data'})
        try:
            message = BytesParser(policy=default).parsebytes(
                b'Content-Type: ' + content_type.encode('ascii') + b'\r\nMIME-Version: 1.0\r\n\r\n' + self.rfile.read(length)
            )
            if not message.is_multipart():
                return self.reply(400, {'error': 'Invalid multipart boundary'})
            file_part = next((part for part in message.iter_parts() if part.get_param('name', header='content-disposition') == 'file'), None)
            if file_part is None:
                return self.reply(400, {'error': 'No file field found'})
            data = file_part.get_payload(decode=True)
            if not data:
                return self.reply(400, {'error': 'Empty file'})
            rows = list(pyorc.Reader(io.BytesIO(data)))
            encoded = json.dumps({'data': rows}, default=json_value, ensure_ascii=False).encode('utf-8')
            if len(encoded) > 4 * 1024 * 1024:
                return self.reply(413, {'error': '解析结果过大，请使用本地解析'})
            return self.reply(200, {'data': rows})
        except Exception:
            return self.reply(400, {'error': '无法解析 ORC 文件，请检查文件格式'})
