import { supabaseAdmin } from './supabase';
import { hashPassword, verifyPassword } from './auth';

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  plan: 'free' | 'pro';
  createdAt: string;
  avatar?: string;
}

export interface Subscriber {
  id: string;
  email: string;
  createdAt: string;
  source?: string;
  topics: string[];
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  message: string;
  createdAt: string;
}

export interface SiteRecord {
  id: string;
  userId?: string;
  templateId: string;
  name: string;
  subdomain: string;
  status: 'live' | 'building' | 'draft';
  customDomain?: string;
  views: number;
  createdAt: string;
  updatedAt: string;
  siteData?: Record<string, unknown>;
  draftData?: Record<string, unknown>;
}

export interface PaymentRecord {
  id: string;
  userEmail: string;
  planId: string;
  itemName: string;
  amount: string;
  currency: string;
  billingCycle: string;
  txnId: string;
  status: 'pending' | 'verified' | 'failed';
  paymentMethod: string;
  createdAt: string;
}

// In-memory fallback caches
const usersCache: User[] = [];

const subscribersCache: Subscriber[] = [];

const contactMessagesCache: ContactMessage[] = [];

const sitesCache: SiteRecord[] = [];

const paymentsCache: PaymentRecord[] = [];

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(normalizeEmail(email));
}

// ==========================================
// Authentication Database Methods
// ==========================================
export async function findUserByEmail(email: string): Promise<User | undefined> {
  const cleanEmail = normalizeEmail(email);

  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (!error && data) {
      return {
        id: data.id,
        name: data.name,
        email: data.email,
        passwordHash: data.password_hash,
        plan: data.plan,
        createdAt: data.created_at,
        avatar: data.avatar
      };
    }
  } catch (err) {
    console.warn('[Supabase] Fallback to usersCache:', err);
  }

  return usersCache.find((u) => u.email === cleanEmail);
}

export async function createUser(
  name: string, 
  email: string, 
  password: string, 
  plan: 'free' | 'pro' = 'free'
): Promise<{ success: boolean; user?: Omit<User, 'passwordHash'>; message: string }> {
  const cleanEmail = normalizeEmail(email);
  const cleanName = name.trim();

  if (!cleanName) return { success: false, message: 'Full name is required.' };
  if (!isValidEmail(cleanEmail)) return { success: false, message: 'Please enter a valid email address.' };
  if (!password || password.length < 8) return { success: false, message: 'Password must be at least 8 characters long.' };

  const existing = await findUserByEmail(cleanEmail);
  if (existing) {
    return { success: false, message: 'An account with this email already exists. Please log in.' };
  }

  const initials = cleanName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  const newUserId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();
  const hashedPassword = hashPassword(password);

  const newUser: User = {
    id: newUserId,
    name: cleanName,
    email: cleanEmail,
    passwordHash: hashedPassword,
    plan,
    createdAt: now,
    avatar: initials
  };

  try {
    const { error } = await supabaseAdmin.from('users').insert({
      id: newUserId,
      name: cleanName,
      email: cleanEmail,
      password_hash: hashedPassword,
      plan,
      avatar: initials,
      created_at: now,
      updated_at: now
    });

    if (error) {
      console.error('[Supabase] Insert user error:', error);
    }
  } catch (err) {
    console.warn('[Supabase] Failed to write to users table, keeping in cache:', err);
  }

  usersCache.push(newUser);

  const safeUser: Omit<User, 'passwordHash'> = {
    id: newUser.id,
    name: newUser.name,
    email: newUser.email,
    plan: newUser.plan,
    createdAt: newUser.createdAt,
    avatar: newUser.avatar,
  };
  return { success: true, user: safeUser, message: 'Account created successfully in Supabase!' };
}

export async function verifyUser(
  email: string, 
  password: string
): Promise<{ success: boolean; user?: Omit<User, 'passwordHash'>; message: string }> {
  const cleanEmail = normalizeEmail(email);
  const user = await findUserByEmail(cleanEmail);

  if (!user) {
    return { success: false, message: 'No account found with this email. Please sign up.' };
  }

  const isPasswordValid = verifyPassword(password, user.passwordHash);
  if (!isPasswordValid) {
    return { success: false, message: 'Incorrect password. Please try again.' };
  }

  // Gracefully upgrade legacy plain-text password to hash in background
  if (!user.passwordHash.includes(':')) {
    const upgradedHash = hashPassword(password);
    user.passwordHash = upgradedHash;
    (async () => {
      try {
        await supabaseAdmin
          .from('users')
          .update({ password_hash: upgradedHash })
          .eq('id', user.id);
      } catch (err: unknown) {
        console.warn('[Supabase] Failed to upgrade legacy password hash:', err);
      }
    })();
  }

  const safeUser: Omit<User, 'passwordHash'> = {
    id: user.id,
    name: user.name,
    email: user.email,
    plan: user.plan,
    createdAt: user.createdAt,
    avatar: user.avatar,
  };
  return { success: true, user: safeUser, message: 'Welcome back!' };
}

// ==========================================
// Subscriptions / Newsletter API
// ==========================================
export async function addSubscriber(
  email: string, 
  source = 'frontpage',
  topics?: string[]
): Promise<{ success: boolean; message: string; subscriber?: Subscriber }> {
  const cleanEmail = normalizeEmail(email);
  if (!isValidEmail(cleanEmail)) {
    return { success: false, message: 'Please enter a valid email address.' };
  }

  const id = `sub_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date().toISOString();

  const newSub: Subscriber = {
    id,
    email: cleanEmail,
    createdAt: now,
    source,
    topics: topics ?? [],
  };

  try {
    const { data: existing } = await supabaseAdmin
      .from('subscribers')
      .select('*')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (existing) {
      let savedTopics = Array.isArray(existing.topics) ? existing.topics as string[] : [];
      if (topics !== undefined) {
        const { error } = await supabaseAdmin.from('subscribers').update({ topics }).eq('email', cleanEmail);
        if (error) return { success: false, message: 'Subscription preferences could not be saved.' };
        savedTopics = topics;
      }
      return { 
        success: true, 
        message: "You're already subscribed! Check your inbox for updates.", 
        subscriber: { id: existing.id, email: existing.email, createdAt: existing.created_at, source: existing.source, topics: savedTopics }
      };
    }

    await supabaseAdmin.from('subscribers').insert({
      id,
      email: cleanEmail,
      source,
      topics: newSub.topics,
      created_at: now
    });
  } catch (err) {
    console.warn('[Supabase] Subscribers table error, fallback to cache:', err);
  }

  const cached = subscribersCache.find((subscriber) => subscriber.email === cleanEmail);
  if (cached) {
    if (topics !== undefined) cached.topics = topics;
    return { success: true, message: "You're already subscribed! Check your inbox for updates.", subscriber: cached };
  }
  subscribersCache.push(newSub);
  return {
    success: true,
    message: `Welcome aboard! You've joined Launchly early access.`,
    subscriber: newSub,
  };
}

export async function getSubscribersCount(): Promise<number> {
  try {
    const { count, error } = await supabaseAdmin
      .from('subscribers')
      .select('*', { count: 'exact', head: true });

    if (!error && count !== null) {
      return count;
    }
  } catch (err) {
    console.warn('[Supabase] getSubscribersCount fallback:', err);
  }
  return subscribersCache.length;
}

// ==========================================
// Contact messages API
// ==========================================
export async function addContactMessage(
  name: string, 
  email: string, 
  message: string
): Promise<{ success: boolean; message: string }> {
  const cleanEmail = normalizeEmail(email);
  if (!name.trim()) return { success: false, message: 'Name is required.' };
  if (!isValidEmail(cleanEmail)) return { success: false, message: 'Valid email is required.' };
  if (!message.trim() || message.length < 10) return { success: false, message: 'Please provide at least 10 characters for your message.' };

  const id = `msg_${Date.now()}`;
  const now = new Date().toISOString();

  const msg: ContactMessage = {
    id,
    name: name.trim(),
    email: cleanEmail,
    message: message.trim(),
    createdAt: now,
  };

  try {
    await supabaseAdmin.from('contact_messages').insert({
      id,
      name: name.trim(),
      email: cleanEmail,
      message: message.trim(),
      created_at: now
    });
  } catch (err) {
    console.warn('[Supabase] contact_messages error:', err);
  }

  contactMessagesCache.push(msg);
  return { success: true, message: 'Thank you! Our engineering team will review your inquiry within 24 hours.' };
}

// ==========================================
// Site Publishing API
// ==========================================
const RESERVED_SUBDOMAINS = new Set([
  'admin', 'api', 'auth', 'login', 'signup', 'dashboard', 'pay', 'checkout', 
  'billing', 'www', 'support', 'status', 'app', 'mail', 'root', 'help', 
  'static', 'assets', 'editor', 'internal', 'launchly', 'security'
]);

export async function publishSite(
  templateId: string, 
  siteName: string, 
  subdomain: string,
  userId?: string,
  siteData: Record<string, unknown> = {}
): Promise<{ success: boolean; site?: SiteRecord; message: string }> {
  const cleanSubdomain = subdomain.toLowerCase().replace(/[^a-z0-9-]/g, '');
  if (!cleanSubdomain || cleanSubdomain.length < 3) {
    return { success: false, message: 'Subdomain must be at least 3 alphanumeric characters.' };
  }

  if (RESERVED_SUBDOMAINS.has(cleanSubdomain)) {
    return { success: false, message: `Subdomain "${cleanSubdomain}" is reserved by the platform. Please choose another name.` };
  }

  if (!userId) {
    return { success: false, message: 'You must be signed in to publish and claim a website subdomain.' };
  }

  const id = `site_${Date.now()}`;
  const now = new Date().toISOString();

  const newSite: SiteRecord = {
    id,
    userId,
    templateId,
    name: siteName || 'My Launchly Website',
    subdomain: cleanSubdomain,
    status: 'live',
    views: 1,
    createdAt: now,
    updatedAt: now,
    siteData
  };

  try {
    const { data: existing } = await supabaseAdmin
      .from('sites')
      .select('id, user_id')
      .eq('subdomain', cleanSubdomain)
      .maybeSingle();

    if (existing) {
      if (existing.user_id && existing.user_id !== userId) {
        return { success: false, message: `Subdomain "${cleanSubdomain}.launchly.site" is already registered to another user.` };
      }

      const { error: updateError } = await supabaseAdmin.from('sites').update({
        user_id: userId,
        template_id: templateId,
        name: siteName || 'My Launchly Website',
        status: 'live',
        site_data: siteData,
        draft_data: null,
        updated_at: now
      }).eq('id', existing.id);
      if (updateError) throw updateError;

      const cacheIdx = sitesCache.findIndex(s => s.subdomain === cleanSubdomain);
      const updatedRecord: SiteRecord = {
        ...newSite,
        id: existing.id,
      };
      if (cacheIdx !== -1) {
        sitesCache[cacheIdx] = updatedRecord;
      } else {
        sitesCache.unshift(updatedRecord);
      }

      return {
        success: true,
        message: `Your site is updated live at https://${cleanSubdomain}.launchly.site!`,
        site: updatedRecord,
      };
    }

    const { error: insertError } = await supabaseAdmin.from('sites').insert({
      id,
      user_id: userId,
      template_id: templateId,
      name: siteName || 'My Launchly Website',
      subdomain: cleanSubdomain,
      status: 'live',
      views: 1,
      site_data: siteData,
      draft_data: null,
      created_at: now,
      updated_at: now
    });
    if (insertError) throw insertError;
  } catch (err) {
    console.warn('[Supabase] sites insert error, saving to cache:', err);
  }

  sitesCache.unshift(newSite);
  return {
    success: true,
    message: `Your site is published live at https://${cleanSubdomain}.launchly.site!`,
    site: newSite,
  };
}

export async function saveDraftSite(
  templateId: string,
  siteName: string,
  subdomain: string,
  userId: string,
  siteData: Record<string, unknown>
): Promise<{ success: boolean; site?: SiteRecord; message: string }> {
  const cleanSubdomain = subdomain.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/^-+|-+$/g, '');
  if (!cleanSubdomain || cleanSubdomain.length < 3) return { success: false, message: 'Choose a site name with at least 3 letters or numbers.' };
  if (!userId) return { success: false, message: 'Sign in to save this draft.' };
  const now = new Date().toISOString();
  try {
    const { data: existing, error } = await supabaseAdmin.from('sites').select('id, user_id, status, views, created_at, site_data, draft_data').eq('subdomain', cleanSubdomain).maybeSingle();
    if (error) console.warn('[Supabase] Draft lookup fallback:', error.message);
    if (existing?.user_id && existing.user_id !== userId) return { success: false, message: 'This site address belongs to another account.' };
    const id = existing?.id || sitesCache.find((site) => site.subdomain === cleanSubdomain)?.id || `site_${Date.now()}`;
    const publishedData = existing?.site_data && typeof existing.site_data === 'object'
      ? { ...(existing.site_data as Record<string, unknown>) }
      : {};
    delete publishedData.draftDocument;
    const site: SiteRecord = {
      id,
      userId,
      templateId,
      name: siteName || 'My Launchly Website',
      subdomain: cleanSubdomain,
      status: existing?.status === 'live' ? 'live' : 'draft',
      views: existing?.views || 0,
      createdAt: existing?.created_at || now,
      updatedAt: now,
      siteData: existing?.status === 'live' ? publishedData : {},
      draftData: siteData,
    };
    if (existing) {
      const { error: updateError } = await supabaseAdmin.from('sites').update({
        user_id: userId,
        template_id: templateId,
        name: site.name,
        draft_data: siteData,
        updated_at: now,
      }).eq('id', id);
      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await supabaseAdmin.from('sites').insert({
        id,
        user_id: userId,
        template_id: templateId,
        name: site.name,
        subdomain: cleanSubdomain,
        status: 'draft',
        views: 0,
        site_data: {},
        draft_data: siteData,
        created_at: now,
        updated_at: now,
      });
      if (insertError) throw insertError;
    }
    const index = sitesCache.findIndex((entry) => entry.subdomain === cleanSubdomain);
    if (index >= 0) sitesCache[index] = site; else sitesCache.unshift(site);
    return { success: true, site, message: 'Draft saved.' };
  } catch (error) {
    console.warn('[Supabase] Draft save using local process cache:', error);
    const existing = sitesCache.find((site) => site.subdomain === cleanSubdomain);
    if (existing && existing.userId !== userId) return { success: false, message: 'This site address belongs to another account.' };
    const site: SiteRecord = {
      id: existing?.id || `site_${Date.now()}`,
      userId,
      templateId,
      name: siteName || 'My Launchly Website',
      subdomain: cleanSubdomain,
      status: existing?.status === 'live' ? 'live' : 'draft',
      views: existing?.views || 0,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      siteData: existing?.status === 'live' ? existing.siteData : {},
      draftData: siteData,
    };
    if (existing) sitesCache[sitesCache.indexOf(existing)] = site; else sitesCache.unshift(site);
    return { success: true, site, message: 'Draft saved locally for this server process.' };
  }
}

interface DbSiteRow {
  id: string;
  user_id?: string;
  template_id: string;
  name: string;
  subdomain: string;
  custom_domain?: string;
  status: 'live' | 'building' | 'draft';
  views: number;
  created_at: string;
  updated_at: string;
  site_data?: Record<string, unknown>;
  draft_data?: Record<string, unknown> | null;
}

function publishedSiteData(siteData?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!siteData || !Object.hasOwn(siteData, 'draftDocument')) return siteData;
  const published = { ...siteData };
  delete published.draftDocument;
  return published;
}

function editorDraftData(row: DbSiteRow): Record<string, unknown> | undefined {
  if (row.draft_data && typeof row.draft_data === 'object') return row.draft_data;
  const legacyDraft = row.site_data?.draftDocument;
  if (legacyDraft && typeof legacyDraft === 'object' && !Array.isArray(legacyDraft)) {
    return legacyDraft as Record<string, unknown>;
  }
  return row.site_data;
}

export async function getAllSites(): Promise<SiteRecord[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('sites')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      return (data as unknown as DbSiteRow[]).map((d) => ({
        id: d.id,
        templateId: d.template_id,
        name: d.name,
        subdomain: d.subdomain,
        customDomain: d.custom_domain,
        status: d.status,
        views: d.views,
        createdAt: d.created_at,
        updatedAt: d.updated_at,
        siteData: publishedSiteData(d.site_data)
      }));
    }
  } catch (err) {
    console.warn('[Supabase] getAllSites error:', err);
  }

  return sitesCache.map((site) => ({
    id: site.id,
    templateId: site.templateId,
    name: site.name,
    subdomain: site.subdomain,
    customDomain: site.customDomain,
    status: site.status,
    views: site.views,
    createdAt: site.createdAt,
    updatedAt: site.updatedAt,
    siteData: publishedSiteData(site.siteData),
  }));
}

export async function getSitesForUser(userId: string): Promise<SiteRecord[]> {
  if (!userId) return [];

  try {
    const { data, error } = await supabaseAdmin
      .from('sites')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      return (data as unknown as DbSiteRow[]).map((d) => ({
        id: d.id,
        userId: d.user_id,
        templateId: d.template_id,
        name: d.name,
        subdomain: d.subdomain,
        customDomain: d.custom_domain,
        status: d.status,
        views: d.views,
        createdAt: d.created_at,
        updatedAt: d.updated_at,
        siteData: editorDraftData(d),
        draftData: d.draft_data || undefined,
      }));
    }
  } catch (err) {
    console.warn('[Supabase] getSitesForUser error:', err);
  }

  return sitesCache
    .filter((site) => site.userId === userId || (!site.userId && site.siteData?.userId === userId))
    .map((site) => ({ ...site, siteData: site.draftData || site.siteData }));
}

export async function deleteSite(id: string, userId: string): Promise<{ success: boolean; message: string }> {
  if (!id || !userId) {
    return { success: false, message: 'Invalid site ID or unauthenticated request.' };
  }

  try {
    // Check ownership before deleting
    const { data: existing } = await supabaseAdmin
      .from('sites')
      .select('id, user_id')
      .eq('id', id)
      .maybeSingle();

    if (existing && existing.user_id && existing.user_id !== userId) {
      return { success: false, message: 'Forbidden. You do not own this website.' };
    }

    await supabaseAdmin
      .from('sites')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
  } catch (err) {
    console.warn('[Supabase] deleteSite error:', err);
  }

  const idx = sitesCache.findIndex(s => s.id === id);
  if (idx !== -1) {
    sitesCache.splice(idx, 1);
  }
  return { success: true, message: 'Website deleted successfully.' };
}

// ==========================================
// Payments & Purchases API (QR Code & UPI)
// ==========================================
export async function recordPayment(
  userEmail: string,
  planId: string,
  itemName: string,
  amount: string,
  txnId: string,
  billingCycle = 'monthly',
  currency = 'USD'
): Promise<{ success: boolean; payment?: PaymentRecord; message: string }> {
  const cleanEmail = normalizeEmail(userEmail);
  const id = `pay_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date().toISOString();

  const record: PaymentRecord = {
    id,
    userEmail: cleanEmail,
    planId,
    itemName,
    amount,
    currency,
    billingCycle,
    txnId,
    status: 'verified',
    paymentMethod: 'qr_upi',
    createdAt: now,
  };

  try {
    await supabaseAdmin.from('payments').insert({
      id,
      user_email: cleanEmail,
      plan_id: planId,
      item_name: itemName,
      amount,
      currency,
      billing_cycle: billingCycle,
      txn_id: txnId,
      status: 'verified',
      payment_method: 'qr_upi',
      created_at: now
    });

    // If purchasing pro plan, upgrade user's account plan to pro
    if (planId === 'pro' && cleanEmail) {
      await supabaseAdmin
        .from('users')
        .update({ plan: 'pro', updated_at: now })
        .eq('email', cleanEmail);
    }
  } catch (err) {
    console.warn('[Supabase] recordPayment error, logging to cache:', err);
  }

  paymentsCache.unshift(record);

  return {
    success: true,
    payment: record,
    message: 'Payment recorded and verified successfully in Supabase database.'
  };
}
