from http.server import HTTPServer
from pathlib import Path
from threading import Thread
from urllib.request import Request, urlopen
from urllib.error import HTTPError
from datetime import datetime, timezone
from decimal import Decimal
import importlib.util
import io
import json
import pyorc

spec = importlib.util.spec_from_file_location('parse_orc', Path(__file__).parents[1] / 'api/parse-orc.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
server = HTTPServer(('127.0.0.1', 0), module.handler)
thread = Thread(target=server.serve_forever, daemon=True)
thread.start()


def post(payload, content_type='multipart/form-data; boundary=smoke'):
    request = Request(f'http://127.0.0.1:{server.server_port}/api/parse-orc', data=payload,
                      headers={'Content-Type': content_type})
    try:
        response = urlopen(request)
    except HTTPError as error:
        response = error
    return response.status, json.loads(response.read())


def multipart(payload):
    return b'--smoke\r\nContent-Disposition: form-data; name="file"; filename="sample.orc"\r\nContent-Type: application/octet-stream\r\n\r\n' + payload + b'\r\n--smoke--\r\n'


try:
    buffer = io.BytesIO()
    writer = pyorc.Writer(buffer, 'struct<id:int,name:string,at:timestamp,amount:decimal(8,2),raw:binary>')
    writer.write((1, 'sample', datetime(2025, 1, 1, tzinfo=timezone.utc), Decimal('12.50'), b'hello'))
    writer.close()
    status, data = post(multipart(buffer.getvalue()))
    assert status == 200, data
    assert data['data'][0] == [1, 'sample', '2025-01-01T00:00:00+00:00', '12.50', 'aGVsbG8=']
    print('PASS: generated ORC multipart response:', json.dumps(data))
    empty = io.BytesIO()
    writer = pyorc.Writer(empty, 'struct<id:int>')
    writer.close()
    assert post(multipart(empty.getvalue())) == (200, {'data': []})
    for payload, content_type in [(b'', 'application/json'), (b'{}', 'application/json'),
                                  (multipart(b'bad'), 'multipart/form-data; boundary=smoke'),
                                  (multipart(b''), 'multipart/form-data; boundary=smoke'),
                                  (b'--smoke--\r\n', 'multipart/form-data; boundary=smoke')]:
        assert post(payload, content_type)[0] == 400
    print('PASS: empty ORC, missing/empty file, invalid multipart/content-type and corrupt ORC')
finally:
    server.shutdown()
    server.server_close()
