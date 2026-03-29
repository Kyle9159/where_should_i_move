import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { QueryProvider } from "@/lib/query-client";
import { AuthProvider } from "@/lib/session-provider";
import "./globals.css";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://whereshouldimove.us";
const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

export const metadata: Metadata = {
	metadataBase: new URL(appUrl),
	title: {
		default: "Where Should I Move — Find Your Next Home",
		template: "%s | Where Should I Move",
	},
	description:
		"Intelligent US relocation research. Compare 55+ filters, AI-powered quiz, and ranked city results across 1,000 US cities. Find your perfect new home.",
	keywords: ["relocation", "moving", "best cities to live", "cost of living", "city comparison", "where to move"],
	openGraph: {
		type: "website",
		siteName: "Where Should I Move",
		title: "Where Should I Move — Find Your Next Home",
		description: "AI-powered US city comparison. 55+ filters, 1,000 cities, personalized rankings.",
	},
	twitter: { card: "summary_large_image" },
	manifest: "/manifest.webmanifest",
	appleWebApp: {
		capable: true,
		statusBarStyle: "black-translucent",
		title: "Where Should I Move",
	},
	formatDetection: { telephone: false },
};

export const viewport: Viewport = {
	themeColor: "#00d4ff",
	colorScheme: "dark",
	width: "device-width",
	initialScale: 1,
	maximumScale: 5,
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
				<AuthProvider>
					<QueryProvider>{children}</QueryProvider>
				</AuthProvider>

				{/* Google Analytics — only loads when NEXT_PUBLIC_GA_MEASUREMENT_ID is set */}
				{gaId && (
					<>
						<Script
							src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
							strategy="afterInteractive"
						/>
						<Script id="gtag-init" strategy="afterInteractive">
							{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${gaId}');`}
						</Script>
					</>
				)}
			</body>
		</html>
	);
}
