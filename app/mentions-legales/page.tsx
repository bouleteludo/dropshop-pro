import type { Metadata } from "next";

export const metadata: Metadata = { title: "Mentions légales" };

function env(key: string, fallback = "À compléter avant mise en ligne") {
  return process.env[key] ?? fallback;
}

export default function MentionsLegalesPage() {
  return (
    <main className="container max-w-3xl py-12 sm:py-16">
      <h1 className="font-display text-3xl text-bone-50 mb-8">Mentions légales</h1>
      <div className="prose prose-invert prose-headings:font-display prose-headings:text-bone-50 prose-p:text-bone-200/80 prose-li:text-bone-200/80 max-w-none">
        <h2>Éditeur du site</h2>
        <ul>
          <li>
            <strong>Nom / raison sociale :</strong> {env("LEGAL_COMPANY_NAME")}
          </li>
          <li>
            <strong>Forme juridique :</strong> {env("LEGAL_COMPANY_FORM")}
          </li>
          <li>
            <strong>Adresse :</strong> {env("LEGAL_ADDRESS")}
          </li>
          <li>
            <strong>SIRET :</strong> {env("LEGAL_SIRET")}
          </li>
          <li>
            <strong>Email :</strong> {env("NEXT_PUBLIC_CONTACT_EMAIL")}
          </li>
        </ul>

        <h2>Hébergement</h2>
        <ul>
          <li>
            <strong>Hébergeur :</strong> Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis
          </li>
          <li>
            <strong>Site :</strong> {env("NEXT_PUBLIC_SITE_URL")}
          </li>
        </ul>

        <h2>Médiation de la consommation</h2>
        <p>
          Conformément à l&apos;article L.616-1 du Code de la consommation, tout consommateur a le droit
          de recourir gratuitement à un médiateur de la consommation en vue de la résolution amiable d&apos;un
          litige. Coordonnées du médiateur : {env("LEGAL_MEDIATOR")}.
        </p>
      </div>
    </main>
  );
}
