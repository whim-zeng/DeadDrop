import urllib.request

# Shanghai zoom=15 tile coordinates
# lng=121.4737, lat=31.2304
import math

z = 15
n = 2 ** z
x = math.floor(((121.4737 + 180) / 360) * n)
lat_rad = math.radians(31.2304)
y = math.floor((1 - math.log(math.tan(lat_rad) + 1/math.cos(lat_rad)) / math.pi) / 2 * n)

print(f"Shanghai tile: z={z}, x={x}, y={y}")

try:
    r = urllib.request.urlopen(f'http://127.0.0.1:3000/tiles/osm/{z}/{x}/{y}.png', timeout=15)
    print('Status:', r.status)
    print('Content-Type:', r.headers.get('Content-Type'))
    data = r.read()
    print('Size:', len(data))
    print('First bytes:', data[:20])
except Exception as e:
    print('Error:', e)
