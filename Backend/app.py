from flask import Flask, request, jsonify, render_template, Response, stream_with_context
from flask_cors import CORS
import re
import os
import json
import requests
from dotenv import load_dotenv
import anthropic
from datetime import datetime
import logging
import time

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

FRONTEND_ORIGINS = os.getenv("FRONTEND_ORIGINS", "")
extra = [o.strip() for o in FRONTEND_ORIGINS.split(",") if o.strip()]
VERCELOPT = re.compile(r"^https://[a-z0-9-]+\.vercel\.app$")
PROD_FRONTENDS = extra + ["https://youtube-gpt-synthesizer.vercel.app"]

CORS(
    app,
    origins=PROD_FRONTENDS + ["http://localhost:8080", "http://localhost:5173"],
    supports_credentials=False,
    allow_headers=["Content-Type", "Authorization"],
    methods=["GET","POST","PUT","PATCH","DELETE","OPTIONS"],
    expose_headers=["Content-Type"],
    max_age=86400,
)

@app.after_request
def after_request(response):
    origin = request.headers.get('Origin')
    if origin:
        if origin in PROD_FRONTENDS or origin.startswith("http://localhost"):
            response.headers.add('Access-Control-Allow-Origin', origin)
        elif VERCELOPT.match(origin):
            response.headers.add('Access-Control-Allow-Origin', origin)
    response.headers.add('Vary', 'Origin')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
    response.headers.add('Access-Control-Max-Age', '86400')
    return response

SUPADATA_API_KEY = os.getenv('SUPADATA_API_KEY')
ANTHROPIC_API_KEY = os.getenv('ANTHROPIC_API_KEY')

# Model is intentionally hardcoded — do not change without testing
CLAUDE_MODEL = 'claude-sonnet-4-6'  # locked
CLAUDE_MAX_TOKENS = 16000
SYSTEM_PROMPT = """You are an expert research assistant that transforms YouTube video transcripts into comprehensive, well-structured notes.

Your output lets someone fully understand a video without watching it. You prioritize specificity over generality — capture the actual examples, data, stories, and reasoning the speaker uses, not just their conclusions.

Rules:
- Always follow the video's chronological flow
- Include specific details: names, numbers, examples, anecdotes
- Never pad or repeat yourself
- Write in clear, scannable markdown
- Be direct — no preamble, no "Here are your notes:", just output the notes"""

client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

print("SupaData:", SUPADATA_API_KEY[:10] + "..." if SUPADATA_API_KEY else "NOT SET")
print("Anthropic:", ANTHROPIC_API_KEY[:20] + "..." if ANTHROPIC_API_KEY else "NOT SET")


def extract_video_id(url):
    patterns = [
        r"(?:v=|\/videos\/|embed\/|youtu\.be\/|\/v\/|\/e\/|watch\?v=|watch\?.+&v=)([\w-]{11})",
        r"youtu\.be\/([\w-]{11})",
        r"youtube\.com\/embed\/([\w-]{11})",
        r"youtube\.com\/v\/([\w-]{11})"
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None


def get_transcript(video_id):
    url = f'https://api.supadata.ai/v1/youtube/transcript?videoId={video_id}'
    headers = {'x-api-key': SUPADATA_API_KEY}
    response = requests.get(url, headers=headers, timeout=30)
    if response.status_code != 200:
        if response.status_code == 404:
            raise Exception("No transcript available for this video.")
        elif response.status_code == 401:
            raise Exception("Invalid SupaData API key.")
        elif response.status_code == 429:
            raise Exception("Rate limit exceeded — try again shortly.")
        else:
            raise Exception(f"Transcript fetch failed ({response.status_code})")
    data = response.json()
    if 'content' not in data:
        raise Exception("No transcript content in response.")
    parts = [e.get('text', '').strip() for e in data['content'] if isinstance(e, dict) and e.get('text', '').strip()]
    if not parts:
        raise Exception("Transcript is empty.")
    return ' '.join(parts)


MAX_TRANSCRIPT_CHARS = 100000  # ~25k tokens — keeps input within budget

def build_prompt(transcript):
    cleaned = re.sub(r'\s+', ' ', transcript).strip()
    if len(cleaned) > MAX_TRANSCRIPT_CHARS:
        cleaned = cleaned[:MAX_TRANSCRIPT_CHARS] + " [transcript truncated due to length]"
    return f'''You are given a YouTube video transcript. Produce comprehensive notes using the exact structure below. Follow it precisely.

Be thorough but concise — aim for density over length. Do not repeat information across sections.

---

## 🎯 TL;DR
2-3 sentences: what the video covers and the key takeaway.

## ❓ Why Does This Matter?
3-5 bullet points on why this topic is relevant — what problem it solves, what opportunity it unlocks.

## 📋 Detailed Notes
Follow the video chronologically. Break into sections by topic shift.

For each section:
- Key points the speaker makes
- Specific examples, stories, case studies, and analogies used
- Data, statistics, or research cited
- Direct quotes when memorable or precise
- Frameworks, models, or named concepts introduced

## ✅ Action Items & Recommendations
Every specific piece of advice or recommendation, as a checklist:
- [ ] Action item 1
- [ ] Action item 2

---

Transcript:

{cleaned}'''


@app.before_request
def log_req():
    request.start_time = time.time()

@app.after_request
def log_res(response):
    duration = time.time() - getattr(request, 'start_time', time.time())
    logger.info(f"{response.status_code} {request.method} {request.path} ({duration:.2f}s)")
    if 'Origin' in request.headers:
        response.headers['Vary'] = 'Origin'
    return response


@app.route('/')
def index():
    return render_template('index.html')

@app.route('/health')
@app.route('/healthz')
def health():
    return jsonify({'status': 'healthy', 'timestamp': str(datetime.now())})

@app.route('/api/test')
def test():
    return jsonify({'status': 'ok', 'supadata': bool(SUPADATA_API_KEY), 'anthropic': bool(ANTHROPIC_API_KEY)})

@app.errorhandler(404)
def not_found(e): return jsonify({'error': 'Not found'}), 404

@app.errorhandler(500)
def server_error(e): return jsonify({'error': 'Internal server error'}), 500


@app.route('/api/summarize', methods=['POST'])
def summarize():
    if not SUPADATA_API_KEY:
        return jsonify({'error': 'SupaData API key not configured.'}), 500
    if not ANTHROPIC_API_KEY:
        return jsonify({'error': 'Anthropic API key not configured.'}), 500

    try:
        data = request.json
    except Exception:
        return jsonify({'error': 'Invalid JSON'}), 400

    if not data or not data.get('url'):
        return jsonify({'error': 'No URL provided'}), 400

    video_id = extract_video_id(data['url'])
    if not video_id:
        return jsonify({'error': 'Invalid YouTube URL'}), 400

    # Fetch transcript (non-streaming, fast)
    try:
        transcript = get_transcript(video_id)
        if len(transcript.strip()) < 50:
            return jsonify({'error': 'Transcript too short.'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

    prompt = build_prompt(transcript)

    def generate():
        try:
            with client.messages.stream(
                model=CLAUDE_MODEL,
                max_tokens=CLAUDE_MAX_TOKENS,
                system=SYSTEM_PROMPT,
                messages=[{"role": "user", "content": prompt}]
            ) as stream:
                for text in stream.text_stream:
                    yield f"data: {json.dumps({'chunk': text})}\n\n"
                final = stream.get_final_message()
                truncated = final.stop_reason == "max_tokens"
            yield f"data: {json.dumps({'done': True, 'truncated': truncated})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return Response(
        stream_with_context(generate()),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no',
            'Connection': 'keep-alive',
        }
    )


if __name__ == '__main__':
    port = int(os.getenv("PORT", "5055"))
    print(f"🚀 Starting on port {port}")
    print(f"🔑 SupaData: {'✅' if SUPADATA_API_KEY else '❌'} | Anthropic: {'✅' if ANTHROPIC_API_KEY else '❌'}")
    app.run(debug=False, port=port, host="0.0.0.0")
