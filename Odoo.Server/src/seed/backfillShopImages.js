/**
 * Fills in missing Pro Shop artwork.
 *
 * Only blanks are written: a category that already has an image and a product
 * that already has an images[] entry are left exactly as they are, so artwork
 * uploaded through the admin is never overwritten.
 *
 * Source artwork lives in src/seed/assets/shop. Each file is pushed through the
 * same compressToWebP() the admin upload route uses, so what lands in
 * uploads/products is byte-for-byte the kind of file the upload pipeline makes.
 * Names are deterministic (shop-<asset>.webp) rather than UUIDs because these
 * are repo assets, not user uploads — that keeps the script idempotent.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { connectDb, disconnectDb } from '../lib/db.js';
import { logger } from '../lib/logger.js';
import { compressToWebP, ensureUploadDir } from '../../middlewares/secureUpload.js';
import { ProductCategory } from '../modules/ecommerce/category.model.js';
import { Product } from '../modules/ecommerce/product.model.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SOURCE_DIR = path.join(HERE, 'assets', 'shop');
const DESTINATION = path.join('uploads', 'products');

/** slug -> source asset basename (without extension). */
const CATEGORY_ART = {
  rackets: 'cat-rackets',
  balls: 'cat-balls',
  shoes: 'cat-shoes',
  accessories: 'cat-accessories',
  apparel: 'cat-apparel',
};

const PRODUCT_ART = {
  'yonex-astrox-88d-pro': 'prod-badminton-racket-astrox',
  'babolat-pure-drive-tennis-racket': 'prod-tennis-racket',
  'head-delta-pro-padel-racket': 'prod-padel-racket',
  'yonex-aerosensa-30-shuttle-tube': 'prod-shuttlecock-tube',
  'wilson-us-open-tennis-balls': 'prod-tennis-balls',
  'sg-club-leather-cricket-ball': 'prod-cricket-ball',
  'asics-gel-court-hunter-3': 'prod-court-shoe-badminton',
  'adidas-courtjam-control': 'prod-court-shoe-tennis',
  'arambh-club-jersey': 'prod-club-jersey',
  'arambh-match-shorts': 'prod-match-shorts',
  'arambh-training-tee': 'prod-training-tee',
  'arambh-racket-cover-full': 'prod-racket-cover',
  'nivia-cotton-wrist-band-pair': 'prod-wristbands',
  'arambh-sports-bottle-1l': 'prod-sports-bottle',
  'yonex-super-grap-overgrip-3-pack': 'prod-overgrip-pack',
};

/**
 * Converts one source asset into uploads/products and returns the stored path.
 * Conversion is skipped when the webp is already on disk.
 */
async function storeArtwork(asset) {
  const filename = `shop-${asset}.webp`;
  const diskPath = path.join(DESTINATION, filename);
  const stored = `${DESTINATION.split(path.sep).join('/')}/${filename}`;

  try {
    await fs.access(diskPath);
    return stored;
  } catch {
    // Not converted yet.
  }

  const source = path.join(SOURCE_DIR, `${asset}.jpg`);
  const buffer = await fs.readFile(source);
  const webp = await compressToWebP(buffer, { quality: 82, maxWidth: 1200, maxHeight: 1200 });

  await ensureUploadDir(DESTINATION);
  await fs.writeFile(diskPath, webp);
  logger.info({ asset, bytes: webp.length }, 'shop image converted');
  return stored;
}

async function run() {
  await connectDb();

  const summary = { categories: [], products: [], skipped: [] };

  for (const [slug, asset] of Object.entries(CATEGORY_ART)) {
    const category = await ProductCategory.findOne({ slug });
    if (!category) continue;
    if (category.image) {
      summary.skipped.push(`category:${slug}`);
      continue;
    }
    category.image = await storeArtwork(asset);
    await category.save();
    summary.categories.push(slug);
  }

  for (const [slug, asset] of Object.entries(PRODUCT_ART)) {
    const product = await Product.findOne({ slug });
    if (!product) continue;
    if (product.images?.length) {
      summary.skipped.push(`product:${slug}`);
      continue;
    }
    product.images = [{ url: await storeArtwork(asset), altText: product.name, sortOrder: 0 }];
    await product.save();
    summary.products.push(slug);
  }

  logger.info(summary, 'shop image backfill complete');
  await disconnectDb();
}

run().catch(async (err) => {
  logger.error({ err: err.message }, 'shop image backfill failed');
  await disconnectDb().catch(() => {});
  process.exit(1);
});
