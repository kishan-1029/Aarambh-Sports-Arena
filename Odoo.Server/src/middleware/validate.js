import { Validation } from '../lib/errors.js';

/**
 * Zod validation middleware.
 * @param {{ params?: import('zod').ZodTypeAny, query?: import('zod').ZodTypeAny, body?: import('zod').ZodTypeAny }} schemas
 */
export function validate(schemas = {}) {
  return (req, _res, next) => {
    try {
      if (schemas.params) {
        req.params = schemas.params.parse(req.params);
      }
      if (schemas.query) {
        req.query = schemas.query.parse(req.query);
      }
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
      return next();
    } catch (err) {
      if (err?.name === 'ZodError') {
        const issues = err.issues?.map((i) => ({ path: i.path.join('.'), message: i.message })) || [];
        const summary = issues
          .map((i) => (i.path ? `${i.path}: ${i.message}` : i.message))
          .filter(Boolean)
          .join('. ');
        return next(Validation(issues, summary || 'Validation failed'));
      }
      return next(err);
    }
  };
}

export default validate;
