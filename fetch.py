import urllib.request, urllib.error, re
try:
    urllib.request.urlopen('https://noun-study-buddy.onrender.com/api/courses/')
    print('Success')
except urllib.error.HTTPError as e:
    html = e.read().decode('utf-8', errors='ignore')
    match = re.search(r'Exception Value:.*?(<pre.*?>(.*?)</pre>|</div>)', html, re.DOTALL | re.IGNORECASE)
    if match:
        print('Exception Value:')
        print(match.group(0)[:500])
    else:
        print('Exception value not found in HTML')
except Exception as e:
    print('Error:', e)
