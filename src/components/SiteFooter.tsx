interface Props {
  href?: string
}

/**
 * 页面右下角的纯文字外链。
 * 只占一行 12.5px，不抢版面；hover 才上色。
 */
export function SiteFooter({ href = 'https://github.com/linsk27/dafeiyu-ledger' }: Props) {
  return (
    <footer className="siteFoot">
      <a
        className="siteFoot__link"
        href={href}
        target="_blank"
        rel="noreferrer noopener"
        title="在 GitHub 上给大肥鱼账本点个 star"
        aria-label="在 GitHub 上给大肥鱼账本点个 star"
      >
        点个 star~
        <span className="siteFoot__arrow" aria-hidden>
          ↗
        </span>
      </a>
    </footer>
  )
}
