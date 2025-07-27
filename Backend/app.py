from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import re
import os
import requests
import tiktoken
from dotenv import load_dotenv
from markupsafe import Markup
from openai import OpenAI  # ✅ New OpenAI SDK v1+

# Load .env variables
load_dotenv()

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

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
    template = """
# Role

You are a professional video content analyst with a strong background in media summarization. Your expertise lies in extracting key insights and detailed takeaways from long-form YouTube video transcripts.

# Task

Summarize the following YouTube transcript by following this detailed process:

- **Carefully read** the entire transcript from start to finish.
- **Identify and extract** all key points, including timestamps if mentioned, main arguments, examples, and calls to action.
- **Preserve the original sequence** of ideas while condensing the content for clarity.
- **Provide a detailed summary** that reflects the video’s full informational value without skipping or distorting critical points.
- **Highlight notable quotes or phrases** where impactful.
- **Use bullet points or short paragraphs** to structure the summary clearly.

---

## Transcript

```text
{transcript_text}
```

---

# Specifics

- This task is vital for transforming long YouTube content into easily digestible formats for viewers.
- Maintain a **neutral, informative tone** without injecting personal opinions.
- The summary should be **thorough enough** that someone could understand the main points and flow of the video without watching it.
- Please be **precise, methodical, and avoid oversimplifying** complex sections.
- Aim for **clarity and completeness**—every major concept and subpoint matters.

# Context

We create high-quality written summaries of YouTube videos for busy audiences who prefer to read than watch. These summaries are used in newsletters, blogs, and social media captions. Your detailed and faithful summaries help our audience save time while still engaging with the core content. This role is essential to our brand’s credibility and user satisfaction.

# Example

**Q:** Summarize this transcript on how to build AI prompts

**A:**

**Bottom Line Up Front**

This video teaches viewers how to move from basic conversational prompting (like using ChatGPT templates) to advanced single-shot prompt engineering that can replace hundreds of lines of code and create scalable AI systems worth thousands of dollars.

**Main Premise: The Midwit Trap**

- Left side (Low IQ): People who use ChatGPT casually
- Middle (Midwit): Prompt engineers who rely on templates without deep understanding
- Right side (Genius): Those who use research-backed prompting techniques

**Key Quote:**

> "Your ability to prompt them and provide instruction of these models directly impacts your ability to get value out of them."

**Why Most People Are Bad at Prompt Engineering**

- Conversational Prompting: Casual, multi-step human-in-the-loop approach
- Single-Shot Prompting: Critical for automation, requires high precision
- High Stakes: Single-shot skills lead to scalable, valuable AI systems
- Karpathy Quote: "The hottest new programming language is English"
- Core Thesis: "A well-written prompt can replace hundreds of lines of code"

**The Perfect Prompt Formula (ROLE-TASK-SPECIFICS-CONTEXT-EXAMPLES-NOTES)**

Each component is backed by academic research:

- **ROLE:** Assign expert identity (+15–25% performance)
- **TASK:** Use step-by-step instructions (up to 90% gain for complex problems)
- **SPECIFICS:** Add emotional reinforcement (115% boost on complex tasks)
- **CONTEXT:** Describe business/environment relevance
- **EXAMPLES:** Few-shot examples improve accuracy from 10% to 60%
- **NOTES:** Reminders at beginning or end avoid "Lost in the Middle" performance drops

**Advanced Techniques**

- Use markdown formatting for clarity
- Choose appropriate model/temperature settings for cost and reliability
- Break complex tasks into smaller steps for cheaper models
- Positive phrasing and persona-based prompting improve results

**Real-World Use Case**

- Email classification system built from scratch
- Before: One-sentence prompt
- After: Full scientific prompt → 300%+ accuracy gain

**Final Comparison**

- Midwit: Template-only, expensive models, poor reliability
- Genius: Research-based, optimized prompts, fast + affordable outputs

**Key Takeaways**

- Prompting is foundational to all AI use cases
- A scientific approach yields better performance and business value
- Avoiding this skill = less money, less value, lower impact

**Final Quote:**

> "If you don't take the time to actually soak in this information... you are not going to make any money in AI because everything depends on it."

# Notes

- Do not generalize; be specific and retain nuance.
- Use bullet points or short paragraphs for readability.
- Do not include opinions, only what was actually said in the video.
- Your summary should reflect the true structure, tone, and depth of the original content.
- If the transcript is fragmented or unclear, do your best to infer the intended message based on surrounding context.
    """
    return template.format(transcript_text=transcript_text)

# 4. Estimate tokens
def estimate_tokens(text, model="gpt-4.1"):
    try:
        encoding = tiktoken.encoding_for_model(model)
    except Exception:
        encoding = tiktoken.get_encoding("cl100k_base")
    return len(encoding.encode(text))


# 5. Summarize with OpenAI
def summarize_with_openai(transcript_text):
    model = "gpt-4.1"
    input_tokens = estimate_tokens(transcript_text, model=model)
    max_output_tokens = min(10000, input_tokens)
    prompt = generate_summary_prompt(transcript_text)

    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": "You summarize long YouTube transcripts professionally."},
            {"role": "user", "content": prompt}
        ],
        max_tokens=max_output_tokens,
        temperature=0.01,
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

# 7. Flask routes
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/summarize', methods=['POST'])
def summarize():
    # Check if API keys are configured
    if not SUPADATA_API_KEY:
        return jsonify({'error': 'SupaData API key not configured. Please set SUPADATA_API_KEY environment variable.'}), 500
    if not OPENAI_API_KEY:
        return jsonify({'error': 'OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.'}), 500
    
    data = request.json
    if not data:
        return jsonify({'error': 'No JSON data provided'}), 400
    
    url = data.get('url')
    if not url:
        return jsonify({'error': 'No URL provided'}), 400
    
    video_id = extract_video_id(url)
    if not video_id:
        return jsonify({'error': 'Invalid YouTube URL'}), 400
    
    try:
        transcript = get_supadata_transcript(video_id)
    except Exception as e:
        return jsonify({'error': f'Could not fetch transcript: {str(e)}'}), 500
    
    try:
        summary = summarize_with_openai(transcript)
        summary_html = summary_to_html(summary)
    except Exception as e:
        return jsonify({'error': f'Could not summarize transcript: {str(e)}'}), 500
    
    return jsonify({'summary': str(summary_html)})

# 8. Run on port 5050 to avoid macOS conflict
if __name__ == '__main__':
    app.run(debug=False, port=5055)
