'use client';

import Link from 'next/link';
import { Eye, ArrowUpRight, ArrowRight } from 'lucide-react';
import { Template } from '@/types';

// High-fidelity, award-winning visual previews for each template
function TemplatePreviewCanvas({ template }: { template: Template }) {
  const previews: Record<string, React.ReactNode> = {
    'fresh-crate': (
      <div className="relative flex h-full flex-col overflow-hidden bg-[#FFF8EC] p-4 text-[#1F2A1B]">
        <div className="flex items-center justify-between border-b border-[#1F2A1B]/15 pb-2 font-mono text-[8px] uppercase tracking-[.18em]"><span>FRESH CRATE</span><span>Shop&nbsp;&nbsp; Recipes&nbsp;&nbsp; Basket (0)</span></div>
        <div className="my-auto grid grid-cols-[1.1fr_.9fr] items-center gap-3 py-4"><div><span className="font-mono text-[7px] uppercase tracking-[.2em] text-[#3FA34D]">Picked fresh, nearby</span><h3 className="mt-2 font-serif text-2xl leading-[1.05]">Good food starts close to home.</h3><p className="mt-2 max-w-40 text-[8px] leading-relaxed text-[#6B7566]">Seasonal produce from farms you can get to know.</p><span className="mt-3 inline-flex rounded-full bg-[#3FA34D] px-3 py-1 font-mono text-[7px] font-bold uppercase text-white">Build your crate ↗</span></div><div className="relative flex aspect-[4/5] items-end overflow-hidden rounded-[45%_45%_12px_12px] bg-gradient-to-br from-[#F4A93B]/20 via-[#97C56A]/35 to-[#3FA34D]/40 p-2"><svg viewBox="0 0 240 300" aria-hidden="true" className="absolute inset-0 h-full w-full"><path d="M39 132h162l-15 125H55z" fill="#C3874D"/><path d="M48 151h144M53 194h134M58 237h124" stroke="#8F5C36" strokeWidth="8"/><path d="M64 139c-4-63 32-81 47-24 17-68 53-70 59-4 30-49 58-27 49 27" fill="none" stroke="#3FA34D" strokeWidth="12" strokeLinecap="round"/><circle cx="76" cy="152" r="25" fill="#E76F51"/><circle cx="119" cy="146" r="23" fill="#F4A93B"/><circle cx="158" cy="155" r="24" fill="#89B85D"/><circle cx="99" cy="194" r="22" fill="#D84D42"/><circle cx="143" cy="198" r="23" fill="#F2BC47"/></svg><span className="relative z-10 rounded bg-[#FFF8EC]/90 px-2 py-1 font-mono text-[7px]">MARKET CRATE · ₹1,499</span></div></div>
        <div className="grid grid-cols-3 gap-2 border-t border-[#1F2A1B]/15 pt-2">{[['01','Picked today'],['02','Local farms'],['03','At your door']].map(([n,label]) => <div key={label} className="rounded-lg bg-white/70 p-2"><span className="font-mono text-[7px] text-[#3FA34D]">{n}</span><p className="mt-1 text-[8px] font-bold">{label}</p></div>)}</div>
      </div>
    ),
    'volt-gear': (
      <div className="relative flex h-full flex-col overflow-hidden bg-[#0B0D12] p-4 text-[#F5F7FA]">
        <div className="flex items-center justify-between border-b border-white/15 pb-2 font-mono text-[8px] uppercase tracking-[.16em]"><span>VOLT / GEAR</span><span>Shop&nbsp;&nbsp; Compare&nbsp;&nbsp; Cart (0)</span></div>
        <div className="my-auto rounded-2xl border border-[#C6FF3D]/25 bg-gradient-to-br from-[#151923] via-[#11151D] to-[#34275B] px-4 py-5 text-center"><span className="font-mono text-[7px] uppercase tracking-[.22em] text-[#C6FF3D]">New drop · 04:18:32</span><h3 className="mx-auto mt-2 max-w-52 text-2xl font-black leading-[1.05]">Build a setup that moves with you.</h3><p className="mx-auto mt-2 max-w-48 text-[8px] leading-relaxed text-[#8A93A6]">Precision gear for focused work, play, and everything between.</p><span className="mt-3 inline-flex rounded bg-[#C6FF3D] px-3 py-1 font-mono text-[7px] font-bold uppercase text-[#0B0D12]">Explore the drop ↗</span></div>
        <div className="mt-3 grid grid-cols-3 gap-2">{[['01','PULSE ANC','#4B5570'],['02','VOLT KEYS','#626B32'],['03','NOVA QHD','#382A69']].map(([n,label,color]) => <div key={label} className="rounded-lg border border-white/10 bg-[#151923] p-2"><div className="flex h-12 items-center justify-center rounded-md" style={{ background: `linear-gradient(145deg, ${color}, #0B0D12)` }}><svg viewBox="0 0 48 38" aria-hidden="true" className="h-8 w-10"><path d="M12 24v-8C12 7 17 3 24 3s12 4 12 13v8" fill="none" stroke="#C6FF3D" strokeWidth="4" strokeLinecap="round"/><rect x="7" y="17" width="9" height="15" rx="3" fill="#30384A" stroke="#C6FF3D" strokeWidth="2"/><rect x="32" y="17" width="9" height="15" rx="3" fill="#30384A" stroke="#C6FF3D" strokeWidth="2"/></svg></div><p className="mt-1 font-mono text-[6px] text-[#C6FF3D]">{n}</p><p className="text-[7px] font-bold">{label}</p></div>)}</div>
      </div>
    ),
    'kuro-craft': (
      <div className="relative flex h-full flex-col justify-between overflow-hidden bg-[#090A0F] p-4 text-[#F4F6FB] select-none">
        {/* Glow backdrop */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-[#00F0FF]/15 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#7000FF]/15 rounded-full blur-2xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-2 relative z-10">
          <div className="flex items-center gap-1.5 font-mono text-[8px] font-bold tracking-[.18em] text-[#00F0FF]">
            <span>KURO STUDIO</span>
          </div>
          <div className="flex items-center gap-1 font-mono text-[7px] text-[#A0AEC0]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00FF66] animate-pulse" />
            <span>AVAILABLE Q1/Q2</span>
          </div>
        </div>

        {/* Hero Preview */}
        <div className="my-auto py-2 relative z-10">
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="font-mono text-[7px] uppercase tracking-[.2em] text-[#00F0FF] bg-[#00F0FF]/10 px-2 py-0.5 rounded border border-[#00F0FF]/20">
              Product &amp; Systems
            </span>
            <span className="font-mono text-[7px] text-white/50">3× FWA</span>
          </div>
          <h3 className="font-display text-xl font-black leading-tight text-white tracking-tight">
            Designing interfaces that redefine utility.
          </h3>
          <p className="mt-1.5 text-[8px] font-mono leading-relaxed text-[#94A3B8] line-clamp-1">
            Partnering with venture-backed engineering teams to ship iconic software.
          </p>

          {/* Featured Case Study Card */}
          <div className="mt-2.5 rounded-xl border border-[#00F0FF]/30 bg-gradient-to-br from-[#121826] to-[#0A0D14] p-2.5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <span className="font-mono text-[6px] uppercase tracking-wider text-[#00F0FF]">CASE STUDY 01</span>
                <p className="text-[9px] font-bold text-white mt-0.5">Vortex Design System</p>
              </div>
              <span className="font-mono text-[7px] font-bold text-[#00FF66] bg-[#00FF66]/10 px-1.5 py-0.5 rounded border border-[#00FF66]/20">
                +99.4% ADOPTION
              </span>
            </div>
            <div className="mt-2 flex items-center gap-1.5">
              <span className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[6px] text-white/70">UI/UX</span>
              <span className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[6px] text-white/70">Design Tokens</span>
              <span className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[6px] text-white/70">Next.js 16</span>
            </div>
          </div>
        </div>

        {/* Footer info bar */}
        <div className="border-t border-white/10 pt-2 flex items-center justify-between font-mono text-[7px] text-[#64748B] relative z-10">
          <span>TRUSTED BY VERCEL &amp; LINEAR</span>
          <span className="text-[#00F0FF] font-bold">VIEW WORK ↗</span>
        </div>
      </div>
    ),
    'agenn-ai': (
      <div className="h-full relative overflow-hidden bg-[#F8FAFC] text-[#0F172A] p-4 flex flex-col justify-between select-none">
        {/* Blue tech glow */}
        <div className="absolute top-0 right-0 w-48 h-36 bg-[#3B82F6]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-40 h-32 bg-[#3B82F6]/10 rounded-full blur-2xl pointer-events-none" />
        
        {/* Tech header */}
        <div className="flex items-center justify-between border-b border-black/10 pb-2.5 relative z-10">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-sm tracking-tight text-[#3B82F6]">TECH.HUB</span>
            <span className="text-[8px] font-mono text-[#3B82F6] bg-blue-50 px-1.5 py-0.5 rounded font-bold">DEALS</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-white border border-black/5 flex items-center justify-center">
              <span className="text-[10px]">🔍</span>
            </div>
            <div className="w-6 h-6 rounded-lg bg-white border border-black/5 flex items-center justify-center">
              <span className="text-[10px]">⚖️</span>
            </div>
            <div className="relative">
              <div className="w-6 h-6 rounded-lg bg-[#3B82F6] flex items-center justify-center">
                <span className="text-[10px]">🛒</span>
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#0F172A] text-white text-[8px] font-bold rounded-full flex items-center justify-center">4</div>
            </div>
          </div>
        </div>

        {/* Specs-focused layout */}
        <div className="my-auto py-2 relative z-10">
          <div className="bg-gradient-to-r from-[#3B82F6]/20 to-transparent rounded-xl p-3 mb-3 border border-[#3B82F6]/30">
            <span className="text-[8px] font-mono text-[#3B82F6] font-bold uppercase tracking-wider block mb-0.5">Tech Deals</span>
            <h4 className="text-lg font-bold text-[#0F172A] leading-tight">
              Latest Gadgets & Gear
            </h4>
          </div>
          
          {/* Single large product with specs */}
          <div className="bg-white p-3 rounded-xl border border-black/5 shadow-sm mb-2">
            <div className="flex items-start gap-3">
              <div className="w-16 h-16 bg-gradient-to-br from-[#3B82F6]/20 to-blue-100 rounded-lg flex items-center justify-center shrink-0">
                <span className="text-[#3B82F6] text-2xl">📱</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[8px] font-semibold">Smartphone Pro</span>
                  <span className="text-[6px] bg-[#3B82F6] text-white px-1.5 py-0.5 rounded font-bold">NEW</span>
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1 text-[6px] text-[#64748B]">
                    <span>•</span>
                  <span>6.7&quot; OLED Display</span>
                  </div>
                  <div className="flex items-center gap-1 text-[6px] text-[#64748B]">
                    <span>•</span>
                    <span>A18 Pro Chip</span>
                  </div>
                  <div className="flex items-center gap-1 text-[6px] text-[#64748B]">
                    <span>•</span>
                    <span>256GB Storage</span>
                  </div>
                </div>
                <span className="text-[7px] font-mono font-bold text-[#3B82F6] block mt-1">$899</span>
              </div>
            </div>
          </div>

          {/* Mini product cards */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white p-2 rounded-lg border border-black/5 text-center">
              <div className="h-8 bg-gradient-to-br from-[#1E293B] to-[#334155] rounded mb-1 flex items-center justify-center">
                <span className="text-white text-sm">💻</span>
              </div>
              <span className="text-[7px] font-semibold block truncate">Laptop</span>
              <span className="text-[6px] font-mono font-bold text-[#0F172A]">$1,299</span>
            </div>
            <div className="bg-white p-2 rounded-lg border border-black/5 text-center relative">
              <div className="absolute -top-1 -right-1 bg-[#EF4444] text-white text-[5px] font-bold px-1 py-0.5 rounded">-20%</div>
              <div className="h-8 bg-gradient-to-br from-gray-100 to-gray-200 rounded mb-1 flex items-center justify-center">
                <span className="text-[#0F172A] text-sm">🎧</span>
              </div>
              <span className="text-[7px] font-semibold block truncate">Headphones</span>
              <span className="text-[6px] font-mono font-bold text-[#3B82F6]">$159</span>
            </div>
            <div className="bg-gradient-to-br from-[#3B82F6]/10 to-transparent p-2 rounded-lg border border-[#3B82F6]/20 text-center">
              <div className="h-8 bg-gradient-to-br from-[#3B82F6]/30 to-transparent rounded mb-1 flex items-center justify-center border border-[#3B82F6]/20">
                <span className="text-[#3B82F6] text-sm">⌚</span>
              </div>
              <span className="text-[7px] font-semibold block truncate text-[#0F172A]">Watch</span>
              <span className="text-[6px] font-mono font-bold text-[#3B82F6]">$349</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10">
          <div className="flex items-center justify-between text-[8px] font-mono text-[#64748B] mb-2 pb-2 border-t border-black/8 pt-2">
            <span>⚡ FAST SHIPPING</span>
            <span className="text-[#3B82F6]">🔧 WARRANTY</span>
          </div>
          <div className="flex items-center justify-between bg-[#0F172A] text-white p-2.5 rounded-xl shadow-lg">
            <div>
              <span className="text-[7px] font-mono text-white/60 block">Total (4 items)</span>
              <span className="text-sm font-mono font-black">$2,706.00</span>
            </div>
            <button className="bg-[#3B82F6] hover:bg-[#2563EB] text-white px-4 py-1.5 rounded-lg text-[9px] font-bold font-mono transition-colors">
              CHECKOUT →
            </button>
          </div>
        </div>
      </div>
    ),
  }

  return (
    <div className="w-full h-full">
      {previews[template.id] || (
        <div className="h-full flex flex-col justify-between p-5 select-none" style={{ background: template.bgColor || '#0D0B18', color: template.textColor || '#FFFFFF' }}>
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <span className="font-mono text-xs font-bold">{template.name}</span>
            <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-white/10">{template.category}</span>
          </div>
          <div className="my-auto py-2">
            <h4 className="text-xl font-black leading-tight mb-2">{template.name}</h4>
            <p className="text-xs opacity-75 line-clamp-2">{template.description}</p>
          </div>
          <div className="text-[9px] font-mono opacity-60 pt-2 border-t border-white/10 flex justify-between">
            <span>NEXT.JS 15</span>
            <span>EXPLORE ↗</span>
          </div>
        </div>
      )}
    </div>
  );
}

interface TemplateCardProps {
  template: Template;
  onCustomize?: (template: Template) => void;
}

export default function TemplateCard({ template, onCustomize }: TemplateCardProps) {
  return (
    <div className="group rounded-2xl overflow-hidden border-[3px] border-ink bg-card shadow-brutal hover:shadow-brutal-lg hover:-translate-y-1 transition-all flex flex-col justify-between">
      {/* Visual preview canvas */}
      <div className="relative h-60 sm:h-64 overflow-hidden bg-[#0A0A0C] border-b-[3px] border-ink">
        <div className="w-full h-full transition-transform duration-500 ease-out group-hover:scale-[1.03]">
          <TemplatePreviewCanvas template={template} />
        </div>

        {/* Neo-brutalist hover actions overlay */}
        <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-3 p-4">
          <Link
            href={`/templates/${template.id}`}
            className="brutal-press flex items-center gap-1.5 px-4 py-2 bg-card text-ink border-[2.5px] border-ink rounded-xl text-xs font-display font-black shadow-brutal-sm hover:bg-[#faf5ff] dark:hover:bg-[#1f2136] cursor-pointer"
            onClick={(e) => e.stopPropagation()}
          >
            <Eye size={14} />
            <span>Preview</span>
          </Link>

          <Link
            href={`/editor/${template.id}`}
            className="brutal-press flex items-center gap-1.5 px-4 py-2 bg-pink text-black border-[2.5px] border-ink rounded-xl text-xs font-display font-black shadow-brutal-sm hover:bg-yellow cursor-pointer"
            onClick={(e) => {
              if (onCustomize) {
                e.preventDefault();
                onCustomize(template);
              }
            }}
          >
            <span>Edit</span>
            <ArrowRight size={13} className="stroke-[3]" />
          </Link>
        </div>
      </div>

      {/* Neo-brutal card details */}
      <div className="p-5 sm:p-6 flex flex-col justify-between flex-1">
        <div>
          {/* Top row: Name & Badges */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <Link
              href={`/templates/${template.id}`}
              className="font-display font-black text-lg text-ink tracking-tight hover:text-pink transition-colors line-clamp-1"
            >
              {template.name}
            </Link>

            <div className="flex flex-wrap items-center gap-1.5 shrink-0 justify-end">
              {template.badge && (
                <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-black uppercase bg-yellow text-black border border-ink shadow-2xs">
                  {template.badge}
                </span>
              )}
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-mint text-black border-2 border-ink">
                {template.category}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border-2 border-ink ${
                  template.isPro
                    ? 'bg-yellow text-black'
                    : 'bg-pink text-black'
                }`}
              >
                {template.isPro ? 'Pro' : 'Free'}
              </span>
            </div>
          </div>

          {/* Description */}
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mb-4 font-mono">
            {template.description}
          </p>
        </div>

        {/* Bottom row: Review rating and action */}
        <div className="pt-3 border-t-[2px] border-ink/20 flex items-center justify-between font-mono text-[11px] gap-2">
          <div className="flex items-center gap-1 text-ink font-bold shrink-0">
            <span className="text-yellow font-black">★</span>
            <span>{template.rating || '4.99'}</span>
            <span className="text-muted-foreground hidden xs:inline">({template.reviewsCount || '150'})</span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/templates/${template.id}`}
              className="inline-flex items-center gap-1 text-xs font-display font-black text-ink hover:text-pink transition-colors"
            >
              <span>View</span>
              <ArrowUpRight size={13} className="stroke-[3]" />
            </Link>
            <Link
              href={`/editor/${template.id}`}
              onClick={(e) => {
                if (onCustomize) {
                  e.preventDefault();
                  onCustomize(template);
                }
              }}
              className="md:hidden brutal-press px-2.5 py-1 bg-pink text-black border-[1.5px] border-ink rounded-lg text-[11px] font-display font-black shadow-2xs hover:bg-yellow"
            >
              Edit
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
