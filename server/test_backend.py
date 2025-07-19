# server/test_backend.py
import unittest
from pose_estimation import PoseEstimator
import cv2

class TestBackend(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.estimator = PoseEstimator()
        cls.test_img = cv2.imread("C:\\Users\\Kshitij Jha\\OneDrive\\Pictures\\Bassalona.jpeg")  # Add a test image

    def test_pose_estimation(self):
        keypoints = self.estimator.estimate(self.test_img)
        print(f"\nDetected {len(keypoints)} landmarks:")  # Prints to terminal
        for i, (x, y) in enumerate(keypoints):
            print(f"Landmark {i}: ({x:.2f}, {y:.2f})")  # Coordinates normalized [0,1]
        self.assertGreater(len(keypoints), 10)

if __name__ == "__main__":
    unittest.main()