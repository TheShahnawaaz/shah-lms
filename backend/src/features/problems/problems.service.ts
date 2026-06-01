import prisma from "../../config/db";
import { Prisma } from "@prisma/client";

interface ListProblemsQuery {
  page?: number;
  limit?: number;
  search?: string;
  difficulty?: number;
  tag?: string;
  bookmarked?: boolean;
  status?: string;
}

export class ProblemsService {
  static async listProblems(query: ListProblemsQuery, userId: string) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, query.limit || 20);
    const skip = (page - 1) * limit;

    const whereClause: Prisma.ProblemWhereInput = {};

    // Search filter
    if (query.search) {
      whereClause.OR = [
        { title: { contains: query.search, mode: "insensitive" } },
        { body: { contains: query.search, mode: "insensitive" } }
      ];
    }

    // Difficulty filter
    if (query.difficulty !== undefined && !isNaN(query.difficulty)) {
      whereClause.difficulty = query.difficulty;
    }

    // Tag filter (Many-to-Many relation matching name)
    if (query.tag) {
      whereClause.tags = {
        some: {
          name: { equals: query.tag.trim(), mode: "insensitive" }
        }
      };
    }

    // Bookmark filter
    if (query.bookmarked) {
      whereClause.bookmarks = {
        some: {
          userId
        }
      };
    }

    // Status filter
    if (query.status) {
      if (query.status === "Solved") {
        whereClause.submissions = {
          some: {
            userId,
            status: "Accepted"
          }
        };
      } else if (query.status === "Attempted") {
        whereClause.submissions = {
          some: {
            userId
          },
          none: {
            userId,
            status: "Accepted"
          }
        };
      } else if (query.status === "Todo") {
        whereClause.submissions = {
          none: {
            userId
          }
        };
      }
    }

    // Query list (selecting light fields for fast load times)
    const [problems, totalCount] = await prisma.$transaction([
      prisma.problem.findMany({
        where: whereClause,
        select: {
          id: true,
          title: true,
          difficulty: true,
          timeLimitSec: true,
          memoryLimitMb: true,
          status: true,
          createdAt: true,
          tags: {
            select: {
              name: true
            }
          },
          bookmarks: {
            where: { userId },
            select: { id: true }
          },
          submissions: {
            where: { userId },
            select: { status: true }
          }
        },
        orderBy: { id: "asc" },
        skip,
        take: limit
      }),
      prisma.problem.count({ where: whereClause })
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      problems: problems.map((p) => {
        const hasAccepted = p.submissions.some((s) => s.status === "Accepted");
        const hasSubmissions = p.submissions.length > 0;
        const status = hasAccepted ? "Solved" : hasSubmissions ? "Attempted" : "Todo";
        return {
          ...p,
          isBookmarked: p.bookmarks.length > 0,
          status,
          bookmarks: undefined,
          submissions: undefined
        };
      }),
      pagination: {
        page,
        limit,
        totalCount,
        totalPages
      }
    };
  }

  static async getProblemDetail(id: number, userId: string) {
    const problem = await prisma.problem.findUnique({
      where: { id },
      include: {
        tags: {
          select: { name: true }
        },
        editorials: {
          select: { code: true, language: true }
        },
        templates: {
          select: { code: true, language: true }
        },
        bookmarks: {
          where: { userId },
          select: { id: true }
        }
      }
    });

    if (!problem) {
      throw new Error(`Problem with ID ${id} not found.`);
    }

    return {
      ...problem,
      isBookmarked: problem.bookmarks.length > 0,
      bookmarks: undefined
    };
  }

  static async bookmarkProblem(problemId: number, userId: string) {
    const problem = await prisma.problem.findUnique({ where: { id: problemId } });
    if (!problem) {
      throw new Error(`Problem with ID ${problemId} not found.`);
    }

    return prisma.bookmark.upsert({
      where: {
        userId_problemId: {
          userId,
          problemId
        }
      },
      update: {},
      create: {
        userId,
        problemId
      }
    });
  }

  static async unbookmarkProblem(problemId: number, userId: string) {
    try {
      return await prisma.bookmark.delete({
        where: {
          userId_problemId: {
            userId,
            problemId
          }
        }
      });
    } catch (err: any) {
      if (err.code === "P2025") {
        throw new Error("Bookmark not found.");
      }
      throw err;
    }
  }

  static async listAllTags() {
    const tags = await prisma.tag.findMany({
      select: {
        id: true,
        name: true,
        _count: {
          select: { problems: true }
        }
      },
      orderBy: {
        name: "asc"
      }
    });

    return tags.map((tag) => ({
      id: tag.id,
      name: tag.name,
      problemCount: tag._count.problems
    }));
  }

  static async getProblemsStats(userId: string) {
    const counts = await prisma.problem.groupBy({
      by: ["difficulty"],
      _count: {
        id: true
      }
    });

    const stats: { [key: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    counts.forEach((item) => {
      stats[item.difficulty] = item._count.id;
    });

    // Fetch unique solved problems for this user
    const solvedProblems = await prisma.problem.findMany({
      where: {
        submissions: {
          some: {
            userId,
            status: "Accepted"
          }
        }
      },
      select: {
        difficulty: true
      }
    });

    const solvedStats: { [key: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    solvedProblems.forEach((p) => {
      solvedStats[p.difficulty]++;
    });

    // Calculate current daily streak
    const submissions = await prisma.submission.findMany({
      where: { userId },
      select: { createdAt: true },
      orderBy: { createdAt: "desc" }
    });

    let streak = 0;
    if (submissions.length > 0) {
      const getLocalDateStr = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      };

      const uniqueDates = new Set(submissions.map((s) => getLocalDateStr(new Date(s.createdAt))));

      const today = new Date();
      const todayStr = getLocalDateStr(today);

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = getLocalDateStr(yesterday);

      let currentCheckDate = today;
      if (!uniqueDates.has(todayStr) && uniqueDates.has(yesterdayStr)) {
        currentCheckDate = yesterday;
      }

      const checkStr = getLocalDateStr(currentCheckDate);
      if (uniqueDates.has(checkStr)) {
        streak = 1;
        while (true) {
          currentCheckDate.setDate(currentCheckDate.getDate() - 1);
          const dateStr = getLocalDateStr(currentCheckDate);
          if (uniqueDates.has(dateStr)) {
            streak++;
          } else {
            break;
          }
        }
      }
    }

    return {
      difficultyDistribution: stats,
      solvedDistribution: solvedStats,
      streak
    };
  }
}
export default ProblemsService;
