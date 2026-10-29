import { NextResponse } from 'next/server';
import { exportTemplateAsZip } from '@/lib/zipExport';
import { getProAccess } from '@/lib/proAccess';
import { getClientIp, rateLimit } from '@/lib/rateLimit';
import type { SiteDocument } from '@/lib/siteDocument';

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > 25 * 1024 * 1024) {
    return NextResponse.json({ success: false, message: 'The website export is too large.' }, { status: 413 });
  }

  const limit = rateLimit(`site-export:${getClientIp(request)}`, 5, 60 * 1000);
  if (!limit.success) {
    return NextResponse.json(
      { success: false, message: 'Too many export requests. Please wait a minute.' },
      { status: 429 },
    );
  }

  try {
    const access = await getProAccess();
    if (!access.authenticated) {
      return NextResponse.json({ success: false, message: 'Sign in to export your website.' }, { status: 401 });
    }
    if (!access.isPro) {
      return NextResponse.json({ success: false, message: 'ZIP export requires a Pro plan.' }, { status: 403 });
    }

    const body = await request.json() as { document?: SiteDocument; format?: 'zip' | 'json' };
    const document = body.document;
    if (!document || document.version !== 4 || !document.templateId || !document.name || !document.theme || !Array.isArray(document.pages) || !document.pages.length) {
      return NextResponse.json({ success: false, message: 'The site document is incomplete or unsupported.' }, { status: 400 });
    }

    const url = new URL(request.url);
    const exportFormat = (url.searchParams.get('format') || body.format || 'zip').toLowerCase();

    if (exportFormat === 'json') {
      const fileName = `${document.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'launchly-site'}-config.json`;
      return new NextResponse(JSON.stringify(document, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${fileName}"`,
          'Cache-Control': 'private, no-store',
        },
      });
    }

    const archive = await exportTemplateAsZip({
      siteTitle: document.name,
      templateId: document.templateId,
      theme: {
        primaryColor: document.theme.primaryColor,
        bgColor: document.theme.bgColor,
        textColor: document.theme.textColor,
        fontFamily: document.theme.fontFamily,
        borderRadius: document.theme.borderRadius,
      },
      heroContent: { badge: '', title: '', description: '', ctaPrimary: '', ctaSecondary: '' },
      featuresContent: [],
      testimonialsContent: [],
      ctaContent: { title: '', desc: '', buttonText: '' },
      document,
    });

    return new NextResponse(archive, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${document.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'launchly-site'}-nextjs.zip"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    console.error('Site ZIP export failed:', error);
    return NextResponse.json({ success: false, message: 'Could not export this website.' }, { status: 500 });
  }
}
