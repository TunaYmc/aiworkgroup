import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "YapayZekaÇalışan — Multi-Tenant AI Employee Platform",
  description: "Şirketiniz için bağımsız, sandbox içinde çalışan profesyonel dijital AI çalışanlar.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body className="bg-zinc-950 text-zinc-100 flex min-h-screen selection:bg-blue-600/30 selection:text-white antialiased">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 bg-zinc-950">
          <Header />
          <main className="flex-1 p-6 md:p-8 overflow-y-auto">{children}</main>
        </div>
      </body>
    </html>
  );
}
