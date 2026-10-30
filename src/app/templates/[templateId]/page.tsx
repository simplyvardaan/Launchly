'use client';

import { use, useState, useEffect, useMemo } from 'react';
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
  Menu,
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  Tag,
  Search,
  Eye,
  Heart
} from 'lucide-react';
import { getTemplateById } from '@/lib/templates';
import { createStorefrontPages, getTemplateFeatureDescriptions } from '@/lib/templateContent';
import { redirect } from 'next/navigation';

const COLOR_PALETTES = [
  { name: 'Original', color: '' },
  { name: 'Orange', color: '#FF5500' },
  { name: 'Indigo', color: '#6366F1' },
  { name: 'Sunset', color: '#FF7733' },
  { name: 'Emerald', color: '#10B981' },
];

function PreviewProductArt({ fresh, index }: { fresh: boolean; index: number }) {
  const accent = fresh ? ['#3FA34D', '#E76F51', '#F4A93B'][index % 3] : ['#C6FF3D', '#7C5CFF', '#40D9E8'][index % 3];
  return <svg viewBox="0 0 480 320" aria-hidden="true" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
    <defs><linearGradient id={`preview-art-${fresh ? 'fresh' : 'volt'}-${index}`} x1="0" y1="0" x2="1" y2="1"><stop stopColor={fresh ? '#FFF8EC' : '#252C3B'}/><stop offset="1" stopColor={fresh ? '#DCEBD4' : '#11141C'}/></linearGradient></defs>
    <rect width="480" height="320" fill={`url(#preview-art-${fresh ? 'fresh' : 'volt'}-${index})`}/><circle cx="390" cy="55" r="90" fill={accent} opacity=".15"/>
    {fresh ? <g><path d="M112 135h256l-24 142H136z" fill="#C3874D"/><path d="M130 158h220M136 205h208M143 251h194" stroke="#8F5C36" strokeWidth="10"/><path d="M155 141c-4-72 51-88 68-25 22-80 83-77 91-5 39-57 84-30 71 30" fill="none" stroke={accent} strokeWidth="15" strokeLinecap="round"/><circle cx="177" cy="165" r="31" fill="#E76F51"/><circle cx="238" cy="155" r="29" fill="#F4A93B"/><circle cx="297" cy="169" r="32" fill="#89B85D"/><circle cx="211" cy="209" r="27" fill="#D84D42"/><circle cx="275" cy="216" r="29" fill="#F2BC47"/></g> : <g><path d="M156 196v-48c0-85 36-124 84-124s84 39 84 124v48" fill="none" stroke={accent} strokeWidth="19" strokeLinecap="round"/><rect x="123" y="166" width="62" height="94" rx="24" fill="#30384A" stroke={accent} strokeWidth="7"/><rect x="295" y="166" width="62" height="94" rx="24" fill="#30384A" stroke={accent} strokeWidth="7"/><path d="M181 277h118" stroke="#8993A7" strokeWidth="8" strokeLinecap="round"/></g>}
  </svg>;
}

type StoreItem = {
  name: string;
  category: string;
  price: number;
  detail: string;
};

type CartItem = StoreItem & {
  quantity: number;
  productIndex: number;
};

export default function TemplatePreviewPage({ 
  params 
}: { 
  params: Promise<{ templateId: string }> 
}) {
  const { templateId } = use(params);
  const template = getTemplateById(templateId);

  if (!template) {
    redirect('/editor');
  }

  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [copied, setCopied] = useState(false);
  const [activePalette, setActivePalette] = useState(0);
  const [activeSection, setActiveSection] = useState(template.pages[0]?.toLowerCase() || 'overview');
  const [sectionHistory, setSectionHistory] = useState<string[]>([template.pages[0]?.toLowerCase() || 'overview']);
  const [showExportModal, setShowExportModal] = useState(false);
  const [authResolved, setAuthResolved] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Enhanced Interactive Commerce States
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; percent: number } | null>(null);
  const [couponFeedback, setCouponFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [quickViewProduct, setQuickViewProduct] = useState<{ product: StoreItem; index: number } | null>(null);
  const [shopCategory, setShopCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState('Morning (8:00 AM – 11:00 AM)');

  useEffect(() => {
    fetch('/api/auth/me')
      .then((response) => response.json())
      .then((data) => {
        setIsAuthenticated(Boolean(data?.authenticated && data.user));
        setIsPro(Boolean(data?.authenticated && data.user?.plan === 'pro'));
      })
      .catch(() => {
        setIsAuthenticated(false);
        setIsPro(false);
      })
      .finally(() => setAuthResolved(true));
  }, []);

  useEffect(() => {
    const requestedPage = new URLSearchParams(window.location.search).get('page')?.toLowerCase();
    if (requestedPage && template.pages.some((page) => page.toLowerCase() === requestedPage)) {
      const frame = requestAnimationFrame(() => {
        setActiveSection(requestedPage);
        setSectionHistory((prev) => [...prev, requestedPage]);
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [template.id, template.pages]);

  const currentAccent = COLOR_PALETTES[activePalette].color || template.accent;
  const products: StoreItem[] = template.products || [];
  const featureDescriptions = getTemplateFeatureDescriptions(template.id, template.features);
  const previewPages = useMemo(
    () => createStorefrontPages(template.id, template.pages, products),
    [template.id, template.pages, products],
  );

  const categories = useMemo(() => {
    const cats = Array.from(new Set(products.map((p) => p.category)));
    return ['All', ...cats];
  }, [products]);

  // Responsive device modes
  const isMobile = device === 'mobile';
  const isTablet = device === 'tablet';

  const deviceWidths = {
    desktop: '100%',
    tablet: '768px',
    mobile: '390px',
  };

  const navigateToSection = (section: string) => {
    const target = section.toLowerCase();
    setActiveSection(target);
    setSectionHistory((prev) => [...prev, target]);
    setMobileMenuOpen(false);
  };

  const handleBackNavigation = () => {
    if (sectionHistory.length > 1) {
      const nextHistory = [...sectionHistory];
      nextHistory.pop();
      const prevSection = nextHistory[nextHistory.length - 1];
      setSectionHistory(nextHistory);
      setActiveSection(prevSection);
    } else {
      navigateToSection(template.pages[0].toLowerCase());
    }
  };

  // Toast notification helper
  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage((cur) => (cur === message ? null : cur));
    }, 2400);
  };

  // Cart operations
  const handleAddToCart = (product: StoreItem, index: number, quantity = 1) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.name === product.name);
      if (existing) {
        return prev.map((item) =>
          item.name === product.name ? { ...item, quantity: item.quantity + quantity } : item
        );
      }
      return [...prev, { ...product, quantity, productIndex: index }];
    });
    showToast(`Added ${product.name} to ${template.id === 'fresh-crate' ? 'crate' : 'bag'}`);
  };

  const handleUpdateQuantity = (name: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => (item.name === name ? { ...item, quantity: item.quantity + delta } : item))
        .filter((item) => item.quantity > 0)
    );
  };

  const handleRemoveFromCart = (name: string) => {
    setCart((prev) => prev.filter((item) => item.name !== name));
    showToast(`Removed from ${template.id === 'fresh-crate' ? 'crate' : 'bag'}`);
  };

  const handleApplyCoupon = () => {
    const code = couponCode.trim().toUpperCase();
    if (!code) return;
    if (code === 'FRESH10' || (template.id === 'fresh-crate' && code === 'FRESH10')) {
      setAppliedCoupon({ code: 'FRESH10', percent: 10 });
      setCouponFeedback({ type: 'success', message: '10% discount applied to your crate!' });
    } else if (code === 'VOLT15' || (template.id === 'volt-gear' && code === 'VOLT15')) {
      setAppliedCoupon({ code: 'VOLT15', percent: 15 });
      setCouponFeedback({ type: 'success', message: '15% discount applied to your order!' });
    } else if (code === 'LAUNCH10') {
      setAppliedCoupon({ code: 'LAUNCH10', percent: 10 });
      setCouponFeedback({ type: 'success', message: 'Launchly 10% promo code applied!' });
    } else {
      setCouponFeedback({ type: 'error', message: 'Invalid promo code. Try FRESH10 or VOLT15.' });
    }
  };

  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discountAmount = appliedCoupon ? Math.round((subtotal * appliedCoupon.percent) / 100) : 0;
  const shippingThreshold = template.id === 'fresh-crate' ? 1500 : 20000;
  const shipping = subtotal === 0 || subtotal - discountAmount >= shippingThreshold ? 0 : 499;
  const grandTotal = Math.max(0, subtotal - discountAmount + shipping);
  const amountToFreeShipping = Math.max(0, shippingThreshold - (subtotal - discountAmount));

  const toggleWishlist = (name: string) => {
    setWishlist((prev) => {
      const exists = prev.includes(name);
      const next = exists ? prev.filter((item) => item !== name) : [...prev, name];
      showToast(exists ? `Removed ${name} from wishlist` : `Saved ${name} to wishlist`);
      return next;
    });
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

  // Filtered products for Shop section
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCat = shopCategory === 'All' || p.category.toLowerCase() === shopCategory.toLowerCase();
      const matchesSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.detail.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [products, shopCategory, searchQuery]);

  const visibleProducts = activeSection.includes('wishlist')
    ? products.filter((product) => wishlist.includes(product.name))
    : activeSection.includes('shop')
    ? filteredProducts
    : products;

  return (
    <div className="min-h-screen bg-background text-ink flex flex-col select-none overflow-x-hidden">
      {/* Top Floating Control Bar - Clean, spacious, and responsive on all screen sizes */}
      <header className="bg-card border-b border-black/10 dark:border-white/10 z-30 shrink-0 shadow-xs">
        <div className="w-full px-4 sm:px-6 py-3">
          {/* Mobile Layout (< 640px): 2 Spacious, Clean Rows */}
          <div className="flex flex-col gap-2.5 sm:hidden w-full">
            {/* Row 1: Back + Name + Device Switcher */}
            <div className="flex items-center justify-between gap-2 w-full">
              <div className="flex items-center gap-2 min-w-0">
                <Link
                  href="/templates"
                  className="p-2 rounded-xl text-xs font-display font-bold uppercase tracking-wider text-black bg-yellow/90 hover:bg-yellow border border-black/15 shadow-xs shrink-0 flex items-center justify-center transition-all"
                  title="Back to templates"
                >
                  <ArrowLeft size={14} className="stroke-[2.5]" />
                </Link>
                <span className="font-display text-sm font-bold text-ink truncate">
                  {template.name}
                </span>
                <span className="font-mono text-[9px] font-semibold uppercase text-black/80 bg-mint/90 border border-black/10 px-2 py-0.5 rounded-full shrink-0">
                  {template.category}
                </span>
              </div>

              {/* Mobile Device Switcher */}
              <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800/90 p-1 rounded-xl border border-black/10 dark:border-white/10 shrink-0">
                {(['desktop', 'tablet', 'mobile'] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      setDevice(d);
                      setMobileMenuOpen(false);
                    }}
                    className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                      device === d
                        ? 'bg-pink text-black shadow-xs'
                        : 'text-neutral-400 hover:text-ink'
                    }`}
                    title={`${d} preview`}
                  >
                    {d === 'desktop' && <Monitor size={13} />}
                    {d === 'tablet' && <Tablet size={13} />}
                    {d === 'mobile' && <Smartphone size={13} />}
                  </button>
                ))}
              </div>
            </div>

            {/* Row 2: Page Selector + Share + Customize */}
            <div className="flex items-center justify-between gap-2 w-full">
              <label className="flex-1 min-w-0 flex items-center gap-1.5 rounded-xl border border-black/15 dark:border-white/15 bg-background px-3 py-1.5 font-mono text-xs font-medium text-ink shadow-xs">
                <select
                  aria-label="Choose preview page"
                  value={activeSection}
                  onChange={(event) => navigateToSection(event.target.value)}
                  className="w-full cursor-pointer bg-transparent outline-none font-bold capitalize text-xs"
                >
                  {template.pages.map((page) => (
                    <option key={page} value={page.toLowerCase()}>
                      {page}
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleShare}
                  className="p-2 rounded-xl text-ink bg-card border border-black/15 dark:border-white/15 hover:bg-neutral-50 dark:hover:bg-neutral-800 shadow-xs cursor-pointer transition-colors"
                  title="Copy preview link"
                >
                  {copied ? <Check size={14} className="text-green-600 stroke-[3]" /> : <Share2 size={14} />}
                </button>

                <Link
                  href={`/editor/${template.id}`}
                  className="px-4 py-2 rounded-xl font-display text-xs font-bold uppercase tracking-wider bg-pink text-black border border-black/20 hover:bg-yellow shadow-xs transition-all flex items-center gap-1.5"
                >
                  <span>Customize</span>
                  <ArrowRight size={13} className="stroke-[2.5]" />
                </Link>
              </div>
            </div>
          </div>

          {/* Desktop Layout (>= 640px): 1 Spacious, Balanced Bar */}
          <div className="hidden sm:flex items-center justify-between gap-4 w-full">
            {/* Left: Back button + Template info */}
            <div className="flex items-center gap-3 min-w-0">
              <Link
                href="/templates"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-display font-bold uppercase tracking-wider text-black bg-yellow/90 hover:bg-yellow border border-black/15 shadow-xs shrink-0 transition-all"
              >
                <ArrowLeft size={13} className="stroke-[2.5]" />
                <span>Templates</span>
              </Link>
              
              <div className="h-4 w-[1px] bg-black/10 dark:bg-white/10 shrink-0" />
              
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-display text-sm font-bold text-ink truncate max-w-[180px]">
                  {template.name}
                </span>
                <span className="font-mono text-[9px] font-semibold uppercase text-black/80 bg-mint/90 border border-black/10 px-2 py-0.5 rounded-full shrink-0">
                  {template.category}
                </span>
              </div>
            </div>

            {/* Center: Device Switcher + Page Selector */}
            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800/90 p-1 rounded-xl border border-black/10 dark:border-white/10 shrink-0">
                {(['desktop', 'tablet', 'mobile'] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      setDevice(d);
                      setMobileMenuOpen(false);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-display text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      device === d 
                        ? 'bg-pink text-black shadow-xs' 
                        : 'text-neutral-500 hover:text-ink'
                    }`}
                    title={`Switch to ${d} preview`}
                  >
                    {d === 'desktop' && <Monitor size={13} />}
                    {d === 'tablet' && <Tablet size={13} />}
                    {d === 'mobile' && <Smartphone size={13} />}
                    <span className="capitalize">{d}</span>
                  </button>
                ))}
              </div>

              <label className="flex items-center gap-2 rounded-xl border border-black/15 dark:border-white/15 bg-card px-3 py-1.5 font-mono text-xs font-medium text-ink shadow-xs">
                <span className="text-muted-foreground text-[11px]">Page:</span>
                <select
                  aria-label="Choose preview page"
                  value={activeSection}
                  onChange={(event) => navigateToSection(event.target.value)}
                  className="cursor-pointer bg-transparent outline-none font-bold capitalize text-xs"
                >
                  {template.pages.map((page) => (
                    <option key={page} value={page.toLowerCase()}>
                      {page}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {/* Right: Palettes + Actions */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Color Palette Switcher */}
              <div className="hidden xl:flex items-center gap-1.5 bg-neutral-100 dark:bg-neutral-800/90 border border-black/10 dark:border-white/10 px-2.5 py-1.5 rounded-xl">
                <Palette size={12} className="text-muted-foreground mr-0.5" />
                {COLOR_PALETTES.map((pal, idx) => (
                  <button
                    key={pal.name}
                    type="button"
                    onClick={() => setActivePalette(idx)}
                    className={`w-3.5 h-3.5 rounded-full border transition-transform cursor-pointer ${
                      activePalette === idx ? 'scale-125 border-ink ring-1 ring-ink' : 'border-black/20 hover:scale-110'
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
                className="hidden 2xl:flex items-center gap-1.5 px-3 py-2 rounded-xl font-display text-xs font-bold uppercase tracking-wider text-black bg-mint/90 hover:bg-mint border border-black/15 shadow-xs cursor-pointer transition-all"
              >
                {isPro ? <Download size={13} /> : <Lock size={13} />}
                <span>Code</span>
                {!isPro && <span className="rounded border border-black/20 bg-yellow px-1 py-0.5 text-[8px] font-bold">PRO</span>}
              </button>

              {/* Share Link */}
              <button
                type="button"
                onClick={handleShare}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-display text-xs font-bold uppercase tracking-wider text-ink bg-card border border-black/15 dark:border-white/15 hover:bg-neutral-50 dark:hover:bg-neutral-800 shadow-xs cursor-pointer transition-colors"
                title="Copy preview link"
              >
                {copied ? <Check size={13} className="text-green-600 stroke-[3]" /> : <Share2 size={13} />}
                <span>{copied ? 'Copied' : 'Share'}</span>
              </button>

              {/* Primary Action: Customize */}
              <Link
                href={`/editor/${template.id}`}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-display text-xs sm:text-sm font-bold uppercase tracking-wider bg-pink text-black border border-black/20 hover:bg-yellow shadow-xs transition-all group shrink-0"
              >
                <span>Customize</span>
                <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform stroke-[2.5]" />
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Preview Sandbox Canvas */}
      <div 
        className="flex-1 overflow-auto bg-[#f6f3eb] dark:bg-[#0c0d15] p-3.5 sm:p-6 lg:p-8 flex items-center justify-center relative min-h-[640px]"
        style={{
          backgroundImage: 'radial-gradient(currentColor 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          color: 'rgba(0, 0, 0, 0.08)'
        }}
      >
        <div
          key={refreshKey}
          className={`h-full min-h-[620px] max-h-[88vh] bg-card rounded-2xl shadow-sm sm:shadow-brutal-md overflow-hidden flex flex-col border border-black/20 sm:border-2 sm:border-black dark:border-[#2a2a3a] transition-all duration-300 relative ${
            isMobile ? 'max-w-[390px] w-full' : isTablet ? 'max-w-[768px] w-full' : 'w-full'
          }`}
          style={{ width: deviceWidths[device] }}
        >
          {/* Simulated macOS Browser Window Chrome */}
          <div className={`border-b-2 px-3 sm:px-4 py-2 flex items-center gap-2 select-none shrink-0 overflow-hidden ${
            isDarkTemplate 
              ? 'bg-[#141522] border-black/40 text-white' 
              : 'bg-[#eeece4] border-black/15 text-black'
          }`}>
            {/* Traffic lights & Back/Forward buttons */}
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="flex items-center gap-1.5 mr-0.5">
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#FF5F57] border border-black/30 shrink-0" />
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#FFBD2E] border border-black/30 shrink-0" />
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#28CA41] border border-black/30 shrink-0" />
              </div>
              <button
                type="button"
                onClick={handleBackNavigation}
                className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 text-neutral-500 hover:text-black dark:hover:text-white transition-colors cursor-pointer shrink-0"
                title="Go back"
              >
                <ChevronLeft size={13} />
              </button>
            </div>

            {/* Dynamic Domain Address Bar - Perfectly sized with flex-1 and min-w-0 */}
            <div className={`flex-1 min-w-0 flex items-center justify-between gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg text-xs font-mono shadow-inner border overflow-hidden ${
              isDarkTemplate 
                ? 'bg-[#0b0b12] border-white/10 text-neutral-300' 
                : 'bg-white border-black/10 text-neutral-700'
            }`}>
              <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
                <Lock size={11} className="text-green-500 shrink-0" />
                <span className="truncate text-[11px] font-mono leading-none">
                  <span className="hidden sm:inline">https://</span>
                  <span>{template.id}.launchly.site</span>
                  {activeSection === template.pages[0]?.toLowerCase() ? '' : `/${activeSection}`}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setRefreshKey((k) => k + 1)}
                className="hover:text-pink cursor-pointer text-neutral-400 shrink-0 transition-colors p-0.5 ml-1 flex items-center justify-center rounded"
                title="Reload preview"
              >
                <RefreshCw size={11} className="shrink-0" />
              </button>
            </div>

            {/* Live Indicator */}
            <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-neutral-400 shrink-0">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block animate-pulse shrink-0" />
              <span className="hidden sm:inline capitalize">{device}</span>
            </div>
          </div>

          {/* Interactive Simulated Website */}
          <div 
            className="flex-1 overflow-y-auto select-text scroll-smooth no-scrollbar relative flex flex-col"
            style={{ 
              backgroundColor: isDarkTemplate ? '#0e0f17' : (template.bgColor || '#FAF9F6'),
              color: isDarkTemplate ? '#FFFFFF' : '#171717'
            }}
          >
            {/* Ambient Lighting Gradient for Dark Themes */}
            {isDarkTemplate && (
              <>
                <div 
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-[650px] h-[320px] rounded-full blur-[110px] opacity-20 pointer-events-none transition-all duration-500"
                  style={{ backgroundColor: currentAccent }}
                />
                <div className="absolute top-60 -right-20 w-[350px] h-[350px] rounded-full blur-[120px] bg-indigo-500/10 pointer-events-none" />
              </>
            )}

            {/* Template Navigation Bar - Device Aware & Mobile Drawer Capable */}
            <nav 
              className={`sticky top-0 z-20 backdrop-blur-md px-3 sm:px-6 md:px-8 py-3 flex items-center justify-between gap-2 border-b ${
                isDarkTemplate
                  ? 'bg-[#12131e]/90 border-white/10 text-white shadow-xs'
                  : 'bg-white/90 border-black/10 text-[#171717] shadow-xs'
              }`}
            >
              {/* Brand Logo & Name */}
              <button 
                type="button"
                onClick={() => navigateToSection(template.pages[0].toLowerCase())}
                className="flex items-center gap-2 text-left cursor-pointer group shrink-0 min-w-0 mr-1"
              >
                <div 
                  className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-white text-xs shadow-xs transition-transform group-hover:scale-105 shrink-0"
                  style={{ backgroundColor: currentAccent }}
                >
                  {template.name.charAt(0)}
                </div>
                <span className={`font-bold text-sm sm:text-base tracking-tight truncate max-w-[110px] sm:max-w-[180px] shrink-0 ${isDarkTemplate ? 'text-white' : 'text-[#171717]'}`}>
                  {template.name}
                </span>
              </button>

              {/* Desktop / Tablet Navigation Links */}
              {!isMobile && (
                <div className={`hidden md:flex items-center gap-3 lg:gap-6 text-xs font-semibold shrink-0 ${
                  isDarkTemplate ? 'text-neutral-300' : 'text-[#525252]'
                }`}>
                  {template.pages
                    .filter((page) => page.toLowerCase() !== 'home')
                    .slice(0, 4)
                    .map((p) => {
                      const key = p.toLowerCase();
                      const isActive = activeSection === key;
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => navigateToSection(key)}
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
              )}

              {/* Right Side Header Actions */}
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                {/* Wishlist Link */}
                {wishlist.length > 0 && (
                  <button
                    type="button"
                    onClick={() => navigateToSection('wishlist')}
                    className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-pink-500 relative cursor-pointer"
                    title={`Wishlist (${wishlist.length})`}
                  >
                    <Heart size={15} fill="currentColor" />
                    <span className="absolute -top-1 -right-1 text-[9px] font-bold bg-pink-500 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center">
                      {wishlist.length}
                    </span>
                  </button>
                )}

                {/* Bag / Cart Button with real interactive count badge */}
                {products.length > 0 && (
                  <button 
                    type="button" 
                    onClick={() => navigateToSection('cart')} 
                    className="relative rounded-full border border-black/20 dark:border-white/20 px-2.5 sm:px-3 py-1.5 text-xs font-bold flex items-center gap-1 cursor-pointer hover:scale-103 transition-transform shrink-0" 
                    aria-label={`Shopping bag, ${totalCartCount} items`}
                  >
                    <ShoppingBag size={13} />
                    <span className="hidden sm:inline">Bag</span>
                    {totalCartCount > 0 && (
                      <span 
                        className="ml-0.5 rounded-full px-1.5 py-0.2 text-[9px] text-black font-black" 
                        style={{ backgroundColor: currentAccent }}
                      >
                        {totalCartCount}
                      </span>
                    )}
                  </button>
                )}

                {/* Desktop "Use Template" CTA */}
                {!isMobile && (
                  <Link 
                    href={`/editor/${template.id}`} 
                    className="hidden sm:inline-flex text-xs font-bold px-3 py-1.5 rounded-full shadow-xs transition-transform hover:scale-105 shrink-0" 
                    style={{ backgroundColor: currentAccent, color: isDarkTemplate ? '#FFFFFF' : '#171717' }}
                  >
                    Use Template
                  </Link>
                )}

                {/* Mobile / Responsive Hamburger Menu Button */}
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen((o) => !o)}
                  className={`p-1.5 rounded-lg border border-black/20 dark:border-white/20 text-current hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer ${
                    isMobile ? 'block' : 'block md:hidden'
                  }`}
                  aria-label="Toggle navigation menu"
                >
                  {mobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
                </button>
              </div>
            </nav>

            {/* Mobile Dropdown Menu Drawer inside the simulated phone preview */}
            {mobileMenuOpen && (
              <div className={`sticky top-[49px] z-30 border-b p-4 shadow-lg flex flex-col gap-2 ${
                isDarkTemplate ? 'bg-[#151624] border-white/15 text-white' : 'bg-white border-black/15 text-black'
              }`}>
                <div className="flex items-center justify-between pb-2 border-b border-black/10 dark:border-white/10 font-mono text-[10px] uppercase font-bold text-muted-foreground">
                  <span>Store Navigation</span>
                  <span className="text-xs text-green-500">● Open</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  {template.pages.map((p) => {
                    const key = p.toLowerCase();
                    const isActive = activeSection === key;
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => navigateToSection(key)}
                        className={`text-left px-2.5 py-2 rounded-lg text-xs font-bold capitalize transition-colors cursor-pointer flex items-center justify-between ${
                          isActive
                            ? 'bg-black/10 dark:bg-white/15'
                            : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-80'
                        }`}
                      >
                        <span>{p}</span>
                        {key === 'cart' && totalCartCount > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-pink-500 text-white font-mono">
                            {totalCartCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                <div className="pt-2">
                  <Link 
                    href={`/editor/${template.id}`} 
                    className="w-full text-center block text-xs font-bold py-2 rounded-lg shadow-xs" 
                    style={{ backgroundColor: currentAccent, color: isDarkTemplate ? '#FFFFFF' : '#171717' }}
                  >
                    Customize This Template
                  </Link>
                </div>
              </div>
            )}

            {/* DYNAMIC INTERACTIVE SECTION CONTENT */}

            {/* SECTION 1: HOME / OVERVIEW */}
            {activeSection === template.pages[0]?.toLowerCase() && (
              <div className="relative z-10 flex-1">
                {/* Hero Section */}
                <section className={`text-center mx-auto ${
                  isMobile ? 'px-4 pt-8 pb-8 max-w-sm' : isTablet ? 'px-4 sm:px-6 pt-8 sm:pt-12 pb-8 sm:pb-10 max-w-2xl' : 'px-4 sm:px-12 pt-10 sm:pt-14 pb-10 sm:pb-12 max-w-4xl'
                }`}>
                  <div
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border-2 border-black font-mono text-[10px] sm:text-xs font-black uppercase text-black shadow-[2px_2px_0px_#000] mb-4"
                    style={{ backgroundColor: currentAccent }}
                  >
                    <span>
                      {template.id === 'fresh-crate' 
                        ? 'FRESH CRATE / LOCAL MARKET' 
                        : template.id === 'volt-gear' 
                        ? 'VOLT GEAR / FIELD TESTED' 
                        : `${template.category.toUpperCase()} / ${template.badge?.toUpperCase() || 'POPULAR'}`}
                    </span>
                  </div>

                  <h1 className={`font-display font-black tracking-tight mb-3 leading-[1.1] ${
                    isMobile ? 'text-2xl' : isTablet ? 'text-2xl sm:text-4xl' : 'text-3xl sm:text-5xl lg:text-6xl'
                  } ${isDarkTemplate ? 'text-white' : 'text-[#171717]'}`}>
                    {template.id === 'fresh-crate' 
                      ? 'Good food starts close to home.' 
                      : template.id === 'volt-gear' 
                      ? 'Gear for your next big idea.' 
                      : template.name}
                  </h1>

                  <p className={`font-mono opacity-80 mx-auto mb-6 leading-relaxed ${
                    isMobile ? 'text-xs' : 'text-xs sm:text-sm md:text-base max-w-xl'
                  } ${isDarkTemplate ? 'text-neutral-300' : 'text-[#525252]'}`}>
                    {template.id === 'fresh-crate' 
                      ? 'Seasonal produce from nearby farms, thoughtful pantry staples, and a fresh delivery at your door.' 
                      : template.id === 'volt-gear' 
                      ? 'Thoughtful technology for work, play, and everything you want to build next.' 
                      : template.description}
                  </p>

                  <div className={`flex items-center justify-center gap-2.5 ${isMobile ? 'flex-col w-full' : 'flex-col sm:flex-row'}`}>
                    <Link
                      href={`/editor/${template.id}`}
                      className={`rounded-xl border-2 border-black font-display text-xs sm:text-sm font-black text-black shadow-[3px_3px_0px_#000] hover:scale-103 active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        isMobile ? 'w-full py-2.5 px-4' : 'w-full sm:w-auto px-6 sm:px-8 py-3'
                      }`}
                      style={{ backgroundColor: currentAccent }}
                    >
                      <span>Customize in Studio</span>
                      <ArrowUpRight size={14} className="stroke-[3]" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => navigateToSection('shop')}
                      className={`rounded-xl border-2 font-mono text-xs sm:text-sm font-bold transition-all cursor-pointer backdrop-blur-xs flex items-center justify-center gap-1.5 ${
                        isMobile ? 'w-full py-2.5 px-4' : 'w-full sm:w-auto px-5 sm:px-7 py-3'
                      } ${
                        isDarkTemplate 
                          ? 'border-white/30 text-white hover:border-white bg-white/10' 
                          : 'border-black/30 text-black hover:border-black bg-black/5'
                      }`}
                    >
                      <span>Explore Shop</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>
                </section>

                {/* Featured Products / Showcase Grid */}
                <section className={`pb-12 pt-2 ${
                  isMobile ? 'px-4' : 'px-4 sm:px-8 lg:px-12'
                } ${isDarkTemplate ? 'text-white' : 'text-[#171717]'}`}>
                  <div className="max-w-5xl mx-auto">
                    <div className="flex items-end justify-between mb-4">
                      <div>
                        <span className="font-mono text-[10px] uppercase tracking-widest font-bold" style={{ color: currentAccent }}>
                          {products.length > 0 ? 'Curated for you' : 'A closer look'}
                        </span>
                        <h2 className="text-xl sm:text-2xl font-black mt-0.5">
                          {products.length > 0 ? 'Featured pieces' : 'Built for your next idea'}
                        </h2>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => navigateToSection('shop')} 
                        className="text-xs font-bold underline underline-offset-4 cursor-pointer hover:opacity-80"
                      >
                        {products.length > 0 ? 'Shop all' : 'Explore features'}
                      </button>
                    </div>

                    {/* Responsive Grid based on simulated device viewport */}
                    <div 
                      id="template-featured-products" 
                      className={`grid gap-4 scroll-mt-24 ${
                        isMobile ? 'grid-cols-1' : isTablet ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                      }`}
                    >
                      {products.length > 0 ? products.slice(0, isMobile ? 3 : 6).map((product, index) => {
                        const isWishlisted = wishlist.includes(product.name);
                        return (
                          <article 
                            key={product.name} 
                            className={`group overflow-hidden rounded-2xl border transition-all hover:shadow-md ${
                              isDarkTemplate ? 'bg-white/5 border-white/10' : 'bg-white border-black/10'
                            }`}
                          >
                            <div className="h-44 overflow-hidden relative">
                              <PreviewProductArt fresh={template.id === 'fresh-crate'} index={index}/>
                              <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleWishlist(product.name);
                                  }}
                                  className="w-7 h-7 rounded-full bg-white/90 dark:bg-black/90 backdrop-blur-xs flex items-center justify-center text-xs shadow-xs hover:scale-110 transition-transform cursor-pointer"
                                  title="Add to wishlist"
                                >
                                  <Heart size={13} className={isWishlisted ? 'text-pink-500 fill-pink-500' : 'text-neutral-600'} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setQuickViewProduct({ product, index })}
                                  className="w-7 h-7 rounded-full bg-white/90 dark:bg-black/90 backdrop-blur-xs flex items-center justify-center text-xs shadow-xs hover:scale-110 transition-transform cursor-pointer"
                                  title="Quick view"
                                >
                                  <Eye size={13} className="text-neutral-600 dark:text-neutral-300" />
                                </button>
                              </div>
                            </div>
                            <div className="p-4">
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-[9px] uppercase tracking-wider opacity-60 font-bold">
                                  {product.category}
                                </span>
                              </div>
                              <h3 className="font-bold text-sm mt-1 group-hover:text-pink transition-colors">
                                {product.name}
                              </h3>
                              <p className="text-xs opacity-65 mt-1 line-clamp-2">
                                {product.detail}
                              </p>
                              <div className="flex items-center justify-between mt-3.5 pt-2 border-t border-black/5 dark:border-white/5">
                                <span className="font-black text-sm">
                                  ₹{product.price.toLocaleString('en-IN')}
                                </span>
                                <button 
                                  type="button" 
                                  onClick={() => handleAddToCart(product, index)} 
                                  className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-xs flex items-center gap-1" 
                                  style={{ backgroundColor: currentAccent, color: isDarkTemplate ? '#111' : '#171717' }}
                                >
                                  <Plus size={12} className="stroke-[3]" />
                                  <span>Add to {template.id === 'fresh-crate' ? 'crate' : 'bag'}</span>
                                </button>
                              </div>
                            </div>
                          </article>
                        );
                      }) : template.features.slice(0, 3).map((feature) => (
                        <article 
                          key={feature} 
                          className={`flex min-h-36 flex-col justify-between rounded-2xl border p-4 ${
                            isDarkTemplate ? 'bg-white/5 border-white/10' : 'bg-white border-black/10'
                          }`}
                        >
                          <CheckCircle2 size={18} style={{ color: currentAccent }} />
                          <h3 className="mt-4 font-bold text-sm">{feature}</h3>
                        </article>
                      ))}
                    </div>
                  </div>
                </section>

                {/* Key Highlights Grid */}
                <section className={`border-t ${
                  isMobile ? 'px-4 py-8' : 'px-6 sm:px-12 py-10'
                } ${
                  isDarkTemplate ? 'bg-white/[0.02] border-white/10' : 'bg-black/[0.02] border-black/5'
                }`}>
                  <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-6">
                      <span className={`text-[10px] font-bold uppercase tracking-widest ${
                        isDarkTemplate ? 'text-neutral-400' : 'text-[#8A8A8A]'
                      }`}>
                        Template Highlights
                      </span>
                      <h3 className={`text-lg sm:text-xl font-bold mt-0.5 ${
                        isDarkTemplate ? 'text-white' : 'text-[#171717]'
                      }`}>
                        Everything you need to launch
                      </h3>
                    </div>

                    <div className={`grid gap-3.5 ${
                      isMobile ? 'grid-cols-1' : isTablet ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
                    }`}>
                      {template.features.slice(0, 8).map((feat, index) => (
                        <div 
                          key={feat} 
                          className={`p-4 sm:p-4.5 rounded-2xl border transition-all text-left shadow-xs ${
                            isDarkTemplate 
                              ? 'bg-[#181928] border-white/10 hover:border-white/20' 
                              : 'bg-white border-black/10 hover:border-black/15'
                          }`}
                        >
                          <CheckCircle2 size={17} className="mb-2.5" style={{ color: currentAccent }} />
                          <p className={`text-xs sm:text-sm font-bold ${isDarkTemplate ? 'text-white' : 'text-[#171717]'}`}>
                            {feat}
                          </p>
                          <p className={`text-[11px] sm:text-xs mt-1.5 leading-relaxed ${isDarkTemplate ? 'text-neutral-400' : 'text-[#737373]'}`}>
                            {featureDescriptions[index]?.desc}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              </div>
            )}

            {/* SECTION: SHOP / CATALOG */}
            {activeSection.includes('shop') && (
              <section className={`py-8 max-w-5xl mx-auto relative z-10 flex-1 w-full ${isMobile ? 'px-4' : 'px-6 sm:px-12'}`}>
                <div className="text-center mb-6">
                  <span className="font-mono text-[10px] uppercase tracking-widest font-bold" style={{ color: currentAccent }}>
                    {template.name} Store
                  </span>
                  <h2 className={`text-2xl sm:text-3xl font-black mt-1 ${isDarkTemplate ? 'text-white' : 'text-black'}`}>
                    Shop This Week&apos;s Harvest
                  </h2>
                  <p className="mx-auto mt-1 max-w-xl text-xs sm:text-sm text-neutral-400">
                    Hand-picked produce, curated bundles, and local essentials with transparent pricing.
                  </p>
                </div>

                {/* Filter & Search Bar */}
                <div className="mb-6 space-y-3">
                  <div className="flex items-center gap-2 rounded-xl border border-black/15 dark:border-white/15 bg-card px-3 py-2 shadow-2xs">
                    <Search size={14} className="text-muted-foreground shrink-0" />
                    <input
                      type="text"
                      placeholder="Search produce, staples, or crates..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-transparent text-xs outline-none"
                    />
                    {searchQuery && (
                      <button type="button" onClick={() => setSearchQuery('')} className="text-neutral-400 hover:text-black dark:hover:text-white">
                        <X size={12} />
                      </button>
                    )}
                  </div>

                  {/* Category Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setShopCategory(cat)}
                        className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 transition-all cursor-pointer ${
                          shopCategory === cat
                            ? 'text-black shadow-xs scale-103'
                            : 'border border-black/15 dark:border-white/15 opacity-70 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: shopCategory === cat ? currentAccent : 'transparent' }}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Products Grid */}
                <div className={`grid gap-4 ${
                  isMobile ? 'grid-cols-1' : isTablet ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                }`}>
                  {filteredProducts.length > 0 ? (
                    filteredProducts.map((product, index) => {
                      const isWishlisted = wishlist.includes(product.name);
                      return (
                        <article 
                          key={product.name} 
                          className={`group overflow-hidden rounded-2xl border transition-all hover:shadow-md ${
                            isDarkTemplate ? 'bg-white/5 border-white/10' : 'bg-white border-black/10'
                          }`}
                        >
                          <div className="h-44 overflow-hidden relative">
                            <PreviewProductArt fresh={template.id === 'fresh-crate'} index={index} />
                            <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleWishlist(product.name);
                                }}
                                className="w-7 h-7 rounded-full bg-white/90 dark:bg-black/90 backdrop-blur-xs flex items-center justify-center text-xs shadow-xs hover:scale-110 transition-transform cursor-pointer"
                                title="Add to wishlist"
                              >
                                <Heart size={13} className={isWishlisted ? 'text-pink-500 fill-pink-500' : 'text-neutral-600'} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setQuickViewProduct({ product, index })}
                                className="w-7 h-7 rounded-full bg-white/90 dark:bg-black/90 backdrop-blur-xs flex items-center justify-center text-xs shadow-xs hover:scale-110 transition-transform cursor-pointer"
                                title="Quick view"
                              >
                                <Eye size={13} className="text-neutral-600 dark:text-neutral-300" />
                              </button>
                            </div>
                          </div>
                          <div className="p-4">
                            <span className="font-mono text-[9px] uppercase tracking-wider opacity-60 font-bold">
                              {product.category}
                            </span>
                            <h3 className="font-bold text-sm mt-1">{product.name}</h3>
                            <p className="text-xs opacity-65 mt-1 line-clamp-2">{product.detail}</p>
                            <div className="flex items-center justify-between mt-4 pt-2 border-t border-black/5 dark:border-white/5">
                              <span className="font-black text-sm">₹{product.price.toLocaleString('en-IN')}</span>
                              <button 
                                type="button" 
                                onClick={() => handleAddToCart(product, index)} 
                                className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-xs flex items-center gap-1" 
                                style={{ backgroundColor: currentAccent, color: isDarkTemplate ? '#111' : '#171717' }}
                              >
                                <Plus size={12} className="stroke-[3]" />
                                <span>Add to {template.id === 'fresh-crate' ? 'crate' : 'bag'}</span>
                              </button>
                            </div>
                          </div>
                        </article>
                      );
                    })
                  ) : (
                    <div className="col-span-full py-12 text-center">
                      <p className="text-sm opacity-60">No items match your search or filter.</p>
                      <button
                        type="button"
                        onClick={() => {
                          setShopCategory('All');
                          setSearchQuery('');
                        }}
                        className="mt-3 text-xs font-bold underline"
                      >
                        Reset filters
                      </button>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* SECTION: CART / BAG */}
            {activeSection.includes('cart') && (
              <section className={`py-8 max-w-4xl mx-auto relative z-10 flex-1 w-full ${isMobile ? 'px-4' : 'px-6 sm:px-12'}`}>
                <div className="text-center mb-6">
                  <span className="font-mono text-[10px] uppercase tracking-widest font-bold" style={{ color: currentAccent }}>
                    Shopping Bag
                  </span>
                  <h2 className={`text-2xl sm:text-3xl font-black mt-1 ${isDarkTemplate ? 'text-white' : 'text-black'}`}>
                    Your {template.id === 'fresh-crate' ? 'Crate' : 'Bag'}
                  </h2>
                </div>

                {cart.length > 0 ? (
                  <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-3'}`}>
                    {/* Cart Items List */}
                    <div className="lg:col-span-2 space-y-3">
                      {/* Free Shipping Notification Bar */}
                      <div className={`p-3 rounded-xl border text-xs font-mono flex items-center justify-between ${
                        amountToFreeShipping === 0 
                          ? 'bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-300' 
                          : isDarkTemplate ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'
                      }`}>
                        <span>
                          {amountToFreeShipping === 0 
                            ? '🎉 You unlocked FREE doorstep delivery!' 
                            : `Add ₹${amountToFreeShipping.toLocaleString('en-IN')} more to unlock FREE delivery.`}
                        </span>
                      </div>

                      {cart.map((item) => (
                        <div
                          key={item.name}
                          className={`p-3.5 rounded-2xl border flex items-center gap-3.5 ${
                            isDarkTemplate ? 'bg-white/5 border-white/10' : 'bg-white border-black/10'
                          }`}
                        >
                          <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-black/10">
                            <PreviewProductArt fresh={template.id === 'fresh-crate'} index={item.productIndex} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h4 className="font-bold text-xs sm:text-sm truncate">{item.name}</h4>
                                <span className="font-mono text-[10px] opacity-60 uppercase">{item.category}</span>
                              </div>
                              <span className="font-black text-xs sm:text-sm">
                                ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                              </span>
                            </div>

                            <div className="flex items-center justify-between mt-2">
                              {/* Quantity Control Buttons */}
                              <div className="inline-flex items-center rounded-lg border border-black/20 dark:border-white/20 p-0.5 text-xs">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateQuantity(item.name, -1)}
                                  className="w-6 h-6 flex items-center justify-center rounded hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer"
                                  title="Decrease quantity"
                                >
                                  <Minus size={11} />
                                </button>
                                <span className="w-7 text-center font-bold font-mono text-xs">
                                  {item.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateQuantity(item.name, 1)}
                                  className="w-6 h-6 flex items-center justify-center rounded hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer"
                                  title="Increase quantity"
                                >
                                  <Plus size={11} />
                                </button>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleRemoveFromCart(item.name)}
                                className="text-red-500 hover:text-red-700 p-1 text-xs cursor-pointer"
                                title="Remove item"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={() => navigateToSection('shop')}
                        className="text-xs font-bold underline cursor-pointer inline-block pt-1"
                      >
                        ← Continue shopping
                      </button>
                    </div>

                    {/* Order Summary Card */}
                    <div className={`p-5 rounded-2xl border h-fit space-y-4 ${
                      isDarkTemplate ? 'bg-white/5 border-white/10' : 'bg-white border-black/10'
                    }`}>
                      <h3 className="font-bold text-sm">Order Summary</h3>

                      {/* Promo Code Input */}
                      <div className="space-y-1.5">
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            placeholder="Promo code (e.g. FRESH10)"
                            value={couponCode}
                            onChange={(e) => setCouponCode(e.target.value)}
                            className="flex-1 bg-transparent border border-black/20 dark:border-white/20 rounded-lg px-2.5 py-1.5 text-xs outline-none"
                          />
                          <button
                            type="button"
                            onClick={handleApplyCoupon}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer text-black"
                            style={{ backgroundColor: currentAccent }}
                          >
                            Apply
                          </button>
                        </div>
                        {couponFeedback && (
                          <p className={`text-[10px] font-bold ${
                            couponFeedback.type === 'success' ? 'text-green-500' : 'text-red-500'
                          }`}>
                            {couponFeedback.message}
                          </p>
                        )}
                      </div>

                      {/* Line Items */}
                      <div className="space-y-2 text-xs font-mono pt-2 border-t border-black/10 dark:border-white/10">
                        <div className="flex justify-between">
                          <span className="opacity-70">Subtotal:</span>
                          <span>₹{subtotal.toLocaleString('en-IN')}</span>
                        </div>
                        {discountAmount > 0 && (
                          <div className="flex justify-between text-green-500 font-bold">
                            <span>Discount ({appliedCoupon?.code}):</span>
                            <span>-₹{discountAmount.toLocaleString('en-IN')}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="opacity-70">Delivery fee:</span>
                          <span>{shipping === 0 ? 'FREE' : `₹${shipping}`}</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-black/10 dark:border-white/10 font-bold text-sm">
                          <span>Total:</span>
                          <span>₹{grandTotal.toLocaleString('en-IN')}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => navigateToSection('checkout')}
                        className="w-full py-2.5 rounded-xl font-bold text-xs text-black cursor-pointer shadow-xs hover:scale-102 active:scale-98 transition-all flex items-center justify-center gap-1.5"
                        style={{ backgroundColor: currentAccent }}
                      >
                        <span>Proceed to Checkout</span>
                        <ArrowRight size={13} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className={`max-w-md mx-auto rounded-2xl border p-8 text-center space-y-3 ${
                    isDarkTemplate ? 'bg-white/5 border-white/10' : 'bg-white border-black/10'
                  }`}>
                    <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center bg-black/5 dark:bg-white/10 text-neutral-400">
                      <ShoppingBag size={22} />
                    </div>
                    <h3 className="font-bold text-base">Your bag is currently empty</h3>
                    <p className="text-xs opacity-70">
                      Explore this week&apos;s farm produce and staples to start your order.
                    </p>
                    <button
                      type="button"
                      onClick={() => navigateToSection('shop')}
                      className="mt-2 px-5 py-2 rounded-xl text-xs font-bold text-black cursor-pointer shadow-xs"
                      style={{ backgroundColor: currentAccent }}
                    >
                      Browse Harvest
                    </button>
                  </div>
                )}
              </section>
            )}

            {/* SECTION: CHECKOUT */}
            {activeSection.includes('checkout') && (
              <section className={`py-8 max-w-4xl mx-auto relative z-10 flex-1 w-full ${isMobile ? 'px-4' : 'px-6 sm:px-12'}`}>
                <div className="text-center mb-6">
                  <span className="font-mono text-[10px] uppercase tracking-widest font-bold" style={{ color: currentAccent }}>
                    Checkout
                  </span>
                  <h2 className={`text-2xl sm:text-3xl font-black mt-1 ${isDarkTemplate ? 'text-white' : 'text-black'}`}>
                    Confirm Delivery
                  </h2>
                </div>

                {!orderPlaced ? (
                  <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-3'}`}>
                    {/* Checkout Form */}
                    <form 
                      onSubmit={(e) => {
                        e.preventDefault();
                        const randomNum = Math.floor(10000 + Math.random() * 90000);
                        setOrderId(`${template.id === 'fresh-crate' ? 'FC' : 'VG'}-${randomNum}`);
                        setOrderPlaced(true);
                        setCart([]);
                        showToast('Order confirmed successfully!');
                      }}
                      className={`lg:col-span-2 rounded-2xl border p-5 sm:p-6 space-y-4 ${
                        isDarkTemplate ? 'bg-white/5 border-white/10' : 'bg-white border-black/10'
                      }`}
                    >
                      <h3 className="font-bold text-sm">Delivery Information</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input required placeholder="Full Name" defaultValue="Aarav Sharma" className="w-full rounded-lg border border-black/20 dark:border-white/20 bg-transparent px-3 py-2 text-xs" />
                        <input required type="email" placeholder="Email Address" defaultValue="aarav@neighborhood.local" className="w-full rounded-lg border border-black/20 dark:border-white/20 bg-transparent px-3 py-2 text-xs" />
                      </div>
                      <input required placeholder="Street Address / Apartment" defaultValue="Flat 402, Green Meadows" className="w-full rounded-lg border border-black/20 dark:border-white/20 bg-transparent px-3 py-2 text-xs" />
                      <div className="grid grid-cols-2 gap-3">
                        <input required placeholder="City / Area" defaultValue="Indiranagar" className="w-full rounded-lg border border-black/20 dark:border-white/20 bg-transparent px-3 py-2 text-xs" />
                        <input required placeholder="Postal Code" defaultValue="560038" className="w-full rounded-lg border border-black/20 dark:border-white/20 bg-transparent px-3 py-2 text-xs" />
                      </div>

                      {/* Delivery Window Selector */}
                      <div className="pt-2">
                        <label className="block text-xs font-bold mb-1.5">Choose Delivery Slot</label>
                        <div className="grid grid-cols-1 gap-1.5 text-xs font-mono">
                          {[
                            'Morning (8:00 AM – 11:00 AM)',
                            'Afternoon (1:00 PM – 4:00 PM)',
                            'Evening (6:00 PM – 9:00 PM)'
                          ].map((slot) => (
                            <label key={slot} className="flex items-center gap-2 p-2 rounded-lg border border-black/10 dark:border-white/10 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5">
                              <input 
                                type="radio" 
                                name="deliverySlot" 
                                checked={selectedSlot === slot} 
                                onChange={() => setSelectedSlot(slot)} 
                              />
                              <span>{slot}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Payment Method */}
                      <div className="pt-2">
                        <label className="block text-xs font-bold mb-1.5">Payment Method</label>
                        <div className="flex flex-wrap gap-2 text-xs">
                          <span className="px-3 py-1.5 rounded-lg border border-black/20 bg-black/5 dark:bg-white/10 font-bold">
                            ✓ Cash / UPI on Delivery
                          </span>
                          <span className="px-3 py-1.5 rounded-lg border border-black/10 opacity-60">
                            Instant UPI
                          </span>
                          <span className="px-3 py-1.5 rounded-lg border border-black/10 opacity-60">
                            Credit / Debit Card
                          </span>
                        </div>
                      </div>

                      <button 
                        type="submit" 
                        className="w-full py-3 rounded-xl font-bold text-xs text-black cursor-pointer shadow-xs hover:scale-102 transition-all mt-4" 
                        style={{ backgroundColor: currentAccent }}
                      >
                        Place Demo Order (₹{grandTotal.toLocaleString('en-IN')})
                      </button>
                    </form>

                    {/* Order Summary */}
                    <div className={`p-5 rounded-2xl border h-fit space-y-3 ${
                      isDarkTemplate ? 'bg-white/5 border-white/10' : 'bg-white border-black/10'
                    }`}>
                      <h4 className="font-bold text-sm">Summary</h4>
                      <div className="space-y-1.5 text-xs font-mono">
                        <div className="flex justify-between">
                          <span className="opacity-70">Items ({totalCartCount}):</span>
                          <span>₹{subtotal.toLocaleString('en-IN')}</span>
                        </div>
                        {discountAmount > 0 && (
                          <div className="flex justify-between text-green-500">
                            <span>Discount:</span>
                            <span>-₹{discountAmount.toLocaleString('en-IN')}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="opacity-70">Delivery:</span>
                          <span>{shipping === 0 ? 'FREE' : `₹${shipping}`}</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-black/10 dark:border-white/10 font-bold text-sm">
                          <span>Grand Total:</span>
                          <span>₹{grandTotal.toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Order Confirmed Screen */
                  <div className={`max-w-lg mx-auto rounded-3xl border p-8 text-center space-y-4 ${
                    isDarkTemplate ? 'bg-white/5 border-white/10' : 'bg-white border-black/10'
                  }`}>
                    <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center bg-green-500/20 text-green-500">
                      <Check size={28} className="stroke-[3]" />
                    </div>
                    <div>
                      <span className="font-mono text-xs uppercase font-bold text-green-500">
                        Order Confirmed
                      </span>
                      <h3 className="text-xl font-black mt-1">Thank you for your order!</h3>
                      <p className="font-mono text-xs opacity-70 mt-1">
                        Order ID: <strong>{orderId}</strong>
                      </p>
                    </div>

                    <div className="p-4 rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 text-xs font-mono text-left space-y-1.5">
                      <div className="flex justify-between">
                        <span className="opacity-60">Estimated Window:</span>
                        <span className="font-bold">{selectedSlot.split(' ')[0]}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="opacity-60">Delivery Address:</span>
                        <span className="font-bold">Indiranagar, Bangalore</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="opacity-60">Status:</span>
                        <span className="text-green-500 font-bold">Packing harvest at partner farm</span>
                      </div>
                    </div>

                    <div className="flex gap-2.5 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setOrderPlaced(false);
                          navigateToSection('home');
                        }}
                        className="flex-1 py-2.5 rounded-xl font-bold text-xs border border-black/20 dark:border-white/20 cursor-pointer"
                      >
                        Return Home
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setOrderPlaced(false);
                          navigateToSection('shop');
                        }}
                        className="flex-1 py-2.5 rounded-xl font-bold text-xs text-black cursor-pointer shadow-xs"
                        style={{ backgroundColor: currentAccent }}
                      >
                        Order More
                      </button>
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* SECTION: WISHLIST */}
            {activeSection.includes('wishlist') && (
              <section className={`py-8 max-w-4xl mx-auto relative z-10 flex-1 w-full ${isMobile ? 'px-4' : 'px-6 sm:px-12'}`}>
                <div className="text-center mb-6">
                  <span className="font-mono text-[10px] uppercase tracking-widest font-bold" style={{ color: currentAccent }}>
                    Saved Items
                  </span>
                  <h2 className={`text-2xl sm:text-3xl font-black mt-1 ${isDarkTemplate ? 'text-white' : 'text-black'}`}>
                    Your Market Wishlist
                  </h2>
                </div>

                {visibleProducts.length > 0 ? (
                  <div className={`grid gap-4 ${
                    isMobile ? 'grid-cols-1' : isTablet ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                  }`}>
                    {visibleProducts.map((product, index) => (
                      <article 
                        key={product.name} 
                        className={`overflow-hidden rounded-2xl border ${
                          isDarkTemplate ? 'bg-white/5 border-white/10' : 'bg-white border-black/10'
                        }`}
                      >
                        <div className="h-44 overflow-hidden relative">
                          <PreviewProductArt fresh={template.id === 'fresh-crate'} index={index} />
                          <button
                            type="button"
                            onClick={() => toggleWishlist(product.name)}
                            className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-white/90 text-pink-500 flex items-center justify-center text-xs shadow-xs"
                          >
                            <Heart size={13} fill="currentColor" />
                          </button>
                        </div>
                        <div className="p-4">
                          <span className="font-mono text-[9px] uppercase tracking-wider opacity-60 font-bold">
                            {product.category}
                          </span>
                          <h3 className="font-bold text-sm mt-1">{product.name}</h3>
                          <p className="text-xs opacity-65 mt-1 line-clamp-2">{product.detail}</p>
                          <div className="flex items-center justify-between mt-4 pt-2 border-t border-black/5 dark:border-white/5">
                            <span className="font-black text-sm">₹{product.price.toLocaleString('en-IN')}</span>
                            <button
                              type="button"
                              onClick={() => handleAddToCart(product, index)}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold text-black"
                              style={{ backgroundColor: currentAccent }}
                            >
                              Move to {template.id === 'fresh-crate' ? 'crate' : 'bag'}
                            </button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className={`max-w-md mx-auto rounded-2xl border p-8 text-center space-y-3 ${
                    isDarkTemplate ? 'bg-white/5 border-white/10' : 'bg-white border-black/10'
                  }`}>
                    <Heart size={24} className="mx-auto text-neutral-400" />
                    <h3 className="font-bold text-base">Your wishlist is empty</h3>
                    <p className="text-xs opacity-70">
                      Tap the heart icon on any produce or item to save it for later.
                    </p>
                    <button
                      type="button"
                      onClick={() => navigateToSection('shop')}
                      className="mt-2 px-5 py-2 rounded-xl text-xs font-bold text-black cursor-pointer shadow-xs"
                      style={{ backgroundColor: currentAccent }}
                    >
                      Browse Harvest
                    </button>
                  </div>
                )}
              </section>
            )}

            {/* SECTION: GENERIC OTHER STOREFRONT PAGES */}
            {!['home', 'shop', 'cart', 'checkout', 'wishlist'].some((k) => activeSection.includes(k)) && (
              <section className={`py-10 max-w-4xl mx-auto relative z-10 flex-1 w-full ${isMobile ? 'px-4' : 'px-6 sm:px-12'}`}>
                <div className="text-center mb-8">
                  <span className="font-mono text-[10px] uppercase tracking-widest font-bold" style={{ color: currentAccent }}>
                    {template.name}
                  </span>
                  <h2 className={`text-2xl sm:text-3xl font-black mt-1 capitalize ${isDarkTemplate ? 'text-white' : 'text-black'}`}>
                    {previewPages.find((page) => page.id === activeSection)?.title || activeSection.replace(/-/g, ' ')}
                  </h2>
                  <p className="mx-auto mt-2 max-w-xl text-xs sm:text-sm text-neutral-400">
                    {previewPages.find((page) => page.id === activeSection)?.description || template.description}
                  </p>
                </div>

                <div className={`p-6 rounded-2xl border space-y-4 ${
                  isDarkTemplate ? 'bg-white/5 border-white/10' : 'bg-white border-black/10'
                }`}>
                  <p className="text-xs sm:text-sm leading-relaxed opacity-85">
                    {previewPages.find((page) => page.id === activeSection)?.description}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    {template.features.slice(0, 4).map((f) => (
                      <div key={f} className="p-3 rounded-xl border border-black/10 dark:border-white/10 flex items-center gap-2">
                        <CheckCircle2 size={15} style={{ color: currentAccent }} />
                        <span className="text-xs font-bold">{f}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-8 text-center flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => navigateToSection('shop')}
                    className="px-5 py-2.5 rounded-full text-xs font-bold text-black shadow-xs cursor-pointer"
                    style={{ backgroundColor: currentAccent }}
                  >
                    Explore Shop
                  </button>
                  <Link 
                    href={`/editor/${template.id}`} 
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-xs font-bold border border-black/20 dark:border-white/20 hover:scale-103 transition-transform"
                  >
                    <span>Customize this page in Studio</span>
                  </Link>
                </div>
              </section>
            )}

            {/* In-Preview Interactive Toast Notification */}
            {toastMessage && (
              <div className="sticky bottom-4 z-40 mx-auto px-4 py-2 rounded-xl bg-ink text-background border-2 border-black font-display text-xs font-bold shadow-brutal-sm flex items-center gap-2 animate-bounce">
                <CheckCircle2 size={14} className="text-green-400 stroke-[3]" />
                <span>{toastMessage}</span>
              </div>
            )}

            {/* Template Bottom Footer */}
            <footer className={`mt-auto px-6 py-8 border-t text-center text-xs relative z-10 ${
              isDarkTemplate 
                ? 'bg-[#0a0b12] border-white/10 text-neutral-400' 
                : 'bg-white border-black/5 text-[#8A8A8A]'
            }`}>
              <div className={`flex flex-wrap items-center justify-center gap-2 mb-2 font-bold ${
                isDarkTemplate ? 'text-white' : 'text-[#171717]'
              }`}>
                <span>{template.name}</span>
                <span>•</span>
                <span>Powered by Launchly Studio</span>
              </div>
              <p className="text-[11px] opacity-75">
                © {new Date().getFullYear()} All rights reserved. Full responsive preview with live interactions.
              </p>
            </footer>
          </div>
        </div>
      </div>

      {/* Quick View Product Modal inside Sandbox */}
      {quickViewProduct && (
        <div 
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          onClick={() => setQuickViewProduct(null)}
        >
          <div 
            className="w-full max-w-lg bg-card border-[3.5px] border-ink rounded-3xl p-6 shadow-brutal-lg text-ink space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b-2 border-ink/20">
              <span className="font-mono text-xs font-black uppercase text-pink">
                {quickViewProduct.product.category}
              </span>
              <button
                type="button"
                onClick={() => setQuickViewProduct(null)}
                className="brutal-press h-8 w-8 rounded-xl border-2 border-ink bg-card text-ink flex items-center justify-center cursor-pointer shadow-brutal-xs"
              >
                <X size={15} className="stroke-[2.5]" />
              </button>
            </div>

            <div className="h-48 rounded-2xl overflow-hidden border-2 border-ink">
              <PreviewProductArt fresh={template.id === 'fresh-crate'} index={quickViewProduct.index} />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-black">{quickViewProduct.product.name}</h3>
                <span className="font-display text-lg font-black">₹{quickViewProduct.product.price.toLocaleString('en-IN')}</span>
              </div>
              <p className="text-xs font-mono text-muted-foreground mt-2 leading-relaxed">
                {quickViewProduct.product.detail}
              </p>
            </div>

            <div className="pt-2 flex gap-2.5">
              <button
                type="button"
                onClick={() => {
                  handleAddToCart(quickViewProduct.product, quickViewProduct.index);
                  setQuickViewProduct(null);
                }}
                className="flex-1 py-3 rounded-xl font-display text-xs font-black uppercase tracking-wider text-black bg-pink border-2 border-ink shadow-brutal-xs hover:bg-yellow transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Plus size={14} className="stroke-[3]" />
                <span>Add to {template.id === 'fresh-crate' ? 'crate' : 'bag'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  toggleWishlist(quickViewProduct.product.name);
                  setQuickViewProduct(null);
                }}
                className="py-3 px-4 rounded-xl border-2 border-ink font-display text-xs font-black cursor-pointer shadow-brutal-xs bg-card"
              >
                <Heart size={15} className={wishlist.includes(quickViewProduct.product.name) ? 'text-pink-500 fill-pink-500' : ''} />
              </button>
            </div>
          </div>
        </div>
      )}

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
              {!authResolved ? (
                <button type="button" disabled className="w-full py-2.5 px-4 rounded-xl border-2 border-ink bg-background font-display text-xs font-black uppercase text-muted-foreground disabled:opacity-60">
                  Checking plan…
                </button>
              ) : isPro ? (
                <a
                  href={`${template.sourceCodeUrl || `/api/templates/${template.id}/source`}?format=download`}
                  className="brutal-press w-full py-2.5 px-4 rounded-xl font-display text-xs font-black uppercase tracking-wider text-black bg-pink border-2 border-ink shadow-brutal-xs hover:bg-yellow transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <Download size={14} className="stroke-[2.5]" />
                  <span>Download source code</span>
                </a>
              ) : (
                <Link
                  href={isAuthenticated ? '/dashboard' : '/login'}
                  className="brutal-press w-full py-2.5 px-4 rounded-xl font-display text-xs font-black uppercase tracking-wider text-black bg-yellow border-2 border-ink shadow-brutal-xs hover:bg-pink transition-colors flex items-center justify-center gap-2"
                >
                  <Lock size={14} />
                  <span>{isAuthenticated ? 'Upgrade to Pro for source code' : 'Sign in for Pro source code'}</span>
                </Link>
              )}
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

    </div>
  );
}
