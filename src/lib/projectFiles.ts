export interface ProjectTemplateParams {
  siteTitle: string;
  templateId: string;
  theme: {
    primaryColor: string;
    bgColor: string;
    textColor: string;
    fontFamily: string;
    borderRadius: string;
  };
  heroContent: {
    badge?: string;
    title: string;
    description: string;
    ctaPrimary: string;
    ctaSecondary: string;
  };
  featuresContent: Array<{ title: string; desc: string }>;
  testimonialsContent: Array<{ quote: string; name: string; role: string }>;
  ctaContent: { title: string; desc: string; buttonText: string };
  sectionOrder?: string[];
}

function safeCodeString(val: string): string {
  if (!val) return '';
  return String(val)
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$/g, '\\$')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/<\/(script|style)>/gi, '<\\/$1>');
}

export function generateProjectFiles({
  siteTitle,
  theme,
  heroContent,
  featuresContent,
  testimonialsContent,
  ctaContent,
}: ProjectTemplateParams): Record<string, string> {
  const folderName = siteTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'launchly-site';
  const isDark = theme.bgColor.toLowerCase().startsWith('#0') || theme.bgColor.toLowerCase().startsWith('#1') || theme.textColor === '#FFFFFF';

  const packageJson = {
    name: folderName,
    version: '1.0.0',
    private: true,
    scripts: {
      dev: 'next dev',
      build: 'next build',
      start: 'next start',
      lint: 'next lint',
    },
    dependencies: {
      next: '^16.4.0',
      react: '^19.0.0',
      'react-dom': '^19.0.0',
      'lucide-react': '^1.54.0',
    },
    devDependencies: {
      typescript: '^5.7.0',
      '@types/node': '^22.0.0',
      '@types/react': '^19.0.0',
      '@types/react-dom': '^19.0.0',
      tailwindcss: '^4.0.0',
      postcss: '^8.5.0',
    },
  };

  const tsConfig = {
    compilerOptions: {
      target: 'ES2022',
      lib: ['dom', 'dom.iterable', 'esnext'],
      allowJs: true,
      skipLibCheck: true,
      strict: true,
      noEmit: true,
      esModuleInterop: true,
      module: 'esnext',
      moduleResolution: 'bundler',
      resolveJsonModule: true,
      isolatedModules: true,
      jsx: 'preserve',
      incremental: true,
      plugins: [{ name: 'next' }],
      paths: { '@/*': ['./src/*'] },
    },
    include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'],
    exclude: ['node_modules'],
  };

  const nextConfig = `import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
`;

  const gitignore = `node_modules
/.pnp
.pnp.js
.yarn/cache
.yarn/unplugged
.yarn/build-state.yml
.yarn/install-state.gz
.pnp.*

.next/
out/
build
dist

.DS_Store
*.pem

npm-debug.log*
yarn-debug.log*
yarn-error.log*

.env*.local
.env

.vercel
*.tsbuildinfo
next-env.d.ts
`;

  const readme = `# ${safeCodeString(siteTitle)}

> Generated and exported directly via **Launchly Studio**.
> Production-ready Next.js 15 App Router architecture with Tailwind CSS and full TypeScript safety.

## 🚀 Quickstart

1. Install dependencies:
\`\`\`bash
npm install
\`\`\`

2. Run local development server:
\`\`\`bash
npm run dev
\`\`\`

3. Open [http://localhost:3000](http://localhost:3000) to view your site.

## ☁️ 1-Click Deployment to Vercel

Deploy directly to Vercel with zero configuration:
\`\`\`bash
npx vercel
\`\`\`

Or push this repository to GitHub and import it on [vercel.com](https://vercel.com).
`;

  const globalsCss = `@import "tailwindcss";

:root {
  --background: ${safeCodeString(theme.bgColor)};
  --foreground: ${safeCodeString(theme.textColor)};
  --primary: ${safeCodeString(theme.primaryColor)};
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: ${safeCodeString(theme.fontFamily)};
}
`;

  const layoutTsx = `import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '${safeCodeString(siteTitle)} — Built with Launchly',
  description: '${safeCodeString(heroContent.description || 'High-performance digital presence powered by Launchly.')}',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
`;

  const pageTsx = `'use client';

import { ArrowRight, CheckCircle2, Star, ShieldCheck, Sparkles } from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen" style={{ backgroundColor: '${safeCodeString(theme.bgColor)}', color: '${safeCodeString(theme.textColor)}' }}>
      {/* Navigation */}
      <nav className="border-b ${isDark ? 'border-white/10' : 'border-black/10'} px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
        <div className="font-black text-lg tracking-tight flex items-center gap-2">
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '${safeCodeString(theme.primaryColor)}' }} />
          <span>${safeCodeString(siteTitle)}</span>
        </div>
        <div className="flex items-center gap-4">
          <a
            href="#features"
            className="text-xs font-bold opacity-80 hover:opacity-100 transition-opacity"
          >
            Features
          </a>
          <a
            href="#cta"
            className="text-xs font-black px-4 py-2 rounded-xl transition-all shadow-sm"
            style={{ backgroundColor: '${safeCodeString(theme.primaryColor)}', color: '#000000', borderRadius: '${safeCodeString(theme.borderRadius)}' }}
          >
            Get Started
          </a>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 sm:py-28 px-6 max-w-4xl mx-auto text-center space-y-6">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider border ${
          isDark ? 'border-white/20 bg-white/10' : 'border-black/20 bg-black/5'
        }">
          <Star size={12} style={{ color: '${safeCodeString(theme.primaryColor)}' }} className="fill-current" />
          <span>${safeCodeString(heroContent.badge || 'PRO SPECIFICATION')}</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-tight">
          ${safeCodeString(heroContent.title)}
        </h1>

        <p className="text-base sm:text-lg opacity-80 max-w-2xl mx-auto leading-relaxed">
          ${safeCodeString(heroContent.description)}
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
          <a
            href="#cta"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-black text-sm transition-all shadow-md hover:scale-105"
            style={{ backgroundColor: '${safeCodeString(theme.primaryColor)}', color: '#000000', borderRadius: '${safeCodeString(theme.borderRadius)}' }}
          >
            <span>${safeCodeString(heroContent.ctaPrimary)}</span>
            <ArrowRight size={16} />
          </a>
          <a
            href="#features"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm border ${
              isDark ? 'border-white/20 bg-white/5' : 'border-black/20 bg-black/5'
            } opacity-90 hover:opacity-100 transition-all"
            style={{ borderRadius: '${safeCodeString(theme.borderRadius)}' }}
          >
            <span>${safeCodeString(heroContent.ctaSecondary)}</span>
          </a>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6 max-w-6xl mx-auto border-t ${isDark ? 'border-white/10' : 'border-black/10'}">
        <div className="text-center max-w-xl mx-auto mb-12 space-y-2">
          <span className="font-mono text-xs font-bold tracking-widest uppercase opacity-70">Architecture</span>
          <h2 className="text-3xl font-black tracking-tight">Engineered for Maximum Impact</h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          ${featuresContent
            .map(
              (f) => `
          <div className="p-6 rounded-2xl border ${
            isDark ? 'border-white/10 bg-white/5' : 'border-black/10 bg-black/[0.02]'
          }" style={{ borderRadius: '${safeCodeString(theme.borderRadius)}' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: '${safeCodeString(theme.primaryColor)}', color: '#000000' }}>
              <ShieldCheck size={18} />
            </div>
            <h3 className="text-lg font-black mb-2">${safeCodeString(f.title)}</h3>
            <p className="text-sm opacity-75 leading-relaxed">${safeCodeString(f.desc)}</p>
          </div>`
            )
            .join('\n')}
        </div>
      </section>

      {/* Testimonials */}
      ${
        testimonialsContent.length > 0
          ? `
      <section className="py-20 px-6 max-w-5xl mx-auto border-t ${isDark ? 'border-white/10' : 'border-black/10'}">
        <h2 className="text-2xl font-black mb-10 text-center tracking-tight">Trusted by Leading Squads</h2>
        <div className="grid md:grid-cols-2 gap-6">
          ${testimonialsContent
            .map(
              (t) => `
          <div className="p-6 rounded-2xl border ${
            isDark ? 'border-white/10 bg-white/5' : 'border-black/10 bg-black/[0.02]'
          } space-y-4" style={{ borderRadius: '${safeCodeString(theme.borderRadius)}' }}>
            <p className="italic text-sm sm:text-base opacity-90 leading-relaxed">“${safeCodeString(t.quote)}”</p>
            <div className="flex items-center gap-3 pt-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-black" style={{ backgroundColor: '${safeCodeString(theme.primaryColor)}' }}>
                ${safeCodeString(t.name.charAt(0))}
              </div>
              <div>
                <h4 className="text-xs font-black">${safeCodeString(t.name)}</h4>
                <p className="text-[10px] opacity-60 font-mono">${safeCodeString(t.role)}</p>
              </div>
            </div>
          </div>`
            )
            .join('\n')}
        </div>
      </section>`
          : ''
      }

      {/* CTA Section */}
      <section id="cta" className="py-20 px-6 max-w-4xl mx-auto border-t ${isDark ? 'border-white/10' : 'border-black/10'} text-center">
        <div className="p-10 rounded-3xl border ${
          isDark ? 'border-white/15 bg-white/5' : 'border-black/15 bg-black/[0.03]'
        } space-y-4" style={{ borderRadius: '${safeCodeString(theme.borderRadius)}' }}>
          <h2 className="text-3xl font-black">${safeCodeString(ctaContent.title)}</h2>
          <p className="text-sm opacity-80 max-w-md mx-auto">${safeCodeString(ctaContent.desc)}</p>
          <div className="pt-2">
            <button
              className="px-8 py-3.5 rounded-xl font-black text-sm shadow-lg hover:scale-105 transition-all cursor-pointer"
              style={{ backgroundColor: '${safeCodeString(theme.primaryColor)}', color: '#000000', borderRadius: '${safeCodeString(theme.borderRadius)}' }}
            >
              ${safeCodeString(ctaContent.buttonText)}
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t ${isDark ? 'border-white/10' : 'border-black/10'} text-center text-xs opacity-60 font-mono">
        <p>© {new Date().getFullYear()} ${safeCodeString(siteTitle)}. Crafted with Launchly.</p>
      </footer>
    </main>
  );
}
`;

  return {
    'package.json': JSON.stringify(packageJson, null, 2),
    'tsconfig.json': JSON.stringify(tsConfig, null, 2),
    'next.config.ts': nextConfig,
    '.gitignore': gitignore,
    'README.md': readme,
    'src/app/globals.css': globalsCss,
    'src/app/layout.tsx': layoutTsx,
    'src/app/page.tsx': pageTsx,
  };
}
