"""
auto.py - NOUN Study Buddy (Complete Rewrite)
=============================================
Automatically processes NOUN textbook PDFs and generates:

  CBT Courses (100–200 level + all General Studies):
    ✅ Detailed AI Study Summary (PDF)
    ✅ 30 Multiple Choice Questions with correct answers
    ✅ 15 Fill-in-the-Gap questions with answers

  POP Courses (300 level and above):
    ✅ Detailed AI Study Summary (PDF)
    ✅ 6 Theory/Essay questions with full model answers

SPECIAL RULE:
  - Technical & Mathematical courses get extra-detailed explanations
    written in simple language (since NOUN has no physical lecturers)
  - General Studies (GST) courses are always treated as CBT

SETUP (one time only):
    pip install langchain-groq fpdf pymupdf python-dotenv
    Create a .env file with GROQ_API_KEY=your_key_here

HOW TO RUN:
    python auto.py

Put all your PDF textbooks inside the 'textbooks/' folder.
"""

import os
import sys
import json
import time
import django
import fitz  # PyMuPDF
from dotenv import load_dotenv

# MUST be run before anything else to load the API key
load_dotenv()

# ── Django Setup ──────────────────────────────────────────────────────────────
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from fpdf import FPDF
from django.conf import settings
from langchain_groq import ChatGroq
from langchain_core.prompts import PromptTemplate

from courses.models import Course, Summary, Question, FillInTheGap, PopQuestion

# ── LLM Setup ─────────────────────────────────────────────────────────────────
# Free at https://console.groq.com — 14,400 requests/day
llm = ChatGroq(
    model="llama-3.1-8b-instant",
    temperature=0.3,
    max_tokens=4000,
    api_key=os.environ.get("GROQ_API_KEY")
)

# ── Course Type Detection ─────────────────────────────────────────────────────
# These prefixes are ALWAYS CBT regardless of level number
GENERAL_STUDIES_PREFIXES = ["GST", "ENT", "CLA"]

# These course prefixes deal with maths/tech — need extra-detailed explanations
TECHNICAL_PREFIXES = [
    "MTH", "CIT", "CSC", "PHY", "CHM", "STA",
    "ENG", "EEE", "MCE", "CVE", "CPE", "BIO"
]


def is_technical_course(course_code: str) -> bool:
    """Returns True if the course is mathematical or technical."""
    code_upper = course_code.upper()
    return any(code_upper.startswith(prefix) for prefix in TECHNICAL_PREFIXES)


def get_exam_type(course_code: str) -> str:
    """
    Determines exam type from course code.
    Rules:
      - GST/ENT/CLA = always CBT
      - 100-299 level = CBT
      - 300+ level = POP
    """
    code_upper = course_code.upper().strip()

    # General studies are always CBT
    if any(code_upper.startswith(p) for p in GENERAL_STUDIES_PREFIXES):
        return "CBT"

    # Extract the number from the code e.g. MTH101 -> 101, CIT412 -> 412
    digits = ''.join(filter(str.isdigit, code_upper))
    if not digits:
        return "CBT"  # Default to CBT if we can't tell

    level = int(digits)
    return "CBT" if level < 300 else "POP"


# ==============================================================================
# SECTION 1: HELPER FUNCTIONS
# ==============================================================================

def safe_parse_json(raw: str) -> list:
    """
    Safely extracts and parses a JSON list from LLM output.
    Never crashes - returns empty list on failure.
    """
    try:
        clean = raw.replace("```json", "").replace("```", "").strip()
        start = clean.find("[")
        end = clean.rfind("]") + 1
        if start == -1 or end == 0:
            print("    WARNING: No JSON list found in response.")
            return []
        data = json.loads(clean[start:end])
        return data if isinstance(data, list) else []
    except json.JSONDecodeError as e:
        print(f"    WARNING: JSON error: {e}")
        return []


def call_llm(chain, inputs: dict, retries=3, wait=45) -> str:
    """
    Calls the LLM with automatic retry on failure.
    Returns empty string if all retries fail.
    """
    for attempt in range(1, retries + 1):
        try:
            response = chain.invoke(inputs)
            return response.content
        except Exception as e:
            print(f"    WARNING: LLM error (attempt {attempt}/{retries}): {e}")
            if attempt < retries:
                print(f"    Retrying in {wait} seconds...")
                time.sleep(wait)
    print("    ERROR: All retries failed.")
    return ""


def sample_text_evenly(doc, sections=5, chars_per_section=3000) -> str:
    """
    Splits the book into sections and takes a chunk from each.
    Gives the LLM a representative sample of the whole book.
    """
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
# SECTION 2: COURSE IDENTIFICATION
# ==============================================================================

def identify_course(doc, filename: str) -> dict:
    """
    Identifies the course code and title from the first pages of the PDF.
    Falls back to filename if LLM fails.
    """
    intro_text = "".join([page.get_text() for page in doc[:6]])

    template = """
You are reading the cover and introduction pages of a National Open University of Nigeria (NOUN) textbook.

Your job is to extract:
1. "course_code" - the official course code e.g. MTH101, BIO201, CIT412, GST101
2. "course_title" - the full course name e.g. "Elementary Mathematics I"

RULES:
- Return ONLY a valid JSON object with exactly 2 keys: course_code and course_title
- No explanation, no extra text, just the JSON
- Remove any spaces from the course_code e.g. "MTH 101" should be "MTH101"

Text from cover pages:
{text}
"""
    prompt = PromptTemplate.from_template(template)
    chain = prompt | llm
    raw = call_llm(chain, {"text": intro_text[:3000]}, wait=20)

    try:
        clean = raw.replace("```json", "").replace("```", "").strip()
        start = clean.find("{")
        end = clean.rfind("}") + 1
        data = json.loads(clean[start:end])

        course_code = data.get("course_code", "").strip().upper().replace(" ", "")
        course_title = data.get("course_title", "Unknown Course").strip()
        exam_type = get_exam_type(course_code)
        technical = is_technical_course(course_code)

        print(f"    Identified: {course_code} - {course_title}")
        print(f"    Exam Type: {exam_type} | Technical: {technical}")

        return {
            "course_code": course_code,
            "course_title": course_title,
            "exam_type": exam_type,
            "is_technical": technical,
        }

    except Exception:
        fallback_code = os.path.splitext(filename)[0].upper().replace(" ", "")[:8]
        print(f"    WARNING: Could not identify course. Using filename: {fallback_code}")
        return {
            "course_code": fallback_code,
            "course_title": "Unknown Course",
            "exam_type": "CBT",
            "is_technical": False,
        }


# ==============================================================================
# SECTION 3: SUMMARY GENERATION
# ==============================================================================

def generate_summary(doc, course_info: dict) -> str:
    """
    Generates a comprehensive study summary for the entire textbook.
    Technical courses get extra-detailed, plain-language explanations.
    Processes the book in chunks of 15 pages.
    """
    total_pages = len(doc)
    chunk_size = 15
    is_technical = course_info.get("is_technical", False)
    course_code = course_info["course_code"]
    course_title = course_info["course_title"]

    print(f"    Building summary for {course_code} ({total_pages} pages)...")

    if is_technical:
        summary_template = """
You are a NOUN distance learning tutor writing a study guide for {course_code}: {course_title}.

IMPORTANT CONTEXT: NOUN students study ALONE at home with no physical lecturer to explain things.
Your job is to make this material crystal clear for a student reading it for the first time.

Read this section and write a DETAILED study guide that includes:

1. KEY DEFINITIONS
   - List every important term with a clear, simple definition
   - Use everyday language and avoid jargon unless you explain it

2. CORE CONCEPTS EXPLAINED SIMPLY
   - Explain each concept as if teaching a smart secondary school student
   - Use examples, analogies, or comparisons to real life where possible
   - For mathematical topics: show the formula, explain what each part means, then give a worked example

3. STEP-BY-STEP PROCESSES
   - For any calculation, algorithm, or procedure: show every step clearly
   - Number each step and show a worked example

4. THINGS TO MEMORIZE FOR EXAM
   - List 3-5 specific facts, formulas, or definitions from this section
   - These are the things most likely to appear in a NOUN exam

WRITING RULES:
- Write in plain, clear English - no complex academic language
- If something is complex, break it into smaller parts
- Always explain WHY something works, not just WHAT it is
- Use bullet points and numbered lists to organize information clearly

Textbook section for {course_code}:
{text}
"""
    else:
        summary_template = """
You are a NOUN distance learning tutor writing a study guide for {course_code}: {course_title}.

IMPORTANT CONTEXT: NOUN students study ALONE at home - your guide is their only teacher.

Read this section and write a study guide that includes:

1. KEY DEFINITIONS
   - Every important term with a clear definition in simple English

2. MAIN CONCEPTS
   - Explain each major idea in 2-3 clear sentences
   - Give real-life examples where possible

3. IMPORTANT FACTS TO REMEMBER
   - Key dates, names, theories, or principles
   - Specific things likely to appear in a NOUN exam

4. SUMMARY POINTS
   - A short bullet list of the most important takeaways from this section

WRITING RULES:
- Write clearly for a student studying alone at home
- Be specific - do not be vague or generic
- Focus on exam-relevant content only

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
        print(f"    Summarizing pages {i+1} to {page_end}...")

        chunk_summary = call_llm(
            chain,
            {
                "text": chunk_text[:4500],
                "course_code": course_code,
                "course_title": course_title,
            },
            wait=20
        )

        if chunk_summary.strip():
            full_summary += f"\n\n" + "-" * 50 + "\n"
            full_summary += f"PAGES {i+1} TO {page_end}\n"
            full_summary += "-" * 50 + "\n\n"
            full_summary += chunk_summary

        time.sleep(20)

    return full_summary


# ==============================================================================
# SECTION 4: QUESTION GENERATION
# ==============================================================================

def generate_mcq(doc, course_info: dict, num_questions=30) -> list:
    """
    Generates Multiple Choice Questions for CBT exams.
    Samples text from across the whole book for better topic coverage.
    """
    course_code = course_info["course_code"]
    is_technical = course_info.get("is_technical", False)
    text = sample_text_evenly(doc, sections=6, chars_per_section=2500)

    print(f"    Generating {num_questions} MCQs for {course_code}...")

    if is_technical:
        extra_instruction = "- Include questions that test understanding of formulas, definitions, processes, and application. Include some calculation-based questions. Make wrong options common mistakes students make."
    else:
        extra_instruction = "- Focus on definitions, theories, and key concepts. Include questions about important facts, names, and principles."

    template = """
You are an expert exam question setter for the National Open University of Nigeria (NOUN).
Creating {num} multiple-choice questions for: {course_code}

STRICT QUALITY RULES:
1. Each question must test a DIFFERENT concept - no repeating the same topic
2. Questions must test UNDERSTANDING, not just word-for-word memorization
3. All 4 options must be PLAUSIBLE - wrong options should not be obviously silly
4. The "correct_answer" must be the EXACT same text as one of the 4 options, word for word
5. Questions must be clearly worded - no ambiguous or confusing language
6. Cover topics from THROUGHOUT the textbook, not just the beginning
{extra}

Return ONLY a valid JSON list. Each object must have EXACTLY these keys:
- "question_text"
- "option_a"
- "option_b"
- "option_c"
- "option_d"
- "correct_answer" (must match one option EXACTLY word for word)

No explanation. No intro text. Just the raw JSON list.

Textbook content for {course_code}:
{text}
"""

    prompt = PromptTemplate.from_template(template)
    chain = prompt | llm

    all_questions = []
    batch_size = 10
    batches = num_questions // batch_size

    for batch_num in range(batches):
        print(f"    MCQ batch {batch_num + 1} of {batches}...")
        raw = call_llm(
            chain,
            {
                "text": text,
                "num": batch_size,
                "course_code": course_code,
                "extra": extra_instruction,
            },
            wait=20
        )
        batch = safe_parse_json(raw)

        valid_batch = []
        for q in batch:
            if not q.get("question_text"):
                continue
            if not all(q.get(k) for k in ["option_a", "option_b", "option_c", "option_d", "correct_answer"]):
                continue
            # Make sure correct_answer matches one of the options
            options = [q["option_a"], q["option_b"], q["option_c"], q["option_d"]]
            if q["correct_answer"] not in options:
                q["option_a"] = q["correct_answer"]
            valid_batch.append(q)

        all_questions.extend(valid_batch)
        print(f"    Got {len(valid_batch)} valid MCQs in this batch")
        time.sleep(8)

    print(f"    Total MCQs generated: {len(all_questions)}")
    return all_questions


def generate_fill_in_gaps(doc, course_info: dict, num_questions=15) -> list:
    """
    Generates fill-in-the-blank questions for CBT exams.
    The blank is always represented by '______' (6 underscores).
    """
    course_code = course_info["course_code"]
    text = sample_text_evenly(doc, sections=4, chars_per_section=2500)

    print(f"    Generating {num_questions} Fill-in-the-Gap questions for {course_code}...")

    template = """
You are an expert NOUN exam question setter creating fill-in-the-gap questions for: {course_code}

STRICT RULES:
1. The "question_text" MUST contain exactly '______' (6 underscores) where the answer goes
2. The blank must replace a KEY TERM, IMPORTANT CONCEPT, or DEFINITION - not common words
3. The "correct_answer" must be ONLY the missing word or short phrase
4. Do NOT blank out words like "the", "is", "a", "and", "of"
5. Each question must test a DIFFERENT concept
6. The question must make complete sense with the blank filled in

GOOD EXAMPLES:
- "The process by which plants produce food using sunlight is called ______." -> "photosynthesis"
- "In simple interest, I = ______." -> "PRT/100"
- "______ is defined as the rate of change of velocity." -> "Acceleration"

Return ONLY a valid JSON list. Each object must have EXACTLY these keys:
- "question_text" (must contain '______')
- "correct_answer" (the exact missing word or phrase)

No explanation. No intro text. Just the raw JSON list.

Textbook content for {course_code}:
{text}
"""

    prompt = PromptTemplate.from_template(template)
    chain = prompt | llm

    raw = call_llm(
        chain,
        {"text": text, "num": num_questions, "course_code": course_code},
        wait=20
    )
    questions = safe_parse_json(raw)

    valid = []
    for q in questions:
        if not q.get("question_text") or not q.get("correct_answer"):
            continue
        if "______" not in q["question_text"]:
            continue
        valid.append(q)

    removed = len(questions) - len(valid)
    if removed > 0:
        print(f"    Removed {removed} invalid fill-in questions (missing blank)")

    print(f"    Generated {len(valid)} valid Fill-in-the-Gap questions")
    return valid


def generate_pop_questions(doc, course_info: dict, num_questions=6) -> list:
    """
    Generates theory and essay questions for POP exams.
    Each question comes with a complete model answer.
    Technical courses get step-by-step worked answers.
    """
    course_code = course_info["course_code"]
    course_title = course_info["course_title"]
    is_technical = course_info.get("is_technical", False)
    text = sample_text_evenly(doc, sections=4, chars_per_section=3000)

    print(f"    Generating {num_questions} POP theory questions for {course_code}...")

    if is_technical:
        answer_instruction = "For mathematical/technical questions: show full step-by-step working. Start with the formula or principle, apply it step by step, show all calculations, end with a clear conclusion."
    else:
        answer_instruction = "Write complete answers that would score full marks in a NOUN POP exam. Use clear paragraphs. Include specific examples, facts, or theories from the course."

    template = """
You are an expert NOUN university lecturer creating a strict POP (Pen-On-Paper) final exam for: {course_code} - {course_title}

NOUN EXAM STRUCTURE RULES:
1. Generate exactly {num} full exam questions.
2. Every single question MUST be broken down into sub-parts (e.g., 1a, 1b, 1c). NO single massive questions.
3. Each sub-part MUST clearly state the allocated marks at the end in brackets (e.g., (5 Marks), (10 marks)).
4. The total marks for all sub-parts in a single question MUST equal exactly 15 marks. 
   (Except Question 1, if you choose to make it the compulsory question, which should total 25 marks).
5. Use exact NOUN action verbs: "List and explain", "With the aid of a diagram", "Define", "Distinguish between", "State four attributes of".

ANSWER RULES:
{answer_instruction}
- Answers must be structured exactly to match the sub-parts (e.g., Answer 1a: ..., Answer 1b: ...).
- If the question asks to "List four...", the answer MUST list exactly four distinct points.
- Write in clear, academic English suitable for a university-level grading rubric.

Return ONLY a valid JSON list. Each object must have EXACTLY these keys:
- "question_text" - the full, multi-part exam question including mark allocations.
- "answer_text" - the complete, structured model answer matching the sub-parts.

No explanation. No intro text. Just the raw JSON list.

Textbook content for {course_code}:
{text}
"""

    prompt = PromptTemplate.from_template(template)
    chain = prompt | llm

    raw = call_llm(
        chain,
        {
            "text": text,
            "num": num_questions,
            "course_code": course_code,
            "course_title": course_title,
            "answer_instruction": answer_instruction,
        },
        wait=20
    )
    questions = safe_parse_json(raw)
    valid = [q for q in questions if q.get("question_text") and q.get("answer_text")]
    print(f"    Generated {len(valid)} POP questions with model answers")
    return valid


# ==============================================================================
# SECTION 5: PDF SUMMARY FILE CREATION
# ==============================================================================

def create_summary_pdf(course_code: str, course_title: str, summary_text: str) -> str:
    """
    Creates a well-formatted PDF from the summary text.
    Saves to media/summaries/ and returns the relative path.
    """
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=20)
    pdf.add_page()

    # Header
    pdf.set_fill_color(26, 77, 58)
    pdf.rect(0, 0, 210, 45, 'F')
    pdf.set_text_color(255, 255, 255)
    pdf.set_font("Arial", style="B", size=20)
    pdf.set_xy(10, 10)
    pdf.cell(0, 10, txt="NOUN STUDY BUDDY", ln=True, align="C")
    pdf.set_font("Arial", style="B", size=14)
    pdf.set_xy(10, 22)
    pdf.cell(0, 8, txt=f" Study Summary: {course_code}", ln=True, align="C")
    pdf.set_font("Arial", size=11)
    pdf.set_xy(10, 32)
    pdf.cell(0, 8, txt=course_title, ln=True, align="C")

    # Body
    pdf.set_text_color(0, 0, 0)
    pdf.set_xy(10, 55)
    pdf.set_font("Arial", size=11)
    safe_text = summary_text.encode("latin-1", "replace").decode("latin-1")
    pdf.multi_cell(0, 7, txt=safe_text)

    # Save
    filename = f"Summary_{course_code}.pdf"
    file_path = os.path.join(settings.MEDIA_ROOT, "summaries", filename)
    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    pdf.output(file_path)

    print(f"    Summary PDF saved: {filename} ({pdf.page} pages)")
    return f"summaries/{filename}"


# ==============================================================================
# SECTION 6: MAIN PROCESSING FUNCTION
# ==============================================================================

def process_pdf(full_pdf_path: str, filename: str):
    """
    Full pipeline for one PDF:
    1. Identify course
    2. Generate and save summary
    3. Generate and save questions based on exam type
    """
    print(f"\n{'=' * 65}")
    print(f"  Processing: {filename}")
    print(f"{'=' * 65}")

    doc = fitz.open(full_pdf_path)
    total_pages = len(doc)
    print(f"  PDF opened: {total_pages} pages")

    # Step 1: Identify Course
    print("\n  STEP 1: Identifying course...")
    course_info = identify_course(doc, filename)
    course_code = course_info["course_code"]
    course_title = course_info["course_title"]
    exam_type = course_info["exam_type"]

    course, created = Course.objects.update_or_create(
        code=course_code,
        defaults={"title": course_title}
    )
    print(f"  Course {'created' if created else 'updated'}: {course_code}")

    # Step 2: Generate Summary
    print("\n  STEP 2: Generating study summary...")
    summary_text = generate_summary(doc, course_info)
    pdf_path = create_summary_pdf(course_code, course_title, summary_text)

    Summary.objects.update_or_create(
        course=course,
        defaults={
            "title": f"{course_code}  Study Summary",
            "content": summary_text,
            "file": pdf_path,
        }
    )
    print(f"  Summary saved to database")

    print("\n  Pausing 15 seconds before generating questions...")
    time.sleep(15)

    # Step 3: Generate Questions
    print(f"\n  STEP 3: Generating questions (Type: {exam_type})...")

    if exam_type == "CBT":
        # Multiple Choice Questions
        print("\n  [A] Multiple Choice Questions (30)")
        mcq_list = generate_mcq(doc, course_info, num_questions=30)

        saved_mcq = 0
        for q in mcq_list:
            try:
                opt_a = q.get("option_a", "")
                opt_b = q.get("option_b", "")
                opt_c = q.get("option_c", "")
                opt_d = q.get("option_d", "")
                correct_text = q.get("correct_answer", "")

                if correct_text == opt_a:
                    correct_letter = "A"
                elif correct_text == opt_b:
                    correct_letter = "B"
                elif correct_text == opt_c:
                    correct_letter = "C"
                elif correct_text == opt_d:
                    correct_letter = "D"
                else:
                    correct_letter = "A"
                    print("    Warning: correct_answer did not match any option, defaulting to A")

                Question.objects.update_or_create(
                    course=course,
                    text=q["question_text"],
                    defaults={
                        "option_a": opt_a,
                        "option_b": opt_b,
                        "option_c": opt_c,
                        "option_d": opt_d,
                        "correct_answer": correct_letter,
                    }
                )
                saved_mcq += 1
            except Exception as e:
                print(f"    Could not save MCQ: {e}")

        print(f"  Saved {saved_mcq} MCQs to database")

        print("\n  Pausing 10 seconds...")
        time.sleep(10)

        # Fill-in-the-Gap Questions
        print("\n  [B] Fill-in-the-Gap Questions (15)")
        gap_list = generate_fill_in_gaps(doc, course_info, num_questions=15)

        saved_gap = 0
        for g in gap_list:
            try:
                FillInTheGap.objects.update_or_create(
                    course=course,
                    question_text=g["question_text"],
                    defaults={"correct_answer": g.get("correct_answer", "")}
                )
                saved_gap += 1
            except Exception as e:
                print(f"    Could not save gap question: {e}")

        print(f"  Saved {saved_gap} Fill-in-the-Gap questions to database")

    else:  # POP
        print("\n  [A] POP Theory Questions (6)")
        pop_list = generate_pop_questions(doc, course_info, num_questions=6)

        saved_pop = 0
        for q in pop_list:
            try:
                PopQuestion.objects.update_or_create(
                    course=course,
                    question_text=q["question_text"],
                    defaults={"answer_text": q.get("answer_text", "")}
                )
                saved_pop += 1
            except Exception as e:
                print(f"    Could not save POP question: {e}")

        print(f"  Saved {saved_pop} POP questions to database")

    doc.close()
    print(f"\n  COMPLETE: {filename} fully processed!")
    print(f"  Result: {exam_type} | {'Technical' if course_info['is_technical'] else 'General'} course")


# ==============================================================================
# SECTION 7: BATCH RUNNER
# ==============================================================================

def run_batch():
    """
    Main entry point.
    Finds all PDFs in 'textbooks/' folder and processes them one by one.
    Skips courses that already have sufficient questions in the database.
    """
    folder = "textbooks"

    if not os.path.exists(folder):
        print(f"\nERROR: '{folder}' folder not found!")
        print("Create a 'textbooks/' folder and add your PDF files there.")
        return

    all_pdfs = sorted([f for f in os.listdir(folder) if f.lower().endswith(".pdf")])

    if not all_pdfs:
        print(f"\nNo PDF files found in '{folder}/'")
        return

    print(f"\n{'=' * 65}")
    print(f"  NOUN STUDY BUDDY - BATCH PROCESSOR")
    print(f"  Found {len(all_pdfs)} PDF(s) to process")
    print(f"{'=' * 65}")

    success_count = 0
    skip_count = 0
    fail_count = 0

    for index, filename in enumerate(all_pdfs, start=1):
        full_path = os.path.join(folder, filename)
        print(f"\n[{index}/{len(all_pdfs)}] {filename}")

        # Quick check: skip if already has enough questions
        possible_code = os.path.splitext(filename)[0].upper().replace(" ", "")[:8]
        existing = Course.objects.filter(code=possible_code).first()
        if existing:
            q_count = Question.objects.filter(course=existing).count()
            p_count = PopQuestion.objects.filter(course=existing).count()
            if q_count >= 20 or p_count >= 4:
                print(f"  SKIPPING - already has {q_count} MCQs and {p_count} POP questions")
                skip_count += 1
                continue

        try:
            process_pdf(full_path, filename)
            success_count += 1
        except Exception as e:
            print(f"\n  FAILED: {filename}")
            print(f"  Error: {e}")
            fail_count += 1

        if index < len(all_pdfs):
            print(f"\n  Cooling down 20 seconds before next book...")
            time.sleep(20)

    print(f"\n{'=' * 65}")
    print(f"  BATCH COMPLETE!")
    print(f"  Processed: {success_count}")
    print(f"  Skipped:   {skip_count}")
    print(f"  Failed:    {fail_count}")
    print(f"{'=' * 65}")


# ==============================================================================
# ENTRY POINT
# ==============================================================================

if __name__ == "__main__":
    run_batch()