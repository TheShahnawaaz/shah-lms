import prisma from "../../config/db";

export class CoursesService {
  static async listCourses(userId: string, isAdmin: boolean = false) {
    const courses = await prisma.course.findMany({
      where: isAdmin ? {} : { isVisible: true },
      orderBy: { id: "asc" },
      include: {
        chapters: {
          include: {
            playlists: {
              include: {
                resources: {
                  select: {
                    id: true,
                    type: true,
                    problemId: true
                  }
                }
              }
            }
          }
        }
      }
    });

    const completions = await prisma.resourceCompletion.findMany({
      where: { userId },
      select: { resourceId: true }
    });
    const completedResourceIds = new Set(completions.map((c) => c.resourceId));

    const acceptedSubmissions = await prisma.submission.findMany({
      where: { userId, status: "Accepted" },
      select: { problemId: true }
    });
    const solvedProblemIds = new Set(acceptedSubmissions.map((s) => s.problemId));

    return courses.map((course) => {
      let totalResources = 0;
      let completedCount = 0;

      for (const ch of course.chapters) {
        for (const pl of ch.playlists) {
          for (const res of pl.resources) {
            totalResources++;
            if (res.type === "CODING_PROBLEM" && res.problemId) {
              if (solvedProblemIds.has(res.problemId)) {
                completedCount++;
              }
            } else {
              if (completedResourceIds.has(res.id)) {
                completedCount++;
              }
            }
          }
        }
      }

      const completionPercentage =
        totalResources > 0 ? Math.round((completedCount / totalResources) * 100) : 0;

      return {
        id: course.id,
        name: course.name,
        description: course.description,
        image: course.image,
        instructorImage: course.instructorImage,
        instructorName: course.instructorName,
        difficulty: course.difficulty,
        isFree: course.isFree,
        timeInMinutes: course.timeInMinutes,
        fullyScraped: course.fullyScraped,
        totalResources,
        completedCount,
        completionPercentage,
        createdAt: course.createdAt,
        updatedAt: course.updatedAt
      };
    });
  }

  static async getCourseDetail(courseId: number, userId: string, isAdmin: boolean = false) {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        chapters: {
          orderBy: { order: "asc" },
          include: {
            playlists: {
              orderBy: { order: "asc" },
              include: {
                resources: {
                  orderBy: { order: "asc" }
                }
              }
            }
          }
        }
      }
    });

    if (!course) {
      throw new Error(`Course with ID ${courseId} not found.`);
    }

    if (!course.isVisible && !isAdmin) {
      throw new Error(`Course with ID ${courseId} not found.`);
    }

    // Collect all course resource IDs and problem IDs
    const courseResourceIds: number[] = [];
    const courseProblemIds: number[] = [];
    for (const ch of course.chapters) {
      for (const pl of ch.playlists) {
        for (const res of pl.resources) {
          courseResourceIds.push(res.id);
          if (res.type === "CODING_PROBLEM" && res.problemId) {
            courseProblemIds.push(res.problemId);
          }
        }
      }
    }

    // Query user manual completions
    const completions = await prisma.resourceCompletion.findMany({
      where: {
        userId,
        resourceId: { in: courseResourceIds }
      },
      select: { resourceId: true }
    });
    const completedResourceIds = new Set(completions.map((c) => c.resourceId));

    // Query user accepted submissions for coding problems in this course
    const acceptedSubmissions = await prisma.submission.findMany({
      where: {
        userId,
        problemId: { in: courseProblemIds },
        status: "Accepted"
      },
      select: { problemId: true }
    });
    const solvedProblemIds = new Set(acceptedSubmissions.map((s) => s.problemId));

    // Reconstruct course JSON, mapping resources to show if completed, omitting details
    const chapters = course.chapters.map((ch) => ({
      chapter_id: ch.id,
      chapter_name: ch.name,
      playlists: ch.playlists.map((pl) => ({
        playlist_id: pl.id,
        playlist_name: pl.name,
        resources: pl.resources.map((res) => {
          let isCompleted = false;
          if (res.type === "CODING_PROBLEM" && res.problemId) {
            isCompleted = solvedProblemIds.has(res.problemId);
          } else {
            isCompleted = completedResourceIds.has(res.id);
          }

          return {
            resource_id: res.id,
            resource_name: res.name,
            resource_type: res.type,
            problem_id: res.problemId,
            isCompleted
          };
        })
      }))
    }));

    return {
      course_id: course.id,
      course_name: course.name,
      fully_scraped: course.fullyScraped,
      image: course.image,
      chapters
    };
  }

  static async getResourceDetail(resourceId: number, userId: string, isAdmin: boolean = false) {
    const resource = await prisma.resource.findUnique({
      where: { id: resourceId },
      include: {
        playlist: {
          include: {
            chapter: {
              include: {
                course: true
              }
            }
          }
        }
      }
    });

    if (!resource) {
      throw new Error(`Resource with ID ${resourceId} not found.`);
    }

    const course = resource.playlist?.chapter?.course;
    if (course && !course.isVisible && !isAdmin) {
      throw new Error(`Resource with ID ${resourceId} not found.`);
    }

    let isCompleted = false;
    if (resource.type === "CODING_PROBLEM" && resource.problemId) {
      const acceptedSub = await prisma.submission.findFirst({
        where: {
          userId,
          problemId: resource.problemId,
          status: "Accepted"
        }
      });
      isCompleted = !!acceptedSub;
    } else {
      const completion = await prisma.resourceCompletion.findUnique({
        where: {
          userId_resourceId: {
            userId,
            resourceId
          }
        }
      });
      isCompleted = !!completion;
    }

    return {
      resource_id: resource.id,
      playlist_id: resource.playlistId,
      resource_name: resource.name,
      resource_type: resource.type,
      order: resource.order,
      problem_id: resource.problemId,
      isCompleted,
      details: resource.details
    };
  }

  static async completeResource(resourceId: number, userId: string) {
    const resource = await prisma.resource.findUnique({ where: { id: resourceId } });
    if (!resource) {
      throw new Error(`Resource with ID ${resourceId} not found.`);
    }

    return prisma.resourceCompletion.upsert({
      where: {
        userId_resourceId: {
          userId,
          resourceId
        }
      },
      update: {},
      create: {
        userId,
        resourceId
      }
    });
  }

  static async uncompleteResource(resourceId: number, userId: string) {
    const completion = await prisma.resourceCompletion.findUnique({
      where: {
        userId_resourceId: {
          userId,
          resourceId
        }
      }
    });

    if (!completion) {
      throw new Error("Completion record not found.");
    }

    return prisma.resourceCompletion.delete({
      where: {
        userId_resourceId: {
          userId,
          resourceId
        }
      }
    });
  }
}
export default CoursesService;
