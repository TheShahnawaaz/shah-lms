import jwt from "jsonwebtoken";
import prisma from "../../config/db";
import { OAuth2Client } from "google-auth-library";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export class AuthService {
  private static jwtSecret = process.env.JWT_SECRET || "az_practice_secret_jwt_key_987654321";

  static async loginWithGoogle(idToken: string) {
    if (!idToken) {
      throw new Error("Google ID token is required.");
    }

    let email: string;
    let name: string;
    let picture: string;

    // Check for dev/testing mock token
    if (process.env.NODE_ENV !== "production" && idToken.startsWith("mock_token_")) {
      email = idToken.replace("mock_token_", "").toLowerCase();
      name = email.split("@")[0];
      picture = `https://api.dicebear.com/7.x/initials/svg?seed=${name}`;
      console.log(`[Dev Mode] Bypassing Google OAuth. Logging in mock email: ${email}`);
    } else {
      try {
        const ticket = await googleClient.verifyIdToken({
          idToken: idToken,
          audience: process.env.GOOGLE_CLIENT_ID
        });
        const payload = ticket.getPayload();
        if (!payload || !payload.email) {
          throw new Error("Invalid Google token payload.");
        }
        email = payload.email.toLowerCase();
        name = payload.name || "";
        picture = payload.picture || "";
      } catch (err: any) {
        console.error("Google ID Token verification failed:", err);
        throw new Error("Google Token verification failed: " + err.message);
      }
    }

    // Safelist verification - Check if email is in our User table
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new Error(
        "This email is not authorized to access the platform. Please contact the administrator."
      );
    }

    // Sync profile picture and name on login
    const updatedData: any = {};
    if (!user.name && name) {
      updatedData.name = name;
    }
    if (user.profilePictureUrl !== picture) {
      updatedData.profilePictureUrl = picture;
    }

    let loggedInUser = user;
    if (Object.keys(updatedData).length > 0) {
      loggedInUser = await prisma.user.update({
        where: { email },
        data: updatedData
      });
    }

    // Issue standard JWT session
    const token = jwt.sign(
      { id: loggedInUser.id, email: loggedInUser.email, isAdmin: loggedInUser.isAdmin },
      this.jwtSecret,
      { expiresIn: "7d" }
    );

    return {
      token,
      user: {
        id: loggedInUser.id,
        email: loggedInUser.email,
        name: loggedInUser.name,
        profilePictureUrl: loggedInUser.profilePictureUrl,
        isAdmin: loggedInUser.isAdmin
      }
    };
  }

  static async getUserProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        profilePictureUrl: true,
        isAdmin: true,
        createdAt: true
      }
    });

    if (!user) {
      throw new Error("User profile not found.");
    }

    return user;
  }
}
export default AuthService;
