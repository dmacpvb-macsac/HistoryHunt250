import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-100 p-6 text-center">
      <div className="max-w-xl mx-auto bg-white rounded-3xl shadow-xl p-6">

        <img
          src="/history-hunt-logo.png"
          alt="History Hunt"
          className="w-64 mx-auto mb-4"
        />

        <h1 className="text-3xl font-bold text-blue-900">
          Jacksonville History Hunt™
        </h1>

        <p className="text-gray-700 mt-2 mb-8">
          Play the Florida Challenge. Discover hidden stories. Unlock your score.
        </p>

        <div className="space-y-4">
          <a
            href="https://www.youtube.com/watch?v=drnBrAmbNHE"
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-red-600 text-white rounded-xl p-4 text-xl font-bold"
          >
            🎵 Listen To The Song
          </a>

          <Link
            href="/register"
            className="block bg-blue-900 text-white rounded-xl p-4 text-xl font-bold"
          >
            Start the Hunt →
          </Link>
        </div>

        <p className="mt-6 text-sm text-gray-500">
          10 Questions • Bonus Question Worth 2 Points
        </p>

        <p className="mt-4 text-xs text-gray-400">
          Powered by Duval Software
        </p>

      </div>
    </main>
  );
}
