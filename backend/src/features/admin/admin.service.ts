import prisma from "../../config/db";
import crypto from "crypto";
import jwt from "jsonwebtoken";

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
        const fileHash =
          data.hash || crypto.createHash("md5").update(JSON.stringify(data)).digest("hex");

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
          videoEditorialId:
            data.video_editorial_id !== undefined && data.video_editorial_id !== null
              ? data.video_editorial_id.toString()
              : null,
          status: data.status || "PUBLISHED",
          hash: fileHash
        };

        // Upsert the main Problem
        await prisma.problem.upsert({
          where: { id: problemId },
          update: {
            ...problemFields,
            tags: {
              set: tagRecords.map((t) => ({ id: t.id }))
            }
          },
          create: {
            id: problemId,
            ...problemFields,
            tags: {
              connect: tagRecords.map((t) => ({ id: t.id }))
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
      select: {
        id: true,
        email: true,
        name: true,
        profilePictureUrl: true,
        isAdmin: true,
        createdAt: true
      }
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
      select: {
        id: true,
        email: true,
        name: true,
        profilePictureUrl: true,
        isAdmin: true,
        createdAt: true
      }
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

  static async importCourse(coursePayload: any) {
    const courseId = parseInt(coursePayload.course_id);
    if (isNaN(courseId)) {
      throw new Error("Invalid course ID");
    }

    // 1. Calculate MD5 hash of the JSON content
    const stringifiedPayload = JSON.stringify(coursePayload);
    const computedHash = crypto.createHash("md5").update(stringifiedPayload).digest("hex");

    // 2. Query existing course hash
    const existing = await prisma.course.findUnique({
      where: { id: courseId },
      select: { hash: true }
    });

    if (existing && existing.hash === computedHash) {
      return {
        status: "skipped",
        message: `Course '${coursePayload.course_name}' is already up-to-date.`
      };
    }

    // 3. Reconcile database inside transaction
    await prisma.$transaction(async (tx) => {
      // Cascade delete existing chapters, which deletes playlists and resources cascade-wise
      await tx.chapter.deleteMany({ where: { courseId } });

      // Upsert Course with updated hash
      await tx.course.upsert({
        where: { id: courseId },
        update: {
          name: coursePayload.course_name,
          description: coursePayload.description || null,
          image: coursePayload.course_image || null,
          instructorImage: coursePayload.course_instructor_image_link || null,
          instructorName: coursePayload.course_instructor_name || null,
          difficulty: coursePayload.difficulty || null,
          isFree: coursePayload.is_free || false,
          timeInMinutes: coursePayload.time_in_minutes || 0,
          hash: computedHash,
          fullyScraped: coursePayload.fully_scraped || false
        },
        create: {
          id: courseId,
          name: coursePayload.course_name,
          description: coursePayload.description || null,
          image: coursePayload.course_image || null,
          instructorImage: coursePayload.course_instructor_image_link || null,
          instructorName: coursePayload.course_instructor_name || null,
          difficulty: coursePayload.difficulty || null,
          isFree: coursePayload.is_free || false,
          timeInMinutes: coursePayload.time_in_minutes || 0,
          hash: computedHash,
          fullyScraped: coursePayload.fully_scraped || false
        }
      });

      // Insert Chapters, Playlists, and Resources
      const isLegacyCourse = [203, 151, 144, 85].includes(courseId);
      const mapId = (originalId: number) => {
        if (isLegacyCourse) return originalId;
        return courseId * 100000 + originalId;
      };

      for (const chapter of coursePayload.chapters || []) {
        const originalChapterId = parseInt(chapter.chapter_id);
        if (isNaN(originalChapterId)) continue;
        const chapterId = mapId(originalChapterId);

        await tx.chapter.create({
          data: {
            id: chapterId,
            courseId: courseId,
            name: chapter.chapter_name || "Untitled Chapter",
            order: typeof chapter.order === "number" ? chapter.order : 0
          }
        });

        for (const playlist of chapter.playlists || []) {
          const originalPlaylistId = parseInt(playlist.playlist_id);
          if (isNaN(originalPlaylistId)) continue;
          const playlistId = mapId(originalPlaylistId);

          await tx.playlist.create({
            data: {
              id: playlistId,
              chapterId: chapterId,
              name: playlist.playlist_name || "Untitled Playlist",
              order: typeof playlist.order === "number" ? playlist.order : 0
            }
          });

          for (const res of playlist.resources || []) {
            const originalResId = parseInt(res.resource_id);
            if (isNaN(originalResId)) continue;
            const resId = mapId(originalResId);

            const resType = res.resource_type || "READING_MATERIAL";
            let problemId: number | null = null;
            if (resType === "CODING_PROBLEM" && res.problem_id) {
              const parsedProbId = parseInt(res.problem_id);
              if (!isNaN(parsedProbId)) {
                // Check if the problem exists in the Problem table to avoid FK violations
                const dbProblem = await tx.problem.findUnique({
                  where: { id: parsedProbId },
                  select: { id: true }
                });
                if (dbProblem) {
                  problemId = parsedProbId;
                }
              }
            }

            await tx.resource.create({
              data: {
                id: resId,
                playlistId: playlistId,
                name: res.resource_name || "Untitled Resource",
                type: resType,
                order: typeof res.order === "number" ? res.order : 0,
                problemId: problemId,
                details: res.details || null
              }
            });
          }
        }
      }
    });

    return {
      status: "success",
      message: `Course '${coursePayload.course_name}' imported successfully.`
    };
  }

  static async getSystemStats() {
    const [totalProblems, totalCourses, totalUsers] = await Promise.all([
      prisma.problem.count(),
      prisma.course.count(),
      prisma.user.count()
    ]);
    return { totalProblems, totalCourses, totalUsers };
  }

  static async listCoursesForAdmin() {
    const courses = await prisma.course.findMany({
      orderBy: { id: "asc" },
      include: {
        chapters: {
          include: {
            playlists: {
              include: {
                resources: {
                  select: { id: true }
                }
              }
            }
          }
        }
      }
    });

    return courses.map((course) => {
      const chaptersCount = course.chapters.length;
      let playlistsCount = 0;
      let resourcesCount = 0;

      for (const ch of course.chapters) {
        playlistsCount += ch.playlists.length;
        for (const pl of ch.playlists) {
          resourcesCount += pl.resources.length;
        }
      }

      return {
        id: course.id,
        name: course.name,
        description: course.description,
        image: course.image,
        difficulty: course.difficulty,
        isFree: course.isFree,
        timeInMinutes: course.timeInMinutes,
        isVisible: course.isVisible,
        createdAt: course.createdAt,
        updatedAt: course.updatedAt,
        chaptersCount,
        playlistsCount,
        resourcesCount
      };
    });
  }

  static async toggleCourseVisibility(courseId: number, isVisible: boolean) {
    const course = await prisma.course.findUnique({
      where: { id: courseId }
    });

    if (!course) {
      throw new Error(`Course with ID ${courseId} not found.`);
    }

    return prisma.course.update({
      where: { id: courseId },
      data: { isVisible }
    });
  }

  static async deleteCourse(courseId: number) {
    const course = await prisma.course.findUnique({
      where: { id: courseId }
    });

    if (!course) {
      throw new Error(`Course with ID ${courseId} not found.`);
    }

    return prisma.course.delete({
      where: { id: courseId }
    });
  }

  static async impersonateUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        profilePictureUrl: true,
        isAdmin: true
      }
    });

    if (!user) {
      throw new Error("User not found.");
    }

    const jwtSecret = process.env.JWT_SECRET || "az_practice_secret_jwt_key_987654321";

    const token = jwt.sign(
      { id: user.id, email: user.email, isAdmin: user.isAdmin },
      jwtSecret,
      { expiresIn: "7d" }
    );

    return {
      token,
      user
    };
  }
}
export default AdminService;
