import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pineapple Boys",
  description: "Jungle Saitis workspace for current and future songs.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
