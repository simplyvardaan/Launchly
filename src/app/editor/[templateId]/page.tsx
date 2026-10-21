'use client';

import { useState, use, useEffect, useCallback, useRef, useId, useMemo, type FormEvent, type MouseEvent } from 'react';
import { useStore } from 'zustand';
import Link from 'next/link';
import NextImage from 'next/image';
import { closestCenter, DndContext, DragOverlay, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import {
  Undo2, Redo2, Monitor, Tablet, Smartphone, Globe,
  Layers, Type, Image as ImageIcon, Palette, Settings, Menu as MenuIcon, ExternalLink,
  Plus, Trash2, ChevronRight, Eye, EyeOff, Lock, Unlock, X,
  Bold, Italic, AlignLeft, AlignCenter, AlignRight,
  Check, Loader2, Wand2, ArrowUpRight, Star,
  SlidersHorizontal, Layout, Download, ZoomIn, ZoomOut,
  ArrowUp, ArrowDown, Heart, Sparkles, Camera, CheckCircle2, History as HistoryIcon
} from 'lucide-react';
import { getTemplateById, TEMPLATES } from '@/lib/templates';
import { cn } from '@/lib/utils';
import { exportTemplateAsZip } from '@/lib/zipExport';
import { getContrastRatio, getWcagLevel, suggestAccessibleColor } from '@/lib/contrast';
import { createSiteDocument, makeSection, mergeEditorProjection, migrateSiteDocument, type Column, type Device, type MenuItem, type SectionStyle, type SiteAsset, type SiteDocument, type SiteElement, type Theme } from '@/lib/siteDocument';
import { blockRegistry } from '@/lib/blockRegistry';
import { hydrateVersionDocument, loadEditorDraft, loadEditorVersions, saveEditorDraft, saveEditorVersions } from '@/lib/editorPersistence';
import { createEditorStore } from '@/store/editorStore';
import DeployModal from '@/components/DeployModal';
import SocialShareModal from '@/components/SocialShareModal';
import { DraggablePaletteButton, SectionDropMarker, SortableSectionFrame } from '@/components/editor/DndItems';
import TreeSectionRenderer from '@/components/editor/TreeSectionRenderer';
import BrandWordmark from '@/components/BrandWordmark';
import { getDefaultFormFields, type FormField } from '@/components/SiteForm';
import { getAnimationClass, type ButtonTarget } from '@/lib/elementActions';
import { editorCatalog, getEditorCatalogItem, paletteCategories, type EditorPaletteCategory } from '@/lib/editorCatalog';
import { createStorefrontPages } from '@/lib/templateContent';
import StoreHeroArtwork from '@/components/storefront/StoreHeroArtwork';
import { normalizeAnchorId, scrollToAnchor as scrollToResolvedAnchor } from '@/lib/navigation';

type DeviceMode = Device;
type SitePage = { id: string; title: string; description: string; slug?: string; isHome?: boolean; showInMenu?: boolean; noindex?: boolean; ogImage?: string; seoTitle?: string; useSharedHeader?: boolean; useSharedFooter?: boolean; oldSlugs?: string[] };
type LeftPanel = 'sections' | 'ai' | 'styles' | 'elements' | 'pages' | 'navigation' | 'assets' | 'tools' | 'settings';
type MobileTab = 'canvas' | 'sections' | 'styles' | 'inspector' | 'elements' | 'pages' | 'navigation' | 'assets' | 'tools' | 'settings';

const DEVICE_WIDTHS = {
  desktop: '100%',
  tablet: '768px',
  mobile: '375px',
};

interface Section {
  id: string;
  name: string;
  type: string;
  content?: Record<string, unknown>;
  style?: SectionStyle;
  columns?: Column[];
  hidden?: Partial<Record<DeviceMode, boolean>>;
  locked?: boolean;
  anchorId?: string;
  customClass?: string;
}
type SectionSpacing = { top: number; bottom: number; left: number; right: number };
type CanvasElement = { id: string; type: 'image' | 'icon'; name: string; src?: string; icon?: string; x: number; y: number; width: number; height: number };
const DEFAULT_SPACING: SectionSpacing = { top: 0, bottom: 0, left: 0, right: 0 };

const DEFAULT_SECTIONS: Section[] = [
  { id: 'nav', name: 'Navigation', type: 'nav' },
  { id: 'hero', name: 'Hero', type: 'hero' },
  { id: 'gallery', name: 'Featured Products', type: 'gallery' },
  { id: 'features', name: 'Features', type: 'features' },
  { id: 'testimonials', name: 'Testimonials', type: 'testimonials' },
  { id: 'cta', name: 'Call to Action', type: 'cta' },
  { id: 'footer', name: 'Footer', type: 'footer' },
];
const PALETTE_ELEMENT_TYPES: Record<string, SiteElement['type']> = {
  'free:quote': 'quote', 'free:numbered-list': 'numbered-list', 'free:badge': 'badge', 'free:text-link': 'button',
  'free:social-links': 'social-links', 'free:image-caption': 'image-caption', 'free:icon-box': 'card', 'free:logo': 'image',
  'free:accordion': 'accordion', 'free:tabs': 'tabs', 'free:anchor': 'anchor', 'free:newsletter-form': 'form',
};
const PALETTE_BLOCK_ALIASES: Record<string, string> = {
  'free:navbar': 'nav', 'free:mobile-menu': 'nav', 'free:footer-menu': 'footer',
  'free:breadcrumbs': 'breadcrumbs', 'free:services': 'services', 'free:logo-cloud': 'logo-cloud', 'free:not-found': 'not-found',
  'free:newsletter-form': 'newsletter',
};
const paletteElementType = (id: string): SiteElement['type'] | null => {
  if (id === 'basic:rich-text') return 'text';
  if (id.startsWith('basic:')) return id.slice('basic:'.length) as SiteElement['type'];
  if (PALETTE_ELEMENT_TYPES[id]) return PALETTE_ELEMENT_TYPES[id];
  if (id === 'pro:carousel-gallery') return 'gallery';
  const item = getEditorCatalogItem(id);
  if (!item) return null;
  const label = item.label.toLowerCase();
  if (item.category === 'text') return label.includes('quote') ? 'quote' : label.includes('list') ? (label.includes('number') ? 'numbered-list' : 'list') : label.includes('badge') || label.includes('tag') ? 'badge' : 'text';
  if (item.category === 'layout') return label.includes('spacer') ? 'spacer' : label.includes('divider') ? 'divider' : label.includes('anchor') ? 'anchor' : 'block';
  if (item.category === 'forms') return 'form';
  if (item.category === 'buttons') return label.includes('social') ? 'social-links' : 'button';
  if (item.category === 'media') return label.includes('gallery') || label.includes('carousel') ? 'gallery' : label.includes('video') || label.includes('youtube') ? 'video' : label.includes('image') || label.includes('photo') || label.includes('logo') ? 'image' : 'block';
  if (item.category === 'interactive') return label.includes('accordion') ? 'accordion' : label.includes('tab') ? 'tabs' : 'block';
  return null;
};
const paletteBlockType = (id: string): string => PALETTE_BLOCK_ALIASES[id] || (id.startsWith('pro:') ? id.slice('pro:'.length) : id);
const paletteElementContent = (id: string, elementType: SiteElement['type']): Record<string, unknown> => {
  if (elementType === 'heading') return { text: 'Your heading', level: 2 };
  if (elementType === 'text') return { text: 'Write something for your visitors.' };
  if (elementType === 'button') return { text: id === 'free:text-link' ? 'Learn more' : 'Button label', href: '', linkTarget: 'url', linkValue: '', newTab: false };
  if (elementType === 'image' || elementType === 'image-caption') return { src: '', alt: '', caption: elementType === 'image-caption' ? 'Add an image caption.' : '' };
  if (elementType === 'icon') return { icon: 'Star', size: 36 };
  if (elementType === 'spacer') return { height: 48 };
  if (elementType === 'list' || elementType === 'numbered-list') return { items: ['First item', 'Second item'] };
  if (elementType === 'card') return { title: 'Card title', description: 'Add a short description.' };
  if (elementType === 'gallery') { const label = getEditorCatalogItem(id)?.label.toLowerCase() || ''; const carousel = id === 'pro:carousel-gallery' || label.includes('carousel'); return { images: [], carousel, autoplay: carousel, intervalMs: 4000, columns: 3, lightbox: true }; }
  if (elementType === 'quote') return { text: 'Add a memorable quote.', attribution: 'Name' };
  if (elementType === 'badge') return { text: 'New' };
  if (elementType === 'accordion') return { items: [{ title: 'Question', description: 'Add an answer.' }] };
  if (elementType === 'tabs') return { items: [{ title: 'Tab 1', description: 'Add tab content.' }, { title: 'Tab 2', description: 'Add tab content.' }] };
  if (elementType === 'social-links') return { items: [{ title: 'Instagram', url: 'https://instagram.com/' }, { title: 'LinkedIn', url: 'https://linkedin.com/' }] };
  if (elementType === 'form' && id === 'free:newsletter-form') return { endpoint: 'newsletter', submitLabel: 'Subscribe', fields: [{ id: 'email', name: 'email', label: 'Email', type: 'email', placeholder: 'Email address', required: true }] };
  if (elementType === 'form') { const label = getEditorCatalogItem(id)?.label.toLowerCase() || ''; return { endpoint: label.includes('newsletter') ? 'newsletter' : 'contact', submitLabel: label.includes('newsletter') ? 'Subscribe' : 'Send message', fields: label.includes('newsletter') ? [{ id: 'email', name: 'email', label: 'Email', type: 'email', placeholder: 'Email address', required: true }] : getDefaultFormFields() }; }
  return {};
};
const paletteWidgetContent = (id: string, label: string, description: string): Record<string, unknown> => {
  const key = `${id} ${label}`.toLowerCase();
  if (/sidebar menu|navbar|navigation menu|mega menu|dropdown menu|flyout menu|footer menu|mobile menu/.test(key)) return { blockType: id, title: label, description, items: [] };
  if (/product|shop|store|catalog/.test(key)) return { blockType: id, title: label, description, items: [{ title: 'Everyday essential', description: 'A carefully chosen favorite, ready for everyday use.', category: 'Featured', price: '₹1,499', image: '', href: '#product-1' }, { title: 'New season pick', description: 'A fresh addition selected by our team.', category: 'New', price: '₹899', image: '', href: '#product-2' }, { title: 'Customer favorite', description: 'A dependable choice with thoughtful details.', category: 'Popular', price: '₹2,199', image: '', href: '#product-3' }] };
  if (/blog|article|news|post|resource|download/.test(key)) return { blockType: id, title: label, description, items: [{ title: 'A useful guide for getting started', description: 'Share a clear, practical idea your readers can use today.', category: 'Guide', image: '' }, { title: 'What we learned along the way', description: 'Tell a short story and give visitors a reason to explore.', category: 'Story', image: '' }] };
  if (key.includes('skill bar') || key.includes('progress bar')) return { blockType: id, title: label, description: description || 'Show strengths and progress at a glance.', items: [{ title: 'Design', value: 90 }, { title: 'Development', value: 78 }, { title: 'Strategy', value: 84 }] };
  if (key.includes('faq') || key.includes('accordion')) return { blockType: id, title: label, description, items: [{ title: 'How does it work?', description: 'Get started in a few simple steps.' }, { title: 'Can I get help?', description: 'Our team is here to help when you need us.' }] };
  if (key.includes('stat') || key.includes('counter') || key.includes('kpi')) return { blockType: id, title: label, description, items: [{ title: 'Happy customers', value: '2,400+' }, { title: 'Years of experience', value: '12' }, { title: 'Customer rating', value: '4.9/5' }] };
  if (key.includes('feature') || key.includes('service') || key.includes('team') || key.includes('testimonial') || key.includes('review') || key.includes('logo')) return { blockType: id, title: label, description, items: [{ title: 'Thoughtful quality', description: 'Carefully made to deliver a better everyday experience.', image: '' }, { title: 'Made for you', description: 'Flexible options and friendly support, from start to finish.', image: '' }, { title: 'Trusted by our community', description: 'Real people love the difference that good details make.', image: '' }] };
  return { blockType: id, title: label, description: description || `Customize the ${label.toLowerCase()} content and appearance.`, items: [{ title: 'A clear first point', description: `Use this ${label.toLowerCase()} to share helpful information with visitors.`, image: '' }, { title: 'A useful next step', description: 'Add the detail, link, or supporting information your visitors need.', image: '' }] };
};
const withBlockDefaults = (items: Section[]) => items.map((section) => {
  if (section.content && Object.keys(section.content).length) return section;
  if (['hero', 'features', 'testimonials', 'cta'].includes(section.type)) return section;
  const definition = blockRegistry[section.type];
  return definition ? { ...section, content: structuredClone(definition.defaultContent) } : section;
});
const removeDuplicateTemplateParts = <T extends { type: string }>(items: T[]): T[] => {
  const seen = new Set<string>();
  return items.filter((section) => {
    if (!['nav', 'footer'].includes(section.type)) return true;
    if (seen.has(section.type)) return false;
    seen.add(section.type);
    return true;
  });
};

export default function EditorPage({ params }: { params: Promise<{ templateId: string }> }) {
  const { templateId } = use(params);
  const template = getTemplateById(templateId) || TEMPLATES[0];
  const isFreshCrate = template.id === 'fresh-crate';
  const isVoltGear = template.id === 'volt-gear';
  const isKuroCraft = template.id === 'kuro-craft';
  const storefrontPages = useMemo(() => isFreshCrate || isVoltGear || isKuroCraft ? createStorefrontPages(template.id, template.pages, template.products || []) : null, [isFreshCrate, isVoltGear, isKuroCraft, template.id, template.pages, template.products]);

  const [deviceMode, setDeviceMode] = useState<DeviceMode>('desktop');
  const [leftPanel, setLeftPanel] = useState<LeftPanel>('sections');
  const [leftPanelWidth, setLeftPanelWidth] = useState(248);
  const [rightPanelWidth, setRightPanelWidth] = useState(320);
  const [resizingPanel, setResizingPanel] = useState<'left' | 'right' | null>(null);
  const [paletteCategory, setPaletteCategory] = useState<'all' | EditorPaletteCategory>('all');
  const [paletteSearch, setPaletteSearch] = useState('');
  const [mobileTab, setMobileTab] = useState<MobileTab>('canvas');
  const [sections, setSections] = useState<Section[]>(() => storefrontPages?.[0]?.sections || DEFAULT_SECTIONS);
  const [sectionSpacing, setSectionSpacing] = useState<Record<string, SectionSpacing>>({});
  const [canvasElements, setCanvasElements] = useState<CanvasElement[]>([]);
  const [sitePages, setSitePages] = useState<SitePage[]>(() => storefrontPages ? storefrontPages.map((page) => ({ id: page.id, title: page.title, description: page.description, slug: page.slug === '/' ? '' : page.slug.slice(1), isHome: page.isHome, showInMenu: page.showInMenu, seoTitle: page.seoTitle, noindex: page.noindex })) : template.pages.map((name, index) => ({ id: index ? name.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'home', title: name, description: index ? `Explore ${name.toLowerCase()} at ${template.name}.` : template.description })));
  const [activePageId, setActivePageId] = useState('home');
  const [slugDrafts, setSlugDrafts] = useState<Record<string, string>>({});
  const [draggedPageId, setDraggedPageId] = useState<string | null>(null);
  const [pagePendingDelete, setPagePendingDelete] = useState<{ id: string; title: string } | null>(null);
  const [draggedMenuId, setDraggedMenuId] = useState<string | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [selectedTreeElement, setSelectedTreeElement] = useState<{ sectionId: string; columnId: string; elementId: string } | null>(null);
  const [activeDragLabel, setActiveDragLabel] = useState('');
  const [selectedSection, setSelectedSection] = useState<string | null>('hero');
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveNotice, setSaveNotice] = useState<{ tone: 'success' | 'warning' | 'error'; message: string } | null>(null);
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [exportingZip, setExportingZip] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authResolved, setAuthResolved] = useState(false);
  const [logoUrl, setLogoUrl] = useState('');
  const [faviconUrl, setFaviconUrl] = useState('');
  const [mediaAssets, setMediaAssets] = useState<SiteAsset[]>([]);
  const [mediaError, setMediaError] = useState('');
  const [mediaQuery, setMediaQuery] = useState('');
  const editorIdSeed = useId().replace(/[^a-z0-9]/gi, '');
  const editorIdCounter = useRef(0);
  const nextEditorId = (prefix: string) => { editorIdCounter.current += 1; return `${prefix}-${editorIdSeed}-${editorIdCounter.current}`; };
  const readableElementName = (element?: SiteElement) => {
    if (!element) return 'Element';
    if (element.name?.trim()) return element.name.trim();
    if (element.type === 'block' && typeof element.content.title === 'string') return element.content.title;
    return element.type.split(/[-_]/g).map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };
  // AI Prompt State
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiStep, setAiStep] = useState('');

  // Design tokens & content state
  const [theme, setTheme] = useState<Theme>({
    primaryColor: template.accent || '#FF5588',
    secondaryColor: '#111111',
    bgColor: template.bgColor || '#0F0F11',
    surfaceColor: '#FFFFFF',
    textColor: template.textColor || '#FFFFFF',
    mutedColor: '#737373',
    fontFamily: isFreshCrate ? 'DM Sans, sans-serif' : isKuroCraft ? 'Space Grotesk, sans-serif' : 'Inter, sans-serif',
    headingFont: isFreshCrate ? 'Fraunces, Georgia, serif' : isVoltGear || isKuroCraft ? 'Space Grotesk, Inter, sans-serif' : 'Inter, sans-serif',
    radius: '16px',
    borderRadius: '16px',
    buttonStyle: 'solid',
    spacingScale: 1,
    darkMode: false,
  });
  const setThemeMode = (darkMode: boolean) => setTheme((current) => ({ ...current, darkMode, bgColor: darkMode ? '#111111' : '#FFFFFF', textColor: darkMode ? '#FFFFFF' : '#111111', surfaceColor: darkMode ? '#1F1F1F' : '#FFFFFF' }));
  const [siteTitle, setSiteTitle] = useState(template.name || 'My Website');
  const [assetUrl, setAssetUrl] = useState('');

  useEffect(() => {
    let saved: { left?: number; right?: number } = {};
    try {
      saved = JSON.parse(localStorage.getItem('launchly_editor_panel_sizes') || '{}') as { left?: number; right?: number };
    } catch { /* Ignore invalid panel preferences. */ }
    const frame = window.requestAnimationFrame(() => {
      if (saved.left) setLeftPanelWidth(Math.max(190, Math.min(440, saved.left)));
      if (saved.right) setRightPanelWidth(Math.max(260, Math.min(520, saved.right)));
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);
  useEffect(() => {
    if (!resizingPanel) return;
    const previousCursor = document.body.style.cursor;
    const previousSelect = document.body.style.userSelect;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    const move = (event: PointerEvent) => {
      if (resizingPanel === 'left') setLeftPanelWidth(Math.max(190, Math.min(440, event.clientX - 56)));
      else setRightPanelWidth(Math.max(260, Math.min(520, window.innerWidth - event.clientX)));
    };
    const up = () => {
      setResizingPanel(null);
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousSelect;
      try { localStorage.setItem('launchly_editor_panel_sizes', JSON.stringify({ left: leftPanelWidth, right: rightPanelWidth })); } catch { /* Panel sizing is a convenience preference. */ }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up, { once: true });
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); document.body.style.cursor = previousCursor; document.body.style.userSelect = previousSelect; };
  }, [resizingPanel, leftPanelWidth, rightPanelWidth]);

  useEffect(() => {
    fetch('/api/auth/me').then((response) => response.json()).then((data) => {
      setIsAuthenticated(Boolean(data?.authenticated && data.user));
    }).catch(() => { setIsAuthenticated(false); }).finally(() => setAuthResolved(true));
  }, []);

  // Bespoke content state (can be updated via AI)
  const [heroContent, setHeroContent] = useState({
    badge: isFreshCrate ? 'PICKED FRESH // DELIVERED NEARBY' : isVoltGear ? 'LIMITED DROP // BUILT TO PERFORM' : isKuroCraft ? 'KURO STUDIO // ARCHIVE 2026' : `${template.category} // ${template.badge || 'FEATURED'}`,
    title: isFreshCrate ? 'Good food starts close to home.' : isVoltGear ? 'Gear up for what is next.' : isKuroCraft ? 'Designing interfaces that redefine utility.' : template.name,
    description: isFreshCrate ? 'Seasonal produce and pantry favorites, sourced from nearby farms and delivered on your schedule.' : isVoltGear ? 'Thoughtful technology, tested specs, and limited releases for work, play, and everything between.' : isKuroCraft ? 'Multi-disciplinary design director partnering with high-velocity venture teams to ship category-defining software.' : template.description,
    ctaPrimary: isFreshCrate ? 'Build your crate' : isVoltGear ? 'Explore the latest drop' : isKuroCraft ? 'Explore Selected Works' : 'Launch Experience',
    ctaSecondary: isFreshCrate ? 'How delivery works' : isVoltGear ? 'Compare products' : isKuroCraft ? 'Initiate Inquiry' : 'Documentation',
    stat1Label: isFreshCrate ? 'LOCAL FARM PARTNERS' : isVoltGear ? 'DROP READY' : isKuroCraft ? 'RECOGNITION' : 'RUNTIME VELOCITY',
    stat1Value: isFreshCrate ? '24 nearby farms' : isVoltGear ? '12 tested picks' : isKuroCraft ? '3× FWA · 2× SOTD' : '4.2M Tokens/s',
    stat2Label: isFreshCrate ? 'FROM HARVEST TO DOOR' : isVoltGear ? 'EASY RETURNS' : isKuroCraft ? 'AVAILABILITY' : 'ZERO-SHOT BENCHMARK',
    stat2Value: isFreshCrate ? 'Same-day slots' : isVoltGear ? '30-day window' : isKuroCraft ? 'Q1/Q2 2026' : '99.98% SLA',
  });

  const initialFeatures = template.features.map((title) => ({
    title,
    desc: `${title} is thoughtfully integrated into the ${template.name} experience.`,
  }));
  const [featuresContent, setFeaturesContent] = useState(initialFeatures);

  const [testimonialsContent, setTestimonialsContent] = useState(
    isKuroCraft
      ? [
          { quote: 'One of the sharpest interface designers in the entire ecosystem. The design system paid for itself in month one.', name: 'Guillermo R.', role: 'CEO at Vercel alumni' },
          { quote: 'Turned our fragmented UI into a unified, award-winning application in under six weeks.', name: 'Elena V.', role: 'VP of Product at Linear partner' },
        ]
      : [
          template.topReview
            ? { quote: template.topReview.comment, name: template.topReview.author, role: template.topReview.role }
            : { quote: `${template.name} gave our store the premium experience we wanted.`, name: 'Alex Morgan', role: 'Store owner' },
          { quote: `${template.name} made it easy to present our products beautifully and serve customers on every screen.`, name: 'Jamie Lee', role: 'Brand director' },
        ]
  );

  const [ctaContent, setCtaContent] = useState({
    title: isFreshCrate ? 'Make this week a little fresher.' : isVoltGear ? 'Find the setup that fits you.' : isKuroCraft ? 'Have an ambitious project in mind?' : `Discover ${template.name}.`,
    desc: isFreshCrate ? 'Choose your favorites, pick a delivery window, and we will bring your crate to the door.' : isVoltGear ? 'Compare the details, build a bundle, and get your next essential ready for the drop.' : isKuroCraft ? 'Let’s discuss your vision, system architecture, and launch timeline.' : `Explore the ${template.name} collection and find your next favorite.`,
    buttonText: isFreshCrate ? 'Shop this week’s harvest →' : isVoltGear ? 'Build your setup →' : isKuroCraft ? 'Initiate Project Conversation →' : 'Shop the collection →',
  });

  const [editorStore] = useState(() => createEditorStore(createSiteDocument({
    id: template.id, name: siteTitle, templateId: template.id, theme,
    sections: withBlockDefaults(sections), sectionSpacing, elements: canvasElements, pages: storefrontPages || sitePages,
    hero: heroContent, features: featuresContent, testimonials: testimonialsContent, cta: ctaContent,
    assetUrl, logoUrl, faviconUrl, assets: mediaAssets,
  })));
  const editorDocument = useStore(editorStore, (state) => state.document);
  const saveStatus = useStore(editorStore, (state) => state.saveStatus);
  const lastSavedAt = useStore(editorStore, (state) => state.lastSavedAt);
  const undoCount = useStore(editorStore, (state) => state.past.length);
  const redoCount = useStore(editorStore, (state) => state.future.length);
  const versions = useStore(editorStore, (state) => state.versions);
  const previousSaveStatus = useRef(saveStatus);
  useEffect(() => {
    if (previousSaveStatus.current === saveStatus) return;
    previousSaveStatus.current = saveStatus;
    if (saveStatus === 'saved') {
      const timer = window.setTimeout(() => {
        setSaveNotice({ tone: 'success', message: 'All changes saved' });
        window.setTimeout(() => setSaveNotice(null), 2600);
      }, 0);
      return () => window.clearTimeout(timer);
    }
    if (saveStatus === 'offline') {
      const timer = window.setTimeout(() => setSaveNotice({ tone: 'warning', message: 'Saved locally · server unavailable' }), 0);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [saveStatus]);
  // Guard ref: prevents the sync useEffect from re-committing to the store during undo/redo restoration
  const isRestoringRef = useRef(false);
  const dragSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const documentFromState = useCallback((source: {
    theme: typeof theme; siteTitle: string; heroContent: typeof heroContent; featuresContent: typeof featuresContent;
    testimonialsContent: typeof testimonialsContent; ctaContent: typeof ctaContent; sections: Section[];
    sectionSpacing: Record<string, SectionSpacing>; canvasElements: CanvasElement[]; sitePages: SitePage[];
    assetUrl: string; logoUrl: string; faviconUrl: string; mediaAssets: SiteAsset[];
  }): SiteDocument => createSiteDocument({
    id: template.id, name: source.siteTitle, templateId: template.id, theme: source.theme,
      sections: withBlockDefaults(source.sections), sectionSpacing: source.sectionSpacing, elements: source.canvasElements, pages: source.sitePages,
    hero: source.heroContent, features: source.featuresContent, testimonials: source.testimonialsContent, cta: source.ctaContent,
    assetUrl: source.assetUrl, logoUrl: source.logoUrl, faviconUrl: source.faviconUrl, assets: source.mediaAssets,
  }), [template.id]);

  const [isHistoryReady, setHistoryReady] = useState(false);
  const [serverDraftReady, setServerDraftReady] = useState(false);
  // Draft restoration is an external-storage synchronization on mount.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [savedSite, savedVersions] = await Promise.all([loadEditorDraft(template.id), loadEditorVersions(template.id)]);
        if (cancelled) return;
        if (savedVersions.length) editorStore.getState().setVersions(savedVersions);
        if (savedSite) {
        const migratedDocument = migrateSiteDocument(savedSite, editorStore.getState().document);
        const migrated = { ...migratedDocument, pages: migratedDocument.pages.map((page) => ({ ...page, sections: removeDuplicateTemplateParts(page.sections) })) };
        editorStore.getState().replaceDocument(migrated);
        setTheme(migrated.theme);
        setSiteTitle(migrated.name);
        // v4: extract content from sections, not from document.content
        const homePageSections = migrated.pages.find((page) => page.isHome)?.sections || [];
        const heroSection = homePageSections.find((section) => section.type === 'hero');
        const featuresSection = homePageSections.find((section) => section.type === 'features');
        const testimonialsSection = homePageSections.find((section) => section.type === 'testimonials');
        const ctaSection = homePageSections.find((section) => section.type === 'cta');
        if (heroSection?.content && Object.keys(heroSection.content).length) setHeroContent((current) => ({ ...current, ...heroSection.content }));
        if (Array.isArray(featuresSection?.content?.items)) setFeaturesContent(featuresSection.content.items as typeof featuresContent);
        if (Array.isArray(testimonialsSection?.content?.items)) setTestimonialsContent(testimonialsSection.content.items as typeof testimonialsContent);
        if (ctaSection?.content && Object.keys(ctaSection.content).length) setCtaContent((current) => ({ ...current, ...ctaSection.content }) as typeof ctaContent);
        const homePage = migrated.pages.find((page) => page.isHome) || migrated.pages[0];
        if (homePage?.sections.length) setSections(homePage.sections.map((section) => ({ ...section })));
        setSectionSpacing(Object.fromEntries(migrated.pages.flatMap((page) => page.sections.filter((section) => section.style?.padding).map((section) => [section.id, { top: section.style?.padding?.top || 0, right: section.style?.padding?.right || 0, bottom: section.style?.padding?.bottom || 0, left: section.style?.padding?.left || 0 }]))));
        setCanvasElements(homePage?.elements || []);
        setSitePages(migrated.pages.map((page) => ({ id: page.isHome ? 'home' : page.id, title: page.title, description: page.seo.description, slug: page.slug.replace(/^\//, ''), isHome: page.isHome, showInMenu: page.showInMenu, noindex: page.seo.noindex, ogImage: page.seo.ogImage, seoTitle: page.seo.title, useSharedHeader: page.useSharedHeader, useSharedFooter: page.useSharedFooter, oldSlugs: page.oldSlugs })));
        setActivePageId(homePage?.id || 'home');
        setAssetUrl(migrated.assets.find((asset) => asset.role === 'product')?.src || '');
        setLogoUrl(migrated.assets.find((asset) => asset.role === 'logo')?.src || '');
        setFaviconUrl(migrated.assets.find((asset) => asset.role === 'favicon')?.src || '');
        setMediaAssets(migrated.assets.filter((asset) => asset.role === 'image' || asset.role === 'icon'));
        }
      } catch { /* Ignore malformed local drafts and keep template defaults. */ }
      finally { if (!cancelled) setHistoryReady(true); }
    })();
    return () => { cancelled = true; };
  // Load once for each selected template.
  }, [template.id, editorStore]);

  useEffect(() => {
    if (!isHistoryReady || !serverDraftReady) return;
    // Skip sync when a restore (undo/redo) is in progress to prevent the loop:
    // undo → applyDocumentToEditor → setSections → this effect → updateDocument → new undo entry
    if (isRestoringRef.current) {
      isRestoringRef.current = false;
      return;
    }
    const nextDocument = documentFromState({ theme, siteTitle, heroContent, featuresContent, testimonialsContent, ctaContent, sections, sectionSpacing, canvasElements, sitePages, assetUrl, logoUrl, faviconUrl, mediaAssets });
    editorStore.getState().updateDocument((current) => {
      const merged = mergeEditorProjection(current, nextDocument, activePageId);
      return JSON.stringify(current) === JSON.stringify(merged) ? current : merged;
    }, 'editor-sync');
  }, [isHistoryReady, serverDraftReady, editorStore, documentFromState, theme, siteTitle, heroContent, featuresContent, testimonialsContent, ctaContent, sections, sectionSpacing, canvasElements, sitePages, assetUrl, logoUrl, faviconUrl, mediaAssets, activePageId]);

  useEffect(() => {
    if (!isHistoryReady || !serverDraftReady) return;
    editorStore.getState().setSaveStatus('unsaved');
    const timer = window.setTimeout(async () => {
      const currentDocument = editorStore.getState().document;
      const latestVersion = editorStore.getState().versions.at(-1);
      if (!latestVersion || (Date.now() - Date.parse(latestVersion.createdAt) > 5 * 60 * 1000 && JSON.stringify(latestVersion.document) !== JSON.stringify(currentDocument))) {
        editorStore.getState().captureVersion('Autosave');
        void saveEditorVersions(template.id, editorStore.getState().versions);
      }
      editorStore.getState().setSaveStatus('saving');
      await saveEditorDraft(template.id, currentDocument);
      if (!isAuthenticated) {
        editorStore.getState().setSaveStatus('saved', new Date().toISOString());
        return;
      }
      try {
        const response = await fetch('/api/sites/draft', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ document: currentDocument }) });
        editorStore.getState().setSaveStatus(response.ok ? 'saved' : 'offline', new Date().toISOString());
      } catch { editorStore.getState().setSaveStatus('offline'); }
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [editorDocument, isHistoryReady, serverDraftReady, editorStore, template.id, isAuthenticated]);
  const applyDocumentToEditor = useCallback((document: SiteDocument, requestedPageId = activePageId) => {
    const page = document.pages.find((entry) => entry.id === requestedPageId) || document.pages.find((entry) => entry.isHome) || document.pages[0];
    if (!page) return;
    // Set the restoring flag BEFORE any state setters so the sync useEffect skips this cycle
    isRestoringRef.current = true;
    setActivePageId(page.id);
    setTheme(document.theme);
    setSiteTitle(document.name);
    // In v4 we extract content directly from each section; no more shared document.content
    const heroSection = page.sections.find((section) => section.type === 'hero');
    const featuresSection = page.sections.find((section) => section.type === 'features');
    const testimonialsSection = page.sections.find((section) => section.type === 'testimonials');
    const ctaSection = page.sections.find((section) => section.type === 'cta');
    if (heroSection?.content && Object.keys(heroSection.content).length) {
      setHeroContent((current) => ({ ...current, ...heroSection.content }));
    }
    if (Array.isArray(featuresSection?.content?.items)) {
      setFeaturesContent(featuresSection.content.items as typeof featuresContent);
    }
    if (Array.isArray(testimonialsSection?.content?.items)) {
      setTestimonialsContent(testimonialsSection.content.items as typeof testimonialsContent);
    }
    if (ctaSection?.content && Object.keys(ctaSection.content).length) {
      setCtaContent((current) => ({ ...current, ...ctaSection.content }) as typeof ctaContent);
    }
    const restoredSections = removeDuplicateTemplateParts(page.sections.map((section) => ({ ...section })));
    const homeSections = document.pages.find((entry) => entry.isHome)?.sections || [];
    if (page.useSharedHeader && !restoredSections.some((section) => section.type === 'nav')) {
      const sharedNav = homeSections.find((section) => section.type === 'nav');
      restoredSections.unshift(sharedNav
        ? { ...structuredClone(sharedNav), id: `${page.id}-navigation`, name: 'Navigation' }
        : makeSection('nav', `${page.id}-navigation`, 'Navigation', {}, blockRegistry.nav.defaultContent));
    }
    if (page.useSharedFooter && !restoredSections.some((section) => section.type === 'footer')) {
      const sharedFooter = homeSections.find((section) => section.type === 'footer');
      restoredSections.push(sharedFooter
        ? { ...structuredClone(sharedFooter), id: `${page.id}-footer`, name: 'Footer' }
        : makeSection('footer', `${page.id}-footer`, 'Footer', {}, blockRegistry.footer.defaultContent));
    }
    setSections(restoredSections);
    setSectionSpacing(Object.fromEntries(page.sections.filter((section) => section.style?.padding).map((section) => [section.id, { top: section.style?.padding?.top || 0, right: section.style?.padding?.right || 0, bottom: section.style?.padding?.bottom || 0, left: section.style?.padding?.left || 0 }])));
    setCanvasElements((page.elements || []) as CanvasElement[]);
    setSitePages(document.pages.map((entry) => ({ id: entry.isHome ? 'home' : entry.id, title: entry.title, description: entry.seo?.description || '', slug: (entry.slug || '/').replace(/^\//, ''), isHome: entry.isHome, showInMenu: entry.showInMenu, noindex: entry.seo?.noindex || false, ogImage: entry.seo?.ogImage || '', seoTitle: entry.seo?.title || entry.title, useSharedHeader: entry.useSharedHeader, useSharedFooter: entry.useSharedFooter, oldSlugs: entry.oldSlugs })));
    setAssetUrl(document.assets.find((asset) => asset.role === 'product')?.src || '');
    setLogoUrl(document.assets.find((asset) => asset.role === 'logo')?.src || '');
    setFaviconUrl(document.assets.find((asset) => asset.role === 'favicon')?.src || '');
    setMediaAssets(document.assets.filter((asset) => asset.role === 'image' || asset.role === 'icon'));
  }, [activePageId, setActivePageId, setTheme, setSiteTitle, setHeroContent, setFeaturesContent, setTestimonialsContent, setCtaContent, setSections, setSectionSpacing, setCanvasElements, setSitePages, setAssetUrl, setLogoUrl, setFaviconUrl, setMediaAssets]);

  const serverDraftLookupStarted = useRef(false);
  useEffect(() => {
    if (!isHistoryReady || !authResolved || serverDraftLookupStarted.current) return;
    serverDraftLookupStarted.current = true;
    let cancelled = false;
    void loadEditorDraft(template.id).then((localDraft) => {
      if (cancelled) return;
      if (localDraft) { setServerDraftReady(true); return; }
      if (!isAuthenticated) { setServerDraftReady(true); return; }
    const subdomain = siteTitle.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || template.id;
    fetch(`/api/sites/draft?subdomain=${encodeURIComponent(subdomain)}`)
      .then((response) => response.ok ? response.json() : null)
      .then((result) => {
        if (!result?.document) return;
        const restored = migrateSiteDocument(result.document, editorStore.getState().document);
        editorStore.getState().replaceDocument(restored);
        applyDocumentToEditor(restored);
      })
      .catch(() => editorStore.getState().setSaveStatus('offline'))
      .finally(() => { if (!cancelled) setServerDraftReady(true); });
    }).catch(() => { if (!cancelled) setServerDraftReady(true); });
    return () => { cancelled = true; };
  }, [isHistoryReady, authResolved, isAuthenticated, siteTitle, template.id, editorStore, applyDocumentToEditor]);

  const handleUndo = useCallback(() => {
    if (!editorStore.getState().canUndo()) return;
    editorStore.getState().undo();
    applyDocumentToEditor(editorStore.getState().document);
  }, [editorStore, applyDocumentToEditor]);

  const handleRedo = useCallback(() => {
    if (!editorStore.getState().canRedo()) return;
    editorStore.getState().redo();
    applyDocumentToEditor(editorStore.getState().document);
  }, [editorStore, applyDocumentToEditor]);

  // Keyboard shortcut listener for Ctrl+Z and Ctrl+Y
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Section Reordering
  const moveSection = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sections.length) return;
    const reordered = [...sections];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);
    setSections(reordered);
  };

  const removeDuplicateBlocks = () => {
    setSections((current) => {
      const seen = new Set<string>();
      return current.filter((section) => {
        if (seen.has(section.type)) return false;
        seen.add(section.type);
        return true;
      });
    });
  };

  const addCanvasElement = (type: CanvasElement['type']) => {
    const id = `element-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const item: CanvasElement = { id, type, name: type === 'image' ? 'Image' : 'Icon', src: '', icon: 'Star', x: 32, y: 120 + canvasElements.length * 32, width: type === 'image' ? 240 : 72, height: type === 'image' ? 160 : 72 };
    setCanvasElements((current) => [...current, item]);
    setSelectedElementId(id);
  };
  const updateCanvasElement = (id: string, patch: Partial<CanvasElement>) => setCanvasElements((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item));
  const readLocalImageFile = (file: File | undefined, onLoaded: (src: string) => void) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { setMediaError('Choose an image file.'); return; }
    const maxBytes = 5 * 1024 * 1024;
    if (file.size > maxBytes) { setMediaError('This image exceeds the 5 MB per-file editor limit.'); return; }
    const reader = new FileReader();
    reader.onerror = () => setMediaError(`Could not read ${file.name}.`);
    reader.onload = () => { setMediaError(''); onLoaded(String(reader.result || '')); };
    reader.readAsDataURL(file);
  };
  const readElementUpload = (id: string, file?: File) => {
    if (!file) return;
    readLocalImageFile(file, (src) => updateCanvasElement(id, { src, name: file.name }));
  };

  // 1-Click ZIP Export
  const handleExportZip = async () => {
    setExportingZip(true);
    try {
      const blob = await exportTemplateAsZip({
        siteTitle,
        templateId: template.id,
        theme,
        heroContent,
        featuresContent,
        testimonialsContent,
        ctaContent,
        sectionOrder: sections.map((s) => s.id),
        assetUrl,
        logoUrl,
        faviconUrl,
        pages: sitePages.map((page) => page.title),
        sitePages,
        sectionSpacing,
        canvasElements,
        document: editorDocument,
        sectionNames: Object.fromEntries(sections.map((section) => [section.type, section.name])),
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${siteTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'launchly-site'}-nextjs.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('ZIP Export Error:', err);
    } finally {
      setExportingZip(false);
    }
  };

  // Floating Inline Formatting Toolbar State
  const [toolbarPos, setToolbarPos] = useState<{ x: number; y: number } | null>(null);
  const [formatSectionId, setFormatSectionId] = useState<string | null>(null);

  useEffect(() => {
    const handleSelectionChange = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.toString().trim()) {
        setToolbarPos(null);
        return;
      }
      try {
        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        if (rect && rect.width > 0 && rect.height > 0) {
          const canvasEl = document.querySelector('[data-canvas-frame]');
          if (canvasEl && canvasEl.contains(range.commonAncestorContainer)) {
            const node = range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE ? range.commonAncestorContainer as Element : range.commonAncestorContainer.parentElement;
            setFormatSectionId(node?.closest('[data-section-id]')?.getAttribute('data-section-id') || null);
            const width = 160;
            const x = Math.min(Math.max(8, rect.left + rect.width / 2 - width / 2), window.innerWidth - width - 8);
            const y = rect.top >= 54 ? rect.top - 48 : rect.bottom + 8;
            setToolbarPos({
              x,
              y: Math.max(8, Math.min(y, window.innerHeight - 48)),
            });
            return;
          }
        }
      } catch {}
      setToolbarPos(null);
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, []);

  const applyFormat = (command: string, value: string | undefined = undefined) => {
    const targetSectionId = formatSectionId || selectedSection;
    if (!targetSectionId) return;
    const changes: Partial<SectionStyle> = command === 'bold' ? { fontWeight: 700 }
      : command === 'italic' ? { fontStyle: 'italic' }
        : command === 'underline' ? { textDecoration: 'underline' }
          : command === 'hiliteColor' ? { highlightColor: value || '#FFD600' }
            : { fontWeight: 400, fontStyle: 'normal', textDecoration: 'none', highlightColor: undefined };
    setSections((items) => items.map((item) => item.id === targetSectionId ? { ...item, style: { ...item.style, ...changes } } : item));
  };

  const handleSave = async () => {
    setSaving(true);
    editorStore.getState().setSaveStatus('saving');
    try {
      await saveEditorDraft(template.id, editorStore.getState().document);
      const response = isAuthenticated ? await fetch('/api/sites/draft', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ document: editorStore.getState().document }) }) : null;
      editorStore.getState().setSaveStatus(!response || response.ok ? 'saved' : 'offline', new Date().toISOString());
      editorStore.getState().captureVersion('Manual save');
      await saveEditorVersions(template.id, editorStore.getState().versions);
    } catch { editorStore.getState().setSaveStatus('offline'); }
    await new Promise(r => setTimeout(r, 600));
    setSaving(false);
  };

  const handleAiGenerate = async (promptToUse?: string) => {
    const prompt = (promptToUse || aiPrompt).trim();
    if (!prompt) return;

    setAiGenerating(true);
    setAiStep('Analyzing aesthetic direction...');

    try {
      setTimeout(() => setAiStep('Synthesizing color palette & typography tokens...'), 500);
      setTimeout(() => setAiStep('Drafting high-converting copy & telemetry...'), 1100);

      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, templateId: template.id }),
      });
      const data = await res.json();

      if (data.success && data.design) {
        const d = data.design;
        setSiteTitle(d.siteTitle);
        setTheme((current) => ({ ...current, ...d.theme }));
        setHeroContent(d.hero);
        if (d.features?.length) setFeaturesContent(d.features);
        if (d.testimonials?.length) setTestimonialsContent(d.testimonials);
        if (d.cta) setCtaContent(d.cta);
      }
    } catch {
      // Graceful fallback
    } finally {
      setAiStep('Applying design to canvas...');
      setTimeout(() => {
        setAiGenerating(false);
        setAiStep('');
        setShowAiModal(false);
      }, 600);
    }
  };

  const addPaletteItem = (type: string, indexOverride?: number) => {
    const id = nextEditorId(`section-${type.replace(/[^a-z0-9]+/gi, '-')}`);
    let section: Section;
    const blockType = paletteBlockType(type);
    const catalogItem = getEditorCatalogItem(type);
    if (blockRegistry[blockType]) {
      section = makeSection(blockType, id, blockRegistry[blockType].label, {}, blockRegistry[blockType].defaultContent);
    } else {
      const layoutMatch = type.match(/^layout:columns-(\d)$/);
      const columnCount = layoutMatch ? Number(layoutMatch[1]) : 1;
      const elementType = paletteElementType(type);
      const columns: Column[] = Array.from({ length: columnCount }, (_, index) => ({
        id: `${id}-column-${index + 1}`,
        width: { desktop: Math.floor(12 / columnCount), tablet: columnCount > 2 ? 6 : Math.floor(12 / columnCount), mobile: 12 },
        style: {},
        elements: (elementType || (catalogItem && !type.startsWith('layout:'))) && index === 0 ? [{
          id: `${id}-${elementType || 'content'}`,
          type: elementType || 'block',
          name: catalogItem?.label || (elementType ? elementType.split(/[-_]/g).map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') : 'Content'),
          content: elementType ? paletteElementContent(type, elementType) : paletteWidgetContent(type, catalogItem?.label || 'Content block', catalogItem?.description || ''),
          style: {},
        }] : [],
      }));
      const sectionName = layoutMatch ? `${columnCount} column layout` : elementType ? elementType.charAt(0).toUpperCase() + elementType.slice(1) : catalogItem?.label || 'Section';
      const sectionAnimation = type === 'free:scroll-fade' ? 'fade-in' : type === 'free:scroll-slide' ? 'slide-up' : undefined;
      section = { ...makeSection('custom', id, sectionName, { animation: sectionAnimation }, { heading: sectionName, description: catalogItem?.description || '' }), columns };
    }
    const selectedIndex = sections.findIndex((entry) => entry.id === selectedSection);
    const index = indexOverride ?? (selectedIndex < 0 ? sections.length : selectedIndex + 1);
    editorStore.getState().insertSection(activePageId, section as SiteDocument['pages'][number]['sections'][number], index);
    applyDocumentToEditor(editorStore.getState().document, activePageId);
    setSelectedSection(section.id);
    setSelectedTreeElement(section.columns?.[0]?.elements[0] ? { sectionId: section.id, columnId: section.columns[0].id, elementId: section.columns[0].elements[0].id } : null);
  };

  const removeSection = (id: string) => {
    setSections(prev => prev.filter(s => s.id !== id));
    if (selectedSection === id) setSelectedSection(null);
  };

  const switchPage = (pageId: string) => {
    const document = editorStore.getState().document;
    if (document.pages.some((page) => page.id === pageId)) applyDocumentToEditor(document, pageId);
  };
  const addSitePage = (duplicateId?: string) => {
    const store = editorStore.getState();
    let newId: string | null;
    if (duplicateId) newId = store.duplicatePage(duplicateId);
    else newId = store.addPage('New Page', [makeSection('hero', `hero-${Date.now()}`, 'Hero', {}, { title: 'New Page', description: 'Add a page introduction.' }), makeSection('cta', `cta-${Date.now()}`, 'Call to Action')]);
    if (newId) applyDocumentToEditor(editorStore.getState().document, newId);
  };
  const addPageFromTemplate = (preset: string) => {
    const presets: Record<string, Array<{ type: string; name?: string }>> = {
      About: [{ type: 'hero' }, { type: 'rich-text', name: 'Our story' }, { type: 'team' }, { type: 'cta' }],
      Services: [{ type: 'hero' }, { type: 'features' }, { type: 'steps' }, { type: 'cta' }],
      Pricing: [{ type: 'hero' }, { type: 'pricing' }, { type: 'faq' }, { type: 'cta' }],
      Contact: [{ type: 'hero' }, { type: 'contact' }, { type: 'newsletter' }],
      FAQ: [{ type: 'hero' }, { type: 'faq' }, { type: 'contact' }],
      Blog: [{ type: 'hero' }, { type: 'rich-text', name: 'Latest stories' }, { type: 'newsletter' }],
      Portfolio: [{ type: 'hero' }, { type: 'gallery' }, { type: 'testimonials' }, { type: 'contact' }],
      Privacy: [{ type: 'hero' }, { type: 'rich-text', name: 'Privacy policy' }],
      '404': [{ type: 'hero', name: 'Page not found' }, { type: 'cta' }],
    };
    const sections = (presets[preset] || presets.About).map((block, index) => makeSection(block.type, `${preset.toLowerCase()}-${block.type}-${Date.now()}-${index}`, block.name || blockRegistry[block.type]?.label, {}, blockRegistry[block.type]?.defaultContent || {}));
    const pageId = editorStore.getState().addPage(preset, sections);
    applyDocumentToEditor(editorStore.getState().document, pageId);
  };
  const deleteSitePage = (pageId: string) => {
    const page = editorStore.getState().document.pages.find((entry) => entry.id === pageId);
    if (page && !page.isHome && page.id !== 'home') setPagePendingDelete(page);
  };
  const confirmDeleteSitePage = () => {
    if (!pagePendingDelete) return;
    if (editorStore.getState().removePage(pagePendingDelete.id)) switchPage('home');
    setPagePendingDelete(null);
  };
  const updatePage = (pageId: string, patch: Partial<SitePage>) => setSitePages((items) => items.map((page) => page.id === pageId ? { ...page, ...patch } : page));
  const changePageSlug = (pageId: string, rawSlug: string) => {
    const slug = editorStore.getState().setPageSlug(pageId, rawSlug);
    updatePage(pageId, { slug: slug.replace(/^\//, '') });
  };
  const uploadMediaFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setMediaError('');
    const additions = Array.from(files);
    const maxTotal = 8 * 1024 * 1024;
    const currentBytes = mediaAssets.reduce((total, asset) => total + (asset.sizeBytes || 0), 0);
    const addedBytes = additions.reduce((total, file) => total + file.size, 0);
    if (currentBytes + addedBytes > maxTotal) {
      setMediaError('Local media is limited to 8 MB total in this editor. Remove an image or use a smaller file.');
      return;
    }
    if (additions.some((file) => !file.type.startsWith('image/'))) { setMediaError('Choose image files only.'); return; }
    try {
      const assets = await Promise.all(additions.map((file) => new Promise<SiteAsset>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
        reader.onload = () => {
          const src = String(reader.result || '');
          const preview = new window.Image();
          const asset: SiteAsset = { id: `image-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name: file.name, role: 'image', src, alt: file.name.replace(/\.[^.]+$/, ''), sizeBytes: file.size };
          preview.onload = () => resolve({ ...asset, width: preview.naturalWidth, height: preview.naturalHeight });
          preview.onerror = () => resolve(asset);
          preview.src = src;
        };
        reader.readAsDataURL(file);
      })));
      setMediaAssets((current) => [...current, ...assets]);
    } catch (error) { setMediaError(error instanceof Error ? error.message : 'Upload failed.'); }
  };
  const deleteMediaAsset = (asset: SiteAsset) => {
    const used = asset.src === assetUrl || asset.src === logoUrl || asset.src === faviconUrl || JSON.stringify({ sections, canvasElements }).includes(asset.src);
    if (used && !window.confirm(`${asset.name} is currently used by this site. Delete it anyway?`)) return;
    if (asset.src === assetUrl) setAssetUrl('');
    if (asset.src === logoUrl) setLogoUrl('');
    if (asset.src === faviconUrl) setFaviconUrl('');
    const stripSource = (value: unknown): unknown => value === asset.src ? '' : Array.isArray(value) ? value.map(stripSource) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, stripSource(nested)])) : value;
    setSections((items) => items.map((item) => ({ ...item, content: item.content ? stripSource(item.content) as Record<string, unknown> : item.content })));
    setCanvasElements((items) => items.map((item) => item.src === asset.src ? { ...item, src: '' } : item));
    setMediaAssets((items) => items.filter((entry) => entry.id !== asset.id));
  };
  const currentPage = sitePages.find((page) => page.id === activePageId) || sitePages[0];
  const selectedTreeElementRecord = selectedTreeElement
    ? sections.find((section) => section.id === selectedTreeElement.sectionId)?.columns?.find((column) => column.id === selectedTreeElement.columnId)?.elements.find((element) => element.id === selectedTreeElement.elementId)
    : undefined;
  const paletteItems = editorCatalog.filter((item) => paletteCategory === 'all' || item.category === paletteCategory);
  const filteredPaletteItems = paletteItems.filter((item) => `${item.label} ${item.description}`.toLowerCase().includes(paletteSearch.toLowerCase()));
  const updateMenuItem = (id: string, update: (item: (typeof editorDocument.menu)[number]) => (typeof editorDocument.menu)[number]) => {
    editorStore.getState().setMenu(editorStore.getState().document.menu.map((item) => item.id === id ? update(item) : item));
  };
  const reorderMenuItem = (id: string, targetIndex: number) => {
    const menu = [...editorStore.getState().document.menu];
    const index = menu.findIndex((item) => item.id === id);
    if (index < 0 || targetIndex < 0 || targetIndex >= menu.length) return;
    const [item] = menu.splice(index, 1);
    menu.splice(targetIndex, 0, item);
    editorStore.getState().setMenu(menu);
  };

  const handleEditorDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current;
    const section = typeof data?.sectionId === 'string' ? sections.find((item) => item.id === data.sectionId) : undefined;
    const element = typeof data?.elementId === 'string' ? section?.columns?.flatMap((column) => column.elements).find((item) => item.id === data.elementId) : undefined;
    setActiveDragLabel(String(data?.label || (data?.kind === 'section' ? section?.name : undefined) || (data?.kind === 'element' ? readableElementName(element) : undefined) || data?.type || 'Moving item'));
  };
  const handleEditorDragEnd = (event: DragEndEvent) => {
    setActiveDragLabel('');
    const { active, over } = event;
    if (!over) return;
    const activeData = active.data.current;
    const overData = over.data.current;
    if (activeData?.kind === 'palette' && typeof activeData.type === 'string') {
      if (overData?.kind === 'column-drop' && typeof overData.sectionId === 'string' && typeof overData.columnId === 'string') {
        const basicType = paletteElementType(activeData.type);
        const block = blockRegistry[paletteBlockType(activeData.type)];
        const catalogItem = getEditorCatalogItem(activeData.type);
        const element: SiteElement = { id: nextEditorId('element'), type: basicType || 'block', name: catalogItem?.label || (basicType || block?.type || 'Element'), content: basicType ? paletteElementContent(activeData.type, basicType) : catalogItem ? paletteWidgetContent(activeData.type, catalogItem.label, catalogItem.description) : { blockType: block?.type || activeData.type, ...(block?.defaultContent || {}) }, style: {} };
        editorStore.getState().insertElement(activePageId, overData.sectionId, overData.columnId, element, Number(overData.index) || 0);
        applyDocumentToEditor(editorStore.getState().document, activePageId);
        setSelectedTreeElement({ sectionId: overData.sectionId, columnId: overData.columnId, elementId: element.id });
        return;
      }
      const insertionIndex = overData?.kind === 'section-drop' || overData?.kind === 'section' ? Number(overData.index) : sections.length;
      addPaletteItem(activeData.type, insertionIndex);
      return;
    }
    if (activeData?.kind === 'element' && typeof activeData.sectionId === 'string' && typeof activeData.columnId === 'string' && typeof activeData.elementId === 'string') {
      if (!sections.some((section) => section.id === activeData.sectionId)) return;
      if (overData?.kind === 'column-drop' && typeof overData.sectionId === 'string' && typeof overData.columnId === 'string') {
        editorStore.getState().moveElement(activePageId, activeData.sectionId, activeData.columnId, activeData.elementId, overData.sectionId, overData.columnId, Number(overData.index) || 0);
      } else if (overData?.kind === 'element' && overData.sectionId === activeData.sectionId && typeof overData.columnId === 'string' && typeof overData.elementId === 'string') {
        const targetIndex = Number(overData.index) + (activeData.columnId === overData.columnId && Number(activeData.index) < Number(overData.index) ? 0 : 1);
        editorStore.getState().moveElement(activePageId, activeData.sectionId, activeData.columnId, activeData.elementId, overData.sectionId, overData.columnId, targetIndex);
      } else if (overData?.kind === 'section-drop' && typeof overData.index === 'number') {
        const page = editorStore.getState().document.pages.find((entry) => entry.id === activePageId);
        const targetSection = page?.sections[Math.min(overData.index, Math.max(0, (page?.sections.length || 1) - 1))];
        const targetColumn = targetSection?.columns?.[0];
        if (targetSection && targetColumn) editorStore.getState().moveElement(activePageId, activeData.sectionId, activeData.columnId, activeData.elementId, targetSection.id, targetColumn.id, targetColumn.elements.length);
      }
      applyDocumentToEditor(editorStore.getState().document, activePageId);
      return;
    }
    if (activeData?.kind === 'section' && typeof activeData.sectionId === 'string' && typeof overData?.index === 'number') {
      const page = editorStore.getState().document.pages.find((entry) => entry.id === activePageId);
      const sourceIndex = page?.sections.findIndex((section) => section.id === activeData.sectionId) ?? -1;
      if (sourceIndex < 0) return;
      const targetIndex = overData.index;
      if (sourceIndex === targetIndex) return;
      editorStore.getState().reorderSection(activePageId, activeData.sectionId, targetIndex);
      applyDocumentToEditor(editorStore.getState().document, activePageId);
    }
  };

  return (
    <DndContext id={`launchly-editor-${templateId}`} sensors={dragSensors} collisionDetection={closestCenter} onDragStart={handleEditorDragStart} onDragEnd={handleEditorDragEnd} onDragCancel={() => setActiveDragLabel('')}>
    <div className="h-screen flex flex-col bg-[#FAF9F6] text-[#0F0F11] overflow-hidden">
      {/* Neo-brutalist Top Toolbar - Fully Responsive */}
      <header className="h-14 sm:h-16 bg-white border-b-[3px] border-black flex items-center justify-between px-2.5 sm:px-5 z-50 shrink-0 shadow-[0_2px_0_#000]">
        {/* Left: Logo, Site Name */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          <Link href="/dashboard" className="flex items-center gap-2 group shrink-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-black border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_#000] group-hover:scale-105 transition-transform">
              <NextImage
                src="/brand-logo-clean.png"
                alt="Launchly Emblem"
                width={26}
                height={26}
                className="w-full h-full object-contain p-0.5 rounded-lg"
              />
            </div>
            <span className="hidden xl:inline-flex">
              <BrandWordmark size="sm" tone="dark" />
            </span>
          </Link>

          {/* Site Name Pill */}
          <div className="flex items-center gap-1 rounded-xl border-2 border-black bg-[#FAF9F6] px-2 py-1 shadow-[1.5px_1.5px_0px_#000] max-w-[120px] sm:max-w-[200px]">
            <input
              type="text"
              value={siteTitle}
              onChange={(e) => setSiteTitle(e.target.value)}
              className="font-mono text-xs sm:text-sm font-bold text-black bg-transparent border-none outline-none w-full focus:ring-0 truncate"
              title="Click to rename website"
            />
          </div>

          <select aria-label="Current page" value={activePageId} onChange={(event) => switchPage(event.target.value)} className="hidden sm:block max-w-28 rounded-lg border-2 border-black bg-white px-2 py-1 font-mono text-[10px] font-bold">
            {sitePages.map((page) => <option key={page.id} value={page.id}>{page.title}</option>)}
          </select>

          {/* Undo / Redo Buttons */}
          <div className="hidden sm:flex items-center gap-1 rounded-xl border-2 border-black bg-[#FAF9F6] p-0.5 shadow-[1.5px_1.5px_0px_#000]">
            <button
              type="button"
              onClick={handleUndo}
              disabled={undoCount === 0}
              className="p-1.5 rounded-lg text-black hover:bg-neutral-200 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 size={13} className="stroke-[2.5]" />
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={redoCount === 0}
              className="p-1.5 rounded-lg text-black hover:bg-neutral-200 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
              title="Redo (Ctrl+Y)"
            >
              <Redo2 size={13} className="stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Center: Device Switcher & Zoom Controls (Desktop only) */}
        <div className="hidden md:flex items-center gap-2 md:absolute md:left-1/2 md:-translate-x-1/2">
          <div className="flex items-center gap-1 rounded-2xl border-2 border-black bg-[#FFFDF8] p-1 shadow-[2px_2px_0px_#000]">
            {([
              { mode: 'desktop' as const, icon: Monitor, label: 'Desktop' },
              { mode: 'tablet' as const, icon: Tablet, label: 'Tablet' },
              { mode: 'mobile' as const, icon: Smartphone, label: 'Mobile' },
            ]).map(({ mode, icon: Icon, label }) => (
              <button
                key={mode}
                onClick={() => setDeviceMode(mode)}
                className={cn(
                  'px-2.5 py-1 rounded-xl font-mono text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer',
                  deviceMode === mode
                    ? 'bg-yellow text-black border-2 border-black shadow-[1.5px_1.5px_0px_#000]'
                    : 'text-neutral-500 hover:text-black border-2 border-transparent'
                )}
                title={label}
              >
                <Icon size={14} className="stroke-[2.5]" />
                <span>{label}</span>
              </button>
            ))}
          </div>

        </div>

        {/* Right: Preview and publish */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            onClick={() => setShowPublishDialog(true)}
            className="inline-flex items-center gap-1 px-3 sm:px-5 py-1 sm:py-1.5 rounded-xl border-2 border-black bg-pink hover:bg-pink/90 font-display text-xs sm:text-sm font-black text-black shadow-[2.5px_2.5px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
          >
            <Globe size={13} className="stroke-[2.5]" />
            <span>Publish</span>
          </button>
        </div>
      </header>

      {/* Main Studio Body */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Leftmost Tool Icon Rail (Hidden on mobile < md) */}
        <div className="hidden md:flex w-14 bg-white border-r-[3px] border-black flex-col items-center py-4 gap-2 z-40 shrink-0">
          {([
            { id: 'sections', icon: Layers, label: 'Sections' },
            { id: 'ai', icon: Wand2, label: 'AI Generator' },
            { id: 'styles', icon: Palette, label: 'Styles' },
            { id: 'elements', icon: Type, label: 'Element Library' },
            { id: 'pages', icon: ChevronRight, label: 'Pages' },
            { id: 'navigation', icon: MenuIcon, label: 'Navigation' },
            { id: 'assets', icon: ImageIcon, label: 'Assets' },
            { id: 'tools', icon: SlidersHorizontal, label: 'Tools and export' },
          ] as { id: LeftPanel; icon: typeof Layers; label: string }[]).map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => {
                if (id === 'ai') setShowAiModal(true);
                else setLeftPanel(id);
              }}
              title={label}
              className={cn(
                'w-10 h-10 rounded-xl border-2 transition-all flex items-center justify-center cursor-pointer',
                leftPanel === id
                  ? 'bg-yellow text-black border-black shadow-[2px_2px_0px_#000]'
                  : 'bg-transparent text-neutral-400 hover:text-black border-transparent hover:border-black/20'
              )}
            >
              <Icon size={17} className="stroke-[2.5]" />
            </button>
          ))}
          <div className="flex-1" />
          <button
            title="Studio Settings"
            onClick={() => setLeftPanel('settings')}
            className={cn('w-10 h-10 rounded-xl border-2 flex items-center justify-center transition-all cursor-pointer', leftPanel === 'settings' ? 'border-black bg-yellow text-black shadow-[2px_2px_0_#000]' : 'border-transparent hover:border-black/20 text-neutral-400 hover:text-black')}
          >
            <Settings size={17} className="stroke-[2.5]" />
          </button>
        </div>

        {/* Left Sub-Drawer: Desktop persistent / Mobile full-screen when active */}
        <div
          className={cn(
            'bg-[#FAF9F6] border-r-[3px] border-black flex flex-col z-30 shrink-0 overflow-hidden transition-all',
            'hidden md:flex',
            // Mobile full screen overlay when tab selected
            mobileTab === 'sections' && '!flex fixed inset-x-0 top-14 bottom-14 w-full z-40 bg-white',
            mobileTab === 'styles' && '!flex fixed inset-x-0 top-14 bottom-14 w-full z-40 bg-white',
            ['elements', 'pages', 'navigation', 'assets', 'tools', 'settings'].includes(mobileTab) && '!flex fixed inset-x-0 top-14 bottom-14 w-full z-40 bg-white'
          )}
          style={{ width: leftPanelWidth }}
        >
          <div className="p-3.5 border-b-[2px] border-black bg-white flex items-center justify-between">
            <div className="font-mono text-xs font-black uppercase text-black tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-pink" />
              <span>{(mobileTab !== 'canvas' ? mobileTab : leftPanel) === 'elements' ? 'Element Library' : (mobileTab !== 'canvas' ? mobileTab : leftPanel) === 'tools' ? 'Tools and export' : mobileTab !== 'canvas' ? mobileTab : leftPanel}</span>
            </div>
            {/* Close button on mobile */}
            <button
              onClick={() => setMobileTab('canvas')}
              className="md:hidden px-2 py-0.5 rounded-lg border border-black bg-yellow font-mono text-[10px] font-bold text-black"
            >
              Done ✕
            </button>
            <span className="hidden md:inline font-mono text-[10px] text-neutral-400">
              {leftPanel === 'elements' || mobileTab === 'elements' ? `${editorCatalog.length} widgets` : leftPanel === 'sections' || mobileTab === 'sections' ? `${sections.length} blocks` : null}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            {(leftPanel === 'sections' || mobileTab === 'sections') && (
              <div className="space-y-4">
                {sections.length > new Set(sections.map((section) => section.type)).size && <button type="button" onClick={removeDuplicateBlocks} className="w-full rounded-lg border border-black/20 bg-yellow/50 px-3 py-2 text-left font-mono text-[10px] font-bold text-black hover:bg-yellow">Remove duplicate blocks</button>}
                <SortableContext items={sections.map((section) => `sidebar-section:${section.id}`)} strategy={verticalListSortingStrategy}>
                <div className="space-y-1.5">
                  {sections.map((section, idx) => (
                    <SortableSectionFrame key={section.id} id={section.id} index={idx} source="sidebar" className="rounded-xl">
                    <div
                      onClick={() => {
                        setSelectedSection(section.id);
                        setSelectedTreeElement(null);
                        setSelectedElementId(null);
                        if (mobileTab === 'sections') setMobileTab('canvas');
                      }}
                      className={cn(
                        'group flex items-center gap-2 py-2.5 pl-8 pr-3 rounded-xl border-2 cursor-pointer transition-all',
                        `${selectedSection === section.id
                          ? 'border-black bg-pink text-black shadow-[2.5px_2.5px_0px_#000] font-bold'
                          : 'border-black/15 bg-white hover:border-black hover:bg-neutral-50 text-neutral-800 shadow-xs'}`
                      )}
                    >
                      {/* Section Reorder Controls */}
                      <div className="flex flex-col gap-0.5 shrink-0 opacity-40 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={(e) => { e.stopPropagation(); moveSection(idx, 'up'); }}
                          className="hover:text-black disabled:opacity-20 cursor-pointer p-0.5"
                          title="Move section up"
                        >
                          <ArrowUp size={10} className="stroke-[3]" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === sections.length - 1}
                          onClick={(e) => { e.stopPropagation(); moveSection(idx, 'down'); }}
                          className="hover:text-black disabled:opacity-20 cursor-pointer p-0.5"
                          title="Move section down"
                        >
                          <ArrowDown size={10} className="stroke-[3]" />
                        </button>
                      </div>

                      <span className="font-mono text-xs flex-1 truncate">{section.name}</span>
                      <button type="button" aria-label={`${section.hidden?.[deviceMode] ? 'Show' : 'Hide'} ${section.name} on ${deviceMode}`} title={`Toggle on ${deviceMode}`} onClick={(e) => { e.stopPropagation(); setSections((items) => items.map((item) => item.id === section.id ? { ...item, hidden: { ...item.hidden, [deviceMode]: !item.hidden?.[deviceMode] } } : item)); }} className="p-1 text-neutral-500 hover:text-black">{section.hidden?.[deviceMode] ? <EyeOff size={13}/> : <Eye size={13}/>}</button>
                      <button type="button" aria-label={`${section.locked ? 'Unlock' : 'Lock'} ${section.name}`} onClick={(e) => { e.stopPropagation(); setSections((items) => items.map((item) => item.id === section.id ? { ...item, locked: !item.locked } : item)); }} className="p-1 text-neutral-500 hover:text-black">{section.locked ? <Lock size={12}/> : <Unlock size={12}/>}</button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removeSection(section.id); }}
                        className="opacity-60 hover:opacity-100 p-1 rounded-md transition-all cursor-pointer hover:bg-black/10 text-neutral-600"
                        title="Delete section"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                    </SortableSectionFrame>
                  ))}
                </div>
                </SortableContext>

              </div>
            )}

            {(leftPanel === 'styles' || mobileTab === 'styles') && (
              <div className="space-y-4">
                <div>
                  <div className="font-mono text-[10px] font-bold uppercase text-neutral-500 tracking-wider mb-2">
                    Brand Palette
                  </div>
                  <div className="space-y-2">
                    {[
                      { label: 'Accent', key: 'primaryColor' },
                      { label: 'Background', key: 'bgColor' },
                      { label: 'Text', key: 'textColor' },
                    ].map(({ label, key }) => (
                      <div key={key} className="flex items-center justify-between rounded-xl border border-black/20 bg-white p-2">
                        <span className="font-mono text-xs font-medium text-neutral-700">{label}</span>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={typeof theme[key as keyof Theme] === 'string' ? theme[key as keyof Theme] as string : '#000000'}
                            onChange={(e) => setTheme(prev => ({ ...prev, [key]: e.target.value }))}
                            className="w-7 h-7 rounded-lg border border-black cursor-pointer p-0.5"
                          />
                          <span className="font-mono text-[11px] font-bold text-black">
                            {String(theme[key as keyof Theme] ?? '')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="font-mono text-[10px] font-bold uppercase text-neutral-500 tracking-wider mb-2">
                    Preset Swatches
                  </div>
                  <div className="flex items-center gap-2">
                    {['#FF5588', '#FFDD00', '#00E599', '#9966FF', '#00F0FF', '#0F0F11'].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setTheme(prev => ({ ...prev, primaryColor: c }))}
                        style={{ backgroundColor: c }}
                        className={`w-7 h-7 rounded-md border-2 border-black transition-transform cursor-pointer ${
                          theme.primaryColor === c ? 'scale-125 ring-2 ring-black' : 'hover:scale-110'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="editor-font-family" className="font-mono text-[10px] font-bold uppercase text-neutral-500 tracking-wider mb-2 block">Typography</label>
                  <select id="editor-font-family" value={theme.fontFamily} onChange={(e) => setTheme((prev) => ({ ...prev, fontFamily: e.target.value }))} className="w-full rounded-xl border-2 border-black bg-white px-3 py-2 font-mono text-xs font-bold text-black">
                    <option value="Inter, sans-serif">Modern sans</option>
                    <option value="Arial, Helvetica, sans-serif">Clean classic</option>
                    <option value="Trebuchet MS, sans-serif">Friendly geometric</option>
                    <option value="Verdana, sans-serif">Readable UI</option>
                    <option value="system-ui, sans-serif">System UI</option>
                    <option value="'Courier New', monospace">Typewriter</option>
                    <option value="Palatino Linotype, Book Antiqua, serif">Premium serif</option>
                    <option value="Georgia, serif">Editorial serif</option>
                    <option value="ui-monospace, monospace">Monospace</option>
                  </select>
                </div>
                <div className="space-y-2 rounded-xl border-2 border-black bg-white p-3">
                  <label htmlFor="editor-heading-font" className="block font-mono text-[9px] font-bold uppercase text-neutral-500">Heading font<select id="editor-heading-font" value={theme.headingFont} onChange={(event) => setTheme((prev) => ({ ...prev, headingFont: event.target.value }))} className="mt-1 w-full rounded-lg border border-black/20 bg-white px-2 py-2 font-mono text-xs text-black">{[['Inter, sans-serif','Inter'],['Arial, Helvetica, sans-serif','Arial'],['Georgia, serif','Georgia'],["'Courier New', monospace",'Courier New'],['Palatino Linotype, Book Antiqua, serif','Palatino']].map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                  <label htmlFor="editor-radius" className="block font-mono text-[9px] font-bold uppercase text-neutral-500">Global corner radius<select id="editor-radius" value={theme.borderRadius} onChange={(event) => setTheme((prev) => ({ ...prev, borderRadius: event.target.value, radius: event.target.value }))} className="mt-1 w-full rounded-lg border border-black/20 bg-white px-2 py-2 font-mono text-xs text-black">{[['8px','Compact'],['16px','Soft'],['24px','Rounded'],['9999px','Pill']].map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                  <label htmlFor="editor-button-style" className="block font-mono text-[9px] font-bold uppercase text-neutral-500">Button style<select id="editor-button-style" value={theme.buttonStyle} onChange={(event) => setTheme((prev) => ({ ...prev, buttonStyle: event.target.value as Theme['buttonStyle'] }))} className="mt-1 w-full rounded-lg border border-black/20 bg-white px-2 py-2 font-mono text-xs text-black"><option value="solid">Solid</option><option value="outline">Outline</option><option value="pill">Pill</option></select></label>
                  <label className="block font-mono text-[9px] font-bold uppercase text-neutral-500">Spacing scale · {theme.spacingScale.toFixed(1)}×<input type="range" min="0.75" max="1.5" step="0.05" value={theme.spacingScale} onChange={(event) => setTheme((prev) => ({ ...prev, spacingScale: Number(event.target.value) }))} className="mt-1 w-full accent-pink" /></label>
                  <button type="button" aria-pressed={theme.darkMode} onClick={() => setThemeMode(!theme.darkMode)} className="w-full rounded-lg border-2 border-black py-2 font-mono text-[10px] font-bold">{theme.darkMode ? 'Switch to light palette' : 'Switch to dark palette'}</button>
                </div>

                {/* Real-time WCAG Contrast Checker */}
                {(() => {
                  const textContrast = getContrastRatio(theme.textColor, theme.bgColor);
                  const textWcag = getWcagLevel(textContrast);
                  return (
                    <div className="p-3 rounded-xl border-2 border-black bg-white shadow-brutal-xs space-y-2 mt-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] font-bold uppercase text-neutral-600">
                          WCAG Contrast
                        </span>
                        <span
                          style={{ backgroundColor: textWcag.color }}
                          className="px-2 py-0.5 rounded-full border border-black font-mono text-[9px] font-black text-black"
                        >
                          {textContrast}:1 ({textWcag.level})
                        </span>
                      </div>
                      <p className="font-mono text-[10px] text-neutral-500 leading-tight">
                        Readability ratio between base text and canvas background.
                      </p>
                      {!textWcag.pass && (
                        <button
                          type="button"
                          onClick={() => setTheme(prev => ({ ...prev, textColor: suggestAccessibleColor(prev.textColor, prev.bgColor) }))}
                          className="w-full py-1 px-2 rounded-lg border border-black bg-yellow text-black font-mono text-[10px] font-bold hover:bg-pink transition-colors cursor-pointer"
                        >
                          Auto-Fix Contrast (to 4.5:1)
                        </button>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {(leftPanel === 'elements' || mobileTab === 'elements') && (
              <div className="space-y-3">
                <div><p className="font-mono text-[10px] font-bold uppercase text-neutral-700">Element library</p><p className="mt-1 font-mono text-[9px] leading-relaxed text-neutral-500">All widgets are available. Drag one onto a column or click to add it after the selected section.</p></div>
                <label className="block font-mono text-[9px] font-bold uppercase text-neutral-500">Search elements<input value={paletteSearch} onChange={(event) => setPaletteSearch(event.target.value)} placeholder="Search the library" aria-label="Search elements" className="mt-1 w-full rounded-lg border border-black/30 bg-white px-2 py-2 font-mono text-[10px] font-normal normal-case text-black" /></label>
                <div className="flex flex-wrap gap-1"><button type="button" onClick={() => setPaletteCategory('all')} className={`rounded-lg border px-2 py-1.5 font-mono text-[9px] font-bold uppercase ${paletteCategory === 'all' ? 'border-black bg-yellow shadow-[1px_1px_0_#000]' : 'border-black/20 bg-white'}`}>All</button>{paletteCategories.map((category) => <button key={category.id} type="button" onClick={() => setPaletteCategory(category.id)} className={`rounded-lg border px-2 py-1.5 font-mono text-[9px] font-bold uppercase ${paletteCategory === category.id ? 'border-black bg-yellow shadow-[1px_1px_0_#000]' : 'border-black/20 bg-white'}`}>{category.label}</button>)}</div>
                <div className="grid grid-cols-2 gap-x-2 gap-y-2">
                  {filteredPaletteItems.map((item) => <DraggablePaletteButton key={item.id} id={item.id} label={item.label} description={item.description} onClick={() => { addPaletteItem(item.id); if (mobileTab === 'elements') setMobileTab('canvas'); }} />)}
                  {filteredPaletteItems.length === 0 && <p className="col-span-2 py-3 text-center font-mono text-[10px] text-neutral-500">No elements match your search.</p>}
                </div>
                <div className="space-y-2 border-t border-black/15 pt-3">
                  <p className="font-mono text-[10px] font-bold uppercase text-neutral-500">Free-positioned canvas items</p>
                <div className="grid grid-cols-2 gap-2 border-t border-black/15 pt-3">
                  <button type="button" onClick={() => addCanvasElement('image')} className="rounded-xl border-2 border-black bg-white px-2 py-3 font-mono text-xs font-bold shadow-[2px_2px_0_#000] hover:bg-yellow">＋ Image</button>
                  <button type="button" onClick={() => addCanvasElement('icon')} className="rounded-xl border-2 border-black bg-white px-2 py-3 font-mono text-xs font-bold shadow-[2px_2px_0_#000] hover:bg-yellow">＋ Icon</button>
                </div>
                {canvasElements.map((item) => <div key={item.id} className="flex items-center gap-2 rounded-lg border border-black/20 bg-white p-2">
                  <button type="button" onClick={() => setSelectedElementId(item.id)} className="min-w-0 flex-1 truncate text-left font-mono text-xs">{item.name} · {item.type}</button>
                  {item.type === 'image' && <label className="cursor-pointer rounded border border-black px-2 py-1 font-mono text-[10px]">Upload<input type="file" accept="image/*" className="sr-only" onChange={(e) => readElementUpload(item.id, e.target.files?.[0])} /></label>}
                  {item.type === 'icon' && <><select aria-label="Choose icon" value={item.icon || 'Star'} onChange={(e) => updateCanvasElement(item.id, { icon: e.target.value, src: '' })} className="max-w-20 rounded border border-black p-1 text-xs">{['Star','Heart','Sparkles','Camera','CheckCircle2','ArrowUpRight'].map((name) => <option key={name}>{name}</option>)}</select><label className="cursor-pointer rounded border border-black px-2 py-1 font-mono text-[10px]">Upload<input type="file" accept="image/*" className="sr-only" onChange={(e) => readElementUpload(item.id, e.target.files?.[0])} /></label></>}
                  <button type="button" aria-label={`Delete ${item.name}`} onClick={() => { setCanvasElements((items) => items.filter((el) => el.id !== item.id)); if (selectedElementId === item.id) setSelectedElementId(null); }} className="text-red-600"><Trash2 size={14}/></button>
                </div>)}
                </div>
              </div>
            )}

            {(leftPanel === 'pages' || mobileTab === 'pages') && (
              <div className="space-y-3">
                <div className="flex items-center justify-between"><p className="font-mono text-[10px] font-bold uppercase text-neutral-500">Site pages</p><span className="font-mono text-[9px] text-neutral-500">{sitePages.length} · unlimited</span></div>
                {sitePages.map((page, index) => <div key={page.id} draggable onDragStart={() => setDraggedPageId(page.id)} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (!draggedPageId) return; editorStore.getState().reorderPage(draggedPageId, index); setDraggedPageId(null); applyDocumentToEditor(editorStore.getState().document, activePageId); }} className={`space-y-2 rounded-xl border-2 bg-white p-3 ${activePageId === page.id ? 'border-black shadow-[2px_2px_0_#000]' : 'border-black/15'}`}>
                  <div className="flex items-center gap-2"><button type="button" onClick={() => switchPage(page.id)} className="min-w-0 flex-1 truncate text-left font-mono text-xs font-bold">{page.isHome || page.id === 'home' ? '⌂ ' : '⠿ '}{page.title}</button><button type="button" title="Duplicate page" aria-label={`Duplicate ${page.title}`} onClick={() => addSitePage(page.id)}><Plus size={14}/></button>{!page.isHome && page.id !== 'home' && <button type="button" title="Delete page" aria-label={`Delete ${page.title}`} onClick={() => deleteSitePage(page.id)}><Trash2 size={14}/></button>}</div>
                  {activePageId === page.id && <div className="space-y-2 border-t border-black/10 pt-2">
                    <label className="block font-mono text-[9px] font-bold uppercase">Page name<input aria-label="Page name" value={page.title} onChange={(e) => updatePage(page.id, { title: e.target.value })} className="mt-1 w-full rounded-lg border border-black/30 px-2 py-1.5 font-mono text-xs font-bold" /></label>
                    <label className="block font-mono text-[9px] font-bold uppercase">URL slug<div className="mt-1 flex items-center rounded-lg border border-black/30 px-2"><span className="font-mono text-xs text-neutral-400">/</span><input aria-label="Page URL slug" value={slugDrafts[page.id] ?? (page.slug || (page.id === 'home' ? '' : page.id))} disabled={page.isHome || page.id === 'home'} onFocus={() => setSlugDrafts((drafts) => ({ ...drafts, [page.id]: page.slug || page.id }))} onChange={(e) => setSlugDrafts((drafts) => ({ ...drafts, [page.id]: e.target.value }))} onBlur={(e) => { changePageSlug(page.id, slugDrafts[page.id] ?? e.target.value); setSlugDrafts((drafts) => { const next = { ...drafts }; delete next[page.id]; return next; }); }} className="min-w-0 flex-1 bg-transparent py-1.5 font-mono text-xs disabled:text-neutral-400" /></div></label>
                    <label className="block font-mono text-[9px] font-bold uppercase">Page description<input aria-label="Page description" value={page.description} onChange={(e) => updatePage(page.id, { description: e.target.value })} className="mt-1 w-full rounded-lg border border-black/20 px-2 py-1.5 font-mono text-[10px]" placeholder="Page intro content" /></label>
                    <label className="block font-mono text-[9px] font-bold uppercase">SEO title<input aria-label="SEO title" value={page.seoTitle || page.title} onChange={(e) => updatePage(page.id, { seoTitle: e.target.value })} className="mt-1 w-full rounded-lg border border-black/20 px-2 py-1.5 font-mono text-[10px]" placeholder="Search result title" /></label>
                    <label className="block font-mono text-[9px] font-bold uppercase">Social share image URL<input type="url" aria-label="Social share image URL" value={page.ogImage || ''} onChange={(e) => updatePage(page.id, { ogImage: e.target.value })} className="mt-1 w-full rounded-lg border border-black/20 px-2 py-1.5 font-mono text-[10px]" placeholder="https://…" /></label>
                    <div className="flex flex-wrap gap-3 font-mono text-[10px]"><label className="flex items-center gap-1"><input type="checkbox" checked={page.showInMenu !== false && page.id !== 'home'} disabled={page.id === 'home' || page.isHome} onChange={(e) => updatePage(page.id, { showInMenu: e.target.checked })} />Show in menu</label><label className="flex items-center gap-1"><input type="checkbox" checked={page.noindex || false} onChange={(e) => updatePage(page.id, { noindex: e.target.checked })} />Hide from search</label></div>
                    <div className="flex flex-wrap gap-3 font-mono text-[10px]"><label className="flex items-center gap-1"><input type="checkbox" checked={page.useSharedHeader !== false} onChange={(e) => updatePage(page.id, { useSharedHeader: e.target.checked })} />Shared header</label><label className="flex items-center gap-1"><input type="checkbox" checked={page.useSharedFooter !== false} onChange={(e) => updatePage(page.id, { useSharedFooter: e.target.checked })} />Shared footer</label></div>
                    {!page.isHome && page.id !== 'home' && <button type="button" onClick={() => { editorStore.getState().setHomePage(page.id); applyDocumentToEditor(editorStore.getState().document, page.id); }} className="w-full rounded-lg border border-black bg-white py-1.5 font-mono text-[10px] font-bold hover:bg-yellow">Set as home page</button>}
                  </div>}
                </div>)}
                <button type="button" onClick={() => addSitePage()} className="w-full rounded-xl border-2 border-black bg-yellow p-2 font-mono text-xs font-bold">＋ Add page</button>
                <label className="block font-mono text-[9px] font-bold uppercase text-neutral-500">Add from page template<select aria-label="Add page from template" value="" onChange={(event) => { if (event.target.value) addPageFromTemplate(event.target.value); }} className="mt-1 w-full rounded-lg border-2 border-black bg-white px-2 py-2 font-mono text-xs font-bold text-black"><option value="">Choose a page layout…</option>{['About', 'Services', 'Pricing', 'Contact', 'FAQ', 'Blog', 'Portfolio', 'Privacy', '404'].map((preset) => <option key={preset}>{preset}</option>)}</select></label>
                <p className="text-[10px] font-mono leading-relaxed text-neutral-500">Drag pages to reorder. Page links use their saved slugs.</p>
              </div>
            )}

            {(leftPanel === 'navigation' || mobileTab === 'navigation') && (
              <div className="space-y-3">
                <div className="flex items-center justify-between"><p className="font-mono text-[10px] font-bold uppercase text-neutral-500">Navigation menu</p><span className="font-mono text-[9px] text-neutral-400">Drag to reorder</span></div>
                {editorDocument.menu.map((item, index) => <div key={item.id} draggable onDragStart={() => setDraggedMenuId(item.id)} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (draggedMenuId) reorderMenuItem(draggedMenuId, index); setDraggedMenuId(null); }} onDragEnd={() => setDraggedMenuId(null)} className="space-y-2 rounded-xl border-2 border-black/20 bg-white p-3">
                  <div className="flex items-center gap-2"><span aria-hidden="true" className="cursor-grab text-neutral-400">⠿</span><label className="min-w-0 flex-1 font-mono text-[9px] font-bold uppercase text-neutral-500">Label<input aria-label={`Navigation label ${index + 1}`} value={item.label} onChange={(event) => updateMenuItem(item.id, (current) => ({ ...current, label: event.target.value }))} className="mt-1 w-full rounded border border-black/20 px-2 py-1.5 font-mono text-xs font-normal normal-case text-black" /></label><button type="button" aria-label={`Move ${item.label} up`} disabled={index === 0} onClick={() => reorderMenuItem(item.id, index - 1)} className="rounded border border-black/20 px-2 py-1 disabled:opacity-30">↑</button><button type="button" aria-label={`Move ${item.label} down`} disabled={index === editorDocument.menu.length - 1} onClick={() => reorderMenuItem(item.id, index + 1)} className="rounded border border-black/20 px-2 py-1 disabled:opacity-30">↓</button><button type="button" aria-label={`Remove ${item.label}`} onClick={() => editorStore.getState().setMenu(editorStore.getState().document.menu.filter((entry) => entry.id !== item.id))} className="rounded border border-black/20 p-1 hover:bg-pink"><Trash2 size={13}/></button></div>
                  <label className="block font-mono text-[9px] font-bold uppercase text-neutral-500">Link target<select aria-label={`Link target for ${item.label}`} value={item.target.type} onChange={(event) => updateMenuItem(item.id, (current) => ({ ...current, target: { type: event.target.value as 'page' | 'url' | 'anchor', value: event.target.value === 'page' ? sitePages.find((page) => page.id !== 'home')?.id || 'home' : '' } }))} className="mt-1 w-full rounded border border-black/20 bg-white px-2 py-1.5 font-mono text-xs text-black"><option value="page">Site page</option><option value="url">External URL</option><option value="anchor">Section anchor</option></select></label>
                  {item.target.type === 'page' ? <label className="block font-mono text-[9px] font-bold uppercase text-neutral-500">Page<select aria-label={`Page for ${item.label}`} value={item.target.value} onChange={(event) => updateMenuItem(item.id, (current) => ({ ...current, target: { type: 'page', value: event.target.value } }))} className="mt-1 w-full rounded border border-black/20 bg-white px-2 py-1.5 font-mono text-xs text-black">{sitePages.map((page) => <option key={page.id} value={page.id}>{page.title}</option>)}</select></label> : <label className="block font-mono text-[9px] font-bold uppercase text-neutral-500">{item.target.type === 'url' ? 'URL' : 'Anchor ID'}<input aria-label={`${item.target.type} for ${item.label}`} value={item.target.value} onChange={(event) => updateMenuItem(item.id, (current) => ({ ...current, target: { ...current.target, value: event.target.value } }))} placeholder={item.target.type === 'url' ? 'https://example.com' : 'section-id'} className="mt-1 w-full rounded border border-black/20 px-2 py-1.5 font-mono text-xs text-black" /></label>}
                  <label className="flex items-center gap-1 font-mono text-[10px]"><input type="checkbox" checked={item.newTab} onChange={(event) => updateMenuItem(item.id, (current) => ({ ...current, newTab: event.target.checked }))}/>Open in new tab</label>
                </div>)}
                <div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => { const page = sitePages.find((candidate) => candidate.id !== 'home' && !editorDocument.menu.some((item) => item.target.type === 'page' && item.target.value === candidate.id)); if (!page) return; editorStore.getState().setMenu([...editorStore.getState().document.menu, { id: `menu-${page.id}`, label: page.title, target: { type: 'page', value: page.id }, newTab: false }]); }} className="rounded-lg border-2 border-black bg-yellow px-2 py-2 font-mono text-[10px] font-bold">＋ Page link</button><button type="button" onClick={() => editorStore.getState().setMenu([...editorStore.getState().document.menu, { id: `menu-url-${Date.now()}`, label: 'External link', target: { type: 'url', value: 'https://' }, newTab: true }])} className="rounded-lg border-2 border-black bg-white px-2 py-2 font-mono text-[10px] font-bold"><ExternalLink size={12} className="mr-1 inline"/>＋ URL link</button></div>
                <p className="font-mono text-[9px] leading-relaxed text-neutral-500">Page links stay connected when page titles or slugs change.</p>
              </div>
            )}

            {(leftPanel === 'assets' || mobileTab === 'assets') && (
              <div className="space-y-3">
                <p className="font-mono text-[10px] font-bold uppercase text-neutral-500">Brand identity</p>
                <label className="block cursor-pointer rounded-xl border-2 border-dashed border-black/40 bg-white p-3 text-center font-mono text-xs font-bold text-black hover:bg-yellow">Upload site logo<input type="file" accept="image/*" className="sr-only" onChange={(e) => readLocalImageFile(e.target.files?.[0], setLogoUrl)} /></label>
                <label className="block cursor-pointer rounded-xl border-2 border-dashed border-black/40 bg-white p-3 text-center font-mono text-xs font-bold text-black hover:bg-yellow">Upload favicon<input type="file" accept="image/png,image/x-icon,image/svg+xml,image/jpeg" className="sr-only" onChange={(e) => readLocalImageFile(e.target.files?.[0], setFaviconUrl)} /></label>
                {mediaError && <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-2 font-mono text-[10px] text-red-700">{mediaError}</p>}
                {logoUrl && <div className="flex items-center gap-2 rounded-xl border border-black/20 bg-white p-2"><NextImage src={logoUrl} alt="Site logo preview" width={40} height={40} unoptimized className="h-10 w-10 rounded object-contain" /><button type="button" onClick={() => setLogoUrl('')} className="font-mono text-xs underline">Remove logo</button></div>}
                {faviconUrl && <div className="flex items-center gap-2 rounded-xl border border-black/20 bg-white p-2"><NextImage src={faviconUrl} alt="Favicon preview" width={32} height={32} unoptimized className="h-8 w-8 rounded object-contain" /><button type="button" onClick={() => setFaviconUrl('')} className="font-mono text-xs underline">Remove favicon</button></div>}
                <p className="font-mono text-[10px] font-bold uppercase text-neutral-500">Product image asset</p>
                <input type="url" value={assetUrl} onChange={(e) => setAssetUrl(e.target.value)} placeholder="Paste an image URL" className="w-full rounded-xl border-2 border-black bg-white px-3 py-2 font-mono text-xs text-black" />
                <label className="block cursor-pointer rounded-xl border-2 border-dashed border-black/40 bg-white p-4 text-center font-mono text-xs font-bold text-black hover:bg-yellow">
                  Upload image<input type="file" accept="image/*" className="sr-only" onChange={(e) => readLocalImageFile(e.target.files?.[0], setAssetUrl)} />
                </label>
                {assetUrl && <div className="space-y-2">
                  {/* Dynamic user-provided images can come from any host or a local data URL. */}
                  <NextImage src={assetUrl} alt="Selected product asset preview" width={800} height={360} unoptimized className="w-full h-36 rounded-xl border-2 border-black object-cover" />
                  <button type="button" onClick={() => setAssetUrl('')} className="w-full rounded-lg border border-black bg-white py-2 font-mono text-xs font-bold">Remove image</button>
                </div>}
                <p className="font-mono text-[10px] text-neutral-500">The selected image appears on featured product cards and is saved with your draft.</p>
                <div className="space-y-2 border-t-2 border-black/15 pt-3">
                  <div className="flex items-center justify-between"><p className="font-mono text-[10px] font-bold uppercase text-neutral-500">Media library</p><span className="font-mono text-[9px] text-neutral-400">{(mediaAssets.reduce((sum, item) => sum + (item.sizeBytes || 0), 0) / 1024 / 1024).toFixed(1)} MB</span></div>
                  <label className="block cursor-pointer rounded-xl border-2 border-dashed border-black/40 bg-white p-3 text-center font-mono text-xs font-bold hover:bg-yellow">＋ Upload images<input type="file" accept="image/*" multiple className="sr-only" onChange={(event) => { void uploadMediaFiles(event.target.files); event.target.value = ''; }} /></label>
                  <input type="search" value={mediaQuery} onChange={(event) => setMediaQuery(event.target.value)} placeholder="Search images" aria-label="Search media library" className="w-full rounded-lg border border-black/30 bg-white px-3 py-2 font-mono text-xs" />
                  {mediaError && <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-2 font-mono text-[10px] text-red-700">{mediaError}</p>}
                  {!mediaAssets.length && <p className="rounded-lg bg-white p-3 font-mono text-[10px] text-neutral-500">Uploaded images appear here. Local uploads are capped at 8 MB total to keep browser drafts reliable.</p>}
                  <div className="space-y-2">{mediaAssets.filter((asset) => `${asset.name} ${asset.alt} ${asset.folder || ''}`.toLowerCase().includes(mediaQuery.toLowerCase())).map((asset) => <div key={asset.id} className="space-y-2 rounded-xl border-2 border-black/15 bg-white p-2">
                    <div className="flex items-center gap-2"><NextImage src={asset.src} alt={asset.alt} width={64} height={52} unoptimized className="h-13 w-16 rounded-lg border border-black/15 object-cover"/><div className="min-w-0 flex-1"><input aria-label="Rename media file" value={asset.name} onChange={(event) => setMediaAssets((items) => items.map((item) => item.id === asset.id ? { ...item, name: event.target.value } : item))} className="w-full truncate rounded border border-black/15 px-2 py-1 font-mono text-[10px] font-bold"/><p className="mt-1 font-mono text-[9px] text-neutral-500">{asset.width && asset.height ? `${asset.width}×${asset.height} · ` : ''}{((asset.sizeBytes || 0) / 1024).toFixed(0)} KB</p></div><button type="button" aria-label={`Delete ${asset.name}`} onClick={() => deleteMediaAsset(asset)} className="rounded p-1 text-red-600 hover:bg-red-50"><Trash2 size={14}/></button></div>
                    <label className="block font-mono text-[9px] font-bold uppercase text-neutral-500">Alt text<input aria-label={`Alt text for ${asset.name}`} value={asset.alt} onChange={(event) => setMediaAssets((items) => items.map((item) => item.id === asset.id ? { ...item, alt: event.target.value } : item))} className="mt-1 w-full rounded border border-black/15 px-2 py-1 font-sans text-xs font-normal normal-case text-black" placeholder="Describe the image" /></label>
                    <label className="block font-mono text-[9px] font-bold uppercase text-neutral-500">Folder<input aria-label={`Folder for ${asset.name}`} value={asset.folder || ''} onChange={(event) => setMediaAssets((items) => items.map((item) => item.id === asset.id ? { ...item, folder: event.target.value } : item))} className="mt-1 w-full rounded border border-black/15 px-2 py-1 font-sans text-xs font-normal normal-case text-black" placeholder="Unsorted" /></label>
                    <div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => setAssetUrl(asset.src)} className="rounded border border-black bg-yellow py-1 font-mono text-[9px] font-bold">Use as product image</button><button type="button" onClick={() => setLogoUrl(asset.src)} className="rounded border border-black py-1 font-mono text-[9px] font-bold">Use as logo</button><button type="button" onClick={() => setFaviconUrl(asset.src)} className="rounded border border-black py-1 font-mono text-[9px] font-bold">Use as favicon</button><button type="button" onClick={() => navigator.clipboard?.writeText(asset.src)} className="rounded border border-black py-1 font-mono text-[9px] font-bold">Copy image URL</button></div>
                  </div>)}</div>
                </div>
              </div>
            )}
            {(leftPanel === 'tools' || mobileTab === 'tools') && (
              <div className="space-y-2">
                <p className="font-mono text-[10px] font-bold uppercase text-neutral-500">Build and manage</p>
                <section className="rounded-xl border-2 border-black bg-white p-3 shadow-[2px_2px_0_#000]" aria-labelledby="save-status-heading">
                  <div className="flex items-center justify-between gap-2">
                    <h2 id="save-status-heading" className="font-mono text-[10px] font-black uppercase">Save status</h2>
                    <span className={`h-2.5 w-2.5 rounded-full ${saveStatus === 'saved' ? 'bg-green-500' : saveStatus === 'offline' ? 'bg-red-500' : saveStatus === 'saving' ? 'animate-pulse bg-yellow-500' : 'bg-pink'}`} aria-hidden="true" />
                  </div>
                  <p className="mt-1 font-mono text-xs font-bold" role="status" aria-live="polite">{saveStatus === 'saved' ? 'All changes saved' : saveStatus === 'saving' ? 'Saving your changes…' : saveStatus === 'offline' ? 'Offline · local copy saved' : 'Unsaved changes'}</p>
                  {lastSavedAt && <p className="mt-1 font-mono text-[9px] text-neutral-500">Last saved {new Date(lastSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>}
                  <button type="button" onClick={() => { void handleSave(); }} disabled={saving} className="mt-3 w-full rounded-lg border-2 border-black bg-yellow px-3 py-2 font-mono text-[10px] font-bold disabled:opacity-50">{saving ? 'Saving…' : 'Save now'}</button>
                </section>
                <button type="button" onClick={() => setShowAiModal(true)} className="flex w-full items-center gap-2 rounded-xl border-2 border-black bg-yellow px-3 py-2.5 text-left font-mono text-xs font-bold shadow-[2px_2px_0_#000]"><Wand2 size={15}/> Open AI Designer</button>
                <button type="button" onClick={() => { void handleExportZip(); }} disabled={exportingZip} title="Download the website source as a ZIP archive" className="flex w-full items-center gap-2 rounded-xl border-2 border-black bg-white px-3 py-2.5 text-left font-mono text-xs font-bold hover:bg-yellow disabled:opacity-50"><Download size={15}/>{exportingZip ? 'Exporting…' : 'Export .zip'}</button>
                <button type="button" onClick={() => setShowVersionHistory(true)} className="flex w-full items-center gap-2 rounded-xl border-2 border-black bg-white px-3 py-2.5 text-left font-mono text-xs font-bold hover:bg-yellow"><HistoryIcon size={15}/> Version history</button>
                <button type="button" onClick={() => { const subdomain = siteTitle.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || template.id; const previewWindow = window.open('about:blank', '_blank'); void handleSave().finally(() => { if (previewWindow) previewWindow.location.href = `/live/${subdomain}?preview=1`; }); }} className="flex w-full items-center gap-2 rounded-xl border-2 border-black bg-white px-3 py-2.5 text-left font-mono text-xs font-bold hover:bg-yellow"><Eye size={15}/> Open preview</button>
                <p className="rounded-lg bg-white p-2 font-mono text-[10px] leading-relaxed text-neutral-500">Export, AI design, previews, and revision history are grouped here to keep the main toolbar focused.</p>
              </div>
            )}
            {(leftPanel === 'settings' || mobileTab === 'settings') && (
              <SiteSettingsPanel
                siteTitle={siteTitle}
                onSiteTitleChange={setSiteTitle}
                subdomain={editorDocument.settings.subdomain}
                onSubdomainChange={(subdomain) => editorStore.getState().updateDocument((document) => ({ ...document, settings: { ...document.settings, subdomain: subdomain.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/--+/g, '-').replace(/^-|-$/g, '') } }), 'site-subdomain')}
                customCss={editorDocument.settings.customCss}
                onCustomCssChange={(customCss) => editorStore.getState().updateDocument((document) => ({ ...document, settings: { ...document.settings, customCss } }), 'site-custom-css')}
                onOpenDeploy={() => setShowDeployModal(true)}
                onOpenPages={() => setLeftPanel('pages')}
                onOpenNavigation={() => setLeftPanel('navigation')}
                onOpenAssets={() => setLeftPanel('assets')}
              />
            )}
          </div>
        </div>

        <div role="separator" aria-label="Resize element library" aria-orientation="vertical" aria-valuenow={leftPanelWidth} tabIndex={0} onPointerDown={(event) => { event.preventDefault(); setResizingPanel('left'); }} onKeyDown={(event) => { if (event.key === 'ArrowLeft') setLeftPanelWidth((width) => Math.max(190, width - 16)); if (event.key === 'ArrowRight') setLeftPanelWidth((width) => Math.min(440, width + 16)); }} className="hidden md:block w-1.5 shrink-0 cursor-col-resize bg-transparent hover:bg-pink/70 active:bg-pink" />

        {/* Center Canvas Viewport - 100% visible on mobile, responsive everywhere */}
        <div className="flex-1 bg-[#EBE7DF] overflow-auto flex items-start justify-center p-2 sm:p-6 lg:p-8 relative w-full">
          {/* Subtle architectural dot grid */}
          <div
            className="absolute inset-0 opacity-40 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(#000000 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />

          {/* Browser Frame */}
          <div
            className="relative z-10 bg-white rounded-2xl border-[3px] sm:border-[3.5px] border-black shadow-[6px_6px_0px_#000] sm:shadow-[10px_10px_0px_#000] transition-all duration-300 overflow-hidden flex flex-col w-full max-w-full origin-top"
            style={{
              width: DEVICE_WIDTHS[deviceMode],
              transform: `scale(${zoomScale})`,
              minHeight: '800px',
            }}
          >
            {editorDocument.settings.customCss && <style>{editorDocument.settings.customCss}</style>}
            {/* Top Browser Bar */}
            <div className="h-9 sm:h-10 bg-[#FAF9F6] border-b-[2px] sm:border-b-[2.5px] border-black px-3 sm:px-4 flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border border-black bg-[#FF5F56]" />
                <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border border-black bg-[#FFBD2E]" />
                <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border border-black bg-[#27C93F]" />
              </div>
              <div className="min-w-0 flex-1 flex justify-center">
                <div className="flex min-w-0 items-center gap-1.5 rounded-lg border border-black/20 bg-white px-2.5 py-0.5 font-mono text-[10px] sm:text-[11px] text-neutral-600">
                <span className="text-mint font-bold">●</span>
                <span className="truncate">https://{siteTitle.toLowerCase().replace(/\s+/g, '-')}.launchly.site{currentPage?.slug ? `/${currentPage.slug}` : ''}</span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1 rounded-lg border border-black/25 bg-white px-1.5 py-0.5 font-mono text-[10px] font-bold text-black shadow-[1px_1px_0_#000]" aria-label="Preview zoom controls">
                <button type="button" onClick={() => setZoomScale((prev) => Math.max(0.5, Number((prev - 0.1).toFixed(1))))} className="rounded px-1 hover:bg-neutral-100" title="Zoom out"><ZoomOut size={11} /></button>
                <span className="min-w-[30px] text-center">{Math.round(zoomScale * 100)}%</span>
                <button type="button" onClick={() => setZoomScale((prev) => Math.min(1.5, Number((prev + 0.1).toFixed(1))))} className="rounded px-1 hover:bg-neutral-100" title="Zoom in"><ZoomIn size={11} /></button>
                {zoomScale !== 1 && <button type="button" onClick={() => setZoomScale(1)} className="hidden sm:inline px-1 text-[9px] font-black text-pink" title="Reset zoom">Reset</button>}
              </div>
              <span className="hidden sm:inline min-w-[42px] text-right font-mono text-[10px] font-black uppercase text-neutral-400">{deviceMode}</span>
            </div>

            {/* Editable Content Frame */}
            <div data-canvas-frame className="flex-1 overflow-y-auto">
              <CanvasContent
                templateId={template.id}
                sections={sections}
                sitePages={sitePages}
                menuItems={editorDocument.menu}
                sectionSpacing={sectionSpacing}
                canvasElements={canvasElements}
                selectedElementId={selectedElementId}
                onSelectElement={(id) => { setSelectedElementId(id); setSelectedTreeElement(null); }}
                onMoveElement={(id, x, y) => updateCanvasElement(id, { x, y })}
                onNavigatePage={switchPage}
                selectedSection={selectedSection}
                theme={theme}
                siteTitle={siteTitle}
                heroContent={heroContent}
                featuresContent={featuresContent}
                testimonialsContent={testimonialsContent}
                ctaContent={ctaContent}
                onUpdateSectionContent={(sectionId, content) => setSections((items) => items.map((item) => item.id === sectionId ? { ...item, content } : item))}
                onAddSection={(index) => addPaletteItem('hero', index)}
                selectedTreeElementId={selectedTreeElement?.elementId || null}
                onSelectTreeElement={(sectionId, columnId, elementId) => { setSelectedSection(sectionId); setSelectedElementId(null); setSelectedTreeElement({ sectionId, columnId, elementId }); setMobileTab('inspector'); }}
                onUpdateTreeElement={(sectionId, columnId, elementId, update) => setSections((items) => items.map((item) => item.id !== sectionId ? item : ({ ...item, columns: (item.columns || []).map((column) => column.id !== columnId ? column : ({ ...column, elements: column.elements.map((element) => element.id === elementId ? update(element) : element) })) })))}
                onResizeTreeColumn={(sectionId, columnId, width) => setSections((items) => items.map((item) => item.id !== sectionId ? item : ({ ...item, columns: (item.columns || []).map((column) => column.id !== columnId ? column : ({ ...column, width: { ...column.width, [deviceMode]: Math.max(1, Math.min(12, Math.round(width))) } })) })))}
                onDuplicateTreeElement={(sectionId, columnId, elementId) => setSections((items) => items.map((item) => item.id !== sectionId ? item : ({ ...item, columns: (item.columns || []).map((column) => {
                  if (column.id !== columnId) return column;
                  const index = column.elements.findIndex((element) => element.id === elementId);
                  if (index < 0) return column;
                  const duplicate = structuredClone(column.elements[index]); duplicate.id = nextEditorId('element');
                  const elements = [...column.elements]; elements.splice(index + 1, 0, duplicate);
                  return { ...column, elements };
                }) })))}
                onDeleteTreeElement={(sectionId, columnId, elementId) => { setSections((items) => items.map((item) => item.id !== sectionId ? item : ({ ...item, columns: (item.columns || []).map((column) => column.id !== columnId ? column : ({ ...column, elements: column.elements.filter((element) => element.id !== elementId) })) }))); setSelectedTreeElement((current) => current?.elementId === elementId ? null : current); }}
                onSelectSection={(id) => { setSelectedSection(id); setSelectedElementId(null); const section = sections.find((entry) => entry.id === id); const elements = section?.columns?.flatMap((column) => column.elements) || []; setSelectedTreeElement(section?.type === 'custom' && elements.length === 1 && section.columns?.[0] ? { sectionId: id, columnId: section.columns.find((column) => column.elements.some((element) => element.id === elements[0].id))?.id || section.columns[0].id, elementId: elements[0].id } : null); }}
                assetUrl={assetUrl}
                logoUrl={logoUrl}
                deviceMode={deviceMode}
              />
            </div>
          </div>
        </div>

        <div role="separator" aria-label="Resize properties panel" aria-orientation="vertical" aria-valuenow={rightPanelWidth} tabIndex={0} onPointerDown={(event) => { event.preventDefault(); setResizingPanel('right'); }} onKeyDown={(event) => { if (event.key === 'ArrowLeft') setRightPanelWidth((width) => Math.min(520, width + 16)); if (event.key === 'ArrowRight') setRightPanelWidth((width) => Math.max(260, width - 16)); }} className="hidden lg:block w-1.5 shrink-0 cursor-col-resize bg-transparent hover:bg-pink/70 active:bg-pink" />
        {/* Right Inspector: Desktop sidebar / Mobile full-screen when active */}
        <div
          className={cn(
            'bg-white border-l-[3px] border-black flex flex-col z-30 shrink-0 overflow-hidden',
            'hidden lg:flex',
            // Mobile full screen overlay when tab selected
            mobileTab === 'inspector' && '!flex fixed inset-x-0 top-14 bottom-14 w-full z-40 bg-white lg:!static lg:!inset-auto lg:!z-30 lg:!h-auto'
          )}
          style={{ width: rightPanelWidth }}
        >
          <div className="p-3.5 border-b-[2px] border-black bg-[#FAF9F6] flex items-center justify-between">
            <div className="font-mono text-xs font-black uppercase text-black tracking-wider">
              <span>{selectedElementId ? 'Element Properties' : selectedSection ? `${sections.find(s => s.id === selectedSection)?.name || ''} Properties` : 'Inspector'}</span>
            </div>
            {/* Close button on mobile */}
            <button
              onClick={() => setMobileTab('canvas')}
              className="lg:hidden px-2 py-0.5 rounded-lg border border-black bg-yellow font-mono text-[10px] font-bold text-black"
            >
              Done ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {selectedTreeElementRecord && selectedTreeElement ? <TreeElementProperties element={selectedTreeElementRecord} pages={editorDocument.pages} device={deviceMode} onUpload={(file) => readLocalImageFile(file, (src) => setSections((items) => items.map((section) => section.id !== selectedTreeElement.sectionId ? section : ({ ...section, columns: (section.columns || []).map((column) => column.id !== selectedTreeElement.columnId ? column : ({ ...column, elements: column.elements.map((element) => element.id === selectedTreeElement.elementId ? { ...element, content: { ...element.content, src, image: src } } : element) })) }))))} onChange={(update) => setSections((items) => items.map((section) => section.id !== selectedTreeElement.sectionId ? section : ({ ...section, columns: (section.columns || []).map((column) => column.id !== selectedTreeElement.columnId ? column : ({ ...column, elements: column.elements.map((element) => element.id === selectedTreeElement.elementId ? update(element) : element) })) })))} /> : selectedElementId ? (() => { const item = canvasElements.find((element) => element.id === selectedElementId); return item ? <ElementProperties item={item} onChange={(patch) => updateCanvasElement(item.id, patch)} onUpload={(file) => { if (file) readLocalImageFile(file, (src) => updateCanvasElement(item.id, { src, name: file.name })); }} /> : null; })() : selectedSection ? (
              <SectionProperties
                sectionId={selectedSection}
                sections={sections}
                theme={theme}
                setSectionStyle={(style) => setSections((items) => items.map((item) => item.id === selectedSection ? { ...item, style: { ...item.style, ...style } } : item))}
                setSectionContent={(content) => setSections((items) => items.map((item) => item.id === selectedSection ? { ...item, content } : item))}
                onUploadImage={(file, itemIndex) => readLocalImageFile(file, (src) => setSections((items) => items.map((item) => {
                  if (item.id !== selectedSection) return item;
                  if (typeof itemIndex === 'number' && Array.isArray(item.content?.items)) return { ...item, content: { ...item.content, items: (item.content.items as Array<Record<string, unknown>>).map((entry, index) => index === itemIndex ? { ...entry, image: src, src } : entry) } };
                  return { ...item, content: { ...item.content, image: src } };
                })))}
                setSectionSettings={(settings) => setSections((items) => items.map((item) => item.id === selectedSection ? { ...item, ...settings } : item))}
                sectionSpacing={sectionSpacing[selectedSection] || DEFAULT_SPACING}
                setSectionSpacing={(nextSpacing) => setSectionSpacing((current) => ({ ...current, [selectedSection]: typeof nextSpacing === 'function' ? nextSpacing(current[selectedSection] || DEFAULT_SPACING) : nextSpacing }))}
              />
            ) : (
              <div className="space-y-3 rounded-xl border border-black/10 bg-white p-4">
                <p className="font-display text-sm font-bold text-black">Page settings</p>
                <p className="font-mono text-[10px] leading-relaxed text-neutral-500">Select a block on the canvas to edit it. These shortcuts open site-wide controls.</p>
                <div className="grid grid-cols-2 gap-2">
                  {[['Pages', 'pages'], ['Navigation', 'navigation'], ['Theme', 'styles'], ['Media', 'assets']].map(([label, panel]) => <button key={panel} type="button" onClick={() => { setLeftPanel(panel as LeftPanel); setMobileTab(panel as MobileTab); }} className="rounded-lg border border-black/20 bg-[#FAF9F6] px-2 py-2 text-left font-mono text-[10px] font-bold hover:bg-yellow">{label} ↗</button>)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {saveNotice && <div role="status" aria-live="polite" className={cn('fixed right-4 top-20 z-[90] flex items-center gap-2 rounded-xl border-2 border-black px-4 py-3 font-mono text-xs font-bold shadow-[3px_3px_0_#000]', saveNotice.tone === 'success' ? 'bg-[#D9F7DF] text-[#163A1D]' : saveNotice.tone === 'warning' ? 'bg-[#FFF2BF] text-[#4B3A00]' : 'bg-[#FFD7D7] text-[#5A1010]')}><span aria-hidden="true" className="h-2 w-2 rounded-full bg-current" />{saveNotice.message}</div>}

      {/* Mobile Bottom Navigation Bar (Hidden on desktop) */}
      <nav className="md:hidden h-14 bg-white border-t-[3px] border-black flex items-center justify-around px-1 z-50 shrink-0 shadow-[0_-2px_0_#000]">
        {[
          { id: 'canvas' as const, label: 'Canvas', icon: Layout },
          { id: 'sections' as const, label: 'Blocks', icon: Layers },
          { id: 'elements' as const, label: 'Add', icon: Plus },
          { id: 'pages' as const, label: 'Pages', icon: ChevronRight },
          { id: 'navigation' as const, label: 'Menu', icon: MenuIcon },
          { id: 'assets' as const, label: 'Assets', icon: ImageIcon },
          { id: 'tools' as const, label: 'Tools', icon: SlidersHorizontal },
          { id: 'styles' as const, label: 'Styles', icon: Palette },
          { id: 'settings' as const, label: 'Settings', icon: Settings },
          { id: 'inspector' as const, label: 'Inspect', icon: SlidersHorizontal },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setMobileTab(id)}
            className={cn(
              'flex flex-col items-center justify-center py-1 px-3 rounded-xl font-mono text-[10px] font-bold transition-all cursor-pointer',
              mobileTab === id
                ? 'bg-yellow text-black border-2 border-black shadow-xs font-black'
                : 'text-neutral-500 hover:text-black'
            )}
          >
            <Icon size={16} className="stroke-[2.5]" />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      {/* AI Prompt Modal */}
      {showAiModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[110] flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-5 sm:p-8 max-w-lg w-full shadow-[10px_10px_0px_#000] relative border-[3.5px] border-black max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => !aiGenerating && setShowAiModal(false)}
              disabled={aiGenerating}
              className="absolute top-4 right-4 p-1.5 rounded-xl border-2 border-black bg-white hover:bg-yellow shadow-[2px_2px_0px_#000] cursor-pointer transition-all disabled:opacity-50"
            >
              <X size={14} className="stroke-[2.5]" />
            </button>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl border-2 border-black bg-yellow flex items-center justify-center text-black shadow-[2px_2px_0px_#000]">
                  <Wand2 size={20} className="stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="font-display font-black text-lg sm:text-xl text-black leading-tight">
                    AI Design Studio
                  </h3>
                  <p className="font-mono text-xs text-neutral-500">
                    Describe your website — AI will redesign the canvas live
                  </p>
                </div>
              </div>

              <div>
                <label className="font-mono text-[10px] font-bold text-neutral-500 uppercase tracking-wider block mb-1.5">
                  Your Creative Prompt
                </label>
                <textarea
                  rows={3}
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="e.g. A futuristic Web3 AI copilot with neon cyan glow, high-converting stats, and dark brutalist telemetry..."
                  disabled={aiGenerating}
                  className="w-full p-3 rounded-2xl border-2 border-black bg-[#FAF9F6] font-mono text-xs text-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-yellow shadow-inner resize-none"
                />
              </div>

              {/* Quick Prompt Pills */}
              <div>
                <span className="font-mono text-[10px] font-bold uppercase text-neutral-400 block mb-1.5">
                  Or pick a curated design aesthetic:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: 'Cyberpunk & Web3 L2', prompt: 'Futuristic Web3 Layer-2 with neon cyan accents, dark telemetry radar, and zero-knowledge compute' },
                    { label: 'Autonomous AI Copilot', prompt: 'High-scale multi-agent cognitive engine with neon pink glow, streaming metrics, and dark mode' },
                    { label: 'Kyoto Architecture', prompt: 'Wabi-sabi architectural monograph with warm cream background, deep serif typography, and natural proportions' },
                    { label: 'Limited EDC Capsule', prompt: 'Brutalist everyday carry commerce drop with yellow accents, titanium gear, and countdown timer' },
                  ].map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      disabled={aiGenerating}
                      onClick={() => {
                        setAiPrompt(p.prompt);
                        handleAiGenerate(p.prompt);
                      }}
                      className="px-2 py-1 rounded-xl border border-black bg-white hover:bg-yellow font-mono text-[10px] sm:text-[11px] font-bold text-black shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {aiGenerating && (
                <div className="p-3 rounded-2xl border-2 border-black bg-yellow/40 flex items-center gap-3 animate-pulse">
                  <Loader2 size={16} className="animate-spin text-black stroke-[3]" />
                  <span className="font-mono text-xs font-bold text-black">
                    {aiStep || 'Synthesizing bespoke design tokens...'}
                  </span>
                </div>
              )}

              <button
                type="button"
                onClick={() => handleAiGenerate()}
                disabled={aiGenerating || !aiPrompt.trim()}
                className="w-full justify-center py-2.5 sm:py-3 rounded-2xl border-2 border-black bg-pink hover:bg-pink/90 font-display text-xs sm:text-sm font-black text-black shadow-[3px_3px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {aiGenerating ? (
                  <>
                    <Loader2 size={16} className="animate-spin text-black" />
                    <span>Redesigning Live Canvas…</span>
                  </>
                ) : (
                  <>
                    <Wand2 size={16} className="stroke-[2.5]" />
                    <span>Generate Bespoke Website Design →</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pro Account Domain Publishing Modal */}
      {showPublishDialog && (
        <PublishDialog
          onClose={() => setShowPublishDialog(false)}
          siteName={siteTitle}
          templateId={template.id}
          isPro={true}
          sitePayload={{
            siteName: siteTitle,
            templateId: template.id,
            theme,
            heroContent,
            featuresContent,
            testimonialsContent,
            ctaContent,
            sections,
            sectionSpacing,
            canvasElements,
                sitePages,
            assetUrl,
            logoUrl,
            faviconUrl,
            schemaVersion: 1,
            document: editorDocument,
          }}
        />
      )}

      {showVersionHistory && <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-labelledby="version-history-title">
        <div className="w-full max-w-lg rounded-2xl border-[3px] border-black bg-white p-5 shadow-[8px_8px_0_#000]">
          <div className="mb-4 flex items-center justify-between"><h2 id="version-history-title" className="font-display text-lg font-black">Version history</h2><button type="button" onClick={() => setShowVersionHistory(false)} aria-label="Close version history" className="rounded-lg border border-black p-1 hover:bg-yellow"><X size={16}/></button></div>
          <p className="mb-3 font-mono text-xs text-neutral-600">Your 20 most recent autosave and manual snapshots are kept in this browser.</p>
          <div className="max-h-80 space-y-2 overflow-y-auto">{[...versions].reverse().map((version) => <div key={version.id} className="flex items-center gap-3 rounded-xl border border-black/20 p-3"><div className="min-w-0 flex-1"><p className="truncate font-mono text-xs font-bold">{version.label}</p><p className="text-[10px] text-neutral-500">{new Date(version.createdAt).toLocaleString()}</p></div><button type="button" onClick={() => { if (!window.confirm(`Restore “${version.label}”? This replaces the current editor content.`)) return; const state = editorStore.getState(); const hydrated = hydrateVersionDocument(version, state.document); state.setVersions(state.versions.map((item) => item.id === version.id ? { ...item, document: hydrated } : item)); if (editorStore.getState().restoreVersion(version.id)) applyDocumentToEditor(editorStore.getState().document); setShowVersionHistory(false); }} className="rounded-lg border-2 border-black bg-yellow px-3 py-1.5 font-mono text-[10px] font-bold">Restore</button></div>)}{versions.length === 0 && <div className="rounded-xl border border-dashed border-black/30 p-8 text-center font-mono text-xs text-neutral-500">No saved versions yet. Versions are captured during autosave and when you save manually.</div>}</div>
        </div>
      </div>}

      {pagePendingDelete && <div className="fixed inset-0 z-[125] flex items-center justify-center bg-black/65 p-4" role="dialog" aria-modal="true" aria-labelledby="delete-page-title">
        <div className="w-full max-w-md rounded-2xl border-[3px] border-black bg-white p-6 shadow-[8px_8px_0_#000]">
          <div className="mb-3 flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-black bg-pink"><Trash2 size={18}/></div><div><h2 id="delete-page-title" className="font-display text-lg font-black">Delete “{pagePendingDelete.title}”?</h2><p className="mt-1 font-mono text-xs leading-relaxed text-neutral-600">This page will be removed from the editor and saved site. You can cancel to keep it.</p></div></div>
          <div className="mt-5 flex justify-end gap-2"><button type="button" autoFocus onClick={() => setPagePendingDelete(null)} className="rounded-lg border-2 border-black bg-white px-4 py-2 font-mono text-xs font-bold hover:bg-neutral-100">Cancel</button><button type="button" onClick={confirmDeleteSitePage} className="rounded-lg border-2 border-black bg-pink px-4 py-2 font-mono text-xs font-bold shadow-[2px_2px_0_#000] hover:bg-yellow">Delete page</button></div>
        </div>
      </div>}

      {/* One-Click GitHub & Vercel Deploy Modal */}
      {showDeployModal && (
        <DeployModal
          isOpen={showDeployModal}
          onClose={() => setShowDeployModal(false)}
          siteData={{
            siteTitle,
            templateId: template.id,
            theme,
            heroContent,
            featuresContent,
            testimonialsContent,
            ctaContent,
            sectionOrder: sections.map((s) => s.id),
          }}
        />
      )}

      {/* Dynamic Social Share & OG Card Modal */}
      {showShareModal && (
        <SocialShareModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          title={siteTitle}
          description={heroContent.description || 'High-performance digital presence powered by Launchly.'}
          badge={heroContent.badge || `${template.category} // PRO`}
          accent={theme.primaryColor || template.accent}
          bgColor={theme.bgColor || template.bgColor}
          subdomain={siteTitle.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || template.id}
        />
      )}

      {/* Floating Inline Formatting Toolbar */}
      {toolbarPos && (
        <div
          style={{ top: toolbarPos.y, left: toolbarPos.x }}
          className="fixed z-[120] flex items-center gap-1 p-1 bg-white dark:bg-[#181824] rounded-xl border-2 border-black shadow-[3px_3px_0px_#000] animate-in fade-in zoom-in-95"
        >
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); applyFormat('bold'); }}
            className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 font-bold text-xs cursor-pointer text-black dark:text-white"
            title="Bold"
          >
            <Bold size={13} className="stroke-[3]" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); applyFormat('italic'); }}
            className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 font-bold text-xs cursor-pointer text-black dark:text-white"
            title="Italic"
          >
            <Italic size={13} className="stroke-[3]" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); applyFormat('underline'); }}
            className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 font-mono text-xs font-black underline cursor-pointer text-black dark:text-white"
            title="Underline"
          >
            U
          </button>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); applyFormat('hiliteColor', '#FFD600'); }}
            className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer flex items-center"
            title="Highlight Yellow"
          >
            <span className="w-3.5 h-3.5 rounded-full bg-yellow border border-black inline-block" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); applyFormat('removeFormat'); }}
            className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 font-mono text-[10px] font-bold cursor-pointer text-neutral-500 hover:text-black dark:hover:text-white"
            title="Clear formatting"
          >
            ✕
          </button>
        </div>
      )}
    </div>
    <DragOverlay>{activeDragLabel ? <div className="rounded-xl border-2 border-black bg-yellow px-4 py-2 font-mono text-xs font-bold text-black shadow-[3px_3px_0_#000]">{activeDragLabel}</div> : null}</DragOverlay>
    </DndContext>
  );
}

function CanvasContent({
  templateId,
  sections,
  sectionSpacing,
  sitePages,
  menuItems,
  canvasElements,
  selectedElementId,
  onSelectElement,
  onMoveElement,
  onNavigatePage,
  selectedSection,
  theme,
  siteTitle,
  heroContent,
  featuresContent,
  testimonialsContent,
  ctaContent,
  onUpdateSectionContent,
  onAddSection,
  selectedTreeElementId,
  onSelectTreeElement,
  onUpdateTreeElement,
  onResizeTreeColumn,
  onDuplicateTreeElement,
  onDeleteTreeElement,
  onSelectSection,
  assetUrl,
  logoUrl,
  deviceMode,
}: {
  templateId: string;
  sections: Section[];
  sectionSpacing: Record<string, SectionSpacing>;
  sitePages: SitePage[];
  menuItems: MenuItem[];
  canvasElements: CanvasElement[];
  selectedElementId: string | null;
  onSelectElement: (id: string) => void;
  onMoveElement: (id: string, x: number, y: number) => void;
  onNavigatePage: (id: string) => void;
  selectedSection: string | null;
  theme: Theme;
  siteTitle: string;
  heroContent: Record<string, string>;
  featuresContent: Array<{ title: string; desc: string }>;
  testimonialsContent: Array<{ quote: string; name: string; role: string }>;
  ctaContent: { title: string; desc: string; buttonText: string };
  onUpdateSectionContent: (sectionId: string, content: Record<string, unknown>) => void;
  onAddSection: (index: number) => void;
  selectedTreeElementId: string | null;
  onSelectTreeElement: (sectionId: string, columnId: string, elementId: string) => void;
  onUpdateTreeElement: (sectionId: string, columnId: string, elementId: string, update: (element: SiteElement) => SiteElement) => void;
  onResizeTreeColumn: (sectionId: string, columnId: string, width: number) => void;
  onDuplicateTreeElement: (sectionId: string, columnId: string, elementId: string) => void;
  onDeleteTreeElement: (sectionId: string, columnId: string, elementId: string) => void;
  onSelectSection: (id: string) => void;
  assetUrl: string;
  logoUrl: string;
  deviceMode: DeviceMode;
}) {
  return (
              <div data-editable-canvas style={{ fontFamily: theme.fontFamily, '--editor-heading-font': theme.headingFont, '--editor-body-font': theme.fontFamily, '--editor-spacing-scale': theme.spacingScale } as React.CSSProperties} className="relative min-h-full flex flex-col">
      <SortableContext items={sections.map((section) => `canvas-section:${section.id}`)} strategy={verticalListSortingStrategy}>
      {sections.map((section, index) => (
        <div key={section.id}>
         <SectionDropMarker index={index} onClick={onAddSection} />
        <SortableSectionFrame id={section.id} index={index} source="canvas" className="group/canvas-section">
        <SectionRenderer
          templateId={templateId}
          section={section}
          sitePages={sitePages}
          menuItems={menuItems}
          onNavigatePage={onNavigatePage}
          spacing={sectionSpacing[section.id] || DEFAULT_SPACING}
          isSelected={selectedSection === section.id}
          theme={{ ...theme, primaryColor: section.style?.accentColor || theme.primaryColor, borderRadius: section.style?.borderRadius || theme.borderRadius }}
          siteTitle={siteTitle}
          heroContent={heroContent}
          featuresContent={featuresContent}
          testimonialsContent={testimonialsContent}
          ctaContent={ctaContent}
          onUpdateSectionContent={onUpdateSectionContent}
          selectedTreeElementId={selectedTreeElementId}
          onSelectTreeElement={(columnId, elementId) => onSelectTreeElement(section.id, columnId, elementId)}
          onUpdateTreeElement={(columnId, elementId, update) => onUpdateTreeElement(section.id, columnId, elementId, update)}
          onResizeTreeColumn={(columnId, width) => onResizeTreeColumn(section.id, columnId, width)}
          onDuplicateTreeElement={(columnId, elementId) => onDuplicateTreeElement(section.id, columnId, elementId)}
          onDeleteTreeElement={(columnId, elementId) => onDeleteTreeElement(section.id, columnId, elementId)}
          onSelect={() => onSelectSection(section.id)}
          assetUrl={assetUrl}
          logoUrl={logoUrl}
          deviceMode={deviceMode}
        />
        </SortableSectionFrame>
        </div>
      ))}
      </SortableContext>
       <SectionDropMarker index={sections.length} onClick={onAddSection} />
      {canvasElements.map((item) => {
        const IconComponent = ({ Star, Heart, Sparkles, Camera, CheckCircle2, ArrowUpRight } as Record<string, typeof Star>)[item.icon || 'Star'] || Star;
        return <div key={item.id} onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); onSelectElement(item.id); }} onPointerMove={(event) => { if (event.buttons !== 1) return; const rect = event.currentTarget.parentElement?.getBoundingClientRect(); if (rect) onMoveElement(item.id, Math.max(0, event.clientX - rect.left - item.width / 2), Math.max(0, event.clientY - rect.top - item.height / 2)); }} onClick={() => onSelectElement(item.id)} className={`absolute z-20 cursor-move touch-none ${selectedElementId === item.id ? 'outline outline-2 outline-pink outline-offset-2' : ''}`} style={{ left: item.x, top: item.y, width: item.width, height: item.height }}>
          {item.src ? <NextImage src={item.src} alt={item.name} width={item.width} height={item.height} unoptimized draggable={false} className={`h-full w-full ${item.type === 'image' ? 'rounded-lg object-cover' : 'object-contain'}`} /> : item.type === 'image' ? <div className="flex h-full w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-black/50 bg-yellow/30 text-black"><ImageIcon/><span className="font-mono text-[10px]">Upload image</span></div> : <div className="flex h-full w-full items-center justify-center rounded-xl bg-pink/30 text-black"><IconComponent size={Math.min(item.width, item.height) * .65} /></div>}
        </div>;
      })}
    </div>
  );
}

function ElementProperties({ item, onChange, onUpload }: { item: CanvasElement; onChange: (patch: Partial<CanvasElement>) => void; onUpload: (file?: File) => void }) {
  const fields: Array<[keyof Pick<CanvasElement, 'x' | 'y' | 'width' | 'height'>, string]> = [['x','Horizontal position'],['y','Vertical position'],['width','Width'],['height','Height']];
  return <div className="space-y-4">
    <label className="block text-xs font-bold">Name<input value={item.name} onChange={(e) => onChange({ name: e.target.value })} className="mt-1 w-full rounded-lg border-2 border-black px-3 py-2 font-mono text-xs" /></label>
    {item.type === 'icon' && <label className="block text-xs font-bold">Icon<input value={item.icon || 'Star'} onChange={(e) => onChange({ icon: e.target.value, src: '' })} list="editor-icon-options" className="mt-1 w-full rounded-lg border-2 border-black px-3 py-2 font-mono text-xs" /><datalist id="editor-icon-options">{['Star','Heart','Sparkles','Camera','CheckCircle2','ArrowUpRight'].map((icon) => <option key={icon} value={icon}/>)}</datalist></label>}
    <label className="block text-xs font-bold">{item.type === 'image' ? 'Image URL' : 'Custom icon image URL'}<input type="url" value={item.src?.startsWith('data:') ? '' : item.src || ''} onChange={(e) => onChange({ src: e.target.value })} placeholder="https://…" className="mt-1 w-full rounded-lg border-2 border-black px-3 py-2 font-mono text-xs" /></label>
    <label className="block cursor-pointer rounded-lg border-2 border-dashed border-black p-3 text-center font-mono text-xs font-bold">Upload {item.type === 'image' ? 'image' : 'icon image'}<input type="file" accept="image/*" className="sr-only" onChange={(e) => onUpload(e.target.files?.[0])} /></label>
    <p className="font-mono text-[10px] font-bold uppercase text-neutral-500">Position & size (px)</p>
    <div className="grid grid-cols-2 gap-2">{fields.map(([key, label]) => <label key={key} className="text-[10px] font-bold">{label}<input type="number" min={key === 'width' || key === 'height' ? 16 : 0} value={item[key]} onChange={(e) => onChange({ [key]: Math.max(key === 'width' || key === 'height' ? 16 : 0, Number(e.target.value) || 0) })} className="mt-1 w-full rounded-lg border-2 border-black px-2 py-2 font-mono text-xs" /></label>)}</div>
    <button type="button" onClick={() => onChange({ x: 0 })} className="w-full rounded-lg border border-black bg-white py-2 font-mono text-xs">Align to left edge</button>
  </div>;
}

function SiteSettingsPanel({ siteTitle, onSiteTitleChange, subdomain, onSubdomainChange, customCss, onCustomCssChange, onOpenDeploy, onOpenPages, onOpenNavigation, onOpenAssets }: {
  siteTitle: string; onSiteTitleChange: (value: string) => void; subdomain: string; onSubdomainChange: (value: string) => void;
  customCss: string; onCustomCssChange: (value: string) => void; onOpenDeploy: () => void; onOpenPages: () => void; onOpenNavigation: () => void; onOpenAssets: () => void;
}) {
  const [variables, setVariables] = useState<Array<{ id: string; name: string; value: string }>>([]);
  return <div className="space-y-4">
    <section className="space-y-3 rounded-xl border-2 border-black/15 bg-white p-3">
      <h3 className="font-mono text-[10px] font-black uppercase">Site identity</h3>
      <label className="block font-mono text-[9px] font-bold uppercase">Website name<input value={siteTitle} onChange={(event) => onSiteTitleChange(event.target.value)} className="mt-1 w-full rounded-lg border border-black/25 px-2 py-2 font-sans text-sm font-normal normal-case" /></label>
      <label className="block font-mono text-[9px] font-bold uppercase">Launchly address<div className="mt-1 flex items-center rounded-lg border border-black/25 px-2"><input value={subdomain} onChange={(event) => onSubdomainChange(event.target.value)} className="min-w-0 flex-1 py-2 font-mono text-xs font-normal normal-case outline-none"/><span className="shrink-0 font-mono text-[9px] text-neutral-500">.launchly.site</span></div></label>
      <p className="font-mono text-[9px] leading-relaxed text-neutral-500">The address is saved with your site draft. A custom domain can be connected after publishing.</p>
    </section>
    <section className="space-y-2 rounded-xl border-2 border-black/15 bg-white p-3">
      <h3 className="font-mono text-[10px] font-black uppercase">Developer tools</h3>
      <div className="grid grid-cols-2 gap-2">{[["Pages", onOpenPages], ["Navigation", onOpenNavigation], ["Media & logo", onOpenAssets], ["Deploy targets", onOpenDeploy]].map(([label, action]) => <button key={String(label)} type="button" onClick={action as () => void} className="rounded-lg border border-black bg-white px-2 py-2 text-left font-mono text-[10px] font-bold hover:bg-yellow">{String(label)} ↗</button>)}</div>
      <p className="font-mono text-[9px] leading-relaxed text-neutral-500">Configure GitHub or Vercel from Deploy targets. API endpoints, form submissions, and app runtime settings are managed by the connected deployment.</p>
    </section>
    <section className="space-y-2 rounded-xl border-2 border-black/15 bg-white p-3">
      <div className="flex items-center justify-between"><h3 className="font-mono text-[10px] font-black uppercase">Environment variables</h3><button type="button" onClick={() => setVariables((items) => [...items, { id: `env-${Date.now()}`, name: '', value: '' }])} className="rounded border border-black bg-yellow px-2 py-1 font-mono text-[9px] font-bold">＋ Add</button></div>
      <p className="rounded-lg bg-amber-50 p-2 font-mono text-[9px] leading-relaxed text-amber-900">These are temporary inputs for reference only. They stay in this editor tab, are never saved to the website or ZIP, and are cleared when you leave. For runtime secrets, add them in Vercel Project Settings → Environment Variables or as encrypted GitHub Actions secrets.</p>
      {variables.map((item) => <div key={item.id} className="space-y-1 rounded-lg border border-black/15 p-2"><div className="flex gap-1"><input aria-label="Environment variable name" value={item.name} onChange={(event) => setVariables((items) => items.map((entry) => entry.id === item.id ? { ...entry, name: event.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_') } : entry))} placeholder="STRIPE_SECRET_KEY" className="min-w-0 flex-1 rounded border px-2 py-1.5 font-mono text-[9px]"/><button type="button" aria-label="Remove environment variable" onClick={() => setVariables((items) => items.filter((entry) => entry.id !== item.id))} className="px-1 text-red-700"><Trash2 size={13}/></button></div><input aria-label={`Temporary value for ${item.name || 'environment variable'}`} type="password" autoComplete="new-password" value={item.value} onChange={(event) => setVariables((items) => items.map((entry) => entry.id === item.id ? { ...entry, value: event.target.value } : entry))} placeholder="Value (not saved)" className="w-full rounded border px-2 py-1.5 font-mono text-[10px]"/></div>)}
      {!variables.length && <p className="font-mono text-[9px] text-neutral-500">Add a variable name to keep track of the deployment configuration you need.</p>}
    </section>
    <section className="space-y-2 rounded-xl border-2 border-black/15 bg-white p-3">
      <h3 className="font-mono text-[10px] font-black uppercase">Custom CSS</h3>
      <textarea aria-label="Site custom CSS" rows={8} spellCheck={false} value={customCss} onChange={(event) => onCustomCssChange(event.target.value)} placeholder=".my-section { padding: 3rem; }" className="w-full rounded-lg border border-black/25 px-2 py-2 font-mono text-[10px]" />
      <p className="font-mono text-[9px] leading-relaxed text-neutral-500">Saved in site settings and applied when the site renderer supports custom CSS. Keep scripts and secret values out of CSS.</p>
    </section>
  </div>;
}

async function optimizeEditorImage(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext('2d');
  if (!context) { bitmap.close(); throw new Error('Image processing is unavailable.'); }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((result) => result ? resolve(result) : reject(new Error('Could not process this image.')), 'image/webp', 0.78));
  if (blob.size > 180 * 1024) throw new Error('This image is still too large after optimization. Use a smaller image or paste an image URL.');
  return await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Could not read this image.')); reader.onerror = () => reject(new Error('Could not read this image.')); reader.readAsDataURL(blob); });
}

function WidgetSpecificProperties({ element, pages, changeContent }: { element: SiteElement; pages: SiteDocument['pages']; changeContent: (key: string, value: unknown) => void }) {
  const catalogItem = getEditorCatalogItem(String(element.content.blockType || ''));
  const label = catalogItem?.label || String(element.content.title || element.name || 'Widget');
  const normalized = label.toLowerCase();
  const items = Array.isArray(element.content.items) ? element.content.items as Array<Record<string, unknown>> : [];
  const changeItem = (index: number, key: string, value: unknown) => changeContent('items', items.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item));
  const reorderItem = (index: number, offset: -1 | 1) => {
    const next = [...items];
    const destination = index + offset;
    if (destination < 0 || destination >= next.length) return;
    [next[index], next[destination]] = [next[destination], next[index]];
    changeContent('items', next);
  };
  const hasDedicatedRepeater = ['team', 'testimonial', 'review', 'service', 'feature', 'logo cloud', 'skill bar', 'progress bar', 'stat', 'counter'].some((term) => normalized.includes(term));
  return <div className="space-y-3 rounded-xl border-2 border-black/15 bg-yellow/10 p-3">
    <div><p className="font-mono text-[10px] font-black uppercase">{label} settings</p><p className="mt-1 font-mono text-[9px] text-neutral-500">Widget-specific content and behavior</p></div>
    {(normalized.includes('carousel') || normalized.includes('slider') || normalized.includes('gallery')) && <><label className="block font-mono text-[9px] font-bold uppercase">Images (one URL per line)<textarea rows={5} value={(Array.isArray(element.content.images) ? element.content.images : []).map(String).join('\n')} onChange={(event) => changeContent('images', event.target.value.split(/\r?\n/).map((url) => url.trim()).filter(Boolean))} className="mt-1 w-full rounded border border-black/25 p-2 font-mono text-[10px]" placeholder="https://example.com/photo.jpg" /></label><label className="flex cursor-pointer items-center justify-center gap-2 rounded border border-dashed border-black/30 px-2 py-2 font-mono text-[9px] font-bold hover:bg-yellow/40"><ImageIcon size={12}/> Upload optimized images<input type="file" accept="image/*" multiple className="sr-only" onChange={(event) => { const files = Array.from(event.target.files || []).slice(0, 5); const input = event.currentTarget; input.value = ''; void Promise.all(files.map(optimizeEditorImage)).then((uploads) => { const current = (Array.isArray(element.content.images) ? element.content.images : []).map(String); const combined = [...current, ...uploads]; if (combined.reduce((total, image) => total + image.length, 0) > 1_400_000) { window.alert('This gallery is at its local storage limit. Use image URLs or remove some images.'); return; } changeContent('images', combined); }).catch((error: unknown) => window.alert(error instanceof Error ? error.message : 'Could not upload these images.')); }}/></label><p className="text-[9px] text-neutral-500">Images are resized and optimized to protect editor storage.</p><label className="flex items-center gap-2 font-mono text-[9px] font-bold uppercase"><input type="checkbox" checked={Boolean(element.content.autoplay)} onChange={(event) => changeContent('autoplay', event.target.checked)}/>Auto-scroll</label><label className="block font-mono text-[9px] font-bold uppercase">Slide interval (seconds)<input type="number" min="2" max="30" value={Math.round((Number(element.content.intervalMs) || 4000) / 1000)} onChange={(event) => changeContent('intervalMs', Math.max(2, Math.min(30, Number(event.target.value) || 4) * 1000))} className="mt-1 w-full rounded border px-2 py-1.5 font-mono text-xs"/></label></>}
    {(normalized.includes('product') || normalized.includes('pricing') || normalized.includes('plan')) && <label className="block font-mono text-[9px] font-bold uppercase">Price or starting price<input value={String(element.content.price || '')} onChange={(event) => changeContent('price', event.target.value)} placeholder="$49" className="mt-1 w-full rounded border px-2 py-1.5 font-sans text-sm font-normal normal-case"/></label>}
    {(normalized.includes('team') || normalized.includes('testimonial') || normalized.includes('review') || normalized.includes('service') || normalized.includes('feature') || normalized.includes('logo cloud') || normalized.includes('skill bar') || normalized.includes('progress bar') || normalized.includes('stat') || normalized.includes('counter')) && <><p className="font-mono text-[9px] font-bold uppercase">Repeating items</p>{items.map((item, index) => <div key={index} className="space-y-1 rounded-lg border border-black/15 bg-white p-2"><input aria-label={`Item ${index + 1} title`} value={String(item.title || item.name || item.label || '')} onChange={(event) => changeItem(index, 'title', event.target.value)} placeholder="Title / name" className="w-full rounded border px-2 py-1.5 text-xs"/><textarea aria-label={`Item ${index + 1} description`} value={String(item.description || item.desc || item.quote || '')} onChange={(event) => changeItem(index, 'description', event.target.value)} placeholder="Description, quote, or role" rows={2} className="w-full rounded border px-2 py-1.5 text-xs"/>{(normalized.includes('skill bar') || normalized.includes('progress bar') || normalized.includes('counter') || normalized.includes('stat')) && <label className="block font-mono text-[9px] font-bold uppercase">Value<input type="number" min={0} max={100} value={Number(item.value ?? item.percent ?? 0)} onChange={(event) => changeItem(index, 'value', Math.max(0, Math.min(100, Number(event.target.value) || 0)))} className="mt-1 w-full rounded border px-2 py-1.5 font-sans text-xs normal-case"/></label>}{(normalized.includes('team') || normalized.includes('testimonial') || normalized.includes('review') || normalized.includes('service') || normalized.includes('feature') || normalized.includes('logo cloud')) && <><label className="block font-mono text-[9px] font-bold uppercase">Image URL<input value={String(item.image || item.src || '')} onChange={(event) => changeItem(index, 'image', event.target.value)} placeholder="https://example.com/image.jpg" className="mt-1 w-full rounded border px-2 py-1.5 font-sans text-xs font-normal normal-case"/></label><label className="flex cursor-pointer items-center justify-center gap-2 rounded border border-dashed border-black/30 px-2 py-1.5 font-mono text-[9px] font-bold hover:bg-yellow/40"><ImageIcon size={12}/> Upload image<input type="file" accept="image/*" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => { if (typeof reader.result === 'string') changeItem(index, 'image', reader.result); }; reader.readAsDataURL(file); event.currentTarget.value = ''; }}/></label></>}<div className="flex items-center justify-between"><div className="flex gap-1"><button type="button" disabled={index === 0} onClick={() => reorderItem(index, -1)} aria-label={`Move item ${index + 1} up`} className="rounded border px-2 py-1 text-[9px] disabled:opacity-40">↑</button><button type="button" disabled={index === items.length - 1} onClick={() => reorderItem(index, 1)} aria-label={`Move item ${index + 1} down`} className="rounded border px-2 py-1 text-[9px] disabled:opacity-40">↓</button></div><button type="button" onClick={() => changeContent('items', items.filter((_, itemIndex) => itemIndex !== index))} className="text-[9px] font-bold text-red-700">Remove item</button></div></div>)}<button type="button" onClick={() => changeContent('items', [...items, { title: `Item ${items.length + 1}`, description: '', ...(normalized.includes('skill bar') || normalized.includes('progress bar') ? { value: 50 } : {}) }])} className="w-full rounded-lg border border-black bg-white py-2 font-mono text-[10px] font-bold">＋ Add item</button></>}
    {(normalized.includes('map') || normalized.includes('embed') || normalized.includes('iframe') || normalized.includes('calendar') || normalized.includes('instagram') || normalized.includes('twitter') || normalized.includes('audio') || normalized.includes('podcast') || normalized.includes('youtube') || normalized.includes('vimeo') || normalized.includes('video')) && <label className="block font-mono text-[9px] font-bold uppercase">Embed or media URL<input type="url" value={String(element.content.url || element.content.src || '')} onChange={(event) => changeContent('url', event.target.value)} placeholder="https://…" className="mt-1 w-full rounded border px-2 py-1.5 font-mono text-[10px] font-normal normal-case" /></label>}
    {(normalized.includes('before') || normalized.includes('lottie') || normalized.includes('svg') || normalized.includes('stock photo') || normalized.includes('image crop') || normalized.includes('parallax')) && <><label className="block font-mono text-[9px] font-bold uppercase">Primary image / asset URL<input value={String(element.content.src || element.content.url || '')} onChange={(event) => changeContent('src', event.target.value)} placeholder="https://…" className="mt-1 w-full rounded border px-2 py-1.5 font-mono text-[10px] font-normal normal-case" /></label><label className="flex cursor-pointer items-center justify-center gap-2 rounded border border-dashed border-black/30 px-2 py-2 font-mono text-[9px] font-bold hover:bg-yellow/40"><ImageIcon size={12}/> Upload asset<input type="file" accept="image/*,.svg,.json" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => { if (typeof reader.result === 'string') changeContent('src', reader.result); }; reader.readAsDataURL(file); event.currentTarget.value = ''; }} /></label></>}
    {normalized.includes('countdown') && <label className="block font-mono text-[9px] font-bold uppercase">Countdown seconds<input type="number" min={0} value={Number(element.content.seconds || 86400)} onChange={(event) => changeContent('seconds', Math.max(0, Number(event.target.value) || 0))} className="mt-1 w-full rounded border px-2 py-1.5 font-mono text-xs" /></label>}
    {!hasDedicatedRepeater && <div className="space-y-2 rounded-lg border border-black/15 bg-white p-2"><p className="font-mono text-[9px] font-bold uppercase">Content items</p><p className="text-[9px] text-neutral-500">Add, edit, reorder, or remove the repeated content shown by this widget.</p>{items.map((item, index) => <details key={index} open={index === 0} className="rounded border border-black/15 p-2"><summary className="cursor-pointer font-mono text-[9px] font-bold">{String(item.title || item.name || item.label || `Item ${index + 1}`)}</summary><div className="mt-2 space-y-2">{Object.entries(item).filter(([, value]) => value === null || ['string', 'number', 'boolean'].includes(typeof value)).map(([key, value]) => <label key={key} className="block font-mono text-[9px] font-bold uppercase">{key.replace(/([A-Z])/g, ' $1')} {typeof value === 'boolean' ? <input type="checkbox" checked={value} onChange={(event) => changeItem(index, key, event.target.checked)} className="ml-2"/> : key.toLowerCase().includes('description') || key.toLowerCase().includes('quote') || key.toLowerCase().includes('content') ? <textarea rows={2} value={String(value ?? '')} onChange={(event) => changeItem(index, key, event.target.value)} className="mt-1 w-full rounded border px-2 py-1.5 font-sans text-xs font-normal normal-case"/> : <input type={typeof value === 'number' ? 'number' : 'text'} value={String(value ?? '')} onChange={(event) => changeItem(index, key, typeof value === 'number' ? Number(event.target.value) || 0 : event.target.value)} className="mt-1 w-full rounded border px-2 py-1.5 font-sans text-xs font-normal normal-case"/>}</label>)}{(typeof item.image === 'string' || typeof item.src === 'string') && <label className="flex cursor-pointer items-center justify-center gap-2 rounded border border-dashed border-black/30 px-2 py-1.5 font-mono text-[9px] font-bold hover:bg-yellow/40"><ImageIcon size={12}/> Upload or replace image<input type="file" accept="image/*" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (!file) return; if (file.size > 5 * 1024 * 1024) { window.alert('Choose an image smaller than 5 MB.'); event.currentTarget.value = ''; return; } const reader = new FileReader(); reader.onload = () => { if (typeof reader.result === 'string') changeItem(index, typeof item.image === 'string' ? 'image' : 'src', reader.result); }; reader.readAsDataURL(file); event.currentTarget.value = ''; }}/></label>}<div className="flex items-center justify-between"><div className="flex gap-1"><button type="button" disabled={index === 0} onClick={() => reorderItem(index, -1)} aria-label={`Move item ${index + 1} up`} className="rounded border px-2 py-1 text-[9px] disabled:opacity-40">↑</button><button type="button" disabled={index === items.length - 1} onClick={() => reorderItem(index, 1)} aria-label={`Move item ${index + 1} down`} className="rounded border px-2 py-1 text-[9px] disabled:opacity-40">↓</button></div><button type="button" onClick={() => changeContent('items', items.filter((_, itemIndex) => itemIndex !== index))} className="text-[9px] font-bold text-red-700">Remove item</button></div></div></details>)}<button type="button" onClick={() => changeContent('items', [...items, { title: `Item ${items.length + 1}`, description: '', href: '', image: '' }])} className="w-full rounded border border-black py-1.5 font-mono text-[9px] font-bold">＋ Add content item</button></div>}
    <label className="block font-mono text-[9px] font-bold uppercase">Button / action label<input value={String(element.content.buttonText || element.content.cta || '')} onChange={(event) => changeContent('buttonText', event.target.value)} placeholder="Optional" className="mt-1 w-full rounded border px-2 py-1.5 font-sans text-sm font-normal normal-case"/></label>
    <ButtonActionControls element={element} pages={pages} changeContent={changeContent} />
  </div>;
}

function ButtonActionControls({ element, pages, changeContent }: { element: SiteElement; pages: SiteDocument['pages']; changeContent: (key: string, value: unknown) => void }) {
  const targets: Array<{ value: ButtonTarget; label: string }> = [
    { value: 'url', label: 'Website URL' }, { value: 'page', label: 'Site page' }, { value: 'anchor', label: 'Page section / anchor' },
    { value: 'email', label: 'Send email' }, { value: 'phone', label: 'Call phone number' }, { value: 'whatsapp', label: 'Open WhatsApp chat' },
    { value: 'telegram', label: 'Open Telegram chat' }, { value: 'discord', label: 'Open Discord invite' }, { value: 'download', label: 'Download a file' }, { value: 'back-to-top', label: 'Scroll to top' },
  ];
  const target = (String(element.content.linkTarget || 'url') as ButtonTarget);
  const value = String(element.content.linkValue || element.content.href || '');
  const valueLabel: Partial<Record<ButtonTarget, string>> = { url: 'Destination URL', anchor: 'Section anchor ID', email: 'Email address', phone: 'Phone number', whatsapp: 'WhatsApp phone number', telegram: 'Telegram username', discord: 'Discord invite URL', download: 'File URL' };
  const placeholder: Partial<Record<ButtonTarget, string>> = { url: 'https://example.com', anchor: 'contact', email: 'hello@example.com', phone: '+1 555 123 4567', whatsapp: '+1 555 123 4567', telegram: '@yourchannel', discord: 'https://discord.gg/invite', download: 'https://example.com/catalog.pdf' };
  const setTarget = (next: ButtonTarget) => {
    changeContent('linkTarget', next);
    changeContent('linkValue', next === 'page' ? pages.find((page) => !page.isHome)?.id || pages[0]?.id || '' : next === 'anchor' ? 'contact' : '');
    if (next !== 'download') changeContent('downloadName', '');
    if (next === 'back-to-top') changeContent('newTab', false);
  };
  return <div className="space-y-2 rounded-xl border border-black/15 bg-neutral-50 p-3">
    <label className="block font-mono text-[10px] font-bold uppercase text-neutral-500">Button action<select value={target} onChange={(event) => setTarget(event.target.value as ButtonTarget)} className="mt-1 w-full rounded-lg border-2 border-black bg-white px-2 py-2 font-mono text-xs font-normal normal-case text-black">{targets.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
    {target === 'page' ? <label className="block font-mono text-[10px] font-bold uppercase text-neutral-500">Destination page<select value={value} onChange={(event) => changeContent('linkValue', event.target.value)} className="mt-1 w-full rounded-lg border-2 border-black bg-white px-2 py-2 font-mono text-xs font-normal normal-case text-black">{pages.map((page) => <option key={page.id} value={page.id}>{page.title}</option>)}</select></label> : target !== 'back-to-top' ? <label className="block font-mono text-[10px] font-bold uppercase text-neutral-500">{valueLabel[target]}<input value={value} onChange={(event) => changeContent('linkValue', event.target.value)} placeholder={placeholder[target]} type={target === 'email' ? 'email' : target === 'phone' || target === 'whatsapp' ? 'tel' : 'text'} className="mt-1 w-full rounded-lg border-2 border-black px-2 py-2 font-mono text-xs font-normal normal-case text-black" /></label> : <p className="rounded-lg bg-white p-2 text-xs text-neutral-600">This button smoothly returns visitors to the top of the current page.</p>}
    {target === 'download' && <label className="block font-mono text-[10px] font-bold uppercase text-neutral-500">Suggested downloaded filename<input value={String(element.content.downloadName || '')} onChange={(event) => changeContent('downloadName', event.target.value)} placeholder="product-guide.pdf" className="mt-1 w-full rounded-lg border-2 border-black px-2 py-2 font-mono text-xs font-normal normal-case text-black" /></label>}
    {!['email', 'phone', 'whatsapp', 'telegram', 'back-to-top'].includes(target) && <label className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase text-neutral-500"><input type="checkbox" checked={Boolean(element.content.newTab)} onChange={(event) => changeContent('newTab', event.target.checked)} />Open in new tab</label>}
    <label className="block font-mono text-[10px] font-bold uppercase text-neutral-500">Accessible label (optional)<input value={String(element.content.ariaLabel || '')} onChange={(event) => changeContent('ariaLabel', event.target.value)} placeholder={String(element.content.text || 'Button label')} className="mt-1 w-full rounded-lg border-2 border-black px-2 py-2 font-mono text-xs font-normal normal-case text-black" /></label>
  </div>;
}

function TreeElementProperties({ element, pages, device, onChange, onUpload }: { element: SiteElement; pages: SiteDocument['pages']; device: DeviceMode; onChange: (update: (element: SiteElement) => SiteElement) => void; onUpload: (file?: File) => void }) {
  const [tab, setTab] = useState<'content' | 'style' | 'interactions' | 'advanced'>('content');
  const changeContent = (key: string, value: unknown) => onChange((current) => ({ ...current, content: { ...current.content, [key]: value } }));
  const effectiveStyle = { ...element.style, ...(device === 'desktop' ? {} : element.responsive?.[device]) };
  const changeStyle = (key: keyof SiteElement['style'], value: SiteElement['style'][keyof SiteElement['style']]) => onChange((current) => device === 'desktop' ? ({ ...current, style: { ...current.style, [key]: value } }) : ({ ...current, responsive: { ...current.responsive, [device]: { ...current.responsive?.[device], [key]: value } } }));
  const gradientStops = effectiveStyle.gradientStops?.length ? effectiveStyle.gradientStops : [{ color: effectiveStyle.backgroundColor || '#ffffff', position: 0 }, { color: '#f9a8d4', position: 100 }];
  const blurMatch = String(effectiveStyle.filter || '').match(/blur\((\d+(?:\.\d+)?)px\)/);
  const blurAmount = blurMatch ? Number(blurMatch[1]) : 0;
  const updateGradientStop = (index: number, update: Partial<{ color: string; position: number }>) => changeStyle('gradientStops', gradientStops.map((stop, stopIndex) => stopIndex === index ? { ...stop, ...update } : stop));
  const formFields = Array.isArray(element.content.fields) ? element.content.fields as FormField[] : getDefaultFormFields();
  const updateFormField = (fieldId: string, update: (field: FormField) => FormField) => changeContent('fields', formFields.map((field) => field.id === fieldId ? update(field) : field));
  const addFormField = () => changeContent('fields', [...formFields, { id: `field-${Date.now()}`, label: 'New field', name: `field_${formFields.length + 1}`, type: 'text', placeholder: '', required: false }]);
  return <div className="space-y-4">
    <div><p className="font-mono text-[10px] font-black uppercase text-neutral-500">{element.name || (element.type === 'block' && typeof element.content.title === 'string' ? element.content.title : element.type.split(/[-_]/g).map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' '))} properties</p><label className="mt-2 block font-mono text-[9px] font-bold uppercase text-neutral-500">Element name<input value={element.name || element.type.split(/[-_]/g).map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')} onChange={(event) => onChange((current) => ({ ...current, name: event.target.value }))} className="mt-1 w-full rounded-lg border-2 border-black px-2 py-2 font-mono text-xs font-normal normal-case text-black" /></label><div className="mt-2 grid grid-cols-4 gap-1">{(['content', 'style', 'interactions', 'advanced'] as const).map((item) => <button key={item} type="button" onClick={() => setTab(item)} className={`rounded-lg border px-1 py-1.5 font-mono text-[9px] font-bold uppercase ${tab === item ? 'border-black bg-yellow' : 'border-black/20 bg-white'}`}>{item}</button>)}</div></div>
    {tab === 'content' && <div className="space-y-3">
      {element.type !== 'spacer' && element.type !== 'divider' && <label className="block font-mono text-[10px] font-bold uppercase text-neutral-500">{['heading', 'text', 'button'].includes(element.type) ? 'Text' : 'Title / label'}<textarea rows={3} value={String(element.content.text || element.content.title || '')} onChange={(event) => changeContent(typeof element.content.text === 'string' ? 'text' : 'title', event.target.value)} className="mt-1 w-full rounded-lg border-2 border-black px-2 py-2 font-sans text-sm font-normal normal-case text-black" /></label>}
      {element.type === 'heading' && <label className="block font-mono text-[10px] font-bold uppercase text-neutral-500">Heading level<select value={Number(element.content.level) || 2} onChange={(event) => changeContent('level', Number(event.target.value))} className="mt-1 w-full rounded-lg border-2 border-black bg-white px-2 py-2 font-mono text-xs text-black">{[1, 2, 3, 4, 5, 6].map((level) => <option key={level} value={level}>H{level}</option>)}</select></label>}
      {element.type === 'quote' && <label className="block font-mono text-[10px] font-bold uppercase text-neutral-500">Attribution<input value={String(element.content.attribution || '')} onChange={(event) => changeContent('attribution', event.target.value)} className="mt-1 w-full rounded-lg border-2 border-black px-2 py-2 font-sans text-sm font-normal normal-case text-black" /></label>}
      {['image', 'image-caption', 'video'].includes(element.type) && <label className="block font-mono text-[10px] font-bold uppercase text-neutral-500">Media URL<input value={String(element.content.src || '')} onChange={(event) => changeContent('src', event.target.value)} placeholder="https://…" className="mt-1 w-full rounded-lg border-2 border-black px-2 py-2 font-mono text-xs font-normal normal-case text-black" /></label>}
      {element.type === 'button' && <ButtonActionControls element={element} pages={pages} changeContent={changeContent} />}

      {element.type === 'form' && <div className="space-y-3 rounded-xl border border-black/15 bg-neutral-50 p-3"><label className="block font-mono text-[10px] font-bold uppercase text-neutral-500">Submit to<select value={String(element.content.endpoint || 'contact')} onChange={(event) => changeContent('endpoint', event.target.value)} className="mt-1 w-full rounded-lg border-2 border-black bg-white px-2 py-2 font-mono text-xs font-normal normal-case text-black"><option value="contact">Launchly contact inbox</option><option value="newsletter">Newsletter subscribers</option><option value="custom">Custom API endpoint</option></select></label>{element.content.endpoint === 'custom' && <label className="block font-mono text-[10px] font-bold uppercase text-neutral-500">API URL<input type="url" value={String(element.content.apiUrl || '')} onChange={(event) => changeContent('apiUrl', event.target.value)} placeholder="https://api.example.com/lead" className="mt-1 w-full rounded-lg border-2 border-black px-2 py-2 font-mono text-xs font-normal normal-case text-black"/><span className="mt-1 block font-normal normal-case">Submissions are sent from the visitor’s browser as JSON. Don’t put secret API keys here.</span></label>}<p className="font-mono text-[10px] font-black uppercase">Form fields</p>{formFields.map((field) => <div key={field.id} className="space-y-2 rounded-lg border border-black/15 bg-white p-2"><input aria-label="Field label" value={field.label} onChange={(event) => updateFormField(field.id, (current) => ({ ...current, label: event.target.value }))} placeholder="Label" className="w-full rounded border px-2 py-1.5 text-xs"/><div className="grid grid-cols-2 gap-2"><input aria-label="Field key" value={field.name} onChange={(event) => updateFormField(field.id, (current) => ({ ...current, name: event.target.value.replace(/[^a-zA-Z0-9_]/g, '_') }))} placeholder="API field key" className="min-w-0 rounded border px-2 py-1.5 font-mono text-[10px]"/><select aria-label="Field type" value={field.type} onChange={(event) => updateFormField(field.id, (current) => ({ ...current, type: event.target.value as FormField['type'] }))} className="min-w-0 rounded border bg-white px-2 py-1.5 text-[10px]"><option value="text">Text</option><option value="email">Email</option><option value="tel">Phone</option><option value="textarea">Long text</option><option value="select">Select</option><option value="radio">Radio</option><option value="checkbox">Checkbox</option><option value="date">Date</option><option value="number">Number</option><option value="file">File</option><option value="rating">Rating</option><option value="hidden">Hidden</option></select></div><input aria-label="Placeholder" value={field.placeholder} onChange={(event) => updateFormField(field.id, (current) => ({ ...current, placeholder: event.target.value }))} placeholder="Placeholder" className="w-full rounded border px-2 py-1.5 text-xs"/>{["select", "radio"].includes(field.type) && <textarea aria-label="Form field options" value={(field.options || []).join("\n")} onChange={(event) => updateFormField(field.id, (current) => ({ ...current, options: event.target.value.split(/\r?\n/).filter((value) => value.trim()) }))} placeholder="One option per line" rows={3} className="w-full rounded border px-2 py-1.5 text-xs"/>}<div className="flex items-center justify-between"><label className="flex items-center gap-1 text-[10px]"><input type="checkbox" checked={field.required} onChange={(event) => updateFormField(field.id, (current) => ({ ...current, required: event.target.checked }))}/>Required</label><button type="button" onClick={() => changeContent('fields', formFields.filter((entry) => entry.id !== field.id))} className="text-[10px] font-bold text-red-700">Remove</button></div></div>)}<button type="button" onClick={addFormField} className="w-full rounded-lg border-2 border-black bg-white px-3 py-2 font-mono text-xs font-bold">+ Add field</button><label className="block font-mono text-[10px] font-bold uppercase text-neutral-500">Success message<input value={String(element.content.successMessage || '')} onChange={(event) => changeContent('successMessage', event.target.value)} className="mt-1 w-full rounded-lg border-2 border-black px-2 py-2 font-sans text-sm font-normal normal-case text-black"/></label></div>}
       {['image', 'image-caption'].includes(element.type) && <label className="block font-mono text-[10px] font-bold uppercase text-neutral-500">Alt text<input value={String(element.content.alt || '')} onChange={(event) => changeContent('alt', event.target.value)} placeholder="Describe the image" className="mt-1 w-full rounded-lg border-2 border-black px-2 py-2 font-sans text-sm font-normal normal-case text-black" /></label>}
      {['card', 'block'].includes(element.type) && <label className="block font-mono text-[10px] font-bold uppercase text-neutral-500">Description<textarea rows={4} value={String(element.content.description || '')} onChange={(event) => changeContent('description', event.target.value)} className="mt-1 w-full rounded-lg border-2 border-black px-2 py-2 font-sans text-sm font-normal normal-case text-black" /></label>}
      {element.type === 'block' && <WidgetSpecificProperties element={element} pages={pages} changeContent={changeContent} />}
      {['list', 'numbered-list'].includes(element.type) && <label className="block font-mono text-[10px] font-bold uppercase text-neutral-500">List items<textarea rows={6} value={(Array.isArray(element.content.items) ? element.content.items : []).map(String).join('\n')} onChange={(event) => changeContent('items', event.target.value.split(/\r?\n/).filter((item) => item.trim()))} placeholder="One item per line" className="mt-1 w-full rounded-lg border-2 border-black px-2 py-2 font-sans text-sm font-normal normal-case text-black" /></label>}
      {element.type === 'image-caption' && <label className="block font-mono text-[10px] font-bold uppercase text-neutral-500">Caption<input value={String(element.content.caption || '')} onChange={(event) => changeContent('caption', event.target.value)} className="mt-1 w-full rounded-lg border-2 border-black px-2 py-2 font-sans text-sm font-normal normal-case text-black" /></label>}
      {['accordion', 'tabs', 'social-links'].includes(element.type) && <div className="space-y-2 rounded-xl border border-black/15 bg-neutral-50 p-3"><p className="font-mono text-[10px] font-bold uppercase text-neutral-500">{element.type} items</p>{(Array.isArray(element.content.items) ? element.content.items as Array<Record<string, unknown>> : []).map((item, index, all) => <div key={index} className="space-y-1 rounded-lg border border-black/15 bg-white p-2"><label className="block text-[10px] font-bold">Label<input value={String(item.title || '')} onChange={(event) => changeContent('items', all.map((current, currentIndex) => currentIndex === index ? { ...current, title: event.target.value } : current))} className="mt-1 w-full rounded border px-2 py-1.5 text-xs" /></label>{element.type === 'social-links' ? <label className="block text-[10px] font-bold">Link URL<input value={String(item.url || '')} onChange={(event) => changeContent('items', all.map((current, currentIndex) => currentIndex === index ? { ...current, url: event.target.value } : current))} className="mt-1 w-full rounded border px-2 py-1.5 text-xs" /></label> : <label className="block text-[10px] font-bold">Content<textarea rows={2} value={String(item.description || '')} onChange={(event) => changeContent('items', all.map((current, currentIndex) => currentIndex === index ? { ...current, description: event.target.value } : current))} className="mt-1 w-full rounded border px-2 py-1.5 text-xs" /></label>}<button type="button" onClick={() => changeContent('items', all.filter((_, currentIndex) => currentIndex !== index))} className="text-[10px] font-bold text-red-700">Remove</button></div>)}<button type="button" onClick={() => changeContent('items', [...(Array.isArray(element.content.items) ? element.content.items as Array<Record<string, unknown>> : []), { title: element.type === 'accordion' ? 'Question' : `Item ${(Array.isArray(element.content.items) ? element.content.items.length : 0) + 1}`, description: 'Add content.', url: '' }])} className="w-full rounded-lg border border-black bg-white py-2 font-mono text-[10px] font-bold">+ Add item</button></div>}
      {element.type === 'gallery' && <><label className="block font-mono text-[10px] font-bold uppercase text-neutral-500">Image URLs<textarea rows={6} value={(Array.isArray(element.content.images) ? element.content.images : []).map(String).join('\n')} onChange={(event) => changeContent('images', event.target.value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean))} placeholder="https://example.com/image.jpg" className="mt-1 w-full rounded-lg border-2 border-black px-2 py-2 font-mono text-xs font-normal normal-case text-black" /></label><label className="flex cursor-pointer items-center justify-center gap-2 rounded border border-dashed border-black/30 px-2 py-2 font-mono text-[9px] font-bold hover:bg-yellow/40"><ImageIcon size={12}/> Upload optimized images<input type="file" accept="image/*" multiple className="sr-only" onChange={(event) => { const files = Array.from(event.target.files || []).slice(0, 5); const input = event.currentTarget; input.value = ''; void Promise.all(files.map(optimizeEditorImage)).then((uploads) => { const current = (Array.isArray(element.content.images) ? element.content.images : []).map(String); const combined = [...current, ...uploads]; if (combined.reduce((total, image) => total + image.length, 0) > 1_400_000) { window.alert('This gallery is at its local storage limit. Use image URLs or remove some images.'); return; } changeContent('images', combined); }).catch((error: unknown) => window.alert(error instanceof Error ? error.message : 'Could not upload these images.')); }}/></label><p className="text-[9px] text-neutral-500">Images are resized and optimized to protect editor storage.</p><label className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase text-neutral-600"><input type="checkbox" checked={Boolean(element.content.carousel)} onChange={(event) => { changeContent('carousel', event.target.checked); if (!event.target.checked) changeContent('autoplay', false); }} />Carousel mode</label>{element.content.carousel && <><label className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase text-neutral-600"><input type="checkbox" checked={Boolean(element.content.autoplay)} onChange={(event) => changeContent('autoplay', event.target.checked)} />Auto-scroll gallery</label><label className="block font-mono text-[10px] font-bold uppercase text-neutral-500">Slide interval (seconds)<input type="number" min="2" max="20" value={Math.round((Number(element.content.intervalMs) || 4000) / 1000)} onChange={(event) => changeContent('intervalMs', Math.max(2, Math.min(20, Number(event.target.value) || 4)) * 1000)} className="mt-1 w-full rounded-lg border-2 border-black px-2 py-2 font-mono text-xs font-normal text-black" /></label></>}</>}
      {element.type === 'icon' && <label className="block font-mono text-[10px] font-bold uppercase text-neutral-500">Icon name<input value={String(element.content.icon || 'Star')} onChange={(event) => changeContent('icon', event.target.value)} list="site-icon-options" className="mt-1 w-full rounded-lg border-2 border-black px-2 py-2 font-mono text-xs font-normal normal-case text-black"/><datalist id="site-icon-options">{['Star','Heart','Sparkles','Camera','CheckCircle2','ArrowUpRight','Check','ArrowUp','ArrowDown'].map((name) => <option key={name} value={name}/>)}</datalist></label>}
      {element.type === 'icon' && <label className="block font-mono text-[10px] font-bold uppercase text-neutral-500">Icon size<input type="number" min="8" max="256" value={Number(element.content.size || 36)} onChange={(event) => changeContent('size', Math.max(8, Math.min(256, Number(event.target.value) || 36)))} className="mt-1 w-full rounded-lg border-2 border-black px-2 py-2 font-mono text-xs font-normal text-black" /></label>}
      {['image', 'image-caption', 'icon'].includes(element.type) && <label className="block cursor-pointer rounded-lg border-2 border-dashed border-black p-3 text-center font-mono text-xs font-bold">Upload {element.type}<input type="file" accept="image/*" className="sr-only" onChange={(event) => onUpload(event.target.files?.[0])} /></label>}
      {element.type === 'spacer' && <label className="block font-mono text-[10px] font-bold uppercase text-neutral-500">Height (px)<input type="number" min="0" max="1200" value={Number(element.content.height || 48)} onChange={(event) => changeContent('height', Math.max(0, Number(event.target.value) || 0))} className="mt-1 w-full rounded-lg border-2 border-black px-2 py-2 font-mono text-xs font-normal text-black" /></label>}
      <StructuredContentEditor key={JSON.stringify(element.content)} value={element.content} onChange={(content) => onChange((current) => ({ ...current, content }))} label="All content fields" />
    </div>}
    {tab === 'style' && <div className="space-y-3">
      <label className="block font-mono text-[10px] font-bold uppercase text-neutral-500">Text color<input type="color" value={effectiveStyle.color || '#111111'} onChange={(event) => changeStyle('color', event.target.value)} className="mt-1 h-9 w-full rounded border-2 border-black" /></label>
      <label className="block font-mono text-[10px] font-bold uppercase text-neutral-500">Background<input type="color" value={effectiveStyle.backgroundColor || '#ffffff'} onChange={(event) => changeStyle('backgroundColor', event.target.value)} className="mt-1 h-9 w-full rounded border-2 border-black" /></label>
       <div className="space-y-2 rounded-lg border-2 border-black/15 bg-neutral-50 p-2">
         <p className="font-mono text-[9px] font-black uppercase text-neutral-500">Gradient and surface</p>
         <label className="block font-mono text-[10px] font-bold uppercase text-neutral-500">Background fill<select value={effectiveStyle.gradientType || 'solid'} onChange={(event) => { const value = event.target.value; if (value === 'solid') { changeStyle('gradientType', undefined); changeStyle('gradientStops', undefined); } else { changeStyle('gradientType', value as 'linear' | 'radial' | 'conic'); changeStyle('gradientAngle', effectiveStyle.gradientAngle || 135); changeStyle('gradientStops', gradientStops); } }} className="mt-1 w-full rounded-lg border-2 border-black bg-white px-2 py-2 font-mono text-xs text-black"><option value="solid">Solid color</option><option value="linear">Linear gradient</option><option value="radial">Radial gradient</option><option value="conic">Conic gradient</option></select></label>
         {effectiveStyle.gradientType && <><div className="grid grid-cols-2 gap-2">{[0, 1].map((index) => <label key={index} className="block font-mono text-[9px] font-bold uppercase text-neutral-500">Stop {index + 1}<input type="color" value={gradientStops[index]?.color || '#ffffff'} onChange={(event) => updateGradientStop(index, { color: event.target.value })} className="mt-1 h-8 w-full rounded border border-black" /></label>)}</div><label className="block font-mono text-[9px] font-bold uppercase text-neutral-500">Angle ({Number(effectiveStyle.gradientAngle || 135)}°)<input type="range" min="0" max="360" value={Number(effectiveStyle.gradientAngle || 135)} onChange={(event) => changeStyle('gradientAngle', Number(event.target.value))} className="mt-1 w-full accent-pink" /></label></>}
         <label className="block font-mono text-[10px] font-bold uppercase text-neutral-500">Blur ({blurAmount}px)<input type="range" min="0" max="24" value={blurAmount} onChange={(event) => { const value = Number(event.target.value); changeStyle('filter', value ? `blur(${value}px)` : undefined); }} className="mt-1 w-full accent-pink" /></label>
         <label className="block font-mono text-[10px] font-bold uppercase text-neutral-500">Shadow<select value={effectiveStyle.boxShadow || ''} onChange={(event) => changeStyle('boxShadow', event.target.value || undefined)} className="mt-1 w-full rounded-lg border-2 border-black bg-white px-2 py-2 font-mono text-xs text-black"><option value="">None</option><option value="0 8px 24px rgba(17,24,39,.14)">Soft</option><option value="4px 4px 0 #000000">Hard</option><option value="0 0 28px rgba(236,72,153,.45)">Glow</option></select></label>
         <label className="block font-mono text-[10px] font-bold uppercase text-neutral-500">Shape<select value={effectiveStyle.clipPath || ''} onChange={(event) => changeStyle('clipPath', event.target.value || undefined)} className="mt-1 w-full rounded-lg border-2 border-black bg-white px-2 py-2 font-mono text-xs text-black"><option value="">Rectangle</option><option value="ellipse(48% 50% at 50% 50%)">Ellipse</option><option value="polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)">Blob</option><option value="polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)">Diamond</option><option value="polygon(0 0, 100% 0, 86% 100%, 14% 100%)">Arch</option></select></label>
       </div>
      <label className="block font-mono text-[10px] font-bold uppercase text-neutral-500">Font size (px)<input type="number" min="8" max="128" value={effectiveStyle.fontSize || 16} onChange={(event) => changeStyle('fontSize', Math.max(8, Math.min(128, Number(event.target.value) || 16)))} className="mt-1 w-full rounded-lg border-2 border-black px-2 py-2 font-mono text-xs font-normal text-black" /></label>
      <label className="block font-mono text-[10px] font-bold uppercase text-neutral-500">Font family<select value={effectiveStyle.fontFamily || ''} onChange={(event) => changeStyle('fontFamily', event.target.value || undefined)} className="mt-1 w-full rounded-lg border-2 border-black bg-white px-2 py-2 font-mono text-xs text-black"><option value="">Theme default</option><option value="Inter, sans-serif">Inter</option><option value="Arial, sans-serif">Arial</option><option value="Georgia, serif">Georgia</option><option value="'Courier New', monospace">Monospace</option><option value="system-ui, sans-serif">System</option></select></label>
      <label className="block font-mono text-[10px] font-bold uppercase text-neutral-500">Font weight<select value={effectiveStyle.fontWeight || 400} onChange={(event) => changeStyle('fontWeight', Number(event.target.value))} className="mt-1 w-full rounded-lg border-2 border-black bg-white px-2 py-2 font-mono text-xs text-black">{[300,400,500,600,700,800,900].map((weight) => <option key={weight} value={weight}>{weight}</option>)}</select></label>
      <label className="block font-mono text-[10px] font-bold uppercase text-neutral-500">Alignment<select value={effectiveStyle.textAlign || 'left'} onChange={(event) => changeStyle('textAlign', event.target.value as 'left' | 'center' | 'right')} className="mt-1 w-full rounded-lg border-2 border-black bg-white px-2 py-2 font-mono text-xs text-black"><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></label>
      <label className="block font-mono text-[10px] font-bold uppercase text-neutral-500">Element width (%)<input type="range" min="10" max="100" step="5" value={effectiveStyle.width || 100} onChange={(event) => changeStyle('width', Number(event.target.value))} className="mt-2 w-full accent-pink"/><span className="block text-right">{effectiveStyle.width || 100}%</span></label>
      <label className="block font-mono text-[10px] font-bold uppercase text-neutral-500">Maximum width (px)<input type="number" min="0" max="1600" value={effectiveStyle.maxWidth || 0} onChange={(event) => changeStyle('maxWidth', Number(event.target.value) || undefined)} placeholder="No limit" className="mt-1 w-full rounded-lg border-2 border-black px-2 py-2 font-mono text-xs font-normal text-black" /></label>
      <div className="grid grid-cols-2 gap-2">{(['top', 'bottom'] as const).map((side) => <label key={side} className="block font-mono text-[9px] font-bold uppercase text-neutral-500">Space {side}<input type="number" min="0" max="240" value={effectiveStyle.margin?.[side] || 0} onChange={(event) => changeStyle('margin', { ...effectiveStyle.margin, [side]: Math.max(0, Number(event.target.value) || 0) })} className="mt-1 w-full rounded-lg border-2 border-black px-2 py-2 font-mono text-xs" /></label>)}</div>
      <label className="block font-mono text-[10px] font-bold uppercase text-neutral-500">Animation<select value={effectiveStyle.animation || ''} onChange={(event) => changeStyle('animation', event.target.value || undefined)} className="mt-1 w-full rounded-lg border-2 border-black bg-white px-2 py-2 font-mono text-xs text-black"><option value="">None</option><option value="fade-in">Fade in</option><option value="slide-up">Slide up</option><option value="slide-left">Slide in from left</option><option value="zoom-in">Zoom in</option><option value="float">Float</option><option value="pulse">Pulse</option></select></label>
      <div className="rounded-lg border border-black/15 p-2"><div className="mb-2 flex items-center justify-between"><p className="font-mono text-[9px] font-bold uppercase text-neutral-500">Responsive overrides · {device}</p>{device !== 'desktop' && <button type="button" onClick={() => onChange((current) => { const responsive = { ...current.responsive }; delete responsive[device]; return { ...current, responsive }; })} className="text-[9px] font-bold underline">Reset to desktop</button>}</div><p className="text-[10px] text-neutral-500">Style changes apply to this element at the selected device width.</p></div>
      <label className="block font-mono text-[10px] font-bold uppercase text-neutral-500">Corner radius (px)<input type="number" min="0" max="100" value={effectiveStyle.borderRadius || 0} onChange={(event) => changeStyle('borderRadius', Math.max(0, Number(event.target.value) || 0))} className="mt-1 w-full rounded-lg border-2 border-black px-2 py-2 font-mono text-xs font-normal text-black" /></label>
    </div>}
    {tab === 'interactions' && <div className="space-y-3">
      <label className="block font-mono text-[10px] font-bold uppercase text-neutral-500">Entrance animation<select value={element.animation?.entrance || ''} onChange={(event) => onChange((current) => ({ ...current, animation: { ...current.animation, entrance: event.target.value ? event.target.value as NonNullable<SiteElement['animation']>['entrance'] : undefined, duration: current.animation?.duration || 400 } }))} className="mt-1 w-full rounded-lg border-2 border-black bg-white px-2 py-2 font-mono text-xs"><option value="">None</option><option value="fade">Fade</option><option value="slide-up">Slide up</option><option value="slide-down">Slide down</option><option value="slide-left">Slide left</option><option value="slide-right">Slide right</option><option value="zoom-in">Zoom in</option><option value="zoom-out">Zoom out</option><option value="flip">Flip</option><option value="rotate">Rotate</option><option value="bounce">Bounce</option><option value="blur-in">Blur in</option><option value="reveal">Reveal</option></select></label>
      <label className="block font-mono text-[10px] font-bold uppercase text-neutral-500">Duration (ms)<input type="number" min="0" max="5000" step="50" value={Number(element.animation?.duration || 400)} onChange={(event) => onChange((current) => ({ ...current, animation: { ...current.animation, duration: Math.max(0, Number(event.target.value) || 0) } }))} className="mt-1 w-full rounded-lg border-2 border-black px-2 py-2 font-mono text-xs" /></label>
      <label className="block font-mono text-[10px] font-bold uppercase text-neutral-500">Hover effect<select value={element.states?.hover?.transform === 'translateY(-4px)' ? 'lift' : element.states?.hover?.transform === 'scale(1.04)' ? 'scale' : element.states?.hover?.boxShadow ? 'glow' : ''} onChange={(event) => onChange((current) => { const effect = event.target.value; return { ...current, states: { ...current.states, hover: { ...current.states?.hover, transform: effect === 'lift' ? 'translateY(-4px)' : effect === 'scale' ? 'scale(1.04)' : undefined, boxShadow: effect === 'glow' ? '0 0 18px rgba(255, 85, 136, .55)' : undefined } } }; })} className="mt-1 w-full rounded-lg border-2 border-black bg-white px-2 py-2 font-mono text-xs"><option value="">None</option><option value="lift">Lift</option><option value="scale">Grow</option><option value="glow">Glow</option></select></label>
      <p className="font-mono text-[9px] font-bold uppercase text-neutral-500">Click interactions</p>
      {(element.interactions || []).map((interaction, index) => <div key={interaction.id} className="space-y-2 rounded-lg border border-black/20 bg-neutral-50 p-2"><div className="grid grid-cols-2 gap-2"><select aria-label="Interaction trigger" value={interaction.trigger} onChange={(event) => onChange((current) => ({ ...current, interactions: (current.interactions || []).map((item, i) => i === index ? { ...item, trigger: event.target.value as typeof item.trigger } : item) }))} className="rounded border bg-white px-2 py-1 text-xs"><option value="click">Click</option><option value="hover">Hover</option><option value="scroll-into-view">On scroll</option></select><select aria-label="Interaction action" value={interaction.action} onChange={(event) => onChange((current) => ({ ...current, interactions: (current.interactions || []).map((item, i) => i === index ? { ...item, action: event.target.value as typeof item.action } : item) }))} className="rounded border bg-white px-2 py-1 text-xs"><option value="navigate">Navigate</option><option value="scroll-to">Scroll to</option><option value="open-modal">Open modal</option><option value="toggle">Toggle</option><option value="copy">Copy text</option><option value="play-video">Play video</option><option value="add-to-cart">Add to cart</option></select></div><input aria-label="Interaction target" value={interaction.target || ''} onChange={(event) => onChange((current) => ({ ...current, interactions: (current.interactions || []).map((item, i) => i === index ? { ...item, target: event.target.value } : item) }))} placeholder="Target URL, anchor ID or element ID" className="w-full rounded border px-2 py-1.5 text-xs"/><button type="button" onClick={() => onChange((current) => ({ ...current, interactions: (current.interactions || []).filter((_, i) => i !== index) }))} className="text-xs font-bold text-red-700">Remove interaction</button></div>)}
      <button type="button" onClick={() => onChange((current) => ({ ...current, interactions: [...(current.interactions || []), { id: `interaction-${Date.now()}`, trigger: 'click', action: 'navigate', target: '' }] }))} className="w-full rounded-lg border-2 border-black bg-white px-3 py-2 font-mono text-xs font-bold">+ Add interaction</button><p className="text-[10px] leading-relaxed text-neutral-500">Animations respect reduced-motion preferences. Some actions require a matching target or integration.</p>
    </div>}
    {tab === 'advanced' && <div className="space-y-3">
      <label className="block font-mono text-[10px] font-bold uppercase text-neutral-500">Anchor ID<input value={element.anchorId || ''} onChange={(event) => onChange((current) => ({ ...current, anchorId: event.target.value || undefined }))} className="mt-1 w-full rounded-lg border-2 border-black px-2 py-2 font-mono text-xs font-normal normal-case text-black" /></label>
      {<label className="block font-mono text-[10px] font-bold uppercase text-neutral-500">Custom class<input value={element.customClass || ''} onChange={(event) => onChange((current) => ({ ...current, customClass: event.target.value || undefined }))} className="mt-1 w-full rounded-lg border-2 border-black px-2 py-2 font-mono text-xs font-normal normal-case text-black" /></label>}
      {<div className="space-y-2 rounded-lg border border-black/15 p-2"><p className="font-mono text-[9px] font-bold uppercase text-neutral-500">Position and stacking</p><label className="block text-[10px] font-bold">Position<select value={effectiveStyle.position || 'static'} onChange={(event) => changeStyle('position', event.target.value as NonNullable<SiteElement['style']['position']>)} className="mt-1 w-full rounded border bg-white px-2 py-1.5"><option value="static">In flow</option><option value="relative">Relative</option><option value="absolute">Absolute</option><option value="sticky">Sticky</option></select></label>{effectiveStyle.position && effectiveStyle.position !== 'static' && <div className="grid grid-cols-2 gap-2">{(['top', 'right', 'bottom', 'left', 'zIndex'] as const).map((key) => <label key={key} className="text-[9px] font-bold uppercase">{key}<input type="number" value={effectiveStyle[key] || 0} onChange={(event) => changeStyle(key, Number(event.target.value))} className="mt-1 w-full rounded border px-2 py-1.5 font-mono text-xs"/></label>)}</div>}</div>}
      {(['desktop', 'tablet', 'mobile'] as const).map((targetDevice) => <button key={targetDevice} type="button" onClick={() => onChange((current) => ({ ...current, hidden: { ...current.hidden, [targetDevice]: !current.hidden?.[targetDevice] } }))} className={`rounded-lg border-2 border-black px-3 py-2 font-mono text-[10px] font-bold ${element.hidden?.[targetDevice] ? 'bg-pink' : 'bg-white'}`}>{element.hidden?.[targetDevice] ? 'Show' : 'Hide'} {targetDevice}</button>)}
    </div>}
  </div>;
}

function SectionRenderer({
  templateId,
  section,
  sitePages,
  menuItems,
  onNavigatePage,
  spacing,
  isSelected,
  theme,
  siteTitle,
  heroContent,
  featuresContent,
  testimonialsContent,
  ctaContent,
  onUpdateSectionContent,
  selectedTreeElementId,
  onSelectTreeElement,
  onUpdateTreeElement,
  onResizeTreeColumn,
  onDuplicateTreeElement,
  onDeleteTreeElement,
  onSelect,
  assetUrl,
  logoUrl,
  deviceMode,
}: {
  templateId: string;
  section: Section;
  sitePages: SitePage[];
  menuItems: MenuItem[];
  onNavigatePage: (id: string) => void;
  spacing: SectionSpacing;
  isSelected: boolean;
  theme: Theme;
  siteTitle: string;
  heroContent: Record<string, string>;
  featuresContent: Array<{ title: string; desc: string }>;
  testimonialsContent: Array<{ quote: string; name: string; role: string }>;
  ctaContent: { title: string; desc: string; buttonText: string };
  onUpdateSectionContent: (sectionId: string, content: Record<string, unknown>) => void;
  selectedTreeElementId: string | null;
  onSelectTreeElement: (columnId: string, elementId: string) => void;
  onUpdateTreeElement: (columnId: string, elementId: string, update: (element: SiteElement) => SiteElement) => void;
  onResizeTreeColumn: (columnId: string, width: number) => void;
  onDuplicateTreeElement: (columnId: string, elementId: string) => void;
  onDeleteTreeElement: (columnId: string, elementId: string) => void;
  onSelect: () => void;
  assetUrl: string;
  logoUrl: string;
  deviceMode: DeviceMode;
}) {
  const sectionContent = section.content || {};
  const isFreshCrate = templateId === 'fresh-crate';
  const isVoltGear = templateId === 'volt-gear';
  const isStorefront = isFreshCrate || isVoltGear;
  const sectionHero = { ...heroContent, ...(sectionContent as Partial<typeof heroContent>) } as typeof heroContent;
  const sectionFeatures = Array.isArray(sectionContent.items) ? sectionContent.items as typeof featuresContent : featuresContent;
  const sectionTestimonials = Array.isArray(sectionContent.items) ? sectionContent.items as typeof testimonialsContent : testimonialsContent;
  const sectionCta = { ...ctaContent, ...(sectionContent as Partial<typeof ctaContent>) };
  const setHero = (update: React.SetStateAction<typeof heroContent>) => {
    const next = typeof update === 'function' ? update(sectionHero) : update;
    onUpdateSectionContent(section.id, { ...sectionContent, ...next });
  };
  const setFeatures = (update: React.SetStateAction<typeof featuresContent>) => {
    const next = typeof update === 'function' ? update(sectionFeatures) : update;
    onUpdateSectionContent(section.id, { ...sectionContent, items: next });
  };
  const setTestimonials = (update: React.SetStateAction<typeof testimonialsContent>) => {
    const next = typeof update === 'function' ? update(sectionTestimonials) : update;
    onUpdateSectionContent(section.id, { ...sectionContent, items: next });
  };
  const setCta = (update: React.SetStateAction<typeof ctaContent>) => {
    const next = typeof update === 'function' ? update(sectionCta) : update;
    onUpdateSectionContent(section.id, { ...sectionContent, ...next });
  };
  const heading = typeof sectionContent.heading === 'string' ? sectionContent.heading : section.name;
  const themedButtonStyle: React.CSSProperties = { backgroundColor: theme.buttonStyle === 'outline' ? 'transparent' : theme.primaryColor, borderRadius: theme.buttonStyle === 'pill' ? '9999px' : theme.borderRadius, color: theme.buttonStyle === 'outline' ? theme.primaryColor : undefined };
  const blockItems = Array.isArray(sectionContent.items) ? sectionContent.items as Array<Record<string, unknown>> : [];
  const textValue = (value: unknown, fallback = '') => typeof value === 'string' ? value : fallback;
  const navBrand = textValue(sectionContent.brandLabel, siteTitle) || siteTitle;
  const navCtaLabel = textValue(sectionContent.ctaLabel, isStorefront ? 'Bag' : 'Get Started');
  const navCtaTarget = textValue(sectionContent.ctaTarget, isStorefront ? '#collection' : '#collection');
  const navLogoUrl = textValue(sectionContent.logoUrl, logoUrl);
  const navCtaVariant = textValue(sectionContent.ctaVariant, 'solid');
  const navCtaStyle: React.CSSProperties = navCtaVariant === 'outline'
    ? { backgroundColor: 'transparent', borderColor: theme.primaryColor, color: theme.primaryColor, borderRadius: theme.buttonStyle === 'pill' ? '9999px' : theme.borderRadius }
    : navCtaVariant === 'ghost'
      ? { backgroundColor: 'transparent', borderColor: 'transparent', color: isVoltGear ? '#F5F7FA' : theme.textColor, boxShadow: 'none' }
      : themedButtonStyle;
  const updateBlockItem = (index: number, key: string, value: unknown) => onUpdateSectionContent(section.id, { ...sectionContent, items: blockItems.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item) });
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const submitBlockForm = async (event: FormEvent<HTMLFormElement>, kind: 'contact' | 'newsletter') => {
    event.preventDefault();
    setFormSubmitting(true);
    setFormError('');
    const fields = Object.fromEntries(new FormData(event.currentTarget).entries());
    const configured = textValue(sectionContent.apiEndpoint).trim();
    const endpoint = configured || (kind === 'contact' ? '/api/contact' : '/api/newsletter');
    if (!endpoint.startsWith('/api/') && !/^https:\/\//i.test(endpoint)) {
      setFormError('Use a local /api/ route or a secure https:// endpoint.');
      setFormSubmitting(false);
      return;
    }
    const payload = kind === 'contact'
      ? { name: fields.name, email: fields.email, message: fields.message, category: siteTitle, website: '' }
      : { email: fields.email, source: siteTitle, website: '' };
    try {
      const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const result = await response.json().catch(() => ({})) as { message?: string };
      if (!response.ok) throw new Error(result.message || 'Submission failed. Please try again.');
      setFormSubmitted(true);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Submission failed. Please try again.');
    } finally { setFormSubmitting(false); }
  };
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const scrollToAnchor = (value: string) => {
    const anchorId = normalizeAnchorId(value);
    if (!scrollToResolvedAnchor(anchorId)) {
      // Keep custom anchors shareable even when a section was renamed or removed.
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#${anchorId}`);
    }
  };
  const activateEditorLink = (event: MouseEvent<HTMLElement>, href: string, newTab = false) => {
    if (href.startsWith('#')) {
      event.preventDefault();
      event.stopPropagation();
      scrollToAnchor(href.slice(1));
      return;
    }
    if (href.startsWith('/')) {
      const page = sitePages.find((entry) => entry.slug === href.replace(/^\//, '') || entry.id === href.replace(/^\//, ''));
      if (page) {
        event.preventDefault();
        event.stopPropagation();
        onNavigatePage(page.id);
      }
      return;
    }
    if (/^(https?:|mailto:|tel:)/i.test(href)) {
      event.stopPropagation();
      if (newTab && /^https?:/i.test(href)) {
        event.preventDefault();
        window.open(href, '_blank', 'noopener,noreferrer');
      }
    } else event.preventDefault();
  };
  const renderMenuItem = (item: MenuItem) => {
    if (item.target.type === 'page') {
      const requested = item.target.value.replace(/^\//, '');
      const page = sitePages.find((entry) => entry.id === item.target.value || entry.slug === requested || entry.slug === `/${requested}`);
      return page ? <button key={item.id} type="button" onClick={(event) => { event.stopPropagation(); onNavigatePage(page.id); setMobileMenuOpen(false); }} className="hover:text-black hover:underline cursor-pointer">{item.label}</button> : null;
    }
    const href = item.target.type === 'anchor' ? `#${item.target.value.replace(/^#/, '')}` : item.target.value;
    const safeHref = item.target.type === 'anchor' || /^(https?:|mailto:|tel:)/i.test(href) ? href : '';
    return safeHref ? <a key={item.id} href={safeHref} target={item.newTab ? '_blank' : undefined} rel={item.newTab ? 'noopener noreferrer' : undefined} onClick={(event) => { event.stopPropagation(); if (item.target.type === 'anchor') { event.preventDefault(); scrollToAnchor(item.target.value); setMobileMenuOpen(false); } }} className="hover:text-black hover:underline">{item.label}</a> : null;
  };
  return (
    <div
      id={section.anchorId || section.id}
      data-section-id={section.id}
      style={{ padding: `${spacing.top * theme.spacingScale}px ${spacing.right * theme.spacingScale}px ${spacing.bottom * theme.spacingScale}px ${spacing.left * theme.spacingScale}px`, backgroundColor: section.style?.highlightColor || section.style?.backgroundColor, color: section.style?.overrides?.[deviceMode]?.color as string | undefined, textAlign: section.style?.textAlign, fontWeight: section.style?.fontWeight, fontStyle: section.style?.fontStyle, textDecoration: section.style?.textDecoration, display: section.hidden?.[deviceMode] ? 'none' : undefined }}
      className={cn(
        'relative group cursor-pointer transition-all',
        getAnimationClass(section.style?.animation),
        section.locked && 'cursor-not-allowed pointer-events-none opacity-75',
        isSelected && 'outline-[3px] outline-pink outline-offset-[-3px] shadow-[inset_0_0_0_2px_#000]'
      )}
      onClick={() => { if (!section.locked) onSelect(); }}
    >
      {section.type === 'custom' && <TreeSectionRenderer sectionId={section.id} columns={section.columns || []} pages={sitePages} device={deviceMode} selectedElementId={selectedTreeElementId} onSelectElement={onSelectTreeElement} onUpdateElement={onUpdateTreeElement} onResizeColumn={onResizeTreeColumn} onDuplicateElement={onDuplicateTreeElement} onDeleteElement={onDeleteTreeElement} onNavigatePage={onNavigatePage} />}

      {/* Navigation Block */}
      {section.type === 'nav' && (
        <>
        <nav style={{ backgroundColor: isFreshCrate ? '#FFF8EC' : isVoltGear ? '#0B0D12' : undefined }} className={cn('flex items-center justify-between px-4 sm:px-10 py-3 sm:py-4 border-b-2 backdrop-blur-sm', isVoltGear ? 'border-white/10' : 'border-black/10', sectionContent.sticky === true && 'sticky top-0 z-40')}>
          <div className="flex items-center gap-2">
            {sectionContent.showLogo !== false && (navLogoUrl ? <NextImage src={navLogoUrl} alt={textValue(sectionContent.logoAlt, `${navBrand} logo`)} width={32} height={32} unoptimized className="h-8 w-8 rounded-lg object-contain" /> : <div
              style={{ backgroundColor: theme.primaryColor }}
              className="w-7 h-7 rounded-lg border-2 border-black shadow-[2px_2px_0px_#000] flex items-center justify-center font-display font-black text-xs text-black"
            >
              {navBrand.charAt(0)}
            </div>)}
            <div className="min-w-0">
              <span contentEditable suppressContentEditableWarning onInput={(event) => onUpdateSectionContent(section.id, { ...sectionContent, brandLabel: event.currentTarget.innerText })} className={cn('block font-display font-black text-sm sm:text-base tracking-tight outline-none focus-visible:ring-2 focus-visible:ring-pink', isVoltGear ? 'text-white' : isFreshCrate ? 'text-[#1F2A1B]' : 'text-ink')}>
                {navBrand}
              </span>
              {typeof sectionContent.brandTagline === 'string' && <span contentEditable suppressContentEditableWarning onInput={(event) => onUpdateSectionContent(section.id, { ...sectionContent, brandTagline: event.currentTarget.innerText })} className={cn('block font-mono text-[8px] uppercase tracking-wider opacity-60 outline-none focus-visible:ring-2 focus-visible:ring-pink', isVoltGear ? 'text-white' : 'text-neutral-600')}>{sectionContent.brandTagline}</span>}
            </div>

          </div>

          <div aria-label="Site pages" className={cn('hidden sm:flex min-w-0 max-w-[62%] items-center gap-4 overflow-x-auto whitespace-nowrap px-1 font-mono text-xs font-bold [scrollbar-width:thin]', isVoltGear ? 'text-white/70' : 'text-neutral-700', (deviceMode === 'mobile' || sectionContent.showMenu === false) && 'hidden')}>
            {menuItems.map(renderMenuItem)}
          </div>
          {sectionContent.showMenu !== false && <button type="button" aria-expanded={mobileMenuOpen} aria-label="Toggle site navigation" onClick={(event) => { event.stopPropagation(); setMobileMenuOpen((open) => !open); }} className="sm:hidden rounded-lg border border-black px-2 py-1 font-mono text-xs font-bold">{mobileMenuOpen ? textValue(sectionContent.mobileCloseLabel, 'Close') : textValue(sectionContent.mobileMenuLabel, 'Menu')}</button>}

          {sectionContent.showCta !== false && <button
            type="button"
            contentEditable
            suppressContentEditableWarning
            onClick={(event) => {
              event.stopPropagation();
              activateEditorLink(event, navCtaTarget, sectionContent.ctaNewTab === true);
            }}
            onInput={(event) => onUpdateSectionContent(section.id, { ...sectionContent, ctaLabel: event.currentTarget.innerText })}
            style={navCtaStyle}
            className="px-3 sm:px-4 py-1.5 rounded-xl border-2 border-black font-display text-xs font-black text-black shadow-[2px_2px_0px_#000] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          >
            {navCtaLabel}
          </button>}
        </nav>
        {mobileMenuOpen && <nav aria-label="Mobile navigation" className="sm:hidden max-h-[65vh] overflow-y-auto border-b-2 border-black bg-white px-4 py-3"><div className="flex flex-col gap-3 font-mono text-xs font-bold">{menuItems.map(renderMenuItem)}</div></nav>}
        </>
      )}

      {/* Hero Block */}
      {section.type === 'hero' && (
        <div
          className={cn('relative grid items-center gap-10 overflow-hidden px-4 py-12 sm:px-12 sm:py-24', isStorefront ? 'text-left md:grid-cols-2 lg:gap-16' : 'text-center')}
          style={{ background: theme.bgColor, color: theme.textColor }}
        >
          {/* Subtle Ambient Glow */}
          <div
            className={cn('absolute top-0 h-[min(80vw,34rem)] w-[min(80vw,34rem)] rounded-full blur-[110px] opacity-25 pointer-events-none', isStorefront ? 'right-[-8rem] left-auto' : 'left-1/2 -translate-x-1/2')}
            style={{ backgroundColor: theme.primaryColor }}
          />

          {isFreshCrate && <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 -left-20 h-72 w-72 rounded-full border-[28px] border-[#F4A93B]/15" />}
          {isVoltGear && <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[.12] [background-image:radial-gradient(#C6FF3D_1px,transparent_1px)] [background-size:22px_22px]" />}

          <div className={cn('relative z-10 space-y-3 sm:space-y-5', isStorefront ? 'max-w-2xl' : 'mx-auto max-w-2xl')}>
            {/* Category Pill */}
            <div
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border-2 border-black font-mono text-[10px] sm:text-[11px] font-black uppercase text-black shadow-[2px_2px_0px_#000]"
              style={{ backgroundColor: theme.primaryColor }}
              contentEditable
              suppressContentEditableWarning
              onInput={(e) => setHero((prev) => ({ ...prev, badge: (e.target as HTMLElement).innerText }))}
            >
              <span>{sectionHero.badge}</span>
            </div>

            {/* Editable Headline */}
            <h1
              className={cn('font-display font-black tracking-tight leading-tight outline-none focus:ring-2 focus:ring-pink rounded-lg p-1', isStorefront ? 'text-4xl sm:text-6xl lg:text-7xl leading-[1.02]' : 'text-2xl sm:text-5xl')}
              contentEditable
              suppressContentEditableWarning
              onInput={(e) => setHero((prev) => ({ ...prev, title: (e.target as HTMLElement).innerText }))}
            >
              {sectionHero.title}
            </h1>

            {/* Editable Description */}
            <p
              className={cn('font-mono text-xs sm:text-sm opacity-80 max-w-xl leading-relaxed outline-none focus:ring-2 focus:ring-pink rounded-lg p-1', !isStorefront && 'mx-auto')}
              contentEditable
              suppressContentEditableWarning
              onInput={(e) => setHero((prev) => ({ ...prev, description: (e.target as HTMLElement).innerText }))}
            >
              {sectionHero.description}
            </p>

            {/* Action Buttons */}
            <div className={cn('pt-2 flex flex-wrap gap-2.5', isStorefront ? 'justify-start' : 'items-center justify-center')}>
              <button
                type="button"
                onClick={(event) => activateEditorLink(event, textValue(sectionContent.buttonLink, '#collection'), sectionContent.buttonNewTab === true)}
                style={themedButtonStyle}
                className="px-5 sm:px-6 py-2 sm:py-2.5 rounded-xl border-2 border-black font-display text-xs sm:text-sm font-black text-black shadow-[2.5px_2.5px_0px_#000] flex items-center gap-1.5 cursor-pointer"
              >
                <span contentEditable suppressContentEditableWarning onInput={(e) => setHero((prev) => ({ ...prev, ctaPrimary: (e.target as HTMLElement).innerText }))}>{sectionHero.ctaPrimary}</span>
                <ArrowUpRight size={14} className="stroke-[3]" />
              </button>
              <button
                type="button"
                onClick={(event) => activateEditorLink(event, textValue(sectionContent.secondaryButtonLink, '#home-how-it-works'), sectionContent.secondaryButtonNewTab === true)}
                className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl border-2 border-current bg-white/10 hover:bg-white/20 font-mono text-xs sm:text-sm font-bold transition-all cursor-pointer"
              >
                <span contentEditable suppressContentEditableWarning onInput={(e) => setHero((prev) => ({ ...prev, ctaSecondary: (e.target as HTMLElement).innerText }))}>{sectionHero.ctaSecondary}</span>
              </button>
            </div>

            {/* Live Telemetry Radar Pills */}
            <div className={cn('pt-4 sm:pt-6 grid grid-cols-2 gap-2 sm:gap-3 max-w-lg text-left', !isStorefront && 'mx-auto')}>
              <div className="rounded-xl border border-current/20 bg-white/5 p-2.5 sm:p-3 backdrop-blur-sm">
                <span contentEditable suppressContentEditableWarning onInput={(e) => setHero((prev) => ({ ...prev, stat1Label: (e.target as HTMLElement).innerText }))} className="font-mono text-[8px] sm:text-[9px] font-bold opacity-60 block uppercase">
                  {sectionHero.stat1Label}
                </span>
                <span contentEditable suppressContentEditableWarning onInput={(e) => setHero((prev) => ({ ...prev, stat1Value: (e.target as HTMLElement).innerText }))} className="font-display text-sm sm:text-base font-black">{sectionHero.stat1Value}</span>
              </div>
              <div className="rounded-xl border border-current/20 bg-white/5 p-2.5 sm:p-3 backdrop-blur-sm">
                <span contentEditable suppressContentEditableWarning onInput={(e) => setHero((prev) => ({ ...prev, stat2Label: (e.target as HTMLElement).innerText }))} className="font-mono text-[8px] sm:text-[9px] font-bold opacity-60 block uppercase">
                  {sectionHero.stat2Label}
                </span>
                <span contentEditable suppressContentEditableWarning onInput={(e) => setHero((prev) => ({ ...prev, stat2Value: (e.target as HTMLElement).innerText }))} className="font-display text-sm sm:text-base font-black">{sectionHero.stat2Value}</span>
              </div>
            </div>
          </div>
          {isStorefront && <StoreHeroArtwork fresh={isFreshCrate} />}
        </div>
      )}

      {/* Features Block */}
      {section.type === 'features' && (
        <div className="py-12 sm:py-16 px-4 sm:px-12 bg-white text-black border-y-2 border-black/10">
          <div className="text-center max-w-xl mx-auto mb-8 space-y-1">
            <h2 className="font-display text-xl sm:text-3xl font-black tracking-tight" contentEditable suppressContentEditableWarning onInput={(e) => onUpdateSectionContent(section.id, { ...sectionContent, heading: (e.target as HTMLElement).innerText })}>
              {heading === section.name ? 'Engineered for hyper-scale precision.' : heading}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 max-w-4xl mx-auto">
            {sectionFeatures.map((f: { title: string; desc: string }, i: number) => (
              <div
                key={i}
                className="p-4 sm:p-5 rounded-2xl border-2 border-black bg-[#FAF9F6] shadow-[3px_3px_0px_#000] sm:shadow-[4px_4px_0px_#000]"
              >
                {typeof (f as typeof f & { image?: string }).image === 'string' && (f as typeof f & { image?: string }).image && <NextImage src={(f as typeof f & { image: string }).image} alt={f.title || ''} width={720} height={420} unoptimized className="mb-3 h-36 w-full rounded-xl border border-black/10 object-cover" />}
                <div
                  style={{ backgroundColor: theme.primaryColor }}
                  className="w-8 h-8 rounded-xl border-2 border-black flex items-center justify-center font-mono font-black text-xs text-black mb-2.5 shadow-[1.5px_1.5px_0px_#000]"
                >
                  0{i + 1}
                </div>
                <h3 className="font-display font-black text-sm sm:text-base mb-1" contentEditable suppressContentEditableWarning onInput={(e) => setFeatures((prev) => prev.map((item, index) => index === i ? { ...item, title: (e.target as HTMLElement).innerText } : item))}>
                  {f.title}
                </h3>
                <p className="font-mono text-xs text-neutral-600 leading-relaxed" contentEditable suppressContentEditableWarning onInput={(e) => setFeatures((prev) => prev.map((item, index) => index === i ? { ...item, desc: (e.target as HTMLElement).innerText } : item))}>
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Testimonials Block */}
      {section.type === 'testimonials' && (
        <div className="py-12 sm:py-16 px-4 sm:px-12 bg-[#FFFDF8] text-black">
          <div className="text-center max-w-xl mx-auto mb-8">
            <h2 className="font-display text-xl sm:text-3xl font-black" contentEditable suppressContentEditableWarning onInput={(e) => onUpdateSectionContent(section.id, { ...sectionContent, heading: (e.target as HTMLElement).innerText })}>
              {heading === section.name ? 'Trusted by world-class teams.' : heading}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 max-w-3xl mx-auto">
            {sectionTestimonials.map((item: { quote: string; name: string; role: string }, idx: number) => (
              <div key={idx} className="p-4 sm:p-6 rounded-2xl border-2 border-black bg-white shadow-[3px_3px_0px_#000] sm:shadow-[4px_4px_0px_#000] flex flex-col justify-between">
                {typeof (item as typeof item & { image?: string }).image === 'string' && (item as typeof item & { image?: string }).image && <NextImage src={(item as typeof item & { image: string }).image} alt={item.name || 'Customer photo'} width={720} height={320} unoptimized className="mb-4 h-36 w-full rounded-xl object-cover" />}
                <div className="flex gap-1 mb-2.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={13} className="fill-yellow text-black stroke-[1.5]" />
                  ))}
                </div>
                <p className="font-mono text-xs sm:text-[13px] leading-relaxed mb-4 text-neutral-800" contentEditable suppressContentEditableWarning onInput={(e) => setTestimonials((prev) => prev.map((item, index) => index === idx ? { ...item, quote: (e.target as HTMLElement).innerText.replace(/[“”\"]/g, '') } : item))}>
                  &ldquo;{item.quote}&rdquo;
                </p>
                <div className="pt-3 border-t border-black/10 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full border border-black bg-lilac flex items-center justify-center font-mono font-bold text-xs">
                    {item.name.charAt(0)}
                  </div>
                  <div>
                    <h4 contentEditable suppressContentEditableWarning onInput={(e) => setTestimonials((prev) => prev.map((entry, index) => index === idx ? { ...entry, name: (e.target as HTMLElement).innerText } : entry))} className="font-display font-black text-xs text-black">{item.name}</h4>
                    <p contentEditable suppressContentEditableWarning onInput={(e) => setTestimonials((prev) => prev.map((entry, index) => index === idx ? { ...entry, role: (e.target as HTMLElement).innerText } : entry))} className="font-mono text-[9px] sm:text-[10px] text-neutral-500">{item.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CTA Block */}
      {section.type === 'cta' && (
        <div className="py-12 sm:py-16 px-4 sm:px-12 bg-black text-white text-center relative overflow-hidden">
          <div className="relative z-10 max-w-lg mx-auto space-y-3">
            <h2 className="font-display text-xl sm:text-3xl font-black" contentEditable suppressContentEditableWarning onInput={(e) => setCta((prev) => ({ ...prev, title: (e.target as HTMLElement).innerText }))}>
              {sectionCta.title}
            </h2>
            <p className="font-mono text-xs sm:text-sm text-neutral-400" contentEditable suppressContentEditableWarning onInput={(e) => setCta((prev) => ({ ...prev, desc: (e.target as HTMLElement).innerText }))}>
              {sectionCta.desc}
            </p>
            <div className="pt-2">
              <a
                href={textValue(sectionContent.buttonLink, '#collection')}
                target={sectionContent.buttonNewTab === true ? '_blank' : undefined}
                rel={sectionContent.buttonNewTab === true ? 'noopener noreferrer' : undefined}
                onClick={(event) => activateEditorLink(event, textValue(sectionContent.buttonLink, '#collection'), sectionContent.buttonNewTab === true)}
                style={themedButtonStyle}
                className="px-5 sm:px-6 py-2 sm:py-2.5 rounded-xl border-2 border-white font-display text-xs sm:text-sm font-black text-black shadow-[3px_3px_0px_#FFFFFF] cursor-pointer"
              >
                <span contentEditable suppressContentEditableWarning onInput={(e) => setCta((prev) => ({ ...prev, buttonText: (e.target as HTMLElement).innerText }))}>{sectionCta.buttonText}</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Footer Block */}
      {section.type === 'footer' && (
        <footer className="py-6 sm:py-8 px-4 sm:px-12 border-t-2 border-black/10 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 font-mono text-xs text-neutral-600">
          <div className="flex items-center gap-2 font-bold text-black">
            <span>{siteTitle}</span>
            <span>•</span>
            <span className="text-[10px] text-neutral-400">{textValue(sectionContent.copyright, 'All rights reserved.')}</span>
          </div>
          <div className="flex flex-wrap gap-4">
            {(blockItems.length ? blockItems : (Array.isArray(sectionContent.links) ? sectionContent.links.map((label) => ({ label: String(label), href: `/${String(label).toLowerCase()}` })) : [{ label: 'Privacy', href: '/privacy-terms' }, { label: 'Terms', href: '/privacy-terms' }, { label: 'Contact', href: '/contact' }])).map((item, index) => {
              const href = textValue(item.href, '#');
              return <a key={`${section.id}-footer-${index}`} href={href} target={'newTab' in item && item.newTab === true ? '_blank' : undefined} rel={'newTab' in item && item.newTab === true ? 'noopener noreferrer' : undefined} onClick={(event) => activateEditorLink(event, href, 'newTab' in item && item.newTab === true)} className="hover:text-black hover:underline">{textValue(item.label, `Link ${index + 1}`)}</a>;
            })}
          </div>
        </footer>
      )}
      {section.type === 'divider' && <hr aria-label="Section divider" className="mx-auto w-full max-w-5xl border-0 border-t-2 border-black/20" />}
      {!['nav', 'hero', 'features', 'testimonials', 'cta', 'footer', 'divider', 'custom'].includes(section.type) && (
        <section className="py-12 sm:py-16 px-4 sm:px-12 bg-[#FAF9F6] text-black">
          <div className="max-w-4xl mx-auto">
            {section.type !== 'divider' && <div className="text-center mb-8">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest" style={{ color: theme.primaryColor }}>{siteTitle}</p>
              <h2 contentEditable suppressContentEditableWarning onInput={(e) => onUpdateSectionContent(section.id, { ...sectionContent, heading: (e.target as HTMLElement).innerText })} className="font-display text-2xl sm:text-3xl font-black mt-2">{heading}</h2>
              {typeof sectionContent.description === 'string' && <p contentEditable suppressContentEditableWarning onInput={(e) => onUpdateSectionContent(section.id, { ...sectionContent, description: (e.target as HTMLElement).innerText })} className="font-mono text-xs text-neutral-600 mt-2">{sectionContent.description}</p>}
            </div>}
            {section.type === 'contact' ? (
              formSubmitted ? <p role="status" className="mx-auto max-w-lg rounded-xl border-2 border-black bg-white p-4 text-center font-mono text-sm">{textValue(sectionContent.successMessage, 'Thanks for reaching out. We will be in touch soon.')}</p> : <form className="max-w-lg mx-auto grid gap-3" onSubmit={(event) => { void submitBlockForm(event, 'contact'); }}>
                <input name="name" required aria-label="Your name" placeholder="Your name" className="rounded-xl border-2 border-black bg-white px-4 py-3 font-mono text-sm" />
                <input name="email" required type="email" aria-label="Email address" placeholder="Email address" className="rounded-xl border-2 border-black bg-white px-4 py-3 font-mono text-sm" />
                <textarea name="message" required aria-label="Message" placeholder="How can we help?" rows={4} className="rounded-xl border-2 border-black bg-white px-4 py-3 font-mono text-sm" />
                <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
                {formError && <p role="alert" className="text-sm text-red-700">{formError}</p>}
                <button type="submit" disabled={formSubmitting} className="rounded-xl border-2 border-black px-4 py-3 font-display font-black shadow-[3px_3px_0px_#000] disabled:opacity-60" style={themedButtonStyle}>{formSubmitting ? 'Sending…' : textValue(sectionContent.submitLabel, 'Send message')}</button>
              </form>
            ) : section.type === 'newsletter' ? (
              formSubmitted ? <p role="status" className="mx-auto max-w-lg rounded-xl border-2 border-black bg-white p-4 text-center font-mono text-sm">You are subscribed. Thank you!</p> : <form className="mx-auto flex max-w-lg flex-col gap-2 sm:flex-row" onSubmit={(event) => { void submitBlockForm(event, 'newsletter'); }}><label className="sr-only" htmlFor={`newsletter-${section.id}`}>Email address</label><input name="email" id={`newsletter-${section.id}`} required type="email" placeholder="Email address" className="min-w-0 flex-1 rounded-xl border-2 border-black bg-white px-4 py-3 font-mono text-sm"/><input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden"/>{formError && <p role="alert" className="text-sm text-red-700">{formError}</p>}<button type="submit" disabled={formSubmitting} className="rounded-xl border-2 border-black px-4 py-3 font-display font-black shadow-[3px_3px_0px_#000] disabled:opacity-60" style={themedButtonStyle}>{formSubmitting ? 'Submitting…' : textValue(sectionContent.submitLabel, 'Subscribe')}</button></form>
            ) : section.type === 'pricing' ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">{blockItems.map((item, index) => <article key={`${section.id}-plan-${index}`} className={`rounded-2xl border-2 border-black bg-white p-5 shadow-[3px_3px_0px_#000] ${item.highlighted ? 'ring-2 ring-offset-2' : ''}`} style={item.highlighted ? { outlineColor: theme.primaryColor } : undefined}><h3 contentEditable suppressContentEditableWarning onInput={(e) => updateBlockItem(index, 'title', (e.target as HTMLElement).innerText)} className="font-display text-lg font-black">{textValue(item.title, 'Plan')}</h3><p className="mt-2 font-mono text-xs text-neutral-600">{textValue(item.description)}</p><p className="my-4 font-display text-3xl font-black">{textValue(item.price)}<span className="font-mono text-xs font-normal">{textValue(item.interval)}</span></p><ul className="space-y-2 font-mono text-xs">{(Array.isArray(item.features) ? item.features as string[] : []).map((feature, featureIndex) => <li key={featureIndex}>✓ {feature}</li>)}</ul><p className="mt-4 rounded-lg bg-neutral-100 px-3 py-2 text-center font-mono text-xs">Choose a plan by contacting us.</p></article>)}</div>
            ) : section.type === 'gallery' ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">{blockItems.map((item, index) => <article key={`${section.id}-item-${index}`} className="overflow-hidden rounded-2xl border-2 border-black bg-white shadow-[3px_3px_0px_#000]"><div className="h-36 flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${theme.primaryColor}55, ${theme.primaryColor}15)` }}>{textValue(item.image, assetUrl) ? <><NextImage src={textValue(item.image, assetUrl)} alt={textValue(item.title, 'Gallery image')} width={900} height={700} unoptimized className="h-full w-full object-cover" /></> : <span className="font-display text-4xl font-black" aria-hidden="true">0{index + 1}</span>}</div><div className="p-4"><h3 contentEditable suppressContentEditableWarning onInput={(e) => updateBlockItem(index, 'title', (e.target as HTMLElement).innerText)} className="font-display font-black">{textValue(item.title, 'Featured item')}</h3><p contentEditable suppressContentEditableWarning onInput={(e) => updateBlockItem(index, 'desc', (e.target as HTMLElement).innerText)} className="mt-1 font-mono text-xs text-neutral-500">{textValue(item.desc)}</p>{typeof item.price === 'string' && <p className="mt-4 font-display font-black">{item.price}</p>}</div></article>)}</div>
            ) : section.type === 'faq' ? (
              <div className="mx-auto max-w-3xl divide-y-2 divide-black/10 rounded-2xl border-2 border-black bg-white px-5">{blockItems.map((item, index) => <div key={`${section.id}-faq-${index}`} className="py-4"><button type="button" aria-expanded={openFaq === index} onClick={() => setOpenFaq((current) => current === index ? null : index)} className="flex w-full items-center justify-between text-left font-display font-black">{textValue(item.question, 'Question')}<span aria-hidden="true">{openFaq === index ? '−' : '+'}</span></button>{openFaq === index && <p className="mt-3 font-mono text-sm leading-relaxed text-neutral-600">{textValue(item.answer)}</p>}</div>)}</div>
            ) : section.type === 'stats' ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">{blockItems.map((item, index) => <div key={`${section.id}-stat-${index}`} className="rounded-2xl border-2 border-black bg-white p-5 text-center shadow-[3px_3px_0px_#000]"><p contentEditable suppressContentEditableWarning onInput={(e) => updateBlockItem(index, 'value', (e.target as HTMLElement).innerText)} className="font-display text-3xl font-black" style={{ color: theme.primaryColor }}>{textValue(item.value)}</p><p contentEditable suppressContentEditableWarning onInput={(e) => updateBlockItem(index, 'label', (e.target as HTMLElement).innerText)} className="mt-1 font-mono text-xs">{textValue(item.label)}</p></div>)}</div>
            ) : section.type === 'team' ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">{blockItems.map((item, index) => <article key={`${section.id}-team-${index}`} className="rounded-2xl border-2 border-black bg-white p-5"><div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full border-2 border-black font-display text-2xl font-black" style={{ backgroundColor: theme.primaryColor }}>{textValue(item.name, '?').charAt(0)}</div><h3 contentEditable suppressContentEditableWarning onInput={(e) => updateBlockItem(index, 'name', (e.target as HTMLElement).innerText)} className="font-display font-black">{textValue(item.name)}</h3><p className="font-mono text-xs text-neutral-500">{textValue(item.role)}</p><p className="mt-2 font-mono text-xs">{textValue(item.bio)}</p></article>)}</div>
            ) : section.type === 'steps' ? (
              <ol className="grid grid-cols-1 gap-4 sm:grid-cols-3">{blockItems.map((item, index) => <li key={`${section.id}-step-${index}`} className="rounded-2xl border-2 border-black bg-white p-5"><span className="font-mono text-xs font-black" style={{ color: theme.primaryColor }}>STEP 0{index + 1}</span><h3 className="mt-2 font-display font-black">{textValue(item.title)}</h3><p className="mt-1 font-mono text-xs text-neutral-600">{textValue(item.desc)}</p></li>)}</ol>
            ) : section.type === 'rich-text' ? (
              <article className="mx-auto max-w-3xl rounded-2xl border-2 border-black bg-white p-6 font-mono text-sm leading-relaxed"><p contentEditable suppressContentEditableWarning onInput={(e) => onUpdateSectionContent(section.id, { ...sectionContent, body: (e.target as HTMLElement).innerText })}>{textValue(sectionContent.body)}</p></article>
            ) : section.type === 'image-text' ? (
              <div className="grid items-center gap-6 rounded-2xl border-2 border-black bg-white p-5 sm:grid-cols-2">{textValue(sectionContent.image, assetUrl) ? <NextImage src={textValue(sectionContent.image, assetUrl)} alt={textValue(sectionContent.imageAlt)} width={900} height={700} unoptimized className="h-64 w-full rounded-xl object-cover" /> : <div className="flex h-64 items-center justify-center rounded-xl bg-neutral-100 font-mono text-xs">Upload an image in the section properties</div>}<p className="font-mono text-sm leading-relaxed">{textValue(sectionContent.body)}</p></div>
            ) : section.type === 'announcement' ? (
              <div className="flex flex-wrap items-center justify-center gap-2 rounded-xl border-2 border-black p-4 text-center font-mono text-sm" style={{ backgroundColor: theme.primaryColor }}><span>{textValue(sectionContent.text)}</span>{typeof sectionContent.linkLabel === 'string' && <span className="font-bold underline">{sectionContent.linkLabel}</span>}</div>
            ) : section.type === 'services' ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{blockItems.map((item, index) => <article key={index} className="rounded-xl border-2 border-black bg-white p-5 shadow-[2px_2px_0_#000]"><h3 className="font-display text-lg font-black">{textValue(item.title, `Service ${index + 1}`)}</h3><p className="mt-2 font-mono text-xs leading-relaxed text-neutral-600">{textValue(item.desc, textValue(item.description))}</p></article>)}</div>
            ) : section.type === 'logo-cloud' ? (
              <div className="flex flex-wrap items-center justify-center gap-5">{blockItems.map((item, index) => <div key={index} className="flex h-20 min-w-32 items-center justify-center rounded-xl border border-black/10 bg-white px-5">{textValue(item.image) ? <NextImage src={textValue(item.image)} alt={textValue(item.title, 'Partner logo')} width={180} height={72} unoptimized className="max-h-12 w-auto object-contain" /> : <span className="font-display text-sm font-black text-neutral-500">{textValue(item.title, `Partner ${index + 1}`)}</span>}</div>)}</div>
            ) : section.type === 'breadcrumbs' ? (
              <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 font-mono text-xs"><button type="button" onClick={(event) => { event.stopPropagation(); onNavigatePage('home'); }} className="underline">Home</button><span aria-hidden="true">/</span><span>{section.name}</span></nav>
            ) : section.type === 'not-found' ? (
              <div className="mx-auto max-w-xl rounded-2xl border-2 border-black bg-white p-8 text-center shadow-[3px_3px_0_#000]"><p className="font-display text-6xl font-black" style={{ color: theme.primaryColor }}>404</p><p className="mt-3 font-mono text-sm text-neutral-600">{textValue(sectionContent.description)}</p><button type="button" onClick={(event) => { event.stopPropagation(); onNavigatePage('home'); }} className="mt-5 rounded-xl border-2 border-black px-4 py-2 font-bold" style={themedButtonStyle}>{textValue(sectionContent.buttonText, 'Back home')}</button></div>
            ) : (
              <article className="mx-auto max-w-4xl rounded-2xl border-2 border-dashed border-black/30 bg-white p-6 shadow-[3px_3px_0_#000]"><h3 className="font-display text-xl font-black">{textValue(sectionContent.title, textValue(sectionContent.heading, section.name || 'Content block'))}</h3>{typeof sectionContent.description === 'string' && <p className="mt-2 leading-relaxed text-neutral-600">{sectionContent.description}</p>}{typeof sectionContent.body === 'string' && <p className="mt-3 whitespace-pre-wrap leading-relaxed">{sectionContent.body}</p>}{typeof sectionContent.text === 'string' && <p className="mt-3 leading-relaxed">{sectionContent.text}</p>}{blockItems.length > 0 && <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{blockItems.map((item, index) => <div key={index} className="rounded-xl border border-black/10 bg-neutral-50 p-4"><h4 className="font-bold">{String(item.title || item.name || item.label || `Item ${index + 1}`)}</h4><p className="mt-1 text-sm text-neutral-600">{String(item.description || item.desc || item.answer || item.quote || '')}</p></div>)}</div>}<p className="mt-4 font-mono text-[9px] font-bold uppercase text-neutral-400">Select this section to edit every field in the inspector.</p></article>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function StructuredContentEditor({ value, onChange, label = 'All content fields' }: { value: Record<string, unknown>; onChange: (value: Record<string, unknown>) => void; label?: string }) {
  const [draft, setDraft] = useState(() => JSON.stringify(value, null, 2));
  const [error, setError] = useState('');
  const apply = () => {
    try {
      const parsed: unknown = JSON.parse(draft);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Content must be a JSON object.');
      onChange(parsed as Record<string, unknown>);
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Invalid content data.');
    }
  };
  return <details className="rounded-xl border border-black/20 bg-white p-2.5"><summary className="cursor-pointer font-mono text-[9px] font-black uppercase">{label} · advanced</summary><p className="mt-2 text-[10px] leading-relaxed text-neutral-500">Edit every content property, including nested items and element-specific settings. Apply validates the data before saving it to this block.</p><textarea aria-label={label} spellCheck={false} rows={10} value={draft} onChange={(event) => setDraft(event.target.value)} onBlur={apply} className="mt-2 w-full rounded-lg border border-black/30 bg-[#FAF9F6] p-2 font-mono text-[10px] leading-relaxed"/><button type="button" onClick={apply} className="mt-2 w-full rounded-lg border-2 border-black bg-yellow py-2 font-mono text-[10px] font-bold">Apply content</button>{error && <p role="alert" className="mt-2 text-[10px] font-bold text-red-700">{error}</p>}</details>;
}

function SectionProperties({
  sectionId,
  sections,
  theme,
  setSectionStyle,
  setSectionContent,
  onUploadImage,
  setSectionSettings,
  sectionSpacing,
  setSectionSpacing,
}: {
  sectionId: string;
  sections: Section[];
  theme: Theme;
  setSectionStyle: (style: Partial<SectionStyle>) => void;
  setSectionContent: (content: Record<string, unknown>) => void;
  onUploadImage: (file?: File, itemIndex?: number) => void;
  setSectionSettings: (settings: Partial<Pick<Section, 'hidden' | 'anchorId' | 'customClass' | 'locked'>>) => void;
  sectionSpacing: SectionSpacing;
  setSectionSpacing: React.Dispatch<React.SetStateAction<SectionSpacing>>;
}) {
  const section = sections.find(s => s.id === sectionId);
  const [inspectorTab, setInspectorTab] = useState<'content' | 'style' | 'advanced'>('content');
  if (!section) return null;
  const content = section.content || {};
  const updateContent = (key: string, value: unknown) => setSectionContent({ ...content, [key]: value });
  const repeaterItems = Array.isArray(content.items) ? content.items as Array<Record<string, unknown>> : [];
  const footerItems = repeaterItems.length ? repeaterItems : Array.isArray(content.links) ? content.links.map((link) => ({ label: String(link), href: `/${String(link).toLowerCase()}` })) : [];

  return (
    <div className="space-y-4">
      {/* Block identity */}
      <div className="rounded-xl border-2 border-black bg-white p-2.5 shadow-[2px_2px_0px_#000]">
        <span className="font-mono text-[9px] font-bold text-neutral-400 uppercase block">Active Section</span>
        <span className="font-display font-black text-sm text-black">{section.name}</span>
      </div>

      <div role="tablist" aria-label="Section properties" className="grid grid-cols-3 gap-1 rounded-xl border-2 border-black bg-[#FAF9F6] p-1">
        {(['content', 'style', 'advanced'] as const).map((tab) => <button key={tab} type="button" role="tab" aria-selected={inspectorTab === tab} onClick={() => setInspectorTab(tab)} className={cn('rounded-lg px-2 py-2 font-mono text-[9px] font-black uppercase transition-colors', inspectorTab === tab ? 'border border-black bg-yellow text-black shadow-[1px_1px_0_#000]' : 'text-neutral-500 hover:bg-white')}>{tab}</button>)}
      </div>

      <div hidden={inspectorTab !== 'content'} className="space-y-2 rounded-xl border-2 border-black bg-white p-3">
        <p className="font-mono text-[10px] font-black uppercase text-neutral-500">Block content</p>
        <label className="block font-mono text-[9px] font-bold uppercase text-neutral-500">Section image URL<input type="url" value={typeof content.image === 'string' ? content.image : ''} onChange={(event) => updateContent('image', event.target.value)} placeholder="https://example.com/image.jpg" className="mt-1 w-full rounded-lg border border-black/30 px-2 py-1.5 font-sans text-xs font-normal normal-case text-black" /></label>
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-black/40 bg-neutral-50 px-3 py-2 font-mono text-[10px] font-bold hover:bg-yellow/40"><ImageIcon size={14}/> Upload section image<input type="file" accept="image/*" className="sr-only" onChange={(event) => { onUploadImage(event.target.files?.[0]); event.currentTarget.value = ''; }} /></label>
        {typeof content.image === 'string' && content.image && <NextImage src={content.image} alt="Section image preview" width={900} height={500} unoptimized className="max-h-36 w-full rounded-lg border border-black/15 object-cover" />}
        <div className="space-y-2">
          {Object.entries(content).filter(([key, value]) => key !== 'image' && !Array.isArray(value) && value !== null && ['string', 'number', 'boolean'].includes(typeof value)).map(([key, value]) => <label key={key} className="block font-mono text-[9px] font-bold uppercase text-neutral-500">{key.replace(/([A-Z])/g, ' $1').replace(/[_-]/g, ' ')}{typeof value === 'boolean' ? <span className="mt-1 flex items-center gap-2 rounded-lg border border-black/20 bg-[#FAF9F6] px-2 py-2 font-sans text-xs font-normal normal-case text-black"><input type="checkbox" checked={value} onChange={(event) => updateContent(key, event.target.checked)} />Enabled</span> : typeof value === 'number' ? <input type="number" value={value} onChange={(event) => updateContent(key, Number(event.target.value))} className="mt-1 w-full rounded-lg border border-black/30 px-2 py-1.5 font-sans text-xs font-normal normal-case text-black" /> : <textarea rows={typeof value === 'string' && value.length > 90 ? 3 : 1} value={String(value)} onChange={(event) => updateContent(key, event.target.value)} className="mt-1 w-full resize-y rounded-lg border border-black/30 px-2 py-1.5 font-sans text-xs font-normal normal-case text-black" />}</label>)}
        </div>
        {section.type === 'nav' && <details className="rounded-lg border-2 border-black/15 bg-yellow/10 p-2.5" open>
          <summary className="cursor-pointer font-mono text-[9px] font-black uppercase">Navbar controls</summary>
          <div className="mt-2 space-y-2">
            <label className="block font-mono text-[9px] font-bold uppercase text-neutral-600">Brand label<input value={typeof content.brandLabel === 'string' ? content.brandLabel : ''} onChange={(event) => updateContent('brandLabel', event.target.value)} placeholder="Uses website name" className="mt-1 w-full rounded border border-black/25 bg-white px-2 py-1.5 font-sans text-xs font-normal normal-case" /></label>
            <label className="block font-mono text-[9px] font-bold uppercase text-neutral-600">Brand tagline<input value={typeof content.brandTagline === 'string' ? content.brandTagline : ''} onChange={(event) => updateContent('brandTagline', event.target.value)} placeholder="Optional short tagline" className="mt-1 w-full rounded border border-black/25 bg-white px-2 py-1.5 font-sans text-xs font-normal normal-case" /></label>
            <label className="block font-mono text-[9px] font-bold uppercase text-neutral-600">Logo image URL<input type="url" value={typeof content.logoUrl === 'string' ? content.logoUrl : ''} onChange={(event) => updateContent('logoUrl', event.target.value)} placeholder="Uses the site logo when empty" className="mt-1 w-full rounded border border-black/25 bg-white px-2 py-1.5 font-sans text-xs font-normal normal-case" /></label>
            <label className="block font-mono text-[9px] font-bold uppercase text-neutral-600">Logo alt text<input value={typeof content.logoAlt === 'string' ? content.logoAlt : ''} onChange={(event) => updateContent('logoAlt', event.target.value)} placeholder="Accessible logo description" className="mt-1 w-full rounded border border-black/25 bg-white px-2 py-1.5 font-sans text-xs font-normal normal-case" /></label>
            <label className="block font-mono text-[9px] font-bold uppercase text-neutral-600">CTA label<input value={typeof content.ctaLabel === 'string' ? content.ctaLabel : ''} onChange={(event) => updateContent('ctaLabel', event.target.value)} placeholder="Get started or Bag" className="mt-1 w-full rounded border border-black/25 bg-white px-2 py-1.5 font-sans text-xs font-normal normal-case" /></label>
            <label className="block font-mono text-[9px] font-bold uppercase text-neutral-600">CTA destination<input value={typeof content.ctaTarget === 'string' ? content.ctaTarget : ''} onChange={(event) => updateContent('ctaTarget', event.target.value)} placeholder="#collection, /contact, or https://…" className="mt-1 w-full rounded border border-black/25 bg-white px-2 py-1.5 font-sans text-xs font-normal normal-case" /></label>
            <div className="grid grid-cols-2 gap-2"><label className="block font-mono text-[9px] font-bold uppercase text-neutral-600">CTA style<select value={typeof content.ctaVariant === 'string' ? content.ctaVariant : 'solid'} onChange={(event) => updateContent('ctaVariant', event.target.value)} className="mt-1 w-full rounded border border-black/25 bg-white px-2 py-1.5 font-mono text-xs font-normal normal-case"><option value="solid">Solid</option><option value="outline">Outline</option><option value="ghost">Ghost</option></select></label><label className="flex items-end gap-2 pb-1 font-mono text-[9px] font-bold uppercase"><input type="checkbox" checked={content.showCta !== false} onChange={(event) => updateContent('showCta', event.target.checked)} />Show CTA</label></div>
            <label className="flex items-center gap-2 font-mono text-[9px] font-bold uppercase"><input type="checkbox" checked={content.ctaNewTab === true} onChange={(event) => updateContent('ctaNewTab', event.target.checked)} />Open CTA in new tab</label>
            <label className="flex items-center gap-2 font-mono text-[9px] font-bold uppercase"><input type="checkbox" checked={content.showLogo !== false} onChange={(event) => updateContent('showLogo', event.target.checked)} />Show logo</label>
            <label className="flex items-center gap-2 font-mono text-[9px] font-bold uppercase"><input type="checkbox" checked={content.showMenu !== false} onChange={(event) => updateContent('showMenu', event.target.checked)} />Show navigation links</label>
            <label className="flex items-center gap-2 font-mono text-[9px] font-bold uppercase"><input type="checkbox" checked={content.sticky === true} onChange={(event) => updateContent('sticky', event.target.checked)} />Sticky on scroll</label>
            <div className="grid grid-cols-2 gap-2"><label className="block font-mono text-[9px] font-bold uppercase text-neutral-600">Mobile label<input value={typeof content.mobileMenuLabel === 'string' ? content.mobileMenuLabel : ''} onChange={(event) => updateContent('mobileMenuLabel', event.target.value)} placeholder="Menu" className="mt-1 w-full rounded border border-black/25 bg-white px-2 py-1.5 font-sans text-xs font-normal normal-case" /></label><label className="block font-mono text-[9px] font-bold uppercase text-neutral-600">Close label<input value={typeof content.mobileCloseLabel === 'string' ? content.mobileCloseLabel : ''} onChange={(event) => updateContent('mobileCloseLabel', event.target.value)} placeholder="Close" className="mt-1 w-full rounded border border-black/25 bg-white px-2 py-1.5 font-sans text-xs font-normal normal-case" /></label></div>
            <p className="font-mono text-[9px] leading-relaxed text-neutral-500">Edit the actual page links in the Navigation panel. Changes here control this navbar instance only.</p>
          </div>
        </details>}
        {(section.type === 'cta' || typeof content.buttonText === 'string' || typeof content.ctaPrimary === 'string') && <details className="rounded-lg border border-black/20 bg-[#FAF9F6] p-2"><summary className="cursor-pointer font-mono text-[9px] font-bold uppercase">Button actions</summary><label className="mt-2 block font-mono text-[9px] font-bold uppercase text-neutral-500">Primary destination URL or #anchor<input type="text" value={typeof content.buttonLink === 'string' ? content.buttonLink : '#collection'} onChange={(event) => updateContent('buttonLink', event.target.value)} placeholder="/contact or #products" className="mt-1 w-full rounded border border-black/30 bg-white px-2 py-1.5 font-sans text-xs font-normal normal-case text-black" /></label><label className="mt-2 flex items-center gap-2 font-mono text-[9px] font-bold uppercase text-neutral-600"><input type="checkbox" checked={content.buttonNewTab === true} onChange={(event) => updateContent('buttonNewTab', event.target.checked)} />Open primary destination in new tab</label>{typeof content.ctaSecondary === 'string' && <><label className="mt-2 block font-mono text-[9px] font-bold uppercase text-neutral-500">Secondary destination<input type="text" value={typeof content.secondaryButtonLink === 'string' ? content.secondaryButtonLink : '#home-how-it-works'} onChange={(event) => updateContent('secondaryButtonLink', event.target.value)} placeholder="/about or #details" className="mt-1 w-full rounded border border-black/30 bg-white px-2 py-1.5 font-sans text-xs font-normal normal-case text-black" /></label><label className="mt-2 flex items-center gap-2 font-mono text-[9px] font-bold uppercase text-neutral-600"><input type="checkbox" checked={content.secondaryButtonNewTab === true} onChange={(event) => updateContent('secondaryButtonNewTab', event.target.checked)} />Open secondary destination in new tab</label></>}</details>}
        {(section.type === 'contact' || section.type === 'newsletter' || /form/i.test(section.type)) && <details className="rounded-lg border border-black/20 bg-[#FAF9F6] p-2"><summary className="cursor-pointer font-mono text-[9px] font-bold uppercase">Form delivery</summary><p className="mt-2 font-mono text-[9px] leading-relaxed text-neutral-500">Default routes submit to Launchly’s contact or newsletter API. A custom HTTPS endpoint receives a JSON POST. Keep private API keys on your server.</p><label className="mt-2 block font-mono text-[9px] font-bold uppercase text-neutral-500">API endpoint<input type="text" value={typeof content.apiEndpoint === 'string' ? content.apiEndpoint : ''} onChange={(event) => updateContent('apiEndpoint', event.target.value)} placeholder="https://api.example.com/submit" className="mt-1 w-full rounded border border-black/30 bg-white px-2 py-1.5 font-sans text-xs font-normal normal-case text-black" /></label></details>}
        {section.type === 'footer' && <details className="rounded-lg border border-black/20 bg-[#FAF9F6] p-2" open><summary className="cursor-pointer font-mono text-[9px] font-bold uppercase">Footer links · {footerItems.length}</summary><div className="mt-2 space-y-2">{footerItems.map((item, index) => <div key={`footer-link-${index}`} className="grid grid-cols-[1fr_1.3fr_auto] gap-1"><input aria-label={`Footer link ${index + 1} label`} value={String(item.label || '')} onChange={(event) => updateContent('items', footerItems.map((entry, itemIndex) => itemIndex === index ? { ...entry, label: event.target.value } : entry))} placeholder="Label" className="min-w-0 rounded border border-black/20 bg-white px-1.5 py-1 font-sans text-[10px]"/><input aria-label={`Footer link ${index + 1} destination`} value={String(item.href || '')} onChange={(event) => updateContent('items', footerItems.map((entry, itemIndex) => itemIndex === index ? { ...entry, href: event.target.value } : entry))} placeholder="/page or https://" className="min-w-0 rounded border border-black/20 bg-white px-1.5 py-1 font-sans text-[10px]"/><button type="button" aria-label={`Remove footer link ${index + 1}`} onClick={() => updateContent('items', footerItems.filter((_, itemIndex) => itemIndex !== index))} className="rounded border border-black/20 px-1.5 hover:bg-pink"><Trash2 size={12}/></button></div>)}<button type="button" onClick={() => updateContent('items', [...footerItems, { label: 'New link', href: '/' }])} className="w-full rounded border border-black bg-yellow py-1.5 font-mono text-[9px] font-bold">＋ Add footer link</button><label className="mt-2 block font-mono text-[9px] font-bold uppercase text-neutral-500">Footer note<input value={typeof content.copyright === 'string' ? content.copyright : 'All rights reserved.'} onChange={(event) => updateContent('copyright', event.target.value)} className="mt-1 w-full rounded border border-black/20 bg-white px-2 py-1.5 font-sans text-xs font-normal normal-case" /></label></div></details>}
        {Array.isArray(content.items) && <div className="space-y-2 border-t border-black/10 pt-2"><p className="font-mono text-[9px] font-bold uppercase text-neutral-500">Items · {repeaterItems.length}</p>{repeaterItems.map((item, index) => <div key={`${section.id}-item-${index}`} className="space-y-1 rounded-lg border border-black/20 bg-[#FAF9F6] p-2"><div className="flex items-center justify-between"><span className="font-mono text-[9px] font-bold">Item {index + 1}</span><button type="button" aria-label={`Remove item ${index + 1}`} onClick={() => updateContent('items', repeaterItems.filter((_, itemIndex) => itemIndex !== index))} className="rounded border border-black/20 p-1 hover:bg-pink"><Trash2 size={12}/></button></div>{Object.entries(item).filter(([, value]) => ['string', 'number', 'boolean'].includes(typeof value)).map(([key, value]) => <label key={key} className="block font-mono text-[9px] font-bold capitalize text-neutral-500">{key}{typeof value === 'boolean' ? <input type="checkbox" checked={value} onChange={(event) => updateContent('items', repeaterItems.map((entry, itemIndex) => itemIndex === index ? { ...entry, [key]: event.target.checked } : entry))} className="ml-2"/> : <input type={typeof value === 'number' ? 'number' : 'text'} value={String(value)} onChange={(event) => updateContent('items', repeaterItems.map((entry, itemIndex) => itemIndex === index ? { ...entry, [key]: typeof value === 'number' ? Number(event.target.value) : event.target.value } : entry))} className="mt-0.5 w-full rounded border border-black/20 bg-white px-2 py-1 font-sans text-xs font-normal text-black" />}</label>)}{(section.type === 'gallery' || section.type === 'team' || section.type === 'features' || section.type === 'testimonials' || section.type === 'services' || section.type === 'logo-cloud' || item.image !== undefined || item.src !== undefined) && <><label className="block font-mono text-[9px] font-bold uppercase text-neutral-500">Image URL<input value={String(item.image || item.src || '')} onChange={(event) => updateContent('items', repeaterItems.map((entry, itemIndex) => itemIndex === index ? { ...entry, image: event.target.value, src: event.target.value } : entry))} placeholder="https://example.com/image.jpg" className="mt-0.5 w-full rounded border border-black/20 bg-white px-2 py-1 font-sans text-xs font-normal normal-case text-black" /></label><label className="flex cursor-pointer items-center justify-center gap-2 rounded border border-dashed border-black/30 bg-white px-2 py-1.5 font-mono text-[9px] font-bold hover:bg-yellow/40"><ImageIcon size={12}/> Upload item image<input type="file" accept="image/*" className="sr-only" onChange={(event) => { onUploadImage(event.target.files?.[0], index); event.currentTarget.value = ''; }} /></label></>}</div>)}<button type="button" onClick={() => { const defaults = blockRegistry[section.type]?.defaultContent.items; const fallback = Array.isArray(defaults) ? defaults[0] as Record<string, unknown> : { title: 'New item', desc: 'Add a description.' }; updateContent('items', [...repeaterItems, structuredClone(repeaterItems[0] || fallback)]); }} className="w-full rounded-lg border border-black bg-yellow py-1.5 font-mono text-[10px] font-bold">＋ Add item</button></div>}
        <StructuredContentEditor key={JSON.stringify(content)} value={content} onChange={setSectionContent} label="Complete section content" />
      </div>

      {/* Typography Toolbar */}
      <div hidden={inspectorTab !== 'style'} className="space-y-4 rounded-xl border-2 border-black bg-white p-3">
        <div className="font-mono text-[10px] font-black uppercase text-neutral-500 tracking-wider mb-1.5">
          Typography
        </div>
        <div className="flex items-center gap-1.5">
          <button type="button" title="Toggle bold for this section" aria-pressed={section.style?.fontWeight === 700} onClick={() => setSectionStyle({ fontWeight: section.style?.fontWeight === 700 ? 400 : 700 })} className="p-2 rounded-lg border-2 border-black bg-white hover:bg-yellow shadow-2xs cursor-pointer">
            <Bold size={13} className="stroke-[3]" />
          </button>
          <button type="button" title="Toggle italic for this section" aria-pressed={section.style?.fontStyle === 'italic'} onClick={() => setSectionStyle({ fontStyle: section.style?.fontStyle === 'italic' ? 'normal' : 'italic' })} className="p-2 rounded-lg border-2 border-black bg-white hover:bg-yellow shadow-2xs cursor-pointer">
            <Italic size={13} className="stroke-[3]" />
          </button>
          <div className="flex-1 h-px bg-black/10" />
          <button type="button" title="Align left" aria-pressed={section.style?.textAlign === 'left'} onClick={() => setSectionStyle({ textAlign: 'left' })} className="p-2 rounded-lg border-2 border-black bg-white hover:bg-yellow shadow-2xs cursor-pointer">
            <AlignLeft size={13} />
          </button>
          <button type="button" title="Align center" aria-pressed={section.style?.textAlign === 'center'} onClick={() => setSectionStyle({ textAlign: 'center' })} className="p-2 rounded-lg border-2 border-black bg-white hover:bg-yellow shadow-2xs cursor-pointer">
            <AlignCenter size={13} />
          </button>
          <button type="button" title="Align right" aria-pressed={section.style?.textAlign === 'right'} onClick={() => setSectionStyle({ textAlign: 'right' })} className="p-2 rounded-lg border-2 border-black bg-white hover:bg-yellow shadow-2xs cursor-pointer">
            <AlignRight size={13} />
          </button>
        </div>
      {/* Spacing Controls */}
      <div>
        <div className="font-mono text-[10px] font-black uppercase text-neutral-500 tracking-wider mb-1.5">
          Spacing (px)
        </div>
        <div className="grid grid-cols-2 gap-2">
          {(['top', 'bottom', 'left', 'right'] as const).map((side) => (
            <label key={side} className="rounded-xl border-2 border-black bg-white p-2">
              <span className="mb-1 block font-mono text-[10px] font-bold capitalize text-neutral-500">{side}: {sectionSpacing[side]}px</span>
              <input type="range" min={0} max={120} step={4} value={sectionSpacing[side]} onChange={(event) => setSectionSpacing((current) => ({ ...current, [side]: Number(event.target.value) }))} className="w-full accent-pink" aria-label={`${side} spacing`} />
            </label>
          ))}
        </div>
      </div>

      {/* Theme Accent Color */}
      <div>
        <div className="font-mono text-[10px] font-black uppercase text-neutral-500 tracking-wider mb-1.5">
          Section Accent
        </div>
        <div className="flex items-center gap-2 rounded-xl border-2 border-black bg-white p-2">
          <input
            type="color"
            value={section.style?.accentColor || theme.primaryColor}
            onChange={(e) => setSectionStyle({ accentColor: e.target.value })}
            className="w-8 h-8 rounded-lg border border-black cursor-pointer p-0.5"
          />
          <input
            type="text"
            value={section.style?.accentColor || theme.primaryColor}
            onChange={(e) => setSectionStyle({ accentColor: e.target.value })}
            className="flex-1 font-mono text-xs font-bold text-black outline-none uppercase"
          />
        </div>
      </div>

      {/* Border Radius */}
      <div>
        <div className="font-mono text-[10px] font-black uppercase text-neutral-500 tracking-wider mb-1.5">
          Corner Radius
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {['8px', '16px', '24px', '9999px'].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setSectionStyle({ borderRadius: r })}
              className={cn(
                'py-1.5 rounded-lg border-2 border-black font-mono text-[10px] font-black cursor-pointer transition-all',
                (section.style?.borderRadius || theme.borderRadius) === r ? 'bg-pink text-black shadow-2xs' : 'bg-white hover:bg-neutral-100'
              )}
            >
              {r === '9999px' ? 'Pill' : r}
            </button>
          ))}
        </div>
      </div>
      <label className="block font-mono text-[10px] font-bold uppercase text-neutral-500">Section background
        <span className="mt-1 flex items-center gap-2 rounded-xl border-2 border-black bg-white p-2"><input type="color" value={section.style?.backgroundColor || '#ffffff'} onChange={(event) => setSectionStyle({ backgroundColor: event.target.value })} aria-label="Section background color" className="h-8 w-9 rounded border border-black" /><input value={section.style?.backgroundColor || ''} onChange={(event) => setSectionStyle({ backgroundColor: event.target.value || undefined })} placeholder="Use theme default" className="min-w-0 flex-1 font-mono text-xs font-bold uppercase" /></span>
      </label>
      </div>
      <div hidden={inspectorTab !== 'advanced'} className="space-y-2 rounded-xl border-2 border-black bg-white p-3">
        <p className="font-mono text-[10px] font-black uppercase text-neutral-500">Advanced</p>
        <label className="block font-mono text-[9px] font-bold uppercase text-neutral-500">Section animation<select value={section.style?.animation || ''} onChange={(event) => setSectionStyle({ animation: event.target.value || undefined })} className="mt-1 w-full rounded-lg border border-black/30 bg-white px-2 py-1.5 font-mono text-xs font-normal normal-case text-black"><option value="">None</option><option value="fade-in">Fade in</option><option value="slide-up">Slide up</option><option value="slide-left">Slide in from left</option><option value="zoom-in">Zoom in</option><option value="float">Float</option><option value="pulse">Pulse</option></select></label>
        <label className="block font-mono text-[9px] font-bold uppercase text-neutral-500">Anchor ID<input value={section.anchorId || ''} onChange={(event) => setSectionSettings({ anchorId: event.target.value || undefined })} placeholder={section.id} className="mt-1 w-full rounded-lg border border-black/30 px-2 py-1.5 font-mono text-xs font-normal normal-case text-black" /></label>
        <label className="block font-mono text-[9px] font-bold uppercase text-neutral-500">Custom class<input value={section.customClass || ''} onChange={(event) => setSectionSettings({ customClass: event.target.value || undefined })} placeholder="my-section" className="mt-1 w-full rounded-lg border border-black/30 px-2 py-1.5 font-mono text-xs font-normal normal-case text-black" /></label>
        <p className="font-mono text-[9px] font-bold uppercase text-neutral-500">Hide on device</p>
        <div className="flex flex-wrap gap-3 font-mono text-[10px]">{(['desktop', 'tablet', 'mobile'] as const).map((device) => <label key={device} className="flex items-center gap-1"><input type="checkbox" checked={section.hidden?.[device] || false} onChange={(event) => setSectionSettings({ hidden: { ...section.hidden, [device]: event.target.checked } })}/>{device}</label>)}</div>
        <button type="button" onClick={() => setSectionSettings({ locked: !section.locked })} className="w-full rounded-lg border border-black py-1.5 font-mono text-[10px] font-bold">{section.locked ? 'Unlock block' : 'Lock block'}</button>
      </div>
    </div>
  );
}

// Pro Account Domain Publishing Modal
function PublishDialog({ 
  onClose, 
  siteName, 
  templateId, 
  isPro,
  sitePayload 
}: { 
  onClose: () => void; 
  siteName: string; 
  templateId: string; 
  isPro: boolean;
  sitePayload?: Record<string, unknown>;
}) {
  const [step, setStep] = useState<'form' | 'publishing' | 'success'>('form');
  const [subdomain, setSubdomain] = useState(siteName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''));
  const [publishedUrl, setPublishedUrl] = useState('');
  const [publishError, setPublishError] = useState('');
  const [copied, setCopied] = useState(false);
  const [copiedDomain, setCopiedDomain] = useState(false);

  const getWorkingUrl = () => {
    if (publishedUrl) {
      if (typeof window !== 'undefined' && publishedUrl.startsWith('/')) {
        return `${window.location.origin}${publishedUrl}`;
      }
      return publishedUrl;
    }
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/live/${subdomain}`;
    }
    return `/live/${subdomain}`;
  };

  const handlePublish = async () => {
    setPublishError('');
    setStep('publishing');
    try {
      const res = await fetch('/api/sites/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId,
          name: siteName,
          subdomain,
          siteData: sitePayload,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.site) {
        setPublishError(data.message || 'We could not publish this site. Please try again.');
        setStep('form');
        return;
      }
      setPublishedUrl(`/live/${data.site.subdomain}`);
    } catch (error) {
      setPublishError(error instanceof Error ? error.message : 'We could not publish this site. Please try again.');
      setStep('form');
      return;
    }
    await new Promise(r => setTimeout(r, 1000));
    setStep('success');
  };

  const handleCopyWorkingUrl = () => {
    const full = getWorkingUrl();
    navigator.clipboard?.writeText(full);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyCustomDomain = () => {
    const full = `https://${subdomain}.launchly.site`;
    navigator.clipboard?.writeText(full);
    setCopiedDomain(true);
    setTimeout(() => setCopiedDomain(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[110] flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl p-5 sm:p-8 max-w-md w-full shadow-[10px_10px_0px_#000] relative border-[3.5px] border-black">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl border-2 border-black bg-white hover:bg-yellow shadow-[2px_2px_0px_#000] cursor-pointer transition-all"
        >
          <X size={14} className="stroke-[2.5]" />
        </button>

        {step === 'form' && (
          <div className="space-y-4">
            {publishError && <p role="alert" className="rounded-xl border-2 border-red-600 bg-red-50 p-3 font-mono text-xs font-bold text-red-800">{publishError}</p>}
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl border-2 border-black bg-pink flex items-center justify-center text-black shadow-[2px_2px_0px_#000]">
                <Globe size={22} className="stroke-[2.5]" />
              </div>
              <div>
                <h3 className="font-display font-black text-lg text-black leading-tight">
                  {isPro ? 'Launchly Pro Hosting' : 'Free Launchly Hosting'}
                </h3>
                <p className="font-mono text-xs text-neutral-500">
                  Deploy live directly on our platform domain
                </p>
              </div>
            </div>

            {/* Our Platform Domain Notice */}
            <div className="p-3 rounded-2xl border-2 border-black bg-yellow/20">
              <div className="font-mono text-[10px] font-black uppercase text-black">
                🔒 HOSTED ON OUR LAUNCHLY DOMAIN
              </div>
              <div className="font-mono text-[11px] text-neutral-700 mt-0.5">
                Your site is hosted at <strong>{subdomain}.launchly.site</strong>. {isPro ? 'Pro publishing has no Launchly watermark.' : 'Free published sites include a Launchly watermark.'}
              </div>
            </div>

            <div>
              <label className="font-mono text-[10px] font-bold text-neutral-500 uppercase tracking-wider block mb-1">
                Website Name
              </label>
              <input
                type="text"
                value={siteName}
                readOnly
                className="w-full px-3.5 py-2 rounded-xl border-2 border-black bg-[#FAF9F6] font-display font-bold text-sm text-black"
              />
            </div>

            <div>
              <label className="font-mono text-[10px] font-bold text-neutral-500 uppercase tracking-wider block mb-1">
                Subdomain on our domain
              </label>
              <div className="flex items-center">
                <input
                  type="text"
                  value={subdomain}
                  onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  className="flex-1 px-3 py-2 bg-white border-2 border-r-0 border-black rounded-l-xl font-mono text-xs font-bold text-black focus:outline-none"
                />
                <div className="px-3 py-2 bg-yellow border-2 border-black rounded-r-xl font-mono text-xs font-black text-black">
                  .launchly.site
                </div>
              </div>
              <div className="mt-1 flex items-center gap-1.5 font-mono text-[10px] text-mint font-bold">
                <span className="w-2 h-2 rounded-full bg-mint" />
                <span>Available for instant edge activation</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handlePublish}
              className="w-full justify-center py-3 rounded-2xl border-2 border-black bg-pink hover:bg-yellow font-display text-sm font-black text-black shadow-[4px_4px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center gap-2 cursor-pointer"
            >
              <Globe size={16} className="stroke-[2.5]" />
              <span>Host on Our Domain Now →</span>
            </button>
          </div>
        )}

        {step === 'publishing' && (
          <div className="text-center py-8 space-y-3">
            <div className="w-14 h-14 rounded-2xl border-2 border-black bg-yellow flex items-center justify-center mx-auto shadow-[3px_3px_0px_#000]">
              <Loader2 size={26} className="animate-spin text-black stroke-[2.5]" />
            </div>
            <h3 className="font-display font-black text-lg text-black">Deploying to launchly.site…</h3>
            <p className="font-mono text-xs text-neutral-500 max-w-xs mx-auto">
              Generating Edge SSR bundle, configuring SSL certificates, and pointing DNS to our edge network.
            </p>
          </div>
        )}

        {step === 'success' && (
          <div className="text-center py-4 space-y-3.5">
            <div className="w-14 h-14 rounded-2xl border-2 border-black bg-mint flex items-center justify-center mx-auto shadow-[3px_3px_0px_#000]">
              <Check size={28} className="stroke-[3] text-black" />
            </div>
            <h3 className="font-display font-black text-xl text-black">Your Website is Live!</h3>
            
            {/* Live Instant Preview Box */}
            <div className="p-3 rounded-xl border-2 border-black bg-yellow text-left">
              <span className="font-mono text-[9px] font-black uppercase text-neutral-600 block">
                ● LIVE URL (INSTANT PREVIEW)
              </span>
              <span className="font-mono text-xs font-black text-black truncate block mt-0.5">
                {getWorkingUrl()}
              </span>
            </div>

            {/* Edge Domain Tag */}
            <div className="p-2.5 rounded-xl border-2 border-black bg-[#FAF9F6] text-left flex items-center justify-between">
              <div>
                <span className="font-mono text-[9px] font-bold text-neutral-500 uppercase block">
                  Production Edge Subdomain
                </span>
                <span className="font-mono text-xs font-bold text-black">
                  https://{subdomain}.launchly.site
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyCustomDomain}
                className="px-2 py-1 rounded-lg border border-black bg-white hover:bg-yellow font-mono text-[10px] font-bold text-black transition-colors cursor-pointer"
              >
                {copiedDomain ? '✓' : 'Copy'}
              </button>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  window.open(getWorkingUrl(), '_blank');
                }}
                className="w-full py-2.5 rounded-xl border-2 border-black bg-pink hover:bg-yellow font-display text-xs sm:text-sm font-black text-black shadow-[3px_3px_0px_#000] flex items-center justify-center gap-1.5 cursor-pointer transition-all"
              >
                <span>Visit Live Website Now</span>
                <ArrowUpRight size={15} className="stroke-[3]" />
              </button>
              
              <button
                type="button"
                onClick={handleCopyWorkingUrl}
                className="w-full py-2 rounded-xl border-2 border-black bg-white hover:bg-neutral-100 font-mono text-xs font-bold text-black shadow-xs cursor-pointer transition-colors"
              >
                {copied ? '✓ Live URL Copied!' : 'Copy Live URL'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
