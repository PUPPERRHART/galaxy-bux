(function (root, factory) {
  const policy = factory();
  if (typeof module === 'object' && module.exports) module.exports = policy;
  else root.GALAXY_CATALOG_POLICY = policy;
})(typeof window === 'object' ? window : globalThis, function () {
  const hiddenProductIds = Object.freeze([
    'a675adab-6e80-44ad-91ee-3634cc6620cd',
    'ac37406b-971e-41fc-989a-3456fdd36a7e',
  ]);
  const hidden = new Set(hiddenProductIds);
  return Object.freeze({
    hiddenProductIds,
    isVisible: (product) =>
      !!product && !hidden.has(product.id || product.productId || product._id),
  });
});
