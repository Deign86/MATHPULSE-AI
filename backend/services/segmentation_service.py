from backend.services.inference_client import call_hf_chat_async
import json
import logging

logger = logging.getLogger(__name__)

async def segment_educational_content(text: str):
    """
    Use DeepSeek to segment raw educational text into pedagogical chunks.
    Maintains Filipino/English (Taglish) nuances.
    """
    prompt = f"""
    You are an expert curriculum designer for the Filipino SHS STEM strand.
    Segment the following educational text into a JSON list of pedagogical chunks.
    Each chunk MUST belong to one of these types: 'Objective', 'LessonContent', 'PracticeProblem', 'Summary'.
    
    Return ONLY a JSON array of objects:
    [
      {{"type": "Objective", "content": "..."}},
      {{"type": "LessonContent", "content": "...", "title": "..."}},
      ...
    ]
    
    Text:
    {text}
    """
    
    try:
        # call_hf_chat_async is configured to route to DeepSeek solely per project rules
        response = await call_hf_chat_async(prompt)
        
        # Basic JSON extraction in case of LLM verbosity
        if "```json" in response:
            response = response.split("```json")[1].split("```")[0].strip()
        elif "```" in response:
            response = response.split("```")[1].split("```")[0].strip()
            
        return json.loads(response)
    except Exception as e:
        logger.error(f"Semantic segmentation failed: {e}")
        # Fallback: Treat as one large lesson chunk
        return [{"type": "LessonContent", "content": text, "title": "Extracted Content"}]
