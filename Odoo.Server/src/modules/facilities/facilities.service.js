import { Sport } from './sport.model.js';
import { Court } from './court.model.js';
import { NotFound, Conflict } from '../../lib/errors.js';
import { audit } from '../audit/audit.service.js';
import { parseListQuery, runListQuery } from '../../lib/listQuery.js';

function actorFromCtx(ctx) {
  if (!ctx?.user?.id) return { type: 'system', name: ctx?.user?.name || 'system' };
  return {
    type: 'user',
    id: String(ctx.user.id),
    name: ctx.user.name || ctx.user.email || 'user',
  };
}

export async function listSports(req) {
  const parsed = parseListQuery(req, {
    allowedSort: ['name', 'key', 'sortOrder'],
    defaultSort: 'name',
    defaultPageSize: 50,
    buildFilter: (q) => {
      const filter = {};
      if (q.active != null) filter.active = q.active === 'true' || q.active === true;
      return filter;
    },
  });
  return runListQuery(Sport, parsed, { lean: true });
}

export async function createSport(input, ctx = {}) {
  try {
    const doc = await Sport.create({
      key: String(input.key).toLowerCase(),
      name: input.name,
      icon: input.icon || '',
      sessionMinutes: input.sessionMinutes ?? 60,
      slotStepMinutes: input.slotStepMinutes ?? 30,
      active: input.active !== false,
      isDemo: Boolean(input.isDemo),
    });
    await audit.record({
      actor: actorFromCtx(ctx),
      source: ctx.source || 'admin',
      action: 'sport.created',
      entity: { type: 'sport', id: String(doc._id), label: doc.name },
      requestId: ctx.requestId,
    });
    return doc.toObject();
  } catch (err) {
    if (err?.code === 11000) throw Conflict('DUPLICATE', 'Sport key already exists');
    throw err;
  }
}

export async function updateSport(id, input, ctx = {}) {
  const doc = await Sport.findById(id);
  if (!doc) throw NotFound('Sport');
  const fields = ['name', 'icon', 'sessionMinutes', 'slotStepMinutes', 'active'];
  for (const f of fields) {
    if (input[f] !== undefined) doc[f] = input[f];
  }
  await doc.save();
  await audit.record({
    actor: actorFromCtx(ctx),
    source: ctx.source || 'admin',
    action: 'sport.updated',
    entity: { type: 'sport', id: String(doc._id), label: doc.name },
    after: input,
    requestId: ctx.requestId,
  });
  return doc.toObject();
}

export async function listCourts(req) {
  const parsed = parseListQuery(req, {
    allowedSort: ['name', 'code', 'createdAt'],
    defaultSort: 'name',
    defaultPageSize: 50,
    searchFields: ['name', 'code'],
    buildFilter: (q) => {
      const filter = {};
      if (q.sportId) filter.sportId = q.sportId;
      if (q.status) filter.status = q.status;
      return filter;
    },
  });
  return runListQuery(Court, parsed, {
    lean: true,
    populate: [{ path: 'sportId', select: 'key name' }],
  });
}

export async function getCourt(id) {
  const court = await Court.findById(id).populate('sportId', 'key name').lean();
  if (!court) throw NotFound('Court');
  return court;
}

export async function createCourt(input, ctx = {}) {
  const sport = await Sport.findById(input.sportId).lean();
  if (!sport) throw NotFound('Sport');
  try {
    const doc = await Court.create({
      sportId: sport._id,
      locationId: input.locationId || null,
      name: input.name,
      code: String(input.code).toUpperCase(),
      surface: input.surface || '',
      indoor: input.indoor !== false,
      floodlit: input.floodlit !== false,
      status: input.status || 'active',
      operatingHours: input.operatingHours || [],
      pricing: input.pricing || {
        walkInPaise: { peak: 100000, offPeak: 70000 },
        memberBasePaise: { peak: 80000, offPeak: 50000 },
        peakWindows: [{ dow: [1, 2, 3, 4, 5], from: '17:00', to: '22:00' }],
      },
      taxId: input.taxId || null,
      allowSocialPlay: input.allowSocialPlay !== false,
      capacity: input.capacity ?? 4,
      isDemo: Boolean(input.isDemo),
    });
    await audit.record({
      actor: actorFromCtx(ctx),
      source: ctx.source || 'admin',
      action: 'court.created',
      entity: { type: 'court', id: String(doc._id), label: doc.name },
      requestId: ctx.requestId,
    });
    return doc.toObject();
  } catch (err) {
    if (err?.code === 11000) throw Conflict('DUPLICATE', 'Court code already exists');
    throw err;
  }
}

export async function updateCourt(id, input, ctx = {}) {
  const doc = await Court.findById(id);
  if (!doc) throw NotFound('Court');
  const fields = [
    'name',
    'surface',
    'indoor',
    'floodlit',
    'status',
    'operatingHours',
    'pricing',
    'taxId',
    'allowSocialPlay',
    'capacity',
    'locationId',
  ];
  for (const f of fields) {
    if (input[f] !== undefined) doc[f] = input[f];
  }
  if (input.code) doc.code = String(input.code).toUpperCase();
  await doc.save();
  await audit.record({
    actor: actorFromCtx(ctx),
    source: ctx.source || 'admin',
    action: 'court.updated',
    entity: { type: 'court', id: String(doc._id), label: doc.name },
    after: input,
    requestId: ctx.requestId,
  });
  return doc.toObject();
}

export default {
  listSports,
  createSport,
  updateSport,
  listCourts,
  getCourt,
  createCourt,
  updateCourt,
};
