/** Lower is better. 0 = exact match, 1 = starts with the query, 2 = the query
 * appears as a whole word, 3 = it's merely a substring somewhere in the name.
 * Case-insensitive throughout. The caller has typically already filtered to
 * "contains" matches via the database query — this just orders those matches
 * by quality instead of leaving them in an arbitrary (or purely rating/date)
 * order. A dedicated search engine (Elasticsearch/Algolia) is the natural
 * swap-in point once real typo-tolerance/fuzzy matching is needed; this is
 * the deterministic, no-infra baseline for now. */
export function computeSearchRank(name: string, query: string): 0 | 1 | 2 | 3 {
  const n = name.trim().toLowerCase();
  const q = query.trim().toLowerCase();
  if (!q) return 3;
  if (n === q) return 0;
  if (n.startsWith(q)) return 1;
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (new RegExp(`\\b${escaped}\\b`).test(n)) return 2;
  return 3;
}
