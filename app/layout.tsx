import { AuthSessionProvider } from "@/components/auth/AuthSessionProvider";
import { AlertProvider } from "@/components/shared/AlertProvider";
import GlobalLoadingOverlay from "@/components/shared/GlobalLoadingOverlay";
import { InstallPrompt } from "@/components/shared/InstallPrompt";
import { OfflineIndicator } from "@/components/shared/OfflineIndicator";
import SplashScreen from "@/components/shared/SplashScreen";
import { ServiceWorkerRegistration } from "@/components/shared/ServiceWorkerRegistration";
import { SyncMessageHandler } from "@/components/shared/SyncMessageHandler";
import { SyncStatus } from "@/components/shared/SyncStatus";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Hohoe Experimental Schools - School Management System",
  description: "Modern school management system for Hohoe Experimental Schools",
  manifest: "/manifest.json",
  themeColor: "#2563EB",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="antialiased font-sans">
        <SplashScreen />
        <ServiceWorkerRegistration />
        <SyncMessageHandler />
        <AuthSessionProvider>
          <GlobalLoadingOverlay />
          <AlertProvider>
            {children}
            <InstallPrompt />
            <OfflineIndicator />
            <SyncStatus />
          </AlertProvider>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
