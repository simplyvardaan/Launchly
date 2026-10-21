'use client';

import { use, useState, useEffect, useMemo } from 'react';
import type { ElementType } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  ArrowLeft, 
  Check, 
  Share2, 
  Edit3, 
  ArrowUpRight, 
  Star, 
  ChevronDown,
  Menu,
  X
  , Heart, Sparkles, Camera, CheckCircle2
} from 'lucide-react';
import { ALL_TEMPLATES, getTemplateById, TEMPLATES } from '@/lib/templates';
import { loadEditorDraft } from '@/lib/editorPersistence';
import { Template } from '@/types';
import type { Column, SiteElement } from '@/lib/siteDocument';
import SiteForm from '@/components/SiteForm';
import ImageCarousel from '@/components/ImageCarousel';
import StoreHeroArtwork from '@/components/storefront/StoreHeroArtwork';
import { getAnimationClass, resolveButtonHref, type ButtonTarget } from '@/lib/elementActions';
import { createStorefrontPages } from '@/lib/templateContent';
import { normalizeAnchorId, scrollToAnchor as scrollToResolvedAnchor } from '@/lib/navigation';
import { elementVisualStyle } from '@/lib/elementVisualStyle';

type LivePageSection = { id: string; type: string; name: string; content?: Record<string, unknown>; style?: Record<string, unknown>; columns?: Column[]; hidden?: Partial<Record<'desktop' | 'tablet' | 'mobile', boolean>>; anchorId?: string };
type LivePage = { id: string; title: string; description: string; slug?: string; isHome?: boolean; showInMenu?: boolean; oldSlugs?: string[]; sections?: LivePageSection[] };
type LiveMenuItem = { id: string; label: string; target: { type: 'page' | 'url' | 'anchor'; value: string }; newTab?: boolean; children?: LiveMenuItem[] };

function normalizeLivePagePath(value: string | undefined): string {
  const clean = String(value || '').trim().replace(/^\/+|\/+$/g, '');
  return clean ? `/${clean}` : '/';
}

function resolveLiveElementHref(value: string, pages: LivePage[], subdomain: string, previewSuffix = ''): string {
  if (value.startsWith('#') || /^(https?:|mailto:|tel:|data:)/i.test(value)) return value;
  if (!value.startsWith('/')) return '#';
  const rawPath = (value.replace(/^\/live\/[^/]+/i, '').split(/[?#]/, 1)[0] || '/');
  const path = normalizeLivePagePath(rawPath);
  const page = pages.find((entry) => normalizeLivePagePath(entry.slug) === path || entry.id === rawPath.replace(/^\/+/, ''));
  const resolvedPath = page?.isHome ? '' : normalizeLivePagePath(page?.slug || rawPath);
  return `/live/${subdomain}${resolvedPath}${previewSuffix}`;
}

/**
 * Saved editor drafts can be older, partial documents. Keep all saved changes,
 * but restore any starter sections that are missing so preview and the editor
 * always render the same complete page.
 */
function completeStoreSections(saved: LivePageSection[] | undefined, defaults: LivePageSection[] | undefined): LivePageSection[] {
  if (!saved?.length) return defaults || [];
  if (!defaults?.length) return saved;

  const defaultById = new Map(defaults.map((section) => [section.id, section]));
  const usedDefaults = new Set<string>();
  const merged = saved.map((section) => {
    const starter = defaultById.get(section.id);
    if (!starter) return section;
    usedDefaults.add(starter.id);
    const starterItems = starter.content?.items;
    const savedItems = section.content?.items;
    const mergedItems = Array.isArray(starterItems) && Array.isArray(savedItems)
      ? [...savedItems, ...starterItems.filter((defaultItem) => {
          if (typeof defaultItem !== 'object' || defaultItem === null) return true;
          const defaultRecord = defaultItem as Record<string, unknown>;
          const defaultKey = defaultRecord.id || defaultRecord.name || defaultRecord.title || defaultRecord.question;
          return !savedItems.some((savedItem) => {
            if (typeof savedItem !== 'object' || savedItem === null) return false;
            const savedRecord = savedItem as Record<string, unknown>;
            const savedKey = savedRecord.id || savedRecord.name || savedRecord.title || savedRecord.question;
            return defaultKey !== undefined && defaultKey === savedKey;
          });
        })]
      : undefined;
    return {
      ...starter,
      ...section,
      content: { ...(starter.content || {}), ...(section.content || {}), ...(mergedItems ? { items: mergedItems } : {}) },
      style: { ...(starter.style || {}), ...(section.style || {}) },
    };
  });

  // Append missing starter sections in their authored order. This preserves
  // the user's section order while preventing a stale draft from blanking the
  // rest of a template.
  return [...merged, ...defaults.filter((section) => !usedDefaults.has(section.id) && !saved.some((entry) => entry.id === section.id))];
}

function LiveTreeElement({ element, pages, subdomain, previewSuffix = '', onOpenCart, cartCount = 0 }: { element: SiteElement; pages: LivePage[]; subdomain: string; previewSuffix?: string; onOpenCart?: () => void; cartCount?: number }) {
  const style: React.CSSProperties = { ...elementVisualStyle(element.style), marginLeft: element.style.textAlign === 'center' || element.style.textAlign === 'right' ? 'auto' : undefined, marginRight: element.style.textAlign === 'center' || element.style.textAlign === 'left' ? 'auto' : undefined };
  const text = String(element.content.text || element.content.title || '');
  switch (element.type) {
    case 'heading': { const Heading = `h${Math.max(1, Math.min(6, Number(element.content.level) || 2))}` as ElementType; return <Heading style={style} className="text-3xl font-black">{text || 'Heading'}</Heading>; }
    case 'text': return <p style={style} className="whitespace-pre-wrap leading-relaxed">{text}</p>;
    case 'button': { const target = String(element.content.linkTarget || 'url') as ButtonTarget; const value = String(element.content.linkValue || element.content.href || ''); const resolved = resolveButtonHref(target, value, pages, `/live/${subdomain}`); const href = resolveLiveElementHref(resolved, pages, subdomain, previewSuffix); return <a href={href} download={target === 'download' ? String(element.content.downloadName || '') || undefined : undefined} target={element.content.newTab ? '_blank' : undefined} rel={element.content.newTab ? 'noreferrer' : undefined} aria-label={String(element.content.ariaLabel || '') || undefined} style={style} className="inline-flex rounded-xl px-5 py-3 font-bold">{text || 'Button'}</a>; }
    case 'form': return <SiteForm id={element.id} content={element.content} style={style} />;
    case 'image': return typeof element.content.src === 'string' && element.content.src ? <Image src={element.content.src} alt={String(element.content.alt || 'Site image')} width={1200} height={900} unoptimized className="w-full rounded-xl object-cover" /> : <div style={style} className="flex min-h-40 items-center justify-center rounded-xl border border-dashed border-current/30 bg-current/5 p-6 text-center text-sm opacity-70">Add an image in the editor</div>;
    case 'icon': return typeof element.content.src === 'string' && element.content.src ? <Image src={element.content.src} alt={String(element.content.alt || '')} width={256} height={256} unoptimized style={style} className="h-12 w-12 object-contain" /> : <span aria-hidden="true" style={style} className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100">✦</span>;
    case 'video': return typeof element.content.src === 'string' && element.content.src ? <video controls src={element.content.src} className="w-full rounded-xl" /> : <div style={style} className="flex min-h-40 items-center justify-center rounded-xl border border-dashed border-current/30 bg-current/5 p-6 text-center text-sm opacity-70">Add a video URL in the editor</div>;
    case 'divider': return <hr style={{ borderColor: element.style.borderColor || '#111', borderWidth: element.style.borderWidth || 1 }} />;
    case 'spacer': return <div style={{ height: Number(element.content.height || 48) }} />;
    case 'list': return <ul style={style} className="list-inside list-disc space-y-1">{(Array.isArray(element.content.items) ? element.content.items : []).map((item, index) => <li key={index}>{String(item)}</li>)}</ul>;
    case 'card': return <article style={style} className="rounded-xl border p-5"><h3 className="font-bold">{String(element.content.title || 'Card title')}</h3><p className="mt-2">{String(element.content.description || '')}</p></article>;
    case 'gallery': return <ImageCarousel images={(Array.isArray(element.content.images) ? element.content.images : []).filter((src): src is string => typeof src === 'string')} carousel={Boolean(element.content.carousel)} autoplay={Boolean(element.content.autoplay)} intervalMs={Number(element.content.intervalMs) || 4000} className="w-full" />;
    case 'quote': return <blockquote style={style} className="border-l-4 border-pink py-2 pl-4 text-xl italic">“{text || 'A memorable quote.'}”{Boolean(element.content.attribution) && <cite className="mt-2 block text-sm not-italic">— {String(element.content.attribution)}</cite>}</blockquote>;
    case 'badge': return <span style={style} className="inline-flex rounded-full border border-black/20 bg-yellow px-3 py-1 font-mono text-xs font-bold">{text || 'Badge'}</span>;
    case 'numbered-list': return <ol style={style} className="list-inside list-decimal space-y-1">{(Array.isArray(element.content.items) ? element.content.items : []).map((item, index) => <li key={index}>{String(item)}</li>)}</ol>;
    case 'image-caption': return typeof element.content.src === 'string' && element.content.src ? <figure><Image src={element.content.src} alt={String(element.content.alt || 'Site image')} width={1200} height={900} unoptimized className="w-full rounded-xl object-cover"/><figcaption className="mt-2 text-sm opacity-75">{String(element.content.caption || 'Image caption')}</figcaption></figure> : <figure style={style} className="rounded-xl border border-dashed border-current/30 bg-current/5 p-6 text-center"><div className="text-sm opacity-70">Add an image in the editor</div><figcaption className="mt-2 text-sm opacity-70">{String(element.content.caption || 'Image caption')}</figcaption></figure>;
    case 'anchor': return <span id={element.anchorId || String(element.content.id || '')} className="sr-only">Anchor</span>;
    case 'accordion': return <div className="divide-y divide-black/15">{(Array.isArray(element.content.items) ? element.content.items as Array<Record<string, unknown>> : []).map((item, index) => <details key={index} className="py-3"><summary className="cursor-pointer font-bold">{String(item.title || `Question ${index + 1}`)}</summary><p className="mt-2 text-sm opacity-75">{String(item.description || '')}</p></details>)}</div>;
    case 'tabs': return <LiveTabs items={Array.isArray(element.content.items) ? element.content.items as Array<Record<string, unknown>> : []}/>;
    case 'social-links': return <div className="flex flex-wrap gap-3">{(Array.isArray(element.content.items) ? element.content.items as Array<Record<string, unknown>> : []).map((item, index) => <a key={index} href={String(item.url || '#')} className="font-bold underline">{String(item.title || `Social ${index + 1}`)}</a>)}</div>;
    case 'block': {
      const kind = `${String(element.content.blockType || '')} ${String(element.content.title || '')}`.toLowerCase();
      const items = Array.isArray(element.content.items) ? element.content.items as Array<Record<string, unknown>> : [];
      const heading = String(element.content.title || element.content.blockType || 'Content block');
      const actionLabel = String(element.content.buttonText || element.content.cta || '').trim();
      const rawActionHref = String(element.content.href || '').trim();
      const actionHref = /^(https?:\/\/|mailto:|tel:|\/|#)/i.test(rawActionHref) ? rawActionHref : '';
      if (/cart|shopping bag|mini cart|cart drawer|cart modal/.test(kind)) return <section style={style} className="rounded-2xl border-2 border-current/20 p-4"><div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-black">{heading}</h2><p className="mt-1 text-sm opacity-70">{cartCount} item{cartCount === 1 ? '' : 's'} in your bag</p></div><button type="button" onClick={() => onOpenCart ? onOpenCart() : window.dispatchEvent(new CustomEvent('launchly:open-cart'))} className="rounded-lg border-2 border-current px-4 py-2 text-sm font-bold">{actionLabel || 'Open cart'}</button></div></section>;
       if (/sidebar menu|navbar|navigation menu|mega menu|dropdown menu|flyout menu|footer menu|mobile menu/.test(kind)) {
        const configured: Array<Record<string, unknown>> = items.length ? items : pages.filter((page) => page.showInMenu !== false).map((page) => ({ title: page.title, href: `/live/${subdomain}${page.isHome ? '' : normalizeLivePagePath(page.slug || page.id)}${previewSuffix}` }));
        const vertical = kind.includes('sidebar') || kind.includes('footer');
        return <nav aria-label={heading} style={style} className={`rounded-xl border border-current/15 p-4 ${vertical ? 'max-w-xs' : 'overflow-x-auto'}`}><p className="mb-3 font-mono text-[10px] font-bold uppercase tracking-wider opacity-60">{heading}</p><ul className={vertical ? 'space-y-1' : 'flex min-w-max items-center gap-2'}>{configured.map((item, index) => { const rawHref = String(item.href || item.url || '#'); const href = resolveLiveElementHref(rawHref, pages, subdomain, previewSuffix); return <li key={index}><a href={href} className={`block rounded-lg px-3 py-2 text-sm font-semibold transition-colors hover:bg-black/10 ${vertical ? 'w-full' : 'whitespace-nowrap'}`}>{String(item.title || item.label || `Page ${index + 1}`)}</a></li>; })}</ul></nav>;
      }
      if (kind.includes('faq') || kind.includes('accordion')) return <section style={style} className="mx-auto max-w-3xl py-4"><h2 className="mb-5 text-2xl font-black">{heading}</h2><div className="divide-y divide-black/15 border-y border-black/15">{items.map((item,index) => <details key={index} className="group py-4" open={index === 0}><summary className="cursor-pointer list-none font-bold">{String(item.title || `Question ${index + 1}`)}<span aria-hidden="true" className="float-right group-open:rotate-45">＋</span></summary><p className="mt-3 leading-relaxed opacity-75">{String(item.description || item.answer || '')}</p></details>)}</div></section>;
      if (kind.includes('pricing') || kind.includes('plan comparison')) return <section style={style} className="py-5"><h2 className="text-center text-2xl font-black">{heading}</h2>{Boolean(element.content.description) && <p className="mx-auto mt-2 max-w-2xl text-center opacity-75">{String(element.content.description)}</p>}<div className="mt-6 grid gap-4 md:grid-cols-3">{items.map((item,index) => <article key={index} className={`rounded-2xl border-2 p-5 ${item.highlighted ? 'border-black bg-yellow shadow-[4px_4px_0_#000]' : 'border-black/15 bg-white text-black'}`}><h3 className="text-lg font-black">{String(item.title || `Plan ${index + 1}`)}</h3><p className="mt-3 text-3xl font-black">{String(item.price || 'Contact us')}<small className="ml-1 text-xs font-normal">{String(item.interval || '')}</small></p><p className="mt-2 text-sm opacity-75">{String(item.description || '')}</p><ul className="mt-4 space-y-2 text-sm">{(Array.isArray(item.features) ? item.features : []).map((feature,featureIndex) => <li key={featureIndex}>✓ {String(feature)}</li>)}</ul><a href={String(item.href || '#contact')} className="mt-5 inline-flex rounded-lg border-2 border-black bg-white px-4 py-2 text-sm font-bold text-black">{String(item.buttonText || 'Choose plan')}</a></article>)}</div></section>;
      if (kind.includes('testimonial') || kind.includes('review')) return <section style={style} className="py-5"><h2 className="text-center text-2xl font-black">{heading}</h2><div className="mt-6 grid gap-4 md:grid-cols-2">{items.map((item,index) => <figure key={index} className="rounded-2xl border-2 border-black/15 bg-white p-5 text-black"><div aria-label={`${Number(item.rating || 5)} out of 5 stars`} className="text-lg text-amber-500">{'★'.repeat(Math.max(1, Math.min(5, Number(item.rating || 5))))}</div><blockquote className="mt-3 leading-relaxed">“{String(item.quote || item.description || item.desc || '')}”</blockquote><figcaption className="mt-4 border-t border-black/10 pt-3"><strong>{String(item.name || item.title || `Customer ${index + 1}`)}</strong>{Boolean(item.role) && <span className="ml-2 text-sm text-neutral-500">{String(item.role)}</span>}</figcaption></figure>)}</div></section>;
      if (kind.includes('stat') || kind.includes('counter') || kind.includes('kpi')) return <section style={style} className="py-5"><h2 className="text-center text-2xl font-black">{heading}</h2><div className="mt-6 grid gap-4 sm:grid-cols-3">{items.map((item,index) => <article key={index} className="rounded-2xl border-2 border-black/15 bg-white p-5 text-center text-black"><p className="text-3xl font-black text-pink-600">{String(item.value || item.number || '0')}</p><p className="mt-1 font-mono text-xs uppercase tracking-wide text-neutral-500">{String(item.label || item.title || `Result ${index + 1}`)}</p></article>)}</div></section>;
      if (kind.includes('timeline') || kind.includes('steps') || kind.includes('process')) return <section style={style} className="py-5"><h2 className="text-2xl font-black">{heading}</h2><ol className="mt-5 space-y-4 border-l-2 border-pink pl-5">{items.map((item,index) => <li key={index} className="relative rounded-xl border border-black/10 bg-white p-4 text-black before:absolute before:-left-[1.65rem] before:top-5 before:h-3 before:w-3 before:rounded-full before:border-2 before:border-black before:bg-yellow"><span className="font-mono text-[10px] font-bold uppercase text-neutral-500">{String(item.date || `Step ${index + 1}`)}</span><h3 className="mt-1 font-bold">{String(item.title || item.name || 'Milestone')}</h3><p className="mt-1 text-sm text-neutral-600">{String(item.description || item.desc || '')}</p></li>)}</ol></section>;
      return <article style={style} className="overflow-hidden rounded-2xl border-2 border-black/15 bg-white text-black"><header className="border-b border-black/10 px-5 py-4"><h2 className="text-lg font-black">{heading}</h2>{Boolean(element.content.description) && <p className="mt-1 text-sm text-neutral-600">{String(element.content.description)}</p>}</header>{actionLabel && actionHref && <div className="px-5 pt-4"><a href={actionHref} className="inline-flex rounded-lg border-2 border-black bg-yellow px-4 py-2 font-bold text-black shadow-[2px_2px_0_#000]">{actionLabel} <span aria-hidden="true" className="ml-2">↗</span></a></div>}{items.length > 0 && <div className="grid gap-3 p-4 sm:grid-cols-2">{items.map((item,index) => <article key={index} className="rounded-xl border border-black/10 bg-neutral-50 p-3"><h3 className="font-bold">{String(item.title || item.name || `Item ${index + 1}`)}</h3><p className="mt-1 text-sm leading-relaxed text-neutral-600">{String(item.description || item.desc || item.quote || '')}</p>{typeof item.value === 'number' && <p className="mt-2 font-mono text-lg font-black">{item.value}{item.value <= 100 ? '%' : ''}</p>}</article>)}</div>}</article>;
    }
    case 'form': return <form className="grid max-w-xl gap-3" onSubmit={(event) => event.preventDefault()}><input required placeholder="Your name" className="rounded-lg border px-3 py-2" /><input required type="email" placeholder="Email address" className="rounded-lg border px-3 py-2" /><textarea required rows={4} placeholder="Message" className="rounded-lg border px-3 py-2" /><button style={style} className="rounded-lg bg-yellow px-4 py-2 font-bold">{text || 'Send message'}</button></form>;
    default: {
      const fallbackTitle = text || element.name || element.type.replace(/[-_]/g, ' ');
      const fallbackDescription = typeof element.content.description === 'string'
        ? element.content.description
        : 'Explore this section and learn more.';
      return <article style={style} className="rounded-xl border border-current/15 p-5">
        <h2 className="text-lg font-black capitalize">{fallbackTitle}</h2>
        <p className="mt-2 opacity-75">{fallbackDescription}</p>
      </article>;
    }
  }
}

function LiveTabs({ items }: { items: Array<Record<string, unknown>> }) {
  const [active, setActive] = useState(0);
  return <div><div role="tablist" className="flex flex-wrap gap-2">{items.map((item, index) => <button key={index} type="button" role="tab" aria-selected={active === index} onClick={() => setActive(index)} className={`rounded-lg border border-black px-3 py-1.5 text-sm font-bold ${active === index ? 'bg-yellow text-black' : 'bg-white text-black'}`}>{String(item.title || `Tab ${index + 1}`)}</button>)}</div><div role="tabpanel" className="mt-3 rounded-lg bg-neutral-100/70 p-3 text-sm">{String(items[active]?.description || 'Tab content')}</div></div>;
}

function StoreProductArtwork({ fresh, index, name, category, isKuro }: { fresh: boolean; index: number; name: string; category: string; isKuro?: boolean }) {
  const palette = isKuro
    ? [['#F59E0B', '#E4E4E7', '#18181B'], ['#E4E4E7', '#71717A', '#121214'], ['#F59E0B', '#71717A', '#27272A']][index % 3]
    : fresh
    ? [['#3FA34D', '#B8D883', '#F4A93B'], ['#E76F51', '#F6BD60', '#8ABF57'], ['#8ABF57', '#D7E9A4', '#D99C72']][index % 3]
    : [['#C6FF3D', '#7C5CFF', '#273044'], ['#7C5CFF', '#5C6C8A', '#C6FF3D'], ['#40D9E8', '#7C5CFF', '#273044']][index % 3];
  const [accent, secondary, shadow] = palette;
  const device = index % 5;
  return <svg viewBox="0 0 640 460" role="img" aria-label={`${name}, ${category}`} className="h-full w-full" preserveAspectRatio="xMidYMid slice">
    <defs><linearGradient id={`product-bg-${isKuro ? 'k' : fresh ? 'f' : 'v'}-${index}`} x1="0" x2="1" y1="0" y2="1"><stop stopColor={isKuro ? '#18181B' : fresh ? '#FFF8EC' : '#202532'}/><stop offset="1" stopColor={isKuro ? '#09090B' : fresh ? '#E6EFD9' : '#11141C'}/></linearGradient><filter id={`product-shadow-${index}`} x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="0" dy="18" stdDeviation="16" floodColor={isKuro ? '#000' : fresh ? '#1F2A1B' : '#000'} floodOpacity={isKuro ? '.45' : '.18'}/></filter></defs>
    <rect width="640" height="460" fill={`url(#product-bg-${isKuro ? 'k' : fresh ? 'f' : 'v'}-${index})`}/><circle cx="510" cy="82" r="118" fill={secondary} opacity={isKuro ? '.08' : '.18'}/><circle cx="100" cy="390" r="150" fill={accent} opacity={isKuro ? '.08' : '.13'}/>
    {isKuro ? <g filter={`url(#product-shadow-${index})`}>
      <rect x="120" y="70" width="400" height="320" rx="20" fill="#121214" stroke="#27272A" strokeWidth="2"/>
      <line x1="120" y1="130" x2="520" y2="130" stroke="#27272A" strokeWidth="1.5"/>
      <circle cx="150" cy="100" r="5" fill="#EF4444"/>
      <circle cx="168" cy="100" r="5" fill="#F59E0B"/>
      <circle cx="186" cy="100" r="5" fill="#10B981"/>
      <text x="210" y="105" fontFamily="monospace" fontSize="11" fill="#71717A">CASE ARCHIVE // 2026</text>
      <rect x="160" y="160" width="320" height="150" rx="12" fill="#1C1C20" stroke={accent} strokeWidth="1.5" strokeDasharray="4 4"/>
      <circle cx="320" cy="235" r="46" fill="none" stroke={accent} strokeWidth="2"/>
      <line x1="320" y1="180" x2="320" y2="290" stroke={accent} strokeWidth="1.5" opacity=".6"/>
      <line x1="265" y1="235" x2="375" y2="235" stroke={accent} strokeWidth="1.5" opacity=".6"/>
      <text x="320" y="345" textAnchor="middle" fontFamily="sans-serif" fontSize="14" fontWeight="800" fill="#F4F4F5" letterSpacing="0.1em">{name.toUpperCase()}</text>
      <text x="320" y="365" textAnchor="middle" fontFamily="monospace" fontSize="10" fill="#A1A1AA" letterSpacing="0.15em">{category.toUpperCase()}</text>
    </g> : fresh ? <g filter={`url(#product-shadow-${index})`}>
      <ellipse cx="320" cy="352" rx="190" ry="34" fill={shadow} opacity=".22"/>
      <path d="M170 170h300l-30 176H200z" fill="#B77942"/><path d="M180 198h280l-20 120H200z" fill="#D89A58"/><path d="M190 220h260" stroke="#A86639" strokeWidth="12"/><path d="M210 172c4-62 40-89 70-24 21-94 64-97 78-5 37-62 72-40 72 29" fill="none" stroke={accent} strokeWidth="18" strokeLinecap="round"/>
      {[['#E76F51',240,230],['#F4A93B',320,236],['#8ABF57',400,228],['#7BAE4B',275,288],['#D95245',355,292]].map(([color,cx,cy], item) => <g key={item}><circle cx={cx as number} cy={cy as number} r={item===2?34:29} fill={color as string}/><path d={`M${Number(cx)-4} ${Number(cy)-27}q-2-18 15-22`} fill="none" stroke="#477B3D" strokeWidth="7" strokeLinecap="round"/></g>)}
      <path d="M164 170h312" stroke="#714A2E" strokeWidth="13" strokeLinecap="round"/>
    </g> : <g filter={`url(#product-shadow-${index})`}>
      {device === 0 && <><path d="M235 270v-54c0-70 38-112 85-112s85 42 85 112v54" fill="none" stroke={accent} strokeWidth="28" strokeLinecap="round"/><rect x="205" y="235" width="62" height="105" rx="26" fill="#30384A" stroke={accent} strokeWidth="10"/><rect x="373" y="235" width="62" height="105" rx="26" fill="#30384A" stroke={accent} strokeWidth="10"/></>}
      {device === 1 && <><rect x="145" y="190" width="350" height="138" rx="22" fill="#252C3B" stroke={accent} strokeWidth="8"/>{Array.from({length: 5},(_,row)=>Array.from({length: 12},(_,col)=><rect key={`${row}-${col}`} x={166+col*27} y={211+row*21} width="17" height="11" rx="4" fill={(row+col)%5===0?secondary:'#737D92'} opacity={(row+col)%5===0?'.9':'.65'}/>))}<rect x="260" y="339" width="120" height="13" rx="6" fill={accent}/></>}
      {device === 2 && <><rect x="183" y="85" width="274" height="230" rx="18" fill="#181D28" stroke={accent} strokeWidth="9"/><rect x="200" y="103" width="240" height="190" rx="8" fill={`url(#product-bg-v-${index})`}/><path d="M320 316v43m-70 12h140" stroke="#929CB0" strokeWidth="15" strokeLinecap="round"/><path d="M230 257l48-68 45 48 35-37 50 57" fill="none" stroke={secondary} strokeWidth="12" strokeLinejoin="round"/></>}
      {device === 3 && <><path d="M320 105c-67 0-105 51-105 122 0 64 41 113 105 137 64-24 105-73 105-137 0-71-38-122-105-122z" fill="#252C3B" stroke={accent} strokeWidth="9"/><path d="M320 132v126" stroke={accent} strokeWidth="8" strokeLinecap="round"/><circle cx="320" cy="283" r="10" fill={secondary}/><path d="M252 170q-26 36 0 72m136-72q26 36 0 72" fill="none" stroke="#8892A7" strokeWidth="7" strokeLinecap="round"/></>}
      {device === 4 && <><rect x="220" y="130" width="200" height="200" rx="34" fill="#252C3B" stroke={accent} strokeWidth="9"/><rect x="243" y="153" width="154" height="154" rx="22" fill="#141923"/><path d="M270 253l32-32 26 25 43-52" fill="none" stroke={secondary} strokeWidth="10" strokeLinecap="round" strokeLinejoin="round"/><circle cx="320" cy="362" r="8" fill={accent}/></>}
    </g>}
    <rect x="28" y="28" width="72" height="28" rx="14" fill={isKuro ? '#18181B' : fresh ? '#FFFFFF' : '#151923'} opacity=".9"/><text x="64" y="47" textAnchor="middle" fontFamily="monospace" fontSize="12" fontWeight="700" fill={isKuro ? '#F59E0B' : fresh ? '#1F2A1B' : '#F5F7FA'}>{String(index+1).padStart(2,'0')} / {isKuro ? 'KURO' : fresh ? 'FRESH' : 'VOLT'}</text>
  </svg>;
}

function StoreCatalog({
  products,
  pages,
  subdomain,
  accent,
  isVolt,
  onAdd,
}: {
  products: Array<{ name: string; price: number; category: string; detail: string }>;
  pages: LivePage[];
  subdomain: string;
  accent: string;
  isVolt: boolean;
  onAdd: (product: { name: string; price: number; category: string; detail: string }) => void;
}) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const categories = ['All', ...new Set(products.map((product) => product.category))];
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = products.filter((product) => (category === 'All' || product.category === category)
    && (!normalizedQuery || `${product.name} ${product.category} ${product.detail}`.toLowerCase().includes(normalizedQuery)));
  const surface = isVolt ? 'border-white/10 bg-[#171B25] text-white' : 'border-[#1F2A1B]/10 bg-white text-[#1F2A1B]';
  const muted = isVolt ? 'text-white/55' : 'text-[#65705D]';
  return <div className="mt-6">
    <div className="mb-6 flex flex-col gap-3 sm:flex-row">
      <label className={`flex min-w-0 flex-1 items-center gap-2 rounded-xl border px-4 py-3 ${surface}`}>
        <span aria-hidden="true" className={muted}>⌕</span>
        <span className="sr-only">Search products</span>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search the collection" className={`min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:opacity-50 ${isVolt ? 'text-white' : 'text-[#1F2A1B]'}`} />
      </label>
      <label className={`rounded-xl border px-4 py-3 text-sm ${surface}`}>
        <span className="sr-only">Filter by category</span>
        <select value={category} onChange={(event) => setCategory(event.target.value)} className={`w-full bg-transparent outline-none ${isVolt ? 'text-white' : 'text-[#1F2A1B]'}`}>
          {categories.map((item) => <option key={item} value={item} className="bg-white text-black">{item === 'All' ? 'All categories' : item}</option>)}
        </select>
      </label>
    </div>
    <p className={`mb-4 font-mono text-xs ${muted}`} aria-live="polite">Showing {filtered.length} of {products.length} products</p>
    {filtered.length ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{filtered.map((product, index) => {
      const page = pages.find((entry) => entry.title === product.name);
      const href = page ? `/live/${subdomain}${page.slug || ''}` : '#';
      return <article key={product.name} className={`overflow-hidden rounded-2xl border transition-transform duration-300 hover:-translate-y-1 ${surface} ${isVolt ? 'shadow-[0_14px_36px_rgba(0,0,0,.3)]' : 'shadow-[0_12px_35px_rgba(31,42,27,.08)]'}`}>
        <a href={href} aria-label={`View ${product.name}`} className={`relative flex h-52 items-center justify-center overflow-hidden ${isVolt ? 'bg-[#202532]' : 'bg-[#E8F0DF]'}`}>
          <span aria-hidden="true" className={`absolute h-36 w-36 rounded-full blur-2xl ${isVolt ? 'bg-[#7C5CFF]/25' : 'bg-[#F4A93B]/25'}`} />
          <StoreProductArtwork fresh={!isVolt} index={index} name={product.name} category={product.category} />
        </a>
        <div className="p-5"><span className={`font-mono text-[9px] uppercase tracking-wider ${muted}`}>{product.category}</span><a href={href} className="mt-1 block rounded-sm font-display text-lg font-black outline-offset-2 focus-visible:outline focus-visible:outline-2" style={{ outlineColor: accent }}>{product.name}</a><p className={`mt-1 font-mono text-xs ${muted}`}>{product.detail}</p><div className="mt-5 flex items-center justify-between"><span className="font-display font-black">₹{product.price.toLocaleString('en-IN')}</span><button type="button" onClick={() => onAdd(product)} className={`rounded-full px-4 py-2 font-mono text-[10px] font-black transition-transform hover:scale-105 ${isVolt ? 'border border-[#C6FF3D] text-[#C6FF3D]' : 'border border-[#3FA34D]/30 text-[#286A32]'}`}>{isVolt ? 'Add to setup' : 'Add to crate'}</button></div></div>
      </article>;
    })}</div> : <div className={`rounded-2xl border border-dashed p-10 text-center ${surface}`}><h3 className="font-display text-xl font-black">No matching products</h3><p className={`mt-2 text-sm ${muted}`}>Try another search or category.</p><button type="button" onClick={() => { setQuery(''); setCategory('All'); }} className="mt-4 rounded-full px-4 py-2 font-bold text-black" style={{ backgroundColor: accent }}>Clear filters</button></div>}
  </div>;
}

function LiveTree({ columns, pages, subdomain, previewSuffix, onOpenCart, cartCount }: { columns: Column[]; pages: LivePage[]; subdomain: string; previewSuffix?: string; onOpenCart?: () => void; cartCount?: number }) {
  const effectivePreviewSuffix = previewSuffix ?? (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('preview') === '1' ? '?preview=1' : '');
  return <div className="grid grid-cols-12 gap-4">{columns.map((column) => <div key={column.id} className="min-w-0 space-y-4" style={{ gridColumn: `span ${column.width.desktop || 12} / span ${column.width.desktop || 12}`, backgroundColor: column.style.backgroundColor }}>{column.elements.filter((element) => !element.hidden?.desktop).map((element) => <div key={element.id} className={getAnimationClass(element.style.animation)}><LiveTreeElement element={element} pages={pages} subdomain={subdomain} previewSuffix={effectivePreviewSuffix} onOpenCart={onOpenCart} cartCount={cartCount} /></div>)}</div>)}</div>;
}

export default function LiveWebsitePage({
  params
}: {
  params: Promise<{ subdomain: string; slug?: string[] }>;
}) {
  const { subdomain, slug } = use(params);
  const routeSlug = slug?.join('/') || '';
  const template: Template = getTemplateById(subdomain.toLowerCase()) || ALL_TEMPLATES.find((entry) => entry.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') === subdomain.toLowerCase()) || TEMPLATES[0];
  const isFreshCrate = template.id === 'fresh-crate';
  const isVoltGear = template.id === 'volt-gear';
  const isKuroCraft = template.id === 'kuro-craft';
  const isBrandedStore = isFreshCrate || isVoltGear || isKuroCraft;
  const storeProducts = useMemo(() => template.products || [], [template.products]);
  const initialStoreSections = useMemo(
    () => isBrandedStore ? createStorefrontPages(template.id, template.pages, storeProducts)[0]?.sections : undefined,
    [isBrandedStore, storeProducts, template.id, template.pages],
  );
  const [copied, setCopied] = useState(false);
  const [bannerCollapsed, setBannerCollapsed] = useState(false);
  const [siteSections, setSiteSections] = useState<LivePageSection[]>(() => initialStoreSections || [
    { id: 'nav', name: 'Navigation', type: 'nav' },
    { id: 'hero', name: 'Hero', type: 'hero' },
    { id: 'gallery', name: 'Featured Products', type: 'gallery' },
    { id: 'features', name: 'Features', type: 'features' },
    { id: 'testimonials', name: 'Testimonials', type: 'testimonials' },
    { id: 'cta', name: 'Call to Action', type: 'cta' },
    { id: 'footer', name: 'Footer', type: 'footer' },
  ]);
  const [sectionSpacing, setSectionSpacing] = useState<Record<string, { top: number; bottom: number; left: number; right: number }>>({});
  const [canvasElements, setCanvasElements] = useState<Array<{ id: string; type: 'image' | 'icon'; name: string; src?: string; icon?: string; x: number; y: number; width: number; height: number }>>([]);
  const [sitePages, setSitePages] = useState<LivePage[]>([]);
  const [siteMenu, setSiteMenu] = useState<LiveMenuItem[]>([]);
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
  const [activePage, setActivePage] = useState('home');
  const [assetUrl, setAssetUrl] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [faviconUrl, setFaviconUrl] = useState('');
  const [customCss, setCustomCss] = useState('');
  const [isPreview, setIsPreview] = useState(false);
  const [watermarkRequired, setWatermarkRequired] = useState(false);
  const [previewWatermarkVisible, setPreviewWatermarkVisible] = useState(true);
  const [cartCount, setCartCount] = useState(0);
  const [cartItems, setCartItems] = useState<Array<{ name: string; price: number; category: string; detail: string; quantity: number }>>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [cartReady, setCartReady] = useState(false);
  const [formMessages, setFormMessages] = useState<Record<string, string>>({});
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(`launchly_cart_${subdomain}`) || '[]') as Array<{ name: string; price: number; category: string; detail: string; quantity: number }>;
      if (Array.isArray(saved)) {
        const validItems = saved.filter((item) => item && typeof item.name === 'string' && Number.isFinite(item.price) && Number.isFinite(item.quantity) && item.quantity > 0);
        setCartItems(validItems);
        setCartCount(validItems.reduce((total, item) => total + item.quantity, 0));
      }
    } catch { /* Start with an empty bag when stored data is unavailable. */ }
    setCartReady(true);
  }, [subdomain]);
  useEffect(() => {
    if (!cartReady) return;
    try { localStorage.setItem(`launchly_cart_${subdomain}`, JSON.stringify(cartItems)); } catch { /* The bag still works for this page view when storage is unavailable. */ }
  }, [cartItems, cartReady, subdomain]);
  useEffect(() => {
    if (!cartOpen) return;
    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setCartOpen(false); };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener('keydown', onKeyDown); };
  }, [cartOpen]);
  useEffect(() => {
    const openCart = () => setCartOpen(true);
    window.addEventListener('launchly:open-cart', openCart);
    return () => window.removeEventListener('launchly:open-cart', openCart);
  }, []);
  const addToBag = (product: { name: string; price: number; category: string; detail: string }) => {
    setCartItems((current) => {
      const existing = current.find((item) => item.name === product.name);
      return existing ? current.map((item) => item.name === product.name ? { ...item, quantity: item.quantity + 1 } : item) : [...current, { ...product, quantity: 1 }];
    });
    setCartCount((count) => count + 1);
  };
  const updateBagQuantity = (name: string, change: number) => {
    setCartItems((current) => current.flatMap((item) => item.name === name ? (item.quantity + change > 0 ? [{ ...item, quantity: item.quantity + change }] : []) : [item]));
    setCartCount((count) => Math.max(0, count + change));
  };
  const bagSubtotal = cartItems.reduce((total, item) => total + item.price * item.quantity, 0);
  const sectionOrder = (type: string) => Math.max(0, siteSections.findIndex((section) => section.type === type));
  const sectionVisible = (type: string) => siteSections.some((section) => section.type === type);
  const sectionName = (type: string, fallback: string) => siteSections.find((section) => section.type === type)?.name || fallback;
  const sectionPadding = (type: string) => {
    const spacing = sectionSpacing[siteSections.find((section) => section.type === type)?.id || ''];
    return spacing ? { paddingTop: `${spacing.top}px`, paddingBottom: `${spacing.bottom}px`, paddingLeft: `${spacing.left}px`, paddingRight: `${spacing.right}px` } : {};
  };
  const renderHomeExtras = () => siteSections
    .filter((section) => !['nav', 'hero', 'features', 'testimonials', 'cta', 'footer', 'announcement', 'product-grid'].includes(section.type) && !(section.type === 'gallery' && section.id === 'gallery') && !section.hidden?.desktop)
    .map((section) => {
      const content = section.content || {};
      const heading = [content.heading, content.title, section.name].find((value): value is string => typeof value === 'string' && value.length > 0) || section.type.replace(/[-_]/g, ' ');
      const description = [content.description, content.desc, content.subtitle].find((value): value is string => typeof value === 'string') || '';
      const items = Array.isArray(content.items) ? content.items.filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null) : [];
      if (section.type === 'announcement') return <aside key={section.id} className="px-5 py-3 text-center text-sm font-semibold" style={{ backgroundColor: theme.primaryColor, color: isVoltGear ? '#0B0D12' : '#1F2A1B' }}><p>{String(content.text || description || 'A fresh note from our team.')} {typeof content.linkLabel === 'string' && <a className="ml-2 underline underline-offset-4" href={isFreshCrate ? `/live/${subdomain}/delivery-areas` : `/live/${subdomain}/deals`}>{content.linkLabel}<span aria-hidden="true"> ↗</span></a>}</p></aside>;
      return <section key={section.id} id={section.anchorId || section.id} className="px-5 py-12 sm:px-12" style={{ order: sectionOrder(section.type), display: sectionVisible(section.type) ? undefined : 'none', backgroundColor: typeof section.style?.backgroundColor === 'string' ? section.style.backgroundColor : undefined, color: theme.textColor, ...sectionPadding(section.type) }}><div className="mx-auto max-w-5xl"><h2 className="text-2xl font-black sm:text-4xl">{heading}</h2>{description && <p className="mt-3 max-w-3xl leading-relaxed opacity-75">{description}</p>}
        {section.type === 'custom' ? <LiveTree columns={section.columns || []} pages={sitePages} subdomain={subdomain} onOpenCart={() => setCartOpen(true)} cartCount={cartCount} />
          : section.type === 'logo-cloud' ? <div className="mt-6 flex flex-wrap items-center justify-center gap-5">{items.map((item, index) => <div key={index} className="flex h-20 min-w-32 items-center justify-center rounded-xl border border-black/10 bg-white px-5">{typeof item.image === 'string' && item.image ? <Image src={item.image} alt={String(item.title || 'Partner logo')} width={180} height={72} unoptimized className="max-h-12 w-auto object-contain"/> : <span className="font-bold text-neutral-500">{String(item.title || `Partner ${index + 1}`)}</span>}</div>)}</div>
          : section.type === 'breadcrumbs' ? <nav aria-label="Breadcrumb" className="mt-5 flex items-center gap-2 font-mono text-xs"><a href={`/live/${subdomain}`} className="underline">Home</a><span aria-hidden="true">/</span><span>{String(content.currentPage || section.name)}</span></nav>
          : section.type === 'not-found' ? <div className="mt-6 rounded-xl border border-black/10 bg-white p-6 text-center"><p className="text-6xl font-black" style={{ color: theme.primaryColor }}>404</p><p className="mt-2 opacity-75">{description}</p><a href={`/live/${subdomain}`} className="mt-5 inline-flex rounded-lg px-4 py-2 font-bold text-black" style={{ backgroundColor: theme.primaryColor }}>{String(content.buttonText || 'Back home')}</a></div>
          : section.type === 'contact' ? <form className="mt-6 grid max-w-2xl gap-3" onSubmit={async (event) => { event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); const endpoint = typeof content.apiEndpoint === 'string' && content.apiEndpoint ? content.apiEndpoint : '/api/contact'; setFormMessages((current) => ({ ...current, [section.id]: 'Sending…' })); try { if (!endpoint.startsWith('/api/') && !/^https:\/\//i.test(endpoint)) throw new Error('Form endpoint must be a local /api/ route or secure https:// URL.'); const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: data.get('name'), email: data.get('email'), message: data.get('message'), category: `Site contact: ${siteTitle}`, website: data.get('website') }) }); const result = await response.json() as { success?: boolean; message?: string }; if (!response.ok || (!content.apiEndpoint && !result.success)) throw new Error(result.message || 'Could not send your message.'); form.reset(); setFormMessages((current) => ({ ...current, [section.id]: String(content.successMessage || 'Thanks for your message.') })); } catch (error) { setFormMessages((current) => ({ ...current, [section.id]: error instanceof Error ? error.message : 'Could not send your message.' })); } }}><input name="name" required maxLength={80} autoComplete="name" placeholder="Name" className="rounded-lg border border-black/20 px-3 py-2.5 text-black"/><input name="email" required type="email" maxLength={254} autoComplete="email" placeholder="Email" className="rounded-lg border border-black/20 px-3 py-2.5 text-black"/><textarea name="message" required maxLength={3000} rows={5} placeholder="Message" className="rounded-lg border border-black/20 px-3 py-2.5 text-black"/><label aria-hidden="true" className="absolute -left-[10000px] h-px w-px overflow-hidden">Leave empty<input name="website" tabIndex={-1} autoComplete="off"/></label><button className="justify-self-start rounded-lg px-5 py-3 font-bold text-black" style={{ backgroundColor: theme.primaryColor }}>{String(content.submitLabel || 'Send message')}</button><p role="status" aria-live="polite" className="text-sm">{formMessages[section.id] || ''}</p></form>
          : section.type === 'newsletter' ? <form className="mt-6 flex max-w-xl flex-col gap-3 sm:flex-row" onSubmit={async (event) => { event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); const endpoint = typeof content.apiEndpoint === 'string' && content.apiEndpoint ? content.apiEndpoint : '/api/newsletter'; setFormMessages((current) => ({ ...current, [section.id]: 'Subscribing…' })); try { if (!endpoint.startsWith('/api/') && !/^https:\/\//i.test(endpoint)) throw new Error('Form endpoint must be a local /api/ route or secure https:// URL.'); const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: data.get('email'), source: `site:${subdomain}`, website: data.get('website') }) }); const result = await response.json() as { success?: boolean; message?: string }; if (!response.ok || (!content.apiEndpoint && !result.success)) throw new Error(result.message || 'Could not subscribe.'); form.reset(); setFormMessages((current) => ({ ...current, [section.id]: String(content.successMessage || 'You are subscribed. Thank you!') })); } catch (error) { setFormMessages((current) => ({ ...current, [section.id]: error instanceof Error ? error.message : 'Could not subscribe.' })); } }}><input name="email" required type="email" maxLength={254} autoComplete="email" placeholder="Email address" className="min-w-0 flex-1 rounded-lg border border-black/20 px-3 py-2.5 text-black"/><label aria-hidden="true" className="absolute -left-[10000px] h-px w-px overflow-hidden">Leave empty<input name="website" tabIndex={-1} autoComplete="off"/></label><button className="rounded-lg px-5 py-3 font-bold text-black" style={{ backgroundColor: theme.primaryColor }}>{String(content.submitLabel || 'Subscribe')}</button><p role="status" aria-live="polite" className="self-center text-sm">{formMessages[section.id] || ''}</p></form>
          : section.type === 'faq' ? <div className="mt-6 divide-y divide-black/10">{items.map((item, index) => <details key={index} className="py-4"><summary className="cursor-pointer font-bold">{String(item.question || item.title || `Question ${index + 1}`)}</summary><p className="mt-2 leading-relaxed opacity-75">{String(item.answer || item.description || '')}</p></details>)}</div>
          : section.type === 'gallery' || section.type === 'product-grid' ? <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{items.map((item, index) => { const itemName = String(item.name || item.title || `Item ${index + 1}`); const productIndex = storeProducts.findIndex((product) => product.name === itemName); const product = productIndex >= 0 ? storeProducts[productIndex] : undefined; return <article key={index} className="overflow-hidden rounded-2xl border border-black/10 bg-white text-black shadow-sm transition-transform hover:-translate-y-1"><div className="flex aspect-[4/3] items-center justify-center overflow-hidden bg-neutral-100">{typeof item.src === 'string' && item.src ? <Image src={item.src} alt={String(item.alt || itemName)} width={640} height={480} unoptimized className="h-full w-full object-cover"/> : product ? <StoreProductArtwork fresh={isFreshCrate} index={productIndex} name={itemName} category={product.category}/> : <div className="h-full w-full bg-gradient-to-br from-[#E8F0DF] via-white to-[#F4A93B]/30" aria-hidden="true"/>}</div><div className="p-4"><h3 className="font-bold">{product ? <a href={productHref(itemName)} className="hover:underline">{itemName}</a> : itemName}</h3>{typeof item.description === 'string' && <p className="mt-1 text-sm leading-relaxed opacity-75">{item.description}</p>}{typeof item.price === 'string' && <p className="mt-3 font-bold">{item.price}</p>}{product && <button type="button" onClick={() => addToBag(product)} className="mt-4 rounded-full px-4 py-2 text-sm font-bold text-black" style={{ backgroundColor: theme.primaryColor }}>Add to {isFreshCrate ? 'crate' : 'bag'}</button>}</div></article>; })}</div>
          : section.type === 'image-text' ? <div className="mt-6 grid items-center gap-8 md:grid-cols-2">{typeof content.image === 'string' && content.image ? <Image src={content.image} alt={String(content.imageAlt || heading)} width={900} height={650} unoptimized className="aspect-[4/3] w-full rounded-2xl object-cover"/> : <StoreProductArtwork fresh={isFreshCrate} index={1} name={heading} category={isFreshCrate ? 'FROM OUR PARTNERS' : 'BUILT WITH PURPOSE'}/>}<p className="whitespace-pre-wrap text-base leading-8 opacity-80">{String(content.body || description)}</p></div>
          : items.length ? <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{items.map((item, index) => <article key={index} className="rounded-xl border border-black/10 bg-white/80 p-5 text-black"><h3 className="font-bold">{String(item.title || item.name || item.question || `Item ${index + 1}`)}</h3>{typeof item.description === 'string' && <p className="mt-2 text-sm leading-relaxed">{item.description}</p>}{typeof item.answer === 'string' && <p className="mt-2 text-sm leading-relaxed">{item.answer}</p>}{typeof item.quote === 'string' && <blockquote className="mt-2 text-sm leading-relaxed">“{item.quote}”</blockquote>}</article>)}</div>
          : typeof content.body === 'string' ? <p className="mt-5 whitespace-pre-wrap leading-relaxed">{content.body}</p> : null}</div></section>;
    });

  // Template matching is resolved before state initialization so the editor and live fallback share the same starter sections.
  const configuredProductItems = siteSections.find((section) => section.type === 'product-grid')?.content?.items;
  const configuredProductNames = Array.isArray(configuredProductItems)
    ? configuredProductItems.flatMap((item) => {
        if (typeof item !== 'object' || item === null) return [];
        const value = item as Record<string, unknown>;
        const name = value.name || value.title;
        return typeof name === 'string' && storeProducts.some((product) => product.name === name) ? [name] : [];
      })
    : [];
  // Keep a useful catalog even when an older draft only saved one product
  // card. Valid saved items stay first, then the starter catalog fills the
  // remaining slots so the preview never collapses into a sparse grid.
  const productNames = [...new Set([
    ...configuredProductNames,
    ...storeProducts.map((product) => product.name),
  ])].slice(0, 6);
  const pageNavigation: LiveMenuItem[] = sitePages.filter((page) => !page.isHome && page.showInMenu !== false).map((page) => ({ id: page.id, label: page.title, target: { type: 'page', value: page.id } }));
  const templateNavigation: LiveMenuItem[] = isFreshCrate
    ? [{ id: 'menu-shop', label: 'Shop', target: { type: 'anchor', value: 'collection' } }, { id: 'menu-how-it-works', label: 'How it works', target: { type: 'anchor', value: 'home-how-it-works' } }, { id: 'menu-recipes', label: 'Recipes', target: { type: 'anchor', value: 'home-recipes' } }, { id: 'menu-our-story', label: 'Our story', target: { type: 'anchor', value: 'home-story' } }]
    : isVoltGear ? [{ id: 'menu-shop', label: 'Shop gear', target: { type: 'anchor', value: 'collection' } }, { id: 'menu-how-it-works', label: 'How it works', target: { type: 'anchor', value: 'home-how-it-works' } }, { id: 'menu-our-story', label: 'Our story', target: { type: 'anchor', value: 'home-story' } }]
      : template.pages.slice(1).map((title) => { const id = title.toLowerCase().replace(/[^a-z0-9]+/g, '-'); return { id, label: title, target: { type: 'page' as const, value: id } }; });
  const liveNavigation: LiveMenuItem[] = siteMenu.length ? siteMenu : pageNavigation.length ? pageNavigation : templateNavigation;
  const previewSuffix = isPreview ? '?preview=1' : '';
  const navigationHref = (item: LiveMenuItem) => {
    if (item.target.type === 'url') return item.target.value;
    if (item.target.type === 'anchor') {
      const anchor = normalizeAnchorId(item.target.value);
      // Anchors from another page always return to the home page first. The
      // hash is preserved so the browser can scroll after the page renders.
      return activePage === 'home' && !routeSlug
        ? `#${anchor}`
        : `/live/${subdomain}${previewSuffix}#${anchor}`;
    }
    const requested = item.target.value.replace(/^\/+/, '').replace(/\/+$/, '');
    const page = sitePages.find((entry) => entry.id === item.target.value || entry.id === requested || normalizeLivePagePath(entry.slug) === normalizeLivePagePath(requested) || entry.title.toLowerCase() === requested.toLowerCase());
    const pagePath = page?.isHome ? '' : normalizeLivePagePath(page?.slug || requested);
    return `/live/${subdomain}${pagePath}${previewSuffix}`;
  };
  const productHref = (name: string) => {
    const page = sitePages.find((entry) => entry.title === name);
    return page ? `/live/${subdomain}${page.isHome ? '' : normalizeLivePagePath(page.slug)}${previewSuffix}` : '#collection';
  };
  const checkoutPage = sitePages.find((page) => /checkout/i.test(page.title));
  useEffect(() => {
    const requestedPage = new URLSearchParams(window.location.search).get('page');
    if (requestedPage) setActivePage(requestedPage);
  }, []);
  useEffect(() => {
    if (!routeSlug || !sitePages.length) return;
    const path = normalizeLivePagePath(routeSlug);
    const routeId = routeSlug.split('/').filter(Boolean).at(-1) || '';
    const page = sitePages.find((entry) => normalizeLivePagePath(entry.slug) === path || entry.id === routeId);
    const renamedPage = sitePages.find((entry) => entry.oldSlugs?.some((oldSlug) => normalizeLivePagePath(oldSlug) === path));
    if (renamedPage?.slug) {
      window.history.replaceState(null, '', `/live/${subdomain}${normalizeLivePagePath(renamedPage.slug)}`);
      setActivePage(renamedPage.id);
      return;
    }
    const notFoundPage = sitePages.find((entry) => entry.slug === '/404' || entry.id === '404' || entry.title.toLowerCase() === '404');
    setActivePage(page?.id || notFoundPage?.id || '404');
  }, [routeSlug, sitePages, subdomain]);
  useEffect(() => {
    const scrollToHash = () => {
      if (!window.location.hash) return;
      window.requestAnimationFrame(() => { scrollToResolvedAnchor(window.location.hash); });
    };
    scrollToHash();
    window.addEventListener('hashchange', scrollToHash);
    return () => window.removeEventListener('hashchange', scrollToHash);
  }, [activePage, routeSlug, siteSections]);

  // Theme & content state (will be populated from localStorage or API or template defaults)
  const [siteTitle, setSiteTitle] = useState(template.name);
  const [theme, setTheme] = useState({
    primaryColor: template.accent || '#FF5500',
    bgColor: template.bgColor || '#09090B',
    textColor: template.textColor || '#FFFFFF',
    fontFamily: 'Inter, sans-serif',
    borderRadius: '16px',
  });
  const navSection = siteSections.find((section) => section.type === 'nav');
  const navContent = (navSection?.content || {}) as Record<string, unknown>;
  const navBrand = typeof navContent.brandLabel === 'string' && navContent.brandLabel.trim() ? navContent.brandLabel : siteTitle;
  const navLogo = typeof navContent.logoUrl === 'string' && navContent.logoUrl.trim() ? navContent.logoUrl : logoUrl;
  const navCtaLabel = typeof navContent.ctaLabel === 'string' && navContent.ctaLabel.trim() ? navContent.ctaLabel : (isBrandedStore ? 'Bag' : 'Get Started');
  const navCtaTarget = typeof navContent.ctaTarget === 'string' && navContent.ctaTarget.trim() ? navContent.ctaTarget : (isBrandedStore ? '#collection' : '#collection');
  const navCtaVariant = typeof navContent.ctaVariant === 'string' ? navContent.ctaVariant : 'solid';
  const navCtaStyle: React.CSSProperties = navCtaVariant === 'outline'
    ? { backgroundColor: 'transparent', borderColor: theme.primaryColor, color: theme.primaryColor, borderRadius: theme.borderRadius }
    : navCtaVariant === 'ghost'
      ? { backgroundColor: 'transparent', borderColor: 'transparent', color: isVoltGear ? '#F5F7FA' : theme.textColor, boxShadow: 'none' }
      : { backgroundColor: theme.primaryColor, borderRadius: theme.borderRadius };

  const getCategoryDefaults = (t: Template) => {
    const isAi = t.category.toLowerCase().includes('ai');
    const isAgency = t.category.toLowerCase().includes('agency');
    const isEcommerce = t.category.toLowerCase().includes('ecom');
    const isPortfolio = t.category.toLowerCase().includes('port');
    const isWeb3 = t.category.toLowerCase().includes('web3');

    return {
      ctaPrimary: isAgency || isPortfolio ? 'Explore Showcase' : isEcommerce ? 'Shop Collection' : isWeb3 ? 'Connect Ecosystem' : 'Launch Experience',
      ctaSecondary: 'Documentation',
      stat1Label: isAi ? 'RUNTIME VELOCITY' : isAgency ? 'AWWWARDS HONORED' : isEcommerce ? 'CHECKOUT SPEED' : isPortfolio ? 'CLIENT IMPACT' : isWeb3 ? 'TOTAL TVL LOCKED' : 'EDGE PROPAGATION',
      stat1Value: isAi ? '4.2M Tokens/s' : isAgency ? '14 Trophy Wins' : isEcommerce ? '0.4s Instant' : isPortfolio ? '$48M ARR Added' : isWeb3 ? '$1.2B On-Chain' : '< 12ms latency',
      stat2Label: isAi ? 'ZERO-SHOT BENCHMARK' : isAgency ? 'RETENTION RATE' : isEcommerce ? 'CONVERSION LIFT' : isPortfolio ? 'DELIVERY CADENCE' : isWeb3 ? 'CONSENSUS SPEED' : 'SYSTEM UPTIME',
      stat2Value: isAi ? '99.98% SLA' : isAgency ? '98.4% Client NPS' : isEcommerce ? '+34.2% Lift' : isPortfolio ? '2x Faster' : isWeb3 ? '65,000 TPS' : '99.999% SLA',
    };
  };

  const catDefaults = getCategoryDefaults(template);

  const [heroContent, setHeroContent] = useState({
    badge: `${template.category.toUpperCase()} // ${template.badge?.toUpperCase() || 'POPULAR'}`,
    title: template.name,
    description: template.description,
    ctaPrimary: catDefaults.ctaPrimary,
    ctaSecondary: catDefaults.ctaSecondary,
    stat1Label: catDefaults.stat1Label,
    stat1Value: catDefaults.stat1Value,
    stat2Label: catDefaults.stat2Label,
    stat2Value: catDefaults.stat2Value,
  });

  const [featuresContent, setFeaturesContent] = useState(template.features.map((title) => ({
    title,
    desc: `${title} is thoughtfully integrated into the ${template.name} shopping experience.`,
  })));

  const [testimonialsContent, setTestimonialsContent] = useState([
    { 
      quote: template.topReview?.comment || `${template.name} made our shopping experience feel special.`,
      name: template.topReview?.author || 'Alex Morgan',
      role: template.topReview?.role || 'Store owner'
    },
    { 
      quote: `The quality and care behind ${template.name} keep us coming back.`,
      name: 'Jamie Lee',
      role: 'Returning customer'
    }
  ]);

  const [ctaContent, setCtaContent] = useState({
    title: `Find your next favorite at ${template.name}.`,
    desc: 'Explore the collection, discover something special, and make it yours.',
    buttonText: 'Shop the collection →',
  });

  // Load custom saved data from localStorage or API
  useEffect(() => {
    const previewRequested = new URLSearchParams(window.location.search).get('preview') === '1';
    const applySite = (site: Record<string, unknown>) => {
      const name = site.name;
      const data = (site.site_data || site.siteData) as Record<string, unknown> | undefined;
      if (typeof name === 'string') setSiteTitle(name);
      if (!data) return;
      const nestedDocument = data.document && typeof data.document === 'object' ? data.document as Record<string, unknown> : [1, 2, 3].includes(Number(data.version)) ? data : null;
      if (nestedDocument) {
        if (nestedDocument.name) setSiteTitle(String(nestedDocument.name));
        const siteSettings = nestedDocument.settings as { customCss?: unknown } | undefined;
        if (typeof siteSettings?.customCss === 'string') setCustomCss(siteSettings.customCss);
        if (nestedDocument.theme) setTheme(nestedDocument.theme as typeof theme);
        const content = nestedDocument.content as Record<string, unknown> | undefined;
        if (content?.hero) setHeroContent(content.hero as typeof heroContent);
        if (content?.features) setFeaturesContent(content.features as typeof featuresContent);
        if (content?.testimonials) setTestimonialsContent(content.testimonials as typeof testimonialsContent);
        if (content?.cta) setCtaContent(content.cta as typeof ctaContent);
        const pages = Array.isArray(nestedDocument.pages) ? nestedDocument.pages as Array<{ id: string; title: string; slug: string; isHome: boolean; showInMenu?: boolean; oldSlugs?: string[]; seo?: { description?: string }; sections?: LivePageSection[]; elements?: typeof canvasElements }> : [];
        const homePage = pages.find((page) => page.isHome) || pages[0];
         if (homePage?.sections?.length) setSiteSections(completeStoreSections(homePage.sections, initialStoreSections as LivePageSection[] | undefined));
        if (homePage?.elements) setCanvasElements(homePage.elements);
        if (pages.length) setSitePages(pages.map((page) => ({ id: page.isHome ? 'home' : page.id, title: page.title, description: page.seo?.description || '', slug: page.slug, isHome: page.isHome, showInMenu: page.showInMenu !== false, oldSlugs: page.oldSlugs || [], sections: page.isHome ? completeStoreSections(page.sections, initialStoreSections as LivePageSection[] | undefined) : page.sections || [] })));
        if (Array.isArray(nestedDocument.menu)) setSiteMenu(nestedDocument.menu as LiveMenuItem[]);
        const assets = Array.isArray(nestedDocument.assets) ? nestedDocument.assets as Array<{ role: string; src: string }> : [];
        if (assets.length) {
          setAssetUrl(assets.find((asset) => asset.role === 'product')?.src || '');
          setLogoUrl(assets.find((asset) => asset.role === 'logo')?.src || '');
          setFaviconUrl(assets.find((asset) => asset.role === 'favicon')?.src || '');
        }
      }
      if (data.theme) setTheme(data.theme as typeof theme);
      if (data.heroContent) setHeroContent(data.heroContent as typeof heroContent);
      if (data.featuresContent) setFeaturesContent(data.featuresContent as typeof featuresContent);
      if (data.testimonialsContent) setTestimonialsContent(data.testimonialsContent as typeof testimonialsContent);
      if (data.ctaContent) setCtaContent(data.ctaContent as typeof ctaContent);
       if (Array.isArray(data.sections) && data.sections.length) setSiteSections(completeStoreSections(data.sections as LivePageSection[], initialStoreSections as LivePageSection[] | undefined));
      if (data.sectionSpacing) setSectionSpacing(data.sectionSpacing as typeof sectionSpacing);
      if (Array.isArray(data.canvasElements)) setCanvasElements(data.canvasElements as typeof canvasElements);
      if (Array.isArray(data.sitePages)) setSitePages(data.sitePages as typeof sitePages);
      if (typeof data.assetUrl === 'string') setAssetUrl(data.assetUrl);
      if (typeof data.logoUrl === 'string') setLogoUrl(data.logoUrl);
      if (typeof data.faviconUrl === 'string') setFaviconUrl(data.faviconUrl);
      // Older published sites default to a visible mark; the server controls new publish flags.
      setWatermarkRequired(typeof data.watermarkRequired === 'boolean' ? data.watermarkRequired : true);
    };
    const applyLocalDraft = () => {
      let foundLocalDraft = false;
      try {
        const saved = localStorage.getItem(`launchly_site_${subdomain.toLowerCase()}`) || localStorage.getItem(`launchly_site_${template.id}`);
        if (!saved) throw new Error('No legacy local draft');
        const draft = JSON.parse(saved);
        foundLocalDraft = true;
        if (draft.siteName) setSiteTitle(draft.siteName);
        if (draft.theme) setTheme(draft.theme);
        if (draft.heroContent) setHeroContent(draft.heroContent);
        if (draft.featuresContent) setFeaturesContent(draft.featuresContent);
        if (draft.testimonialsContent) setTestimonialsContent(draft.testimonialsContent);
        if (draft.ctaContent) setCtaContent(draft.ctaContent);
         if (draft.sections?.length) setSiteSections(completeStoreSections(draft.sections as LivePageSection[], initialStoreSections as LivePageSection[] | undefined));
        if (draft.sectionSpacing) setSectionSpacing(draft.sectionSpacing);
        if (Array.isArray(draft.canvasElements)) setCanvasElements(draft.canvasElements as typeof canvasElements);
        if (Array.isArray(draft.sitePages)) setSitePages(draft.sitePages as typeof sitePages);
        if (draft.assetUrl) setAssetUrl(draft.assetUrl);
        if (draft.logoUrl) setLogoUrl(draft.logoUrl);
        if (draft.faviconUrl) setFaviconUrl(draft.faviconUrl);
      } catch { /* Ignore a malformed local draft and render template defaults. */ }
      if (!foundLocalDraft) void loadEditorDraft(template.id).then((draft) => {
        if (draft && typeof draft === 'object') applySite({ name: template.name, site_data: { document: draft } });
      });
    };

    fetch(`/api/sites?subdomain=${encodeURIComponent(subdomain)}`)
      .then((response) => response.json())
      .then((result) => {
        if (previewRequested) {
          setIsPreview(true);
          applyLocalDraft();
          fetch('/api/auth/me').then((response) => response.json()).then((auth) => setWatermarkRequired(auth?.user?.plan !== 'pro')).catch(() => setWatermarkRequired(true));
          return;
        }
        if (result.site) {
          setIsPreview(false);
          applySite(result.site);
          return;
        }
      })
      .catch(() => {
        // Fail closed: an unavailable publish lookup must not enable hiding a published watermark.
        setIsPreview(false);
        setWatermarkRequired(true);
      });
  }, [initialStoreSections, subdomain, template.id, template.name]);

  useEffect(() => {
    if (!faviconUrl) return;
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
    link.href = faviconUrl;
  }, [faviconUrl]);

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard?.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const homeFooterContent = sitePages.find((page) => page.id === 'home')?.sections?.find((section) => section.type === 'footer')?.content || {};
  const configuredFooterLinks = Array.isArray(homeFooterContent.items)
    ? homeFooterContent.items.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    : Array.isArray(homeFooterContent.links)
      ? homeFooterContent.links.map((label) => ({ label: String(label), href: `/${String(label).toLowerCase()}` }))
      : [{ label: 'Privacy', href: '/privacy-terms' }, { label: 'Terms', href: '/privacy-terms' }, { label: 'Contact', href: '/contact' }];

  return (
    <div 
      className="min-h-screen flex flex-col antialiased selection:bg-pink selection:text-black"
      style={{ fontFamily: theme.fontFamily }}
    >
      {customCss && <style>{customCss}</style>}
      {/* Floating Edge Deployment Live Topbar */}
      <div className={`fixed top-0 inset-x-0 z-50 transition-transform duration-300 ${bannerCollapsed ? '-translate-y-full' : 'translate-y-0'}`}>
        <div className="bg-[#0F0F11]/95 backdrop-blur-xl border-b-[2.5px] border-black px-4 py-2.5 text-white flex items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="flex items-center gap-2 group">
              <div className="w-7 h-7 rounded-lg bg-pink border border-black text-black flex items-center justify-center font-black text-xs shadow-2xs group-hover:scale-105 transition-transform">
                L
              </div>
              <span className="font-display font-black text-xs tracking-tight text-white group-hover:text-pink transition-colors hidden sm:inline">
                LAUNCHLY
              </span>
            </Link>

            <div className="h-3.5 w-px bg-white/20" />

            {/* Live Subdomain Pill */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-[11px] font-mono">
              <span className="w-2 h-2 rounded-full bg-mint animate-pulse" />
              <span className="text-pink font-bold">{subdomain}</span>
              <span className="text-white/70">.launchly.site</span>
              <span className="ml-1 px-1.5 py-0.2 bg-mint text-black rounded text-[9px] font-black uppercase">
                PRO HOSTED
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-white/80 transition-colors cursor-pointer"
              title="Copy live link"
            >
              {copied ? <Check size={12} className="text-mint stroke-[3]" /> : <Share2 size={12} />}
              <span>{copied ? 'Copied' : 'Share'}</span>
            </button>

            <Link
              href={`/editor/${template.id}`}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-pink hover:bg-yellow text-black border border-black text-xs font-black transition-colors shadow-2xs"
            >
              <Edit3 size={11} className="stroke-[2.5]" />
              <span>Edit Site</span>
            </Link>

            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-white/70 transition-colors"
            >
              <ArrowLeft size={12} />
              <span className="hidden md:inline">Dashboard</span>
            </Link>

            <button
              onClick={() => setBannerCollapsed(true)}
              className="p-1 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors cursor-pointer"
              title="Hide top bar"
            >
              <ChevronDown size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Floating Re-open Button if topbar collapsed */}
      {bannerCollapsed && (
        <button
          onClick={() => setBannerCollapsed(false)}
          className="fixed top-2 right-4 z-50 bg-[#121214] text-white border border-white/20 text-xs font-semibold px-3 py-1.5 rounded-full shadow-xl flex items-center gap-1.5 hover:bg-black transition-all cursor-pointer"
        >
          <span className="w-2 h-2 rounded-full bg-mint animate-ping" />
          <span>Launchly Bar</span>
        </button>
      )}

      {/* ACTUAL LIVE WEBSITE SURFACE — 100% Identical to Editor Preview Canvas */}
      <main id="top" className={`relative flex flex-col flex-1 pt-12 sm:pt-13 ${isFreshCrate ? 'bg-[#FFF8EC] text-[#1F2A1B]' : isVoltGear ? 'bg-[#0B0D12] text-[#F5F7FA]' : ''}`}>
        {/* Navigation Block */}
        <nav style={{ order: sectionOrder('nav'), display: sectionVisible('nav') ? undefined : 'none', ...sectionPadding('nav') }} className={`sticky top-12 z-40 flex items-center justify-between border-b px-4 py-3 backdrop-blur-md sm:px-10 sm:py-4 ${navContent.sticky === true ? 'top-0' : ''} ${isVoltGear ? 'border-white/10 bg-[#0B0D12]/90' : isFreshCrate ? 'border-[#1F2A1B]/10 bg-[#FFF8EC]/90' : 'border-black/10 border-b-2 bg-white/90'}`}>
          <a href={`/live/${subdomain}`} aria-label={`Go to ${siteTitle} home page`} title={`Go to ${siteTitle} home page`} className="flex items-center gap-2.5 rounded-lg outline-offset-4 hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-black">
            {navContent.showLogo !== false && (navLogo ? <Image src={navLogo} alt={String(navContent.logoAlt || `${navBrand} logo`)} width={36} height={36} unoptimized className="h-9 w-9 rounded-lg object-contain" /> : <div
              style={{ backgroundColor: theme.primaryColor }}
              className="w-8 h-8 rounded-lg border-2 border-black shadow-[2px_2px_0px_#000] flex items-center justify-center font-display font-black text-sm text-black"
            >
              {navBrand.charAt(0)}
            </div>)}
            <span className={`font-display text-base font-black tracking-tight sm:text-lg ${isVoltGear ? 'text-white' : isFreshCrate ? 'text-[#1F2A1B]' : 'text-ink'}`}>
              {navBrand}
            </span>
          </a>

          <div aria-label="Site pages" className={`${navContent.showMenu === false ? 'hidden' : 'hidden sm:flex'} min-w-0 max-w-[65%] items-center gap-5 overflow-x-auto whitespace-nowrap px-1 font-mono text-xs font-bold [scrollbar-width:thin] ${isVoltGear ? 'text-white/70' : isFreshCrate ? 'text-[#53604C]' : 'text-neutral-700'}`}>
            {liveNavigation.map(item => (
              <a
                key={item.id}
                href={navigationHref(item)}
                target={item.newTab ? '_blank' : undefined}
                rel={item.newTab ? 'noreferrer' : undefined}
                className={`cursor-pointer transition-colors hover:underline ${isVoltGear ? 'hover:text-[#C6FF3D]' : 'hover:text-black'}`}
              >
                {item.label}
              </a>
            ))}
          </div>

          <button type="button" aria-label={mobileNavigationOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={mobileNavigationOpen} onClick={() => setMobileNavigationOpen((open) => !open)} className={`rounded-lg border p-2 sm:hidden ${isVoltGear ? 'border-white/20 text-white' : 'border-black/20'}`}>
            {mobileNavigationOpen ? <X size={18} /> : <Menu size={18} />}
          </button>

          {navContent.showCta !== false && (isBrandedStore && (navCtaLabel.toLowerCase().includes('bag') || navCtaTarget === '#cart') ? <button type="button" aria-label={`Open shopping bag, ${cartCount} items`} aria-haspopup="dialog" aria-expanded={cartOpen} onClick={() => setCartOpen(true)} style={navCtaStyle} className="rounded-full border-2 border-black px-4 py-2 font-display text-xs font-black shadow-[2px_2px_0px_#000] hover:scale-103">{navCtaLabel}{cartCount > 0 ? ` (${cartCount})` : ''}</button> : <a href={navigationHref({ id: 'nav-cta', label: navCtaLabel, target: navCtaTarget.startsWith('#') ? { type: 'anchor', value: navCtaTarget.slice(1) } : navCtaTarget.startsWith('/') ? { type: 'page', value: navCtaTarget.replace(/^\/+/, '') } : { type: 'url', value: navCtaTarget }, newTab: navContent.ctaNewTab === true })} target={navContent.ctaNewTab === true ? '_blank' : undefined} rel={navContent.ctaNewTab === true ? 'noreferrer' : undefined} style={navCtaStyle} className="rounded-xl border-2 border-black px-4 py-2 font-display text-xs font-black shadow-[2px_2px_0px_#000] transition-all hover:scale-103">{navCtaLabel}</a>)}
        </nav>
        {mobileNavigationOpen && <nav aria-label="Mobile navigation" className={`sticky top-12 z-40 border-b px-5 py-4 sm:hidden ${isVoltGear ? 'border-white/10 bg-[#0B0D12] text-white' : isFreshCrate ? 'border-[#1F2A1B]/10 bg-[#FFF8EC] text-[#1F2A1B]' : 'border-black/10 bg-white'}`}><div className="flex flex-col gap-4 font-mono text-sm font-bold">{liveNavigation.map((item) => <a key={item.id} href={navigationHref(item)} target={item.newTab ? '_blank' : undefined} rel={item.newTab ? 'noreferrer' : undefined} onClick={() => setMobileNavigationOpen(false)}>{item.label}</a>)}</div></nav>}
        {cartOpen && <div className="fixed inset-0 z-[70] flex justify-end bg-black/45" onMouseDown={(event) => { if (event.target === event.currentTarget) setCartOpen(false); }}><section role="dialog" aria-modal="true" aria-labelledby="bag-title" className="flex h-full w-full max-w-md flex-col p-5 shadow-2xl sm:p-7" style={{ backgroundColor: template.id === 'volt-gear' ? '#151923' : '#FFFFFF', color: template.id === 'volt-gear' ? '#F5F7FA' : '#111111' }}><div className="flex items-center justify-between border-b border-black/10 pb-4"><div><p className="font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-500">{siteTitle}</p><h2 id="bag-title" className="mt-1 text-2xl font-black">Your bag <span className="text-sm font-semibold text-neutral-500">({cartCount})</span></h2></div><button type="button" autoFocus onClick={() => setCartOpen(false)} aria-label="Close shopping bag" className="rounded-full border-2 border-black p-2 hover:bg-neutral-100"><X size={18}/></button></div><div className="min-h-0 flex-1 overflow-y-auto py-4">{cartItems.length ? <ul className="space-y-4">{cartItems.map((item) => <li key={item.name} className="flex items-start justify-between gap-4 border-b border-black/10 pb-4"><div className="min-w-0"><p className="font-bold">{item.name}</p><p className="mt-1 text-xs text-neutral-500">{item.category} · ₹{item.price.toLocaleString('en-IN')}</p><div className="mt-3 inline-flex items-center rounded-lg border border-black/20"><button type="button" aria-label={`Remove one ${item.name}`} onClick={() => updateBagQuantity(item.name, -1)} className="px-3 py-1.5">−</button><span className="min-w-8 text-center text-sm font-bold">{item.quantity}</span><button type="button" aria-label={`Add one ${item.name}`} onClick={() => updateBagQuantity(item.name, 1)} className="px-3 py-1.5">+</button></div></div><strong className="whitespace-nowrap">₹{(item.price * item.quantity).toLocaleString('en-IN')}</strong></li>)}</ul> : <div className="flex h-full flex-col items-center justify-center text-center"><span aria-hidden="true" className="text-4xl">{template.id === 'fresh-crate' ? '🥬' : '✦'}</span><h3 className="mt-3 text-lg font-bold">Your bag is waiting</h3><p className="mt-1 max-w-xs text-sm text-neutral-600">Add a few favorites and they will show up here.</p><button type="button" onClick={() => { setCartOpen(false); setActivePage('home'); window.location.hash = 'collection'; }} className="mt-5 rounded-lg border-2 border-black px-4 py-2 font-bold">Browse the shop</button></div>}</div>{cartItems.length > 0 && <div className="border-t border-black/10 pt-4"><div className="flex justify-between text-sm"><span>Subtotal</span><strong>₹{bagSubtotal.toLocaleString('en-IN')}</strong></div><p className="mt-1 text-xs text-neutral-500">Delivery and taxes are calculated at checkout.</p>{checkoutPage ? <button type="button" onClick={() => { setCartOpen(false); setActivePage(checkoutPage.id); }} className="mt-4 w-full rounded-xl border-2 border-black px-4 py-3 font-bold text-black shadow-[3px_3px_0_#000]" style={{ backgroundColor: theme.primaryColor }}>Continue to checkout</button> : <p className="mt-4 rounded-lg border border-current/20 p-3 text-xs">Checkout is not on this starter page yet. Add a Checkout page in the editor to enable it.</p>}<button type="button" onClick={() => setCartOpen(false)} className="mt-3 w-full py-2 text-sm font-semibold underline underline-offset-4">Continue shopping</button></div>}</section></div>}

        {activePage === 'home' ? <>

        {siteSections.filter((section) => section.type === 'announcement' && !section.hidden?.desktop).map((section) => <aside key={section.id} id={section.anchorId || section.id} style={{ order: sectionOrder('announcement'), ...sectionPadding('announcement') }} className={`px-5 py-10 sm:px-12 ${isVoltGear ? 'bg-[#0B0D12]' : 'bg-[#FAF9F6]'}`}><div className="mx-auto max-w-5xl text-center"><p className="font-mono text-[10px] font-bold uppercase tracking-widest" style={{ color: theme.primaryColor }}>{siteTitle}</p><h2 className="mt-2 font-display text-2xl font-black sm:text-3xl">{section.name}</h2><div className="mt-6 flex flex-wrap items-center justify-center gap-2 rounded-xl border-2 border-black px-4 py-4 text-center font-mono text-sm" style={{ backgroundColor: typeof section.style?.backgroundColor === 'string' ? section.style.backgroundColor : theme.primaryColor, color: isVoltGear ? '#0B0D12' : '#1F2A1B' }}><span>{String(section.content?.text || section.content?.description || 'A fresh note from our team.')}</span>{typeof section.content?.linkLabel === 'string' && <a className="font-bold underline underline-offset-4" href={isFreshCrate ? `/live/${subdomain}/delivery-areas` : `/live/${subdomain}/deals`}>{section.content.linkLabel}<span aria-hidden="true"> ↗</span></a>}</div></div></aside>)}

        {/* Hero Block — Rich Ambient Lighting, Vibrant Neo-Brutalist Badges, Crisp Typography */}
        <section
          id="home"
          className={`relative overflow-hidden px-4 py-16 sm:px-12 sm:py-28 ${isBrandedStore ? 'grid items-center gap-10 text-left md:grid-cols-2 lg:gap-16' : 'text-center'}`}
          style={{ order: sectionOrder('hero'), display: sectionVisible('hero') ? undefined : 'none', background: theme.bgColor, color: theme.textColor, ...sectionPadding('hero') }}
        >
          {/* Subtle Ambient Radial Glow */}
          <div
            className={`pointer-events-none absolute top-0 h-[min(80vw,34rem)] w-[min(80vw,34rem)] rounded-full blur-[110px] opacity-25 ${isBrandedStore ? 'right-[-8rem] left-auto' : 'left-1/2 -translate-x-1/2'}`}
            style={{ backgroundColor: theme.primaryColor }}
          />
          {isFreshCrate && <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 -left-20 h-72 w-72 rounded-full border-[28px] border-[#F4A93B]/15" />}
          {isVoltGear && <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[.12] [background-image:radial-gradient(#C6FF3D_1px,transparent_1px)] [background-size:22px_22px]" />}

          <div className={`relative z-10 space-y-4 sm:space-y-5 ${isBrandedStore ? 'max-w-2xl text-left' : 'mx-auto max-w-3xl'}`}>
            {/* Category / Status Pill */}
            <div
              className="inline-flex items-center gap-1.5 rounded-full border-2 border-black px-3.5 py-1.5 font-mono text-[11px] font-black uppercase text-black shadow-[2px_2px_0px_#000] sm:text-xs"
              style={{ backgroundColor: theme.primaryColor }}
            >
              <span>{heroContent.badge}</span>
            </div>

            {/* Headline Title */}
            <h1 
              className={`font-display font-black tracking-tight leading-[1.02] ${isFreshCrate ? 'text-4xl sm:text-6xl lg:text-7xl' : isVoltGear ? 'text-4xl sm:text-6xl lg:text-7xl' : 'text-3xl sm:text-6xl'}`}
              style={{ color: theme.textColor }}
            >
              {heroContent.title}
            </h1>

            {/* Description Subtitle */}
            <p 
              className={`font-mono text-xs leading-relaxed opacity-80 sm:text-base ${isBrandedStore ? 'max-w-xl' : 'mx-auto max-w-xl'}`}
              style={{ color: theme.textColor }}
            >
              {heroContent.description}
            </p>

            {/* Action Buttons */}
            <div className={`flex flex-wrap gap-3 pt-3 ${isBrandedStore ? 'justify-start' : 'justify-center'}`}>
              <a
                href="#collection"
                style={{ backgroundColor: theme.primaryColor, borderRadius: theme.borderRadius }}
                className={`flex items-center gap-2 rounded-xl border-2 border-black px-6 py-3 font-display text-xs font-black text-black shadow-[3px_3px_0px_#000] transition-transform hover:scale-103 active:translate-x-0.5 active:translate-y-0.5 sm:px-8 sm:text-sm ${isVoltGear ? 'shadow-[3px_3px_0_#7C5CFF]' : ''}`}
              >
                <span>{heroContent.ctaPrimary}</span>
                <ArrowUpRight size={15} className="stroke-[3]" />
              </a>
              <a
                href="#features"
                style={{ borderRadius: theme.borderRadius }}
                className={`rounded-xl border-2 border-current px-5 py-3 font-mono text-xs font-bold backdrop-blur-xs transition-all hover:bg-white/20 sm:px-7 sm:text-sm ${isFreshCrate ? 'bg-white/70' : 'bg-white/10'}`}
              >
                {heroContent.ctaSecondary}
              </a>
            </div>

            {/* Live Telemetry Radar Pills */}
            <div className={`grid max-w-lg grid-cols-2 gap-3 pt-6 text-left sm:pt-8 ${isBrandedStore ? '' : 'mx-auto'}`}>
              <div className={`rounded-xl border border-current/20 p-3.5 backdrop-blur-sm sm:p-4 ${isFreshCrate ? 'bg-white/65' : 'bg-white/5'}`}>
                <span className="font-mono text-[9px] sm:text-[10px] font-bold opacity-60 block uppercase">
                  {heroContent.stat1Label}
                </span>
                <span className="font-display text-base sm:text-xl font-black">{heroContent.stat1Value}</span>
              </div>
              <div className={`rounded-xl border border-current/20 p-3.5 backdrop-blur-sm sm:p-4 ${isFreshCrate ? 'bg-white/65' : 'bg-white/5'}`}>
                <span className="font-mono text-[9px] sm:text-[10px] font-bold opacity-60 block uppercase">
                  {heroContent.stat2Label}
                </span>
                <span className="font-display text-base sm:text-xl font-black">{heroContent.stat2Value}</span>
              </div>
            </div>
          </div>
          {isBrandedStore && <StoreHeroArtwork fresh={isFreshCrate} />}
        </section>

        <section id="collection" style={{ order: Math.max(0, siteSections.findIndex((section) => section.type === 'product-grid' || section.type === 'gallery')), display: siteSections.some((section) => section.type === 'product-grid' || section.type === 'gallery') ? undefined : 'none', ...sectionPadding('product-grid') }} className={`px-4 py-14 sm:px-12 ${isVoltGear ? 'bg-[#10131A] text-white' : isFreshCrate ? 'bg-[#F3E9D7] text-[#1F2A1B]' : 'bg-[#FAF9F6] text-black'}`}>
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-8"><p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: theme.primaryColor }}>Curated for you</p><h2 className="font-display text-2xl sm:text-3xl font-black mt-1">{sectionName('product-grid', sectionName('gallery', 'Featured pieces'))}</h2></div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {productNames.map((name, index) => {
                const product = storeProducts.find((entry) => entry.name === name);
                const productIndex = product ? storeProducts.indexOf(product) : index;
                return <article key={name} className={`overflow-hidden rounded-2xl border shadow-[0_12px_35px_rgba(0,0,0,.08)] transition-transform duration-300 hover:-translate-y-1 ${isVoltGear ? 'border-white/10 bg-[#171B25] shadow-[0_14px_36px_rgba(0,0,0,.3)]' : isFreshCrate ? 'border-[#1F2A1B]/10 bg-white' : 'border-black/20 bg-white shadow-[4px_4px_0px_#000]'}`}>
                  <div className={`relative flex h-48 items-center justify-center overflow-hidden ${isVoltGear ? 'bg-[#202532]' : isFreshCrate ? 'bg-[#E8F0DF]' : ''}`} style={{ background: isBrandedStore ? undefined : `linear-gradient(135deg, ${theme.primaryColor}55, ${theme.primaryColor}15)` }}>
                    <span aria-hidden="true" className={`absolute h-36 w-36 rounded-full blur-2xl ${isVoltGear ? 'bg-[#7C5CFF]/25' : isFreshCrate ? 'bg-[#F4A93B]/25' : 'bg-transparent'}`} />
                    {assetUrl ? <>
                      {/* User-supplied assets may be arbitrary URLs or local data URLs. */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={assetUrl} alt={name} className="h-full w-full object-cover" />
                    </> : <StoreProductArtwork fresh={isFreshCrate} index={productIndex} name={name} category={product?.category || ''} />}
                  </div>
                  <div className="p-5"><span className={`font-mono text-[9px] uppercase tracking-wider ${isVoltGear ? 'text-white/45' : 'text-neutral-500'}`}>{product?.category || 'Featured'}</span><a href={productHref(name)} className="mt-1 block rounded-sm font-display text-lg font-black outline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2" style={{ outlineColor: theme.primaryColor }}>{name}</a><p className={`mt-1 font-mono text-xs ${isVoltGear ? 'text-white/55' : 'text-neutral-500'}`}>{product?.detail || 'A considered pick from this collection.'}</p><div className="mt-5 flex items-center justify-between"><span className="font-display font-black">{product ? `₹${product.price.toLocaleString('en-IN')}` : 'Explore'}</span><button type="button" disabled={!product} onClick={() => { if (product) addToBag(product); }} className={`rounded-full px-4 py-2 font-mono text-[10px] font-black transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50 ${isVoltGear ? 'border border-[#C6FF3D] text-[#C6FF3D]' : 'border border-[#3FA34D]/30 text-[#286A32]'}`} style={{ backgroundColor: isVoltGear ? 'transparent' : '#EDF6E8' }}>Add to {isFreshCrate ? 'crate' : 'bag'}</button></div></div>
                </article>;
              })}
            </div>
            <p className="text-right mt-4 font-mono text-xs font-bold">Shopping bag: {cartCount} item{cartCount === 1 ? '' : 's'}</p>
          </div>
        </section>

        {/* Features Block */}
        <section id="features" style={{ order: sectionOrder('features'), display: sectionVisible('features') ? undefined : 'none', ...sectionPadding('features') }} className={`border-y px-4 py-16 sm:px-12 sm:py-24 ${isVoltGear ? 'border-white/10 bg-[#0B0D12] text-white' : isFreshCrate ? 'border-[#1F2A1B]/10 bg-[#FFF8EC] text-[#1F2A1B]' : 'border-black/10 bg-white text-black'}`}>
          <div className="text-center max-w-xl mx-auto mb-10 space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-black/20 bg-[#FAF9F6] font-mono text-[10px] font-bold uppercase text-neutral-600">
              <span className="w-1.5 h-1.5 rounded-full bg-pink inline-block animate-pulse" />
              <span>Considered details</span>
            </div>
            <h2 className="font-display text-2xl sm:text-4xl font-black tracking-tight">
              {sectionName('features', 'Made for the way you live.')}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {featuresContent.map((f, i) => (
              <div
                key={i}
                className={`rounded-2xl border p-5 transition-transform hover:-translate-y-1 sm:p-6 ${isVoltGear ? 'border-white/10 bg-[#151923] shadow-[0_14px_35px_rgba(0,0,0,.25)]' : isFreshCrate ? 'border-[#1F2A1B]/10 bg-white shadow-[0_14px_35px_rgba(31,42,27,.07)]' : 'border-2 border-black bg-[#FAF9F6] shadow-[4px_4px_0px_#000]'}`}
              >
                <div
                  style={{ backgroundColor: theme.primaryColor }}
                  className="w-9 h-9 rounded-xl border-2 border-black flex items-center justify-center font-mono font-black text-xs text-black mb-3 shadow-[1.5px_1.5px_0px_#000]"
                >
                  0{i + 1}
                </div>
                <h3 className={`mb-1.5 font-display text-base font-black sm:text-lg ${isVoltGear ? 'text-white' : 'text-[#1F2A1B]'}`}>
                  {f.title}
                </h3>
                <p className={`font-mono text-xs leading-relaxed sm:text-sm ${isVoltGear ? 'text-white/60' : 'text-neutral-600'}`}>
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Testimonials Block */}
        <section id="showcase" style={{ order: sectionOrder('testimonials'), display: sectionVisible('testimonials') ? undefined : 'none', ...sectionPadding('testimonials') }} className={`px-4 py-16 sm:px-12 sm:py-24 ${isVoltGear ? 'bg-[#10131A] text-white' : isFreshCrate ? 'bg-[#F3E9D7] text-[#1F2A1B]' : 'bg-[#FFFDF8] text-black'}`}>
          <div className="text-center max-w-xl mx-auto mb-10 space-y-2">
            <h2 className="font-display text-2xl sm:text-4xl font-black tracking-tight">
              {sectionName('testimonials', 'Loved by our customers.')}
            </h2>
            <p className="font-mono text-xs text-neutral-500">
              Thoughtful quality and personal service, every step of the way.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-4xl mx-auto">
            {testimonialsContent.map((item, idx) => (
              <div 
                key={idx} 
                className={`flex flex-col justify-between rounded-2xl border p-5 sm:p-7 ${isVoltGear ? 'border-white/10 bg-[#171B25] shadow-[0_14px_35px_rgba(0,0,0,.3)]' : isFreshCrate ? 'border-white/80 bg-white shadow-[0_12px_30px_rgba(31,42,27,.08)]' : 'border-2 border-black bg-white shadow-[4px_4px_0px_#000]'}`}
              >
                <div className="flex gap-1 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={14} className="fill-yellow text-black stroke-[1.5]" />
                  ))}
                </div>
                <p className={`mb-5 font-mono text-xs leading-relaxed sm:text-sm ${isVoltGear ? 'text-white/80' : 'text-neutral-800'}`}>
                  &ldquo;{item.quote}&rdquo;
                </p>
                <div className="pt-3 border-t border-black/10 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full border border-black bg-lilac flex items-center justify-center font-mono font-bold text-xs text-black">
                    {item.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className={`font-display text-xs font-black sm:text-sm ${isVoltGear ? 'text-white' : 'text-black'}`}>{item.name}</h4>
                    <p className="font-mono text-[10px] sm:text-[11px] text-neutral-500">{item.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA Block */}
        <section id="pricing" style={{ order: sectionOrder('cta'), display: sectionVisible('cta') ? undefined : 'none', ...sectionPadding('cta') }} className={`relative overflow-hidden px-4 py-16 text-center sm:px-12 sm:py-24 ${isFreshCrate ? 'bg-[#3FA34D] text-white' : isVoltGear ? 'bg-[#151923] text-white' : 'bg-black text-white'}`}>
          <div aria-hidden="true" className={`pointer-events-none absolute -right-20 -top-28 h-80 w-80 rounded-full border-[32px] ${isVoltGear ? 'border-[#7C5CFF]/20' : 'border-white/10'}`} />
          <div className="relative z-10 max-w-lg mx-auto space-y-3.5">
            <h2 className="font-display text-2xl sm:text-4xl font-black">
              {ctaContent.title}
            </h2>
            <p className="font-mono text-xs sm:text-sm text-neutral-400">
              {ctaContent.desc}
            </p>
            <div className="pt-2">
              <a
                href="#collection"
                style={{ backgroundColor: theme.primaryColor, borderRadius: theme.borderRadius }}
                className={`inline-block rounded-xl border-2 px-6 py-3 font-display text-xs font-black text-black transition-transform hover:scale-103 active:translate-x-0.5 active:translate-y-0.5 sm:px-8 sm:text-sm ${isFreshCrate ? 'border-[#1F2A1B] shadow-[3px_3px_0_#1F2A1B]' : 'border-white shadow-[3px_3px_0_#FFFFFF]'}`}
              >
                {ctaContent.buttonText}
              </a>
            </div>
          </div>
        </section>

        {renderHomeExtras()}

        {/* Branded Footer Block */}
        <footer style={{ order: sectionOrder('footer'), display: sectionVisible('footer') ? undefined : 'none', ...sectionPadding('footer') }} className={`flex flex-col items-center justify-between gap-4 border-t px-4 py-8 font-mono text-xs sm:flex-row sm:px-12 ${isVoltGear ? 'border-white/10 bg-[#0B0D12] text-white/55' : isFreshCrate ? 'border-[#1F2A1B]/10 bg-[#FFF8EC] text-[#65705D]' : 'border-black/10 bg-white text-neutral-600'}`}>
          <div className={`flex items-center gap-2 font-bold ${isVoltGear ? 'text-white' : 'text-black'}`}>
            <span>{siteTitle}</span>
            <span>•</span>
            <span className="text-[10px] text-neutral-400">{String(homeFooterContent.copyright || 'Deployed live on Launchly Edge')}</span>
          </div>
          <div className="flex gap-4">
            {configuredFooterLinks.map((item, index) => {
              const rawHref = typeof item.href === 'string' ? item.href : '#';
              const targetPage = rawHref.startsWith('/') ? sitePages.find((page) => normalizeLivePagePath(page.slug) === normalizeLivePagePath(rawHref) || page.id === rawHref.replace(/^\/+/, '')) : undefined;
              const href = targetPage ? navigationHref({ id: `footer-${index}`, label: String(item.label || ''), target: { type: 'page', value: targetPage.id } }) : rawHref.startsWith('/') ? `/live/${subdomain}${normalizeLivePagePath(rawHref)}${previewSuffix}` : rawHref.startsWith('#') || /^(https?:|mailto:|tel:)/i.test(rawHref) ? rawHref : '#';
              return <a key={`live-footer-${index}`} href={href} target={'newTab' in item && item.newTab === true ? '_blank' : undefined} rel={'newTab' in item && item.newTab === true ? 'noopener noreferrer' : undefined} className="hover:text-black hover:underline">{String(item.label || `Link ${index + 1}`)}</a>;
            })}
          </div>
        </footer>
        </> : <section className={`min-h-[70vh] px-5 py-14 sm:px-12 ${isVoltGear ? 'bg-[#0B0D12] text-white' : isKuroCraft ? 'bg-[#0A0A0B] text-zinc-100' : isFreshCrate ? 'bg-[#FFF8EC] text-[#1F2A1B]' : 'bg-[#FAF9F6] text-black'}`}>
          {(() => { const page = sitePages.find((entry) => entry.id === activePage); const title = page?.title || activePage.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()); const activeProduct = storeProducts.find((product) => product.name === page?.title);
            return <div className="mx-auto max-w-6xl"><p className="font-mono text-xs font-bold uppercase tracking-[.2em]" style={{ color: theme.primaryColor }}>{siteTitle}</p><h1 className="mt-3 text-4xl font-black sm:text-6xl">{activePage === '404' ? 'Page not found' : title}</h1><p className={`mt-4 max-w-2xl text-base leading-relaxed ${isVoltGear || isKuroCraft ? 'text-white/65' : 'text-neutral-600'}`}>{activePage === '404' ? 'The page you requested could not be found.' : page?.description || `Welcome to ${title} at ${siteTitle}.`}</p>
              {activeProduct && <div className={`mt-8 grid gap-8 rounded-3xl border p-5 sm:p-8 md:grid-cols-2 ${isVoltGear ? 'border-white/10 bg-[#151923]' : isKuroCraft ? 'border-white/10 bg-[#121214]' : 'border-[#1F2A1B]/10 bg-white'}`}>
                <div className={`relative flex min-h-64 items-center justify-center overflow-hidden rounded-2xl ${isVoltGear ? 'bg-[#202532]' : isKuroCraft ? 'bg-[#18181B]' : 'bg-[#E8F0DF]'}`}><StoreProductArtwork fresh={isFreshCrate} isKuro={isKuroCraft} index={Math.max(0, storeProducts.findIndex((product) => product.name === activeProduct.name))} name={activeProduct.name} category={activeProduct.category} /></div>
                <div className="flex flex-col justify-center"><p className="font-mono text-xs font-bold uppercase tracking-widest" style={{ color: theme.primaryColor }}>{activeProduct.category}</p><h2 className="mt-2 font-display text-3xl font-black">{activeProduct.name}</h2><p className={`mt-3 leading-relaxed ${isVoltGear || isKuroCraft ? 'text-white/65' : 'text-neutral-600'}`}>{activeProduct.detail}</p><strong className="mt-6 text-2xl">{isKuroCraft ? 'Featured Project' : `₹${activeProduct.price.toLocaleString('en-IN')}`}</strong><p className={`mt-2 text-xs ${isVoltGear || isKuroCraft ? 'text-white/45' : 'text-neutral-500'}`}>{isFreshCrate ? 'Seasonal availability is confirmed while packing.' : isKuroCraft ? 'Full architectural documentation and design system available.' : 'Check compatibility and specifications before ordering.'}</p><button type="button" onClick={() => addToBag(activeProduct)} className="mt-5 self-start rounded-full px-6 py-3 font-bold text-black" style={{ backgroundColor: theme.primaryColor }}>{isKuroCraft ? 'Explore Case Study ↗' : `Add to ${isFreshCrate ? 'crate' : 'bag'}`}</button></div>
              </div>}
              {page?.sections?.filter((section) => !['nav', 'footer', 'hero'].includes(section.type) && !(activePage === 'shop' && section.type === 'product-grid') && !section.hidden?.desktop).map((section) => {
                const content = section.content || {};
                const heading = [content.heading, content.title, section.name].find((value): value is string => typeof value === 'string' && value.length > 0) || section.type.replace(/[-_]/g, ' ');
                const description = [content.description, content.desc, content.subtitle].find((value): value is string => typeof value === 'string') || '';
                const items = Array.isArray(content.items) ? content.items.filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null) : [];
                return <section key={section.id} id={section.anchorId || section.id} className={`mt-10 rounded-2xl border p-6 shadow-sm sm:p-9 ${isVoltGear ? 'border-white/10 bg-[#151923]' : isKuroCraft ? 'border-white/10 bg-[#121214]' : isFreshCrate ? 'border-[#1F2A1B]/10 bg-white' : 'border-black/10 bg-white'} ${getAnimationClass(typeof section.style?.animation === 'string' ? section.style.animation : undefined)}`}>
                  <h2 className="text-2xl font-black sm:text-3xl">{heading}</h2>
                  {description && <p className={`mt-3 max-w-3xl leading-relaxed ${isVoltGear || isKuroCraft ? 'text-white/65' : 'text-neutral-600'}`}>{description}</p>}
                  {section.type === 'custom' ? <LiveTree columns={section.columns || []} pages={sitePages} subdomain={subdomain} /> : section.type === 'contact' ? <form className="mt-6 grid max-w-2xl gap-3" onSubmit={async (event) => { event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); const endpoint = typeof content.apiEndpoint === 'string' && content.apiEndpoint ? content.apiEndpoint : '/api/contact'; setFormMessages((current) => ({ ...current, [section.id]: 'Sending…' })); try { if (!endpoint.startsWith('/api/') && !/^https:\/\//i.test(endpoint)) throw new Error('Form endpoint must be a local /api/ route or secure https:// URL.'); const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: data.get('name'), email: data.get('email'), message: data.get('message'), category: `Site contact: ${siteTitle}`, website: data.get('website') }) }); const result = await response.json() as { success?: boolean; message?: string }; if (!response.ok || (!content.apiEndpoint && !result.success)) throw new Error(result.message || 'Could not send your message.'); form.reset(); setFormMessages((current) => ({ ...current, [section.id]: String(content.successMessage || 'Thanks for your message. We will be in touch soon.') })); } catch (error) { setFormMessages((current) => ({ ...current, [section.id]: error instanceof Error ? error.message : 'Could not send your message. Please try again.' })); } }}><label className="grid gap-1 text-sm font-semibold">Name<input name="name" required maxLength={80} autoComplete="name" className="rounded-lg border border-black/20 px-3 py-2.5 font-normal" /></label><label className="grid gap-1 text-sm font-semibold">Email<input name="email" required type="email" maxLength={254} autoComplete="email" className="rounded-lg border border-black/20 px-3 py-2.5 font-normal" /></label><label className="grid gap-1 text-sm font-semibold">Message<textarea name="message" required maxLength={3000} rows={5} className="rounded-lg border border-black/20 px-3 py-2.5 font-normal" /></label><label aria-hidden="true" className="absolute -left-[10000px] h-px w-px overflow-hidden">Leave this empty<input name="website" tabIndex={-1} autoComplete="off" /></label><button type="submit" className="justify-self-start rounded-lg px-5 py-3 font-bold text-black" style={{ backgroundColor: theme.primaryColor }}>{String(content.submitLabel || 'Send message')}</button><p role="status" aria-live="polite" className="text-sm text-neutral-600">{formMessages[section.id] || ''}</p></form>
                    : section.type === 'newsletter' ? <form className="mt-6 flex max-w-xl flex-col gap-3 sm:flex-row" onSubmit={async (event) => { event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); const endpoint = typeof content.apiEndpoint === 'string' && content.apiEndpoint ? content.apiEndpoint : '/api/newsletter'; setFormMessages((current) => ({ ...current, [section.id]: 'Subscribing…' })); try { if (!endpoint.startsWith('/api/') && !/^https:\/\//i.test(endpoint)) throw new Error('Form endpoint must be a local /api/ route or secure https:// URL.'); const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: data.get('email'), source: `site:${subdomain}`, website: data.get('website') }) }); const result = await response.json() as { success?: boolean; message?: string }; if (!response.ok || (!content.apiEndpoint && !result.success)) throw new Error(result.message || 'Could not subscribe.'); form.reset(); setFormMessages((current) => ({ ...current, [section.id]: String(content.successMessage || 'You are subscribed. Thank you!') })); } catch (error) { setFormMessages((current) => ({ ...current, [section.id]: error instanceof Error ? error.message : 'Could not subscribe. Please try again.' })); } }}><label className="sr-only" htmlFor={`newsletter-${section.id}`}>Email address</label><input id={`newsletter-${section.id}`} name="email" required type="email" maxLength={254} autoComplete="email" placeholder="Email address" className="min-w-0 flex-1 rounded-lg border border-black/20 px-3 py-2.5" /><label aria-hidden="true" className="absolute -left-[10000px] h-px w-px overflow-hidden">Leave this empty<input name="website" tabIndex={-1} autoComplete="off" /></label><button type="submit" className="rounded-lg px-5 py-3 font-bold text-black" style={{ backgroundColor: theme.primaryColor }}>{String(content.submitLabel || 'Subscribe')}</button><p role="status" aria-live="polite" className="self-center text-sm text-neutral-600">{formMessages[section.id] || ''}</p></form>
                    : section.type === 'faq' ? <div className="mt-6 divide-y divide-black/10">{items.map((item, index) => <details key={index} className="py-4"><summary className="cursor-pointer font-bold">{String(item.question || item.title || `Question ${index + 1}`)}</summary><p className="mt-2 leading-relaxed text-neutral-600">{String(item.answer || item.description || '')}</p></details>)}</div>
                    : section.type === 'gallery' || section.type === 'product-grid' ? <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{items.map((item, index) => { const itemName = String(item.name || item.title || `Item ${index + 1}`); const productIndex = storeProducts.findIndex((product) => product.name === itemName); const product = productIndex >= 0 ? storeProducts[productIndex] : undefined; return <article key={index} className={`overflow-hidden rounded-2xl border ${isVoltGear ? 'border-white/10 bg-[#1B202C]' : isKuroCraft ? 'border-white/10 bg-[#121214]' : 'border-[#1F2A1B]/10 bg-white'} shadow-sm transition-transform hover:-translate-y-1`}><div className={`flex aspect-[4/3] items-center justify-center overflow-hidden ${isVoltGear ? 'bg-[#202532]' : isKuroCraft ? 'bg-[#18181B]' : 'bg-[#E8F0DF]'}`}>{typeof item.src === 'string' && item.src ? <Image src={item.src} alt={String(item.alt || itemName)} width={640} height={480} unoptimized className="h-full w-full object-cover" /> : product ? <StoreProductArtwork fresh={isFreshCrate} isKuro={isKuroCraft} index={productIndex} name={itemName} category={product.category}/> : <div className="h-full w-full bg-gradient-to-br from-[#E8F0DF] via-white to-[#F4A93B]/30" aria-hidden="true"/>}</div><div className="p-4"><h3 className="font-bold">{product ? <a href={productHref(itemName)} className="hover:underline">{itemName}</a> : itemName}</h3>{typeof item.description === 'string' && <p className={`mt-1 text-sm ${isVoltGear || isKuroCraft ? 'text-white/60' : 'text-neutral-600'}`}>{item.description}</p>}{typeof item.price === 'string' && <p className="mt-3 font-bold">{item.price}</p>}{section.type === 'product-grid' && product && <button type="button" onClick={() => addToBag(product)} className="mt-3 w-full rounded-lg px-3 py-2 text-sm font-bold text-black" style={{ backgroundColor: theme.primaryColor }}>{isKuroCraft ? 'Explore Case Study ↗' : `Add to ${isFreshCrate ? 'crate' : 'bag'}`}</button>}</div></article>; })}</div>
                    : items.length ? <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{items.map((item, index) => <article key={index} className={`rounded-xl border p-5 ${isVoltGear ? 'border-white/10 bg-[#1B202C]' : isKuroCraft ? 'border-white/10 bg-[#18181B]' : 'border-black/10 bg-neutral-50'}`}><h3 className="font-bold">{String(item.title || item.name || item.question || `Item ${index + 1}`)}</h3>{typeof item.description === 'string' && <p className={`mt-2 text-sm leading-relaxed ${isVoltGear || isKuroCraft ? 'text-white/60' : 'text-neutral-600'}`}>{item.description}</p>}{typeof item.answer === 'string' && <p className={`mt-2 text-sm leading-relaxed ${isVoltGear || isKuroCraft ? 'text-white/60' : 'text-neutral-600'}`}>{item.answer}</p>}{typeof item.quote === 'string' && <blockquote className={`mt-2 text-sm leading-relaxed ${isVoltGear || isKuroCraft ? 'text-white/60' : 'text-neutral-600'}`}>“{item.quote}”</blockquote>}{typeof item.price === 'string' && <p className="mt-3 font-bold">{item.price}</p>}</article>)}</div>
                    : typeof content.body === 'string' ? <p className="mt-5 whitespace-pre-wrap leading-relaxed text-neutral-700">{content.body}</p> : <p className="mt-5 text-sm text-neutral-500">{description || `Explore ${heading}.`}</p>}
                </section>;
              })}
              {activePage === 'shop' && <StoreCatalog products={storeProducts} pages={sitePages} subdomain={subdomain} accent={theme.primaryColor} isVolt={isVoltGear} onAdd={addToBag} />}
              {/(shop|collection|store)/i.test(title) && !page?.sections?.some((section) => section.type === 'product-grid') && <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{storeProducts.map((product, index) => <article key={product.name} className="overflow-hidden rounded-2xl border border-black/10 bg-white"><div className="flex h-56 items-center justify-center bg-neutral-100">{assetUrl ? <Image src={assetUrl} alt={product.name} width={640} height={640} unoptimized className="h-full w-full object-cover" /> : <span className="text-5xl font-black">0{index + 1}</span>}</div><div className="p-5"><span className="font-mono text-[10px] uppercase text-neutral-500">{product.category}</span><h2 className="font-bold">{product.name}</h2><p className="mt-2 text-sm text-neutral-600">{product.detail}</p><div className="mt-4 flex items-center justify-between"><strong>₹{product.price.toLocaleString('en-IN')}</strong><button type="button" onClick={() => addToBag(product)} className="rounded-lg px-4 py-2 text-sm font-bold" style={{ backgroundColor: theme.primaryColor }}>Add to bag</button></div></div></article>)}</div>}
              {/cart/i.test(title) && <div className="mt-8 rounded-2xl border border-black/10 bg-white p-6"><h2 className="text-2xl font-bold">Your bag</h2>{cartItems.length ? <ul className="mt-4 divide-y divide-black/10">{cartItems.map((item) => <li key={item.name} className="flex items-center justify-between gap-3 py-3"><span>{item.name} × {item.quantity}</span><strong>₹{(item.price * item.quantity).toLocaleString('en-IN')}</strong></li>)}</ul> : <p className="mt-2 text-neutral-600">Your bag is empty.</p>}<p className="mt-3 font-bold">Subtotal ₹{bagSubtotal.toLocaleString('en-IN')}</p><button type="button" onClick={() => setCartOpen(true)} className="mt-5 inline-flex rounded-lg px-5 py-3 font-bold" style={{ backgroundColor: theme.primaryColor }}>Review bag</button>{checkoutPage && <button type="button" onClick={() => setActivePage(checkoutPage.id)} className="ml-3 mt-5 inline-flex rounded-lg border border-black px-5 py-3 font-bold">Continue to checkout</button>}</div>}
              {/checkout/i.test(title) && <div className={`mt-8 grid gap-6 lg:grid-cols-[1.2fr_.8fr]`}><form className={`grid gap-4 rounded-2xl border p-6 ${isVoltGear ? 'border-white/10 bg-[#151923]' : 'border-[#1F2A1B]/10 bg-white'}`} onSubmit={(event) => { event.preventDefault(); setFormMessages((current) => ({ ...current, checkout: 'Checkout preview complete. Connect a payment provider to accept orders.' })); }}><div><h2 className="text-xl font-bold">Delivery details</h2><p className={`mt-1 text-sm ${isVoltGear ? 'text-white/55' : 'text-neutral-600'}`}>This is a preview checkout. No payment will be collected.</p></div><label className="grid gap-1 text-sm font-semibold">Email address<input required type="email" autoComplete="email" className="rounded-lg border border-black/20 bg-white px-4 py-3 font-normal text-black"/></label><label className="grid gap-1 text-sm font-semibold">Full name<input required autoComplete="name" className="rounded-lg border border-black/20 bg-white px-4 py-3 font-normal text-black"/></label><label className="grid gap-1 text-sm font-semibold">Delivery address<input required autoComplete="street-address" className="rounded-lg border border-black/20 bg-white px-4 py-3 font-normal text-black"/></label>{isFreshCrate && <label className="grid gap-1 text-sm font-semibold">Delivery window<select className="rounded-lg border border-black/20 bg-white px-4 py-3 font-normal text-black"><option>Saturday · 9:00–12:00</option><option>Saturday · 12:00–15:00</option><option>Sunday · 9:00–12:00</option></select></label>}<button className="rounded-lg px-5 py-3 font-bold text-black" style={{ backgroundColor: theme.primaryColor }}>Review order</button><p role="status" aria-live="polite" className="text-sm">{formMessages.checkout || ''}</p></form><aside className={`h-fit rounded-2xl border p-6 ${isVoltGear ? 'border-white/10 bg-[#151923]' : 'border-[#1F2A1B]/10 bg-white'}`}><h2 className="text-lg font-bold">Order summary</h2>{cartItems.length ? <ul className="mt-4 divide-y divide-current/10">{cartItems.map((item) => <li key={item.name} className="flex justify-between gap-3 py-3 text-sm"><span>{item.name} × {item.quantity}</span><strong>₹{(item.price * item.quantity).toLocaleString('en-IN')}</strong></li>)}</ul> : <p className={`mt-3 text-sm ${isVoltGear ? 'text-white/55' : 'text-neutral-600'}`}>Your bag is empty. Add a product before checkout.</p>}<div className="mt-4 flex justify-between border-t border-current/10 pt-4"><span>Subtotal</span><strong>₹{bagSubtotal.toLocaleString('en-IN')}</strong></div><p className={`mt-2 text-xs ${isVoltGear ? 'text-white/45' : 'text-neutral-500'}`}>Shipping and taxes are calculated after delivery details.</p></aside></div>}
              {/(shop|collection|store|cart|checkout)/i.test(title) || <div className="mt-10 rounded-2xl border border-black/10 bg-white p-6 sm:p-10"><h2 className="text-2xl font-bold">Discover {siteTitle}</h2><p className="mt-3 leading-relaxed text-neutral-600">{heroContent.description}</p><a href={`/live/${subdomain}?page=collection`} className="mt-6 inline-flex rounded-lg px-5 py-3 font-bold" style={{ backgroundColor: theme.primaryColor }}>Explore collection</a></div>}
            </div>;
          })()}
        </section>}
        <div className="pointer-events-none absolute inset-0 z-30" aria-label="Custom site elements">{canvasElements.map((item) => {
          const IconComponent = ({ Star, Heart, Sparkles, Camera, CheckCircle2, ArrowUpRight } as Record<string, typeof Star>)[item.icon || 'Star'] || Star;
          return <div key={item.id} className="absolute pointer-events-auto" style={{ left: item.x, top: item.y + 48, width: item.width, height: item.height }}>{item.src ? <Image src={item.src} alt={item.name} width={item.width} height={item.height} unoptimized className={`h-full w-full ${item.type === 'image' ? 'rounded-lg object-cover' : 'object-contain'}`} /> : item.type === 'image' ? null : <div className="flex h-full w-full items-center justify-center"><IconComponent size={Math.min(item.width, item.height) * .65} /></div>}</div>;
        })}</div>
      </main>
      {watermarkRequired && (!isPreview || previewWatermarkVisible) && <div className="fixed bottom-3 right-3 z-[60] inline-flex items-center gap-1 rounded-full border border-black/20 bg-white/90 py-1.5 pl-2.5 pr-1.5 text-[11px] font-semibold text-neutral-800 shadow-lg backdrop-blur">
        <a href="https://launchly.site" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2" aria-label="Made with Launchly">
          <Image src="/brand-logo-clean.png" alt="" width={20} height={20} className="h-5 w-5 rounded-full object-contain" /> Made with Launchly
        </a>
        {isPreview && <button type="button" onClick={() => setPreviewWatermarkVisible(false)} aria-label="Hide preview watermark" title="Hide preview watermark" className="ml-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-neutral-500 hover:bg-black/10 hover:text-black">×</button>}
      </div>}
    </div>
  );
}
