content = open('requirements.txt', 'rb').read().decode('utf-16le')
lines = content.split('\r\n')
lines = [l.strip() for l in lines if l.strip()]
new_lines = []
for l in lines:
    if 'langchain-openai' in l:
        new_lines.append('langchain-openai')
    elif 'langchain-google-genai' in l:
        new_lines.append('langchain-google-genai')
    else:
        new_lines.append(l)
open('requirements.txt', 'w', encoding='utf-8', newline='\n').write('\n'.join(new_lines) + '\n')
