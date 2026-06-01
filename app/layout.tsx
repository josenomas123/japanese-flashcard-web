import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Japanese Flashcard Builder',
  description: 'Sentence mining tool for Japanese vocabulary',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="bg-base text-text min-h-screen">{children}</body>
    </html>
  )
}
