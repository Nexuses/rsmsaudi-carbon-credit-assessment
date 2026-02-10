import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { GoogleAnalytics } from '@next/third-parties/google'

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "RSM Saudi Arabia – Carbon Credit Readiness Assessment",
  description:
    "RSM Saudi Arabia’s Carbon Credit Readiness Assessment helps organisations evaluate their readiness for Saudi Arabia’s voluntary carbon market across awareness, strategy, market trust, economics and future outlook, providing an instant readiness score and tailored guidance from our Sustainability & ESG team.",
  icons: {
    icon: "https://cdn-nexlink.s3.us-east-2.amazonaws.com/Faviconn_2d471e30-d53d-4c59-bc9e-4ae17baa0a92.png", // or '/favicon.png'
  },
  openGraph: {
    title: "RSM Saudi Arabia – Carbon Credit Readiness Assessment",
    description:
      "Assess your organisation’s carbon credit readiness in Saudi Arabia’s voluntary carbon market and get actionable insights from RSM Saudi Arabia’s Sustainability & ESG team.",
    images: [
      {
        url: "https://rsm-saudi.s3.us-east-2.amazonaws.com/RSM_Saudi_Linzy_2025_Frame.png",
        width: 1920,
        height: 540,
        alt: "RSM Saudi Arabia Carbon Credit Readiness Assessment",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
      <GoogleAnalytics gaId="G-1NXS62CTQ7" />
    </html>
  );
}
