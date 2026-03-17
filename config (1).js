const SC_CONFIG = {
  supabaseUrl:  'https://dipagzqrvivposqjkdkx.supabase.co',
  supabaseKey:  'sb_publishable_36c12XT90Y3BfDqh5tUSXQ_4BHRpVFU',
  stripePaymentLink: 'https://buy.stripe.com/7sYdR85LA1IhgXs0eu8IU01',
  stripePortalUrl: null,
  adminEmails: [],
  siteName: 'Submarine Catalyst',
  domain: 'submarinecatalyst.com',
};

let _supabase = null;

function getSupabase() {
  if (_supabase) return _supabase;
  if (typeof supabase === 'undefined' || !supabase.createClient) {
    console.error('[SC] Supabase library not loaded.');
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

async function scGetSession() {
  const sb = getSupabase();
  if (!sb) return null;
  try {
    const { data: { session }, error } = await sb.auth.getSession();
    if (error) return null;
    return session;
  } catch (err) { return null; }
}

async function scGetProfile(userId) {
  const sb = getSupabase();
  if (!sb || !userId) return null;
  try {
    const { data, error } = await sb.from('profiles').select('is_paid, plan_tier, subscription_status, stripe_customer_id, created_at').eq('id', userId).single();
    if (error) return null;
    return data;
  } catch (err) { return null; }
}

async function scSignOut() {
  const sb = getSupabase();
  if (sb) try { await sb.auth.signOut(); } catch (e) {}
  window.location.href = '/login.html';
}

function scCheckout(userId, email) {
  let url = SC_CONFIG.stripePaymentLink;
  const params = new URLSearchParams();
  if (userId) params.set('client_reference_id', userId);
  if (email) params.set('prefilled_email', email);
  const qs = params.toString();
  if (qs) url += (url.includes('?') ? '&' : '?') + qs;
  window.location.href = url;
}

async function scRequireAuth() {
  const session = await scGetSession();
  if (!session) { window.location.replace('/login.html'); return null; }
  return session;
}

async function scPollSubscription(userId, maxAttempts = 8) {
  const sb = getSupabase();
  if (!sb) return false;
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, 2500));
    try {
      const { data } = await sb.from('profiles').select('is_paid').eq('id', userId).single();
      if (data?.is_paid) return true;
    } catch (e) {}
  }
  return false;
}
