import os
import json
import time
import fitz  # PyMuPDF
from fpdf import FPDF
from django.conf import settings
from django.db import transaction, connection
from dotenv import load_dotenv

load_dotenv()

from langchain_groq import ChatGroq
from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate

from .models import Course, Summary, Question, FillInTheGap, PopQuestion

# ── LLM Setup ─────────────────────────────────────────────────────────────────
available_llms = []

groq_key = os.environ.get("GROQ_API_KEY")
if groq_key:
    available_llms.append(ChatGroq(model="llama-3.1-8b-instant", temperature=0.1, max_tokens=4000, api_key=groq_key))

gemini_key = os.environ.get("GEMINI_API_KEY")
if gemini_key:
    available_llms.append(ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0.1, max_tokens=4000, google_api_key=gemini_key))

openai_key = os.environ.get("OPENAI_API_KEY")
if openai_key:
    available_llms.append(ChatOpenAI(model="gpt-4o-mini", temperature=0.1, max_tokens=4000, api_key=openai_key))

if available_llms:
    llm = available_llms[0]
    if len(available_llms) > 1:
        llm = llm.with_fallbacks(available_llms[1:])
else:
    llm = None

# ── Course Type Detection ─────────────────────────────────────────────────────
GENERAL_STUDIES_PREFIXES = ["GST", "ENT", "CLA"]
TECHNICAL_PREFIXES = [
    "MTH", "CIT", "CSC", "PHY", "CHM", "STA",
    "ENG", "EEE", "MCE", "CVE", "CPE", "BIO"
]

def is_technical_course(course_code: str) -> bool:
    code_upper = course_code.upper()
    return any(code_upper.startswith(prefix) for prefix in TECHNICAL_PREFIXES)

# ==============================================================================
# HELPER FUNCTIONS
# ==============================================================================

def safe_parse_json(raw: str) -> list:
    try:
        clean = raw.replace("```json", "").replace("```", "").strip()
        start = clean.find("[")
        end = clean.rfind("]") + 1
        if start == -1 or end == 0:
            return []
        data = json.loads(clean[start:end])
        return data if isinstance(data, list) else []
    except json.JSONDecodeError as e:
        return []

def call_llm(chain, inputs: dict, retries=3, wait=10) -> str:
    for attempt in range(1, retries + 1):
        try:
            response = chain.invoke(inputs)
            return response.content
        except Exception as e:
            if attempt < retries:
                time.sleep(wait)
    return ""

def sample_text_evenly(doc, sections=5, chars_per_section=3000) -> str:
    total_pages = len(doc)
    if total_pages == 0:
        return ""
    all_text = ""
    section_size = max(1, total_pages // sections)
    for i in range(sections):
        start_page = i * section_size
        end_page = min(start_page + section_size, total_pages)
        chunk = "".join([doc[p].get_text() for p in range(start_page, end_page)])
        all_text += chunk[:chars_per_section] + "\n\n"
    return all_text

# ==============================================================================
# SUMMARY GENERATION
# ==============================================================================

def generate_summary(doc, course_code: str, course_title: str, is_technical: bool) -> str:
    total_pages = len(doc)
    chunk_size = 20

    if is_technical:
        summary_template = """
You are a NOUN distance learning tutor writing a study guide for {course_code}: {course_title}.
IMPORTANT CONTEXT: NOUN students study ALONE at home. Make this material crystal clear.
Read this section and write a DETAILED study guide that includes:
1. KEY DEFINITIONS (simple English)
2. CORE CONCEPTS EXPLAINED SIMPLY
3. STEP-BY-STEP PROCESSES (if any calculations)
4. THINGS TO MEMORIZE FOR EXAM
5. PRACTICE EXAM QUESTIONS WITH DETAILED EXPLANATIONS

Textbook section for {course_code}:
{text}
"""
    else:
        summary_template = """
You are a NOUN distance learning tutor writing a study guide for {course_code}: {course_title}.
Read this section and write a study guide that includes:
1. KEY DEFINITIONS
2. MAIN CONCEPTS
3. IMPORTANT FACTS TO REMEMBER
4. SUMMARY POINTS
5. PRACTICE EXAM QUESTIONS WITH DETAILED EXPLANATIONS

Textbook section for {course_code}:
{text}
"""
    prompt = PromptTemplate.from_template(summary_template)
    chain = prompt | llm

    full_summary = f"STUDY SUMMARY: {course_code} - {course_title}\n"
    full_summary += "=" * 60 + "\n\n"

    for i in range(0, total_pages, chunk_size):
        chunk_pages = doc[i: i + chunk_size]
        chunk_text = "".join([p.get_text() for p in chunk_pages])
        if len(chunk_text.strip()) < 150:
            continue
        page_end = min(i + chunk_size, total_pages)
        chunk_summary = call_llm(chain, {"text": chunk_text[:3000], "course_code": course_code, "course_title": course_title}, wait=10)
        if chunk_summary.strip():
            full_summary += f"\n\n" + "-" * 50 + "\n"
            full_summary += f"PAGES {i+1} TO {page_end}\n"
            full_summary += "-" * 50 + "\n\n"
            full_summary += chunk_summary
        time.sleep(5)
    return full_summary

def create_summary_pdf(course_code: str, course_title: str, summary_text: str) -> str:
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=20)
    pdf.add_page()
    pdf.set_fill_color(26, 77, 58)
    pdf.rect(0, 0, 210, 45, 'F')
    pdf.set_text_color(255, 255, 255)
    pdf.set_font("Arial", style="B", size=20)
    pdf.set_xy(10, 10)
    pdf.cell(0, 10, "NOUN STUDY BUDDY", ln=True, align="C")
    pdf.set_font("Arial", style="B", size=14)
    pdf.set_xy(10, 22)
    pdf.cell(0, 8, f" Study Summary: {course_code}", ln=True, align="C")
    pdf.set_font("Arial", size=11)
    pdf.set_xy(10, 32)
    pdf.cell(0, 8, course_title, ln=True, align="C")
    pdf.set_text_color(0, 0, 0)
    pdf.set_xy(10, 55)
    pdf.set_font("Arial", size=11)
    safe_text = summary_text.encode("latin-1", "replace").decode("latin-1")
    pdf.multi_cell(0, 7, safe_text)
    
    filename = f"Summary_{course_code}.pdf"
    file_path = os.path.join(settings.MEDIA_ROOT, "summaries", filename)
    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    pdf.output(file_path)
    return f"summaries/{filename}"

# ==============================================================================
# QUESTION GENERATION
# ==============================================================================

def generate_mcq(doc, course_code: str, is_technical: bool, num_questions=15) -> list:
    text = sample_text_evenly(doc, sections=4, chars_per_section=1500)
    if is_technical:
        extra_instruction = "- Include questions that test understanding of formulas, definitions, processes, and application."
    else:
        extra_instruction = "- Focus on definitions, theories, and key concepts."

    template = """
You are an expert exam question setter for NOUN.
Creating {num} multiple-choice questions for: {course_code}
STRICT QUALITY RULES:
1. Each question must test a DIFFERENT concept
2. All 4 options must be PLAUSIBLE
3. The "correct_answer" must be the EXACT same text as one of the 4 options
{extra}

Return ONLY a valid JSON list. Each object must have EXACTLY these keys:
- "question_text"
- "option_a"
- "option_b"
- "option_c"
- "option_d"
- "correct_answer"

Textbook content:
{text}
"""
    prompt = PromptTemplate.from_template(template)
    chain = prompt | llm
    all_questions = []
    batch_size = 5
    batches = num_questions // batch_size
    for _ in range(batches):
        raw = call_llm(chain, {"text": text, "num": batch_size, "course_code": course_code, "extra": extra_instruction})
        batch = safe_parse_json(raw)
        valid_batch = []
        for q in batch:
            if q.get("question_text") and all(q.get(k) for k in ["option_a", "option_b", "option_c", "option_d", "correct_answer"]):
                options = [q["option_a"], q["option_b"], q["option_c"], q["option_d"]]
                if q["correct_answer"] not in options:
                    q["option_a"] = q["correct_answer"]
                valid_batch.append(q)
        all_questions.extend(valid_batch)
        time.sleep(5)
    return all_questions

def generate_fill_in_gaps(doc, course_code: str, num_questions=10) -> list:
    text = sample_text_evenly(doc, sections=3, chars_per_section=1500)
    template = """
You are an expert NOUN exam question setter creating fill-in-the-gap questions for: {course_code}
STRICT RULES:
1. The "question_text" MUST contain exactly '______' (6 underscores) where the answer goes
2. The "correct_answer" must be ONLY the missing word or short phrase

Return ONLY a valid JSON list. Each object must have EXACTLY these keys:
- "question_text"
- "correct_answer"

Textbook content:
{text}
"""
    prompt = PromptTemplate.from_template(template)
    chain = prompt | llm
    raw = call_llm(chain, {"text": text, "num": num_questions, "course_code": course_code})
    questions = safe_parse_json(raw)
    return [q for q in questions if q.get("question_text") and q.get("correct_answer") and "______" in q["question_text"]]

def generate_pop_questions(doc, course_code: str, course_title: str, is_technical: bool, num_questions=4) -> list:
    text = sample_text_evenly(doc, sections=3, chars_per_section=1500)
    if is_technical:
        answer_instruction = "Show full step-by-step working. Explain WHY you are using formulas."
    else:
        answer_instruction = "Write complete answers that would score full marks in a NOUN POP exam."

    template = """
You are an expert NOUN university lecturer creating a strict POP (Pen-On-Paper) final exam for: {course_code}
Generate exactly {num} full exam questions. Each question must have sub-parts (1a, 1b) summing to 15 marks.
ANSWER RULES: {answer_instruction}

Return ONLY a valid JSON list. Each object must have EXACTLY these keys:
- "question_text" - the full, multi-part exam question.
- "answer_text" - the complete model answer.

Textbook content:
{text}
"""
    prompt = PromptTemplate.from_template(template)
    chain = prompt | llm
    raw = call_llm(chain, {"text": text, "num": num_questions, "course_code": course_code, "course_title": course_title, "answer_instruction": answer_instruction})
    questions = safe_parse_json(raw)
    return [q for q in questions if q.get("question_text") and q.get("answer_text")]

# ==============================================================================
# BACKGROUND PROCESS RUNNER
# ==============================================================================

def process_course_rag_background(course_id):
    """
    Runs the RAG extraction pipeline to generate summaries and questions.
    Should be executed in a separate thread so it doesn't block the Django admin.
    """
    if not llm:
        print(f"RAG Task Error: No LLM API keys found.")
        return

    try:
        course = Course.objects.get(id=course_id)
        if not course.textbook:
            return
            
        print(f"Starting background RAG generation for {course.code}...")
        
        # 1. Read PDF
        doc = fitz.open(course.textbook.path)
        is_technical = is_technical_course(course.code)
        
        # 2. Summary
        summary_text = generate_summary(doc, course.code, course.title, is_technical)
        pdf_path = create_summary_pdf(course.code, course.title, summary_text)
        
        # Ensure thread has fresh connection
        connection.close()
        Summary.objects.update_or_create(
            course=course,
            defaults={"title": f"{course.code} Study Summary", "content": summary_text, "file": pdf_path}
        )
        
        # 3. Questions
        if course.exam_type == "CBT":
            mcqs = generate_mcq(doc, course.code, is_technical)
            connection.close()
            for q in mcqs:
                opt_a = q.get("option_a", "")
                opt_b = q.get("option_b", "")
                opt_c = q.get("option_c", "")
                opt_d = q.get("option_d", "")
                ans = q.get("correct_answer", "")
                
                correct_letter = "A"
                if ans == opt_a: correct_letter = "A"
                elif ans == opt_b: correct_letter = "B"
                elif ans == opt_c: correct_letter = "C"
                elif ans == opt_d: correct_letter = "D"
                
                Question.objects.update_or_create(
                    course=course, text=q["question_text"],
                    defaults={"option_a": opt_a, "option_b": opt_b, "option_c": opt_c, "option_d": opt_d, "correct_answer": correct_letter}
                )
                
            gaps = generate_fill_in_gaps(doc, course.code)
            connection.close()
            for g in gaps:
                FillInTheGap.objects.update_or_create(
                    course=course, question_text=g["question_text"], defaults={"correct_answer": g.get("correct_answer", "")}
                )
        else:
            pops = generate_pop_questions(doc, course.code, course.title, is_technical)
            connection.close()
            for p in pops:
                PopQuestion.objects.update_or_create(
                    course=course, question_text=p["question_text"], defaults={"answer_text": p.get("answer_text", "")}
                )
                
        doc.close()
        print(f"RAG generation complete for {course.code}!")
        
    except Exception as e:
        print(f"RAG Task Error for course {course_id}: {str(e)}")
    finally:
        connection.close()
