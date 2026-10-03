import PropTypes from 'prop-types';
import { usePermission } from '../../hooks/usePermission';

/**
 * Conditionally render children when the user has a string permission.
 * Cosmetic UI gate — server still enforces requirePermission.
 *
 * <Can perm="booking.cancel">...</Can>
 * <Can anyOf={['booking.view', 'booking.create']}>...</Can>
 */
const Can = ({ perm, anyOf, allOf, fallback = null, children }) => {
  const { can, canAny, canAll } = usePermission();

  let allowed = true;
  if (perm) allowed = can(perm);
  else if (anyOf?.length) allowed = canAny(...anyOf);
  else if (allOf?.length) allowed = canAll(...allOf);

  if (!allowed) return fallback;

  return <>{children}</>;
};

Can.propTypes = {
  perm: PropTypes.string,
  anyOf: PropTypes.arrayOf(PropTypes.string),
  allOf: PropTypes.arrayOf(PropTypes.string),
  fallback: PropTypes.node,
  children: PropTypes.node,
};

export { Can };
export default Can;
