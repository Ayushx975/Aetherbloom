import "./globals.css";

export const metadata = {
  title: "AETHERBLOOM — The Living Atlas | Tech Zephyr 4.0 Web Hackathon",
  description:
    "AETHERBLOOM is a Life RPG web app: turn real-life quests into visible growth, ranks, streaks and coins. Built for Tech Zephyr 4.0 Web Hackathon, IIT Bhubaneswar. Next.js + Supabase + Three.js.",
  keywords: ["Life RPG", "Aetherbloom", "Living Atlas", "Web Hackathon", "Tech Zephyr", "IIT Bhubaneswar", "productivity gamification"],
  openGraph: {
    title: "AETHERBLOOM — The Living Atlas",
    description:
      "Complete quests. Grow your world. Rise from Seed to Everbloom.",
    type: "website",
  },
  metadataBase: new URL("https://aetherbloom.vercel.app"),
  icons: { icon: "/favicon.svg" },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0a0c10",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main">
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
