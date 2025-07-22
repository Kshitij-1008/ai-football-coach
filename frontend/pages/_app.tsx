import type { AppProps } from 'next/app'; // Import the AppProps type from Next.js
import '../styles/globals.css' // Create this file if missing
import '../styles/animations.css'

export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />
}