export interface AnalysisResult {
  pose: Array<{ x: number; y: number }>;
  feedback: string;
}

// Rate limiting variables
let lastRequestTime = 0;
const REQUEST_INTERVAL = 1000; // 1 second between requests

export const processFrame = async (frameData: string): Promise<AnalysisResult> => {
  try {
    // Rate limiting
    const now = Date.now();
    console.log('Processing frame at:', now);
    
    if (now - lastRequestTime < REQUEST_INTERVAL) {
      console.log('Rate limiting - waiting for:', REQUEST_INTERVAL - (now - lastRequestTime), 'ms');
      await new Promise(resolve => setTimeout(resolve, REQUEST_INTERVAL - (now - lastRequestTime)));
    }
    lastRequestTime = Date.now();

    if (!frameData.startsWith('data:image/jpeg')) {
      console.error('Invalid frame format:', frameData.substring(0, 30) + '...');
      throw new Error('Only JPEG images supported.');
    }
    
    console.log('Sending frame to server, size:', frameData.length);
    const response = await fetch('http://localhost:8001/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ frame: frameData }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Server response error:', response.status, errorData);
      throw new Error(errorData.error || `Server error: ${response.status}`);
    }

    const result = await response.json();
    console.log('Frame processed successfully, points detected:', result.pose?.length);
    return result;
  } catch (error) {
    console.error('Frame processing error:', error);
    return {
      pose: [],
      feedback: error instanceof Error ? error.message : 'Network Error'
    };
  }
};

export const drawPose = (canvas: HTMLCanvasElement, points: AnalysisResult['pose']) => {
  const ctx = canvas.getContext('2d');
  if (!ctx || !points) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  points.forEach((point) => {
    if (point?.x && point?.y) {
      const x = point.x * canvas.width;
      const y = point.y * canvas.height;
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, 2 * Math.PI);
      ctx.fillStyle = '#FF0000';
      ctx.fill();
    }
  });
};

// Validation 
export const runDiagnostics = async () => {
  const API_URL = 'http://localhost:8001'; // Match your backend port

  try {
    // Test backend connection
    const healthRes = await fetch(`${API_URL}/health`, {
      method: 'OPTIONS', 
      headers: { 'Content-Type': 'application/json' },
      credentials: 'omit', // no cookies required
    });

    if (!healthRes.ok) throw new Error(`Backend responded with ${healthRes.status}`);
    

    // Test pose estimation
    const poseRes = await fetch(`${API_URL}/test/pose`, {
      method: 'OPTIONS', 
      headers: { 'Content-Type': 'application/json' },
      credentials: 'omit', // no cookies required
    });
    const poseData = await poseRes.json();
    if (!poseRes.ok || !poseData.points_detected) throw new Error('Pose test failed');

    // Test Gemini (skip if you know it's quota-limited)
    const geminiRes = await fetch(`${API_URL}/test/gemini`);
    const geminiData = await geminiRes.json();
    if (!geminiRes.ok) throw new Error('Gemini test failed');

    return {
      backend: true,
      poseEstimation: true,
      gemini: geminiData.status === "success",
      errors: []
    };
  } catch (error) {
    return {
      backend: false,
      poseEstimation: false,
      gemini: false,
      errors: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
};

// Add a test frame processing function
export const testFrameProcessing = async (): Promise<{
  processed: boolean;
  pointsDetected: number;
}> => {
  // Create a test frame (black image)
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 480;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  const frameData = canvas.toDataURL('image/jpeg');
  const result = await processFrame(frameData);

  return {
    processed: true,
    pointsDetected: result.pose.length
  };
};
