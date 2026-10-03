import { Location } from './location.model.js';
import { Settings } from './settings.model.js';
import { Tax } from './tax.model.js';
import { NotFound, Conflict } from '../../lib/errors.js';
import { audit } from '../audit/audit.service.js';
import { parseListQuery, runListQuery } from '../../lib/listQuery.js';

function actorFromCtx(ctx) {
  if (!ctx?.user?.id) {
    return { type: 'system', name: ctx?.user?.name || 'system' };
  }
  return {
    type: 'user',
    id: String(ctx.user.id),
    name: ctx.user.name || ctx.user.email || 'user',
  };
}

export async function getClubSettings(locationId = null) {
  const filter = locationId ? { locationId } : { locationId: null };
  let doc = await Settings.findOne(filter).lean();
  if (!doc && locationId) {
    doc = await Settings.findOne({ locationId: null }).lean();
  }
  if (!doc) {
    doc = (
      await Settings.create({
        locationId: null,
        clubName: 'Arambh Sports Arena',
        currency: 'INR',
        priceIncludesTax: false,
      })
    ).toObject();
  }
  return doc;
}

export async function patchSettings(body, ctx = {}) {
  const locationId = body.locationId || null;
  const filter = locationId ? { locationId } : { locationId: null };
  const before = await Settings.findOne(filter).lean();
  const { locationId: _lid, ...patch } = body;
  const doc = await Settings.findOneAndUpdate(
    filter,
    { $set: { ...patch, locationId } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).lean();

  await audit.record({
    actor: actorFromCtx(ctx),
    source: ctx.source || 'admin',
    action: 'settings.patch',
    entity: { type: 'settings', id: String(doc._id), label: doc.clubName },
    before,
    after: doc,
    requestId: ctx.requestId,
  });

  return doc;
}

export async function listLocations(req) {
  const parsed = parseListQuery(req, {
    allowedSort: ['name', '-name', 'code', '-code', 'createdAt', '-createdAt'],
    defaultSort: 'name',
    searchFields: ['name', 'code', 'phone'],
    buildFilter: () => ({ archivedAt: null }),
  });
  return runListQuery(Location, parsed);
}

export async function createLocation(body, ctx = {}) {
  try {
    const doc = await Location.create(body);
    await audit.record({
      actor: actorFromCtx(ctx),
      source: ctx.source || 'admin',
      action: 'location.create',
      entity: { type: 'location', id: String(doc._id), label: doc.name },
      after: doc.toObject(),
      requestId: ctx.requestId,
    });
    return doc.toObject();
  } catch (err) {
    if (err?.code === 11000) throw Conflict('DUPLICATE_LOCATION', 'Location code already exists');
    throw err;
  }
}

export async function updateLocation(id, body, ctx = {}) {
  const before = await Location.findById(id).lean();
  if (!before || before.archivedAt) throw NotFound('Location');
  const doc = await Location.findByIdAndUpdate(id, { $set: body }, { new: true }).lean();
  await audit.record({
    actor: actorFromCtx(ctx),
    source: ctx.source || 'admin',
    action: 'location.update',
    entity: { type: 'location', id, label: doc.name },
    before,
    after: doc,
    requestId: ctx.requestId,
  });
  return doc;
}

export async function listTaxes(req) {
  const parsed = parseListQuery(req, {
    allowedSort: ['name', '-name', 'ratePct', '-ratePct', 'createdAt', '-createdAt'],
    defaultSort: 'name',
    searchFields: ['name'],
    buildFilter: (q) => {
      const f = {};
      if (q.active === 'true') f.active = true;
      if (q.active === 'false') f.active = false;
      return f;
    },
  });
  return runListQuery(Tax, parsed);
}

export async function createTax(body, ctx = {}) {
  const doc = await Tax.create(body);
  await audit.record({
    actor: actorFromCtx(ctx),
    source: ctx.source || 'admin',
    action: 'tax.create',
    entity: { type: 'tax', id: String(doc._id), label: doc.name },
    after: doc.toObject(),
    requestId: ctx.requestId,
  });
  return doc.toObject();
}

export async function updateTax(id, body, ctx = {}) {
  const before = await Tax.findById(id).lean();
  if (!before) throw NotFound('Tax');
  const doc = await Tax.findByIdAndUpdate(id, { $set: body }, { new: true }).lean();
  await audit.record({
    actor: actorFromCtx(ctx),
    source: ctx.source || 'admin',
    action: 'tax.update',
    entity: { type: 'tax', id, label: doc.name },
    before,
    after: doc,
    requestId: ctx.requestId,
  });
  return doc;
}

export default {
  getClubSettings,
  patchSettings,
  listLocations,
  createLocation,
  updateLocation,
  listTaxes,
  createTax,
  updateTax,
};
