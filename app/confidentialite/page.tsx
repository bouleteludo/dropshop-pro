import type { Metadata } from "next";

export const metadata: Metadata = { title: "Politique de confidentialité" };

function env(key: string, fallback = "À compléter") {
  return process.env[key] ?? fallback;
}

export default function ConfidentialitePage() {
  const contactEmail = env("NEXT_PUBLIC_CONTACT_EMAIL");

  return (
    <main className="container max-w-3xl py-12 sm:py-16">
      <h1 className="font-display text-3xl text-bone-50 mb-8">Politique de confidentialité</h1>
      <div className="prose prose-invert prose-headings:font-display prose-headings:text-bone-50 prose-p:text-bone-200/80 max-w-none">
        <p>
          Cette boutique traite les données nécessaires à la gestion des commandes, au paiement, à la
          livraison et au service client. Contact : {contactEmail}.
        </p>

        <h2>Données traitées</h2>
        <p>
          Selon le parcours d&apos;achat : identité, adresse de livraison, email et informations de commande.
          Le paiement par carte est traité directement par Stripe — cette boutique ne stocke jamais les
          données complètes de carte bancaire.
        </p>

        <h2>Destinataires des données</h2>
        <p>
          Les informations nécessaires à l&apos;exécution et à la livraison de la commande sont transmises à
          notre fournisseur (CJ Dropshipping) et à notre prestataire de paiement (Stripe), uniquement dans
          la mesure requise pour traiter la commande.
        </p>

        <h2>Cookies et mesure d&apos;audience</h2>
        <p>
          Tout outil d&apos;analyse ou de publicité ajouté à ce site sera documenté ici et configuré
          conformément aux règles applicables, avec recueil du consentement lorsque celui-ci est requis.
        </p>

        <h2>Vos droits</h2>
        <p>
          Conformément au RGPD, vous disposez d&apos;un droit d&apos;accès, de rectification, d&apos;effacement et
          d&apos;opposition sur vos données personnelles. Pour l&apos;exercer, contactez-nous à {contactEmail}.
        </p>
      </div>
    </main>
  );
}
