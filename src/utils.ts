import type { Event } from 'nostr-tools'

/**
 * Extract a single tag value from a Nostr event
 * @param event - The Nostr event
 * @param tagname - The tag name to search for
 * @returns The tag value or null if not found
 * @throws Error if multiple values are found
 */
export function tval(event: Event, tagname: string): string | null {
  let v = event.tags.filter((t) => t[0] === tagname)
  if (v.length > 1)
    throw Error("multiple values")
  if (v.length == 1)
    return v[0][1]
  return null
}
