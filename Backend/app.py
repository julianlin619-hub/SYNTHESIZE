from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import re
import os
import requests
import tiktoken
from dotenv import load_dotenv
from markupsafe import Markup
from openai import OpenAI  # ✅ New OpenAI SDK v1+
from datetime import datetime
import logging
import time

# Load .env variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Define allowed origins for CORS
ALLOWED_ORIGINS = {
    "http://localhost:8080",  # Frontend dev server
    "http://localhost:3000",  # Alternative local port
    "http://localhost:5173",  # Vite default port
    "https://youtube-gpt-synthesizer.onrender.com",  # Production backend
    # Add your Vercel frontend domains here when deployed
    # "https://your-app.vercel.app",
    # "https://www.your-app.vercel.app",
}

# Configure CORS with specific origins and proper headers
CORS(
    app,
    origins=list(ALLOWED_ORIGINS),
    supports_credentials=False,  # No cookies needed
    allow_headers=["Content-Type", "Authorization"],
    methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    expose_headers=["Content-Type"],
    max_age=86400,  # Cache preflight for 24 hours
)

# API Keys
SUPADATA_API_KEY = os.getenv('SUPADATA_API_KEY')
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')

# Validate required environment variables
if not SUPADATA_API_KEY:
    print("ERROR: SUPADATA_API_KEY environment variable is not set!")
    print("Please create a .env file with your SupaData API key")
if not OPENAI_API_KEY:
    print("ERROR: OPENAI_API_KEY environment variable is not set!")
    print("Please create a .env file with your OpenAI API key")

if not SUPADATA_API_KEY or not OPENAI_API_KEY:
    print("Missing required API keys. The application may not work properly.")

client = OpenAI(api_key=OPENAI_API_KEY)

print("Using SupaData API Key:", SUPADATA_API_KEY[:10] + "..." if SUPADATA_API_KEY else "NOT SET")
print("Using OpenAI API Key:", OPENAI_API_KEY[:10] + "..." if OPENAI_API_KEY else "NOT SET")


# 1. Extract YouTube Video ID
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

# 2. Fetch transcript from SupaData
def get_supadata_transcript(video_id):
    url = f'https://api.supadata.ai/v1/youtube/transcript?videoId={video_id}'
    headers = {'x-api-key': SUPADATA_API_KEY}
    response = requests.get(url, headers=headers)
    if response.status_code != 200:
        print("SupaData error:", response.text)
        raise Exception(f'SupaData API error: {response.text}')
    data = response.json()
    if 'content' not in data:
        raise Exception('Transcript not found in SupaData response')
    return ' '.join([entry['text'] for entry in data['content']])

# 3. Load summary prompt template

def generate_summary_prompt(transcript_text):
    template = f"""
👨‍💼 **Role**

You are a professional video content analyst with expertise in summarizing long-form YouTube transcripts by extracting key insights and detailed takeaways.

---

🎯 **Task**

Summarize the following YouTube transcript using this process:

1. **Read the entire transcript**
2. **Extract all key points, arguments, examples, and calls to action**
3. **Preserve the original sequence while condensing for clarity**
4. **Provide a detailed summary** that captures the full informational value
5. **Use bullet points or short paragraphs** for structure

⚠️ **CRITICAL FORMATTING REQUIREMENTS:**
• **ALWAYS** use bullet points (•) for lists, never indented text
• **ALWAYS** use bold formatting (**text**) for key concepts and important terms
• **ALWAYS** add emojis to section headers (🎯, 📌, 🧠, etc.)
• **ALWAYS** use clear section breaks with --- separators
• **NEVER** use dense paragraphs or indented text without bullets

---

🛠️ **Specifics**

• This task transforms long YouTube videos into digestible formats for readers
• Maintain a **neutral, informative tone** with no personal opinions
• The summary should allow someone to grasp the **main points and flow** without watching
• Be precise and avoid oversimplifying complex ideas
• Prioritize clarity and completeness—**every major concept matters**

---

🧠 **Context**

We create written summaries of YouTube videos for busy audiences who prefer reading. Your role is vital to our brand's credibility and user satisfaction.

---

📋 **Example**

**Q**: Summarise this video: https://www.youtube.com/watch?v=BZOqDpZK7rw

**A**:

🧠 **Detailed Summary: How to Do a Mind Map the Right Way (vs. the Wrong Way)**

**Introduction: Wrong approaches include:**
• Starting randomly and drawing chaotic connections
• Creating tangled arrows without structure
• Visually messy layouts that lack logical flow

---

📌 **Basic Principles for Effective Mind Mapping**

**1. Prioritize Clear, Logical Arrows**
• Avoid arrows that weave around content in confusing ways
• Convoluted paths are hard to remember—use **clear, direct arrows** that show logical progression
• Even when zoomed out, the **overall direction and flow** should remain visible

> *"You're going to remember an arrow that looks like this—super bold, really clear… the logic is preserved."*

**2. Don't Overload the Page with Information**
• Avoid writing too much—include only the **core ideas**
• Leaving small gaps encourages **recall over recognition**, which is better for learning and revision

---

🎯 **Key Takeaways**

• Mind maps should be **logical, clear**, and reflect how you understand concepts—not just a collection of facts
• Use **clear, direct arrows** to show the flow of ideas

---

📝 **IMPORTANT: Your output MUST look exactly like this example format!**

---

📝 **Notes**

• Be specific and retain nuance
• Use bullets or short paragraphs
• Exclude opinions—only summarize what was said
• Reflect the **structure, tone, and depth** of the original
• If parts of the transcript are unclear, infer based on context

---

📄 **Transcript to Summarize**

{transcript_text}
    """
    return template

# 4. Estimate tokens
def estimate_tokens(text, model="gpt-5"):
    try:
        encoding = tiktoken.encoding_for_model(model)
    except Exception:
        encoding = tiktoken.get_encoding("cl100k_base")
    return len(encoding.encode(text))


# 5. Summarize with OpenAI
def summarize_with_openai(transcript_text):
    model = "gpt-5"
    input_tokens = estimate_tokens(transcript_text, model=model)
    max_output_tokens = min(10000, input_tokens)
    prompt = generate_summary_prompt(transcript_text)

    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": "You summarize long YouTube transcripts professionally. You MUST follow the exact formatting instructions provided in the user prompt, including bullet points, bold text, emojis, and clear section breaks."},
            {"role": "user", "content": prompt}
        ],
        max_completion_tokens=max_output_tokens,
    )
    return response.choices[0].message.content.strip()

# 6. Convert summary to HTML
def summary_to_html(summary_text):
    import re
    from markupsafe import Markup

    # Split into lines for processing
    lines = summary_text.split('\n')
    html_lines = []
    in_list = False
    list_buffer = []

    def is_fully_bold(line):
        return bool(re.match(r'^\*\*[^*]+\*\*$', line.strip()))

    # Define section icons based on common keywords
    def get_section_icon(header):
        header_lower = header.lower()
        if any(word in header_lower for word in ['introduction', 'context', 'overview', 'background']):
            return '🧠'
        elif any(word in header_lower for word in ['key', 'principle', 'core', 'main', 'essential']):
            return '📌'
        elif any(word in header_lower for word in ['strategy', 'action', 'step', 'method', 'approach']):
            return '💡'
        elif any(word in header_lower for word in ['example', 'case', 'real-world', 'practical']):
            return '🔍'
        elif any(word in header_lower for word in ['quote', 'saying', 'statement']):
            return '💬'
        elif any(word in header_lower for word in ['takeaway', 'conclusion', 'summary', 'final']):
            return '🎯'
        elif any(word in header_lower for word in ['comparison', 'difference', 'versus']):
            return '⚖️'
        elif any(word in header_lower for word in ['statistic', 'data', 'number', 'metric']):
            return '📊'
        else:
            return '📋'

    for line in lines:
        stripped = line.strip()
        # Fully bolded line (header)
        if is_fully_bold(stripped):
            header = re.sub(r'^\*\*|\*\*$', '', stripped)
            icon = get_section_icon(header)
            if in_list and list_buffer:
                html_lines.append('<ul class="summary-list">' + '\n'.join(list_buffer) + '</ul>')
                list_buffer = []
                in_list = False
            html_lines.append(f'<section class="summary-section"><h2 class="summary-heading">{icon} {header}</h2>')
            continue
        # Markdown or dash bullets
        if re.match(r'^([-*]|\d+\.)\s+', stripped):
            if not in_list:
                in_list = True
                list_buffer = []
            bullet_text = re.sub(r'^([-*]|\d+\.)\s+', '', stripped)
            # Convert inline bold to <strong>
            bullet_text = re.sub(r'\*\*(.*?)\*\*', r'<strong>\1</strong>', bullet_text)
            list_buffer.append(f'<li class="summary-item">{bullet_text}</li>')
            continue
        # End of a list
        if in_list and not stripped:
            html_lines.append('<ul class="summary-list">' + '\n'.join(list_buffer) + '</ul>')
            list_buffer = []
            in_list = False
            continue
        # If still in a list but next line is not a bullet
        if in_list and not re.match(r'^([-*]|\d+\.)\s+', stripped):
            html_lines.append('<ul class="summary-list">' + '\n'.join(list_buffer) + '</ul>')
            list_buffer = []
            in_list = False
        # Paragraphs (with inline bold)
        if stripped:
            # Convert inline bold to <strong>
            p = re.sub(r'\*\*(.*?)\*\*', r'<strong>\1</strong>', stripped)
            html_lines.append(f'<p class="summary-paragraph">{p}</p>')
    # If list at end
    if in_list and list_buffer:
        html_lines.append('<ul class="summary-list">' + '\n'.join(list_buffer) + '</ul>')

    # Close any open sections
    html = '\n'.join(html_lines)
    html = re.sub(r'(</ul>|</p>)(?!\s*</section>)', r'\1</section>', html)
    
    # Add spacing between sections
    html = re.sub(r'(</section>)(<section)', r'\1\n\2', html)
    
    # Wrap in summary-output div
    html = f'<div class="summary-output">{html}</div>'
    return Markup(html)

# 7. Request logging middleware
@app.before_request
def log_request():
    start_time = time.time()
    request.start_time = start_time
    
    # Log request details
    logger.info(f"Request: {request.method} {request.path}")
    logger.info(f"Origin: {request.headers.get('Origin', 'No Origin')}")
    logger.info(f"Headers: {dict(request.headers)}")
    
    # Log CORS preflight requests specifically
    if request.method == 'OPTIONS':
        logger.info("CORS preflight request detected")

@app.after_request
def log_response(response):
    # Calculate request duration
    duration = time.time() - getattr(request, 'start_time', time.time())
    
    # Log response details
    logger.info(f"Response: {response.status_code} - {duration:.3f}s")
    
    # Add Vary header for CORS
    if 'Origin' in request.headers:
        response.headers['Vary'] = 'Origin'
    
    return response

# 8. Flask routes
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint for liveness probes and connection testing"""
    return jsonify({
        'status': 'healthy',
        'timestamp': str(datetime.now()),
        'app_name': 'YouTube GPT Synthesizer Backend',
        'cors_origins': list(ALLOWED_ORIGINS),
        'environment': os.getenv('FLASK_ENV', 'production')
    })

@app.route('/api/test', methods=['GET'])
def test():
    """Test endpoint to verify API functionality and CORS"""
    origin = request.headers.get('Origin')
    logger.info(f"Test endpoint called from origin: {origin}")
    
    return jsonify({
        'status': 'ok', 
        'message': 'Backend is working!',
        'supadata_configured': bool(SUPADATA_API_KEY),
        'openai_configured': bool(OPENAI_API_KEY),
        'supadata_length': len(SUPADATA_API_KEY) if SUPADATA_API_KEY else 0,
        'openai_length': len(OPENAI_API_KEY) if OPENAI_API_KEY else 0,
        'cors_origin': origin,
        'allowed_origins': list(ALLOWED_ORIGINS)
    })

@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors with CORS headers"""
    logger.warning(f"404 error for path: {request.path}")
    return jsonify({'error': 'Not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors with CORS headers"""
    logger.error(f"500 error: {error}")
    return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/summarize', methods=['POST'])
def summarize():
    print(f"🔍 Received request: {request.method} {request.path}")
    print(f"📋 Headers: {dict(request.headers)}")
    print(f"📦 Content-Type: {request.content_type}")
    
    # Check if API keys are configured
    if not SUPADATA_API_KEY:
        print("❌ SupaData API key not configured")
        return jsonify({'error': 'SupaData API key not configured. Please set SUPADATA_API_KEY environment variable.'}), 500
    if not OPENAI_API_KEY:
        print("❌ OpenAI API key not configured")
        return jsonify({'error': 'OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.'}), 500
    
    try:
        data = request.json
        print(f"📄 Request data: {data}")
    except Exception as e:
        print(f"❌ JSON parse error: {e}")
        return jsonify({'error': f'Invalid JSON: {str(e)}'}), 400
    
    if not data:
        print("❌ No JSON data provided")
        return jsonify({'error': 'No JSON data provided'}), 400
    
    url = data.get('url')
    if not url:
        print("❌ No URL provided")
        return jsonify({'error': 'No URL provided'}), 400
    
    video_id = extract_video_id(url)
    print(f"🎥 Extracted video ID: {video_id}")
    if not video_id:
        print("❌ Invalid YouTube URL")
        return jsonify({'error': 'Invalid YouTube URL'}), 400
    
    try:
        print("📝 Fetching transcript...")
        transcript = get_supadata_transcript(video_id)
        print(f"✅ Transcript fetched, length: {len(transcript)} characters")
    except Exception as e:
        print(f"❌ Transcript fetch error: {e}")
        return jsonify({'error': f'Could not fetch transcript: {str(e)}'}), 500
    
    try:
        print("🤖 Generating summary...")
        summary = summarize_with_openai(transcript)
        summary_html = summary_to_html(summary)
        print("✅ Summary generated successfully")
    except Exception as e:
        print(f"❌ Summary generation error: {e}")
        return jsonify({'error': f'Could not summarize transcript: {str(e)}'}), 500
    
    print("✅ Returning summary")
    return jsonify({'summary': str(summary_html)})

# 8. Run on port 5055 to match Vite proxy configuration
if __name__ == '__main__':
    print("🚀 Starting YouTube GPT Synthesizer Backend...")
    print(f"📍 Server will be available at: http://localhost:5055")
    print(f"🔑 SupaData API Key: {'✅ Configured' if SUPADATA_API_KEY else '❌ Missing'}")
    print(f"🔑 OpenAI API Key: {'✅ Configured' if OPENAI_API_KEY else '❌ Missing'}")
    print("🌐 CORS enabled for all origins")
    print("=" * 50)
    
    try:
        app.run(debug=False, port=5055, host='0.0.0.0')
    except OSError as e:
        if "Address already in use" in str(e):
            print(f"❌ Port 5055 is already in use. Please stop any other services using this port.")
            print(f"💡 You can check what's using the port with: lsof -i :5055")
        else:
            print(f"❌ Failed to start server: {e}")
        exit(1)
