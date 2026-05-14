const SC_CONFIG = {
  supabaseUrl:  'https://dipagzqrvivposqjkdkx.supabase.co',
  supabaseKey:  'sb_publishable_36c12XT90Y3BfDqh5tUSXQ_4BHRpVFU',
  stripePaymentLink: 'https://buy.stripe.com/14A00i2zoaeN0YuaT88IU03',
  stripePortalUrl: 'https://billing.stripe.com/p/login/9B64gy5LA3QpcHc8L08IU00',
  polygonApiKey: 'GvKphrcYFTwv6DwM2_0OAuxW49K2xyVI',
  finnhubApiKey: 'd7dcla9r01qggoenrpogd7dcla9r01qggoenrpp0',
  adminEmails: ['dsrackler@gmail.com'],
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

// Returns the profile row. Admin emails are auto-treated as paid so admins
// can never paywall themselves out of their own platform. Selects only
// `is_paid` — the one column we know exists on the profiles table.
async function scGetProfile(userId) {
  const sb = getSupabase();
  if (!sb || !userId) return null;

  // Admin bypass — current session email vs SC_CONFIG.adminEmails
  try {
    const session = await scGetSession();
    const email = session && session.user && session.user.email;
    if (email && Array.isArray(SC_CONFIG.adminEmails) &&
        SC_CONFIG.adminEmails.indexOf(email.toLowerCase()) >= 0) {
      console.log('[SC] Admin bypass active for ' + email);
      return { is_paid: true, _admin_bypass: true };
    }
  } catch (e) {}

  try {
    const { data, error } = await sb
      .from('profiles')
      .select('is_paid')
      .eq('id', userId)
      .single();
    if (error) {
      console.warn('[SC] scGetProfile error:', error.message || error);
      return null;
    }
    return data;
  } catch (err) {
    console.warn('[SC] scGetProfile threw:', err);
    return null;
  }
}

async function scSignOut() {
  const sb = getSupabase();
  if (sb) {
    try { await sb.auth.signOut(); } catch (e) {}
  }
  window.location.href = '/login.html';
}

function scCheckout(userId, email) {
  let url = SC_CONFIG.stripePaymentLink;
  const params = new URLSearchParams();
  if (userId) params.set('client_reference_id', userId);
  if (email)  params.set('prefilled_email', email);
  const qs = params.toString();
  if (qs) url += (url.includes('?') ? '&' : '?') + qs;
  window.location.href = url;
}

async function scRequireAuth() {
  const session = await scGetSession();
  if (!session) {
    window.location.replace('/login.html');
    return null;
  }
  return session;
}

async function scPollSubscription(userId, maxAttempts = 8) {
  const sb = getSupabase();
  if (!sb) return false;

  // Admin bypass — admins are paid by definition
  try {
    const session = await scGetSession();
    const email = session && session.user && session.user.email;
    if (email && Array.isArray(SC_CONFIG.adminEmails) &&
        SC_CONFIG.adminEmails.indexOf(email.toLowerCase()) >= 0) {
      return true;
    }
  } catch (e) {}

  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, 2500));
    try {
      const { data } = await sb
        .from('profiles')
        .select('is_paid')
        .eq('id', userId)
        .single();
      if (data?.is_paid) return true;
    } catch (e) {}
  }
  return false;
}
