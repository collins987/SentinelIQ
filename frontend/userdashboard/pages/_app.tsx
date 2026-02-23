import type { AppProps } from 'next/app';
import { UserProvider } from '../src/context/UserContext';
import '../src/styles/globals.css';
import Head from 'next/head';

function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <link rel="icon" type="image/jpeg" href="/sentineliq-icon.jpeg" />
        <link rel="apple-touch-icon" href="/sentineliq-icon.jpeg" />
        <title>SentinelIQ | User Dashboard</title>
      </Head>
      <UserProvider>
        <Component {...pageProps} />
      </UserProvider>
    </>
  );
}

export default App;
