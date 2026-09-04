import type { Metadata } from "next";
import { Manrope, JetBrains_Mono } from "next/font/google";
import "./globals.css";

/** Manrope is the humanist sans this DESIGN.md pins for display and body. */
const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-manrope",
});

/** Doses, times, and set_ids are set like a lab tag, not body copy. */
const jbMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-jbmono",
});

export const metadata: Metadata = {
  icons: { icon: "/logo-512.png", apple: "/logo-512.png" },
  openGraph: { images: ["/logo.png"] },
  title: {
    default: "Pillbox",
    template: "%s | Pillbox",
  },
  description:
    "A shared medication round card for a family caregiver and a pharmacist: capability-key roles, confirm-before-mutate, interaction flags from openFDA labels, a printable MAR sheet.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${manrope.variable} ${jbMono.variable} h-full`}>
      <body className="min-h-full bg-canvas text-ink antialiased">{children}</body>
    </html>
  );
}
