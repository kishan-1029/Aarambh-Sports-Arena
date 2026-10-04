/**
 * Seed / migrate CMS: BlogCategory, BlogTag, FaqCategory, Faq, Guide.
 * Also repairs legacy field names from older CMS data.
 */
import BlogCategory from '../../models/BlogCategory.js';
import BlogTag from '../../models/BlogTag.js';
import FaqCategory from '../../models/FaqCategory.js';
import Faq from '../../models/Faq.js';
import Guide from '../../models/Guide.js';
import { logger } from '../lib/logger.js';

function slugify(value) {
  return String(value || 'item')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'item';
}

async function migrateLegacyBlogCategories() {
  const cursor = BlogCategory.collection.find({
    $or: [
      { categoryName: { $exists: false } },
      { categoryName: null },
      { categoryName: '' },
    ],
  });
  let n = 0;
  for await (const doc of cursor) {
    const name = doc.categoryName || doc.category || doc.Title || `Category ${String(doc._id).slice(-4)}`;
    const base = slugify(name);
    let slug = doc.slug || base;
    const clash = await BlogCategory.collection.findOne({
      slug,
      _id: { $ne: doc._id },
    });
    if (clash) slug = `${base}-${String(doc._id).slice(-6)}`;
    await BlogCategory.collection.updateOne(
      { _id: doc._id },
      {
        $set: {
          categoryName: name,
          slug,
          description: doc.description || '',
          sequence: doc.sequence ?? 0,
          isActive: doc.isActive ?? doc.IsActive ?? true,
        },
      },
    );
    n += 1;
  }
  return n;
}

async function migrateLegacyBlogTags() {
  const cursor = BlogTag.collection.find({
    $or: [
      { tagName: { $exists: false } },
      { tagName: null },
      { tagName: '' },
    ],
  });
  let n = 0;
  for await (const doc of cursor) {
    const name = doc.tagName || doc.Title || doc.title || `Tag ${String(doc._id).slice(-4)}`;
    const base = slugify(name);
    let slug = doc.slug || base;
    const clash = await BlogTag.collection.findOne({
      slug,
      _id: { $ne: doc._id },
    });
    if (clash) slug = `${base}-${String(doc._id).slice(-6)}`;
    await BlogTag.collection.updateOne(
      { _id: doc._id },
      {
        $set: {
          tagName: name,
          slug,
          isActive: doc.isActive ?? doc.IsActive ?? true,
        },
      },
    );
    n += 1;
  }
  return n;
}

const CATEGORIES = [
  { categoryName: 'Guides', slug: 'guides', sequence: 1, description: 'How-to and booking help' },
  { categoryName: 'Membership', slug: 'membership', sequence: 2, description: 'Plans and renewals' },
  { categoryName: 'Sports', slug: 'sports', sequence: 3, description: 'Court sports & community' },
  { categoryName: 'Junior', slug: 'junior', sequence: 4, description: 'Under-18 pathway' },
  { categoryName: 'Trials', slug: 'trials', sequence: 5, description: 'First visit tips' },
  { categoryName: 'Club news', slug: 'club-news', sequence: 6, description: 'Ops and social calendar' },
];

const TAGS = [
  'booking',
  'courts',
  'membership',
  'plans',
  'padel',
  'community',
  'junior',
  'coaching',
  'trial',
  'tips',
  'ops',
  'social',
];

const FAQ_CATEGORIES = [
  { categoryName: 'Booking', sequence: 1, description: 'Courts and slots' },
  { categoryName: 'Membership', sequence: 2, description: 'Plans and billing' },
  { categoryName: 'Café & bar', sequence: 3, description: 'Food and drinks at the club' },
  { categoryName: 'Visiting', sequence: 4, description: 'Trials, guests, arrival' },
];

const FAQS = [
  {
    categoryName: 'Booking',
    question: 'How do I book a court?',
    answer: 'Use the website Availability page or ask Front Desk. Pick sport, date and an open slot, then confirm.',
    sequence: 1,
  },
  {
    categoryName: 'Booking',
    question: 'Can I cancel a booking?',
    answer: 'Yes — cancel from Front Desk or Admin Bookings before the cut-off. Late cancels may forfeit credits per club policy.',
    sequence: 2,
  },
  {
    categoryName: 'Membership',
    question: 'What is the difference between Gold and Silver?',
    answer: 'Gold includes more peak-hour access and guest passes. Silver is best for off-peak and weekend social play.',
    sequence: 1,
  },
  {
    categoryName: 'Membership',
    question: 'How do renewals work?',
    answer: 'We notify you before expiry. Renew in Admin → Members or at Front Desk; scheduled renewals start on the next cycle date.',
    sequence: 2,
  },
  {
    categoryName: 'Café & bar',
    question: 'Do members get café discounts?',
    answer: 'Eligible memberships receive the bar/café discount automatically when the cashier attaches your member profile on POS.',
    sequence: 1,
  },
  {
    categoryName: 'Visiting',
    question: 'What should I bring for a trial?',
    answer: 'Court shoes, water, and arrive 5 minutes early. Front Desk will check you in and assign a court.',
    sequence: 1,
  },
];

const GUIDES = [
  {
    title: 'Book a court (staff walkthrough)',
    type: 'YouTube',
    youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    description: 'Front desk: search member, pick court, confirm booking.',
    sequence: 1,
  },
  {
    title: 'Open a café POS sale',
    type: 'YouTube',
    youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    description: 'Cafeteria staff: select items, attach member, take payment.',
    sequence: 2,
  },
  {
    title: 'Publish a club blog post',
    type: 'Document',
    filePath: '',
    description: 'CMS → Blog Master: draft, SEO, publish to the public site.',
    sequence: 3,
  },
];

export async function seedCms() {
  const migratedCats = await migrateLegacyBlogCategories();
  const migratedTags = await migrateLegacyBlogTags();
  logger.info({ migratedCats, migratedTags }, 'cms legacy field migration');

  for (const c of CATEGORIES) {
    await BlogCategory.findOneAndUpdate(
      { slug: c.slug },
      { ...c, isActive: true },
      { upsert: true, new: true },
    );
  }

  for (const tag of TAGS) {
    const slug = slugify(tag);
    await BlogTag.findOneAndUpdate(
      { slug },
      { tagName: tag, slug, isActive: true },
      { upsert: true, new: true },
    );
  }

  const faqCatByName = {};
  for (const c of FAQ_CATEGORIES) {
    const doc = await FaqCategory.findOneAndUpdate(
      { categoryName: c.categoryName },
      { ...c, isActive: true },
      { upsert: true, new: true },
    );
    faqCatByName[c.categoryName] = doc;
  }

  for (const f of FAQS) {
    const cat = faqCatByName[f.categoryName];
    if (!cat) continue;
    await Faq.findOneAndUpdate(
      { question: f.question },
      {
        category: cat._id,
        question: f.question,
        answer: f.answer,
        sequence: f.sequence,
        isActive: true,
      },
      { upsert: true, new: true },
    );
  }

  for (const g of GUIDES) {
    await Guide.findOneAndUpdate(
      { title: g.title },
      { ...g, isActive: true },
      { upsert: true, new: true },
    );
  }

  logger.info(
    {
      categories: CATEGORIES.length,
      tags: TAGS.length,
      faqCategories: FAQ_CATEGORIES.length,
      faqs: FAQS.length,
      guides: GUIDES.length,
    },
    'seeded CMS content',
  );
}
