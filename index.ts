// ============================================================
// SUBMARINE CATALYST — Stripe Webhook Handler
// Supabase Edge Function
//
// Handles: checkout.session.completed, customer.subscription.updated,
//          customer.subscription.deleted
//
// DEPLOYMENT:
//   1. Install Supabase CLI: npm i -g supabase
//   2. Login: supabase login
//   3. Link project: supabase link --project-ref dipagzqrvivposqjkdkx
//   4. Set secrets:
//      supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxxxx
//      supabase secrets set STRIPE_SECRET_KEY=sk_live_xxxxx
//      supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
//   5. Deploy: supabase functions deploy stripe-webhook --no-verify-jwt
//   6. In Stripe Dashboard → Developers → Webhooks → Add endpoint:
//      URL: https://dipagzqrvivposqjkdkx.supabase.co/functions/v1/stripe-webhook
//      Events: checkout.session.completed, customer.subscription.updated,
//              customer.subscription.deleted
//   7. Copy the webhook signing secret (whsec_...) into step 4 above
// ============================================================

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import Stripe from "https://esm.sh/stripe@14.14.0?target=deno";

const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET");
const STRIPE_SECRET_KEY     = Deno.env.get("STRIPE_SECRET_KEY");
const SUPABASE_URL          = Deno.env.get("SUPABASE_URL") ?? "https://dipagzqrvivposqjkdkx.supabase.co";
const SERVICE_ROLE_KEY      = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" });

// Use service role so we can write to profiles regardless of RLS
const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

serve(async (req) => {
  // Only accept POST
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // Verify Stripe signature
  const body = await req.text();
  const sig  = req.headers.get("stripe-signature");

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("⚠️ Webhook signature verification failed:", err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  console.log(`✅ Received event: ${event.type} [${event.id}]`);

  try {
    switch (event.type) {
      // ── NEW SUBSCRIPTION / ONE-TIME PAYMENT ──────────────────
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId          = session.client_reference_id;   // passed from frontend
        const stripeCustomerId = session.customer;
        const customerEmail   = session.customer_email || session.customer_details?.email;
        const subscriptionId  = session.subscription;

        console.log(`  checkout.session.completed: user=${userId}, customer=${stripeCustomerId}, email=${customerEmail}`);

        if (!userId) {
          // Try to find user by email as fallback
          if (customerEmail) {
            const { data: users } = await supabaseAdmin.auth.admin.listUsers();
            const match = users?.users?.find(
              (u) => u.email?.toLowerCase() === customerEmail.toLowerCase()
            );
            if (match) {
              await activateUser(match.id, stripeCustomerId, subscriptionId);
              console.log(`  ✅ Activated user by email match: ${match.id}`);
            } else {
              console.warn(`  ⚠️ No user found for email: ${customerEmail}`);
            }
          } else {
            console.warn("  ⚠️ No client_reference_id or email in session");
          }
        } else {
          await activateUser(userId, stripeCustomerId, subscriptionId);
          console.log(`  ✅ Activated user: ${userId}`);
        }
        break;
      }

      // ── SUBSCRIPTION UPDATED (renewal, plan change, etc.) ────
      case "customer.subscription.updated": {
        const sub = event.data.object;
        const stripeCustomerId = sub.customer;
        const status = sub.status; // active, past_due, canceled, unpaid, etc.

        console.log(`  subscription.updated: customer=${stripeCustomerId}, status=${status}`);

        const isPaid = status === "active" || status === "trialing";
        await updateByStripeCustomer(stripeCustomerId, {
          is_paid: isPaid,
          subscription_status: status,
        });
        console.log(`  ✅ Updated subscription status: ${status}, is_paid: ${isPaid}`);
        break;
      }

      // ── SUBSCRIPTION CANCELED / DELETED ──────────────────────
      case "customer.subscription.deleted": {
        const sub = event.data.object;
        const stripeCustomerId = sub.customer;

        console.log(`  subscription.deleted: customer=${stripeCustomerId}`);

        await updateByStripeCustomer(stripeCustomerId, {
          is_paid: false,
          subscription_status: "canceled",
        });
        console.log(`  ✅ Deactivated subscription for customer: ${stripeCustomerId}`);
        break;
      }

      default:
        console.log(`  ℹ️ Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    console.error(`❌ Error processing ${event.type}:`, err);
    // Return 200 anyway to prevent Stripe retries on app-level errors
    // (Stripe will retry on 4xx/5xx, which can cause duplicate processing)
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});

// ── HELPER: Activate user by Supabase user ID ─────────────────
async function activateUser(userId, stripeCustomerId, subscriptionId) {
  const updates = {
    is_paid: true,
    subscription_status: "active",
    plan_tier: "pro",
  };
  if (stripeCustomerId) updates.stripe_customer_id = stripeCustomerId;
  if (subscriptionId)   updates.stripe_subscription_id = subscriptionId;

  const { error } = await supabaseAdmin
    .from("profiles")
    .upsert(
      { id: userId, ...updates },
      { onConflict: "id" }
    );

  if (error) {
    console.error(`  ❌ Failed to activate user ${userId}:`, error);
    throw error;
  }
}

// ── HELPER: Update by Stripe customer ID ──────────────────────
async function updateByStripeCustomer(stripeCustomerId, updates) {
  const { error, count } = await supabaseAdmin
    .from("profiles")
    .update(updates)
    .eq("stripe_customer_id", stripeCustomerId);

  if (error) {
    console.error(`  ❌ Failed to update customer ${stripeCustomerId}:`, error);
    throw error;
  }

  if (count === 0) {
    console.warn(`  ⚠️ No profile found for stripe_customer_id: ${stripeCustomerId}`);
  }
}
