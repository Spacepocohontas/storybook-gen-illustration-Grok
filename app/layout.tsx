import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "Storybook Gen Illustration",
  description: "Turn manuscripts into illustrated novels with persistent character references.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
