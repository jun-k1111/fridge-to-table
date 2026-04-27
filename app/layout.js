// WHAT: Import Google Fonts for clean, modern typography
// HOW: Next.js font/google handles font loading and CSS variable injection automatically
// OUTCOME: Geist Sans is available as a CSS variable used in the html className
import { Geist } from "next/font/google";

// WHAT: Import the global stylesheet that includes Tailwind and custom CSS
// HOW: Importing in layout.js applies styles to every page in the app
// OUTCOME: Food-inspired color palette and custom animations are available everywhere
import "./globals.css";

// WHAT: Configure the Geist Sans font with a CSS variable name
// HOW: Next.js generates a class that sets --font-geist-sans on the root element
// OUTCOME: Components can reference this font via var(--font-geist-sans)
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// WHAT: Define the page metadata shown in browser tab and search engine results
// HOW: Next.js App Router reads this exported object and populates <head> tags
// OUTCOME: Browser tab shows "Fridge-to-Table" and the description aids SEO
export const metadata = {
  title: "Fridge-to-Table — AI Recipe Generator",
  description:
    "Turn any ingredients in your fridge into a personalized, validated recipe — powered by Claude AI.",
  openGraph: {
    // WHAT: Social preview metadata for sharing on Slack, Twitter, etc.
    // HOW: og: tags are read by social platforms to generate link previews
    // OUTCOME: Sharing the URL shows a rich card instead of a bare link
    title: "Fridge-to-Table — AI Recipe Generator",
    description: "Turn your fridge into a gourmet meal with AI-powered recipes.",
    type: "website",
  },
};

// WHAT: Root layout component that wraps every page in the app
// HOW: Next.js App Router renders this around every route's page.js
// OUTCOME: All pages share the same HTML shell, font setup, and global styles
export default function RootLayout({ children }) {
  return (
    // WHAT: Set the page language for accessibility and screen readers
    // HOW: lang="en" attribute is read by browsers and assistive technology
    // OUTCOME: Screen readers announce content in the correct language
    <html lang="en" className={geistSans.variable}>
      {/* WHAT: Apply the Geist font and minimum height to the body
          HOW: Tailwind classes set font-family via CSS variable and ensure full-height layout
          OUTCOME: Content can fill the full viewport height without short pages */}
      <body className="min-h-screen font-[var(--font-geist-sans)]">
        {children}
      </body>
    </html>
  );
}
