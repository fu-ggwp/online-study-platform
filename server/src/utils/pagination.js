// Normalizes ?page= & ?limit= query params and computes Supabase .range() bounds.
export function getPagination(query, { defaultLimit = 20, maxLimit = 100 } = {}) {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || defaultLimit, 1), maxLimit);

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  return { page, limit, from, to };
}

export function buildPaginatedResponse({ items, count, page, limit }) {
  return {
    items,
    pagination: {
      page,
      limit,
      total: count ?? items.length,
      totalPages: count ? Math.ceil(count / limit) : 1,
    },
  };
}
