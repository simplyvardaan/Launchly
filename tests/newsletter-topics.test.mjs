import assert from 'node:assert/strict';
import test from 'node:test';
import { parseNewsletterTopics } from '../src/lib/newsletterTopics.ts';

test('newsletter topics are optional, normalized, and deduplicated', () => {
  assert.deepEqual(parseNewsletterTopics(undefined), {});
  assert.deepEqual(parseNewsletterTopics([]), { topics: [] });
  assert.deepEqual(parseNewsletterTopics([' Templates ', 'design   tips', 'templates']), {
    topics: ['templates', 'design tips'],
  });
});

test('newsletter topics reject malformed and unbounded inputs', () => {
  for (const value of ['templates', [42], [''], ['bad!'], ['x'.repeat(33)], Array(9).fill('topic')]) {
    assert.ok(parseNewsletterTopics(value).error);
  }
  assert.deepEqual(parseNewsletterTopics(['Résumé']), { topics: ['résumé'] });
});
