import { makeSection, type Section } from '@/lib/siteDocument';

type StoreProduct = { name: string; category: string; price: number; detail: string };
export type StorefrontPageSeed = { id: string; slug: string; title: string; description: string; isHome: boolean; showInMenu: boolean; seoTitle: string; noindex: boolean; sections: Section[] };

const freshCopy: Record<string, { title: string; description: string; detail: string }> = {
  home: { title: 'Good food starts close to home.', description: 'Seasonal produce, pantry favorites, and honest food from farms that are part of your neighborhood.', detail: 'Picked nearby. Packed with care. At your door when it suits you.' },
  shop: { title: 'Shop this week’s harvest', description: 'Browse produce picked for flavor, freshness, and the season we are in.', detail: 'Choose a crate, add your staples, then select a delivery window at checkout.' },
  'product-details': { title: 'Meet the Market Morning Crate', description: 'A colorful, flexible box of farm-picked vegetables for easy meals all week.', detail: 'Every crate is packed to order. Swap an item you do not need and add a note for your picker.' },
  offers: { title: 'Good things, gathered together', description: 'Seasonal bundles and smart weekly picks make it easier to fill the kitchen.', detail: 'Bundle pricing is shown upfront. No membership or recurring order required.' },
  recipes: { title: 'Recipes for what is in season', description: 'Simple, flexible ideas that start with what the farms are harvesting now.', detail: 'Each recipe includes a short ingredient list and an option to add the whole basket.' },
  'recipe-detail': { title: 'A bright bowl for busy evenings', description: 'A flexible seasonal recipe built around greens, tomatoes, grains, and a lemony dressing.', detail: 'Prep in 15 minutes, cook in 20, and make the dressing ahead for an even quicker dinner.' },
  blog: { title: 'Notes from the neighborhood', description: 'Meet the growers, learn what is in season, and find small ways to waste less food.', detail: 'Practical stories from the people who grow, pack, and cook with your weekly crate.' },
  'blog-post': { title: 'Why the best produce follows the seasons', description: 'A field note on choosing ingredients at their natural peak and making them go further.', detail: 'Seasonal buying connects your table with local growing rhythms and helps reduce long-distance storage.' },
  cart: { title: 'Your crate', description: 'Review your picks before choosing a delivery window.', detail: 'You can adjust quantities or keep browsing before you check out.' },
  checkout: { title: 'A fresh delivery is nearly yours', description: 'Add your delivery details and choose a time that works for your home.', detail: 'We will confirm your order and delivery window before anything is charged.' },
  'order-confirmation': { title: 'Your order is in good hands', description: 'Thanks for choosing local. We are getting your fresh picks ready.', detail: 'Keep your confirmation handy. We will send a packing and delivery update next.' },
  'order-tracking': { title: 'Follow your crate home', description: 'See the simple steps between farm harvest and your front door.', detail: 'Tracking updates appear as your order is packed, dispatched, and delivered.' },
  account: { title: 'Your kitchen, your preferences', description: 'Keep delivery details, saved addresses, and favorite staples together.', detail: 'A local demo account page is ready to customize for your store.' },
  wishlist: { title: 'Your saved market list', description: 'Keep seasonal finds and everyday favorites close for next time.', detail: 'Saved items stay here while you plan your next crate.' },
  about: { title: 'A shorter journey from field to table', description: 'Fresh Crate connects nearby growers with households looking for food with a clear origin.', detail: 'We work with small farms, bakeries, and makers who care about healthy soil and careful handling.' },
  contact: { title: 'Talk to a real person', description: 'Need help with a crate, an ingredient, or a delivery? Send us a note.', detail: 'Our neighborhood team usually replies within one working day.' },
  faq: { title: 'Good questions, clear answers', description: 'Learn how ordering, delivery, substitutions, and seasonal availability work.', detail: 'If you need help with a specific order, the contact page is always open.' },
  'delivery-areas': { title: 'Freshness, close to home', description: 'Check whether your neighborhood is inside our current delivery area.', detail: 'We add nearby routes as local farms and packing partners come on board.' },
  'privacy-terms': { title: 'Clear terms for a thoughtful service', description: 'How we handle account details, order information, and delivery preferences.', detail: 'This starter page is sample policy copy. Replace it with reviewed terms for your business.' },
  '404': { title: 'We could not find that page', description: 'The market may have moved this link. Let us get you back to something fresh.', detail: 'Return home or browse the current harvest.' },
};

const voltCopy: Record<string, { title: string; description: string; detail: string }> = {
  home: { title: 'Gear that earns its place.', description: 'Tested essentials for sharper setups, smoother sessions, and better everyday work.', detail: 'Honest specs. Clear comparisons. Drops worth setting a reminder for.' },
  shop: { title: 'Find your next essential', description: 'Browse audio, desk gear, displays, and accessories by the details that matter.', detail: 'Compare performance and fit before you add a product to your setup.' },
  'product-details': { title: 'Pulse ANC Headphones', description: 'Focused listening with adaptive noise control, balanced sound, and all-day comfort.', detail: 'Choose your finish, review the specifications, and check stock before ordering.' },
  compare: { title: 'Compare the details', description: 'Put the specs side by side and choose the gear that fits your setup.', detail: 'Start with battery life, connection type, dimensions, and the features you will actually use.' },
  deals: { title: 'Current drops and sharp deals', description: 'Limited releases and considered bundles, with clear prices and stock notes.', detail: 'Drop windows and stock are sample content in this template.' },
  bundles: { title: 'Build a setup that works together', description: 'Pair the essentials for a desk, studio, or travel kit in one considered bundle.', detail: 'Choose a starting point, then swap pieces to fit your workflow.' },
  cart: { title: 'Your gear bag', description: 'Review your selected gear before you move to checkout.', detail: 'You can update quantities or return to the shop without losing your list.' },
  checkout: { title: 'Secure your setup', description: 'Add delivery details and review your order before placing it.', detail: 'This template demonstrates a checkout flow. Connect a payment provider before taking payments.' },
  'order-confirmation': { title: 'Order received. Nice choice.', description: 'Your order summary and next steps will appear here after checkout.', detail: 'We will share dispatch and delivery updates as soon as your order moves.' },
  'order-tracking': { title: 'Track your delivery', description: 'Follow your order from confirmation to your setup.', detail: 'Tracking events update as the parcel is prepared, shipped, and delivered.' },
  account: { title: 'Your Launchpad', description: 'Keep your orders, saved gear, and account details in one place.', detail: 'This sample dashboard is ready to connect to your customer account system.' },
  wishlist: { title: 'Saved for your next setup', description: 'Keep interesting gear here while you compare and plan.', detail: 'Saved items make it easy to revisit a drop before it closes.' },
  support: { title: 'Help from people who know the gear', description: 'Get setup advice, warranty guidance, or a hand with an order.', detail: 'Share your model and order number so our support team can get straight to it.' },
  blog: { title: 'Signal / Notes', description: 'Guides, setup ideas, and practical explainers from the Volt Gear team.', detail: 'Read the details behind new releases and learn how to get more from your kit.' },
  'blog-post': { title: 'Build a cleaner desk setup', description: 'A practical guide to choosing a dock, display, and input devices that work together.', detail: 'Start with your daily workflow, then choose the ports, refresh rate, and ergonomics you need.' },
  about: { title: 'Technology should feel useful', description: 'Volt Gear curates everyday electronics around thoughtful design and clear performance.', detail: 'We test the details, explain the tradeoffs, and keep the product story straightforward.' },
  contact: { title: 'Get in touch with Volt Gear', description: 'Questions about a product, an order, or a compatible setup? Send us a message.', detail: 'Include the product name and your device model for the quickest answer.' },
  'store-locator': { title: 'Try the setup in person', description: 'Find a demo partner or pickup point near you.', detail: 'Store locations are sample content; add your verified retail partners before publishing.' },
  'privacy-terms': { title: 'Your information, handled clearly', description: 'Review how account, order, and support information is used.', detail: 'This starter policy page needs your business-specific legal review before launch.' },
  '404': { title: 'Signal lost', description: 'That page is no longer available. Let’s get you back to the latest gear.', detail: 'Return home or browse the current collection.' },
  components: { title: 'The Volt Gear component bench', description: 'A style guide for the store’s cards, badges, specs, and interaction patterns.', detail: 'Use these components consistently across product, support, and editorial pages.' },
};

const kuroCopy: Record<string, { title: string; description: string; detail: string }> = {
  home: { title: 'Designing interfaces that redefine utility.', description: 'Multi-disciplinary design director & creative technologist partnering with high-velocity venture teams to build iconic software.', detail: 'Available for select advisory and execution roles in Q1/Q2 2026. Based between San Francisco and Tokyo.' },
  work: { title: 'Selected Works & Case Studies', description: 'A curated index of production design systems, WebGL experiments, and software products shipped over the past 6 years.', detail: 'Every project highlights the core challenge, system architecture, and measurable user or business outcomes.' },
  about: { title: 'At the intersection of design rigor and engineering precision.', description: 'Ten years spent crafting systems, leading design chapters, and turning complex technology into intuitive human tools.', detail: 'Alumni of Vercel and Linear design networks. Occasional writer on spatial computing and micro-interactions.' },
  contact: { title: 'Initiate a Project Conversation', description: 'Accepting inquiries for new ventures, design systems overhauls, and executive product design advisory.', detail: 'Please include your estimated timeline, team stage, and project scope for a prompt reply within 24 hours.' },
  'privacy-terms': { title: 'Archive Colophon & Rights', description: 'Crafted with Next.js 16, Tailwind CSS v4, and Space Grotesk. Typeset with care.', detail: 'All trademarks, logos, and brand assets referenced belong to their respective client copyright holders.' },
  '404': { title: 'Coordinate Not Found', description: 'The requested archive entry does not exist or has been relocated to private storage.', detail: 'Return to the portfolio home or view selected case studies.' },
};

const freshRecipes = [
  { title: 'Green market bowl', description: 'Spinach, tomatoes, grains, lemon, and a handful of toasted seeds.', price: '25 min · Easy' },
  { title: 'Carrot and herb fritters', description: 'Rainbow carrots, fresh herbs, yogurt, and a crisp pan-fried finish.', price: '35 min · Family favorite' },
  { title: 'Strawberry breakfast toast', description: 'Country sourdough, ripe berries, and whipped honey ricotta.', price: '10 min · No fuss' },
];
const voltArticles = [
  { title: 'The practical guide to USB-C docks', description: 'Check display bandwidth, charging, ports, and compatibility before buying.', price: '6 min read' },
  { title: 'Mechanical switches, explained', description: 'A clear guide to sound, travel, actuation, and hot-swap boards.', price: '8 min read' },
  { title: 'Set up a better video call', description: 'A microphone, light, and camera setup that stays simple and reliable.', price: '5 min read' },
];
const kuroAccolades = [
  { title: 'The Architecture of Micro-Interactions', description: 'Designing stateful transitions in React 19 without layout thrashing.', price: 'Essays · 8 min' },
  { title: 'Why Design Tokens Are Core Infrastructure', description: 'How unified tokens allowed 14 distributed teams to ship in 1 click.', price: 'Systems · 12 min' },
  { title: 'Spatial Interfaces in the Browser', description: 'Real-time WebGL depth buffers and hardware-accelerated soundstages.', price: 'Creative Tech · 6 min' },
];

function section(id: string, type: string, name: string, content: Record<string, unknown>): Section {
  return makeSection(type, id, name, {}, content);
}

function pageSections(id: string, title: string, description: string, detail: string, products: StoreProduct[], templateId: string): Section[] {
  const isFresh = templateId === 'fresh-crate';
  const isKuro = templateId === 'kuro-craft';
  const items = isFresh ? freshRecipes : isKuro ? kuroAccolades : voltArticles;
  const collection = products.slice(0, 6).map((product) => ({ title: product.name, name: product.name, description: product.detail, category: product.category, price: isKuro ? 'Case study' : `₹${product.price.toLocaleString('en-IN')}`, src: '', alt: product.name }));
  const contentSections: Section[] = [];
  if (id === 'home') {
    contentSections.push(
      section('home-announcement', 'announcement', isFresh ? 'A note from the market' : isKuro ? 'Availability status' : 'The next drop is almost here', { text: isFresh ? 'Order by Thursday for a weekend delivery slot.' : isKuro ? '🟢 Available for Q1/Q2 select venture projects & advisory.' : 'Join the list for early access to the next limited drop.', linkLabel: isFresh ? 'See delivery areas' : isKuro ? 'Initiate conversation' : 'Explore the drop' }),
      section('home-categories', 'category-tiles', isFresh ? 'Shop by the market' : isKuro ? 'Core disciplines' : 'Explore the lineup', { heading: isFresh ? 'Something good for every table' : isKuro ? 'Disciplines & Capabilities' : 'Find your corner of the setup', items: isKuro ? [{ title: 'Design Systems', description: 'Multi-brand token architectures and component engineering.' }, { title: 'Product & UI/UX', description: 'High-density web applications, mobile platforms, and workflows.' }, { title: 'Creative Dev & 3D', description: 'Interactive WebGL, fluid shaders, and kinetic micro-interactions.' }, { title: 'AI Canvas Interfaces', description: 'Node-based generative tools and ergonomic AI prompt graphs.' }] : [...new Set(products.map((product) => product.category))].slice(0, 4).map((category) => ({ title: category, description: isFresh ? `Seasonal ${category.toLowerCase()} chosen for this week.` : `Explore tested ${category.toLowerCase()} for your setup.` })) }),
      section('home-best-sellers', 'product-grid', isFresh ? 'Best of this week' : isKuro ? 'Selected works' : 'Featured gear', { heading: isFresh ? 'A fresh place to start' : isKuro ? 'Selected Works & Case Studies' : 'Gear worth a closer look', description: detail, items: collection.slice(0, 4) }),
      section('home-how-it-works', 'steps', isFresh ? 'From farm to front door' : isKuro ? 'Guiding principles' : 'Choose, compare, make it yours', { heading: isFresh ? 'Your market in three easy steps' : isKuro ? 'Principles & Philosophy' : 'A better way to build your setup', items: isFresh ? [{ title: 'Pick your crate', desc: 'Start with seasonal produce and add the staples you love.' }, { title: 'Choose a delivery slot', desc: 'Select a local delivery window that fits your week.' }, { title: 'Enjoy what is fresh', desc: 'We pack close to delivery and bring your order to the door.' }] : isKuro ? [{ title: '01 / Systems-First Rigor', desc: 'Interfaces built on mathematical type scales, robust tokens, and durable components.' }, { title: '02 / Kinetic Micro-Craft', desc: 'Every hover, scroll, and drag state communicates purpose and reduces cognitive load.' }, { title: '03 / Code as Design Medium', desc: 'Prototyping directly in Next.js, WebGL, and Tailwind to eliminate design-dev handoff lag.' }] : [{ title: 'Start with a need', desc: 'Choose audio, desk gear, display, or a small upgrade.' }, { title: 'Compare the specs', desc: 'Check compatibility and the features you will use.' }, { title: 'Build your setup', desc: 'Add the right pieces and follow the next drop.' }] }),
      section('home-story', 'image-text', isFresh ? 'A shorter route to good food' : isKuro ? 'Studio profile' : 'Small details make a better setup', { heading: isFresh ? 'Grown nearby, packed with care' : isKuro ? 'At the intersection of design rigor and engineering precision' : 'Curated for everyday performance', body: isFresh ? 'We partner with nearby farms, makers, and bakers to bring seasonal food to your table with fewer steps and a clear sense of where it came from.' : isKuro ? 'With over a decade leading product design chapters at hyper-growth venture startups, Kuro Studio partners directly with founders and product leads to craft software that defines categories.' : 'We focus on gear that earns its place: tested basics, useful specifications, and honest guidance for a setup that works better every day.', image: '' }),
    );
    if (isFresh || isKuro) contentSections.push(section('home-recipes', 'gallery', isFresh ? 'Recipes from the market' : 'Writing & Essays', { heading: isFresh ? 'A few ideas for the week' : 'Recent Essays & Dispatches', description: isFresh ? 'Flexible recipes built around the ingredients arriving now.' : 'Thoughts on interface craftsmanship, systems architecture, and spatial computing.', items: isFresh ? freshRecipes : kuroAccolades }));
    if (!isKuro) contentSections.push(section('home-local-check', 'delivery-checker', isFresh ? 'Check your delivery area' : 'Check your local stock', { heading: isFresh ? 'Is your neighborhood on our route?' : 'Find a nearby demo partner', description: isFresh ? 'Enter your postal code at checkout to see available routes and delivery windows.' : 'Contact the team with your location and we will help you find a place to try the gear.' }));
  } else if (id === 'shop' || id === 'offers' || id === 'deals' || id === 'work' || id === 'product-details') {
    contentSections.push(section(`${id}-collection`, 'product-grid', isKuro ? 'Archive of Works' : id === 'offers' || id === 'deals' ? 'Featured picks' : 'Shop the collection', { heading: id === 'product-details' ? title : isKuro ? 'Case Studies & Production Releases' : 'Chosen for this week', description: detail, items: id === 'product-details' ? collection.concat(products.slice(6).map((product) => ({ title: product.name, name: product.name, description: product.detail, category: product.category, price: isKuro ? 'Case study' : `₹${product.price.toLocaleString('en-IN')}`, src: '', alt: product.name }))) : id === 'offers' || id === 'deals' ? collection.slice(-3).concat(collection.slice(0, 3)) : collection }));
  } else if (id === 'recipes' || id === 'blog') {
    contentSections.push(section(`${id}-stories`, 'gallery', isFresh ? 'From the market kitchen' : 'Field notes and guides', { heading: isFresh ? 'Cook with what is in season' : 'Read the latest notes', description: detail, items }));
  } else if (id === 'recipe-detail' || id === 'blog-post') {
    contentSections.push(section(`${id}-article`, 'rich-text', isFresh ? 'Make it your own' : 'Start with your setup', { heading: isFresh ? 'A little prep goes a long way' : 'The details that matter', body: `${detail}\n\n${description}\n\n${isFresh ? 'Wash and prepare the ingredients, keep the dressing separate, and finish with fresh herbs just before serving.' : 'Check compatibility with your current devices, leave room for future upgrades, and choose the features that support your daily workflow.'}` }));
  } else if (id === 'faq' || id === 'support') {
    contentSections.push(section(`${id}-answers`, 'faq', isFresh ? 'Ordering, answered' : 'Support, answered', { heading: 'Frequently asked questions', items: isFresh ? [{ question: 'When are orders packed?', answer: 'We pack orders close to delivery so produce spends less time in storage.' }, { question: 'Can I change a crate?', answer: 'Yes. Swap an item or add a note before the order cutoff shown at checkout.' }, { question: 'What if something is missing?', answer: 'Send our team your order number and we will make it right.' }] : [{ question: 'How do I check compatibility?', answer: 'Compare the listed ports, operating systems, and power requirements with your devices.' }, { question: 'How do I start a warranty request?', answer: 'Send the product model and order number through the support form.' }, { question: 'Can I update an order?', answer: 'Contact support as soon as possible and include the order reference.' }] }));
  } else if (id === 'contact') {
    contentSections.push(section(`${id}-form`, 'contact', 'Send us a note', { heading: isKuro ? 'Let’s build something enduring' : 'How can we help?', description, submitLabel: isKuro ? 'Transmit inquiry' : 'Send message', successMessage: isKuro ? 'Inquiry received. We will respond within 24 hours.' : 'Thanks — your message is on its way.' }));
  } else if (id === 'delivery-areas' || id === 'store-locator') {
    contentSections.push(section(`${id}-locations`, 'rich-text', isFresh ? 'Check your delivery route' : 'Demo and pickup partners', { heading: isFresh ? 'Growing our local routes' : 'Find a local demo', body: isFresh ? 'Enter your postal code at checkout to see available delivery windows. We currently serve neighborhoods within our farm partners’ daily routes and add new areas as capacity grows.' : 'Visit a demo partner to try products in person. Contact our team before traveling to confirm stock and opening hours.' }));
  } else if (id === 'components') {
    contentSections.push(section(`${id}-patterns`, 'features', 'Reusable patterns', { heading: 'A consistent system', items: [{ title: 'Product cards', desc: 'Price, availability, and a direct action in one scan.' }, { title: 'Spec chips', desc: 'Compact facts that help shoppers compare.' }, { title: 'Deal badges', desc: 'Use clear labels for limited stock and promotions.' }] }));
  } else if (id === '404') {
    contentSections.push(section(`${id}-home`, 'not-found', 'Back to the archive', { heading: 'Nothing at this coordinate', description: 'The page might have moved, but the archive is ready to explore.', buttonText: 'Back home' }));
  } else if (id === 'privacy-terms') {
    contentSections.push(section(`${id}-policy`, 'rich-text', 'Colophon & Terms', { heading: 'Colophon & Project Rights', body: 'All case studies, screenshots, and visual designs remain the intellectual property of Kuro Studio and referenced client partners. Engineered on Next.js 16 with zero tracking or telemetry cookies.' }));
  } else if (id === 'about') {
    contentSections.push(section(`${id}-story`, 'image-text', isFresh ? 'Good food, grown nearby' : isKuro ? 'Design Philosophy' : 'Useful technology, chosen carefully', { heading: isFresh ? 'A neighborhood market with a shorter route' : isKuro ? 'High-density design engineered for scale' : 'A smaller, better-curated gear shelf', body: description, image: '' }));
  } else {
    contentSections.push(section(`${id}-highlights`, 'features', 'A few details to know', { heading: 'Made to make the next step simple', items: [{ title: isFresh ? 'Picked with care' : 'Specs you can compare', desc: detail }, { title: 'Clear choices', desc: 'Helpful information is easy to find before you decide.' }, { title: 'Support when you need it', desc: 'Reach the team with a specific question and get a useful answer.' }] }));
  }

  const announcement = id === 'home' ? contentSections.filter((entry) => entry.type === 'announcement') : [];
  const base = [
    ...announcement,
    section(`${id}-hero`, 'hero', title, { badge: isFresh ? 'FRESH CRATE / LOCAL MARKET' : isKuro ? 'KURO STUDIO / CREATIVE ARCHIVE' : 'VOLT GEAR / FIELD TESTED', title, heading: title, description, ctaPrimary: id === '404' ? 'Go to home' : isFresh ? 'Shop the harvest' : isKuro ? 'Explore Works' : 'Browse the drop', ctaSecondary: isFresh ? 'How delivery works' : isKuro ? 'Read About' : 'Compare gear' }),
    ...contentSections.filter((entry) => entry.type !== 'announcement'),
  ];
  const transactionalPages = new Set(['cart', 'checkout', 'order-confirmation', 'order-tracking', 'account', 'wishlist', 'compare', 'bundles', 'components', 'privacy-terms', '404']);
  if (transactionalPages.has(id)) return base;
  const proof = section(`${id}-proof`, 'testimonials', isFresh ? 'Good food travels by word of mouth' : isKuro ? 'Recognition & Endorsements' : 'From people who use the gear', { heading: isFresh ? 'Notes from local tables' : isKuro ? 'Endorsements from engineering leaders' : 'Setup feedback', items: isFresh ? [{ quote: 'The greens arrive crisp, and choosing a delivery slot is refreshingly easy.', name: 'Maya R.', role: 'Weekly customer' }, { quote: 'I like knowing which farm packed our crate. The seasonal swaps keep dinner interesting.', name: 'Aarav K.', role: 'Neighborhood customer' }] : isKuro ? [{ quote: 'One of the sharpest interface designers in the entire ecosystem. The design system paid for itself in month one.', name: 'Guillermo R.', role: 'CEO at Vercel alumni' }, { quote: 'Turned our fragmented UI into a unified, award-winning application in under six weeks.', name: 'Elena V.', role: 'VP of Product at Linear partner' }] : [{ quote: 'The comparison details helped me choose a dock that actually works with my displays.', name: 'Nico P.', role: 'Creator' }, { quote: 'A focused collection with enough detail to buy confidently.', name: 'Sam T.', role: 'Customer' }] });
  const faq = section(`${id}-faq`, 'faq', 'Before you decide', { heading: isKuro ? 'Common Questions Regarding Engagements' : isFresh ? 'A few market questions' : 'A few gear questions', items: isKuro ? [{ question: 'What is your typical project scope?', answer: 'Most engagements span 4 to 12 weeks, focusing on end-to-end design systems, core product redesigns, or high-impact marketing launches.' }, { question: 'Do you write production code?', answer: 'Yes. We build directly in Next.js, TypeScript, Tailwind CSS, and WebGL to ensure 100% design fidelity without handoff friction.' }, { question: 'How do we get started?', answer: 'Submit an inquiry through the contact form with your timeline and scope to arrange an introductory briefing call.' }] : [{ question: isFresh ? 'Can I change my order?' : 'How do I check compatibility?', answer: isFresh ? 'Yes, make updates before the order cutoff listed for your delivery.' : 'Review the specifications and contact support with your device model if you need help.' }, { question: 'How can I get help?', answer: 'Use the contact page and share the details of what you are trying to do.' }] });
  const newsletter = section(`${id}-newsletter`, 'newsletter', 'Keep in the loop', { heading: isKuro ? 'Kuro Studio Dispatch' : isFresh ? 'A little good news from the market' : 'Get the next drop note', description: isKuro ? 'Occasional essays on interface engineering, typography, and design systems. Zero spam.' : isFresh ? 'Seasonal picks, recipes, and delivery updates in one occasional email.' : 'New releases, useful guides, and limited drop reminders. No noise.', submitLabel: isKuro ? 'Subscribe to Dispatch' : 'Sign me up', successMessage: 'You are on the list.' });
  const cta = section(`${id}-cta`, 'cta', 'Ready for the next step?', { title: isKuro ? 'Have an ambitious project in mind?' : isFresh ? 'Bring the market closer.' : 'Build a setup that fits.', desc: isKuro ? 'Let’s discuss your vision, system architecture, and launch timeline.' : isFresh ? 'Choose what looks good and we will take care of the short journey home.' : 'Browse the latest gear and compare the details that matter to you.', buttonText: isKuro ? 'Initiate Project Conversation →' : isFresh ? 'Shop this week' : 'Explore the drop' });
  if (id === 'home') return [...base, ...contentSections.filter((entry) => entry.type === 'features' || entry.type === 'testimonials'), proof, faq, newsletter, cta];
  if (['contact', 'faq', 'support', 'delivery-areas', 'store-locator', 'about'].includes(id)) return [...base, faq, cta];
  if (['shop', 'offers', 'deals', 'recipes', 'blog', 'work'].includes(id)) return [...base, newsletter];
  return base;
}

export function createStorefrontPages(templateId: string, pageNames: string[], products: StoreProduct[] = []): StorefrontPageSeed[] {
  const isFresh = templateId === 'fresh-crate';
  const isKuro = templateId === 'kuro-craft';
  const copy = isFresh ? freshCopy : isKuro ? kuroCopy : voltCopy;
  const brandName = isFresh ? 'Fresh Crate' : isKuro ? 'Kuro Studio' : 'Volt Gear';
  const pages = pageNames.map((title, index) => {
    const id = index === 0 ? 'home' : title.toLowerCase().replace(/&/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const pageCopy = copy[id] || { title, description: `Explore ${title.toLowerCase()} at ${brandName}.`, detail: 'Helpful details, clear next steps, and support when you need it.' };
    return {
      id, slug: id === 'home' ? '/' : `/${id}`, title: pageCopy.title, description: pageCopy.description,
      isHome: id === 'home', showInMenu: !['home', 'product-details', 'recipe-detail', 'blog-post', 'cart', 'checkout', 'order-confirmation', 'order-tracking', 'account', 'wishlist', 'compare', 'bundles', 'components', '404', 'privacy-terms'].includes(id),
      seoTitle: `${pageCopy.title} | ${brandName}`, noindex: id === '404',
      sections: id === 'home'
        ? [section('home-navigation', 'nav', 'Header navigation', { cta: isKuro ? 'Get in touch' : isFresh ? 'Shop the harvest' : 'Shop the drop' }), ...pageSections(id, pageCopy.title, pageCopy.description, pageCopy.detail, products, templateId), section('home-footer', 'footer', 'Store footer', { copyright: `© ${brandName}`, links: isKuro ? ['Work', 'About', 'Contact', 'Colophon'] : ['Shop', 'About', 'Contact', 'Privacy & Terms'] })]
        : pageSections(id, pageCopy.title, pageCopy.description, pageCopy.detail, products, templateId),
    };
  });
  return pages;
}
