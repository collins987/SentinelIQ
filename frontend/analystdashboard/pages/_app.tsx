import type { AppProps } from 'next/app';
import { AnalystProvider } from '../src/context/AnalystContext';
import '../src/styles/globals.css';
import Head from 'next/head';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <link rel="icon" type="image/jpeg" href="/sentineliq-icon.jpeg" />
        <link rel="apple-touch-icon" href="/sentineliq-icon.jpeg" />
        <title>SentinelIQ | Analyst Dashboard</title>
      </Head>
      <AnalystProvider>
        <Component {...pageProps} />
      </AnalystProvider>
    </>
  );
}
