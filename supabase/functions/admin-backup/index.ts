// Admin backup edge function — generates a zip containing all DB tables (JSON),
// all storage objects, and the auth users list. Admin-only.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import JSZip from "npm:jszip@3.10.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BUCKETS = [
  "course-documents",
  "gallery",
  "crm-course-media",
  "crm-student-docs",
  "crm-receipts",
  "crm-certificates",
  "crm-faculty-photos",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(
      token,
    );
    if (claimsErr || !claims?.claims?.sub) {
      return json({ error: "Unauthorized" }, 401);
    }
    const userId = claims.claims.sub;

    const admin = createClient(supabaseUrl, serviceKey);

    // Verify admin
    const { data: isAdminData, error: isAdminErr } = await admin.rpc(
      "is_admin",
      { _user_id: userId },
    );
    if (isAdminErr || !isAdminData) {
      return json({ error: "Forbidden — admin only" }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const includeDb = body.includeDb !== false;
    const includeStorage = body.includeStorage !== false;
    const includeAuth = body.includeAuth !== false;

    const zip = new JSZip();
    const manifest: Record<string, unknown> = {
      generated_at: new Date().toISOString(),
      generator: "admin-backup edge function",
      includes: { db: includeDb, storage: includeStorage, auth: includeAuth },
    };

    // ---- Database ----
    if (includeDb) {
      const dbFolder = zip.folder("database")!;
      // Discover public tables via direct PostgREST call to information_schema isn't available;
      // fall back to a known list by querying pg_tables via rpc-less approach using REST `?select`.
      // We use a hardcoded discovery via supabase.rest API to information_schema.tables through
      // the service role on the `pg_catalog`.  Since we can't run arbitrary SQL here, we list via
      // a SQL function we expose, or fall back to a known table list from project schema.

      // Attempt to discover tables via a call to admin.rpc — none exists for this. So we
      // hardcode the public-schema tables present in the project.
      const tables = [
        "admin_users", "announcements", "ai_use_cases", "contact_submissions",
        "courses", "course_documents", "downloads", "gallery_items",
        "hero_slides", "leads", "mock_tests", "mock_test_results",
        "navigation_links", "offer_belt", "site_settings", "stats",
        "team_members", "testimonials", "whatsapp_templates", "youtube_videos",
        // CRM
        "crm_user_roles", "crm_settings", "courses", "crm_course_media",
        "crm_enquiries", "crm_enquiry_followups", "crm_students",
        "crm_student_enrolments", "crm_student_docs", "crm_batches",
        "crm_batch_students", "crm_attendance", "crm_fee_plans",
        "crm_payments", "crm_expenses", "crm_certificates", "crm_faculties",
        "crm_whatsapp_logs", "crm_campaigns", "crm_reminders",
        "crm_voided_records", "crm_seo_pages",
      ];

      const tableManifest: Record<string, { rows: number; error?: string }> = {};
      for (const t of tables) {
        try {
          let all: unknown[] = [];
          let from = 0;
          const pageSize = 1000;
          // paginate
          while (true) {
            const { data, error } = await admin
              .from(t as never)
              .select("*")
              .range(from, from + pageSize - 1);
            if (error) {
              tableManifest[t] = { rows: 0, error: error.message };
              break;
            }
            if (!data || data.length === 0) break;
            all = all.concat(data);
            if (data.length < pageSize) break;
            from += pageSize;
          }
          if (!tableManifest[t]) {
            dbFolder.file(`${t}.json`, JSON.stringify(all, null, 2));
            tableManifest[t] = { rows: all.length };
          }
        } catch (e) {
          tableManifest[t] = { rows: 0, error: String(e) };
        }
      }
      dbFolder.file("_manifest.json", JSON.stringify(tableManifest, null, 2));
      manifest.database = tableManifest;
    }

    // ---- Storage ----
    if (includeStorage) {
      const storageFolder = zip.folder("storage")!;
      const storageManifest: Array<Record<string, unknown>> = [];

      for (const bucket of BUCKETS) {
        const bucketFolder = storageFolder.folder(bucket)!;
        // recursive list
        const objects = await listAll(admin, bucket, "");
        for (const obj of objects) {
          try {
            const { data, error } = await admin.storage
              .from(bucket)
              .download(obj.path);
            if (error || !data) {
              storageManifest.push({
                bucket,
                path: obj.path,
                error: error?.message ?? "no data",
              });
              continue;
            }
            const buf = new Uint8Array(await data.arrayBuffer());
            bucketFolder.file(obj.path, buf);
            storageManifest.push({
              bucket,
              path: obj.path,
              size: buf.byteLength,
              mime: data.type,
            });
          } catch (e) {
            storageManifest.push({
              bucket,
              path: obj.path,
              error: String(e),
            });
          }
        }
      }
      storageFolder.file(
        "_manifest.json",
        JSON.stringify(storageManifest, null, 2),
      );
      manifest.storage = { object_count: storageManifest.length };
    }

    // ---- Auth users ----
    if (includeAuth) {
      const authFolder = zip.folder("auth")!;
      const users: unknown[] = [];
      let page = 1;
      while (true) {
        const { data, error } = await admin.auth.admin.listUsers({
          page,
          perPage: 1000,
        });
        if (error) break;
        const batch = data?.users ?? [];
        for (const u of batch) {
          users.push({
            id: u.id,
            email: u.email,
            phone: u.phone,
            created_at: u.created_at,
            last_sign_in_at: u.last_sign_in_at,
            email_confirmed_at: u.email_confirmed_at,
            user_metadata: u.user_metadata,
            app_metadata: u.app_metadata,
          });
        }
        if (batch.length < 1000) break;
        page++;
      }
      authFolder.file("users.json", JSON.stringify(users, null, 2));
      manifest.auth = { user_count: users.length };
    }

    zip.file("_manifest.json", JSON.stringify(manifest, null, 2));
    zip.file(
      "README.md",
      `# Backup\n\nGenerated: ${manifest.generated_at}\n\n` +
        `## Contents\n- /database — JSON dump of every public table\n` +
        `- /storage — every storage object across buckets\n` +
        `- /auth/users.json — auth users (no password hashes — Supabase limitation)\n\n` +
        `## Restore\n1. Run the SQL files in supabase/migrations/ on a fresh project to recreate schema, RLS, functions, triggers.\n` +
        `2. Re-create the storage buckets listed in /storage and upload the files.\n` +
        `3. Use the new project's service role key + supabase-js to insert each table's JSON back.\n` +
        `4. Recreate auth users (passwords must be reset).\n`,
    );

    const blob = await zip.generateAsync({
      type: "uint8array",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });

    const filename = `atec-backup-${new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, 19)}.zip`;

    return new Response(blob, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    console.error("admin-backup error", e);
    return json({ error: String(e?.message ?? e) }, 500);
  }
});

async function listAll(
  admin: ReturnType<typeof createClient>,
  bucket: string,
  prefix: string,
): Promise<Array<{ path: string }>> {
  const out: Array<{ path: string }> = [];
  let offset = 0;
  const limit = 1000;
  while (true) {
    const { data, error } = await admin.storage.from(bucket).list(prefix, {
      limit,
      offset,
      sortBy: { column: "name", order: "asc" },
    });
    if (error || !data) break;
    if (data.length === 0) break;
    for (const item of data) {
      const fullPath = prefix ? `${prefix}/${item.name}` : item.name;
      // folders have id === null
      if ((item as any).id === null) {
        const sub = await listAll(admin, bucket, fullPath);
        out.push(...sub);
      } else {
        out.push({ path: fullPath });
      }
    }
    if (data.length < limit) break;
    offset += limit;
  }
  return out;
}

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
