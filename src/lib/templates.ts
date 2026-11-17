import type { Template, TemplateCategory } from '@/types';

export function calculateTemplateMetrics(template: Pick<Template, 'description' | 'pages' | 'features'>) {
  const content = [template.description, ...template.pages, ...template.features].join(' ').trim();
  const contentWords = content ? content.split(/\s+/).length : 0;
  const sectionCount = template.pages.length;

  return {
    contentWords,
    readingMinutes: Math.max(1, Math.ceil(contentWords / 200)),
    sectionCount,
    featuresPerSection: sectionCount ? Math.round((template.features.length / sectionCount) * 10) / 10 : 0,
  };
}

export const CATEGORIES: TemplateCategory[] = [
  'All',
  'SaaS',
  'AI',
  'Agency',
  'Portfolio',
  'Ecommerce',
  'Web3',
  'Media',
];

export const TEMPLATES: Template[] = [
  {
    id: 'fresh-crate',
    name: 'Fresh Crate',
    category: 'Ecommerce',
    description: 'A friendly neighborhood grocer for just-picked produce, pantry staples, and quick local delivery.',
    tags: ['ecommerce', 'grocery', 'organic', 'local delivery', 'fresh food'],
    badge: 'New',
    isPro: false,
    previewUrl: '/templates/fresh-crate',
    thumbnail: '/templates/fresh-crate.png',
    accent: '#3FA34D',
    bgColor: '#FFF8EC',
    textColor: '#1F2A1B',
    pages: ['Home', 'Shop', 'Product Details', 'Offers', 'Recipes', 'Recipe Detail', 'Blog', 'Blog Post', 'Cart', 'Checkout', 'Order Confirmation', 'Order Tracking', 'Account', 'Wishlist', 'About', 'Contact', 'FAQ', 'Delivery Areas', 'Privacy & Terms', '404'],
    features: [
      'Twenty purpose-built storefront pages',
      'Twelve seasonal grocery products',
      'Product variants and stock-aware shopping',
      'Searchable, filterable shop catalog',
      'One-off combo baskets and weekly offers',
      'Recipe index and recipe detail pages',
      'Editorial blog and article detail pages',
      'Persistent cart and demo checkout',
      'Order confirmation and tracking screens',
      'Wishlist and recently viewed products',
      'Local delivery areas and slot information',
      'Customer reviews and common questions',
      'Contact form and newsletter signup',
      'Responsive navigation and shared footer',
      'Per-page SEO titles and descriptions',
      'Warm, customizable market theme',
    ],
    rating: 4.9,
    reviewsCount: 126,
    topReview: { author: 'Maya R.', role: 'Neighborhood customer', comment: 'The greens arrive crisp, and choosing a delivery slot is refreshingly easy.' },
    products: [
      { name: 'Market Morning Crate', category: 'Seasonal crate', price: 1499, detail: 'A bright mix of farm-picked vegetables for the week.', variants: [{ id: 'regular', label: 'Regular crate', price: 1499, stock: 24 }, { id: 'family', label: 'Family crate', price: 1999, stock: 8 }] },
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
    description: 'A high-contrast drop shop for audio, gaming, and everyday technology, with product comparisons and setup bundles.',
    tags: ['ecommerce', 'electronics', 'gadgets', 'audio', 'gaming'],
    badge: 'New',
    isPro: false,
    previewUrl: '/templates/volt-gear',
    thumbnail: '/templates/volt-gear.png',
    accent: '#C6FF3D',
    bgColor: '#0B0D12',
    textColor: '#F5F7FA',
    pages: ['Home', 'Shop', 'Product Details', 'Compare', 'Deals', 'Bundles', 'Cart', 'Checkout', 'Order Confirmation', 'Order Tracking', 'Account', 'Wishlist', 'Support', 'Blog', 'Blog Post', 'About', 'Contact', 'Store Locator', 'Privacy & Terms', '404', 'Components'],
    features: [
      'Twenty-one purpose-built storefront pages',
      'Twelve sample technology products',
      'Variant selection with stock information',
      'Searchable, sortable shop catalog',
      'Product detail and comparison pages',
      'Limited-drop deals and promotions',
      'Build-your-setup bundle showcase',
      'Persistent cart and demo checkout',
      'Order confirmation and tracking screens',
      'Wishlist and recently viewed products',
      'Support, warranty, and FAQ information',
      'Editorial blog and article detail pages',
      'Store locator and partner information',
      'Customer reviews and newsletter signup',
      'Responsive navigation and shared footer',
      'Per-page SEO and complete component showcase',
    ],
    rating: 4.9,
    reviewsCount: 98,
    topReview: { author: 'Nico P.', role: 'Creator', comment: 'The comparison details helped me choose a dock that works with my displays.' },
    products: [
      { name: 'Pulse ANC Headphones', category: 'Audio', price: 12999, detail: 'Adaptive noise cancellation with 40-hour battery life.', variants: [{ id: 'graphite', label: 'Graphite', price: 12999, stock: 12 }, { id: 'lilac', label: 'Electric lilac', price: 13499, stock: 5 }] },
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
];

export const ALL_TEMPLATES: Template[] = [...TEMPLATES];

export const DEFAULT_TEMPLATE: Template = {
  id: 'blank',
  name: 'My Website',
  category: 'Blank',
  description: 'A blank website ready for your content and design.',
  tags: [],
  isPro: false,
  previewUrl: '/editor',
  thumbnail: '',
  accent: '#F4C542',
  bgColor: '#FFFFFF',
  textColor: '#171717',
  pages: ['Home'],
  features: [],
};

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
