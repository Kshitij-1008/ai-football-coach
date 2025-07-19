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
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const duration = video.duration;
    const fps = 1; // 1 frame per second
    const interval = 1 / fps;
    let currentTime = 0;

    const results: AnalysisResult[] = [];

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
    if (!e.target.files?.length) return;

    const file = e.target.files[0];
    if (!file.type.startsWith('video/')) {
      setError('Please upload a video file');
      return;
    }

    try {
      setError('');
      setIsProcessing(true);
      setAnalysisResults([]);
      setFeedback('Processing video...');

      const videoUrl = URL.createObjectURL(file);
      if (videoRef.current) {
        videoRef.current.src = videoUrl;
        await new Promise((resolve) => {
          if (videoRef.current) {
            videoRef.current.onloadedmetadata = resolve;
          }
        });
        await processVideo();
      }
    } catch (err) {
      console.error('Processing error:', err);
      setError(`Error processing video: ${err instanceof Error ? err.message : String(err)}`);
      setIsProcessing(false);
    }
  };
  
  // // Validation Component (defined inside main component)
  // const SystemDiagnostics = () => {
  //   const [diagnostics, setDiagnostics] = useState<{
  //     backend: boolean;
  //     poseEstimation: boolean;
  //     gemini: boolean;
  //     errors: string[];
  //   } | null>(null);
  //   const [frameTest, setFrameTest] = useState<{
  //     processed: boolean;
  //     pointsDetected: number;
  //   } | null>(null);
  //   const [isTesting, setIsTesting] = useState(false);

  //   const runTests = async () => {
  //     setIsTesting(true);
  //     try {
  //       const diagResults = await runDiagnostics();
  //       setDiagnostics(diagResults);
        
  //       const frameResults = await testFrameProcessing();
  //       setFrameTest(frameResults);
  //     } finally {
  //       setIsTesting(false);
  //     }
  //   };

  //   return (
  //     <div className="mt-6 p-4 bg-gray-50 rounded-lg">
  //       <h3 className="text-lg font-semibold mb-2">System Diagnostics</h3>
  //       <button
  //         onClick={runTests}
  //         disabled={isTesting}
  //         className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-400"
  //       >
  //         {isTesting ? 'Running Tests...' : 'Run Diagnostics'}
  //       </button>

  //       {diagnostics && (
  //         <div className="mt-4 space-y-2">
  //           <div className="flex items-center">
  //             <span className="w-40 font-medium">Backend Connection:</span>
  //             <span className={diagnostics.backend ? 'text-green-600' : 'text-red-600'}>
  //               {diagnostics.backend ? '✓ Working' : '✗ Failed'}
  //             </span>
  //           </div>
  //           <div className="flex items-center">
  //             <span className="w-40 font-medium">Pose Estimation:</span>
  //             <span className={diagnostics.poseEstimation ? 'text-green-600' : 'text-red-600'}>
  //               {diagnostics.poseEstimation ? '✓ Working' : '✗ Failed'}
  //             </span>
  //           </div>
  //           <div className="flex items-center">
  //             <span className="w-40 font-medium">Gemini API:</span>
  //             <span className={diagnostics.gemini ? 'text-green-600' : 'text-red-600'}>
  //               {diagnostics.gemini ? '✓ Working' : '✗ Failed'}
  //             </span>
  //           </div>

  //           {frameTest && (
  //             <div className="flex items-center">
  //               <span className="w-40 font-medium">Frame Processing:</span>
  //               <span className={frameTest.processed ? 'text-green-600' : 'text-red-600'}>
  //                 {frameTest.processed ? `✓ Working (${frameTest.pointsDetected} points)` : '✗ Failed'}
  //               </span>
  //             </div>
  //           )}

  //           {diagnostics.errors.length > 0 && (
  //             <div className="mt-3 p-2 bg-red-50 rounded">
  //               <h4 className="font-medium text-red-800">Errors:</h4>
  //               <ul className="list-disc pl-5 text-red-700">
  //                 {diagnostics.errors.map((err, i) => (
  //                   <li key={i}>{err}</li>
  //                 ))}
  //               </ul>
  //             </div>
  //           )}
  //         </div>
  //       )}
  //     </div>
  //   );
  // };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      
      <header className="py-6 bg-white/80 backdrop-blur-md shadow-sm">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            AI Football Coach
          </h1>
          <p className="text-grey-600 mt-2">
            Get real-time technical feedback on your technique.
          </p>
        </div>
      </header>

      
      {/* <main className="container mx-auto px-4 py-8">

        
        <div className="bg-white rounded-xl shadow-lg overflow-hidden animated-card">
          <div className="p-6">
            <div className="flex items-center space-x-4 mb-6">
              <div className="p-3 rounded-full bg-blue-100 text-primary">
                <UploadIcon className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-semibold">Analyze your Video</h2>
            </div>

            <input 
              type="file"
              className="hidden"
              id="video-upload"
              accept="video/*"
              onChange={handleFileChange}  
            />
            <label 
              htmlFor='video-upload'
              className="btn-primary block w-full py-3 px-6 text-center 
              text-white rounded-lg cursor-pointer transition-all hover:shadow-lg"
            >
              {isProcessing ? (
                  <span className="flex items-center justify-center">
                    <SpinnerIcon className="mr-2" />
                    Processing...
                  </span>
              ) : (
                'Upload Training Video'
              )} 
            </label>
          </div>
        </div>

        
        {error && (
        <div className="p-4 bg-red-100 text-red-800 rounded-lg">
          {error}
        </div>
        )}

        
        {videoRef.current?.src && (
          <div className="mt-8 bg-gradient-to-r from-field-green/10 to-blue-100/50 p-1 rounded-2xl">
            <div className="relative bg-black rounded-xl overflow-hidden">
              <video
                ref={videoRef}
                controls
                className="w-full aspect-video rounded-lg"
              />
              <canvas 
                ref={canvasRef}
                className="absolute inset-0 w-full pointer-events-none"  
              />
            </div>
          </div>
        )}

        
        <div className="my-8 space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-md border-1-4 border-accent">
            <h3 className="font-bold text-lg flex items-center">
              <SparklesIcon className="text-yellow-500 mr-2" />
              Coach's Feedback
            </h3>
            <div className="my-4 p-4 bg-blue-50 rounded-lg animate-pulse">
              {feedback || "Waiting for analysis..."}
            </div>
          </div>

          
          {analysisResults.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
              {analysisResults.map((result, index) => (
                <div key={index}className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center mb-2">
                    <span className="inline-block w-8 h-8 rounded-full bg-primary text-white items-center justify-center mr-3">
                      {index + 1}
                    </span>
                    <span className="font-medium"> At {index}s</span>
                  </div>
                  <p className="text-gray-700">{result.feedback}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        
        <SystemDiagnostics />

      </main> */}


      <div className="mb-4">
        <input 
          type="file" 
          accept="video/*" 
          onChange={handleFileChange}
          disabled={isProcessing}
          className="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-md file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-50 file:text-blue-700
            hover:file:bg-blue-100"
        />
      </div>
      
      {error && (
        <div className="p-4 bg-red-100 text-red-800 rounded-lg">
          {error}
        </div>
      )}

      <div className="relative">
        <video 
          ref={videoRef}
          controls
          className="w-full rounded-lg border-2 border-gray-300"
        />
        <canvas
          ref={canvasRef}
          width={640}
          height={480}
          className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-0"
        />
      </div>

      <div className="p-4 bg-white rounded-lg shadow-md">
        <p className="font-semibold">Coach Feedback:</p>
        <p className="mt-2">{feedback}</p>
        {isProcessing && (
          <div className="mt-2">
            <progress 
              value={currentTime} 
              max={videoRef.current?.duration || 100} 
              className="w-full"
            />
            <p>Processing: {Math.round(currentTime)}s</p>
          </div>
        )}
      </div>

      {analysisResults.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-2">Analysis Results</h3>
          <div className="space-y-4">
            {analysisResults.map((result, index) => (
              <div key={index} className="p-4 border rounded-lg">
                <p className="text-sm text-gray-500">Time: {index}s</p>
                <p className="mt-1">{result.feedback}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Validation Component Placement */}
      {/* <SystemDiagnostics /> */}
    </div>
  );
}