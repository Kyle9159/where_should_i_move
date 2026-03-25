import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { QueryProvider } from "@/lib/query-client";
import "./globals.css";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "NextHome USA — Find Where You Belong",
	description:
		"Intelligent US relocation research. Compare 55+ filters, AI-powered quiz, and ranked city results to find your perfect new home.",
	keywords: ["relocation", "moving", "best cities to live", "cost of living", "city comparison"],
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html
			lang="en"
			className={`${geistSans.variable} ${geistMono.variable} h-full`}
		>
			<body className="min-h-full flex flex-col bg-[var(--color-background)] text-[var(--color-foreground)] antialiased">
				<QueryProvider>{children}</QueryProvider>
			</body>
		</html>
	);
}
