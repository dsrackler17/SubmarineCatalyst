// ============================================================
// SUBMARINE CATALYST — GLOBAL CONFIG
// Single source of truth for all credentials and settings.
// Update values HERE only — all pages import this file.
// ============================================================

const SC_CONFIG = {
  // Supabase
  supabaseUrl:  'https://dipagzqrvivposqjkdkx.supabase.co',
  supabaseKey:  'sb_publishable_36c12XT90Y3BfDqh5tUSXQ_4BHRpVFU',

  // Stripe Payment Link (append ?client_reference_id=USER_ID&prefilled_email=EMAIL)
  stripePaymentLink: 'https://buy.stripe.com/14A00i2zoaeN0YuaT88IU03',

  // Stripe Customer Portal (set this after activating in Stripe Dashboard → Settings → Billing → Customer Portal)
  // Example: 'https://billing.stripe.com/p/login/xxxxx'
  stripePortalUrl: null,

  // Admin email(s) — used for admin panel access control
  // Admin check handled server-side via is_admin column in profiles table
  adminEmails: [],

  // Site
  siteName: 'Submarine Catalyst',
  domain:   'submarinecatalyst.com',
};

// ============================================================
// SUPABASE CLIENT — initialized once, used everywhere
// ============================================================
let _supabase = null;

function getSupabase() {
  if (_supabase) return _supabase;
  if (typeof supabase === 'undefined' || !supabase.createClient) {
    console.error('[SC] Supabase library not loaded. Check script tag.');
    return null;
  }
  try {
    _supabase = supabase.createClient(SC_CONFIG.supabaseUrl, SC_CONFIG.supabaseKey);
    return _supabase;
  } catch (err) {
    console.error('[SC] Supabase init failed:', err);
    return null;
  }
}

// ============================================================
// AUTH HELPERS
// ============================================================

async function scGetSession() {
  const sb = getSupabase();
  if (!sb) return null;
  try {
    const { data: { session }, error } = await sb.auth.getSession();
    if (error) { console.warn('[SC] getSession error:', error.message); return null; }
    return session;
  } catch (err) {
    console.error('[SC] getSession failed:', err);
    return null;
  }
}

async function scGetProfile(userId) {
  const sb = getSupabase();
  if (!sb || !userId) return null;
  try {
    const { data, error } = await sb
      .from('profiles')
      .select('is_paid, plan_tier, subscription_status, stripe_customer_id, created_at')
      .eq('id', userId)
      .single();
    if (error) { console.warn('[SC] getProfile error:', error.message); return null; }
    return data;
  } catch (err) {
    console.error('[SC] getProfile failed:', err);
    return null;
  }
}

async function scSignOut() {
  const sb = getSupabase();
  if (!sb) return;
  try { await sb.auth.signOut(); } catch (e) { console.warn('[SC] signOut error:', e); }
  window.location.href = '/login.html';
}

// Redirect to Stripe Payment Link with user context
function scCheckout(userId, email) {
  let url = SC_CONFIG.stripePaymentLink;
  const params = new URLSearchParams();
  if (userId) params.set('client_reference_id', userId);
  if (email)  params.set('prefilled_email', email);
  const qs = params.toString();
  if (qs) url += (url.includes('?') ? '&' : '?') + qs;
  window.location.href = url;
}

// Auth guard — redirect to login if no session
async function scRequireAuth() {
  const session = await scGetSession();
  if (!session) {
    window.location.replace('/login.html');
    return null;
  }
  return session;
}

// Poll for subscription activation after Stripe redirect
async function scPollSubscription(userId, maxAttempts = 8) {
  const sb = getSupabase();
  if (!sb) return false;
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, 2500));
    try {
      const { data } = await sb
        .from('profiles')
        .select('is_paid')
        .eq('id', userId)
        .single();
      if (data?.is_paid) return true;
    } catch (e) { /* retry */ }
  }
  return false;
}
