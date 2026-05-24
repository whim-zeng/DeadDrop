import type { Metadata } from "next";
import type { ReactNode } from "react";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "DeadDrop",
  description: "在你所在的地方，放下一张纸条。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <main className="deaddrop-root">{children}</main>
      </body>
    </html>
  );
}
