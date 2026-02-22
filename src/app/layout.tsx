 import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css"; // <--- CRITICAL: This line loads all the styling
import { AuthProvider } from "@/contexts/AuthContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Stasha Bar POS",
  description: "Point of Sale System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}