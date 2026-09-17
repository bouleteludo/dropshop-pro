import Link from "next/link";

export default function NotFound() {
  return (
    <main className="container py-24 sm:py-32 text-center">
      <p className="text-xs tracking-[0.3em] uppercase text-ember-400 mb-4">Erreur 404</p>
      <h1 className="font-display text-4xl sm:text-5xl text-bone-50 mb-6">
        Cette page s&apos;est évaporée.
      </h1>
      <p className="text-bone-200/80 max-w-md mx-auto mb-10">
        La pièce que vous cherchez n&apos;existe plus — ou n&apos;a jamais existé.
      </p>
      <Link
        href="/"
        className="inline-flex items-center justify-center rounded-full bg-ember-500 hover:bg-ember-400 hover:shadow-ember text-ink-950 font-medium px-7 py-3.5 transition-all"
      >
        Retour à l&apos;accueil
      </Link>
    </main>
  );
}
