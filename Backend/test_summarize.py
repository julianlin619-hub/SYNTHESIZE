import requests
import sys

def test_summarize(youtube_url):
    url = 'http://127.0.0.1:5000/api/summarize'
    response = requests.post(url, json={'url': youtube_url})
    if response.status_code == 200:
        data = response.json()
        print('Summary:')
        print(data.get('summary', 'No summary returned.'))
    else:
        print(f'Error: {response.status_code}')
        print(response.text)

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print('Usage: python test_summarize.py <YouTube_URL>')
    else:
        test_summarize(sys.argv[1]) 