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
FRONTEND_ORIGINS = os.getenv("FRONTEND_ORIGINS", "").split(",")
ALLOWED_ORIGINS = set([
    # Development origins
    "http://localhost:8080",  # Frontend dev server
    "http://localhost:8081",  # Frontend dev server (alternative port)
    "http://localhost:3000",  # Alternative local port
    "http://localhost:5173",  # Vite default port
    # Production origins
    "https://youtube-gpt-synthesizer-backend.onrender.com",  # Production backend
    "https://*.vercel.app",  # Vercel frontend domains
    # Add custom domains from environment
    *[o.strip() for o in FRONTEND_ORIGINS if o.strip()]
])

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

# OpenAI API Configuration - Centralized for easy maintenance
OPENAI_CONFIG = {
    'model': 'gpt-5',
    'max_completion_tokens': 10000,  # ✅ Updated parameter name for API compatibility
    'temperature': 0.7,
    'system_prompt': "You summarize long YouTube transcripts professionally. You MUST follow the exact formatting instructions provided in the user prompt, including bullet points, bold text, emojis, and clear section breaks."
}

# Validate required environment variables
if not SUPADATA_API_KEY:
    print("ERROR: SUPADATA_API_KEY environment variable is not set!")
    print("Please create a .env file with your SupaData API key")
if not OPENAI_API_KEY:
    print("ERROR: OPENAI_API_KEY environment variable is not set!")
    print("Please create a .env file with your OpenAI API key")

if not SUPADATA_API_KEY or not OPENAI_API_KEY:
    print("Missing required API keys. The application may not work properly.")

# Validate OpenAI configuration
def validate_openai_config():
    """Validate OpenAI API configuration and test basic connectivity"""
    try:
        # Test API key validity with a simple request
        test_response = client.chat.completions.create(
            model=OPENAI_CONFIG['model'],
            messages=[{"role": "user", "content": "Hello"}],
            max_completion_tokens=10
        )
        print(f"✅ OpenAI API configuration validated successfully")
        return True
    except Exception as e:
        error_msg = str(e)
        if "max_tokens" in error_msg and "unsupported" in error_msg:
            print("⚠️  Warning: max_tokens parameter not supported, using max_completion_tokens")
            # Update config to use supported parameter
            OPENAI_CONFIG['max_completion_tokens'] = OPENAI_CONFIG.get('max_completion_tokens', 10000)
        elif "max_completion_tokens" in error_msg and "unsupported" in error_msg:
            print("⚠️  Warning: max_completion_tokens parameter not supported, removing token limit")
            OPENAI_CONFIG.pop('max_completion_tokens', None)
        else:
            print(f"❌ OpenAI API configuration error: {error_msg}")
            return False
        return True

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

# 2. Fetch transcript from SupaData with comprehensive validation
def get_supadata_transcript(video_id):
    """
    Fetch transcript from SupaData with comprehensive validation and error handling.
    Returns validated transcript text or raises descriptive exceptions.
    """
    print(f"🔍 Fetching transcript for video ID: {video_id}")
    
    url = f'https://api.supadata.ai/v1/youtube/transcript?videoId={video_id}'
    headers = {'x-api-key': SUPADATA_API_KEY}
    
    try:
        response = requests.get(url, headers=headers, timeout=30)
        print(f"📡 SupaData API response status: {response.status_code}")
        
        if response.status_code != 200:
            error_text = response.text
            print(f"❌ SupaData API error (HTTP {response.status_code}): {error_text}")
            
            # Provide user-friendly error messages based on status codes
            if response.status_code == 401:
                raise Exception("Authentication failed: Please check your SupaData API key")
            elif response.status_code == 404:
                raise Exception("Video transcript not found: This video may not have captions or transcripts available")
            elif response.status_code == 429:
                raise Exception("Rate limit exceeded: Please try again later")
            elif response.status_code >= 500:
                raise Exception("SupaData service temporarily unavailable: Please try again later")
            else:
                raise Exception(f"SupaData API error: {error_text}")
        
        # Parse JSON response
        try:
            data = response.json()
            print(f"📄 SupaData response keys: {list(data.keys()) if isinstance(data, dict) else 'Not a dict'}")
        except Exception as json_error:
            print(f"❌ Failed to parse SupaData JSON response: {json_error}")
            print(f"📄 Raw response: {response.text[:500]}...")
            raise Exception("Invalid response from transcript service")
        
        # Validate response structure
        if not isinstance(data, dict):
            raise Exception("Invalid response format from transcript service")
        
        if 'content' not in data:
            print(f"❌ Missing 'content' key in SupaData response")
            print(f"📄 Available keys: {list(data.keys())}")
            print(f"📄 Response preview: {str(data)[:500]}...")
            raise Exception("Transcript content not found in response")
        
        content = data['content']
        if not content or not isinstance(content, list):
            print(f"❌ Invalid content format: {type(content)}")
            raise Exception("Transcript content is empty or invalid")
        
        # Extract and validate transcript text
        transcript_parts = []
        for i, entry in enumerate(content):
            if not isinstance(entry, dict) or 'text' not in entry:
                print(f"⚠️  Skipping invalid entry {i}: {entry}")
                continue
            
            text = entry.get('text', '').strip()
            if text:  # Only add non-empty text
                transcript_parts.append(text)
        
        if not transcript_parts:
            print("❌ No valid transcript text found in response")
            raise Exception("This video has no available transcript or captions")
        
        # Join transcript parts and validate final result
        transcript_text = ' '.join(transcript_parts)
        print(f"✅ Transcript assembled successfully")
        print(f"📊 Transcript parts: {len(transcript_parts)}")
        print(f"📏 Total transcript length: {len(transcript_text)} characters")
        print(f"📝 Transcript preview: {transcript_text[:200]}...")
        
        # Final validation
        if len(transcript_text.strip()) < 50:  # Minimum reasonable transcript length
            print(f"⚠️  Warning: Transcript seems very short ({len(transcript_text)} chars)")
            print(f"📝 Full transcript: {transcript_text}")
        
        return transcript_text
        
    except requests.exceptions.Timeout:
        print("❌ SupaData API request timed out")
        raise Exception("Transcript service request timed out. Please try again.")
    except requests.exceptions.RequestException as req_error:
        print(f"❌ Network error fetching transcript: {req_error}")
        raise Exception(f"Network error: {str(req_error)}")
    except Exception as e:
        # Re-raise our custom exceptions
        raise e

# 3. Load summary prompt template

def generate_summary_prompt(transcript_text):
    """
    Generate a comprehensive summary prompt with input validation.
    Ensures the transcript is properly formatted and the prompt is complete.
    """
    # Validate transcript input
    if not transcript_text or not isinstance(transcript_text, str):
        raise ValueError("Transcript text must be a non-empty string")
    
    transcript_text = transcript_text.strip()
    if len(transcript_text) < 10:
        raise ValueError("Transcript text is too short to generate a meaningful summary")
    
    print(f"🔧 Generating prompt for transcript length: {len(transcript_text)} characters")
    print(f"🔧 Transcript preview: {transcript_text[:200]}...")
    
    # Clean and prepare transcript text
    # Remove excessive whitespace and normalize line breaks
    cleaned_transcript = re.sub(r'\s+', ' ', transcript_text).strip()
    
    template = f"""
👨‍💼 **Role**

You are a professional video content analyst with expertise in summarizing long-form YouTube transcripts by extracting key insights and detailed takeaways.

---

🎯 **Task**

Summarize the following YouTube transcript using this process:

1. **Read the entire transcript carefully**
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
• **NEVER** return empty content or just formatting

---

🛠️ **Specifics**

• This task transforms long YouTube videos into digestible formats for readers
• Maintain a **neutral, informative tone** with no personal opinions
• The summary should allow someone to grasp the **main points and flow** without watching
• Be precise and avoid oversimplifying complex ideas
• Prioritize clarity and completeness—**every major concept matters**
• **IMPORTANT**: If the transcript seems incomplete or unclear, note this in your summary

---

🧠 **Context**

We create written summaries of YouTube videos for busy audiences who prefer reading. Your role is vital to our brand's credibility and user satisfaction.

---

📝 **Transcript to Summarize:**

{cleaned_transcript}

---

🎯 **Remember**: Generate a comprehensive, well-structured summary that captures the essence of this video. Use the formatting requirements above and ensure your response is informative and complete.
"""
    
    print(f"✅ Prompt generated successfully")
    print(f"📏 Final prompt length: {len(template)} characters")
    
    return template

# 3.5. Fallback summary generation with simplified prompt
def generate_fallback_summary(transcript_text):
    """
    Generate a fallback summary using a simplified prompt when the main method fails.
    This provides a backup option for edge cases.
    """
    print("🔄 Generating fallback summary with simplified prompt...")
    
    # Simplified prompt for fallback
    fallback_prompt = f"""
Please provide a brief summary of this YouTube video transcript in 2-3 paragraphs:

{transcript_text[:2000]}...

Focus on the main points and key takeaways. Use simple, clear language.
"""
    
    try:
        response = client.chat.completions.create(
            model=OPENAI_CONFIG['model'],
            messages=[
                {"role": "system", "content": "You are a helpful assistant that summarizes video content clearly and concisely."},
                {"role": "user", "content": fallback_prompt}
            ],
            max_completion_tokens=1000,  # Shorter for fallback
        )
        
        if response.choices and response.choices[0].message and response.choices[0].message.content:
            fallback_result = response.choices[0].message.content.strip()
            print(f"✅ Fallback summary generated: {len(fallback_result)} characters")
            return fallback_result
        else:
            print("❌ Fallback summary response was empty")
            return None
            
    except Exception as e:
        print(f"❌ Fallback summary generation failed: {e}")
        return None

# 4. Estimate tokens
def estimate_tokens(text, model="gpt-5"):
    try:
        encoding = tiktoken.encoding_for_model(model)
    except Exception:
        encoding = tiktoken.get_encoding("cl100k_base")
    return len(encoding.encode(text))


# 5. Summarize with OpenAI
def summarize_with_openai(transcript_text):
    model = OPENAI_CONFIG['model']
    input_tokens = estimate_tokens(transcript_text, model=model)
    max_output_tokens = min(OPENAI_CONFIG['max_completion_tokens'], 8000)
    prompt = generate_summary_prompt(transcript_text)

    print(f"🤖 OpenAI API call - Model: {model}, Input tokens: {input_tokens}, Max output: {max_output_tokens}")
    print(f"📝 Prompt length: {len(prompt)} characters")

    try:
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": OPENAI_CONFIG['system_prompt']},
                {"role": "user", "content": prompt}
            ],
            max_completion_tokens=max_output_tokens,  # ✅ Updated: max_tokens -> max_completion_tokens for API compatibility
        )
    except Exception as api_error:
        error_msg = str(api_error)
        print(f"❌ OpenAI API Error: {error_msg}")
        
        # Handle specific parameter errors with user-friendly messages
        if "max_tokens" in error_msg and "unsupported" in error_msg:
            print("🔄 Retrying with max_completion_tokens parameter...")
            try:
                response = client.chat.completions.create(
                    model=model,
                    messages=[
                        {"role": "system", "content": OPENAI_CONFIG['system_prompt']},
                        {"role": "user", "content": prompt}
                    ],
                    max_completion_tokens=max_output_tokens,
                )
            except Exception as retry_error:
                print(f"❌ Retry failed: {retry_error}")
                raise Exception(f"OpenAI API configuration error: {retry_error}")
        elif "max_completion_tokens" in error_msg and "unsupported" in error_msg:
            # Fallback: try without token limit parameter
            print("🔄 Retrying without token limit parameter...")
            try:
                response = client.chat.completions.create(
                    model=model,
                    messages=[
                        {"role": "system", "content": OPENAI_CONFIG['system_prompt']},
                        {"role": "user", "content": prompt}
                    ],
                )
            except Exception as fallback_error:
                print(f"❌ Fallback failed: {fallback_error}")
                raise Exception(f"OpenAI API fallback failed: {fallback_error}")
        else:
            # Re-raise other types of errors
            raise api_error
    
    # Debug: Log the raw response structure
    print(f"🔍 Raw response type: {type(response)}")
    print(f"🔍 Response attributes: {dir(response)}")
    print(f"🔍 Response choices: {response.choices if hasattr(response, 'choices') else 'No choices'}")
    if hasattr(response, 'choices') and response.choices:
        print(f"🔍 First choice type: {type(response.choices[0])}")
        print(f"🔍 First choice attributes: {dir(response.choices[0])}")
        if hasattr(response.choices[0], 'message'):
            print(f"🔍 Message type: {type(response.choices[0].message)}")
            print(f"🔍 Message attributes: {dir(response.choices[0].message)}")
            print(f"🔍 Message content: {response.choices[0].message.content}")
    
    # Ensure we have a valid response before processing
    if not hasattr(response, 'choices') or not response.choices:
        raise Exception("OpenAI API returned an empty response")
    
    if not response.choices[0].message or not response.choices[0].message.content:
        raise Exception("OpenAI API returned empty content")
    
    result = response.choices[0].message.content.strip()
    print(f"🤖 OpenAI response length: {len(result)} characters")
    print(f"🤖 OpenAI response preview: {result[:200]}...")
    
    # Validate the response
    if not result:
        raise Exception("OpenAI API returned empty content after processing")
    
    return result

# 6. Convert summary to HTML
def summary_to_html(summary_text):
    import re
    from markupsafe import Markup

    print(f"🔧 Converting summary to HTML. Input length: {len(summary_text)}")
    print(f"🔧 First 200 chars: {summary_text[:200]}...")

    # Split into lines for processing
    lines = summary_text.split('\n')
    print(f"🔧 Number of lines: {len(lines)}")
    
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

@app.route('/version', methods=['GET'])
def version():
    """Version endpoint for deployment verification and debugging"""
    return jsonify({
        'version': '1.0.0',
        'deployment_time': str(datetime.now()),
        'environment': os.getenv('FLASK_ENV', 'production'),
        'port': os.getenv('PORT', '5055'),
        'host': '0.0.0.0',
        'cors_enabled': True,
        'api_keys_configured': {
            'supadata': bool(SUPADATA_API_KEY),
            'openai': bool(OPENAI_API_KEY)
        }
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
    start_time = time.time()
    print(f"🔍 Received request: {request.method} {request.path}")
    print(f"📋 Headers: {dict(request.headers)}")
    print(f"📦 Content-Type: {request.content_type}")
    print(f"🌐 Origin: {request.headers.get('Origin', 'Unknown')}")
    
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
        
        # Additional transcript validation
        if not transcript or not isinstance(transcript, str):
            print("❌ Transcript validation failed: transcript is empty or invalid")
            return jsonify({'error': 'Failed to retrieve valid transcript from this video. This video may not have captions or transcripts available.'}), 400
        
        transcript = transcript.strip()
        if len(transcript) < 50:
            print(f"❌ Transcript too short: {len(transcript)} characters")
            return jsonify({'error': 'This video has a very short transcript that may not be suitable for summarization. Try a video with longer content.'}), 400
        
        print(f"✅ Transcript fetched and validated, length: {len(transcript)} characters")
        print(f"📝 Transcript preview: {transcript[:200]}...")
        
    except Exception as e:
        error_msg = str(e)
        print(f"❌ Transcript fetch error: {error_msg}")
        
        # Provide user-friendly error messages
        if "no available transcript" in error_msg.lower() or "no captions" in error_msg.lower():
            user_error = "This video doesn't have captions or transcripts available. Please try a different video."
        elif "not found" in error_msg.lower():
            user_error = "Video transcript not found. This video may be private, deleted, or not have captions."
        elif "authentication failed" in error_msg.lower():
            user_error = "Service authentication error. Please contact support."
        elif "rate limit" in error_msg.lower():
            user_error = "Service temporarily unavailable due to high demand. Please try again later."
        elif "timeout" in error_msg.lower():
            user_error = "Transcript service is taking too long to respond. Please try again."
        else:
            user_error = f"Could not fetch transcript: {error_msg}"
        
        return jsonify({'error': user_error}), 500
    
    try:
        print("🤖 Generating summary...")
        summary = summarize_with_openai(transcript)
        
        # Validate summary output
        if not summary or not isinstance(summary, str):
            print("❌ Summary validation failed: summary is empty or invalid")
            raise Exception("OpenAI returned an invalid or empty summary")
        
        summary = summary.strip()
        if len(summary) < 20:
            print(f"❌ Summary too short: {len(summary)} characters")
            raise Exception("Generated summary is too short to be useful")
        
        print(f"📄 Raw summary text: {summary[:500]}...")  # Show first 500 chars
        print(f"📄 Summary length: {len(summary)} characters")
        print(f"📄 Summary type: {type(summary)}")
        print(f"📄 Summary is empty: {not summary}")
        print(f"📄 Summary contains '**': {'**' in summary}")
        print(f"📄 Summary contains '-': {'-' in summary}")
        
        # Convert to HTML
        try:
            summary_html = summary_to_html(summary)
            print(f"🔧 Generated HTML: {summary_html[:500]}...")  # Show first 500 chars
        except Exception as html_error:
            print(f"⚠️  HTML conversion failed: {html_error}")
            # Fallback: return plain text summary
            summary_html = f"<div class='summary-output'><pre>{summary}</pre></div>"
            
        print("✅ Summary generated successfully")
        
    except Exception as e:
        error_msg = str(e)
        print(f"❌ Summary generation error: {error_msg}")
        import traceback
        traceback.print_exc()
        
        # Try fallback summary generation with different parameters
        print("🔄 Attempting fallback summary generation...")
        try:
            fallback_summary = generate_fallback_summary(transcript)
            if fallback_summary and len(fallback_summary.strip()) > 20:
                print("✅ Fallback summary generated successfully")
                summary_html = summary_to_html(fallback_summary)
                return jsonify({'summary': str(summary_html)})
        except Exception as fallback_error:
            print(f"❌ Fallback summary also failed: {fallback_error}")
        
        # Provide user-friendly error messages
        if "max_tokens" in error_msg and "unsupported" in error_msg:
            user_error = "API configuration error: The 'max_tokens' parameter is not supported. Please contact support."
        elif "max_completion_tokens" in error_msg and "unsupported" in error_msg:
            user_error = "API configuration error: Token limit parameter not supported. Please contact support."
        elif "API key" in error_msg.lower():
            user_error = "Authentication error: Please check your API configuration."
        elif "quota" in error_msg.lower() or "rate limit" in error_msg.lower():
            user_error = "Service temporarily unavailable due to rate limits. Please try again later."
        elif "empty content" in error_msg.lower():
            user_error = "Summary generation failed: The AI model returned empty content. This may be due to the video content being unsuitable for summarization."
        else:
            user_error = f"Summary generation failed: {error_msg}"
        
        return jsonify({'error': user_error}), 500
    
    elapsed_time = time.time() - start_time
    print(f"✅ Summary generation completed successfully in {elapsed_time:.2f} seconds")
    print(f"📊 Final summary length: {len(summary_html)} characters")
    return jsonify({'summary': str(summary_html)})

# 8. Run on port 5055 to match Vite proxy configuration
if __name__ == '__main__':
    print("🚀 Starting YouTube GPT Synthesizer Backend...")
    
    # Use PORT environment variable for production (Render), fallback to 5055 for development
    port = int(os.getenv("PORT", "5055"))
    host = "0.0.0.0"  # Bind to all interfaces for production
    
    print(f"📍 Server will be available at: http://{host}:{port}")
    print(f"🔑 SupaData API Key: {'✅ Configured' if SUPADATA_API_KEY else '❌ Missing'}")
    print(f"🔑 OpenAI API Key: {'✅ Configured' if OPENAI_API_KEY else '❌ Missing'}")
    print("🌐 CORS enabled for all origins")
    print("=" * 50)
    
    # Validate OpenAI configuration before starting server
    if not validate_openai_config():
        print("❌ OpenAI configuration validation failed. Server may not work properly.")
        print("💡 Check your API key and model configuration.")
    else:
        print("✅ OpenAI configuration validated successfully")
    
    try:
        app.run(debug=False, port=port, host=host)
    except OSError as e:
        if "Address already in use" in str(e):
            print(f"❌ Port {port} is already in use. Please stop any other services using this port.")
            print(f"💡 You can check what's using the port with: lsof -i :{port}")
        else:
            print(f"❌ Failed to start server: {e}")
        exit(1)
