import { Template, TemplateCategory } from '@/types';

// Category definitions with coming soon status
// Ecommerce is currently available; the remaining categories are marked as coming soon.
export const CATEGORIES: TemplateCategory[] = [
  'All',
  'SaaS',
  'AI',
  'Agency',
  'Portfolio',
  'Ecommerce',
  'Web3',
  'Media'
];

// Categories that display a coming soon message when selected.
export const COMING_SOON_CATEGORIES: TemplateCategory[] = [
  'SaaS',
  'AI',
  'Agency',
  'Web3',
  'Media'
];

// The ecommerce catalog is intentionally focused on these two complete starter stores.
export const TEMPLATES: Template[] = [
  {
    id: 'fresh-crate',
    name: 'Fresh Crate',
    category: 'Ecommerce',
    description: 'A friendly neighborhood grocer for just-picked produce, pantry staples, and quick local delivery. Browse seasonal crates, choose a delivery slot, and bring the farm closer to home.',
    tags: ['ecommerce', 'grocery', 'organic', 'local delivery', 'fresh food', 'farm to table'],
    badge: 'New',
    isPro: false,
    previewUrl: '/templates/fresh-crate',
    thumbnail: '/templates/fresh-crate.svg',
    accent: '#3FA34D',
    bgColor: '#FFF8EC',
    textColor: '#1F2A1B',
    pages: ['Home'],
    features: ['Single-page farm-to-door storefront starter', 'Twelve sample grocery products', 'Seasonal product grid with add-to-bag actions', 'Freshness and origin storytelling', 'Combo baskets and weekly offers', 'Delivery area and ordering information', 'Customer testimonials and common questions', 'Newsletter and contact sections', 'Responsive shared navigation and footer', 'Add and customize more pages in the editor'],
    rating: 4.9,
    reviewsCount: 126,
    products: [
      { name: 'Market Morning Crate', category: 'Seasonal crate', price: 1499, detail: 'A bright mix of farm-picked vegetables for the week.' },
      { name: 'Heirloom Tomato Box', category: 'Vegetables', price: 349, detail: 'Sun-ripened tomatoes from small partner farms.' },
      { name: 'Baby Spinach', category: 'Greens', price: 129, detail: 'Tender leaves washed and packed the same morning.' },
      { name: 'Rainbow Carrots', category: 'Vegetables', price: 179, detail: 'Sweet, colorful carrots with their greens attached.' },
      { name: 'Avocado Duo', category: 'Fruit', price: 219, detail: 'Creamy avocados selected for a ready-soon ripeness.' },
      { name: 'Strawberry Punnet', category: 'Fruit', price: 249, detail: 'Small-batch berries picked at peak sweetness.' },
      { name: 'Country Sourdough', category: 'Bakery', price: 189, detail: 'Slow-fermented loaf baked fresh before delivery.' },
      { name: 'Farmhouse Eggs', category: 'Dairy & eggs', price: 159, detail: 'A dozen free-range eggs from nearby farms.' },
      { name: 'Raw Forest Honey', category: 'Pantry', price: 399, detail: 'Unfiltered honey with a delicate floral finish.' },
      { name: 'Cold-Pressed Apple Juice', category: 'Drinks', price: 229, detail: 'Crisp orchard apples, pressed without added sugar.' },
      { name: 'Weekly Pantry Basket', category: 'Combo baskets', price: 1299, detail: 'Everyday staples paired with seasonal produce.' },
      { name: 'Green Goodness Bundle', category: 'Combo baskets', price: 899, detail: 'A generous bundle of greens, herbs, and citrus.' },
    ],
    sourceCodeAvailable: true,
    sourceCodeUrl: '/api/templates/fresh-crate/source',
    techStack: ['Next.js 16', 'Tailwind v4', 'TypeScript', 'Zustand'],
  },
  {
    id: 'volt-gear',
    name: 'Volt Gear',
    category: 'Ecommerce',
    description: 'A high-contrast drop shop for audio, gaming, and everyday technology. Compare detailed specs, build a setup bundle, and follow each limited release from launch to delivery.',
    tags: ['ecommerce', 'electronics', 'gadgets', 'audio', 'gaming', 'technology'],
    badge: 'New',
    isPro: false,
    previewUrl: '/templates/volt-gear',
    thumbnail: '/templates/volt-gear.svg',
    accent: '#C6FF3D',
    bgColor: '#0B0D12',
    textColor: '#F5F7FA',
    pages: ['Home'],
    features: ['Single-page drop-style ecommerce starter', 'Twelve sample technology products', 'High-contrast product grid with add-to-bag actions', 'Clear product specifications and categories', 'Limited-drop campaign storytelling', 'Setup bundle and comparison highlights', 'Customer reviews and support information', 'Newsletter and contact sections', 'Responsive shared navigation and footer', 'Add and customize more pages in the editor'],
    rating: 4.9,
    reviewsCount: 98,
    products: [
      { name: 'Pulse ANC Headphones', category: 'Audio', price: 12999, detail: 'Adaptive noise cancellation with 40-hour battery life.' },
      { name: 'Volt Mechanical Keyboard', category: 'Desk setup', price: 7499, detail: 'Hot-swappable switches in a compact aluminum frame.' },
      { name: 'Arc Wireless Mouse', category: 'Desk setup', price: 3999, detail: 'A low-latency sensor with a sculpted ergonomic shell.' },
      { name: 'Nova 27 Gaming Monitor', category: 'Displays', price: 28999, detail: 'QHD resolution, vivid color, and a smooth 165Hz panel.' },
      { name: 'Orbit Portable Speaker', category: 'Audio', price: 5999, detail: 'Room-filling sound in a rugged, travel-ready body.' },
      { name: 'Flux USB-C Dock', category: 'Accessories', price: 6499, detail: 'One cable for displays, power, storage, and peripherals.' },
      { name: 'Core 65W Charger', category: 'Power', price: 2499, detail: 'Compact GaN charging for laptops, phones, and tablets.' },
      { name: 'Echo Studio Microphone', category: 'Creator gear', price: 8999, detail: 'Clear USB audio with a tap-to-mute control.' },
      { name: 'Stride Fitness Watch', category: 'Wearables', price: 11999, detail: 'Training metrics, GPS, and a week of battery life.' },
      { name: 'Prism Smart Light Bar', category: 'Lighting', price: 3499, detail: 'A desk-ready light bar with adjustable color temperature.' },
      { name: 'Travel Tech Kit', category: 'Bundles', price: 9999, detail: 'A charger, cable set, and compact hub for the road.' },
      { name: 'Creator Desk Bundle', category: 'Bundles', price: 42999, detail: 'Keyboard, microphone, dock, and lighting for a clean setup.' },
    ],
    sourceCodeAvailable: true,
    sourceCodeUrl: '/api/templates/volt-gear/source',
    techStack: ['Next.js 16', 'Tailwind v4', 'TypeScript', 'Zustand'],
  },
  {
    id: 'kuro-craft',
    name: 'Kuro Studio',
    category: 'Portfolio',
    description: 'An editorial portfolio for creative technologists, product designers, and art directors. Showcase interactive case studies, design systems, client logs, and services with kinetic typography.',
    tags: ['portfolio', 'creative technologist', 'design systems', 'case studies', 'editorial', 'awards', 'minimalist'],
    badge: 'Awarded',
    isPro: false,
    previewUrl: '/templates/kuro-craft',
    thumbnail: '/templates/kuro-craft.svg',
    accent: '#00F0FF',
    bgColor: '#090A0F',
    textColor: '#F4F6FB',
    pages: ['Home', 'Work', 'About', 'Contact'],
    features: [
      'Kinetic editorial hero with real-time project availability badge',
      'Eight curated case studies with outcome metrics & system specs',
      'Interactive project filter by discipline (UI/UX, 3D, Creative Dev, AI)',
      'Selected client roster (Vercel, Linear, Raycast, Stripe alumni)',
      'Design systems & technical capabilities matrix',
      'Speaking engagements, press features, and recognition timeline',
      'Interactive client inquiry card with scope & budget selectors',
      'Zero-friction production export in Next.js 16 + React 19',
    ],
    rating: 5.0,
    reviewsCount: 142,
    products: [
      { name: 'Vortex Design System', category: 'Design systems', price: 0, detail: 'Multi-brand tokenized UI architecture powering 14 core cloud applications.' },
      { name: 'Chronos Spatial Audio', category: 'Creative Dev', price: 0, detail: '3D WebGL soundstage visualizer with sub-10ms browser audio rendering.' },
      { name: 'Aether AI Studio', category: 'UI/UX & Product', price: 0, detail: 'Generative canvas interface with node-based prompt graphs and real-time outputs.' },
      { name: 'Lumina Editorial', category: 'Art Direction', price: 0, detail: 'Digital exhibition identity with fluid typographic scrollytelling and custom shaders.' },
      { name: 'Prism FinTech Mobile', category: 'Mobile Product', price: 0, detail: 'Tactile wealth management app with zero-latency biometric authorization.' },
      { name: 'Helix 3D Configurator', category: 'Creative Dev', price: 0, detail: 'Photorealistic browser asset visualizer built with Three.js and GLSL compute.' },
      { name: 'Kinesis Health Brand', category: 'Identity & Motion', price: 0, detail: 'Complete sonic and visual design language for a preventive health diagnostic platform.' },
      { name: 'Echo Studio Website', category: 'UI/UX & Product', price: 0, detail: 'Brutalist agency showcase featuring micro-interactions and kinetic page transitions.' },
    ],
    sourceCodeAvailable: true,
    sourceCodeUrl: '/api/templates/kuro-craft/source',
    techStack: ['Next.js 16', 'Tailwind v4', 'Framer Motion', 'TypeScript'],
  },
];

export const ALL_TEMPLATES: Template[] = [...TEMPLATES];

export function getTemplatesByCategory(category: string): Template[] {
  if (category === 'All') return TEMPLATES;
  return TEMPLATES.filter((t: Template) => t.category.toLowerCase() === category.toLowerCase());
}

export function searchTemplates(query: string): Template[] {
  const q = query.toLowerCase();
  return TEMPLATES.filter(
    (t: Template) =>
      t.name.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q) ||
      t.tags.some((tag) => tag.toLowerCase().includes(q))
  );
}

export function getTemplateById(id: string): Template | undefined {
  return ALL_TEMPLATES.find((t) => t.id === id);
}
