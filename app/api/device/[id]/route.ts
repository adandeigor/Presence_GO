import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/api-utils';
import {
  updateDevice,
  deleteDevice,
  getDeviceById
} from '@/lib/functions/device/deviceHelpers';

/**
 * Met à jour un appareil
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!validateApiKey(request)) {
      return NextResponse.json({ error: "Clé API invalide" }, { status: 401 });
    }

    const device = await getDeviceById(params.id);
    if (!device) {
      return NextResponse.json(
        { error: 'Appareil non trouvé' },
        { status: 404 }
      );
    }

    if ((request as any).user.role !== 'ADMIN' && device.userId !== (request as any).user.id) {
      return NextResponse.json(
        { error: 'Non autorisé à modifier cet appareil' },
        { status: 403 }
      );
    }

    const { type, name, status } = await request.json();

    if (!type && !name && !status) {
      return NextResponse.json(
        { error: 'Aucune donnée à mettre à jour' },
        { status: 400 }
      );
    }

    const updatedDevice = await updateDevice(params.id, {
      type,
      name,
      status
    });

    return NextResponse.json(updatedDevice);
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'appareil:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de l\'appareil' },
      { status: 500 }
    );
  }
}

/**
 * Supprime un appareil
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!validateApiKey(request)) {
      return NextResponse.json({ error: "Clé API invalide" }, { status: 401 });
    }

    const device = await getDeviceById(params.id);
    if (!device) {
      return NextResponse.json(
        { error: 'Appareil non trouvé' },
        { status: 404 }
      );
    }

    if ((request as any).user.role !== 'ADMIN' && device.userId !== (request as any).user.id) {
      return NextResponse.json(
        { error: 'Non autorisé à supprimer cet appareil' },
        { status: 403 }
      );
    }

    await deleteDevice(params.id);

    return NextResponse.json(
      { message: 'Appareil supprimé avec succès' }
    );
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'appareil:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de l\'appareil' },
      { status: 500 }
    );
  }
} 