/**
 * Shared list pagination / sort / filter helper.
 */

/**
 * @param {import('express').Request} req
 * @param {{
 *   allowedSort?: string[],
 *   defaultSort?: string,
 *   defaultPageSize?: number,
 *   maxPageSize?: number,
 *   buildFilter?: (q: Record<string, unknown>) => Record<string, unknown>,
 *   searchFields?: string[],
 * }} [options]
 */
export function parseListQuery(req, options = {}) {
  const {
    allowedSort = ['createdAt', '-createdAt'],
    defaultSort = '-createdAt',
    defaultPageSize = 25,
    maxPageSize = 100,
    buildFilter,
    searchFields = [],
  } = options;

  const page = Math.max(1, Number(req.query.page) || 1);
  let pageSize = Number(req.query.pageSize) || defaultPageSize;
  pageSize = Math.min(Math.max(1, pageSize), maxPageSize);

  const sortRaw = typeof req.query.sort === 'string' && req.query.sort ? req.query.sort : defaultSort;
  const sortFields = sortRaw.split(',').map((s) => s.trim()).filter(Boolean);
  const sort = {};
  for (const field of sortFields) {
    const desc = field.startsWith('-');
    const name = desc ? field.slice(1) : field;
    const candidate = desc ? `-${name}` : name;
    if (!allowedSort.includes(candidate) && !allowedSort.includes(name)) continue;
    sort[name] = desc ? -1 : 1;
  }
  if (Object.keys(sort).length === 0) {
    const desc = defaultSort.startsWith('-');
    sort[desc ? defaultSort.slice(1) : defaultSort] = desc ? -1 : 1;
  }

  /** @type {Record<string, unknown>} */
  let filter = buildFilter ? buildFilter(req.query) : {};

  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (q && searchFields.length) {
    filter = {
      ...filter,
      $or: searchFields.map((f) => ({ [f]: { $regex: escapeRegex(q), $options: 'i' } })),
    };
  }

  const skip = (page - 1) * pageSize;
  return { filter, sort, skip, limit: pageSize, page, pageSize, q };
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * @param {import('mongoose').Model} Model
 * @param {ReturnType<typeof parseListQuery>} parsed
 * @param {{ lean?: boolean, select?: string, populate?: unknown }} [opts]
 */
export async function runListQuery(Model, parsed, opts = {}) {
  const { filter, sort, skip, limit, page, pageSize } = parsed;
  let find = Model.find(filter).sort(sort).skip(skip).limit(limit);
  if (opts.select) find = find.select(opts.select);
  if (opts.populate) find = find.populate(opts.populate);
  if (opts.lean !== false) find = find.lean();

  const [data, total] = await Promise.all([find.exec(), Model.countDocuments(filter)]);
  return {
    data,
    meta: { page, pageSize, total },
  };
}

export default { parseListQuery, runListQuery };
