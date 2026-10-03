import { Space_Grotesk, Source_Sans_3 } from 'next/font/google';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { getClub } from '@/lib/api';
import './globals.css';

const display = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['500', '600', '700'],
});

const body = Source_Sans_3({
  subsets: ['latin'],
  variable: '--font-body',
  weight: ['400', '600', '700'],
});

export const metadata = {
  title: {
    default: 'Arambh Sports Arena',
    template: '%s · Arambh Sports Arena',
  },
  description:
    'Book courts, explore membership plans, and try Arambh Sports Arena — tennis, badminton, squash and more.',
};

async function loadClubSafe() {
  try {
    return await getClub();
  } catch {
    return {
      name: 'Arambh Sports Arena',
      location: { address: '', phone: '' },
    };
  }
}

export default async function RootLayout({ children }) {
  const club = await loadClubSafe();

  return (
    <html lang="en">
      <body className={`${display.variable} ${body.variable} antialiased`}>
        <div className="site-shell">
          <SiteHeader />
          <main className="site-main">{children}</main>
          <SiteFooter club={club} />
        </div>
      </body>
    </html>
  );
}
