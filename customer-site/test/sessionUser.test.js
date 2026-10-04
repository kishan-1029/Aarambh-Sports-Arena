import assert from 'node:assert/strict';
import { sessionUserAfterMembershipPurchase } from '../src/sessionUser.js';

const current = {
  id: 'acc1',
  name: 'Yash Member',
  email: 'yash.member@test.arambh',
  premium: false,
  tierKey: 'none',
};

const kept = sessionUserAfterMembershipPurchase(current, {
  membership: { status: 'active' },
  invoice: { status: 'paid' },
});

assert.ok(kept, 'purchase without a profile must not sign the member out');
assert.equal(kept.id, current.id);
assert.equal(kept.name, current.name);
assert.equal(kept.email, current.email);

const updated = sessionUserAfterMembershipPurchase(current, {
  membership: { status: 'active' },
  invoice: { status: 'paid' },
  profile: {
    id: 'acc1',
    name: 'Yash Member',
    email: 'yash.member@test.arambh',
    premium: true,
    tierKey: 'gold',
  },
});

assert.equal(updated.id, current.id);
assert.equal(updated.name, current.name);
assert.equal(updated.premium, true);
assert.equal(updated.tierKey, 'gold');

const fromTier = sessionUserAfterMembershipPurchase(current, {
  membership: { status: 'active' },
  profile: {
    id: 'acc1',
    name: 'Yash Member',
    email: 'yash.member@test.arambh',
    tierKey: 'gold',
    status: 'active',
  },
});
assert.equal(fromTier.premium, true);
assert.equal(fromTier.name, 'Yash Member');

console.log('session stays signed in after membership purchase');
