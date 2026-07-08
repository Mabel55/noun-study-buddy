import os
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Course, Summary
from langchain_groq import ChatGroq
from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage

# We'll initialize the LLM lazily inside the view to prevent boot crashes

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def chat_with_tutor(request):
    """
    Takes a course_id and a list of chat messages.
    Uses the course summary as context to answer the student's question.
    """
    course_id = request.data.get('course_id')
    messages = request.data.get('messages', [])
    
    if not course_id or not messages:
        return Response({'error': 'Missing course_id or messages'}, status=400)
        
    try:
        course = Course.objects.get(id=course_id)
        # Try to get the summary for context
        summary_qs = Summary.objects.filter(course=course)
        context = ""
        if summary_qs.exists():
            context = summary_qs.first().content
    except Course.DoesNotExist:
        return Response({'error': 'Course not found'}, status=404)

    # Build the conversation history for LangChain
    langchain_messages = []
    
    # System message sets the persona and provides the context
    system_prompt = f"""You are a strict, focused university lecturer for the course '{course.code}: {course.title}'.
    The exam format for this course is: {course.exam_type} ({'Pen-On-Paper / Theory' if course.exam_type == 'POP' else 'Computer Based Test / Multiple Choice'}).
    
    Your goal is to help the student prepare specifically for this {course.exam_type} exam. 
    
    CRITICAL RULES:
    1. ONLY answer questions related to '{course.code}: {course.title}'. If the student asks about unrelated topics (e.g. programming, other subjects, general chat), politely refuse and remind them you are only here to tutor them on {course.code}.
    2. Base your answers strictly on the course material provided below.
    3. If the course is CBT, focus your explanations on exact definitions, facts, and short concepts that appear in multiple choice questions.
    4. If the course is POP, provide detailed, structured, paragraph-based explanations that would score well in an essay exam.
    
    COURSE MATERIAL / SUMMARY:
    ---
    {context[:15000]}
    ---
    """
    langchain_messages.append(SystemMessage(content=system_prompt))
    
    # Add history
    for msg in messages:
        if msg.get('role') == 'user':
            langchain_messages.append(HumanMessage(content=msg.get('content', '')))
        elif msg.get('role') == 'assistant':
            langchain_messages.append(AIMessage(content=msg.get('content', '')))
            
    try:
        available_llms = []
        
        openai_key = os.environ.get("OPENAI_API_KEY")
        if openai_key:
            available_llms.append(ChatOpenAI(model="gpt-4o-mini", temperature=0.3, max_tokens=1000, api_key=openai_key))
            
        gemini_key = os.environ.get("GEMINI_API_KEY")
        
        # Make Groq the primary model since Gemini is exhausted
        available_llms.append(ChatGroq(model="llama3-8b-8192", temperature=0.3, max_tokens=1000, api_key=os.environ.get("GROQ_API_KEY", "fallback-key")))
        
        if gemini_key:
            available_llms.append(ChatGoogleGenerativeAI(model="gemini-2.0-flash", temperature=0.3, max_tokens=1000, google_api_key=gemini_key))
            
        llm = available_llms[0]
        if len(available_llms) > 1:
            llm = llm.with_fallbacks(available_llms[1:])
            
        response = llm.invoke(langchain_messages)
        return Response({
            'reply': response.content
        })
    except Exception as e:
        print(f"Chat error: {e}")
        return Response({'error': 'AI Tutor is currently busy. Please try again later.'}, status=503)
