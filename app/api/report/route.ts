import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/api-utils';
import {
  generateStudentAttendanceReport,
  generateCourseAttendanceReport,
  generateClassAttendanceReport
} from '@/lib/functions/report/reportHelpers';
import { prisma } from '@/lib/prisma/init';

/**
 * Génère un rapport de présence
 */
export async function GET(request: NextRequest) {
  try {
    if (!validateApiKey(request)) {
      return NextResponse.json({ error: "Clé API invalide" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const id = searchParams.get('id');
    const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined;
    const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined;

    if (!type || !id) {
      return NextResponse.json(
        { error: 'Type de rapport et ID requis' },
        { status: 400 }
      );
    }

    let report;
    let authorized = false;

    switch (type) {
      case 'student':
        // Vérifier les autorisations pour le rapport étudiant
        if ((request as any).user.role === 'ADMIN') {
          authorized = true;
        } else if ((request as any).user.role === 'TEACHER') {
          const studentClasses = await prisma.class.findMany({
            where: {
              teacherId: (request as any).user.id,
              users: {
                some: {
                  id: id
                }
              }
            }
          });
          authorized = studentClasses.length > 0;
        } else if ((request as any).user.role === 'PARENT') {
          const isParent = await prisma.parentChild.findFirst({
            where: {
              parentId: (request as any).user.id,
              childId: id
            }
          });
          authorized = !!isParent;
        } else if ((request as any).user.role === 'STUDENT') {
          authorized = (request as any).user.id === id;
        }

        if (!authorized) {
          return NextResponse.json(
            { error: 'Non autorisé à accéder à ce rapport' },
            { status: 403 }
          );
        }

        report = await generateStudentAttendanceReport({
          studentId: id,
          startDate,
          endDate
        });
        break;

      case 'course':
        // Vérifier les autorisations pour le rapport de cours
        if ((request as any).user.role === 'ADMIN') {
          authorized = true;
        } else if ((request as any).user.role === 'TEACHER') {
          const course = await prisma.course.findUnique({
            where: { id }
          });
          authorized = course?.teacherId === (request as any).user.id;
        }

        if (!authorized) {
          return NextResponse.json(
            { error: 'Non autorisé à accéder à ce rapport' },
            { status: 403 }
          );
        }

        report = await generateCourseAttendanceReport({
          courseId: id,
          startDate,
          endDate
        });
        break;

      case 'class':
        // Vérifier les autorisations pour le rapport de classe
        if ((request as any).user.role === 'ADMIN') {
          authorized = true;
        } else if ((request as any).user.role === 'TEACHER') {
          const class_ = await prisma.class.findUnique({
            where: { id }
          });
          authorized = class_?.teacherId === (request as any).user.id;
        }

        if (!authorized) {
          return NextResponse.json(
            { error: 'Non autorisé à accéder à ce rapport' },
            { status: 403 }
          );
        }

        report = await generateClassAttendanceReport({
          classId: id,
          startDate,
          endDate
        });
        break;

      default:
        return NextResponse.json(
          { error: 'Type de rapport invalide' },
          { status: 400 }
        );
    }

    return NextResponse.json(report);
  } catch (error) {
    console.error('Erreur lors de la génération du rapport:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la génération du rapport' },
      { status: 500 }
    );
  }
} 