import cv2
import mediapipe as mp 
import numpy as np
from typing import List, Tuple, Optional

class PoseEstimator:
    def __init__(self):
        self.mp_pose = mp.solutions.pose
        self.pose = self.mp_pose.Pose(
            static_image_mode=False, 
            model_complexity=2,  # Highest accuracy
            enable_segmentation=False,
            min_detection_confidence=0.7,
            min_tracking_confidence=0.5
        )
        self.previous_landmarks = None
        
    def estimate(self, frame: np.ndarray) -> List[Tuple[float, float]]:
        """
        Estimate pose landmarks from a frame.

        Args:
            frame: Input image in BGR format
            
        Returns:
            List of (x, y) coordinates for each landmark
            or empty list if no pose detected
        """
        try:
            # Convert to RGB and process
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = self.pose.process(rgb_frame)
            
            # Use previous landmarks if current detection is poor
            if (results.pose_landmarks and 
                results.pose_landmarks.landmark and
                self._is_good_detection(results)):
                self.previous_landmarks = results.pose_landmarks.landmark
                return self._extract_keypoints(results)
            elif self.previous_landmarks:
                return [(lm.x, lm.y) for lm in self.previous_landmarks]
            return []
            
        except Exception as e:
            print(f"Pose estimation error: {str(e)}")
            return []

    def _is_good_detection(self, results) -> bool:
        """Check if the detection meets quality criteria"""
        if not results.pose_landmarks:
            return False
            
        # Check visibility of key joints
        key_joints = [
            self.mp_pose.PoseLandmark.LEFT_SHOULDER,
            self.mp_pose.PoseLandmark.RIGHT_SHOULDER,
            self.mp_pose.PoseLandmark.LEFT_HIP,
            self.mp_pose.PoseLandmark.RIGHT_HIP
        ]
        
        visible_joints = sum(
            1 for j in key_joints 
            if results.pose_landmarks.landmark[j].visibility > 0.7
        )
        
        return visible_joints >= 3

    def _extract_keypoints(self, results) -> List[Tuple[float, float]]:
        """Extract and normalize keypoints from results"""
        if not results.pose_landmarks:
            return []
            
        landmarks = results.pose_landmarks.landmark
        
        # Filter out landmarks with low visibility
        return [
            (lm.x, lm.y) 
            for lm in landmarks 
            if lm.visibility > 0.5
        ]

    def test_pose_estimation(self, test_img_path: str) -> dict:
        """Validation method for testing pose estimation"""
        frame = cv2.imread(test_img_path)
        if frame is None:
            return {"error": "Failed to read test image"}
            
        keypoints = self.estimate(frame)
        return {
            "points_detected": len(keypoints),
            "sample_points": keypoints[:3] if keypoints else []
        }

    def __del__(self):
        """Clean up resources"""
        self.pose.close()