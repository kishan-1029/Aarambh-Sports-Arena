/**
 * Multi-café demo catalog (BFS-style masters + per-café menus + item images).
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PosCategory } from '../modules/pos/posCategory.model.js';
import { PosProduct } from '../modules/pos/posProduct.model.js';
import { PosCafe } from '../modules/pos/posCafe.model.js';
import { PosCafeMenu } from '../modules/pos/posCafeMenu.model.js';
import { toPaise } from '../lib/money.js';
import { logger } from '../lib/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const POS_UPLOADS = path.resolve(__dirname, '../../uploads/pos');

function slugify(s) {
  return String(s)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const CAT_COLORS = {
  'Cold drinks': '#1a6b8a',
  'Hot drinks': '#8a4b1a',
  Snacks: '#6b5a1a',
  Meals: '#1a5c3a',
  'Sports drinks': '#3a1a6b',
};

function itemSvg(name, color) {
  const letter = (name || '?').charAt(0).toUpperCase();
  const safe = String(name)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;');
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${color}"/>
      <stop offset="100%" stop-color="#0f2419"/>
    </linearGradient>
  </defs>
  <rect width="240" height="240" rx="28" fill="url(#g)"/>
  <circle cx="120" cy="100" r="52" fill="rgba(255,255,255,0.12)"/>
  <text x="120" y="118" text-anchor="middle" fill="#ffffff" font-size="56" font-family="Arial,sans-serif" font-weight="700">${letter}</text>
  <text x="120" y="190" text-anchor="middle" fill="rgba(255,255,255,0.85)" font-size="16" font-family="Arial,sans-serif">${safe.slice(0, 18)}</text>
</svg>`;
}

async function ensureItemImage(sku, name, catName) {
  await fs.mkdir(POS_UPLOADS, { recursive: true });
  const filename = `${sku}.svg`;
  const abs = path.join(POS_UPLOADS, filename);
  const color = CAT_COLORS[catName] || '#1a5c3a';
  await fs.writeFile(abs, itemSvg(name, color), 'utf8');
  return `/uploads/pos/${filename}`;
}

const CATS = [
  { name: 'Cold drinks', station: 'bar', sequence: 1 },
  { name: 'Hot drinks', station: 'bar', sequence: 2 },
  { name: 'Snacks', station: 'kitchen', sequence: 3 },
  { name: 'Meals', station: 'kitchen', sequence: 4 },
  { name: 'Sports drinks', station: 'counter', sequence: 5 },
];

const PRODUCTS = [
  { cat: 'Cold drinks', name: 'Coke', rupees: 40, description: 'Chilled cola 300ml' },
  { cat: 'Cold drinks', name: 'Sprite', rupees: 40, description: 'Lemon-lime soda' },
  { cat: 'Cold drinks', name: 'Water 1L', rupees: 20, description: 'Packaged drinking water' },
  { cat: 'Hot drinks', name: 'Masala chai', rupees: 25, description: 'Spiced milk tea' },
  { cat: 'Hot drinks', name: 'Coffee', rupees: 45, description: 'Filter coffee' },
  { cat: 'Snacks', name: 'Veg sandwich', rupees: 90, description: 'Grilled veggie sandwich' },
  { cat: 'Snacks', name: 'Samosa (2pc)', rupees: 40, description: 'Crispy potato samosas' },
  { cat: 'Meals', name: 'Club thali', rupees: 180, description: 'Daily club meal plate' },
  { cat: 'Sports drinks', name: 'Gatorade', rupees: 80, description: 'Electrolyte sports drink' },
  { cat: 'Sports drinks', name: 'Electrolyte', rupees: 60, description: 'ORS-style drink' },
];

const CAFES = [
  {
    name: 'Main Café',
    code: 'CAFE-MAIN',
    description: 'Courtside café — snacks & drinks',
    sequence: 1,
    menu: [
      'Coke',
      'Sprite',
      'Water 1L',
      'Masala chai',
      'Coffee',
      'Veg sandwich',
      'Samosa (2pc)',
      'Gatorade',
    ],
  },
  {
    name: 'Poolside Bar',
    code: 'BAR-POOL',
    description: 'Bar counter — drinks & light bites',
    sequence: 2,
    menu: ['Coke', 'Sprite', 'Water 1L', 'Coffee', 'Club thali', 'Gatorade', 'Electrolyte'],
    prices: { Coffee: 50, 'Club thali': 200 },
  },
];

export async function seedPosCatalog() {
  const catByName = {};
  for (const c of CATS) {
    const slug = slugify(c.name);
    const doc = await PosCategory.findOneAndUpdate(
      { slug },
      { ...c, slug, isActive: true, isDemo: true },
      { upsert: true, new: true },
    );
    catByName[c.name] = doc;
  }

  const productByName = {};
  for (const p of PRODUCTS) {
    const cat = catByName[p.cat];
    if (!cat) continue;
    const sku = slugify(p.name);
    const imageUrl = await ensureItemImage(sku, p.name, p.cat);
    const doc = await PosProduct.findOneAndUpdate(
      { sku },
      {
        name: p.name,
        sku,
        categoryId: cat._id,
        pricePaise: toPaise(p.rupees),
        imageUrl,
        description: p.description || '',
        station: cat.station,
        isActive: true,
        isDemo: true,
      },
      { upsert: true, new: true },
    );
    productByName[p.name] = doc;
  }

  for (const cafeDef of CAFES) {
    const cafe = await PosCafe.findOneAndUpdate(
      { code: cafeDef.code },
      {
        name: cafeDef.name,
        code: cafeDef.code,
        description: cafeDef.description || '',
        isAcceptingOrders: true,
        isActive: true,
        sequence: cafeDef.sequence,
        isDemo: true,
      },
      { upsert: true, new: true },
    );

    let order = 0;
    for (const itemName of cafeDef.menu) {
      const product = productByName[itemName];
      if (!product) continue;
      const overrideRupees = cafeDef.prices?.[itemName];
      await PosCafeMenu.findOneAndUpdate(
        { cafeId: cafe._id, productId: product._id },
        {
          cafeId: cafe._id,
          productId: product._id,
          onMenu: true,
          isSoldOut: false,
          customPricePaise: overrideRupees != null ? toPaise(overrideRupees) : null,
          displayOrder: order++,
          isDemo: true,
        },
        { upsert: true, new: true },
      );
    }
  }

  logger.info(
    {
      categories: CATS.length,
      products: PRODUCTS.length,
      cafes: CAFES.length,
    },
    'seeded multi-café POS catalog',
  );
}
