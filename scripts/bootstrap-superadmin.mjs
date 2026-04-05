#!/usr/bin/env node
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

function readArg(name) {
  const exact = process.argv.find((arg) => arg.startsWith(`${name}=`));
  if (exact) {
    return exact.slice(name.length + 1);
  }

  const index = process.argv.findIndex((arg) => arg === name);
  if (index >= 0) {
    return process.argv[index + 1];
  }

  return undefined;
}

function hasFlag(flag) {
  return process.argv.includes(flag);
}

function printUsage() {
  console.log("Usage:");
  console.log("  npm run bootstrap:superadmin -- --email user@example.com --confirm");
  console.log("  npm run bootstrap:superadmin -- --email user@example.com --revoke --confirm");
  console.log("");
  console.log("Required environment variables:");
  console.log("  NEXT_PUBLIC_SUPABASE_URL");
  console.log("  SUPABASE_SERVICE_ROLE_KEY");
}

async function main() {
  const emailArg = readArg("--email");
  const email = String(emailArg ?? "").trim().toLowerCase();
  const shouldRevoke = hasFlag("--revoke");
  const confirmed = hasFlag("--confirm");

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.error("Error: Provide a valid email with --email.");
    printUsage();
    process.exit(1);
  }

  if (!confirmed) {
    console.error("Error: Missing --confirm flag.");
    console.error("This script changes privileged access. Re-run with --confirm.");
    process.exit(1);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Error: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: matches, error: lookupError } = await admin
    .from("profiles")
    .select("id, email, is_superadmin")
    .ilike("email", email)
    .limit(2);

  if (lookupError) {
    console.error(`Error: Profile lookup failed: ${lookupError.message}`);
    process.exit(1);
  }

  if (!matches || matches.length === 0) {
    console.error(`Error: No profile found for ${email}.`);
    console.error("Sign in once with Google first so a profile row exists, then run again.");
    process.exit(1);
  }

  if (matches.length > 1) {
    console.error(`Error: Multiple profiles matched ${email}. Resolve duplicates before bootstrap.`);
    process.exit(1);
  }

  const profile = matches[0];
  const targetValue = !shouldRevoke;

  const { data: updated, error: updateError } = await admin
    .from("profiles")
    .update({ is_superadmin: targetValue })
    .eq("id", profile.id)
    .select("id, email, is_superadmin")
    .single();

  if (updateError) {
    console.error(`Error: Unable to update profile: ${updateError.message}`);
    process.exit(1);
  }

  if (shouldRevoke) {
    console.log(`Success: Revoked superadmin access for ${updated.email}.`);
  } else {
    console.log(`Success: Granted superadmin access to ${updated.email}.`);
  }
}

main().catch((error) => {
  console.error(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
