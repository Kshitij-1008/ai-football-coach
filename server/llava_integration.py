import os
os.environ['HF_HOME'] = "D:\\HDD Data"
print(f"Models will save to: {os.environ['HF_HOME']}")

from transformers import pipeline
import cv2
import logging

class AICoach: 
    def __init__(self):
        # Load Llava model 
        self.pipe = pipeline(
            "image-to-text",
            model="llava-hf/llava-1.5-7b-hf",
            device="cpu"
        )

    async def generate_feedback(self, frame, pose_data):
        try: 
            # Convert pose_data to text_prompt
            pose_desc = ", ".join([f"({x:.2f}, {y:.2f})" for x, y in pose_data])

            # Generate feedback
            result = await self.pipe(
                frame, 
                prompt=f"""Analyze this football player's technique. Keypoints: {pose_desc}.
                Provide 2 technical corrections and 1 drill suggestion."""
            )
            return result[0]['generated_text']
        
        except Exception as e:
            logging.error(f"LLava Error: {str(e)}")
            return "Analysis unavailable (Llava error)"