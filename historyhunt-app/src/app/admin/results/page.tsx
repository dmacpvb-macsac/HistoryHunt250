"use client";

import Link from "next/link";
import "./results.css";

type ShareItem = {
  label: string;
  icon: string;
  action: () => void;
};

export default function ResultsPage() {
  const shareUrl =
    typeof window !== "undefined"
      ? window.location.href
      : "https://historyhunt.app/results";

  const shareText = "I completed a History Hunt challenge!";

  const copyShareText = async () => {
    try {
      await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
      alert("Share link copied!");
    } catch {
      alert("Unable to copy link. Please copy it from the address bar.");
    }
  };

  const shareItems: ShareItem[] = [
    {
      label: "Facebook",
      icon: "/fbicon.png",
      action: () =>
        window.open(
          `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
            shareUrl
          )}`,
          "_blank",
          "noopener,noreferrer"
        ),
    },
    {
      label: "X",
      icon: "/xicon.png",
      action: () =>
        window.open(
          `https://twitter.com/intent/tweet?text=${encodeURIComponent(
            shareText
          )}&url=${encodeURIComponent(shareUrl)}`,
          "_blank",
          "noopener,noreferrer"
        ),
    },
    {
      label: "Instagram",
      icon: "/igicon.png",
      action: copyShareText,
    },
    {
      label: "Text",
      icon: "/smsicon.png",
      action: () =>
        (window.location.href = `sms:?&body=${encodeURIComponent(
          `${shareText} ${shareUrl}`
        )}`),
    },
    {
      label: "Email",
      icon: "/emailicon.png",
      action: () =>
        (window.location.href = `mailto:?subject=${encodeURIComponent(
          "I completed a History Hunt"
        )}&body=${encodeURIComponent(`${shareText}\n\n${shareUrl}`)}`),
    },
    {
      label: "Copy",
      icon: "/copyicon.png",
      action: copyShareText,
    },
  ];

  return (
    <main className="results-page">
      <section className="results-hero" aria-labelledby="results-title">
        <div className="results-badge-ring" aria-hidden="true">
          <div className="results-badge">🏆</div>
        </div>

        <p className="results-eyebrow">Challenge Complete</p>
        <h1 id="results-title">You Finished the Hunt</h1>
        <p className="results-subtitle">
          Nice work. You completed this History Hunt challenge and unlocked your
          achievement.
        </p>
      </section>

      <section className="share-card" aria-labelledby="share-title">
        <h2 id="share-title">Share Your Achievement</h2>

        <div className="share-icon-row">
          {shareItems.map((item) => (
            <button
              key={item.label}
              className="share-icon-button"
              onClick={item.action}
              aria-label={item.label}
              type="button"
            >
              <img src={item.icon} alt="" className="share-icon-img" />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="results-actions" aria-label="Next steps">
        <Link href="/leaderboard" className="results-primary-link">
          View Leaderboard
        </Link>

        <Link href="/hunts" className="results-secondary-link">
          Find Another Hunt
        </Link>

        <Link href="/" className="results-text-link">
          Back Home
        </Link>
      </section>
    </main>
  );
}
