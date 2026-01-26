import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { getUserByEmail, createUser } from "@/lib/db";

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
                name: { label: "Name", type: "text" },
                isSignUp: { label: "Is Sign Up", type: "text" }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error("Email and password required");
                }

                const isSignUp = credentials.isSignUp === "true";

                if (isSignUp) {
                    // Sign up flow
                    const existingUser = getUserByEmail(credentials.email);
                    if (existingUser) {
                        throw new Error("User already exists");
                    }

                    const hashedPassword = await bcrypt.hash(credentials.password, 10);
                    const user = createUser({
                        email: credentials.email,
                        password: hashedPassword,
                        name: credentials.name || credentials.email.split('@')[0]
                    });

                    return {
                        id: user.id,
                        email: user.email,
                        name: user.name
                    };
                } else {
                    // Login flow
                    const user = getUserByEmail(credentials.email);
                    if (!user) {
                        throw new Error("Invalid credentials");
                    }

                    const isValid = await bcrypt.compare(credentials.password, user.password);
                    if (!isValid) {
                        throw new Error("Invalid credentials");
                    }

                    return {
                        id: user.id,
                        email: user.email,
                        name: user.name
                    };
                }
            }
        })
    ],
    session: {
        strategy: "jwt",
        maxAge: 60 * 60 // 1 hour
    },
    pages: {
        signIn: "/"
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.email = user.email;
                token.name = user.name;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                (session.user as any).id = token.id as string;
                session.user.email = token.email as string;
                session.user.name = token.name as string;
            }
            return session;
        }
    },
    secret: process.env.NEXTAUTH_SECRET || "your-secret-key-change-in-production"
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
