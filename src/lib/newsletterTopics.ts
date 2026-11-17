export function parseNewsletterTopics(value: unknown): { topics?: string[]; error?: string } {
  if (value === undefined) return {};
  if (!Array.isArray(value) || value.length > 8) {
    return { error: 'Topics must be an array of at most 8 tags.' };
  }

  const topics = new Set<string>();
  for (const item of value) {
    if (typeof item !== 'string') {
      return { error: 'Each topic must be a text tag.' };
    }
    const topic = item.trim().toLowerCase().replace(/\s+/g, ' ');
    if (!/^[\p{L}\p{N}][\p{L}\p{N} -]{0,31}$/u.test(topic)) {
      return { error: 'Each topic must be 1–32 letters, numbers, spaces, or hyphens.' };
    }
    topics.add(topic);
  }
  return { topics: [...topics] };
}
