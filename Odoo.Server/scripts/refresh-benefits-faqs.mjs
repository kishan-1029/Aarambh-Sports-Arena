import 'dotenv/config';
import { connectDb } from '../src/lib/db.js';
import { seedCms } from '../src/seed/seedCms.js';
import { MembershipPlan } from '../src/modules/membership/plan.model.js';
import { benefitLinesForPlan, SEEDED_EXTRA_PERKS } from '../src/modules/membership/benefitLines.js';

await connectDb();
await seedCms();

const plans = await MembershipPlan.find({
  key: { $in: ['gold', 'silver', 'junior'] },
  archivedAt: null,
});

for (const p of plans) {
  const perks = benefitLinesForPlan(p.entitlements, SEEDED_EXTRA_PERKS[p.key] || []);
  p.entitlements = p.entitlements || {};
  p.entitlements.perks = perks;
  p.markModified('entitlements');
  await p.save();
  console.log(p.key, perks);
}

process.exit(0);
