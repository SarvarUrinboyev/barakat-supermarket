/**
 * One-shot supplier request coordinator for the simulation-to-review bridge.
 *
 * React renders may repeat while a request is in flight. Keeping the request
 * lifecycle outside component state prevents those renders from starting a
 * second request, while still exposing an explicit loading/settled state.
 */
export function createSupplierLoader(fetchSuppliers) {
  if (typeof fetchSuppliers !== 'function') throw new TypeError('fetchSuppliers must be a function');

  let state = 'idle';
  let request = null;

  return {
    get state() {
      return state;
    },

    load() {
      if (request) return request;

      state = 'loading';
      request = Promise.resolve()
        .then(() => fetchSuppliers())
        .then((result) => (Array.isArray(result)
          ? result.map(({ id, name }) => ({ id, name }))
          : []))
        .finally(() => {
          state = 'settled';
        });
      return request;
    },
  };
}
