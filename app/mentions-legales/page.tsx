import type { Metadata } from "next";

export const metadata: Metadata = { title: "Mentions légales", robots: { index: false, follow: true } };

const env = (key: string, fallback = "À COMPLÉTER AVANT MISE EN LIGNE") => process.env[key] ?? fallback;

export default function LegalPage() {
  return <main className="container max-w-3xl py-12 sm:py-16 prose prose-invert">
    <h1>Mentions légales</h1>
    <p>Ces informations doivent être complétées avec les données exactes de l&apos;entreprise avant l&apos;ouverture commerciale.</p>
    <h2>Éditeur</h2>
    <ul>
      <li><strong>Nom / raison sociale :</strong> {env("LEGAL_COMPANY_NAME")}</li>
      <li><strong>Forme juridique :</strong> {env("LEGAL_COMPANY_FORM")}</li>
      <li><strong>Adresse :</strong> {env("LEGAL_ADDRESS")}</li>
      <li><strong>SIREN / SIRET :</strong> {env("LEGAL_SIRET")}</li>
      <li><strong>TVA intracommunautaire :</strong> {env("LEGAL_VAT")}</li>
      <li><strong>Email :</strong> {env("NEXT_PUBLIC_CONTACT_EMAIL", "À COMPLÉTER")}</li>
    </ul>
    <h2>Hébergement</h2>
    <ul>
      <li><strong>Hébergeur :</strong> {env("LEGAL_HOST_NAME")}</li>
      <li><strong>Adresse :</strong> {env("LEGAL_HOST_ADDRESS")}</li>
      <li><strong>Site :</strong> {env("NEXT_PUBLIC_SITE_URL")}</li>
    </ul>
    <h2>Médiation de la consommation</h2>
    <p>À compléter avec le médiateur auquel l&apos;entreprise adhère et ses coordonnées.</p>
    <h2>Important</h2>
    <p>Ne publie pas cette page avec les champs « À COMPLÉTER ». Renseigne les données légales réelles de l&apos;entreprise et vérifie les obligations applicables à ton activité.</p>
  </main>;
}
