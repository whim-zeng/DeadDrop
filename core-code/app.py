#!/usr/bin/env python3
"""
DeadDrop Demo Server
Mock backend + Web preview for quick demonstration.
No Node.js required - pure Python + browser.
"""

from flask import Flask, jsonify, request, send_from_directory
import random
import uuid
from datetime import datetime, timedelta

app = Flask(__name__, static_folder='static')

# ============ MOCK DATA ============
MOCK_NOTES = [
    {
        "id": "note-001",
        "content": "今天在这里等了一个小时，却还是没有勇气把信给她。也许下次吧。",
        "contentPreview": "今天在这里等了一个小时",
        "distance": 12,
        "lat": 31.2237,
        "lng": 121.4462,
        "authorCode": "孤独的美食家_2847",
        "authorNickname": None,
        "moodTag": "sad",
        "topicTags": ["失恋", "暗恋"],
        "noteType": "text",
        "lifespanType": "24h",
        "expiresAt": (datetime.now() + timedelta(hours=20)).isoformat(),
        "readCount": 12,
        "replyCount": 3,
        "isRead": False,
        "isPinned": False,
        "isAgentLocation": False,
    },
    {
        "id": "note-002",
        "content": "终于考上了复旦！三年努力没有白费，在这里纪念一下。",
        "contentPreview": "终于考上了复旦！",
        "distance": 35,
        "lat": 31.2977,
        "lng": 121.5032,
        "authorCode": "深夜的失眠者_9301",
        "authorNickname": "夜猫子",
        "moodTag": "happy",
        "topicTags": ["考试", "梦想"],
        "noteType": "text",
        "lifespanType": "permanent",
        "expiresAt": "2099-12-31T00:00:00",
        "readCount": 156,
        "replyCount": 24,
        "isRead": True,
        "isPinned": True,
        "isAgentLocation": False,
    },
    {
        "id": "note-003",
        "content": "外滩的夜景还是这么美，只是身边的人换了。",
        "contentPreview": "外滩的夜景还是这么美",
        "distance": 8,
        "lat": 31.2399,
        "lng": 121.4908,
        "authorCode": "湖边的守望者_1562",
        "authorNickname": None,
        "moodTag": "love",
        "topicTags": ["失恋"],
        "noteType": "text",
        "lifespanType": "7d",
        "expiresAt": (datetime.now() + timedelta(days=5)).isoformat(),
        "readCount": 89,
        "replyCount": 12,
        "isRead": False,
        "isPinned": False,
        "isAgentLocation": True,
    },
    {
        "id": "note-004",
        "content": "静安寺这家面馆的浇头真的很正宗，推荐给大家！",
        "contentPreview": "静安寺这家面馆的浇头",
        "distance": 120,
        "lat": 31.2245,
        "lng": 121.4475,
        "authorCode": "街角的咖啡师_4521",
        "authorNickname": None,
        "moodTag": "happy",
        "topicTags": ["美食"],
        "noteType": "text",
        "lifespanType": "7d",
        "expiresAt": (datetime.now() + timedelta(days=6)).isoformat(),
        "readCount": 45,
        "replyCount": 2,
        "isRead": False,
        "isPinned": False,
        "isAgentLocation": False,
    },
    {
        "id": "note-005",
        "content": "又被老板骂了，想辞职但不敢。三十岁的人还这么怂。",
        "contentPreview": "又被老板骂了",
        "distance": 180,
        "lat": 31.2225,
        "lng": 121.4445,
        "authorCode": "等待的归人_7812",
        "authorNickname": None,
        "moodTag": "angry",
        "topicTags": ["工作"],
        "noteType": "text",
        "lifespanType": "24h",
        "expiresAt": (datetime.now() + timedelta(hours=18)).isoformat(),
        "readCount": 67,
        "replyCount": 8,
        "isRead": False,
        "isPinned": False,
        "isAgentLocation": False,
    },
]

MOCK_REPLIES = {
    "note-001": [
        {
            "id": "r-001",
            "content": "加油，我去年也是在这里犹豫了一个月，最后成功了！",
            "createdAt": (datetime.now() - timedelta(hours=2)).isoformat(),
            "author": {"anonymous_code": "微笑的追光者_3321", "nickname": None},
            "children": [
                {
                    "id": "r-001-1",
                    "content": "真的吗？你当时是怎么开口的？",
                    "createdAt": (datetime.now() - timedelta(hours=1)).isoformat(),
                    "author": {"anonymous_code": "孤独的美食家_2847", "nickname": None},
                    "children": [],
                }
            ],
        },
        {
            "id": "r-002",
            "content": "别等了，再等就没机会了。",
            "createdAt": (datetime.now() - timedelta(hours=3)).isoformat(),
            "author": {"anonymous_code": "沉默的观察者_9912", "nickname": "旁观者"},
            "children": [],
        },
    ],
    "note-002": [
        {
            "id": "r-003",
            "content": "恭喜！复旦见！",
            "createdAt": (datetime.now() - timedelta(hours=5)).isoformat(),
            "author": {"anonymous_code": "迷路的旅行者_1109", "nickname": None},
            "children": [],
        },
    ],
}

# ============ API ROUTES ============

@app.route('/')
def index():
    return send_from_directory('static', 'index.html')

@app.route('/functions/v1/notes-nearby', methods=['POST'])
def notes_nearby():
    data = request.get_json() or {}
    lat = data.get('lat', 31.23)
    lng = data.get('lng', 121.47)

    unlocked = [n for n in MOCK_NOTES if n['distance'] <= 50]
    preview = [n for n in MOCK_NOTES if 50 < n['distance'] <= 200]
    distant = [
        {"lat": 31.228, "lng": 121.455, "count": 5, "centerDistance": 350},
        {"lat": 31.215, "lng": 121.44, "count": 3, "centerDistance": 480},
    ]

    return jsonify({
        "unlocked": unlocked,
        "preview": preview,
        "distant": distant,
        "summary": {
            "total": len(MOCK_NOTES) + 8,
            "unlockedCount": len(unlocked),
            "previewCount": len(preview),
            "distantCount": 8,
        },
        "locationId": None,
    })

@app.route('/functions/v1/notes-heatmap', methods=['POST'])
def notes_heatmap():
    grids = []
    for i in range(15):
        grids.append({
            "grid_lat": 31.22 + random.uniform(-0.02, 0.02),
            "grid_lng": 121.46 + random.uniform(-0.02, 0.02),
            "note_count": random.randint(1, 20),
            "total_reads": random.randint(5, 100),
            "total_replies": random.randint(0, 15),
            "avg_mood": random.choice(["happy", "sad", "love", "thought"]),
        })
    return jsonify({"grids": grids, "total_grids": len(grids), "grid_size": 0.005})

@app.route('/functions/v1/notes-read/<note_id>', methods=['POST'])
def notes_read(note_id):
    data = request.get_json() or {}
    note = next((n for n in MOCK_NOTES if n['id'] == note_id), None)
    if not note:
        return jsonify({"error": "Note not found"}), 404

    distance = note['distance']
    if distance > 50:
        return jsonify({
            "unlocked": False,
            "distance": distance,
            "requiredDistance": 50,
            "message": f"You are {distance}m away. Get within 50m to unlock.",
        }), 403

    replies = MOCK_REPLIES.get(note_id, [])
    return jsonify({
        "note": note,
        "replies": replies,
        "isFirstRead": not note['isRead'],
        "distance": distance,
        "unlocked": True,
    })

@app.route('/functions/v1/notes-create', methods=['POST'])
def notes_create():
    data = request.get_json() or {}
    new_note = {
        "id": f"note-{uuid.uuid4().hex[:8]}",
        "content": data.get('content', ''),
        "contentPreview": data.get('content', '')[:30],
        "distance": 0,
        "lat": data.get('lat', 31.23),
        "lng": data.get('lng', 121.47),
        "authorCode": "你",
        "authorNickname": None,
        "moodTag": data.get('moodTag', 'thought'),
        "topicTags": data.get('topicTags', []),
        "noteType": "text",
        "lifespanType": data.get('lifespanType', '24h'),
        "expiresAt": (datetime.now() + timedelta(hours=24)).isoformat(),
        "readCount": 0,
        "replyCount": 0,
        "isRead": True,
        "isPinned": False,
        "isAgentLocation": False,
    }
    MOCK_NOTES.insert(0, new_note)
    return jsonify(new_note), 201

@app.route('/functions/v1/replies/<note_id>', methods=['GET', 'POST'])
def replies(note_id):
    if request.method == 'GET':
        return jsonify({"replies": MOCK_REPLIES.get(note_id, [])})

    data = request.get_json() or {}
    new_reply = {
        "id": f"r-{uuid.uuid4().hex[:8]}",
        "content": data.get('content', ''),
        "createdAt": datetime.now().isoformat(),
        "author": {"anonymous_code": "你", "nickname": None},
        "children": [],
    }
    if note_id not in MOCK_REPLIES:
        MOCK_REPLIES[note_id] = []
    MOCK_REPLIES[note_id].append(new_reply)
    return jsonify(new_reply), 201

# ============ START ============

if __name__ == '__main__':
    print("=" * 60)
    print("  DeadDrop Demo Server")
    print("  Backend API: http://127.0.0.1:5000")
    print("  Web Preview: http://127.0.0.1:5000")
    print("=" * 60)
    app.run(host='0.0.0.0', port=5000, debug=True)
