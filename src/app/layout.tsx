import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "キャバクラ AI 面接官",
  description: "AIによるキャバクラ面接シミュレーション",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased">{children}</body>
    </html>
  );
}
