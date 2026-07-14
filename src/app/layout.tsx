import type { Metadata } from "next";
import {
  Inter,
  Gabarito,
  Geist_Mono,
  Roboto_Flex,
  EB_Garamond,
  IBM_Plex_Sans,
  IBM_Plex_Serif,
  Inria_Sans,
  Inria_Serif,
  Poppins,
  Source_Sans_3,
  Ubuntu_Mono,
  Work_Sans,
} from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

// Heavy, rounded display font for headings (the "How should we start?" look).
const gabarito = Gabarito({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Offered as a resume body font in the Design panel. The store's font id has
// always been "roboto"; without this it silently rendered Verdana instead.
const robotoFlex = Roboto_Flex({
  variable: "--font-roboto-flex",
  subsets: ["latin"],
});

// Extra letterhead fonts offered in the resignation-letter Design toolbar.
// preload:false keeps them off the critical path - they load only when a user
// actually picks them, so other pages aren't slowed down.
const ebGaramond = EB_Garamond({ variable: "--font-eb-garamond", subsets: ["latin"], weight: ["400", "500", "600", "700"], display: "swap", preload: false });
const ibmPlexSans = IBM_Plex_Sans({ variable: "--font-ibm-plex-sans", subsets: ["latin"], weight: ["400", "500", "600", "700"], display: "swap", preload: false });
const ibmPlexSerif = IBM_Plex_Serif({ variable: "--font-ibm-plex-serif", subsets: ["latin"], weight: ["400", "500", "600", "700"], display: "swap", preload: false });
const inriaSans = Inria_Sans({ variable: "--font-inria-sans", subsets: ["latin"], weight: ["300", "400", "700"], display: "swap", preload: false });
const inriaSerif = Inria_Serif({ variable: "--font-inria-serif", subsets: ["latin"], weight: ["300", "400", "700"], display: "swap", preload: false });
const poppins = Poppins({ variable: "--font-poppins", subsets: ["latin"], weight: ["400", "500", "600", "700"], display: "swap", preload: false });
const sourceSans = Source_Sans_3({ variable: "--font-source-sans", subsets: ["latin"], weight: ["400", "600", "700"], display: "swap", preload: false });
const ubuntuMono = Ubuntu_Mono({ variable: "--font-ubuntu-mono", subsets: ["latin"], weight: ["400", "700"], display: "swap", preload: false });
const workSans = Work_Sans({ variable: "--font-work-sans", subsets: ["latin"], weight: ["400", "500", "600", "700"], display: "swap", preload: false });

// Combined CSS-variable class list for the extra design fonts.
const designFontVars = [
  ebGaramond, ibmPlexSans, ibmPlexSerif, inriaSans, inriaSerif,
  poppins, sourceSans, ubuntuMono, workSans,
]
  .map((f) => f.variable)
  .join(" ");

// Default document <head> metadata applied to every route unless a page overrides it.
export const metadata: Metadata = {
  title: "Resume.co - Build your resume",
  description: "Create, edit and tailor resumes with AI assistance.",
};

/**
 * Root layout wrapping every page: sets up fonts (sans/heading/mono CSS vars),
 * global app providers (session, theme), tooltips, and the toast container.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${gabarito.variable} ${geistMono.variable} ${robotoFlex.variable} ${designFontVars} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>
          <TooltipProvider>{children}</TooltipProvider>
        </Providers>
        <Toaster />
      </body>
    </html>
  );
}
