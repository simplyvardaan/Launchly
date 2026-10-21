export type Device = 'desktop' | 'tablet' | 'mobile';
export type PageTarget = { type: 'page' | 'url' | 'anchor' | 'email' | 'phone'; value: string };
export type MenuItem = { id: string; label: string; target: PageTarget; newTab: boolean; rel?: string; icon?: string; badge?: string; children?: MenuItem[]; highlight?: boolean; visibleOn?: ('desktop' | 'mobile')[] };
export type SectionStyle = {
  padding?: Partial<Record<'top' | 'right' | 'bottom' | 'left', number>>;
  accentColor?: string;
  borderRadius?: string;
  backgroundColor?: string;
  backgroundImage?: string;
  backgroundSize?: string;
  backgroundPosition?: string;
  backgroundRepeat?: string;
  textAlign?: 'left' | 'center' | 'right';
  fontWeight?: number;
  fontStyle?: 'normal' | 'italic';
  textDecoration?: 'underline' | 'none';
  animation?: string;
  highlightColor?: string;
  minHeight?: number;
  overrides?: Partial<Record<Device, Record<string, string | number>>>;
};
// Section blocks are template-defined; their nested item arrays can contain structured objects.
export type SectionContent = Record<string, unknown>;

export type ElementType =
  | 'heading' | 'text' | 'button' | 'image' | 'video' | 'audio' | 'icon' | 'spacer' | 'divider'
  | 'form' | 'card' | 'gallery' | 'html' | 'list' | 'block' | 'quote' | 'badge' | 'numbered-list'
  | 'image-caption' | 'accordion' | 'tabs' | 'social-links' | 'anchor' | 'lottie' | 'map' | 'chart'
  | 'countdown' | 'progress' | 'rating' | 'table' | 'code' | 'testimonial' | 'stat' | 'pricing-card'
  | 'profile-card' | 'feature-card' | 'news-card' | 'logo' | 'avatar' | 'before-after' | 'device-mockup'
  | 'qr-code' | 'sticky-bar' | 'cookie-banner' | 'popup' | 'marquee' | 'typewriter';

export type Responsive<T> = Partial<Record<Device, T>>;

export type ElementStateStyle = {
  color?: string;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  opacity?: number;
  transform?: string;
  boxShadow?: string;
  textDecoration?: string;
  fontWeight?: number;
};

export type ElementTransition = {
  property?: string;
  duration?: number;
  delay?: number;
  easing?: 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'spring';
};

export type ElementAnimation = {
  trigger?: 'on-load' | 'in-view' | 'scroll-progress' | 'hover' | 'click';
  entrance?: 'fade' | 'slide-up' | 'slide-down' | 'slide-left' | 'slide-right' | 'zoom-in' | 'zoom-out' | 'flip' | 'rotate' | 'bounce' | 'blur-in' | 'reveal';
  duration?: number;
  delay?: number;
  easing?: string;
  repeat?: boolean;
  once?: boolean;
  stagger?: number;
  offset?: number;
  parallaxSpeed?: number;
  loop?: 'float' | 'pulse' | 'spin' | 'marquee' | 'none';
  exit?: string;
};

export type DataBinding = {
  source: 'static' | 'collection' | 'page-field' | 'site-setting' | 'url-param';
  collectionId?: string;
  fieldId?: string;
  format?: 'date' | 'number' | 'currency' | 'case' | 'truncate';
  fallback?: string;
};

export type A11yProps = {
  role?: string;
  ariaLabel?: string;
  ariaLabelledby?: string;
  ariaDescribedby?: string;
  ariaHidden?: boolean;
  ariaLive?: 'polite' | 'assertive' | 'off';
  tabIndex?: number;
  alt?: string;
  lang?: string;
  headingLevel?: number;
  accesskey?: string;
};

export type AdvancedProps = {
  customAttributes?: Record<string, string>;
  customCss?: string;
  cursor?: string;
  pointerEvents?: 'auto' | 'none';
  userSelect?: 'auto' | 'none' | 'text' | 'all';
  scrollMargin?: number;
  scrollSnap?: 'start' | 'center' | 'end' | 'none';
  printVisibility?: 'visible' | 'hidden';
};

export type ElementStyle = {
  color?: string;
  backgroundColor?: string;
  backgroundImage?: string;
  backgroundSize?: string;
  backgroundPosition?: string;
  backgroundRepeat?: string;
  backgroundAttachment?: string;
  gradientType?: 'linear' | 'radial' | 'conic';
  gradientAngle?: number;
  gradientStops?: Array<{ color: string; position: number }>;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  fontStyle?: string;
  lineHeight?: number;
  letterSpacing?: number;
  wordSpacing?: number;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  textDecoration?: string;
  textShadow?: string;
  padding?: Partial<Record<'top' | 'right' | 'bottom' | 'left', number>>;
  margin?: Partial<Record<'top' | 'right' | 'bottom' | 'left', number>>;
  borderColor?: string;
  borderWidth?: number;
  borderStyle?: 'solid' | 'dashed' | 'dotted' | 'none';
  borderRadius?: number;
  borderTopLeftRadius?: number;
  borderTopRightRadius?: number;
  borderBottomLeftRadius?: number;
  borderBottomRightRadius?: number;
  outlineWidth?: number;
  outlineStyle?: string;
  outlineColor?: string;
  outlineOffset?: number;
  shadow?: string;
  boxShadow?: string;
  dropShadow?: string;
  filter?: string;
  backdropFilter?: string;
  opacity?: number;
  mixBlendMode?: string;
  clipPath?: string;
  maxWidth?: number;
  minWidth?: number;
  width?: number;
  maxHeight?: number;
  minHeight?: number;
  height?: number;
  aspectRatio?: string;
  display?: 'block' | 'flex' | 'grid' | 'inline' | 'inline-block' | 'inline-flex' | 'none';
  flexDirection?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
  flexWrap?: 'nowrap' | 'wrap';
  justifyContent?: string;
  alignItems?: string;
  alignContent?: string;
  gap?: number;
  rowGap?: number;
  columnGap?: number;
  flexGrow?: number;
  flexShrink?: number;
  flexBasis?: string;
  order?: number;
  alignSelf?: string;
  gridTemplateColumns?: string;
  gridTemplateRows?: string;
  gridAutoFlow?: string;
  gridColumn?: string;
  gridRow?: string;
  position?: 'static' | 'relative' | 'absolute' | 'fixed' | 'sticky';
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
  zIndex?: number;
  overflow?: 'visible' | 'hidden' | 'auto' | 'scroll';
  overflowX?: 'visible' | 'hidden' | 'auto' | 'scroll';
  overflowY?: 'visible' | 'hidden' | 'auto' | 'scroll';
  cursor?: string;
  visibility?: Responsive<boolean>;
  animation?: string;
  customClass?: string;
  transform?: string;
  translateX?: number;
  translateY?: number;
  scaleX?: number;
  scaleY?: number;
  rotate?: number;
  skewX?: number;
  skewY?: number;
  transformOrigin?: string;
  perspective?: number;
};

export type ElementPosition = { x: number; y: number; width: number; height: number; rotation: number; zIndex: number };

export type ElementInteraction = {
  id: string;
  trigger: 'click' | 'double-click' | 'hover-in' | 'hover-out' | 'focus' | 'blur' | 'enter-viewport' | 'leave-viewport' | 'key-press' | 'form-submit' | 'timer' | 'scroll' | 'page-load' | 'media-ended';
  action: 'navigate' | 'scroll-to' | 'open-modal' | 'close-modal' | 'toggle-class' | 'show' | 'hide' | 'toggle' | 'copy' | 'play-video' | 'pause-video' | 'add-to-cart' | 'submit-form' | 'download' | 'track-event' | 'webhook' | 'set-state';
  target?: string;
  value?: string;
  durationMs?: number;
  delayMs?: number;
  easing?: 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out';
  condition?: { field: string; operator: 'equals' | 'contains' | 'gt' | 'lt'; value: string };
};

export type SiteElement = {
  id: string;
  type: ElementType;
  name?: string;
  content: SectionContent;
  style: ElementStyle;
  states?: {
    hover?: ElementStateStyle;
    focus?: ElementStateStyle;
    active?: ElementStateStyle;
    disabled?: ElementStateStyle;
    visited?: ElementStateStyle;
  };
  transition?: ElementTransition;
  responsive?: Partial<Record<Device, Partial<ElementStyle>>>;
  position?: Responsive<ElementPosition>;
  interactions?: ElementInteraction[];
  animation?: ElementAnimation;
  binding?: DataBinding;
  a11y?: A11yProps;
  advanced?: AdvancedProps;
  hidden?: Responsive<boolean>;
  locked?: boolean;
  anchorId?: string;
  customClass?: string;
};

export type Column = {
  id: string;
  width: Responsive<number>;
  style: ElementStyle;
  elements: SiteElement[];
  hidden?: Responsive<boolean>;
};

export type SectionDivider = {
  type: 'wave' | 'diagonal' | 'curve' | 'zigzag' | 'triangle' | 'none';
  height?: number;
  flip?: boolean;
  color?: string;
};

export type Section = {
  id: string;
  type: string;
  name: string;
  content: SectionContent;
  style: SectionStyle;
  columns?: Column[];
  hidden: Record<Device, boolean>;
  anchorId?: string;
  customClass?: string;
  locked: boolean;
  layoutMode?: 'flow' | 'free';
  contentWidth?: 'full' | 'boxed';
  maxWidth?: number;
  minHeight?: number;
  dividerTop?: SectionDivider;
  dividerBottom?: SectionDivider;
  scrollSnap?: boolean;
  preset?: string;
};

export type CollectionFieldType = 'text' | 'rich-text' | 'image' | 'gallery' | 'number' | 'price' | 'date' | 'boolean' | 'select' | 'reference' | 'url';
export type ContentCollection = {
  id: string;
  name: string;
  slug?: string;
  fields: Array<{ id: string; name: string; type: CollectionFieldType; required?: boolean; unique?: boolean; options?: string[]; default?: unknown }>;
  records: Array<{ id: string; status: 'draft' | 'published'; values: Record<string, unknown> }>;
  displayField?: string;
  sortDefault?: string;
  detailPageTemplate?: string;
};

export type PageSeo = {
  title: string;
  description: string;
  ogImage: string;
  noindex: boolean;
  canonical?: string;
  robots?: { index: boolean; follow: boolean };
  ogTitle?: string;
  ogDescription?: string;
  twitterCard?: 'summary' | 'summary_large_image';
  structuredDataType?: string;
  keywords?: string;
};

export type SitePage = {
  id: string;
  slug: string;
  title: string;
  isHome: boolean;
  showInMenu: boolean;
  seo: PageSeo;
  sections: Section[];
  elements: Array<{ id: string; type: 'image' | 'icon'; name: string; src?: string; icon?: string; x: number; y: number; width: number; height: number }>;
  useSharedHeader: boolean;
  useSharedFooter: boolean;
  oldSlugs: string[];
  status?: 'draft' | 'published';
  publishAt?: string;
  password?: string;
  template?: 'static' | 'dynamic';
  collectionId?: string;
  customCode?: string;
  language?: string;
  redirect?: string;
  thumbnail?: string;
  parentId?: string;
};

export type Theme = {
  primaryColor: string;
  secondaryColor: string;
  accentColor?: string;
  bgColor: string;
  surfaceColor: string;
  textColor: string;
  mutedColor: string;
  successColor?: string;
  warningColor?: string;
  dangerColor?: string;
  fontFamily: string;
  headingFont: string;
  monoFont?: string;
  radius: string;
  buttonStyle: 'solid' | 'outline' | 'pill';
  spacingScale: number;
  darkMode: boolean;
  borderRadius: string;
  typescale?: { base?: number; ratio?: number };
  shadowScale?: 'none' | 'subtle' | 'medium' | 'strong';
  animationDefault?: 'none' | 'subtle' | 'moderate';
  containerWidth?: number;
  darkModeBehavior?: 'system' | 'manual';
};

export type SiteAsset = { id: string; name: string; role: 'logo' | 'favicon' | 'product' | 'image' | 'icon' | 'font' | 'document'; src: string; alt: string; sizeBytes?: number; width?: number; height?: number; folder?: string };

export type SiteRedirect = { from: string; to: string; statusCode: 301 | 302 };

export type SiteSettings = {
  subdomain: string;
  status: 'draft' | 'published';
  customCss: string;
  language?: string;
  timezone?: string;
  currency?: string;
  defaultOgImage?: string;
  socialLinks?: Record<string, string>;
  contactInfo?: { email?: string; phone?: string; address?: string };
  analyticsId?: string;
  analyticsProvider?: 'ga4' | 'plausible' | 'posthog' | 'custom';
  customHead?: string;
  customBody?: string;
  cookieConsent?: { enabled: boolean; message?: string; policyUrl?: string };
  maintenance?: { enabled: boolean; message?: string };
  passwordProtection?: { enabled: boolean; passwordHash?: string };
  robots?: 'index' | 'noindex' | 'custom';
  redirects?: SiteRedirect[];
  domain?: string;
  sslStatus?: 'pending' | 'active' | 'error';
};

export type SiteDocument = {
  version: 4;
  id: string;
  name: string;
  templateId: string;
  theme: Theme;
  header: { sticky: boolean; mobileMenu: boolean; transparent?: boolean; shrinkOnScroll?: boolean };
  footer: { enabled: boolean };
  menu: MenuItem[];
  pages: SitePage[];
  assets: SiteAsset[];
  collections: ContentCollection[];
  settings: SiteSettings;
};

// Legacy v3 document shape (for migration purposes)
export type LegacySiteData = {
  siteName?: string;
  name?: string;
  templateId?: string;
  theme?: Partial<Theme>;
  sections?: Array<{ id?: string; name?: string; type?: string }>;
  sectionSpacing?: Record<string, { top?: number; right?: number; bottom?: number; left?: number }>;
  heroContent?: Record<string, string>;
  featuresContent?: Array<{ title: string; desc: string }>;
  testimonialsContent?: Array<{ quote: string; name: string; role: string }>;
  ctaContent?: { title: string; desc: string; buttonText: string };
  assetUrl?: string;
  logoUrl?: string;
  faviconUrl?: string;
  canvasElements?: SitePage['elements'];
  sitePages?: Array<{ id?: string; title?: string; description?: string }>;
  // v3 fields
  content?: {
    hero: Record<string, string>;
    features: Array<{ title: string; desc: string }>;
    testimonials: Array<{ quote: string; name: string; role: string }>;
    cta: { title: string; desc: string; buttonText: string };
  };
};

const fallbackHero = { badge: 'WELCOME', title: 'Welcome', description: 'A thoughtful experience built with Launchly.', ctaPrimary: 'Get started', ctaSecondary: 'Learn more', stat1Label: '', stat1Value: '', stat2Label: '', stat2Value: '' };
const defaultCta = { title: 'Ready to get started?', desc: 'Explore what we have made for you.', buttonText: 'Get started' };
const ids = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'page';

export function makeSection(type: string, id: string, name?: string, style: SectionStyle = {}, content: SectionContent = {}): Section {
  return {
    id,
    type,
    name: name || type.charAt(0).toUpperCase() + type.slice(1),
    content,
    style,
    columns: [{ id: `${id}-column-1`, width: { desktop: 12, tablet: 12, mobile: 12 }, style: {}, elements: [{ id: `${id}-block`, type: 'block', content: { blockType: type, ...structuredClone(content) }, style: {} }] }],
    hidden: { desktop: false, tablet: false, mobile: false },
    locked: false,
    layoutMode: 'flow',
    contentWidth: 'boxed',
  };
}

function normalizeSection(section: Section): Section {
  const columns = structuredClone(section.columns?.length ? section.columns : makeSection(section.type, section.id, section.name, section.style, section.content).columns || []);
  const primaryColumn = columns[0];
  const blockElement = primaryColumn?.elements.find((element) => element.type === 'block');
  if (blockElement) blockElement.content = { blockType: section.type, ...structuredClone(section.content) };
  return { ...section, layoutMode: section.layoutMode || 'flow', contentWidth: section.contentWidth || 'boxed', columns };
}

function normalizeDocument(document: SiteDocument): SiteDocument {
  const seenMenuTargets = new Set<string>();
  const menu = (document.menu || []).filter((item) => {
    if (seenMenuTargets.has(item.id)) return false;
    seenMenuTargets.add(item.id);
    return true;
  });
  return {
    ...document,
    version: 4,
    collections: document.collections || [],
    settings: {
      ...document.settings,
      subdomain: document.settings?.subdomain || '',
      status: document.settings?.status || 'draft',
      customCss: document.settings?.customCss || '',
      currency: document.settings?.currency || 'USD',
      language: document.settings?.language || 'en',
    },
    menu,
    pages: document.pages.map((page) => ({
      ...page,
      seo: {
        ...page.seo,
        title: page.seo?.title || page.title || '',
        description: page.seo?.description || '',
        ogImage: page.seo?.ogImage || '',
        noindex: page.seo?.noindex || false,
      },
      sections: page.sections.map(normalizeSection),
    })),
  };
}

export function createSiteDocument(input: {
  id: string; name: string; templateId: string; theme: Partial<Theme>; sections: Array<{ id: string; name: string; type: string; content?: SectionContent; style?: SectionStyle; columns?: Column[]; hidden?: Partial<Record<Device, boolean>>; locked?: boolean; anchorId?: string; customClass?: string }>;
  hero: Record<string, string>; features: Array<{ title: string; desc: string }>;
  testimonials: Array<{ quote: string; name: string; role: string }>;
  cta: { title: string; desc: string; buttonText: string };
  sectionSpacing?: Record<string, { top?: number; right?: number; bottom?: number; left?: number }>;
  elements?: SitePage['elements'];
  pages?: Array<{ id: string; title: string; description: string; slug?: string; isHome?: boolean; showInMenu?: boolean; noindex?: boolean; ogImage?: string; seoTitle?: string; useSharedHeader?: boolean; useSharedFooter?: boolean; oldSlugs?: string[]; sections?: Section[] }>;
  assetUrl?: string; logoUrl?: string; faviconUrl?: string;
  assets?: SiteAsset[];
}): SiteDocument {
  const primaryColor = input.theme.primaryColor || '#FF5588';
  const theme: Theme = { primaryColor, secondaryColor: '#111111', bgColor: input.theme.bgColor || '#FFFFFF', surfaceColor: '#FFFFFF', textColor: input.theme.textColor || '#111111', mutedColor: '#737373', fontFamily: input.theme.fontFamily || 'Inter, sans-serif', headingFont: input.theme.fontFamily || 'Inter, sans-serif', radius: input.theme.borderRadius || '16px', borderRadius: input.theme.borderRadius || '16px', buttonStyle: 'solid', spacingScale: 1, darkMode: false, ...input.theme };
  const sections = input.sections.map((entry) => {
    const spacing = input.sectionSpacing?.[entry.id];
    const style: SectionStyle = { ...entry.style, ...(spacing ? { padding: { top: spacing.top || 0, right: spacing.right || 0, bottom: spacing.bottom || 0, left: spacing.left || 0 } } : {}) };
    const defaultContent: SectionContent = entry.type === 'hero' ? input.hero : entry.type === 'features' ? { items: input.features } : entry.type === 'testimonials' ? { items: input.testimonials } : entry.type === 'cta' ? input.cta : {};
    const section = makeSection(entry.type, entry.id, entry.name, style, entry.content && Object.keys(entry.content).length ? entry.content : defaultContent);
    return { ...normalizeSection({ ...section, columns: entry.columns ? structuredClone(entry.columns) : section.columns }), hidden: { ...section.hidden, ...entry.hidden }, locked: entry.locked ?? section.locked, anchorId: entry.anchorId, customClass: entry.customClass };
  });
  const homeMeta = input.pages?.find((page) => page.isHome || page.id === 'home');
  const home: SitePage = {
    id: 'home', slug: '/', title: homeMeta?.title || 'Home', isHome: true, showInMenu: false,
    seo: { title: homeMeta?.seoTitle || input.name, description: homeMeta?.description || input.hero.description || '', ogImage: homeMeta?.ogImage || '', noindex: homeMeta?.noindex || false },
    sections, elements: input.elements || [], useSharedHeader: true, useSharedFooter: true, oldSlugs: homeMeta?.oldSlugs || [],
  };
  const additionalPages = (input.pages || []).filter((page) => page.id !== 'home').map((page) => {
    const slug = ids(page.id || page.title);
    const pageSlug = page.slug?.replace(/^\/+/, '') || slug;
    return { id: page.id, slug: `/${pageSlug}`, title: page.title, isHome: false, showInMenu: page.showInMenu !== false, seo: { title: page.seoTitle || page.title, description: page.description, ogImage: page.ogImage || '', noindex: page.noindex || false }, sections: page.sections?.length ? page.sections : [makeSection('hero', `${page.id}-hero`, 'Hero', {}, { title: page.title, description: page.description })], elements: [], useSharedHeader: page.useSharedHeader !== false, useSharedFooter: page.useSharedFooter !== false, oldSlugs: page.oldSlugs || [] } satisfies SitePage;
  });
  const pageMenu = additionalPages.filter((page) => page.showInMenu).map((page) => ({ id: `menu-${page.id}`, label: page.title, target: { type: 'page' as const, value: page.id }, newTab: false }));
  const storeAnchorMenu: MenuItem[] = input.templateId === 'fresh-crate'
    ? [
        { id: 'menu-shop', label: 'Shop', target: { type: 'anchor', value: 'collection' }, newTab: false },
        { id: 'menu-how-it-works', label: 'How it works', target: { type: 'anchor', value: 'home-how-it-works' }, newTab: false },
        { id: 'menu-recipes', label: 'Recipes', target: { type: 'anchor', value: 'home-recipes' }, newTab: false },
        { id: 'menu-our-story', label: 'Our story', target: { type: 'anchor', value: 'home-story' }, newTab: false },
      ]
    : input.templateId === 'volt-gear'
      ? [
          { id: 'menu-shop', label: 'Shop gear', target: { type: 'anchor', value: 'collection' }, newTab: false },
          { id: 'menu-how-it-works', label: 'How it works', target: { type: 'anchor', value: 'home-how-it-works' }, newTab: false },
          { id: 'menu-our-story', label: 'Our story', target: { type: 'anchor', value: 'home-story' }, newTab: false },
        ]
      : input.templateId === 'kuro-craft'
        ? [
            { id: 'menu-work', label: 'Selected Work', target: { type: 'anchor', value: 'home-best-sellers' }, newTab: false },
            { id: 'menu-disciplines', label: 'Disciplines', target: { type: 'anchor', value: 'home-categories' }, newTab: false },
            { id: 'menu-philosophy', label: 'Philosophy', target: { type: 'anchor', value: 'home-how-it-works' }, newTab: false },
            { id: 'menu-contact', label: 'Contact', target: { type: 'anchor', value: 'home-cta' }, newTab: false },
          ]
      : [];
  const assets: SiteAsset[] = (input.assets || []).filter((asset) => asset.role === 'image' || asset.role === 'icon');
  for (const [role, src] of [['product', input.assetUrl], ['logo', input.logoUrl], ['favicon', input.faviconUrl]] as const) if (src) assets.push({ id: `${role}-asset`, name: role, role, src, alt: role === 'logo' ? `${input.name} logo` : '' });
  return {
    version: 4, id: input.id, name: input.name, templateId: input.templateId, theme,
    header: { sticky: true, mobileMenu: true }, footer: { enabled: true },
    menu: pageMenu.length ? pageMenu : storeAnchorMenu, pages: [home, ...additionalPages], assets, collections: [],
    settings: { subdomain: ids(input.name), status: 'draft', customCss: '', currency: 'USD', language: 'en' },
  };
}

export function migrateSiteDocument(raw: unknown, defaults: SiteDocument): SiteDocument {
  if (!raw || typeof raw !== 'object') return defaults;
  const data = raw as LegacySiteData & { document?: unknown; version?: number };

  // Unwrap if wrapped in { document: ... }
  if (data.document && typeof data.document === 'object' && [1, 2, 3, 4].includes((data.document as { version?: number }).version || 0)) {
    return normalizeDocument(data.document as SiteDocument);
  }

  // Already a v3 or v4 document at top level
  if ([3, 4].includes(data.version || 0) && Array.isArray((raw as SiteDocument).pages) && (raw as SiteDocument).theme) {
    const doc = raw as SiteDocument;
    // If v3, strip the top-level content field and redistribute into sections
    if (doc.version as number === 3) {
      const v3 = doc as SiteDocument & { content?: LegacySiteData['content'] };
      const upgraded: SiteDocument = {
        ...v3,
        version: 4,
        settings: {
          subdomain: v3.settings?.subdomain || '',
          status: v3.settings?.status || 'draft',
          customCss: v3.settings?.customCss || '',
          currency: 'USD',
          language: 'en',
        },
      };
      // Remove legacy content field
      delete (upgraded as Record<string, unknown>)['content'];
      return normalizeDocument(upgraded);
    }
    return normalizeDocument(doc);
  }

  // Legacy key-value format (pre-v3)
  const doc = structuredClone(defaults);
  doc.name = data.siteName || data.name || doc.name;
  doc.templateId = data.templateId || doc.templateId;
  if (data.theme) doc.theme = { ...doc.theme, ...data.theme, radius: data.theme.borderRadius || doc.theme.radius };
  if (data.sections?.length) {
    doc.pages[0].sections = data.sections.map((item, index) => {
      const section = makeSection(item.type || 'rich-text', item.id || `section-${index + 1}`, item.name);
      const spacing = data.sectionSpacing?.[section.id];
      if (spacing) section.style.padding = { top: spacing.top || 0, right: spacing.right || 0, bottom: spacing.bottom || 0, left: spacing.left || 0 };
      return section;
    });
  }
  // Distribute legacy shared content into sections
  const hero = data.heroContent || data.content?.hero;
  const features = data.featuresContent || data.content?.features;
  const testimonials = data.testimonialsContent || data.content?.testimonials;
  const cta = data.ctaContent || data.content?.cta;
  if (hero) {
    const heroSection = doc.pages[0].sections.find((s) => s.type === 'hero');
    if (heroSection) {
      heroSection.content = { ...fallbackHero, ...hero };
      heroSection.columns?.[0]?.elements.forEach((el) => { if (el.type === 'block') el.content = { blockType: 'hero', ...fallbackHero, ...hero }; });
    }
  }
  if (features && Array.isArray(features)) {
    const featuresSection = doc.pages[0].sections.find((s) => s.type === 'features');
    if (featuresSection) {
      featuresSection.content = { items: features };
      featuresSection.columns?.[0]?.elements.forEach((el) => { if (el.type === 'block') el.content = { blockType: 'features', items: features }; });
    }
  }
  if (testimonials && Array.isArray(testimonials)) {
    const testimonialsSection = doc.pages[0].sections.find((s) => s.type === 'testimonials');
    if (testimonialsSection) {
      testimonialsSection.content = { items: testimonials };
      testimonialsSection.columns?.[0]?.elements.forEach((el) => { if (el.type === 'block') el.content = { blockType: 'testimonials', items: testimonials }; });
    }
  }
  if (cta) {
    const ctaSection = doc.pages[0].sections.find((s) => s.type === 'cta');
    if (ctaSection) {
      ctaSection.content = { ...defaultCta, ...cta };
      ctaSection.columns?.[0]?.elements.forEach((el) => { if (el.type === 'block') el.content = { blockType: 'cta', ...defaultCta, ...cta }; });
    }
  }
  doc.assets = [];
  for (const [role, src] of [['product', data.assetUrl], ['logo', data.logoUrl], ['favicon', data.faviconUrl]] as const) if (src) doc.assets.push({ id: `${role}-asset`, name: role, role, src, alt: role === 'logo' ? `${doc.name} logo` : '' });
  doc.pages[0].elements = data.canvasElements || [];
  if (data.sitePages?.length) {
    const home = data.sitePages.find((page) => page.id === 'home' || page.title?.toLowerCase() === 'home');
    if (home) {
      doc.pages[0].title = home.title || 'Home';
      doc.pages[0].seo.description = home.description || doc.pages[0].seo.description;
    }
    for (const legacyPage of data.sitePages) {
      if (legacyPage === home) continue;
      const slug = ids(legacyPage.id || legacyPage.title || 'page');
      if (doc.pages.some((page) => page.slug === `/${slug}`)) continue;
      doc.pages.push({ id: slug, slug: `/${slug}`, title: legacyPage.title || slug, isHome: false, showInMenu: true, seo: { title: legacyPage.title || slug, description: legacyPage.description || '', ogImage: '', noindex: false }, sections: [makeSection('hero', `${slug}-hero`, 'Hero', {}, { title: legacyPage.title || slug, description: legacyPage.description || '' })], elements: [], useSharedHeader: true, useSharedFooter: true, oldSlugs: [] });
    }
  }
  if (data.sitePages?.length && doc.pages.length > 1) doc.menu = doc.pages.filter((page) => !page.isHome && page.showInMenu).map((page) => ({ id: `menu-${page.id}`, label: page.title, target: { type: 'page', value: page.id }, newTab: false }));
  return doc;
}

/** Merge the current editor controls into the canonical document without dropping page-level metadata. */
export function mergeEditorProjection(current: SiteDocument, projection: SiteDocument, activePageId = 'home'): SiteDocument {
  const pages = projection.pages.map((page) => {
    const existing = current.pages.find((candidate) => candidate.id === page.id || (candidate.isHome && page.isHome));
    if (!existing) return page;
    const sections = page.id === activePageId
      ? page.sections.map((section) => {
        const previous = existing.sections.find((candidate) => candidate.id === section.id);
        return previous ? { ...previous, ...section } : section;
      })
      : existing.sections;
    return { ...existing, ...page, slug: existing.isHome ? '/' : page.slug, sections, elements: page.id === activePageId ? page.elements : existing.elements };
  });
  const pageIds = new Set(pages.map((page) => page.id));
  const pageById = new Map(pages.map((page) => [page.id, page]));
  const existingMenu = current.menu
    .filter((item) => item.target.type !== 'page' || (pageIds.has(item.target.value) && pageById.get(item.target.value)?.showInMenu))
    .map((item) => item.target.type === 'page'
      ? { ...item, label: pageById.get(item.target.value)?.title || item.label }
      : item);
  const menuTargets = new Set(existingMenu.map((item) => item.id));
  const menu = [...existingMenu, ...projection.menu.filter((item) => {
    const key = item.id;
    if (menuTargets.has(key)) return false;
    menuTargets.add(key);
    return true;
  })];
  return {
    ...current,
    ...projection,
    header: current.header,
    footer: current.footer,
    settings: { ...current.settings, ...projection.settings, status: current.settings.status },
    menu,
    pages,
  };
}
