import type { Metadata } from "next";
import {
  Inter,
  Gabarito,
  Geist_Mono,
  Roboto,
  Roboto_Flex,
  Roboto_Serif,
  EB_Garamond,
  IBM_Plex_Sans,
  IBM_Plex_Serif,
  Inria_Sans,
  Inria_Serif,
  Poppins,
  Source_Sans_3,
  Ubuntu_Mono,
  Work_Sans,
  Nunito_Sans,
  Literata,
  Lora,
  DM_Sans,
  Crimson_Text,
  Playfair_Display,
  Manrope,
  Cactus_Classical_Serif,
} from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";
import { siteUrl } from "@/lib/site";

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

// Resume-style font families (Design > Fonts). Each resume style curates three
// of these into Primary+Secondary pairs (see font-pairs.ts). preload:false keeps
// them off the critical path - they load only once a style that uses them is
// selected, so unrelated pages aren't slowed.
const roboto = Roboto({ variable: "--font-roboto", subsets: ["latin"], weight: ["400", "500", "700"], display: "swap", preload: false });
const robotoSerif = Roboto_Serif({ variable: "--font-roboto-serif", subsets: ["latin"], weight: ["400", "500", "600", "700"], display: "swap", preload: false });
const nunitoSans = Nunito_Sans({ variable: "--font-nunito-sans", subsets: ["latin"], weight: ["400", "600", "700"], display: "swap", preload: false });
const literata = Literata({ variable: "--font-literata", subsets: ["latin"], weight: ["400", "500", "600", "700"], display: "swap", preload: false });
const lora = Lora({ variable: "--font-lora", subsets: ["latin"], weight: ["400", "500", "600", "700"], display: "swap", preload: false });
const dmSans = DM_Sans({ variable: "--font-dm-sans", subsets: ["latin"], weight: ["400", "500", "700"], display: "swap", preload: false });
const crimson = Crimson_Text({ variable: "--font-crimson", subsets: ["latin"], weight: ["400", "600", "700"], display: "swap", preload: false });
const playfair = Playfair_Display({ variable: "--font-playfair", subsets: ["latin"], weight: ["400", "500", "600", "700"], display: "swap", preload: false });
const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"], weight: ["400", "500", "600", "700"], display: "swap", preload: false });
const cactusSerif = Cactus_Classical_Serif({ variable: "--font-cactus-serif", subsets: ["latin"], weight: ["400"], display: "swap", preload: false });

// Combined CSS-variable class list for the extra design fonts.
const designFontVars = [
  ebGaramond, ibmPlexSans, ibmPlexSerif, inriaSans, inriaSerif,
  poppins, sourceSans, ubuntuMono, workSans,
  roboto, robotoSerif, nunitoSans, literata, lora, dmSans,
  crimson, playfair, manrope, cactusSerif,
]
  .map((f) => f.variable)
  .join(" ");

// Default document <head> metadata applied to every route unless a page
// overrides it. `metadataBase` resolves relative OG/canonical URLs against the
// site origin; the title template appends the brand to per-page titles.
const SITE_DESCRIPTION =
  "Create, edit and tailor resumes, cover letters, and resignation letters with AI assistance.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "Resumewriter.ai - Build your resume",
    template: "%s - Resumewriter.ai",
  },
  description: SITE_DESCRIPTION,
  applicationName: "Resumewriter.ai",
  openGraph: {
    type: "website",
    siteName: "Resumewriter.ai",
    title: "Resumewriter.ai - Build your resume",
    description: SITE_DESCRIPTION,
    url: siteUrl(),
  },
  twitter: {
    card: "summary_large_image",
    title: "Resumewriter.ai - Build your resume",
    description: SITE_DESCRIPTION,
  },
  robots: { index: true, follow: true },
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
