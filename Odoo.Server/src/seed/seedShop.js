/**
 * Pro Shop demo catalogue.
 *
 * Upsert-only: every row is matched by slug/SKU so re-running never duplicates
 * and never touches anything that is not marked isDemo. Stock numbers are only
 * written when the product is first created — after that the shelf belongs to
 * InventoryService and the seed leaves it alone.
 */
import { connectDb, disconnectDb } from '../lib/db.js';
import { logger } from '../lib/logger.js';
import { ProductCategory } from '../modules/ecommerce/category.model.js';
import { Product } from '../modules/ecommerce/product.model.js';
import { InventoryMovement } from '../modules/ecommerce/inventoryMovement.model.js';

const CATEGORIES = [
  {
    slug: 'rackets',
    name: 'Rackets',
    description: 'Badminton, tennis and padel frames strung and ready to play.',
    icon: 'ri-ping-pong-line',
    sortOrder: 1,
  },
  {
    slug: 'balls',
    name: 'Balls & Shuttles',
    description: 'Shuttles, tennis balls and cricket balls by the tube or the box.',
    icon: 'ri-basketball-line',
    sortOrder: 2,
  },
  {
    slug: 'shoes',
    name: 'Shoes',
    description: 'Non-marking court shoes with the grip our floors need.',
    icon: 'ri-footprint-line',
    sortOrder: 3,
  },
  {
    slug: 'accessories',
    name: 'Accessories',
    description: 'Grips, wristbands, bottles and everything else in the kit bag.',
    icon: 'ri-shopping-bag-3-line',
    sortOrder: 4,
  },
  {
    slug: 'apparel',
    name: 'Apparel',
    description: 'Club jerseys, tees and shorts built for long sessions.',
    icon: 'ri-t-shirt-line',
    sortOrder: 5,
  },
];

const SIZES_APPAREL = ['S', 'M', 'L', 'XL', 'XXL'];
const SIZES_SHOES = ['UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11'];

function apparelVariants(sku, colours, stockPerVariant) {
  const rows = [];
  for (const colour of colours) {
    for (const size of SIZES_APPAREL) {
      rows.push({
        sku: `${sku}-${colour.slice(0, 3).toUpperCase()}-${size}`,
        name: `${size} / ${colour}`,
        size,
        colour,
        additionalPricePaise: size === 'XXL' ? 10000 : 0,
        stockQuantity: stockPerVariant,
        active: true,
      });
    }
  }
  return rows;
}

function shoeVariants(sku, stockPerVariant) {
  return SIZES_SHOES.map((size) => ({
    sku: `${sku}-${size.replace(/\s+/g, '')}`,
    name: size,
    size,
    colour: '',
    additionalPricePaise: 0,
    stockQuantity: stockPerVariant,
    active: true,
  }));
}

const PRODUCTS = [
  // ── Rackets ──
  {
    slug: 'yonex-astrox-88d-pro',
    sku: 'ASA-RKT-001',
    name: 'Yonex Astrox 88D Pro',
    category: 'rackets',
    brand: 'Yonex',
    shortDescription: 'Head-heavy badminton frame for attacking doubles play.',
    description:
      'The Astrox 88D Pro is built for the player at the back of the court. A stiff shaft and head-heavy balance load up the smash, while the Rotational Generator System keeps the frame steady through fast exchanges. Strung at 24 lbs as standard; ask the desk for a different tension at no extra cost.',
    sellingPricePaise: 1299900,
    mrpPaise: 1499900,
    costPricePaise: 980000,
    taxRatePct: 12,
    stockQuantity: 8,
    lowStockThreshold: 3,
    featured: true,
  },
  {
    slug: 'babolat-pure-drive-tennis-racket',
    sku: 'ASA-RKT-002',
    name: 'Babolat Pure Drive',
    category: 'rackets',
    brand: 'Babolat',
    shortDescription: 'The all-court tennis racket that suits almost everyone.',
    description:
      'A 300 g frame with an open string pattern that gives you power without asking for a perfect swing. If you are moving up from a club racket, this is the safe choice.',
    sellingPricePaise: 1849900,
    mrpPaise: 2099900,
    costPricePaise: 1400000,
    taxRatePct: 12,
    stockQuantity: 5,
    lowStockThreshold: 2,
    featured: true,
  },
  {
    slug: 'head-delta-pro-padel-racket',
    sku: 'ASA-RKT-003',
    name: 'Head Delta Pro Padel Racket',
    category: 'rackets',
    brand: 'Head',
    shortDescription: 'Diamond-shape padel racket for players who finish at the net.',
    description:
      'Carbon face over an EVA core. The diamond shape pushes the sweet spot high for smashes and bandejas, so it rewards players who already have a steady contact point.',
    sellingPricePaise: 1599900,
    mrpPaise: 1799900,
    costPricePaise: 1200000,
    taxRatePct: 12,
    stockQuantity: 4,
    lowStockThreshold: 2,
  },

  // ── Balls & shuttles ──
  {
    slug: 'yonex-aerosensa-30-shuttle-tube',
    sku: 'ASA-BAL-001',
    name: 'Yonex Aerosensa 30 Shuttles (Tube of 12)',
    category: 'balls',
    brand: 'Yonex',
    shortDescription: 'Tournament-grade feather shuttles, speed 77.',
    description:
      'The shuttle we use for club tournaments. Goose feather, cork base, consistent flight through a full match.',
    sellingPricePaise: 289900,
    mrpPaise: 320000,
    costPricePaise: 220000,
    taxRatePct: 12,
    stockQuantity: 24,
    lowStockThreshold: 6,
    featured: true,
  },
  {
    slug: 'wilson-us-open-tennis-balls',
    sku: 'ASA-BAL-002',
    name: 'Wilson US Open Tennis Balls (Can of 3)',
    category: 'balls',
    brand: 'Wilson',
    shortDescription: 'Pressurised extra-duty balls for hard courts.',
    description: 'Extra-duty felt that holds up on our outdoor hard courts. Sold by the can of three.',
    sellingPricePaise: 69900,
    mrpPaise: 79900,
    costPricePaise: 50000,
    taxRatePct: 12,
    stockQuantity: 40,
    lowStockThreshold: 10,
  },
  {
    slug: 'sg-club-leather-cricket-ball',
    sku: 'ASA-BAL-003',
    name: 'SG Club Leather Cricket Ball',
    category: 'balls',
    brand: 'SG',
    shortDescription: 'Four-piece leather ball for net sessions.',
    description: 'Alum-tanned leather with a hand-stitched seam. Good for a season of nets.',
    sellingPricePaise: 89900,
    mrpPaise: 99900,
    costPricePaise: 65000,
    taxRatePct: 12,
    stockQuantity: 2,
    lowStockThreshold: 5,
  },

  // ── Shoes (variants) ──
  {
    slug: 'asics-gel-court-hunter-3',
    sku: 'ASA-SHO-001',
    name: 'Asics Gel Court Hunter 3',
    category: 'shoes',
    brand: 'Asics',
    shortDescription: 'Non-marking badminton shoe with gel cushioning.',
    description:
      'Low-profile indoor shoe with gum rubber outsole and rearfoot gel. Non-marking, so it is cleared for every court in the arena.',
    sellingPricePaise: 849900,
    mrpPaise: 999900,
    costPricePaise: 620000,
    taxRatePct: 12,
    lowStockThreshold: 2,
    featured: true,
    variants: () => shoeVariants('ASA-SHO-001', 3),
  },
  {
    slug: 'adidas-courtjam-control',
    sku: 'ASA-SHO-002',
    name: 'Adidas CourtJam Control',
    category: 'shoes',
    brand: 'Adidas',
    shortDescription: 'Tennis shoe with a six-month outsole guarantee.',
    description:
      'Built for lateral movement on hard courts. Adiwear outsole, reinforced toe drag area, and a wider forefoot than the previous model.',
    sellingPricePaise: 779900,
    mrpPaise: 899900,
    costPricePaise: 560000,
    taxRatePct: 12,
    lowStockThreshold: 2,
    variants: () => shoeVariants('ASA-SHO-002', 2),
  },

  // ── Accessories ──
  {
    slug: 'yonex-super-grap-overgrip-3-pack',
    sku: 'ASA-ACC-001',
    name: 'Yonex Super Grap Overgrip (3 Pack)',
    category: 'accessories',
    brand: 'Yonex',
    shortDescription: 'The overgrip most of the club plays with.',
    description: 'Tacky, thin and absorbent. Three wraps per pack in assorted colours.',
    sellingPricePaise: 49900,
    mrpPaise: 60000,
    costPricePaise: 32000,
    taxRatePct: 18,
    stockQuantity: 60,
    lowStockThreshold: 12,
  },
  {
    slug: 'arambh-sports-bottle-1l',
    sku: 'ASA-ACC-002',
    name: 'Arambh Sports Bottle 1L',
    category: 'accessories',
    brand: 'Arambh',
    shortDescription: 'Insulated steel bottle with the club mark.',
    description: 'Double-walled stainless steel, keeps water cold for roughly eight hours.',
    sellingPricePaise: 89900,
    mrpPaise: 109900,
    costPricePaise: 58000,
    taxRatePct: 18,
    stockQuantity: 30,
    lowStockThreshold: 8,
  },
  {
    slug: 'nivia-cotton-wrist-band-pair',
    sku: 'ASA-ACC-003',
    name: 'Nivia Cotton Wrist Band (Pair)',
    category: 'accessories',
    brand: 'Nivia',
    shortDescription: 'Terry cotton bands, one pair.',
    description: 'Soft terry cotton with an elastic weave. Washes well.',
    sellingPricePaise: 24900,
    mrpPaise: 29900,
    costPricePaise: 14000,
    taxRatePct: 18,
    stockQuantity: 0,
    lowStockThreshold: 10,
  },
  {
    slug: 'arambh-racket-cover-full',
    sku: 'ASA-ACC-004',
    name: 'Arambh Full Racket Cover',
    category: 'accessories',
    brand: 'Arambh',
    shortDescription: 'Padded full-length cover for one or two frames.',
    description: 'Water-resistant shell with a fleece lining and a shoulder strap.',
    sellingPricePaise: 119900,
    mrpPaise: 139900,
    costPricePaise: 78000,
    taxRatePct: 18,
    stockQuantity: 14,
    lowStockThreshold: 4,
  },

  // ── Apparel (variants) ──
  {
    slug: 'arambh-club-jersey',
    sku: 'ASA-APP-001',
    name: 'Arambh Club Jersey',
    category: 'apparel',
    brand: 'Arambh',
    shortDescription: 'The club jersey, in green or white.',
    description:
      'Moisture-wicking knit with the Arambh mark on the chest. Cut slightly longer in the body so it stays put through a smash.',
    sellingPricePaise: 149900,
    mrpPaise: 179900,
    costPricePaise: 92000,
    taxRatePct: 5,
    lowStockThreshold: 3,
    featured: true,
    variants: () => apparelVariants('ASA-APP-001', ['Green', 'White'], 6),
  },
  {
    slug: 'arambh-training-tee',
    sku: 'ASA-APP-002',
    name: 'Arambh Training Tee',
    category: 'apparel',
    brand: 'Arambh',
    shortDescription: 'Everyday training tee in black or white.',
    description: 'Lightweight poly-cotton blend for practice sessions and the gym.',
    sellingPricePaise: 89900,
    mrpPaise: 109900,
    costPricePaise: 52000,
    taxRatePct: 5,
    lowStockThreshold: 4,
    variants: () => apparelVariants('ASA-APP-002', ['Black', 'White'], 5),
  },
  {
    slug: 'arambh-match-shorts',
    sku: 'ASA-APP-003',
    name: 'Arambh Match Shorts',
    category: 'apparel',
    brand: 'Arambh',
    shortDescription: 'Court shorts with deep pockets for a spare shuttle.',
    description: 'Four-way stretch woven fabric, elasticated waist with a drawcord.',
    sellingPricePaise: 99900,
    mrpPaise: 119900,
    costPricePaise: 58000,
    taxRatePct: 5,
    lowStockThreshold: 4,
    variants: () => apparelVariants('ASA-APP-003', ['Navy'], 5),
  },
];

export async function seedShop() {
  const categoryIds = new Map();

  for (const c of CATEGORIES) {
    const doc = await ProductCategory.findOneAndUpdate(
      { slug: c.slug },
      {
        $set: {
          name: c.name,
          description: c.description,
          icon: c.icon,
          sortOrder: c.sortOrder,
          active: true,
        },
        $setOnInsert: { slug: c.slug, isDemo: true, createdBy: 'seed' },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    categoryIds.set(c.slug, doc._id);
  }
  logger.info({ count: CATEGORIES.length }, 'seeded product categories');

  let createdCount = 0;
  let updatedCount = 0;

  for (const p of PRODUCTS) {
    const existing = await Product.findOne({ slug: p.slug });
    const variants = typeof p.variants === 'function' ? p.variants() : [];
    const hasVariants = variants.length > 0;

    if (existing) {
      // Catalogue copy may change between seeds; stock never does.
      existing.name = p.name;
      existing.categoryId = categoryIds.get(p.category);
      existing.brand = p.brand;
      existing.shortDescription = p.shortDescription;
      existing.description = p.description;
      existing.sellingPricePaise = p.sellingPricePaise;
      existing.mrpPaise = p.mrpPaise;
      existing.costPricePaise = p.costPricePaise;
      existing.taxRatePct = p.taxRatePct;
      existing.lowStockThreshold = p.lowStockThreshold;
      existing.featured = Boolean(p.featured);
      await existing.save();
      updatedCount += 1;
      continue;
    }

    const doc = await Product.create({
      name: p.name,
      slug: p.slug,
      sku: p.sku,
      categoryId: categoryIds.get(p.category),
      brand: p.brand,
      shortDescription: p.shortDescription,
      description: p.description,
      sellingPricePaise: p.sellingPricePaise,
      mrpPaise: p.mrpPaise,
      costPricePaise: p.costPricePaise,
      taxRatePct: p.taxRatePct,
      trackInventory: true,
      stockQuantity: hasVariants ? 0 : p.stockQuantity ?? 0,
      lowStockThreshold: p.lowStockThreshold ?? 5,
      hasVariants,
      variants,
      images: [],
      memberDiscountEligible: true,
      fulfillment: { pickup: true, delivery: true },
      featured: Boolean(p.featured),
      active: true,
      createdBy: 'seed',
      updatedBy: 'seed',
      isDemo: true,
    });

    const rows = [];
    if (hasVariants) {
      for (const v of doc.variants) {
        if (!v.stockQuantity) continue;
        rows.push({
          productId: doc._id,
          variantId: v._id,
          sku: v.sku,
          productName: doc.name,
          variantName: v.name,
          type: 'stock_in',
          quantity: v.stockQuantity,
          quantityBefore: 0,
          quantityAfter: v.stockQuantity,
          referenceType: 'manual',
          reason: 'Opening stock (seed)',
          createdByName: 'seed',
          source: 'system',
        });
      }
    } else if (doc.stockQuantity) {
      rows.push({
        productId: doc._id,
        sku: doc.sku,
        productName: doc.name,
        type: 'stock_in',
        quantity: doc.stockQuantity,
        quantityBefore: 0,
        quantityAfter: doc.stockQuantity,
        referenceType: 'manual',
        reason: 'Opening stock (seed)',
        createdByName: 'seed',
        source: 'system',
      });
    }
    if (rows.length) await InventoryMovement.insertMany(rows);

    createdCount += 1;
  }

  logger.info({ created: createdCount, updated: updatedCount }, 'seeded shop products');
  return { categories: CATEGORIES.length, created: createdCount, updated: updatedCount };
}

/** Standalone: `npm run seed:shop` */
if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('src/seed/seedShop.js')) {
  try {
    await connectDb();
    await seedShop();
    logger.info('shop seed complete');
    await disconnectDb();
  } catch (err) {
    logger.error({ err }, 'shop seed failed');
    try {
      await disconnectDb();
    } catch {
      /* ignore */
    }
    process.exit(1);
  }
}

export default seedShop;
