import { useEffect, useState } from "react";

export const SEARCH_DEBOUNCE_MS = 350;

/**
 * Returns `value` only after it has stayed unchanged for `delay` ms.
 * Use this for API-backed search so each keystroke does not fire a request.
 */
export function useDebouncedValue(value, delay = SEARCH_DEBOUNCE_MS) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handle);
  }, [value, delay]);

  return debounced;
}

export default useDebouncedValue;
