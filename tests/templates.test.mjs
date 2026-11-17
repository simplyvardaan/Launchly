import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { CATEGORIES, DEFAULT_TEMPLATE, calculateTemplateMetrics, getTemplateById, getTemplatesByCategory, searchTemplates, TEMPLATES } from '../src/lib/templates.ts';

test('template metrics reflect authored metadata and handle empty sections', () => {
  assert.deepEqual(calculateTemplateMetrics({ description: 'Short overview', pages: ['Home', 'About'], features: ['Fast setup'] }), {
    contentWords: 6,
    readingMinutes: 1,
    sectionCount: 2,
    featuresPerSection: 0.5,
  });
  const longDescription = Array(401).fill('word').join(' ');
  assert.equal(calculateTemplateMetrics({ description: longDescription, pages: [], features: [] }).readingMinutes, 3);
  assert.equal(calculateTemplateMetrics({ description: '', pages: [], features: [] }).featuresPerSection, 0);
  assert.ok(TEMPLATES.every((template) => calculateTemplateMetrics(template).sectionCount === template.pages.length));
});
import { createStorefrontPages, getTemplateFeatureDescriptions } from '../src/lib/templateContent.ts';

test('catalog contains the two ecommerce starters', () => {
  assert.deepEqual(TEMPLATES.map(({ id }) => id), ['fresh-crate', 'volt-gear']);
  assert.deepEqual(CATEGORIES, ['All', 'SaaS', 'AI', 'Agency', 'Portfolio', 'Ecommerce', 'Web3', 'Media']);
  assert.equal(getTemplatesByCategory('All').length, 2);
  assert.equal(getTemplatesByCategory('Ecommerce').length, 2);
  assert.equal(searchTemplates('').length, 2);
  assert.equal(searchTemplates('grocer').map(({ id }) => id).join(','), 'fresh-crate');
  assert.equal(getTemplateById('fresh-crate')?.products.length, 12);
  assert.equal(getTemplateById('volt-gear')?.products.length, 12);
  assert.ok(getTemplateById('fresh-crate')?.products.some((product) => product.variants?.length));
  assert.ok(getTemplateById('volt-gear')?.products.some((product) => product.variants?.length));
  assert.equal(getTemplateById('fresh-crate')?.pages.length, 20);
  assert.equal(getTemplateById('volt-gear')?.pages.length, 21);
  for (const id of ['fresh-crate', 'volt-gear']) {
    const png = readFileSync(new URL(`../public/templates/${id}.png`, import.meta.url));
    assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    assert.equal(png.readUInt32BE(16), 1200);
    assert.equal(png.readUInt32BE(20), 800);
  }
});

test('blank editor starter remains available alongside templates', () => {
  assert.equal(DEFAULT_TEMPLATE.id, 'blank');
  assert.equal(DEFAULT_TEMPLATE.name, 'My Website');
  assert.deepEqual(DEFAULT_TEMPLATE.pages, ['Home']);
  assert.ok(DEFAULT_TEMPLATE.description);
  assert.ok(DEFAULT_TEMPLATE.bgColor);
  assert.ok(DEFAULT_TEMPLATE.textColor);
  assert.equal(DEFAULT_TEMPLATE.previewUrl, '/editor');
});

test('storefront pages use authored copy and purposeful feature descriptions', () => {
  for (const template of TEMPLATES) {
    const pages = createStorefrontPages(template.id, template.pages, template.products);
    assert.equal(pages.length, template.pages.length);
    assert.ok(pages.every((page) => page.title && page.description && page.seoTitle));
    assert.ok(pages.every((page) => !page.description.startsWith(`Explore ${page.title.toLowerCase()} at`)));

    const features = getTemplateFeatureDescriptions(template.id, template.features);
    assert.equal(features.length, template.features.length);
    assert.ok(features.every((feature) => feature.title && feature.desc));
    assert.ok(features.every((feature) => feature.desc !== `${feature.title} is thoughtfully integrated into the ${template.name} shopping experience.`));
  }
});

test('template FAQ seeds provide display-compatible questions and answers', () => {
  for (const template of TEMPLATES) {
    const pages = createStorefrontPages(template.id, template.pages, template.products);
    const faqPage = pages.find((page) => page.id === 'faq' || page.id === 'support');
    const faq = faqPage?.sections.find((section) => section.type === 'faq');
    const items = faq?.content.items;
    assert.ok(Array.isArray(items) && items.length);
    assert.ok(items.every((item) => item.question && item.answer));
  }
});
