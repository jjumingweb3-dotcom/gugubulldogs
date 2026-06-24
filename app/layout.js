import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport = {
  width: "device-width",
  initialScale: 1.0,
  maximumScale: 1.0,
  userScalable: false,
};

export const metadata = {
  title: "구구불독스 플레이북 | 경기 영상 허브",
  description: "구구불독스 유소년 야구단의 경기 중계 영상을 팀별, 대회별, 날짜별로 모아보는 학부모 전용 플랫폼입니다.",
  keywords: ["구구불독스", "유소년야구", "야구중계", "경기영상", "플레이북"],
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-dark-bg text-gray-100 selection:bg-primary selection:text-white">
        {children}
      </body>
    </html>
  );
}
