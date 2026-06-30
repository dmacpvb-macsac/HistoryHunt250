'use client'

type IconButtonProps = {
  icon: string
  label: string
  href?: string
  onClick?: () => void | Promise<void>
  disabled?: boolean
  target?: '_blank' | '_self'
  rel?: string
  ariaLabel?: string
}

export default function IconButton({
  icon,
  label,
  href,
  onClick,
  disabled = false,
  target = '_blank',
  rel = 'noopener noreferrer',
  ariaLabel,
}: IconButtonProps) {
  const className =
    'group flex flex-col items-center justify-start gap-2 rounded-2xl p-3 text-center ' +
    'transition hover:bg-blue-50 focus:outline-none focus:ring-4 focus:ring-blue-200 ' +
    'disabled:cursor-not-allowed disabled:opacity-50'

  const content = (
    <>
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 shadow-sm ring-1 ring-slate-200 group-hover:bg-white">
        <img src={icon} alt="" className="h-7 w-7" aria-hidden="true" />
      </span>
      <span className="text-xs font-bold text-slate-800">{label}</span>
    </>
  )

  if (href) {
    return (
      <a
        href={href}
        target={target}
        rel={rel}
        aria-label={ariaLabel || label}
        className={className}
      >
        {content}
      </a>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel || label}
      className={className}
    >
      {content}
    </button>
  )
}
