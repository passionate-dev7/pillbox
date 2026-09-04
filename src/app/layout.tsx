import type { Metadata } from "next";
import { Archivo, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

/** Archivo is the grotesk this DESIGN.md pins as the display face; it ships a width axis. */
const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  display: "swap",
  variable: "--font-archivo",
});

/** Ids, timestamps and tool names are set like a maintenance tag, not body copy. */
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-plex-mono",
});

export const metadata: Metadata = {
  title: {
    default: "Pill Round",
    template: "%s | Pill Round",
  },
  description:
    "A shared medication round card for a family caregiver and a pharmacist: capability-key roles, confirm-before-mutate, interaction flags from openFDA labels, a printable MAR sheet.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${archivo.variable} ${plexMono.variable} h-full`}>
      <body className="min-h-full bg-paper text-ink antialiased">{children}</body>
    </html>
  );
}
