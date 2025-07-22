import VideoAnalysis from '../components/VideoAnalysis';
import Head from 'next/head';
import { useEffect, useState } from 'react';

export default function Home() {
  const [serverStatus, setServerStatus] = useState<'checking' | 'connected' | 'error'>('checking');

  useEffect(() => {
    const testConnection = async () => {
      try {
        // First try health check
        const healthCheck = await fetch('http://localhost:8001/health', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (!healthCheck.ok) {
          throw new Error('Health check failed');
        }

        // Then try a test pose estimation
        const testPose = await fetch('http://localhost:8001/test/pose', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        const data = await testPose.json();
        
        if (!testPose.ok) {
          console.error('Backend error:', data);
          setServerStatus('error');
          return;
        }
        
        console.log('Backend connection status:', testPose.status);
        setServerStatus('connected');
      } catch (error) {
        console.error('Backend connection failed:', error);
        setServerStatus('error');
      }
    };

    testConnection();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <Head>
        <title>AI Football Coach | Improve Your Technique</title>
        <meta name="description" content="Get AI-powered football coaching feedback" />
      </Head>
      
      <VideoAnalysis />

      {/* Footer */}
      <footer className="py-6 bg-white/80 mt-12">
        <div className="container mx-auto px-4 text-center text-gray-600">
          <p>© {new Date().getFullYear()} AI Football Coach. Train smarter.</p>
        </div>
      </footer>
    </div>
  )
}