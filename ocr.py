import os
import sys
import django
import json
import shutil
import base64
from pathlib import Path
from dotenv import load_dotenv

# Initialize Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.core.files import File
from courses.models import Course, PastQuestionPaper, Question, FillInTheGap, PopQuestion
import google.generativeai as genai

load_dotenv()
api_key = os.environ.get("GEMINI_API_KEY")
if not api_key:
    print("Error: GEMINI_API_KEY not found in .env file.")
    sys.exit(1)

genai.configure(api_key=api_key)

PAST_QUESTIONS_DIR = Path("past_questions")
COMPLETED_DIR = PAST_QUESTIONS_DIR / "completed"

def process_file(file_path: Path, course: Course):
    print(f"Processing {file_path.name} for {course.code}...")
    
    # Send to Gemini
    model = genai.GenerativeModel('gemini-1.5-flash')
    
    prompt = """
    You are an expert university professor for NOUN.
    Please read the attached exam past question paper.
    
    Extract the following information and return it strictly as a valid JSON object without markdown blocks:
    {
        "year": "e.g. 2023",
        "semester": "e.g. First Semester",
        "questions": [
            {
                "type": "CBT",
                "text": "The actual question text",
                "option_a": "Option A text",
                "option_b": "Option B text",
                "option_c": "Option C text",
                "option_d": "Option D text",
                "correct_answer": "A, B, C, or D",
                "answer_text": ""
            },
            {
                "type": "FILL",
                "text": "The actual question text with blank",
                "correct_answer": "The exact word/phrase",
                "option_a": "", "option_b": "", "option_c": "", "option_d": "", "answer_text": ""
            },
            {
                "type": "POP",
                "text": "The actual essay/theory question text",
                "answer_text": "Detailed step-by-step solution",
                "correct_answer": "", "option_a": "", "option_b": "", "option_c": "", "option_d": ""
            }
        ]
    }
    
    Instructions:
    1. Determine the year and semester from the header of the paper.
    2. For each question, determine if it is Multiple Choice (CBT), Fill-in-the-gap (FILL), or Theory/Essay (POP).
    3. Solve the question and provide the correct answer. For POP, provide a detailed step-by-step solution.
    4. Provide valid JSON only. Do not wrap it in ```json blocks.
    """
    
    mime_type = "image/jpeg" if file_path.suffix.lower() in ['.jpg', '.jpeg'] else "image/png" if file_path.suffix.lower() == '.png' else "application/pdf"
    
    # For Gemini, we upload the file using the File API since images/pdfs can be large
    try:
        print(f"Uploading {file_path.name} to Gemini API...")
        uploaded_file = genai.upload_file(str(file_path), mime_type=mime_type)
        print("Upload complete. Generating content...")
        response = model.generate_content([prompt, uploaded_file])
    except Exception as e:
        print(f"Failed to process {file_path.name} with Gemini: {e}")
        return False
        
    try:
        response_text = response.text.strip()
        if response_text.startswith("```json"):
            response_text = response_text[7:-3]
        elif response_text.startswith("```"):
             response_text = response_text[3:-3]
        data = json.loads(response_text)
    except Exception as e:
        print(f"Failed to parse JSON from Gemini for {file_path.name}: {e}")
        print("Raw response:", response.text)
        return False
        
    year = data.get("year", "Unknown")
    semester = data.get("semester", "Unknown")
    
    # Save the file to PastQuestionPaper
    pq = PastQuestionPaper(course=course, year=year, semester=semester)
    with open(file_path, 'rb') as f:
        pq.file.save(file_path.name, File(f))
    pq.save()
    
    # Process questions
    questions = data.get("questions", [])
    for q in questions:
        q_type = q.get("type")
        if q_type == "CBT":
            Question.objects.create(
                course=course,
                past_question_paper=pq,
                year=year,
                semester=semester,
                text=q.get("text", ""),
                option_a=q.get("option_a", ""),
                option_b=q.get("option_b", ""),
                option_c=q.get("option_c", ""),
                option_d=q.get("option_d", ""),
                correct_answer=q.get("correct_answer", "A")
            )
        elif q_type == "FILL":
            FillInTheGap.objects.create(
                course=course,
                past_question_paper=pq,
                year=year,
                semester=semester,
                question_text=q.get("text", ""),
                correct_answer=q.get("correct_answer", "")
            )
        elif q_type == "POP":
            PopQuestion.objects.create(
                course=course,
                past_question_paper=pq,
                year=year,
                semester=semester,
                question_text=q.get("text", ""),
                answer_text=q.get("answer_text", "")
            )
    
    print(f"Successfully processed {len(questions)} questions from {file_path.name}.")
    
    # Move to completed
    course_completed_dir = COMPLETED_DIR / course.code
    course_completed_dir.mkdir(parents=True, exist_ok=True)
    shutil.move(str(file_path), str(course_completed_dir / file_path.name))
    return True

def main():
    if not PAST_QUESTIONS_DIR.exists():
        PAST_QUESTIONS_DIR.mkdir()
        print(f"Created {PAST_QUESTIONS_DIR} folder. Add course subfolders here.")
        return
        
    found_files = False
    for course_dir in PAST_QUESTIONS_DIR.iterdir():
        if not course_dir.is_dir() or course_dir.name == "completed":
            continue
            
        course_code = course_dir.name
        try:
            course = Course.objects.get(code=course_code)
        except Course.DoesNotExist:
            print(f"Course {course_code} not found in database. Skipping folder.")
            continue
            
        for file_path in course_dir.iterdir():
            if file_path.is_file() and file_path.suffix.lower() in ['.jpg', '.jpeg', '.png', '.pdf']:
                found_files = True
                process_file(file_path, course)

    if not found_files:
        print("No image or PDF files found. Place them inside course folders like past_questions/MTH101/")

if __name__ == "__main__":
    main()
