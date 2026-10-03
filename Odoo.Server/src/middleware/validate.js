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
        return next(
          Validation(
            err.issues?.map((i) => ({ path: i.path.join('.'), message: i.message })),
          ),
        );
      }
      return next(err);
    }
  };
}

export default validate;
