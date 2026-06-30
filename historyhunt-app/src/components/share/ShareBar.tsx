'use client'

import { useMemo, useState } from 'react'
import IconButton from '@/components/ui/IconButton'

type ShareBarProps = {
  shareUrl: string
  shareTitle?: string
  shareText?: string
  showCopy?: boolean
  showFacebook?: boolean
  showX?: boolean
  showLinkedIn?: boolean
}

export default function ShareBar({
  shareUrl,
  shareTitle = 'I completed a History Hunt™',
  shareText = 'I earned my History Hunt™ badge. Can you beat my score?',
  showCopy = true,
  showFacebook = true,
  showX = true,
  showLinkedIn = true,
}: ShareBarProps) {
  const [copied, setCopied] = useState(false)

  const urls = useMemo(() => {
    const encodedUrl = encodeURIComponent(shareUrl)
    const encodedText = encodeURIComponent(`${shareText} ${shareUrl}`)
    const encodedTitle = encodeURIComponent(shareTitle)

    return {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      x: `https://twitter.com/intent/tweet?text=${encodedText}`,
      linkedIn: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}&title=${encodedTitle}`,
    }
  }, [shareUrl, shareText, shareTitle])

  async function copyLink() {
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <section className="mt-8 border-t border-slate-200 pt-6 text-center">
      <h2 className="text-xl font-black text-blue-900">Challenge Others</h2>
      <p className="mt-2 text-slate-700">Share your badge and invite others to play.</p>

      <div className="mx-auto mt-5 grid max-w-md grid-cols-4 gap-2">
        {showCopy && (
          <IconButton
            icon={copied ? '/icons/actions/clipboard_document_check.svg' : '/icons/actions/clipboard_document.svg'}
            label={copied ? 'Copied' : 'Copy'}
            onClick={copyLink}
            ariaLabel="Copy share link"
          />
        )}

        {showFacebook && (
          <IconButton
            icon="/icons/social/facebook.svg"
            label="Facebook"
            href={urls.facebook}
            ariaLabel="Share on Facebook"
          />
        )}

        {showX && (
          <IconButton
            icon="/icons/social/x.svg"
            label="X"
            href={urls.x}
            ariaLabel="Share on X"
          />
        )}

        {showLinkedIn && (
          <IconButton
            icon="/icons/social/linkedin.svg"
            label="LinkedIn"
            href={urls.linkedIn}
            ariaLabel="Share on LinkedIn"
          />
        )}
      </div>
    </section>
  )
}
