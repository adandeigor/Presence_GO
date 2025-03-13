import { validateApiKey } from '@/lib/api-utils';
import { withRoleCheck } from '@/lib/auth-middleware';
import { generateStudentTemplate } from '@/lib/excel/excel-parser';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
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

    // Générer le template
    const buffer = generateStudentTemplate();

    // Créer la réponse avec le fichier
    const response = new NextResponse(buffer);
    response.headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    response.headers.set('Content-Disposition', 'attachment; filename=template_etudiants.xlsx');

    return response;
  } catch (error) {
    console.error('[STUDENT_TEMPLATE_ERROR]', error);
    return NextResponse.json(
      { error: "Erreur lors de la génération du template" },
      { status: 500 }
    );
  }
} 