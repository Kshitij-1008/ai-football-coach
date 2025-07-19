import google.generativeai as genai
from dotenv import load_dotenv
import os
import cv2
import base64
import logging
from hashlib import md5

# Feedback cache
feedback_cache = {}

load_dotenv()

class AICoach:
    def __init__(self):
        genai.configure(api_key=os.getenv("GEMINI_KEY"))
        self.model = genai.GenerativeModel('gemini-1.5-pro')
        
    async def generate_feedback(self, frame, pose_data):
        try:
            if frame is None or frame.size == 0: 
                raise ValueError("Empty frame received.")
            
            frame = cv2.resize(frame, (640, 480))
            _, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 80])

            if not buffer.any():
                raise ValueError("Image encoding failed.")
        
            # Create cache key
            frame_hash = md5(buffer).hexdigest()
            pose_hash = md5(str(pose_data).encode()).hexdigest()
            cache_key = f"{frame_hash}:{pose_hash}"

            # Return cached feedback if available
            if cache_key in feedback_cache:
                logging.info("Returning cached feedback")
                return feedback_cache[cache_key]

            image_part = {
                "mime_type": "image/jpeg",
                "data": base64.b64encode(buffer).decode('utf-8')
            }

            prompt = f"""Analyze this football player's technique:
            Key Joint Positions: {pose_data}
            Provide 2 technical corrections and 1 drill suggestion."""

            response = await self.model.generate_content_async([prompt, image_part])
            feedback = response.text

            # Cache the feedback
            feedback_cache[cache_key] = feedback
            return feedback
        
        except Exception as e:  
            logging.error(f"Gemini Error: {str(e)}")
            return "Technical analysis unavailable. Please try another shot."
        except genai.types.StopCandidateException as e: 
            return "Analysis limited (API Quota exceeded)"
        
    def test_connection(self):
        """Validation method for testing Gemini connection"""
        try:
            return {
                "configured": "GEMINI_KEY" in os.environ,
                "cache_size": len(self.feedback_cache)
            }
        except Exception as e:
            return {"error": str(e)}