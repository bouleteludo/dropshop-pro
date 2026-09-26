import type { Metadata } from "next";
import { STORE } from "@/lib/store-config";
export const metadata: Metadata = { title: "Politique de confidentialité", robots: { index: false, follow: true } };
export default function PrivacyPage() {
  return <main className="container max-w-3xl py-12 sm:py-16 prose prose-invert">
    <h1>Politique de confidentialité</h1>
    <p>BOO SHOP traite les données nécessaires à la gestion des commandes, au paiement, à la livraison et au service client. Contact : {STORE.contactEmail}.</p>
    <h2>Données traitées</h2>
    <p>Selon le parcours d&apos;achat : identité, adresse de livraison, email, informations de commande et données techniques nécessaires au fonctionnement du site.</p>
    <h2>Paiement</h2>
    <p>Le paiement par carte est traité par Stripe. BOO SHOP ne doit pas stocker les données complètes de carte bancaire.</p>
    <h2>Sous-traitants</h2>
    <p>Le fonctionnement avec un fournisseur comme CJ Dropshipping peut nécessiter la transmission des informations indispensables à l&apos;exécution et à la livraison de la commande. Les sous-traitants réellement utilisés et leurs finalités doivent être listés précisément avant mise en ligne.</p>
    <h2>Cookies et mesure d&apos;audience</h2>
    <p>Tout outil d&apos;analyse ou de publicité ajouté au site doit être documenté ici et configuré conformément aux règles applicables, notamment lorsqu&apos;un consentement est requis.</p>
    <h2>Droits</h2>
    <p>Les demandes relatives aux données personnelles peuvent être adressées à {STORE.contactEmail}. Les modalités précises d&apos;exercice des droits et les durées de conservation doivent être complétées avant mise en ligne.</p>
  </main>;
}
