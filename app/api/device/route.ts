import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/api-utils';
import {
  createDevice,
  getDevices,
  buildDeviceWhereClause
} from '@/lib/functions/device/deviceHelpers';

/**
 * Récupère la liste des appareils
 */
export async function GET(request: NextRequest) {
  try {
    if (!validateApiKey(request)) {
      return NextResponse.json({ error: "Clé API invalide" }, { status: 401 });
    }

    if ((request as any).user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Non autorisé à accéder à cette ressource' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const filters = {
      userId: searchParams.get('userId') || undefined,
      type: searchParams.get('type') || undefined,
      status: searchParams.get('status') || undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 10
    };

    const whereClause = buildDeviceWhereClause(filters);
    const devices = await getDevices(whereClause, filters.page, filters.limit);

    return NextResponse.json(devices);
  } catch (error) {
    console.error('Erreur lors de la récupération des appareils:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des appareils' },
      { status: 500 }
    );
  }
}

/**
 * Crée un nouvel appareil
 */
export async function POST(request: NextRequest) {
  try {
    if (!validateApiKey(request)) {
      return NextResponse.json({ error: "Clé API invalide" }, { status: 401 });
    }

    const { userId, type, name, identifier } = await request.json();

    if (!userId || !type || !name || !identifier) {
      return NextResponse.json(
        { error: 'Données manquantes' },
        { status: 400 }
      );
    }

    if ((request as any).user.role !== 'ADMIN' && userId !== (request as any).user.id) {
      return NextResponse.json(
        { error: 'Non autorisé à créer un appareil pour cet utilisateur' },
        { status: 403 }
      );
    }

    const device = await createDevice({
      userId,
      type,
      name,
      identifier
    });

    return NextResponse.json(device);
  } catch (error) {
    console.error('Erreur lors de la création de l\'appareil:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création de l\'appareil' },
      { status: 500 }
    );
  }
} 