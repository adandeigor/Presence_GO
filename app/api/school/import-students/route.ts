import { handleServerError } from '@/lib/api';
import { validateApiKey } from '@/lib/api-utils';
import { withRoleCheck } from '@/lib/auth-middleware';
import { parseStudentExcel } from '@/lib/excel/excel-parser';
import { prisma } from '@/lib/prisma/init';
import { uploadFile } from '@/lib/storage/supabase-storage';
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    // Validation de la clé API
    if (!validateApiKey(request)) {
      return NextResponse.json({ error: "Clé API invalide" }, { status: 401 });
    }

    // Vérification des rôles
    const roleCheckResult = await withRoleCheck(request, ['ADMIN']);
    if (roleCheckResult instanceof NextResponse) {
      return roleCheckResult;
    }
    const { user } = roleCheckResult;

    // Vérifier si l'utilisateur est admin d'une école
    const schoolAdmin = await prisma.school_Admin.findUnique({
      where: { admin_id: user.id },
      include: { school: true }
    });

    if (!schoolAdmin) {
      return NextResponse.json(
        { error: "Vous n'êtes pas administrateur d'une école" },
        { status: 403 }
      );
    }

    // Vérifier si l'école est primaire ou secondaire
    if (!['PRIMAIRE', 'SECONDAIRE'].includes(schoolAdmin.school.level)) {
      return NextResponse.json(
        { error: "L'import d'étudiants n'est disponible que pour les écoles primaires et secondaires" },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "Fichier Excel requis" },
        { status: 400 }
      );
    }

    // Lire le fichier
    const buffer = Buffer.from(await file.arrayBuffer());

    // Parser le fichier Excel
    const students = await parseStudentExcel(buffer);

    // Upload le fichier sur Supabase
    const { path } = await uploadFile(
      buffer,
      `schools/${schoolAdmin.schoolId}/imports`,
      `students_${new Date().toISOString()}.xlsx`
    );

    // Créer les classes si elles n'existent pas
    const classNames = [...new Set(students.map(s => s.className))];
    const classes = await Promise.all(
      classNames.map(name =>
        prisma.class.upsert({
          where: {
            schoolId_name: {
              schoolId: schoolAdmin.schoolId,
              name: name
            }
          },
          create: {
            name,
            schoolId: schoolAdmin.schoolId,
            level: schoolAdmin.school.level
          },
          update: {}
        })
      )
    );

    const classMap = new Map(classes.map(c => [c.name, c.id]));

    // Créer les étudiants
    const results = await Promise.allSettled(
      students.map(async student => {
        const hashedPassword = await bcrypt.hash('password123', 12); // Mot de passe temporaire
        const classId = classMap.get(student.className);

        if (!classId) {
          throw new Error(`Classe non trouvée: ${student.className}`);
        }

        return prisma.user.create({
          data: {
            name: student.name,
            email: student.email,
            password: hashedPassword,
            phone_number: student.phone_number,
            role: 'STUDENT',
            schoolId: schoolAdmin.schoolId,
            classId
          }
        });
      })
    );

    // Compter les succès et les échecs
    const succeeded = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    return NextResponse.json({
      message: `Import terminé. ${succeeded} étudiants créés, ${failed} échecs.`,
      filePath: path,
      details: {
        total: students.length,
        succeeded,
        failed,
        classes: classes.length
      }
    });
  } catch (error) {
    console.error('[SCHOOL_IMPORT_STUDENTS_ERROR]', error);
    return handleServerError(error);
  }
} 