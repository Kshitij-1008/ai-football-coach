import VideoAnalysis from '../components/VideoAnalysis';
import Head from 'next/head';

export default function Home() {
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