import { authenticateRequest } from "@/lib/middleware/auth-middleware";
import { prisma } from "@/lib/prisma/init";
import { NextResponse } from "next/server";


export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  
  if (!auth) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const sessions = await prisma.session.findMany({
      where: { userId: auth.user.id },
      select: {
        sessionToken: false, // Ne pas exposer le token
        createdAt: true,
        expires: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            image: true,
            phone_number: true,
            studentId: true,
            role: true,
            level: true,
            classId: true,
            schoolId: true,
          },
        },
      },
    });

    return NextResponse.json(sessions);
  } catch (error) {
    console.error("Get sessions error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}