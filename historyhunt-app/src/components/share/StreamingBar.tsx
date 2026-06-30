'use client'

import IconButton from '@/components/ui/IconButton'

type StreamingBarProps = {
  spotifyUrl?: string
  appleMusicUrl?: string
  youtubeUrl?: string
  title?: string
}

export default function StreamingBar({
  spotifyUrl,
  appleMusicUrl,
  youtubeUrl,
  title = 'Listen',
}: StreamingBarProps) {
  if (!spotifyUrl && !appleMusicUrl && !youtubeUrl) return null

  return (
    <section className="mt-8 border-t border-slate-200 pt-6 text-center">
      <h2 className="text-xl font-black text-blue-900">{title}</h2>
      <p className="mt-2 text-slate-700">Keep exploring the music behind the hunt.</p>

      <div className="mx-auto mt-5 grid max-w-xs grid-cols-3 gap-2">
        {spotifyUrl && (
          <IconButton
            icon="/icons/streaming/spotify.svg"
            label="Spotify"
            href={spotifyUrl}
            ariaLabel="Listen on Spotify"
          />
        )}

        {appleMusicUrl && (
          <IconButton
            icon="/icons/streaming/apple-music.svg"
            label="Apple"
            href={appleMusicUrl}
            ariaLabel="Listen on Apple Music"
          />
        )}

        {youtubeUrl && (
          <IconButton
            icon="/icons/streaming/youtube.svg"
            label="YouTube"
            href={youtubeUrl}
            ariaLabel="Listen on YouTube"
          />
        )}
      </div>
    </section>
  )
}
