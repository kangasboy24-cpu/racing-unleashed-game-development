import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Racing Unleashed',
  description:
    'Racing Unleashed is a 3D browser racing game. Battle AI rivals on legendary-inspired Grand Prix circuits, a banked superspeedway, a 24-hour endurance track and a fearsome mountain raceway.',
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#0b0b0f',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        {/* CrazyGames SDK v3: must load synchronously in <head> so it is ready before the game boots. */}
        <script src="https://sdk.crazygames.com/crazygames-sdk-v3.js" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  )
}
