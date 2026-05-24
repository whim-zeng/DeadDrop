import urllib.request
import json

try:
    req = urllib.request.Request(
        'http://127.0.0.1:3000/functions/v1/notes-nearby',
        data=json.dumps({"lat": 31.2304, "lng": 121.4737}).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    r = urllib.request.urlopen(req, timeout=5)
    print('API Status:', r.status)
    data = json.loads(r.read().decode('utf-8'))
    print('Unlocked:', len(data.get('unlocked', [])))
    print('Preview:', len(data.get('preview', [])))
    print('Distant:', len(data.get('distant', [])))
except Exception as e:
    print('API Error:', e)
