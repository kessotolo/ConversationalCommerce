import '../src/app/globals.css';
import { Component } from 'react';
import type { AppProps } from 'next/app';

export default function MyApp({ Component, pageProps }: AppProps) {
    return <Component {...pageProps} />;
}