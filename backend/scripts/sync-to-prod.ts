import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

function calculateMD5(content: string): string {
  return crypto.createHash("md5").update(content).digest("hex");
}

async function run() {
  const args = process.argv.slice(2);
  const getArg = (name: string, defaultValue: string) => {
    const idx = args.indexOf(name);
    if (idx !== -1 && idx + 1 < args.length) return args[idx + 1];
    return defaultValue;
  };

  const apiUrl = getArg("--url", "http://localhost:5001");
  const token = getArg("--token", "");
  const rawDir = getArg("--dir", "../../data/raw_json");
  const batchSize = parseInt(getArg("--batch", "50"));

  if (!token) {
    console.error("❌ Error: --token is required. Provide your admin JWT token.");
    console.log("Usage:\n  npx ts-node scripts/sync-to-prod.ts --url <api_url> --token <admin_jwt> [--dir <path_to_json>] [--batch <size>]\n");
    process.exit(1);
  }

  const resolvedDir = path.resolve(rawDir);
  console.log(`📁 Scanning directory: ${resolvedDir}`);

  if (!fs.existsSync(resolvedDir)) {
    console.error(`❌ Error: Directory not found: ${resolvedDir}`);
    process.exit(1);
  }

  const files = fs.readdirSync(resolvedDir).filter(f => f.endsWith(".json"));
  console.log(`🔍 Found ${files.length} problem JSON files.`);

  if (files.length === 0) {
    console.log("⚠️ No problems to sync.");
    return;
  }

  const problems: any[] = [];
  for (const file of files) {
    const filePath = path.join(resolvedDir, file);
    try {
      const content = fs.readFileSync(filePath, "utf-8");
      const hash = calculateMD5(content);
      const data = JSON.parse(content);
      // Attach the client-calculated hash to the problem object
      data.hash = hash;
      problems.push(data);
    } catch (err: any) {
      console.error(`⚠️ Failed to parse file ${file}: ${err.message || err}`);
    }
  }

  console.log(`📦 Loaded ${problems.length} problems. Chunking into batches of ${batchSize}...`);

  const batches: any[][] = [];
  for (let i = 0; i < problems.length; i += batchSize) {
    batches.push(problems.slice(i, i + batchSize));
  }

  console.log(`🚀 Starting sync. Total batches: ${batches.length}`);
  
  let totalCreated = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;
  const allErrors: string[] = [];

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log(`[Batch ${i + 1}/${batches.length}] Sending ${batch.length} problems...`);

    try {
      const response = await fetch(`${apiUrl}/api/admin/seed`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ problems: batch })
      });

      const result: any = await response.json();

      if (!response.ok) {
        console.error(`❌ Batch ${i + 1} failed: ${result.details || response.statusText}`);
        allErrors.push(`Batch ${i + 1} failed: ${result.details || "Unknown error"}`);
        continue;
      }

      const { created, updated, skipped, errors } = result.data || {};
      totalCreated += created || 0;
      totalUpdated += updated || 0;
      totalSkipped += skipped || 0;
      if (errors && errors.length > 0) {
        allErrors.push(...errors);
      }

      console.log(`   └─ Success: Created: ${created}, Updated: ${updated}, Skipped: ${skipped}, Errors: ${errors?.length || 0}`);
    } catch (err: any) {
      console.error(`❌ Batch ${i + 1} connection error: ${err.message || err}`);
      allErrors.push(`Batch ${i + 1} connection error: ${err.message || err}`);
    }
  }

  console.log("\n================ SYNC SUMMARY ================");
  console.log(`✅ Completed: Sync finished.`);
  console.log(`   - Created: ${totalCreated}`);
  console.log(`   - Updated: ${totalUpdated}`);
  console.log(`   - Skipped: ${totalSkipped}`);
  console.log(`   - Errors:  ${allErrors.length}`);
  if (allErrors.length > 0) {
    console.log("\n⚠️ Error details (first 10):");
    allErrors.slice(0, 10).forEach(e => console.log(`   - ${e}`));
  }
  console.log("==============================================");
}

run().catch(err => {
  console.error("Fatal sync script error:", err);
  process.exit(1);
});
