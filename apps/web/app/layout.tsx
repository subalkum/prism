import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Prism | AI Research Agent",
  description:
    "Deep research, synthesized. Multi-model research agent with source grounding, telemetry, and conversational follow-ups.",
  openGraph: {
    title: "Prism | AI Research Agent",
    description: "Research, synthesized. Powered by frontier-class models.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=DM+Serif+Display&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-surface font-sans text-tx antialiased">
        {children}
      </body>
    </html>
  );
}
