import type { AppProps } from 'next/app';
import { UserProvider } from '../src/context/UserContext';
import '../src/styles/globals.css';
import Head from 'next/head';

function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>SentinelIQ User Dashboard</title>
      </Head>
      <UserProvider>
        <Component {...pageProps} />
      </UserProvider>
    </>
  );
}

export default App;
