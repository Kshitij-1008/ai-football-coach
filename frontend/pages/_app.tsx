import type { AppProps } from 'next/app'; // Import the AppProps type from Next.js
import '../styles/globals.css' // Create this file if missing

export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />
}