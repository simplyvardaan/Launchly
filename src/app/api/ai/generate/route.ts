import { NextResponse } from 'next/server';

interface AiDesignResult {
  siteTitle: string;
  theme: {
    primaryColor: string;
    bgColor: string;
    textColor: string;
    fontFamily: string;
    borderRadius: string;
  };
  hero: {
    badge: string;
    title: string;
    description: string;
    ctaPrimary: string;
    ctaSecondary: string;
    stat1Label: string;
    stat1Value: string;
    stat2Label: string;
    stat2Value: string;
  };
  features: Array<{
    title: string;
    desc: string;
  }>;
  testimonials: Array<{
    quote: string;
    name: string;
    role: string;
  }>;
  cta: {
    title: string;
    desc: string;
    buttonText: string;
  };
}

import { rateLimit, getClientIp } from '@/lib/rateLimit';

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rl = rateLimit(`ai:${ip}`, 20, 60 * 1000);
    if (!rl.success) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded. Please wait a minute before generating new designs.' },
        { status: 429 }
      );
    }

    let body: { prompt?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid or malformed JSON payload.' },
        { status: 400 }
      );
    }

    const prompt = body?.prompt;
    if (typeof prompt !== 'string' || !prompt.trim()) {
      return NextResponse.json(
        { success: false, error: 'A text prompt is required to generate design tokens.' },
        { status: 400 }
      );
    }

    const cleanPrompt = prompt.trim().slice(0, 500);
    const p = cleanPrompt.toLowerCase();

    // Determine aesthetic archetype from user prompt
    let result: AiDesignResult;

    if (p.includes('cyber') || p.includes('crypto') || p.includes('web3') || p.includes('l2') || p.includes('blockchain') || p.includes('neon')) {
      result = {
        siteTitle: 'NeonPulse L2',
        theme: {
          primaryColor: '#00F0FF',
          bgColor: '#06070B',
          textColor: '#FFFFFF',
          fontFamily: 'Space Grotesk, sans-serif',
          borderRadius: '12px',
        },
        hero: {
          badge: 'ZERO-KNOWLEDGE // HYPER-SCALED',
          title: 'Deterministic execution for next-generation onchain compute.',
          description: 'Sub-second finality with mathematical validity proofs. Build verifiable AI inference and parallel state machines without roll-up friction.',
          ctaPrimary: 'Explore Mainnet Alpha',
          ctaSecondary: 'Read Whitepaper',
          stat1Label: 'PROVING THROUGHPUT',
          stat1Value: '18,400 TPS',
          stat2Label: 'PROOF GENERATION',
          stat2Value: '142ms Recursive',
        },
        features: [
          { title: 'Stateless ZK-SNARK Pipeline', desc: 'Hardware-accelerated FPGA proof distribution with constant verification costs.' },
          { title: 'Sub-cent Gas Fees', desc: 'Data availability compression guarantees 99.8% fee reduction on Ethereum L1.' },
          { title: 'EVM Equivalence', desc: 'Deploy existing Solidity or Vyper contracts with zero bytecode rewrites.' },
        ],
        testimonials: [
          { quote: 'We migrated 400k daily smart contract transactions and reduced our DA overhead by 92%.', name: 'Sora Takahashi', role: 'Protocol Architect' },
          { quote: 'The lowest latency ZK verification pipeline we have benchmarked across 12 networks.', name: 'Elena Rostova', role: 'DeFi Research Lead' },
        ],
        cta: {
          title: 'Deploy on testnet in under 60 seconds.',
          desc: 'Get instantaneous testnet faucet access, SDK documentation, and RPC endpoints.',
          buttonText: 'Claim RPC Key →',
        },
      };
    } else if (p.includes('ai') || p.includes('agent') || p.includes('llm') || p.includes('intelligence') || p.includes('robot') || p.includes('model') || p.includes('data')) {
      result = {
        siteTitle: 'Cognition Core',
        theme: {
          primaryColor: '#FF5588',
          bgColor: '#0A0A10',
          textColor: '#FFFFFF',
          fontFamily: 'Inter, sans-serif',
          borderRadius: '16px',
        },
        hero: {
          badge: 'AUTONOMOUS REASONING // RUNTIME v5',
          title: 'Multi-agent cognitive engine for mission-critical workflows.',
          description: 'Orchestrate hundreds of autonomous sub-agents with hierarchical memory, self-correcting code synthesis, and structured JSON tool calling.',
          ctaPrimary: 'Initialize Agent Cluster',
          ctaSecondary: 'Interactive Playground',
          stat1Label: 'STREAMING LATENCY',
          stat1Value: '8.4ms TTFT',
          stat2Label: 'BENCHMARK ACCURACY',
          stat2Value: '99.94% Zero-Shot',
        },
        features: [
          { title: 'Hierarchical Memory Graph', desc: 'Vector and semantic long-term memory retrieval across petabytes of workspace data.' },
          { title: 'Self-Healing Execution', desc: 'Automatic error capture and loop refactoring that guarantees zero pipeline stalls.' },
          { title: 'Strict Schema Guardrails', desc: 'Enforce deterministic structured output types for seamless enterprise API integration.' },
        ],
        testimonials: [
          { quote: 'Launchly cut our AI copilot rollout from four months of engineering down to one weekend.', name: 'Marcus Sterling', role: 'VP Engineering' },
          { quote: 'The multi-agent coordinator handles 2M customer conversations daily with flawless precision.', name: 'Claire Dubois', role: 'Head of Product' },
        ],
        cta: {
          title: 'Build your cognitive workforce today.',
          desc: 'Start with 100,000 free inference tokens and enterprise SOC2 compliance.',
          buttonText: 'Launch Free Sandbox →',
        },
      };
    } else if (p.includes('luxury') || p.includes('minimal') || p.includes('fashion') || p.includes('studio') || p.includes('architect') || p.includes('interior') || p.includes('cream')) {
      result = {
        siteTitle: 'Atelier Monochrome',
        theme: {
          primaryColor: '#171717',
          bgColor: '#F8F6F0',
          textColor: '#171717',
          fontFamily: 'Playfair Display, serif',
          borderRadius: '8px',
        },
        hero: {
          badge: 'MONOGRAPH // VOLUME 14',
          title: 'Spatial poetry carved through light, timber, and quiet restraint.',
          description: 'We conceive architectural pavilions and contemplative residencies designed to endure generations across Tokyo, Kyoto, and Zurich.',
          ctaPrimary: 'View Monograph',
          ctaSecondary: 'Private Commissions',
          stat1Label: 'SELECTED ARCHIVE',
          stat1Value: '34 Residencies',
          stat2Label: 'GLOBAL CITATIONS',
          stat2Value: '12 Pritzker Nominations',
        },
        features: [
          { title: 'Wabi-Sabi Proportion', desc: 'Harmonizing raw tactile cedar, honed volcanic basalt, and unbleached washi paper.' },
          { title: 'Passive Bioclimatics', desc: 'Natural thermal chimneys and micro-courtyard airflow that reduce energy draw by 60%.' },
          { title: 'Artisanal Joinery', desc: 'Traditional kigumi interlocking timber joints without a single steel fastener or screw.' },
        ],
        testimonials: [
          { quote: 'Our residence is a sanctuary of silence. Every shadow and angle of sunlight was considered.', name: 'Kenzo Matsuoka', role: 'Collector & Patron' },
          { quote: 'An architectural monograph brought to life. Pure poetic minimalism at its absolute finest.', name: 'Astrid Lindholm', role: 'Architecture Critic' },
        ],
        cta: {
          title: 'Commission a singular residence.',
          desc: 'Now accepting visionary private residential and pavilion briefs for 2027.',
          buttonText: 'Request Portfolio Catalogue →',
        },
      };
    } else if (p.includes('store') || p.includes('shop') || p.includes('ecommerce') || p.includes('product') || p.includes('brand')) {
      result = {
        siteTitle: 'Kura Goods',
        theme: {
          primaryColor: '#FFDD00',
          bgColor: '#0E0E12',
          textColor: '#FFFFFF',
          fontFamily: 'Inter, sans-serif',
          borderRadius: '16px',
        },
        hero: {
          badge: 'LIMITED CAPSULE // EDITION 03',
          title: 'Everyday artifacts engineered for permanence.',
          description: 'Precision-milled aerospace aluminum pens, heavy Japanese selvedge denim, and hand-finished mechanical keyboards.',
          ctaPrimary: 'Shop Capsule 03',
          ctaSecondary: 'Read Provenance',
          stat1Label: 'BATCH PRODUCTION',
          stat1Value: 'Only 250 Units',
          stat2Label: 'WARRANTY',
          stat2Value: 'Lifetime Guarantee',
        },
        features: [
          { title: 'Grade 5 Titanium Hardware', desc: 'CNC-machined from single billet blocks for indestructible everyday carry.' },
          { title: 'Worldwide Express Freight', desc: 'DHL Express doorstep delivery with fully inclusive carbon-neutral offsets.' },
          { title: 'Numbered Authenticity', desc: 'NFC cryptographic tag embedded in every product for lifetime verification.' },
        ],
        testimonials: [
          { quote: 'The heft and craftsmanship are unreal. easily the highest quality drop of the year.', name: 'Leo Vance', role: 'Industrial Designer' },
          { quote: 'Sold out within 14 minutes. The checkout experience was butter-smooth.', name: 'Devon Ray', role: 'Founding Collector' },
        ],
        cta: {
          title: 'Secure your numbered piece.',
          desc: 'Complimentary expedited global shipping on all capsule orders over $150.',
          buttonText: 'Order Capsule Edition →',
        },
      };
    } else {
      // General dynamic creative response
      const titleWords = prompt.trim().split(' ').slice(0, 3).map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      const cleanTitle = titleWords.length > 2 ? titleWords : 'Vanguard Studio';
      
      result = {
        siteTitle: cleanTitle,
        theme: {
          primaryColor: '#FF5588',
          bgColor: '#0C0D14',
          textColor: '#FFFFFF',
          fontFamily: 'Inter, sans-serif',
          borderRadius: '16px',
        },
        hero: {
          badge: 'NEXT-GENERATION PLATFORM',
          title: `Empowering ${prompt.slice(0, 40) || 'visionary teams'} with effortless scale.`,
          description: 'A bespoke digital experience tailored to your exact aesthetic, designed to captivate visitors and convert with unrivaled velocity.',
          ctaPrimary: 'Get Started Today',
          ctaSecondary: 'Explore Platform',
          stat1Label: 'PERFORMANCE INDEX',
          stat1Value: '99.98% Score',
          stat2Label: 'GLOBAL LATENCY',
          stat2Value: '0.14s Edge',
        },
        features: [
          { title: 'Speed & Fluid Motion', desc: 'Fluid 60FPS physics-based micro-interactions tailored for high conversion.' },
          { title: 'Modular Design Tokens', desc: 'Clean semantic tokens for effortless typography and color system tweaking.' },
          { title: 'Production Export', desc: 'Download clean Next.js 15 App Router source code whenever you are ready.' },
        ],
        testimonials: [
          { quote: 'Created and deployed our entire launch experience in under 15 minutes. Unbelievable.', name: 'Parivisha M.', role: 'Creative Director' },
          { quote: 'The aesthetic caliber makes our startup look like a series-B tech powerhouse.', name: 'Gourav M.', role: 'Lead Architect' },
        ],
        cta: {
          title: 'Turn your vision into reality.',
          desc: 'Join thousands of creators and developers launching high-converting pages today.',
          buttonText: 'Launch Your Project →',
        },
      };
    }

    return NextResponse.json({ success: true, design: result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
