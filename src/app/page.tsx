import type { Metadata } from "next";
import { Landing } from "@/components/site/Landing";
import { Header } from "@/components/site/Header";
import { Hero } from "@/components/site/Hero";
import { Sharing } from "@/components/site/Sharing";
import { HowItWorks } from "@/components/site/HowItWorks";
import { FAQ } from "@/components/site/FAQ";
import { Contact } from "@/components/site/Contact";
import { Footer } from "@/components/site/Footer";
import "@/components/site/landing.css";

export const metadata: Metadata = {
  title: "Namarca — boca a boca digital para sua campanha",
  description: "Campanhas de marketing com participação e boca a boca digital. Cada pessoa combina sua foto, molduras e figurinhas e decide se compartilha a imagem.",
  robots: { index: false, follow: false },
};

export default function HomePage() {
  const exampleSlug = process.env.EXAMPLE_CAMPAIGN_SLUG ?? 'exemplo';
  const exampleHref = exampleSlug && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(exampleSlug) && exampleSlug.length >= 2 && exampleSlug.length <= 80 ? `/${exampleSlug}` : undefined;
  return (
    <>
      <link rel="preload" href="/landing/poppins-700-latin.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
      <link rel="preload" href="/landing/poppins-300-latin.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
      <link rel="preload" href="/landing/poppins-500-latin.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
      <link rel="preload" href="/landing/poppins-600-latin.woff2" as="font" type="font/woff2" crossOrigin="anonymous" media="(min-width: 901px)" />
      <link rel="preload" as="image" href="/landing/materials/clube-sol-story-display.webp" fetchPriority="high" />
      <link rel="preload" as="image" href="/landing/materials/michael-dam-portrait.webp" fetchPriority="high" />
      <link rel="preload" as="image" href="/landing/materials/orbita-story-display.webp" />
      <link rel="preload" as="image" href="/landing/materials/final-story-display.webp" />
      <link rel="preload" as="image" href="/landing/materials/adote-story-display.webp" fetchPriority="low" />
      <link rel="preload" as="image" href="/landing/materials/ritmo-story-display.webp" fetchPriority="low" />
      <Landing>
        <a className="skip" href="#conteudo">Pular para o conteúdo</a>
        <Header />
        <main id="conteudo">
          <Hero exampleHref={exampleHref} />
          <Sharing />
          <HowItWorks />
          <FAQ />
          <Contact />
        </main>
        <Footer />
      </Landing>
    </>
  );
}
