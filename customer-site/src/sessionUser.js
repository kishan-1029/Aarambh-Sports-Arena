export function isPortalUser(user) {
  return Boolean(user && typeof user === 'object' && (user.id || user.name || user.email));
}

export function withMembershipFlag(user) {
  if (!isPortalUser(user)) return null;
  const tier = user.tierKey;
  const premium = Boolean(
    user.premium ||
      (tier && tier !== 'none' && user.status !== 'expired' && user.status !== 'suspended'),
  );
  return { ...user, premium };
}

/**
 * A membership purchase must leave the same person signed in.
 * The buy payload is { membership, invoice, profile? }. Using a missing
 * profile as the next session user clears the header and looks like a sign-out.
 */
export function sessionUserAfterMembershipPurchase(currentUser, payload) {
  const profile = payload?.profile || payload?.user;
  if (isPortalUser(profile)) return withMembershipFlag(profile);
  if (isPortalUser(currentUser)) return withMembershipFlag(currentUser);
  return null;
}
