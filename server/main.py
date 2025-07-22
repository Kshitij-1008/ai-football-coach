from aiohttp import web
from pose_estimation import PoseEstimator
from gemini_integration import AICoach
import cv2
import numpy as np
import base64
import aiohttp_cors
import logging
from datetime import datetime, timedelta
import os
import sys

# Rate limiting setup
REQUEST_LIMIT = 1  # 1 request per second per client
client_timestamps = {}

app = web.Application()
estimator = PoseEstimator()
coach = AICoach()


# Add these endpoints for validation checks. Basic health check endpoint.
async def health_check(request):
    response = web.json_response({
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "system": {
            "python": sys.version,
            "backend": "running"
        }
    })
    # response.headers.update({
    #     "Access-Control-Allow-Origin": "http://localhost:3000",
    #     "Access-Control-Allow-Methods": "GET, OPTIONS",
    #     "Access-Control-Allow-Headers": "Content-Type"
    # })
    return response

async def check_rate_limit(client_ip: str):
    now = datetime.now()
    if client_ip in client_timestamps:
        last_request = client_timestamps[client_ip]
        if now - last_request < timedelta(seconds=1/REQUEST_LIMIT):
            raise web.HTTPTooManyRequests(text="Rate limit exceeded. Please wait before sending another request.")
    client_timestamps[client_ip] = now

async def analyze(request):
    try:
        client_ip = request.remote
        await check_rate_limit(client_ip)
        
        data = await request.json()
        if 'frame' not in data:
            return web.json_response({"error": "Missing frame data"}, status=400)
        
        # Extract base64 image data
        header, encoded = data['frame'].split(',', 1)
        if "image/jpeg" not in header: 
            return web.json_response({"error": "Only JPEG supported"}, status=400)
        
        img_data = base64.b64decode(encoded)
        nparr = np.frombuffer(img_data, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if frame is None: 
            return web.json_response({"error": "Invalid image data"}, status=400)
        
        # Process frame
        keypoints = estimator.estimate(frame)
        feedback = await coach.generate_feedback(frame, keypoints)

        return web.json_response({
            "pose": keypoints, 
            "feedback": feedback
        })
    
    except Exception as e: 
        logging.error(f"API Error: {str(e)}")
        return web.json_response({"error": str(e)}, status=500)

async def test_pose_estimation(request):
    """Test endpoint for pose estimation."""
    try: 
        # Use a test image from the server directory.
        test_img_path = os.path.join(os.path.dirname(__file__), 'Bassalona.jpeg')
        if not os.path.exists(test_img_path):
            return web.json_response(
                {"error": "Test image not found"}, status=404)
        
        frame = cv2.imread(test_img_path)
        if frame is None:
            return web.json_response({"error": "Failed to read test image"}, status=400)
        
        keypoints = estimator.estimate(frame)
        return web.json_response({
            "pose_points": keypoints,
            "sample_points": keypoints[:5] if keypoints else []
        })
    
    except Exception as e:
        logging.error(f"Test Error: str{e}")
        return web.json_response({"error": str(e)}, status=500)

async def test_gemini_integration(request):
    """Test endpoint for Gemini integration."""
    try:
        # Create a simple test frame
        frame = np.zeros((480, 640, 3), dtype=np.uint8)
        feedback = await coach.generate_feedback(frame, [])

        return web.json_response({
            "status": "success",
            "feedback": feedback,
            "cache_hit": "gemini_key" in os.environ
        })
    
    except Exception as e:
        return web.json_response({
            "status": "error",
            "error": str(e),
            "gemini_configured": "GEMINI_KEY" in os.environ
        }, status=500)

async def handle_options(request):
    return web.Response(status=200)

# Set up routes before CORS 
app.router.add_route('POST', '/analyze', analyze)
app.router.add_route('GET', '/health', health_check)
app.router.add_route('GET', '/test/pose', test_pose_estimation)
app.router.add_route('GET', '/test/gemini', test_gemini_integration)

# CORS Setup and configuration
cors = aiohttp_cors.setup(app, defaults={
    "*": aiohttp_cors.ResourceOptions(
        allow_credentials=True,
        expose_headers="*",
        allow_headers="*", 
    )
})

# Apply CORS to all routes
for route in list(app.router.routes()):
    cors.add(route)

# from socket import SO_REUSEADDR, SOL_SOCKET
if __name__ == '__main__':
    web.run_app(app, port=8001, access_log=logging.getLogger('aiohttp.access'))
