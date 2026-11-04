import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Emirates Auction — Homepage UI Mock",
  description: "Local UI prototype inspired by the Emirates Auction homepage.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
