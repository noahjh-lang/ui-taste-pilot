/**
 * Dynamic routes are pre-rendered once with this placeholder value, and
 * CloudFront rewrites every real URL onto it (infra/functions/viewer-request.js).
 */
export const STATIC_PARAM_PLACEHOLDER = '_';

/** `generateStaticParams` result for a single-param dynamic route. */
export function staticParams<K extends string>(key: K) {
  return [{ [key]: STATIC_PARAM_PLACEHOLDER }] as Array<Record<K, string>>;
}
