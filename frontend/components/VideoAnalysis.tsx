import { useRef, useState, useCallback } from 'react';
import { processFrame, drawPose, AnalysisResult, runDiagnostics, testFrameProcessing } from '../lib/videoProcessing';
import { UploadIcon, SparklesIcon, SpinnerIcon } from './Icons';

// Cache for common feedback patterns
const feedbackCache = new Map<string, string>();

export default function VideoAnalysis() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [feedback, setFeedback] = useState('Upload a football technique video for analysis');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);
  const [currentTime, setCurrentTime] = useState(0);

  // Process video at 1fps
  const processVideo = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) {
      console.log('Missing refs:', { video: !!videoRef.current, canvas: !!canvasRef.current });
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Wait for video dimensions to be available
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      console.log('Waiting for video dimensions...');
      await new Promise<void>((resolve) => {
        video.onloadeddata = () => {
          console.log('Video dimensions available:', video.videoWidth, video.videoHeight);
          resolve();
        };
      });
    }

    // Set canvas dimensions based on video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    console.log('Canvas dimensions set to:', canvas.width, 'x', canvas.height);
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('Failed to get canvas context');
      return;
    }

    const duration = video.duration;
    const fps = 1; // 1 frame per second
    const interval = 1 / fps;
    let currentTime = 0;

    const results: AnalysisResult[] = [];
    
    // Ensure video is ready for frame extraction
    video.currentTime = 0;
    await new Promise<void>((resolve) => {
      video.onseeked = () => resolve();
    });

    while (currentTime <= duration) {
      try {
        video.currentTime = currentTime;
        await new Promise((resolve) => {
          video.onseeked = resolve;
        });

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const frameData = canvas.toDataURL('image/jpeg', 0.8);

        // Check cache first
        const cacheKey = frameData.substring(0, 100);
        if (feedbackCache.has(cacheKey)) {
          const cachedFeedback = feedbackCache.get(cacheKey)!;
          results.push({ pose: [], feedback: cachedFeedback });
          setFeedback(cachedFeedback);
          continue;
        }

        const { pose, feedback } = await processFrame(frameData);
        drawPose(canvas, pose);
        results.push({ pose, feedback });
        setFeedback(feedback);
        feedbackCache.set(cacheKey, feedback);

      } catch (err) {
        console.error('Frame processing error:', err);
      } finally {
        currentTime += interval;
        setCurrentTime(currentTime);
      }
    }

    setAnalysisResults(results);
    setIsProcessing(false);
    setFeedback('Analysis complete! Scroll through results below.');
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) {
      console.log('No file selected');
      return;
    }

    const file = e.target.files[0];
    console.log('File selected:', file.name, file.type, 'size:', file.size);

    if (!file.type.startsWith('video/')) {
      setError('Please upload a video file');
      return;
    }

    try {
      // Create video element if it doesn't exist
      if (!videoRef.current) {
        const video = document.createElement('video');
        videoRef.current = video;
        console.log('Created new video element');
      }

      console.log('Starting video processing');
      setError('');
      setIsProcessing(true);
      setAnalysisResults([]);
      setFeedback('Processing video...');

      const videoUrl = URL.createObjectURL(file);
      console.log('Video URL created:', videoUrl);

      // Reset and configure video element
      const video = videoRef.current;
      video.pause();
      video.currentTime = 0;
      video.preload = 'auto';
      
      // Set up error handling
      video.onerror = (e) => {
        console.error('Video loading error:', video.error);
        setError(`Video loading error: ${video.error?.message || 'Unknown error'}`);
      };

      // Load the video
      video.src = videoUrl;
      console.log('Video source set, waiting for metadata...');
      
      await new Promise<void>((resolve, reject) => {
        const timeoutId = setTimeout(() => reject(new Error('Video loading timeout')), 10000);
        
        video.onloadedmetadata = () => {
          clearTimeout(timeoutId);
          console.log('Video metadata loaded:', {
            duration: video.duration,
            dimensions: `${video.videoWidth}x${video.videoHeight}`
          });
          resolve();
        };
      });
      
      console.log('Starting frame processing');
      await processVideo();
      
    } catch (err) {
      console.error('Processing error:', err);
      setError(`Error processing video: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsProcessing(false);
      if (videoRef.current) {
        videoRef.current.pause();
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <header className="py-8 bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent 
                         bg-clip-text text-transparent animate-fade-in">
            AI Football Coach
          </h1>
          <p className="text-gray-600 mt-2 text-lg">
            Upload your football technique video for AI-powered feedback
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="animated-card bg-white p-8 rounded-2xl shadow-card">
            <input 
              type="file"
              accept="video/*"
              onChange={handleFileChange}
              className="hidden"
              id="video-upload"
            />
            <label 
              htmlFor="video-upload"
              className="btn-primary flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <SpinnerIcon className="w-5 h-5" />
                  Processing Video...
                </>
              ) : (
                <>
                  <UploadIcon className="w-5 h-5" />
                  Upload Training Video
                </>
              )}
            </label>
          </div>

          {videoRef.current?.src && (
            <div className="animated-card">
              <div className="bg-gradient-to-r from-field-green/10 to-blue-100/50 
                            p-1 rounded-2xl shadow-lg">
                <div className="relative bg-black rounded-xl overflow-hidden">
                  <video
                    ref={videoRef}
                    controls
                    preload="auto"
                    className="w-full aspect-video rounded-lg block"
                    style={{ display: videoRef.current?.src ? 'block' : 'none' }}
                  />
                  <canvas 
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="feedback-card">
            <h3 className="font-bold text-xl flex items-center gap-2">
              <SparklesIcon className="text-accent" />
              Coach's Feedback
            </h3>
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              {feedback || "Waiting for analysis..."}
            </div>
          </div>

          {analysisResults.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {analysisResults.map((result, index) => (
                <div key={index} 
                     className="bg-white p-6 rounded-xl shadow-card hover:shadow-hover 
                                transition-all duration-300">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="w-8 h-8 rounded-full bg-primary text-white 
                                   flex items-center justify-center font-semibold">
                      {index + 1}
                    </span>
                    <span className="font-medium text-gray-700">
                      Timestamp: {index}s
                    </span>
                  </div>
                  <p className="text-gray-600">{result.feedback}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}