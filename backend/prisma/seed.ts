import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

const prisma = new PrismaClient();

// Directory holding raw JSON problem files
const RAW_JSON_DIR = path.join(__dirname, "../../../data/raw_json");

function calculateMD5(content: string): string {
  return crypto.createHash("md5").update(content).digest("hex");
}

async function main() {
  console.log("=== STARTING DATA SYNC SEED SCRIPT ===");
  if (!fs.existsSync(RAW_JSON_DIR)) {
    console.error(`Error: Source raw JSON directory not found at ${RAW_JSON_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(RAW_JSON_DIR).filter(file => file.endsWith(".json"));
  console.log(`Found ${files.length} JSON problem files in source directory.`);

  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < files.length; i++) {
    const fileName = files[i];
    const filePath = path.join(RAW_JSON_DIR, fileName);

    try {
      const fileContent = fs.readFileSync(filePath, "utf-8");
      const fileHash = calculateMD5(fileContent);

      const data = JSON.parse(fileContent);
      const problemId = parseInt(data.id);

      if (isNaN(problemId)) {
        console.warn(`[Skip] Invalid problem ID in file: ${fileName}`);
        continue;
      }

      // Check if problem already exists and if hash is identical
      const existingProblem = await prisma.problem.findUnique({
        where: { id: problemId },
        select: { id: true, hash: true, title: true }
      });

      if (existingProblem && existingProblem.hash === fileHash) {
        skippedCount++;
        // Log every 50th skipped file or the first few to keep output clean but informative
        if (skippedCount % 50 === 0 || skippedCount <= 5) {
          console.log(`[Unchanged] Problem #${problemId} ("${data.title}") is up-to-date. (Total skipped: ${skippedCount})`);
        }
        continue;
      }

      // Process tags
      const tags = data.tags || [];
      const tagRecords = [];
      for (const tagName of tags) {
        if (!tagName) continue;
        const cleanedName = tagName.trim();
        if (cleanedName === "") continue;

        const tag = await prisma.tag.upsert({
          where: { name: cleanedName },
          update: {},
          create: { name: cleanedName }
        });
        tagRecords.push(tag);
      }

      // Clean old relation components first to prevent duplicate entries
      await prisma.editorial.deleteMany({ where: { problemId } });
      await prisma.templateCode.deleteMany({ where: { problemId } });

      // Build fields
      const problemFields = {
        title: data.title || "Untitled Problem",
        body: data.body || "",
        inputFormat: data.input_format || "",
        outputFormat: data.output_format || "",
        constraints: data.constraints || "",
        difficulty: typeof data.difficulty === "number" ? data.difficulty : 2,
        memoryLimitMb: typeof data.memory_limit_mb === "number" ? data.memory_limit_mb : 256,
        timeLimitSec: typeof data.time_limit_sec === "number" ? data.time_limit_sec : 1.0,
        note: data.note || null,
        samples: data.samples || [],
        hints: data.hints || {},
        videoEditorialId: data.video_editorial_id !== undefined && data.video_editorial_id !== null ? data.video_editorial_id.toString() : null,
        status: data.status || "PUBLISHED",
        hash: fileHash
      };

      // Upsert the main Problem
      await prisma.problem.upsert({
        where: { id: problemId },
        update: {
          ...problemFields,
          tags: {
            set: tagRecords.map(t => ({ id: t.id }))
          }
        },
        create: {
          id: problemId,
          ...problemFields,
          tags: {
            connect: tagRecords.map(t => ({ id: t.id }))
          }
        }
      });

      // Insert templates
      const templates = data.template_code || [];
      for (const t of templates) {
        if (t.code && t.language) {
          await prisma.templateCode.create({
            data: {
              problemId,
              code: t.code,
              language: t.language
            }
          });
        }
      }

      // Insert editorials
      const editorials = data.editorial_code || [];
      for (const e of editorials) {
        if (e.code && e.language) {
          await prisma.editorial.create({
            data: {
              problemId,
              code: e.code,
              language: e.language
            }
          });
        }
      }

      if (existingProblem) {
        updatedCount++;
        console.log(`[Update] Problem #${problemId} ("${data.title}") updated.`);
      } else {
        createdCount++;
        console.log(`[Create] Problem #${problemId} ("${data.title}") created.`);
      }

    } catch (err) {
      console.error(`Error processing file ${fileName}:`, err);
    }
  }

  console.log("\n=== DATA SYNC COMPLETED ===");
  console.log(`Summary:`);
  console.log(`  - New Created: ${createdCount}`);
  console.log(`  - Updated:     ${updatedCount}`);
  console.log(`  - Skipped:     ${skippedCount}`);
  console.log(`===========================`);
}

main()
  .catch(e => {
    console.error("Fatal Seeding Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
