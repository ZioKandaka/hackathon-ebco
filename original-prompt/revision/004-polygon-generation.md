generateIsochronePolygon in [file] does not call any real routing service — it generates a fake polygon using a fixed speed-per-mode constant and a sine/cosine "roadAsymmetry" formula purely to make the shape look irregular. This does not reflect real road networks, one-ways, or obstacles, and does not satisfy the Accessibility Analysis spec, which requires genuine drive/walk/transit-time isochrones from the Routes API.

Replace with a real implementation using the Google Routes API:
1. Sample a set of candidate points around the origin (e.g. a grid or ring at multiple distances/angles).
2. For each sampled point, call the Routes API's computeRouteMatrix (or equivalent) to get actual travel time from the origin to that point, for the specified travel mode.
3. Keep only the points where actual travel time is within the requested timeMinutes threshold.
4. Compute the boundary/hull of the reachable points (e.g. a convex hull, or better, a concave hull if a library is available) as the isochrone polygon.
5. If the Routes API call fails, throw/return an explicit error surfaced to the user in the chat (per the constitution's error-handling rule) — do not fall back to a synthetic/generated shape silently.

Also fix queryPoisInsidePolygon: it currently silently falls back to generateMockRadiusPois() if the BigQuery query throws an error, returning fabricated POI data without informing the user. Remove this silent fallback — on a BigQuery error, log the actual error and propagate a clear failure to the caller so it surfaces as a real error message in the chat, not fake data presented as if it were real.

Be mindful of Routes API cost/rate limits: cache isochrone results in Postgres (isochrone_cache table, per the constitution) keyed by rounded lat/lng + travel mode + time threshold, to avoid re-computing the same isochrone repeatedly.