import { Customer } from './customer.model.js';
import { NotFound } from '../../lib/errors.js';
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

export async function list(req) {
  const parsed = parseListQuery(req, {
    allowedSort: ['name', '-name', 'createdAt', '-createdAt', 'email', '-email'],
    defaultSort: 'name',
    searchFields: ['name', 'email', 'phone'],
    buildFilter: (q) => {
      const f = { archivedAt: null };
      if (q.type) f.type = q.type;
      if (q.tag) f.tags = q.tag;
      return f;
    },
  });
  return runListQuery(Customer, parsed);
}

export async function getById(id) {
  const doc = await Customer.findById(id).lean();
  if (!doc || doc.archivedAt) throw NotFound('Customer');
  return doc;
}

export async function create(body, ctx = {}) {
  const doc = await Customer.create(body);
  await audit.record({
    actor: actorFromCtx(ctx),
    source: ctx.source || 'admin',
    action: 'customer.create',
    entity: { type: 'customer', id: String(doc._id), label: doc.name },
    after: doc.toObject(),
    requestId: ctx.requestId,
  });
  return doc.toObject();
}

export async function update(id, body, ctx = {}) {
  const before = await Customer.findById(id).lean();
  if (!before || before.archivedAt) throw NotFound('Customer');
  const doc = await Customer.findByIdAndUpdate(id, { $set: body }, { new: true }).lean();
  await audit.record({
    actor: actorFromCtx(ctx),
    source: ctx.source || 'admin',
    action: 'customer.update',
    entity: { type: 'customer', id, label: doc.name },
    before,
    after: doc,
    requestId: ctx.requestId,
  });
  return doc;
}

export async function archive(id, ctx = {}) {
  const before = await Customer.findById(id).lean();
  if (!before || before.archivedAt) throw NotFound('Customer');
  const doc = await Customer.findByIdAndUpdate(
    id,
    { $set: { archivedAt: new Date() } },
    { new: true },
  ).lean();
  await audit.record({
    actor: actorFromCtx(ctx),
    source: ctx.source || 'admin',
    action: 'customer.archive',
    entity: { type: 'customer', id, label: doc.name },
    before,
    after: doc,
    requestId: ctx.requestId,
  });
  return doc;
}

export default { list, getById, create, update, archive };
