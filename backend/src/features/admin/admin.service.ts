import prisma from "../../config/db";
import crypto from "crypto";

interface SeedResult {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
}

export class AdminService {
  private static lastSeedStats = {
    status: "IDLE",
    lastRun: null as Date | null,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [] as string[]
  };

  static getSeedStatus() {
    return this.lastSeedStats;
  }

  static async promoteUser(email: string) {
    const cleanedEmail = email.trim().toLowerCase();
    const updatedUser = await prisma.user.upsert({
      where: { email: cleanedEmail },
      update: { isAdmin: true },
      create: {
        email: cleanedEmail,
        isAdmin: true
      },
      select: { id: true, email: true, isAdmin: true }
    });

    return updatedUser;
  }

  static async seedProblems(problems: any[]): Promise<SeedResult> {
    this.lastSeedStats.status = "RUNNING";
    this.lastSeedStats.lastRun = new Date();

    let created = 0;
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const data of problems) {
      try {
        const problemId = parseInt(data.id);
        if (isNaN(problemId)) {
          errors.push(`Invalid problem ID: ${data.id}`);
          continue;
        }

        // Determine hash: use provided hash (computed by sync script or file picker) or generate one
        const fileHash = data.hash || crypto.createHash("md5").update(JSON.stringify(data)).digest("hex");

        // Check if problem already exists and if hash is identical
        const existingProblem = await prisma.problem.findUnique({
          where: { id: problemId },
          select: { id: true, hash: true }
        });

        if (existingProblem && existingProblem.hash === fileHash) {
          skipped++;
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
          updated++;
        } else {
          created++;
        }
      } catch (err: any) {
        errors.push(`Error processing problem ID ${data.id || "unknown"}: ${err.message || err}`);
      }
    }

    // Update in-memory stats
    this.lastSeedStats.status = "SUCCESS";
    this.lastSeedStats.created += created;
    this.lastSeedStats.updated += updated;
    this.lastSeedStats.skipped += skipped;
    this.lastSeedStats.errors = [...this.lastSeedStats.errors, ...errors];

    return { created, updated, skipped, errors };
  }

  static async listUsers() {
    return prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, email: true, name: true, profilePictureUrl: true, isAdmin: true, createdAt: true }
    });
  }

  static async addAllowedUser(email: string, isAdmin: boolean = false) {
    const cleanedEmail = email.trim().toLowerCase();
    if (!cleanedEmail) {
      throw new Error("Email is required.");
    }

    const existing = await prisma.user.findUnique({ where: { email: cleanedEmail } });
    if (existing) {
      throw new Error("User with this email is already safelisted.");
    }

    return prisma.user.create({
      data: {
        email: cleanedEmail,
        isAdmin
      },
      select: { id: true, email: true, name: true, profilePictureUrl: true, isAdmin: true, createdAt: true }
    });
  }

  static async deleteUser(id: string, currentAdminId: string) {
    if (id === currentAdminId) {
      throw new Error("You cannot remove your own access!");
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new Error("User not found.");
    }

    return prisma.user.delete({
      where: { id },
      select: { id: true, email: true }
    });
  }
}
export default AdminService;
