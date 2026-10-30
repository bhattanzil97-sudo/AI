import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CHAT AI - Modern AI Assistant (Online & Offline)',
  description:
    'A modern, professional AI chatbot inspired by ChatGPT and Google Gemini. Featuring fast streaming, Online Cloud AI & Offline On-Device Ollama support, voice controls, and complete privacy.',
  manifest: '/manifest.json',
  themeColor: '#2563eb',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'CHAT AI',
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/icon-192.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body className="h-screen w-screen overflow-hidden antialiased bg-white dark:bg-[#0f141c] text-gray-900 dark:text-gray-100">
        {children}
      </body>
    </html>
  );
}

