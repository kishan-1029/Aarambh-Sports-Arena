'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const LINKS = [
  { href: '/sports', label: 'Sports' },
  { href: '/availability', label: 'Availability' },
  { href: '/membership', label: 'Membership' },
  { href: '/trial', label: 'Book a trial' },
  { href: '/contact', label: 'Contact' },
];

export default function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link href="/" className="brand" onClick={() => setOpen(false)}>
          <span className="brand-mark" aria-hidden />
          <span className="brand-text">
            <strong>Arambh</strong>
            <span>Sports Arena</span>
          </span>
        </Link>

        <button
          type="button"
          className="nav-toggle"
          aria-expanded={open}
          aria-label="Menu"
          onClick={() => setOpen((v) => !v)}
        >
          <span />
          <span />
        </button>

        <nav className={`site-nav${open ? ' is-open' : ''}`}>
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={pathname === l.href ? 'is-active' : undefined}
              onClick={() => setOpen(false)}
            >
              {l.label}
            </Link>
          ))}
          <Link href="/trial" className="btn btn-primary nav-cta" onClick={() => setOpen(false)}>
            Book a trial
          </Link>
        </nav>
      </div>
    </header>
  );
}
