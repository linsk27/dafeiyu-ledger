import type { SVGProps } from 'react'

export function WhaleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M3.2 12.4c0-3.2 2.9-5.6 6.6-5.6 3 0 5.4 1.4 6.2 3.4l2.6-.9c.5-.2 1 .2 1 .7v3.3c0 .5-.5.9-1 .7l-2.6-.9c-.8 2-3.2 3.4-6.2 3.4-3.7 0-6.6-2.4-6.6-5.6Z"
        fill="currentColor"
      />
      <circle cx="7.4" cy="11.4" r="1" fill="#fff" />
    </svg>
  )
}

export function BookIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M5 4.8h9.2A3.8 3.8 0 0 1 18 8.6v10.6H8.2A3.2 3.2 0 0 1 5 16V4.8Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M8.4 8.6h6M8.4 12h4.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

export function WalletIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <rect x="3.4" y="6.6" width="17.2" height="12.2" rx="3.4" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3.4 10.4h17.2" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="16.4" cy="14.5" r="1.3" fill="currentColor" />
      <path d="M6.6 6.6V5.9A1.9 1.9 0 0 1 8.6 4h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

export function SparkIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M12 3.4 13.7 9l5.6 1.7-5.6 1.7L12 18l-1.7-5.6L4.7 10.7 10.3 9 12 3.4Z"
        fill="currentColor"
      />
    </svg>
  )
}

export function ClockIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <circle cx="12" cy="12" r="8.2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 7.6V12l3 1.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}
