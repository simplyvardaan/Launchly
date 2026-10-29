'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  X,
  Share2,
  Copy,
  Check,
  Download,
  MessageCircle,
  Send,
  Code,
  Sliders
} from 'lucide-react';

function XTwitterIcon({ className = 'w-3.5 h-3.5 fill-current' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function LinkedInIcon({ className = 'w-3.5 h-3.5 fill-current' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9h2.78v8.37H6.46v-8.37M7.86 6.3a1.62 1.62 0 1 0 0 3.24 1.62 1.62 0 0 0 0-3.24z" />
    </svg>
  );
}

interface SocialShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  badge?: string;
  accent?: string;
  bgColor?: string;
  subdomain?: string;
}

const ACCENT_PRESETS = [
  { name: 'Hot Pink', color: '#FF5588' },
  { name: 'Electric Mint', color: '#7BD7C1' },
  { name: 'Cyber Yellow', color: '#FFE600' },
  { name: 'Sky Cyan', color: '#00F0FF' },
  { name: 'Neon Purple', color: '#A855F7' },
  { name: 'Tokyo Rose', color: '#F43F5E' },
];

export default function SocialShareModal({
  isOpen,
  onClose,
  title: initialTitle,
  description: initialDesc,
  badge: initialBadge = 'CREATIVE STUDIO // 2026',
  accent: initialAccent = '#FF5588',
  bgColor = '#0A0B10',
  subdomain = 'preview',
}: SocialShareModalProps) {
  const [title, setTitle] = useState(initialTitle);
  const [desc, setDesc] = useState(initialDesc);
  const [badge, setBadge] = useState(initialBadge);
  const [accent, setAccent] = useState(initialAccent);
  const [activePlatform, setActivePlatform] = useState<'twitter' | 'linkedin' | 'whatsapp' | 'raw'>('twitter');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMeta, setCopiedMeta] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTitle(initialTitle);
      setDesc(initialDesc);
      setBadge(initialBadge);
      setAccent(initialAccent);
    }
  }, [isOpen, initialTitle, initialDesc, initialBadge, initialAccent]);

  // Construct dynamic OG Image URL
  const ogImageUrl = useMemo(() => {
    const params = new URLSearchParams({
      title: title || 'Launchly Site',
      badge: badge || 'CREATIVE PLATFORM',
      desc: desc || 'High-performance digital presence powered by Launchly.',
      accent: accent || '#FF5588',
      bg: bgColor || '#0A0B10',
      subdomain: subdomain || 'launchly',
    });
    return `/api/og?${params.toString()}`;
  }, [title, badge, desc, accent, bgColor, subdomain]);

  const targetSiteUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/live/${subdomain}` 
    : `https://${subdomain}.launchly.site`;

  if (!isOpen) return null;

  const copyToClipboard = (text: string, type: 'link' | 'meta') => {
    navigator.clipboard?.writeText(text);
    if (type === 'link') {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } else {
      setCopiedMeta(true);
      setTimeout(() => setCopiedMeta(false), 2000);
    }
  };

  const handleShareTwitter = () => {
    const text = `Just crafted "${title}" on Launchly (by @simplyvardaan_)! Check out the live experience:`;
    window.open(
      `https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(targetSiteUrl)}`,
      '_blank'
    );
  };

  const handleShareLinkedIn = () => {
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(targetSiteUrl)}`,
      '_blank'
    );
  };

  const handleShareWhatsApp = () => {
    const text = `Check out "${title}" on Launchly: ${targetSiteUrl}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleShareTelegram = () => {
    window.open(
      `https://t.me/share/url?url=${encodeURIComponent(targetSiteUrl)}&text=${encodeURIComponent(`Check out ${title}`)}`,
      '_blank'
    );
  };

  const metaTagsSnippet = `<!-- Primary Meta Tags -->
<title>${title} — Launchly Studio</title>
<meta name="title" content="${title} — Launchly Studio" />
<meta name="description" content="${desc}" />

<!-- Open Graph / Facebook -->
<meta property="og:type" content="website" />
<meta property="og:url" content="${targetSiteUrl}" />
<meta property="og:title" content="${title}" />
<meta property="og:description" content="${desc}" />
<meta property="og:image" content="${typeof window !== 'undefined' ? window.location.origin : ''}${ogImageUrl}" />

<!-- Twitter / X -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:site" content="@simplyvardaan_" />
<meta name="twitter:creator" content="@simplyvardaan_" />
<meta name="twitter:url" content="${targetSiteUrl}" />
<meta name="twitter:title" content="${title}" />
<meta name="twitter:description" content="${desc}" />
<meta name="twitter:image" content="${typeof window !== 'undefined' ? window.location.origin : ''}${ogImageUrl}" />`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-3xl border-[3.5px] border-black bg-card text-ink shadow-[8px_8px_0px_#000] p-6 sm:p-8 relative max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b-2 border-black/15">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl border-2 border-black bg-mint text-black flex items-center justify-center shadow-[2px_2px_0px_#000]">
              <Share2 size={18} className="stroke-[2.5]" />
            </span>
            <div>
              <h2 className="font-display font-black text-lg sm:text-xl text-ink">
                Dynamic Social Share &amp; OG Card
              </h2>
              <p className="font-mono text-[11px] text-muted-foreground">
                Live 1200x630 card generation, social feed simulators, and 1-click sharing
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="brutal-press h-8 w-8 rounded-xl border-2 border-black bg-white hover:bg-neutral-100 text-black flex items-center justify-center shadow-[2px_2px_0px_#000] cursor-pointer"
          >
            <X size={16} className="stroke-[2.5]" />
          </button>
        </div>

        {/* Top Share Actions Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-5 pb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleShareTwitter}
              className="brutal-press inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 border-black bg-white hover:bg-[#1DA1F2] hover:text-white font-mono text-xs font-bold shadow-[2px_2px_0px_#000] transition-colors cursor-pointer text-black"
            >
              <XTwitterIcon className="w-3.5 h-3.5" />
              <span>Share on X</span>
            </button>

            <button
              type="button"
              onClick={handleShareLinkedIn}
              className="brutal-press inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 border-black bg-white hover:bg-[#0A66C2] hover:text-white font-mono text-xs font-bold shadow-[2px_2px_0px_#000] transition-colors cursor-pointer text-black"
            >
              <LinkedInIcon className="w-3.5 h-3.5" />
              <span>LinkedIn</span>
            </button>

            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="brutal-press inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 border-black bg-white hover:bg-[#25D366] hover:text-white font-mono text-xs font-bold shadow-[2px_2px_0px_#000] transition-colors cursor-pointer text-black"
            >
              <MessageCircle size={14} />
              <span>WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={handleShareTelegram}
              className="brutal-press inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 border-black bg-white hover:bg-[#0088cc] hover:text-white font-mono text-xs font-bold shadow-[2px_2px_0px_#000] transition-colors cursor-pointer text-black"
            >
              <Send size={14} />
              <span>Telegram</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => copyToClipboard(targetSiteUrl, 'link')}
              className="brutal-press inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 border-black bg-yellow text-black font-mono text-xs font-bold shadow-[2px_2px_0px_#000] cursor-pointer"
            >
              {copiedLink ? <Check size={14} className="stroke-[3]" /> : <Copy size={14} />}
              <span>{copiedLink ? 'Link Copied!' : 'Copy Site Link'}</span>
            </button>

            <a
              href={ogImageUrl}
              download={`${subdomain}-og-card.png`}
              target="_blank"
              rel="noreferrer"
              className="brutal-press inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 border-black bg-pink text-black font-mono text-xs font-bold shadow-[2px_2px_0px_#000] cursor-pointer"
            >
              <Download size={14} />
              <span>Download PNG</span>
            </a>
          </div>
        </div>

        {/* Simulator View Modes */}
        <div className="flex items-center gap-2 mt-4 pt-4 border-t-2 border-black/10">
          <span className="font-mono text-xs font-black uppercase text-muted-foreground mr-1">
            Preview in:
          </span>
          {[
            { id: 'twitter', label: 'X (Twitter) Card' },
            { id: 'linkedin', label: 'LinkedIn Post' },
            { id: 'whatsapp', label: 'Chat Unfurl' },
            { id: 'raw', label: 'Raw 1200×630 Image' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActivePlatform(tab.id as 'twitter' | 'linkedin' | 'whatsapp' | 'raw')}
              className={`px-3 py-1 rounded-lg border-2 border-black font-mono text-xs font-bold transition-all cursor-pointer ${
                activePlatform === tab.id
                  ? 'bg-yellow text-black shadow-[2px_2px_0px_#000]'
                  : 'bg-background text-muted-foreground hover:text-ink'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Live Visual Preview Frame */}
        <div className="mt-4 p-4 rounded-2xl border-[2.5px] border-black bg-neutral-100 dark:bg-[#0c0d15] shadow-[3px_3px_0px_#000]">
          {activePlatform === 'twitter' && (
            <div className="max-w-md mx-auto rounded-2xl border border-black/20 bg-card p-3 shadow-xs space-y-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-pink border border-black flex items-center justify-center font-bold text-xs text-black">
                  L
                </div>
                <div>
                  <div className="font-bold text-xs text-ink flex items-center gap-1">
                    <span>Creator</span>
                    <span className="text-muted-foreground font-mono text-[10px]">@builder</span>
                  </div>
                  <p className="text-[11px] text-ink">
                    Just deployed our new web experience with @simplyvardaan_! Check out the live build 👇
                  </p>
                </div>
              </div>

              {/* Twitter Large Summary Card */}
              <div className="rounded-xl border-2 border-black overflow-hidden bg-black shadow-xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={ogImageUrl}
                  alt={title}
                  className="w-full aspect-[1.91/1] object-cover"
                />
                <div className="p-2.5 bg-card border-t-2 border-black">
                  <span className="font-mono text-[9px] uppercase text-muted-foreground block truncate">
                    {subdomain}.launchly.site
                  </span>
                  <h4 className="font-display font-black text-xs text-ink truncate mt-0.5">
                    {title}
                  </h4>
                  <p className="font-sans text-[10px] text-muted-foreground line-clamp-1">
                    {desc}
                  </p>
                </div>
              </div>
            </div>
          )}

          {activePlatform === 'linkedin' && (
            <div className="max-w-md mx-auto rounded-2xl border border-black/20 bg-card p-3 shadow-xs space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-mint border border-black flex items-center justify-center font-bold text-xs text-black">
                  C
                </div>
                <div>
                  <span className="font-bold text-xs text-ink block">Product Founder</span>
                  <span className="font-mono text-[9px] text-muted-foreground">1st • Building in public</span>
                </div>
              </div>
              <p className="text-[11px] text-ink">
                Excited to reveal our new digital presence! Zero-lockin Next.js 15 export.
              </p>
              <div className="rounded-xl border-2 border-black overflow-hidden bg-black">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={ogImageUrl}
                  alt={title}
                  className="w-full aspect-[1.91/1] object-cover"
                />
                <div className="p-2.5 bg-card border-t border-black/10">
                  <h4 className="font-display font-black text-xs text-ink">{title}</h4>
                  <span className="font-mono text-[9px] text-muted-foreground">launchly.site • 1 min read</span>
                </div>
              </div>
            </div>
          )}

          {activePlatform === 'whatsapp' && (
            <div className="max-w-sm mx-auto p-2.5 rounded-2xl bg-[#005c4b]/20 border border-emerald-500/30">
              <div className="rounded-xl overflow-hidden border border-black/20 bg-card shadow-xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={ogImageUrl}
                  alt={title}
                  className="w-full aspect-[1.91/1] object-cover"
                />
                <div className="p-2 space-y-0.5">
                  <h4 className="font-bold text-xs text-ink truncate">{title}</h4>
                  <p className="text-[10px] text-muted-foreground line-clamp-1">{desc}</p>
                  <span className="font-mono text-[9px] text-emerald-600 dark:text-emerald-400 block font-bold">
                    {subdomain}.launchly.site
                  </span>
                </div>
              </div>
            </div>
          )}

          {activePlatform === 'raw' && (
            <div className="rounded-xl border-2 border-black overflow-hidden shadow-brutal max-w-xl mx-auto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={ogImageUrl}
                alt={title}
                className="w-full aspect-[1.91/1] object-cover"
              />
            </div>
          )}
        </div>

        {/* Live Card Customizer Accordion */}
        <div className="mt-5 space-y-3 pt-4 border-t-2 border-black/10">
          <div className="flex items-center gap-2 text-ink">
            <Sliders size={16} />
            <h3 className="font-display font-black text-xs uppercase tracking-wider">
              Customize OG Card Headline &amp; Accent
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-mono text-[10px] font-black uppercase text-ink mb-1">
                Headline
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl border-2 border-black bg-background font-mono text-xs text-ink focus:outline-none focus:ring-2 focus:ring-pink shadow-[2px_2px_0px_#000]"
              />
            </div>

            <div>
              <label className="block font-mono text-[10px] font-black uppercase text-ink mb-1">
                Category Badge
              </label>
              <input
                type="text"
                value={badge}
                onChange={(e) => setBadge(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl border-2 border-black bg-background font-mono text-xs text-ink focus:outline-none focus:ring-2 focus:ring-pink shadow-[2px_2px_0px_#000]"
              />
            </div>
          </div>

          <div>
            <label className="block font-mono text-[10px] font-black uppercase text-ink mb-1">
              Description Snippet
            </label>
            <input
              type="text"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border-2 border-black bg-background font-mono text-xs text-ink focus:outline-none focus:ring-2 focus:ring-pink shadow-[2px_2px_0px_#000]"
            />
          </div>

          {/* Accent Color Swatches */}
          <div>
            <label className="block font-mono text-[10px] font-black uppercase text-ink mb-1.5">
              Accent Border &amp; Glow Color
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {ACCENT_PRESETS.map((p) => (
                <button
                  key={p.color}
                  type="button"
                  onClick={() => setAccent(p.color)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border-2 border-black text-xs font-mono font-bold transition-transform cursor-pointer ${
                    accent === p.color ? 'scale-105 shadow-[2px_2px_0px_#000]' : 'opacity-80'
                  }`}
                  style={{ backgroundColor: p.color, color: '#000000' }}
                >
                  <span className="w-2 h-2 rounded-full bg-black inline-block" />
                  <span>{p.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Copy HTML Meta Tags Box */}
        <div className="mt-5 pt-4 border-t-2 border-black/10">
          <div className="flex items-center justify-between mb-2">
            <span className="font-display font-black text-xs uppercase tracking-wider text-ink flex items-center gap-1.5">
              <Code size={14} />
              <span>Production HTML Meta Tags Snippet</span>
            </span>
            <button
              type="button"
              onClick={() => copyToClipboard(metaTagsSnippet, 'meta')}
              className="brutal-press font-mono text-xs font-black text-pink hover:underline flex items-center gap-1 cursor-pointer"
            >
              {copiedMeta ? <Check size={12} className="stroke-[3]" /> : <Copy size={12} />}
              <span>{copiedMeta ? 'Snippet Copied!' : 'Copy <meta> Code'}</span>
            </button>
          </div>
          <pre className="p-3 rounded-xl border-2 border-black bg-neutral-900 text-neutral-300 font-mono text-[11px] overflow-x-auto leading-relaxed shadow-inner">
            {metaTagsSnippet}
          </pre>
        </div>
      </div>
    </div>
  );
}
