import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MenuFlow — Commandez en un instant",
  description: "Scannez, choisissez, commandez. L'expérience restaurant réinventée.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#FAFAF9" />
      </head>
      <body className="min-h-screen bg-background">
        {children}
      </body>
    </html>
  );
}
