import type { Metadata } from "next";
import { Inter, Geist, Outfit } from "next/font/google";
import { ManualThemeProvider } from "@/lib/theme-context";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-heading",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SaaS Platform",
  description: "Multi-tenant SaaS platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={cn("font-sans", geist.variable, outfit.variable)}>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ManualThemeProvider>
          {children}
          <Toaster />
        </ManualThemeProvider>
      </body>
    </html>
  );
}
