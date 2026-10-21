'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  ArrowUpRight,
  Monitor, 
  Tablet, 
  Smartphone, 
  Sparkles, 
  ArrowRight,
  CheckCircle2,
  Share2,
  Download,
  Check,
  RefreshCw,
  Palette,
  Lock,
  X,
} from 'lucide-react';
import { getTemplateById } from '@/lib/templates';
import { notFound } from 'next/navigation';
import PaymentModal from '@/components/PaymentModal';

const COLOR_PALETTES = [
  { name: 'Original', color: '' },
  { name: 'Orange', color: '#FF5500' },
  { name: 'Indigo', color: '#6366F1' },
  { name: 'Sunset', color: '#FF7733' },
  { name: 'Emerald', color: '#10B981' },
];

function PreviewProductArt({ templateId, fresh, index }: { templateId?: string; fresh: boolean; index: number }) {
  if (templateId === 'kuro-craft') {
    const accents = ['#00F0FF', '#7000FF', '#00FF66', '#FF0055', '#F59E0B', '#3B82F6'];
    const accent = accents[index % accents.length];
    return (
      <svg viewBox="0 0 480 320" aria-hidden="true" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id={`preview-art-kuro-${index}`} x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#0B0E14" />
            <stop offset="1" stopColor="#151D2C" />
          </linearGradient>
        </defs>
        <rect width="480" height="320" fill={`url(#preview-art-kuro-${index})`} />
        <circle cx="390" cy="55" r="90" fill={accent} opacity="0.16" />
        <path d="M 0 80 L 480 80 M 0 160 L 480 160 M 0 240 L 480 240 M 120 0 L 120 320 M 240 0 L 240 320 M 360 0 L 360 320" stroke="#FFFFFF" strokeOpacity="0.04" strokeWidth="1" />
        <g transform="translate(60, 45)">
          <rect width="360" height="230" rx="16" fill="#0C111C" stroke={accent} strokeWidth="2" strokeOpacity="0.6" />
          <rect x="24" y="24" width="130" height="18" rx="6" fill={accent} opacity="0.25" />
          <rect x="24" y="52" width="220" height="10" rx="4" fill="#FFFFFF" opacity="0.1" />
          <rect x="24" y="68" width="160" height="10" rx="4" fill="#FFFFFF" opacity="0.07" />
          <path d="M 24 130 Q 110 80, 190 140 T 330 110" fill="none" stroke={accent} strokeWidth="4" strokeLinecap="round" />
          <circle cx="190" cy="140" r="6" fill={accent} />
          <circle cx="190" cy="140" r="14" fill={accent} opacity="0.2" />
          <rect x="24" y="175" width="85" height="26" rx="6" fill="#1E293B" />
          <rect x="120" y="175" width="95" height="26" rx="6" fill="#1E293B" />
          <rect x="225" y="175" width="85" height="26" rx="6" fill="#1E293B" />
        </g>
      </svg>
    );
  }
  const accent = fresh ? ['#3FA34D', '#E76F51', '#F4A93B'][index % 3] : ['#C6FF3D', '#7C5CFF', '#40D9E8'][index % 3];
  return <svg viewBox="0 0 480 320" aria-hidden="true" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
    <defs><linearGradient id={`preview-art-${fresh ? 'fresh' : 'volt'}-${index}`} x1="0" y1="0" x2="1" y2="1"><stop stopColor={fresh ? '#FFF8EC' : '#252C3B'}/><stop offset="1" stopColor={fresh ? '#DCEBD4' : '#11141C'}/></linearGradient></defs>
    <rect width="480" height="320" fill={`url(#preview-art-${fresh ? 'fresh' : 'volt'}-${index})`}/><circle cx="390" cy="55" r="90" fill={accent} opacity=".15"/>
    {fresh ? <g><path d="M112 135h256l-24 142H136z" fill="#C3874D"/><path d="M130 158h220M136 205h208M143 251h194" stroke="#8F5C36" strokeWidth="10"/><path d="M155 141c-4-72 51-88 68-25 22-80 83-77 91-5 39-57 84-30 71 30" fill="none" stroke={accent} strokeWidth="15" strokeLinecap="round"/><circle cx="177" cy="165" r="31" fill="#E76F51"/><circle cx="238" cy="155" r="29" fill="#F4A93B"/><circle cx="297" cy="169" r="32" fill="#89B85D"/><circle cx="211" cy="209" r="27" fill="#D84D42"/><circle cx="275" cy="216" r="29" fill="#F2BC47"/></g> : <g><path d="M156 196v-48c0-85 36-124 84-124s84 39 84 124v48" fill="none" stroke={accent} strokeWidth="19" strokeLinecap="round"/><rect x="123" y="166" width="62" height="94" rx="24" fill="#30384A" stroke={accent} strokeWidth="7"/><rect x="295" y="166" width="62" height="94" rx="24" fill="#30384A" stroke={accent} strokeWidth="7"/><path d="M181 277h118" stroke="#8993A7" strokeWidth="8" strokeLinecap="round"/></g>}
  </svg>;
}

export default function TemplatePreviewPage({ 
  params 
}: { 
  params: Promise<{ templateId: string }> 
}) {
  const { templateId } = use(params);
  const template = getTemplateById(templateId);

  if (!template) {
    notFound();
  }

  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [copied, setCopied] = useState(false);
  const [activePalette, setActivePalette] = useState(0);
  const [activeSection, setActiveSection] = useState(template.pages[0]?.toLowerCase() || 'overview');
  const [showExportModal, setShowExportModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [cartCount, setCartCount] = useState(0);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [orderPlaced, setOrderPlaced] = useState(false);

  useEffect(() => {
    const requestedPage = new URLSearchParams(window.location.search).get('page')?.toLowerCase();
    if (requestedPage && template.pages.some((page) => page.toLowerCase() === requestedPage)) {
      const frame = requestAnimationFrame(() => setActiveSection(requestedPage));
      return () => cancelAnimationFrame(frame);
    }
  }, [template.id, template.pages]);

  const currentAccent = COLOR_PALETTES[activePalette].color || template.accent;
  const products = template.products || [];
  const visibleProducts = activeSection.includes('wishlist')
    ? products.filter((product) => wishlist.includes(product.name))
    : products;

  const deviceWidths = {
    desktop: '100%',
    tablet: '768px',
    mobile: '390px',
  };

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isDarkTemplate = 
    template.bgColor.toLowerCase().startsWith('#0') || 
    template.bgColor.toLowerCase().startsWith('#1') || 
    template.textColor === '#FFFFFF';

  return (
    <div className="min-h-screen bg-background text-ink flex flex-col select-none overflow-x-hidden">
      {/* Top Floating Control Bar - Perfectly Aligned, No Overflow on 1366px or Mobile */}
      <header className="bg-card border-b-[2.5px] border-ink z-30 shrink-0 shadow-xs">
        <div className="w-full px-3 sm:px-6 py-2 flex items-center justify-between gap-2 sm:gap-4">
          
          {/* Left: Back button & Template info */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Link
              href="/templates"
              className="brutal-press flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-display font-black uppercase tracking-wider text-black bg-yellow border-2 border-ink shadow-brutal-xs shrink-0"
            >
              <ArrowLeft size={13} className="stroke-[2.5]" />
              <span className="hidden sm:inline">Templates</span>
            </Link>
            
            <div className="h-4 w-[1.5px] bg-ink/20 hidden md:block shrink-0" />
            
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <span className="font-display text-xs sm:text-sm font-black text-ink truncate max-w-[130px] sm:max-w-[180px]">
                {template.name}
              </span>
              <span className="font-mono text-[9px] font-black uppercase text-black bg-mint border border-ink px-1.5 py-0.5 rounded shadow-2xs shrink-0">
                {template.category}
              </span>
              {template.isPro ? (
                <span className="font-mono text-[9px] font-black uppercase text-black bg-yellow border border-ink px-1.5 py-0.5 rounded flex items-center gap-0.5 shadow-2xs shrink-0">
                  <Sparkles size={9} /> PRO
                </span>
              ) : (
                <span className="font-mono text-[9px] font-black uppercase text-black bg-pink border border-ink px-1.5 py-0.5 rounded shadow-2xs shrink-0">
                  FREE
                </span>
              )}
            </div>
          </div>

          {/* Center: Device Viewport Switcher */}
          <div className="hidden md:flex items-center gap-1 bg-background border-2 border-ink p-1 rounded-xl shadow-brutal-xs shrink-0">
            {(['desktop', 'tablet', 'mobile'] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDevice(d)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-display text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  device === d 
                    ? 'bg-pink text-black border border-ink shadow-2xs' 
                    : 'text-muted-foreground hover:text-ink'
                }`}
                title={`Switch to ${d} preview`}
              >
                {d === 'desktop' && <Monitor size={12} />}
                {d === 'tablet' && <Tablet size={12} />}
                {d === 'mobile' && <Smartphone size={12} />}
                <span className="capitalize">{d}</span>
              </button>
            ))}
          </div>

          <label className="flex items-center gap-1.5 rounded-xl border-2 border-ink bg-card px-2 py-1.5 font-mono text-[10px] font-bold text-ink shadow-brutal-xs shrink-0">
            <span className="hidden sm:inline">Preview page</span>
            <select
              aria-label="Choose preview page"
              value={activeSection}
              onChange={(event) => setActiveSection(event.target.value)}
              className="max-w-24 sm:max-w-32 cursor-pointer bg-transparent outline-none"
            >
              {template.pages.map((page) => <option key={page} value={page.toLowerCase()}>{page}</option>)}
            </select>
          </label>

          {/* Right: Palette & Actions (Compact, fits comfortably on 1366px screen) */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Color Palette Switcher */}
            <div className="hidden lg:flex items-center gap-1 bg-background border-2 border-ink px-2 py-1 rounded-xl shadow-brutal-xs">
              <Palette size={11} className="text-muted-foreground mr-0.5" />
              {COLOR_PALETTES.map((pal, idx) => (
                <button
                  key={pal.name}
                  type="button"
                  onClick={() => setActivePalette(idx)}
                  className={`w-3.5 h-3.5 rounded-full border-2 transition-transform cursor-pointer ${
                    activePalette === idx ? 'scale-125 border-ink ring-1 ring-ink' : 'border-black/30 hover:scale-110'
                  }`}
                  style={{ backgroundColor: pal.color || template.accent }}
                  title={`Accent: ${pal.name}`}
                />
              ))}
            </div>

            {/* Source Code Modal Trigger */}
            <button
              type="button"
              onClick={() => setShowExportModal(true)}
              className="hidden xl:flex brutal-press items-center gap-1 px-2.5 py-1.5 rounded-xl font-display text-xs font-black uppercase tracking-wider text-black bg-mint border-2 border-ink shadow-brutal-xs cursor-pointer"
            >
              <Download size={12} />
              <span>Source Code</span>
            </button>

            {/* Share Link */}
            <button
              type="button"
              onClick={handleShare}
              className="brutal-press flex items-center gap-1 px-2.5 py-1.5 rounded-xl font-display text-xs font-black uppercase tracking-wider text-ink bg-card border-2 border-ink shadow-brutal-xs cursor-pointer"
              title="Copy preview link"
            >
              {copied ? <Check size={12} className="text-green-600 stroke-[3]" /> : <Share2 size={12} />}
              <span className="hidden sm:inline">{copied ? 'Copied' : 'Share'}</span>
            </button>

            {/* Primary Action: Customize */}
            <Link
              href={`/editor/${template.id}`}
              className="brutal-press flex items-center gap-1 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl font-display text-xs sm:text-sm font-black uppercase tracking-wider bg-pink text-black border-2 border-ink shadow-brutal-xs hover:bg-yellow transition-all group shrink-0"
            >
              <Sparkles size={12} />
              <span>Customize</span>
              <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform stroke-[2.5]" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Preview Sandbox Canvas - Warm Brutalist Studio Canvas */}
      <div 
        className="flex-1 overflow-auto bg-[#f6f3eb] dark:bg-[#0c0d15] p-3 sm:p-6 lg:p-8 flex items-center justify-center relative min-h-[640px]"
        style={{
          backgroundImage: 'radial-gradient(currentColor 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          color: 'rgba(0, 0, 0, 0.08)'
        }}
      >
        <div
          key={refreshKey}
          className="h-full min-h-[600px] max-h-[86vh] bg-card rounded-2xl shadow-brutal-lg overflow-hidden flex flex-col border-[3px] border-black dark:border-[#2a2a3a] transition-all duration-300"
          style={{ width: deviceWidths[device] }}
        >
          {/* Simulated macOS Browser Window Chrome */}
          <div className={`border-b-2 px-4 py-2.5 flex items-center justify-between shrink-0 ${
            isDarkTemplate 
              ? 'bg-[#141522] border-black/40 text-white' 
              : 'bg-[#eeece4] border-black/15 text-black'
          }`}>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-[#FF5F57] border border-black/30" />
              <div className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-black/30" />
              <div className="w-3 h-3 rounded-full bg-[#28CA41] border border-black/30" />
            </div>

            {/* Domain Address Bar */}
            <div className={`flex items-center gap-2 px-3.5 py-1 rounded-lg text-xs font-mono shadow-inner max-w-sm w-full justify-between border ${
              isDarkTemplate 
                ? 'bg-[#0b0b12] border-white/10 text-neutral-300' 
                : 'bg-white border-black/10 text-neutral-700'
            }`}>
              <div className="flex items-center gap-1.5 truncate">
                <Lock size={11} className="text-green-500 shrink-0" />
                <span className="truncate">https://{template.id}.launchly.site</span>
              </div>
              <button
                type="button"
                onClick={() => setRefreshKey((k) => k + 1)}
                className="hover:text-pink cursor-pointer text-neutral-400 shrink-0 transition-colors"
                title="Reload preview"
              >
                <RefreshCw size={11} />
              </button>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-neutral-400">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block animate-pulse" />
              <span className="hidden sm:inline">Live Preview</span>
            </div>
          </div>

          {/* Interactive Simulated Website (Rich, Layered & Aesthetic - NOT a flat black void) */}
          <div 
            className="flex-1 overflow-y-auto select-text scroll-smooth no-scrollbar relative"
            style={{ 
              backgroundColor: isDarkTemplate ? '#0e0f17' : (template.bgColor || '#FAF9F6'),
              color: isDarkTemplate ? '#FFFFFF' : '#171717'
            }}
          >
            {/* Ambient Lighting Gradient for Dark Aesthetic Themes */}
            {isDarkTemplate && (
              <>
                <div 
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-[650px] h-[320px] rounded-full blur-[110px] opacity-20 pointer-events-none transition-all duration-500"
                  style={{ backgroundColor: currentAccent }}
                />
                <div className="absolute top-60 -right-20 w-[350px] h-[350px] rounded-full blur-[120px] bg-indigo-500/10 pointer-events-none" />
              </>
            )}

            {/* Template Navigation Bar */}
            <nav 
              className={`sticky top-0 z-20 backdrop-blur-md px-6 sm:px-10 py-3.5 flex items-center justify-between border-b ${
                isDarkTemplate
                  ? 'bg-[#12131e]/90 border-white/10 text-white shadow-xs'
                  : 'bg-white/90 border-black/10 text-[#171717] shadow-xs'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div 
                  className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-white text-xs shadow-xs"
                  style={{ backgroundColor: currentAccent }}
                >
                  {template.name.charAt(0)}
                </div>
                <span className={`font-bold text-base tracking-tight ${isDarkTemplate ? 'text-white' : 'text-[#171717]'}`}>
                  {template.name}
                </span>
              </div>

              {/* Keep primary storefront navigation concise; the page picker contains every preview route. */}
              <div className={`hidden sm:flex items-center gap-5 text-xs font-semibold ${
                isDarkTemplate ? 'text-neutral-300' : 'text-[#525252]'
              }`}>
                {template.pages.filter((page) => ['home', 'shop', 'about', 'contact'].includes(page.toLowerCase())).map((p) => {
                  const key = p.toLowerCase();
                  const isActive = activeSection === key;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setActiveSection(key)}
                      className={`transition-all capitalize cursor-pointer py-1 border-b-2 ${
                        isActive 
                          ? (isDarkTemplate ? 'text-white border-white font-bold' : 'text-black border-black font-bold') 
                          : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button type="button" onClick={() => setActiveSection(template.pages.find((page) => page.toLowerCase().includes('cart'))?.toLowerCase() || template.pages[0].toLowerCase())} className="relative rounded-full border px-3 py-2 text-xs font-bold" aria-label={`Shopping bag, ${cartCount} items`}>
                  Bag{cartCount > 0 && <span className="ml-1 rounded-full px-1.5 py-0.5 text-[9px] text-black" style={{ backgroundColor: currentAccent }}>{cartCount}</span>}
                </button>
                <Link href={`/editor/${template.id}`} className="text-xs font-bold px-4 py-2 rounded-full shadow-xs transition-transform hover:scale-105" style={{ backgroundColor: currentAccent, color: isDarkTemplate ? '#FFFFFF' : '#171717' }}>Use Template</Link>
              </div>
            </nav>

            {/* DYNAMIC INTERACTIVE SECTION CONTENT */}

            {/* SECTION 1: OVERVIEW */}
            {activeSection === template.pages[0]?.toLowerCase() && (
              <div className="relative z-10">
                {/* Hero Section */}
                <section className="px-6 sm:px-12 pt-14 pb-12 sm:pt-18 sm:pb-16 text-center max-w-4xl mx-auto">
                  <div
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border-2 border-black font-mono text-[11px] sm:text-xs font-black uppercase text-black shadow-[2px_2px_0px_#000] mb-5"
                    style={{ backgroundColor: currentAccent }}
                  >
                    <span>{template.id === 'fresh-crate' ? 'FRESH CRATE / LOCAL MARKET' : template.id === 'volt-gear' ? 'VOLT GEAR / FIELD TESTED' : template.id === 'kuro-craft' ? 'KURO STUDIO / CREATIVE ARCHIVE' : `${template.category.toUpperCase()} / ${template.badge?.toUpperCase() || 'POPULAR'}`}</span>
                  </div>

                  <h1 className={`font-display text-4xl sm:text-6xl font-black tracking-tight mb-4 leading-[1.08] ${
                    isDarkTemplate ? 'text-white' : 'text-[#171717]'
                  }`}>
                    {template.id === 'fresh-crate' ? 'Good food starts close to home.' : template.id === 'volt-gear' ? 'Gear for your next big idea.' : template.id === 'kuro-craft' ? 'Designing interfaces that redefine utility.' : template.name}
                  </h1>

                  <p className={`font-mono text-xs sm:text-base opacity-80 max-w-xl mx-auto mb-8 leading-relaxed ${
                    isDarkTemplate ? 'text-neutral-300' : 'text-[#525252]'
                  }`}>
                    {template.id === 'fresh-crate' ? 'Seasonal produce from nearby farms, thoughtful pantry staples, and a fresh delivery at your door.' : template.id === 'volt-gear' ? 'Thoughtful technology for work, play, and everything you want to build next.' : template.id === 'kuro-craft' ? 'Multi-disciplinary design director partnering with high-velocity venture teams to ship category-defining software.' : template.description}
                  </p>

                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <Link
                      href={`/editor/${template.id}`}
                      className="px-6 sm:px-8 py-3 rounded-xl border-2 border-black font-display text-xs sm:text-sm font-black text-black shadow-[3px_3px_0px_#000] hover:scale-103 active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center gap-2 cursor-pointer"
                      style={{ backgroundColor: currentAccent }}
                    >
                      <span>Customize in Studio</span>
                      <ArrowUpRight size={14} className="stroke-[3]" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => setActiveSection(template.pages[1]?.toLowerCase() || template.pages[0].toLowerCase())}
                      className={`px-5 sm:px-7 py-3 rounded-xl border-2 font-mono text-xs sm:text-sm font-bold transition-all cursor-pointer backdrop-blur-xs ${
                        isDarkTemplate 
                          ? 'border-white/30 text-white hover:border-white bg-white/10' 
                          : 'border-black/30 text-black hover:border-black bg-black/5'
                      }`}
                    >
                      {template.id === 'kuro-craft' ? 'Explore Works' : 'Browse the store'}
                    </button>
                  </div>
                </section>

                <section className={`px-6 sm:px-12 pb-14 pt-4 ${isDarkTemplate ? 'text-white' : 'text-[#171717]'}`}>
                  <div className="max-w-5xl mx-auto">
                    <div className="flex items-end justify-between mb-5">
                      <div><span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: currentAccent }}>{template.id === 'kuro-craft' ? 'Recent Production Work' : 'Curated for you'}</span><h2 className="text-2xl font-black mt-1">{template.id === 'kuro-craft' ? 'Selected Case Studies' : 'Featured pieces'}</h2></div>
                      <button type="button" onClick={() => document.getElementById('template-featured-products')?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="text-xs font-bold underline underline-offset-4">{template.id === 'kuro-craft' ? 'View all' : 'Shop all'}</button>
                    </div>
                    <div id="template-featured-products" className="grid grid-cols-1 scroll-mt-24 sm:grid-cols-3 gap-4">
                      {products.slice(0, 3).map((product, index) => (
                        <article key={product.name} className={`overflow-hidden rounded-2xl border ${isDarkTemplate ? 'bg-white/5 border-white/10' : 'bg-white border-black/10'}`}>
                          <div className="h-40 overflow-hidden"><PreviewProductArt templateId={template.id} fresh={template.id === 'fresh-crate'} index={index}/></div>
                          <div className="p-4"><span className="font-mono text-[9px] uppercase tracking-wider opacity-60">{product.category}</span><h3 className="font-bold mt-1">{product.name}</h3><p className="text-xs opacity-65 mt-1">{product.detail}</p><div className="flex items-center justify-between mt-4">{template.id === 'kuro-craft' ? <span className="font-mono text-xs font-bold text-[#00F0FF]">{['99.4% Adoption', 'Webby Nominee', 'FWA SOTD', '2.4M ARR', 'Red Dot 2026', 'App Store 4.9'][index % 6]}</span> : <span className="font-black">₹{product.price.toLocaleString('en-IN')}</span>}<button type="button" onClick={() => setCartCount((count) => count + 1)} className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{ backgroundColor: currentAccent, color: isDarkTemplate ? '#111' : '#171717' }}>{template.id === 'kuro-craft' ? 'Explore Spec ↗' : `Add to ${template.id === 'fresh-crate' ? 'crate' : 'bag'}`}</button></div></div>
                        </article>
                      ))}
                    </div>
                  </div>
                </section>

                {/* Key Highlights Grid */}
                <section className={`px-6 sm:px-12 py-12 border-t ${
                  isDarkTemplate ? 'bg-white/[0.02] border-white/10' : 'bg-black/[0.02] border-black/5'
                }`}>
                  <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-8">
                      <span className={`text-[11px] font-bold uppercase tracking-widest ${
                        isDarkTemplate ? 'text-neutral-400' : 'text-[#8A8A8A]'
                      }`}>
                        Template Specifications
                      </span>
                      <h3 className={`text-xl sm:text-2xl font-bold mt-1 ${
                        isDarkTemplate ? 'text-white' : 'text-[#171717]'
                      }`}>
                        Everything you need to launch
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                      {template.features.map((feat) => (
                        <div 
                          key={feat} 
                          className={`p-4 rounded-2xl border shadow-xs transition-all text-left ${
                            isDarkTemplate 
                              ? 'bg-[#181928] border-white/10 hover:border-white/25' 
                              : 'bg-white border-black/10 hover:border-black/20'
                          }`}
                        >
                          <CheckCircle2 size={18} className="mb-2.5" style={{ color: currentAccent }} />
                          <p className={`text-xs font-bold ${isDarkTemplate ? 'text-white' : 'text-[#171717]'}`}>
                            {feat}
                          </p>
                          <p className={`text-[11px] mt-1 ${isDarkTemplate ? 'text-neutral-400' : 'text-[#737373]'}`}>
                            Fully responsive with modular React components.
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              </div>
            )}

            {activeSection !== template.pages[0]?.toLowerCase() && (
              <section className="px-6 sm:px-12 py-12 max-w-5xl mx-auto relative z-10">
                <div className="text-center mb-8">
                  <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: currentAccent }}>{template.name}</span>
                  <h2 className={`text-3xl font-black mt-1 capitalize ${isDarkTemplate ? 'text-white' : 'text-black'}`}>{activeSection}</h2>
                  <p className="text-xs text-neutral-400 mt-2">Discover the collection, save a favorite, or add a piece to your bag.</p>
                </div>
                {activeSection.includes('checkout') ? (
                  <form onSubmit={(event) => { event.preventDefault(); setOrderPlaced(true); }} className={`max-w-xl mx-auto rounded-2xl border p-6 space-y-3 ${isDarkTemplate ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-black/10 text-black'}`}>
                    <h3 className="font-bold text-lg">Checkout</h3>
                    <p className="font-mono text-xs opacity-70">{cartCount} item{cartCount === 1 ? '' : 's'} in your bag</p>
                    <input required aria-label="Full name" placeholder="Full name" className="w-full rounded-lg border border-black/20 bg-transparent px-3 py-2 text-sm" />
                    <input required type="email" aria-label="Email address" placeholder="Email address" className="w-full rounded-lg border border-black/20 bg-transparent px-3 py-2 text-sm" />
                    <input required aria-label="Shipping address" placeholder="Shipping address" className="w-full rounded-lg border border-black/20 bg-transparent px-3 py-2 text-sm" />
                    <button className="w-full rounded-lg px-4 py-3 font-bold text-black" style={{ backgroundColor: currentAccent }}>Place demo order</button>
                    {orderPlaced && <p role="status" className="text-sm font-bold">Your demo order is confirmed. Thank you!</p>}
                  </form>
                ) : activeSection.includes('cart') ? (
                  <div className={`max-w-xl mx-auto rounded-2xl border p-6 text-center ${isDarkTemplate ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-black/10 text-black'}`}>
                    <h3 className="font-bold text-lg">Your bag</h3><p className="font-mono text-sm mt-2">{cartCount ? `${cartCount} item${cartCount === 1 ? '' : 's'} in your bag` : 'Your bag is currently empty.'}</p>
                    <button type="button" onClick={() => { setActiveSection(template.pages[0].toLowerCase()); window.setTimeout(() => document.getElementById('template-featured-products')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0); }} className="mt-5 rounded-lg px-4 py-2 font-bold text-black" style={{ backgroundColor: currentAccent }}>Continue shopping</button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    {visibleProducts.length ? visibleProducts.map((product, index) => (
                      <article key={product.name} className={`overflow-hidden rounded-2xl border ${isDarkTemplate ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-black/10 text-black'}`}>
                        <div className="h-48 overflow-hidden"><PreviewProductArt templateId={template.id} fresh={template.id === 'fresh-crate'} index={index}/></div>
                        <div className="p-4"><span className="font-mono text-[9px] uppercase tracking-wider opacity-60">{product.category}</span><h3 className="font-bold mt-1">{product.name}</h3><p className="text-xs opacity-65 mt-1">{product.detail}</p><div className="flex items-center justify-between mt-4">{template.id === 'kuro-craft' ? <span className="font-mono text-xs font-bold text-[#00F0FF]">{['99.4% Adoption', 'Webby Nominee', 'FWA SOTD', '2.4M ARR', 'Red Dot 2026', 'App Store 4.9'][index % 6]}</span> : <span className="font-black">₹{product.price.toLocaleString('en-IN')}</span>}<div className="flex gap-2"><button type="button" aria-label={`Save ${product.name}`} onClick={() => setWishlist((items) => items.includes(product.name) ? items.filter((item) => item !== product.name) : [...items, product.name])} className="rounded-lg border px-2 py-1 text-xs">{wishlist.includes(product.name) ? '♥' : '♡'}</button><button type="button" onClick={() => setCartCount((count) => count + 1)} className="rounded-lg px-3 py-1.5 text-xs font-bold text-black" style={{ backgroundColor: currentAccent }}>{template.id === 'kuro-craft' ? 'Explore Spec ↗' : `Add to ${template.id === 'fresh-crate' ? 'crate' : 'bag'}`}</button></div></div></div>
                      </article>
                  )) : <p className="col-span-full py-12 text-center text-sm opacity-60">No saved items yet. Tap the heart on a piece to add it to your wishlist.</p>}
                  </div>
                )}
                <div className="mt-10 text-center"><Link href={`/editor/${template.id}`} className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-xs font-bold shadow-md hover:scale-105 transition-all" style={{ backgroundColor: currentAccent, color: isDarkTemplate ? '#111' : '#171717' }}><Sparkles size={13} /><span>Customize this storefront</span></Link></div>
              </section>
            )}
            {/* Template Bottom Footer */}
            <footer className={`px-6 py-10 border-t text-center text-xs relative z-10 ${
              isDarkTemplate 
                ? 'bg-[#0a0b12] border-white/10 text-neutral-400' 
                : 'bg-white border-black/5 text-[#8A8A8A]'
            }`}>
              <div className={`flex items-center justify-center gap-2 mb-2 font-bold ${
                isDarkTemplate ? 'text-white' : 'text-[#171717]'
              }`}>
                <span>{template.name}</span>
                <span>•</span>
                <span>Powered by Launchly Studio</span>
              </div>
              <p>© {new Date().getFullYear()} All rights reserved. Customize this site freely.</p>
            </footer>
          </div>
        </div>
      </div>

      {/* Code Export & Download Modal */}
      {showExportModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          onClick={() => setShowExportModal(false)}
        >
          <div
            className="w-full max-w-md bg-card border-[3.5px] border-ink rounded-3xl p-6 shadow-brutal-lg text-ink space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b-2 border-ink/20">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-yellow border-2 border-ink text-black flex items-center justify-center shadow-brutal-xs">
                  <Download size={16} className="stroke-[2.5]" />
                </div>
                <h3 className="text-base font-display font-black text-ink">Download Source Code</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="brutal-press h-8 w-8 rounded-xl border-2 border-ink bg-card text-ink flex items-center justify-center cursor-pointer shadow-brutal-xs"
              >
                <X size={15} className="stroke-[2.5]" />
              </button>
            </div>

            <p className="text-xs font-mono text-muted-foreground leading-relaxed">
              Export the production-ready Next.js 16, Tailwind CSS, and TypeScript project for &ldquo;{template.name}&rdquo;.
            </p>

            <div className="p-3.5 rounded-2xl bg-background border-2 border-ink space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Framework:</span>
                <span className="font-bold text-ink">Next.js 16 (App Router)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Styling:</span>
                <span className="font-bold text-ink">Tailwind CSS v4</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">License:</span>
                <span className="font-bold text-pink">Commercial & Personal</span>
              </div>
            </div>

            <div className="flex flex-col gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowExportModal(false);
                  setShowPaymentModal(true);
                }}
                className="brutal-press w-full py-2.5 px-4 rounded-xl font-display text-xs font-black uppercase tracking-wider text-black bg-pink border-2 border-ink shadow-brutal-xs hover:bg-yellow transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <Download size={14} className="stroke-[2.5]" />
                <span>Pay & Download Source Code ($49)</span>
              </button>
              <div className="flex items-center gap-2">
                <Link
                  href={`/editor/${template.id}`}
                  className="brutal-press flex-1 py-2 px-3 rounded-xl font-display text-xs font-black uppercase text-center bg-card border-2 border-ink text-ink shadow-brutal-xs hover:bg-neutral-100 dark:hover:bg-[#1a1a26]"
                >
                  Edit in Studio First
                </Link>
                <button
                  type="button"
                  onClick={() => setShowExportModal(false)}
                  className="brutal-press py-2 px-4 rounded-xl font-display text-xs font-black uppercase bg-background border-2 border-ink text-muted-foreground hover:text-ink cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Official QR Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        itemName={`${template.name} Source Code`}
        price="$49"
        planId={`template-${template.id}`}
      />
    </div>
  );
}
