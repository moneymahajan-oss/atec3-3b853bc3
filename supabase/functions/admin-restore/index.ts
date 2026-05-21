// Admin restore edge function — accepts a backup zip and restores DB JSON tables,
// storage objects, and auth users. Admin-only. Destructive; supports per-section flags.
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

// Restore tables in dependency order (parents first). Tables not listed are restored last.
const TABLE_ORDER = [
  "admin_users",
  "site_settings", "navigation_links", "hero_slides", "offer_belt", "stats",
  "team_members", "testimonials", "youtube_videos", "ai_use_cases",
  "announcements", "downloads", "gallery_items", "whatsapp_templates",
  "courses", "course_documents", "mock_tests", "mock_test_results",
  "leads", "contact_submissions",
  "crm_user_roles", "crm_settings", "crm_faculties",
  "courses", "crm_course_media",
  "crm_enquiries", "crm_enquiry_followups",
  "crm_students", "crm_student_enrolments", "crm_student_docs",
  "crm_batches", "crm_batch_students", "crm_attendance",
  "crm_fee_plans", "crm_payments",
  "crm_expenses", "crm_certificates",
  "crm_whatsapp_logs", "crm_campaigns", "crm_reminders",
  "crm_voided_records", "crm_seo_pages",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) return json({ error: "Unauthorized" }, 401);
    const userId = claims.claims.sub;

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: isAdminData, error: isAdminErr } = await admin.rpc("is_admin", { _user_id: userId });
    if (isAdminErr || !isAdminData) return json({ error: "Forbidden — admin only" }, 403);

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return json({ error: "Missing 'file' (zip)" }, 400);

    const restoreDb = form.get("restoreDb") !== "false";
    const restoreStorage = form.get("restoreStorage") !== "false";
    const restoreAuth = form.get("restoreAuth") !== "false";
    const truncateFirst = form.get("truncateFirst") === "true";
    const upsertMode = form.get("upsertMode") !== "false"; // default true
    const overwriteFiles = form.get("overwriteFiles") !== "false"; // default true

    const buf = new Uint8Array(await file.arrayBuffer());
    const zip = await JSZip.loadAsync(buf);

    const report: Record<string, unknown> = {
      started_at: new Date().toISOString(),
      flags: { restoreDb, restoreStorage, restoreAuth, truncateFirst, upsertMode, overwriteFiles },
    };

    // ---- Database ----
    if (restoreDb) {
      const dbReport: Record<string, { rows: number; error?: string; truncated?: boolean }> = {};

      // Discover present tables
      const present = new Set<string>();
      zip.folder("database")?.forEach((rel, f) => {
        if (!f.dir && rel.endsWith(".json") && !rel.startsWith("_")) {
          present.add(rel.replace(/\.json$/, ""));
        }
      });

      const ordered = [
        ...TABLE_ORDER.filter((t) => present.has(t)),
        ...[...present].filter((t) => !TABLE_ORDER.includes(t)),
      ];

      // Optional truncate (reverse order to respect FKs)
      if (truncateFirst) {
        for (const t of [...ordered].reverse()) {
          try {
            const { error } = await admin.from(t as never).delete().not("id", "is", null);
            if (error) dbReport[t] = { rows: 0, error: `truncate: ${error.message}` };
            else dbReport[t] = { rows: 0, truncated: true };
          } catch (e) {
            dbReport[t] = { rows: 0, error: `truncate: ${String(e)}` };
          }
        }
      }

      for (const t of ordered) {
        try {
          const f = zip.file(`database/${t}.json`);
          if (!f) continue;
          const txt = await f.async("string");
          const rows = JSON.parse(txt);
          if (!Array.isArray(rows) || rows.length === 0) {
            dbReport[t] = { ...(dbReport[t] || {}), rows: 0 };
            continue;
          }
          // Insert in chunks
          const chunkSize = 500;
          let inserted = 0;
          let err: string | undefined;
          for (let i = 0; i < rows.length; i += chunkSize) {
            const chunk = rows.slice(i, i + chunkSize);
            const q = upsertMode
              ? admin.from(t as never).upsert(chunk as never, { onConflict: "id" })
              : admin.from(t as never).insert(chunk as never);
            const { error } = await q;
            if (error) { err = error.message; break; }
            inserted += chunk.length;
          }
          dbReport[t] = {
            ...(dbReport[t] || {}),
            rows: inserted,
            ...(err ? { error: err } : {}),
          };
        } catch (e) {
          dbReport[t] = { rows: 0, error: String(e) };
        }
      }
      report.database = dbReport;
    }

    // ---- Storage ----
    if (restoreStorage) {
      const storageReport: Array<Record<string, unknown>> = [];
      for (const bucket of BUCKETS) {
        const folder = zip.folder(`storage/${bucket}`);
        if (!folder) continue;
        const files: Array<{ path: string; data: Uint8Array }> = [];
        const tasks: Promise<void>[] = [];
        folder.forEach((rel, f) => {
          if (f.dir) return;
          tasks.push(
            f.async("uint8array").then((data) => {
              files.push({ path: rel, data });
            }),
          );
        });
        await Promise.all(tasks);

        for (const { path, data } of files) {
          try {
            const { error } = await admin.storage
              .from(bucket)
              .upload(path, data, { upsert: overwriteFiles, contentType: guessMime(path) });
            if (error) storageReport.push({ bucket, path, error: error.message });
            else storageReport.push({ bucket, path, size: data.byteLength, ok: true });
          } catch (e) {
            storageReport.push({ bucket, path, error: String(e) });
          }
        }
      }
      report.storage = {
        object_count: storageReport.length,
        errors: storageReport.filter((r) => r.error).length,
        details: storageReport.slice(0, 50),
      };
    }

    // ---- Auth users ----
    if (restoreAuth) {
      const f = zip.file("auth/users.json");
      if (f) {
        const users = JSON.parse(await f.async("string")) as Array<any>;
        let created = 0, skipped = 0, failed = 0;
        const errors: string[] = [];
        for (const u of users) {
          if (!u?.email && !u?.phone) { skipped++; continue; }
          try {
            const { error } = await admin.auth.admin.createUser({
              email: u.email ?? undefined,
              phone: u.phone ?? undefined,
              email_confirm: !!u.email_confirmed_at,
              phone_confirm: !!u.phone_confirmed_at,
              user_metadata: u.user_metadata ?? {},
              app_metadata: u.app_metadata ?? {},
            });
            if (error) {
              if (/already|registered|exists/i.test(error.message)) skipped++;
              else { failed++; if (errors.length < 20) errors.push(`${u.email ?? u.phone}: ${error.message}`); }
            } else {
              created++;
            }
          } catch (e) {
            failed++;
            if (errors.length < 20) errors.push(`${u.email ?? u.phone}: ${String(e)}`);
          }
        }
        report.auth = { total: users.length, created, skipped, failed, errors };
      } else {
        report.auth = { error: "auth/users.json not found in zip" };
      }
    }

    report.finished_at = new Date().toISOString();
    return json(report, 200);
  } catch (e) {
    console.error("admin-restore error", e);
    return json({ error: String((e as any)?.message ?? e) }, 500);
  }
});

function guessMime(path: string): string | undefined {
  const ext = path.toLowerCase().split(".").pop() || "";
  const map: Record<string, string> = {
    jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp",
    gif: "image/gif", svg: "image/svg+xml", pdf: "application/pdf",
    mp4: "video/mp4", webm: "video/webm", mp3: "audio/mpeg",
    json: "application/json", txt: "text/plain", csv: "text/csv",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };
  return map[ext];
}

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj, null, 2), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
