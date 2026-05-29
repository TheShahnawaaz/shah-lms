import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../../config/db";

interface RegisterInput {
  email: string;
  password?: string;
  name?: string;
}

export class AuthService {
  private static jwtSecret = process.env.JWT_SECRET || "az_practice_secret_jwt_key_987654321";

  static async register(input: RegisterInput) {
    const { email, password, name } = input;
    if (!email || !password) {
      throw new Error("Email and password are required.");
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new Error("User with this email already exists.");
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name
      }
    });

    const token = jwt.sign({ id: user.id, email: user.email }, this.jwtSecret, {
      expiresIn: "7d"
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    };
  }

  static async login(email?: string, password?: string) {
    if (!email || !password) {
      throw new Error("Email and password are required.");
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new Error("Invalid email or password.");
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new Error("Invalid email or password.");
    }

    const token = jwt.sign({ id: user.id, email: user.email }, this.jwtSecret, {
      expiresIn: "7d"
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    };
  }

  static async getUserProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, createdAt: true }
    });

    if (!user) {
      throw new Error("User profile not found.");
    }

    return user;
  }
}
export default AuthService;
