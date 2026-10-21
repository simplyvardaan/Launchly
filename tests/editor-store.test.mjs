import assert from 'node:assert/strict';
import test from 'node:test';
import { createSiteDocument, makeSection, mergeEditorProjection, migrateSiteDocument } from '../src/lib/siteDocument.ts';
import { createEditorStore } from '../src/store/editorStore.ts';
import { blockRegistry } from '../src/lib/blockRegistry.ts';

function fixture() {
  return createSiteDocument({
    id: 'test-site', name: 'Test Site', templateId: 'test',
    theme: { primaryColor: '#ff5588', bgColor: '#fff', textColor: '#111', fontFamily: 'Inter, sans-serif', borderRadius: '16px' },
    sections: [makeSection('hero', 'hero', 'Hero'), makeSection('features', 'features', 'Features')],
    hero: { title: 'Hello', description: 'Intro' }, features: [], testimonials: [],
    cta: { title: 'Next', desc: 'Start', buttonText: 'Go' },
  });
}

test('document edits are undoable and redoable', () => {
  const store = createEditorStore(fixture());
  store.getState().setTheme({ ...store.getState().document.theme, primaryColor: '#123456' });
  assert.equal(store.getState().document.theme.primaryColor, '#123456');
  store.getState().undo();
  assert.equal(store.getState().document.theme.primaryColor, '#ff5588');
  store.getState().redo();
  assert.equal(store.getState().document.theme.primaryColor, '#123456');
});

test('sections can be duplicated, reordered, and removed', () => {
  const store = createEditorStore(fixture());
  store.getState().duplicateSection('home', 'hero');
  let sections = store.getState().document.pages[0].sections;
  assert.equal(sections.length, 3);
  const duplicateId = sections[1].id;
  store.getState().reorderSection('home', duplicateId, 2);
  sections = store.getState().document.pages[0].sections;
  assert.equal(sections[2].id, duplicateId);
  store.getState().removeSection('home', duplicateId);
  assert.equal(store.getState().document.pages[0].sections.length, 2);
});

test('section content and styles are independent and undoable per block', () => {
  const store = createEditorStore(fixture());
  store.getState().duplicateSection('home', 'hero');
  const duplicateId = store.getState().document.pages[0].sections[1].id;
  store.getState().updateSection('home', duplicateId, (section) => ({
    ...section,
    content: { ...section.content, title: 'Separate headline' },
    style: { ...section.style, accentColor: '#00aa66' },
  }));
  const sections = store.getState().document.pages[0].sections;
  assert.equal(sections[0].content.title, 'Hello');
  assert.equal(sections[1].content.title, 'Separate headline');
  assert.equal(sections[1].style.accentColor, '#00aa66');
  store.getState().undo();
  assert.notEqual(store.getState().document.pages[0].sections[1].content.title, 'Separate headline');
});

test('page CRUD enforces unique slugs and keeps a home page', () => {
  const store = createEditorStore(fixture());
  const firstId = store.getState().addPage('About', [makeSection('hero', 'about-hero')]);
  const secondId = store.getState().addPage('About', [makeSection('hero', 'about-hero-2')]);
  assert.notEqual(store.getState().document.pages.find((page) => page.id === firstId)?.slug, store.getState().document.pages.find((page) => page.id === secondId)?.slug);
  assert.equal(store.getState().setPageSlug(firstId, 'pricing'), '/pricing');
  assert.equal(store.getState().setPageSlug(secondId, 'pricing'), '/pricing-2');
  assert.equal(store.getState().removePage('home'), false);
  assert.equal(store.getState().removePage(firstId), true);
});

test('changing the home page preserves both pages and updates navigation targets', () => {
  const store = createEditorStore(fixture());
  const aboutId = store.getState().addPage('About', [makeSection('hero', 'about-hero')]);
  store.getState().setHomePage(aboutId);
  const doc = store.getState().document;
  const home = doc.pages.find((page) => page.isHome);
  const oldHome = doc.pages.find((page) => page.id === aboutId);
  assert.equal(home?.id, 'home');
  assert.equal(home?.title, 'About');
  assert.equal(oldHome?.isHome, false);
  assert.equal(oldHome?.slug, '/home-page');
  assert.ok(doc.menu.some((item) => item.target.type === 'page' && item.target.value === aboutId));
});

test('legacy drafts migrate content, section order, spacing, assets, and pages', () => {
  const migrated = migrateSiteDocument({
    siteName: 'Old Store', templateId: 'legacy',
    sections: [{ id: 'hero', name: 'Hero', type: 'hero' }],
    sectionSpacing: { hero: { top: 24, bottom: 32 } },
    heroContent: { title: 'Old headline', description: 'Saved copy' },
    assetUrl: 'data:image/png;base64,AA==',
    sitePages: [{ id: 'home', title: 'Home', description: 'Welcome' }, { id: 'about', title: 'About', description: 'Our story' }],
  }, fixture());
  assert.equal(migrated.version, 4);
  assert.equal(migrated.name, 'Old Store');
  assert.equal(migrated.pages[0].sections[0].content.title, 'Old headline');
  assert.equal(migrated.pages[0].sections[0].style.padding?.top, 24);
  assert.equal(migrated.pages[1].slug, '/about');
  assert.equal(migrated.assets[0].src, 'data:image/png;base64,AA==');
  assert.equal(migrated.pages[0].sections[0].columns[0].elements[0].content.blockType, 'hero');
});

test('nested elements insert, move, resize, delete, and undo as document edits', () => {
  const store = createEditorStore(fixture());
  const hero = store.getState().document.pages[0].sections[0];
  const [first] = hero.columns;
  store.getState().insertColumn('home', hero.id, { id: 'column-two', width: { desktop: 6, tablet: 6, mobile: 12 }, style: {}, elements: [] }, 1);
  const columnTwo = store.getState().document.pages[0].sections[0].columns[1];
  store.getState().resizeColumn('home', hero.id, columnTwo.id, 'desktop', 7.6);
  assert.equal(store.getState().document.pages[0].sections[0].columns[1].width.desktop, 8);
  const element = { id: 'new-heading', type: 'heading', content: { text: 'Hello' }, style: {} };
  store.getState().insertElement('home', hero.id, first.id, element, 1);
  store.getState().moveElement('home', hero.id, first.id, element.id, hero.id, columnTwo.id, 0);
  assert.equal(store.getState().document.pages[0].sections[0].columns[1].elements[0].id, element.id);
  store.getState().deleteElement('home', hero.id, columnTwo.id, element.id);
  assert.equal(store.getState().document.pages[0].sections[0].columns[1].elements.some((entry) => entry.id === element.id), false);
  store.getState().undo();
  assert.equal(store.getState().document.pages[0].sections[0].columns[1].elements[0].id, element.id);
});


test('elements can move between sections as one undoable action', () => {
  const store = createEditorStore(fixture());
  const [source, destination] = store.getState().document.pages[0].sections;
  const element = { id: 'move-between-sections', type: 'heading', content: { text: 'Move me' }, style: {} };
  const sourceColumn = source.columns[0];
  const destinationColumn = destination.columns[0];
  store.getState().insertElement('home', source.id, sourceColumn.id, element, 1);
  store.getState().moveElement('home', source.id, sourceColumn.id, element.id, destination.id, destinationColumn.id, 0);
  assert.equal(store.getState().document.pages[0].sections[0].columns[0].elements.some((entry) => entry.id === element.id), false);
  assert.equal(store.getState().document.pages[0].sections[1].columns[0].elements[0].id, element.id);
  store.getState().undo();
  assert.equal(store.getState().document.pages[0].sections[0].columns[0].elements.some((entry) => entry.id === element.id), true);
});

test('versioned documents load without losing page and theme data', () => {
  const original = fixture();
  original.pages[0].title = 'Landing';
  original.theme.primaryColor = '#336699';
  const migrated = migrateSiteDocument(original, fixture());
  assert.equal(migrated.pages[0].title, 'Landing');
  assert.equal(migrated.theme.primaryColor, '#336699');
});

test('block registry supplies useful starting content for supported block types', () => {
  assert.ok(Object.keys(blockRegistry).length >= 15);
  for (const type of ['gallery', 'pricing', 'contact', 'faq', 'stats', 'team', 'steps', 'newsletter', 'rich-text']) {
    assert.ok(blockRegistry[type], `missing ${type} definition`);
    assert.ok(Object.keys(blockRegistry[type].defaultContent).length > 0, `${type} should have default content`);
  }
  assert.equal(Array.isArray(blockRegistry.pricing.defaultContent.items), true);
});

test('menu edits retain external links and synchronize page visibility', () => {
  const store = createEditorStore(fixture());
  const pageId = store.getState().addPage('About', [makeSection('hero', 'about-hero')]);
  const pageLink = store.getState().document.menu.find((item) => item.target.type === 'page' && item.target.value === pageId);
  assert.ok(pageLink);
  store.getState().setMenu([
    { id: 'external', label: 'Visit us', target: { type: 'url', value: 'https://example.com' }, newTab: true },
    { ...pageLink, label: 'Our story' },
  ]);
  const document = store.getState().document;
  assert.equal(document.pages.find((page) => page.id === pageId)?.showInMenu, true);
  assert.equal(document.menu[0].target.type, 'url');
  store.getState().setMenu([document.menu[0]]);
  assert.equal(store.getState().document.pages.find((page) => page.id === pageId)?.showInMenu, false);
});

test('renamed slugs survive editor projections for redirect handling', () => {
  const original = fixture();
  const store = createEditorStore(original);
  const pageId = store.getState().addPage('About', [makeSection('hero', 'about-hero')]);
  store.getState().setPageSlug(pageId, 'our-story');
  const current = store.getState().document;
  const heroSection = current.pages[0].sections.find((s) => s.type === 'hero');
  const projection = createSiteDocument({
    id: current.id, name: current.name, templateId: current.templateId, theme: current.theme,
    sections: current.pages[0].sections, pages: current.pages.map((page) => ({ id: page.id, title: page.title, description: page.seo.description, slug: page.slug, isHome: page.isHome, showInMenu: page.showInMenu, noindex: page.seo.noindex, oldSlugs: page.oldSlugs })),
    hero: heroSection?.content || { title: 'Hello', description: 'Intro' }, features: [], testimonials: [], cta: { title: 'Next', desc: 'Start', buttonText: 'Go' },
  });
  const merged = mergeEditorProjection(current, projection, 'home');
  assert.deepEqual(merged.pages.find((page) => page.id === pageId)?.oldSlugs, ['/about']);
});
