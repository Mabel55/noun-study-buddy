import os
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Course, Summary
from langchain_groq import ChatGroq
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
    system_prompt = f"""You are a helpful and knowledgeable university lecturer for the course '{course.code}: {course.title}'.
    Your goal is to help the student understand the course material. 
    Be encouraging, clear, and concise. Use formatting like bolding and bullet points if helpful.
    If the student asks a technical or mathematical question, break down the steps clearly.
    
    Here is the course material/summary you should base your answers on (if relevant):
    ---
    {context[:15000]} # Limit context to avoid hitting token limits
    ---
    If the answer is not in the material, use your general knowledge but mention that it might not be in the official course text.
    """
    langchain_messages.append(SystemMessage(content=system_prompt))
    
    # Add history
    for msg in messages:
        if msg.get('role') == 'user':
            langchain_messages.append(HumanMessage(content=msg.get('content', '')))
        elif msg.get('role') == 'assistant':
            langchain_messages.append(AIMessage(content=msg.get('content', '')))
            
    try:
        llm = ChatGroq(
            model="llama3-8b-8192",
            temperature=0.3,
            max_tokens=1000,
            api_key=os.environ.get("GROQ_API_KEY", "fallback-key-to-prevent-crash")
        )
        response = llm.invoke(langchain_messages)
        return Response({
            'reply': response.content
        })
    except Exception as e:
        print(f"Chat error: {e}")
        return Response({'error': 'AI Tutor is currently busy. Please try again later.'}, status=503)
