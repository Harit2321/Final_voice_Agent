import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "Auth App - Login & Register",
    description: "Beautiful authentication pages with modern design",
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
