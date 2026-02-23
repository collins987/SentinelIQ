import type { AppProps } from 'next/app';
import { AnalystProvider } from '../src/context/AnalystContext';
import '../src/styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AnalystProvider>
      <Component {...pageProps} />
    </AnalystProvider>
  );
}
