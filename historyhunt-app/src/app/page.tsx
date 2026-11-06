import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-100 p-6 text-center">
      <div className="mx-auto mb-6 max-w-3xl rounded-2xl bg-gradient-to-r from-blue-950 to-red-900 px-6 py-6 text-white shadow-xl">
        <p className="text-xs font-bold uppercase tracking-widest text-amber-300">November 6–12, 2026 · Jacksonville</p>
        <h2 className="mt-2 text-2xl font-black sm:text-3xl">Our Veterans Deserve More Than One Day.</h2>
        <p className="mt-3 text-slate-100">Explore our Veterans Week History Hunts and discover ways to support those who serve.</p>
        <Link href="/veterans-week-jax" className="mt-4 inline-block rounded-xl bg-white px-5 py-3 font-bold text-blue-950 hover:bg-amber-100">
          Explore Veterans Week →
        </Link>
      </div>
      <div className="max-w-xl mx-auto bg-white rounded-3xl shadow-xl p-6">
        <img
          src="/history-hunt-logo.png"
          alt="History Hunt"
          className="w-64 mx-auto mb-4"
        />

        <h1 className="text-3xl font-bold text-blue-900">
          Freedom Fest 250 History Hunt™
        </h1>

        <p className="text-gray-700 mt-2 mb-8">
          Listen to America 250 Proof™, then start the Jacksonville History Hunt.
        </p>

        <div className="space-y-4">
          <a
            href="https://www.youtube.com/watch?v=drnBrAmbNHE"
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-red-600 text-white rounded-xl p-4 text-xl font-bold"
          >
            🎵 Play Song
          </a>

          <Link
            href="/play/freedom-fest-jax"
            className="block bg-blue-900 text-white rounded-xl p-4 text-xl font-bold"
          >
            Start the Hunt →
          </Link>
        </div>

        <p className="mt-6 text-sm text-gray-500">
          10 Questions • Bonus Question Worth 2 Points
        </p>

        <p className="mt-4 text-xs text-gray-400">
          Presented by America 250 Proof™
        </p>
      </div>
    </main>
  );
}