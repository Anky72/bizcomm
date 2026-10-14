import type { Metadata } from "next";
import "./style.css";
export const metadata: Metadata = { title: "Team Quiz", description: "Timed team quiz" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}