import prisma from "../../config/db";
import { Prisma } from "@prisma/client";

interface ListProblemsQuery {
  page?: number;
  limit?: number;
  search?: string;
  difficulty?: number;
  tag?: string;
}

export class ProblemsService {
  static async listProblems(query: ListProblemsQuery) {
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
      problems,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages
      }
    };
  }

  static async getProblemDetail(id: number) {
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
        }
      }
    });

    if (!problem) {
      throw new Error(`Problem with ID ${id} not found.`);
    }

    return problem;
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
    
    return tags.map(tag => ({
      id: tag.id,
      name: tag.name,
      problemCount: tag._count.problems
    }));
  }
}
export default ProblemsService;
