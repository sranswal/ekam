import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Inter, JetBrains_Mono } from "next/font/google";
import { LanguageProvider } from "@/lib/i18n";
import { ThemeProvider } from "@/lib/theme";
import AnnouncementBanner from "./components/announcement-banner";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://ekam-one.vercel.app",
  ),
  title: "ekam - all in one",
  description:
    "ekam turns a plain-language question - in English or Hindi - into a verified, source-linked dataset: jobs, properties, tenders, events and more.",
  icons: {
    icon: [
      { url: "/favicon_light.png", media: "(prefers-color-scheme: light)" },
      { url: "/favicon_dark.png", media: "(prefers-color-scheme: dark)" },
      { url: "/favicon_light.png" },
    ],
    apple: "/favicon_light.png",
  },
  openGraph: {
    title: "ekam - all in one",
    description:
      "Ask in plain words, get verified answers. Typed or spoken, English or Hindi.",
    url: "https://github.com/sranswal/ekam",
    siteName: "ekam",
    images: [
      {
        url: "/demo-poster.png",
        width: 1280,
        height: 800,
        alt: "ekam verified search workspace",
      },
    ],
    locale: "en_US",
    type: "website",
  },
};

const themeInit = `(function(){try{var t=localStorage.getItem("ekam-theme");var d=t?t==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.toggle("dark",d);document.documentElement.classList.toggle("light",!d);}catch(e){}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${jakarta.variable} ${inter.variable} ${mono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
        <link
          rel="icon"
          href="/favicon_light.png"
          type="image/png"
          media="(prefers-color-scheme: light)"
        />
        <link
          rel="icon"
          href="/favicon_dark.png"
          type="image/png"
          media="(prefers-color-scheme: dark)"
        />
      </head>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <ThemeProvider>
          <LanguageProvider>
            <AnnouncementBanner />
            {children}
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
