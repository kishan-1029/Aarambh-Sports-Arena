/**
 * Seed demo blogs + SVG cover images under uploads/blogs/.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import BlogMaster from '../../models/BlogMaster.js';
import { logger } from '../lib/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.resolve(__dirname, '../../uploads/blogs');

function writeSvgCover(filename, title, accent = '#3eb474') {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  const filePath = path.join(uploadsDir, filename);
  if (!fs.existsSync(filePath)) {
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${accent}"/>
      <stop offset="100%" stop-color="#0c3d28"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#g)"/>
  <circle cx="980" cy="120" r="180" fill="rgba(255,255,255,0.08)"/>
  <circle cx="160" cy="520" r="220" fill="rgba(255,255,255,0.06)"/>
  <text x="80" y="300" fill="#ffffff" font-family="Segoe UI, Arial, sans-serif" font-size="54" font-weight="700">${title
    .replace(/&/g, '&amp;')
    .slice(0, 42)}</text>
  <text x="80" y="360" fill="rgba(255,255,255,0.85)" font-family="Segoe UI, Arial, sans-serif" font-size="28">Arambh Sports Arena</text>
</svg>`;
    fs.writeFileSync(filePath, svg, 'utf8');
  }
  return `uploads/blogs/${filename}`;
}

const POSTS = [
  {
    title: 'How to book a court at Arambh in 60 seconds',
    slug: 'book-a-court-in-60-seconds',
    excerpt: 'Pick a sport, choose a free slot, and you are on the board — no WhatsApp chase.',
    category: 'Guides',
    tags: ['booking', 'courts'],
    accent: '#3eb474',
    featured: true,
  },
  {
    title: 'Gold vs Silver membership — which fits your week?',
    slug: 'gold-vs-silver-membership',
    excerpt: 'A practical comparison of court access, discounts and guest passes.',
    category: 'Membership',
    tags: ['membership', 'plans'],
    accent: '#d4a017',
    featured: true,
  },
  {
    title: 'Padel nights are filling fast — here is why',
    slug: 'padel-nights-filling-fast',
    excerpt: 'Social play, floodlit courts and a growing Vadodara padel community.',
    category: 'Sports',
    tags: ['padel', 'community'],
    accent: '#2f6fed',
  },
  {
    title: 'Junior pathway: off-peak courts that build confidence',
    slug: 'junior-pathway-off-peak',
    excerpt: 'Under-18 players get structured access without peak-hour pressure.',
    category: 'Junior',
    tags: ['junior', 'coaching'],
    accent: '#2e7d32',
  },
  {
    title: 'What to bring for your first trial session',
    slug: 'first-trial-checklist',
    excerpt: 'Shoes, water, and a 5-minute arrival window — the rest we handle at front desk.',
    category: 'Trials',
    tags: ['trial', 'tips'],
    accent: '#e85d4c',
  },
  {
    title: 'Club calendar: maintenance windows & social Fridays',
    slug: 'club-calendar-maintenance-social',
    excerpt: 'How we keep courts fair — blocks, social sessions and advance booking rules.',
    category: 'Club news',
    tags: ['ops', 'social'],
    accent: '#7c5cbf',
  },
];

export async function seedBlogs() {
  const out = [];
  for (const p of POSTS) {
    const image = writeSvgCover(`${p.slug}.svg`, p.title, p.accent);
    const doc = await BlogMaster.findOneAndUpdate(
      { slug: p.slug },
      {
        title: p.title,
        slug: p.slug,
        excerpt: p.excerpt,
        content: `<p>${p.excerpt}</p><p>Visit Arambh Sports Arena front desk or the membership desk to learn more. All plans and court availability are managed live from the admin panel.</p>`,
        featuredImage: image,
        featuredImageAlt: p.title,
        category: p.category,
        tags: p.tags,
        author: 'Arambh Editorial',
        status: 'Published',
        publishDate: new Date(),
        readingTime: 3,
        viewsCount: 0,
        isFeatured: Boolean(p.featured),
        isTrending: Boolean(p.featured),
        allowComments: true,
        isActive: true,
        seo: {
          metaTitle: p.title,
          metaDescription: p.excerpt,
          ogImage: image,
        },
      },
      { upsert: true, new: true },
    );
    out.push(doc);
  }
  logger.info({ count: out.length }, 'seeded blogs with cover images');
  return out;
}

export default seedBlogs;
