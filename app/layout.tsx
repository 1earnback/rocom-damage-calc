import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '洛克王国伤害计算器',
  description: '基于 Next.js 的洛克王国伤害计算器',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}
