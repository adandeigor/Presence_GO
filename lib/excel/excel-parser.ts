import * as XLSX from 'xlsx';
import { z } from 'zod';

const studentSchema = z.object({
  nom: z.string(),
  prenom: z.string().optional(),
  email: z.string().email(),
  telephone: z.string().optional(),
  classe: z.string()
});

type StudentRow = z.infer<typeof studentSchema>;

export interface ParsedStudent {
  name: string;
  email: string;
  phone_number?: string;
  className: string;
}

/**
 * Parse un fichier Excel contenant des données d'étudiants
 */
export async function parseStudentExcel(file: Buffer): Promise<ParsedStudent[]> {
  try {
    const workbook = XLSX.read(file);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    const students: ParsedStudent[] = [];

    for (const row of jsonData) {
      try {
        const validatedRow = studentSchema.parse({
          nom: row['Nom'],
          prenom: row['Prénom'],
          email: row['Email'],
          telephone: row['Téléphone'],
          classe: row['Classe']
        });

        students.push({
          name: [validatedRow.nom, validatedRow.prenom].filter(Boolean).join(' '),
          email: validatedRow.email,
          phone_number: validatedRow.telephone,
          className: validatedRow.classe
        });
      } catch (error) {
        console.error('Erreur validation ligne:', row, error);
        // Continue avec la ligne suivante
      }
    }

    return students;
  } catch (error) {
    console.error('Erreur parsing Excel:', error);
    throw new Error('Erreur lors de la lecture du fichier Excel');
  }
}

/**
 * Génère un fichier Excel template pour l'import d'étudiants
 */
export function generateStudentTemplate(): Buffer {
  const template = [
    {
      'Nom': 'Doe',
      'Prénom': 'John',
      'Email': 'john.doe@example.com',
      'Téléphone': '0123456789',
      'Classe': '6ème A'
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(template);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Étudiants');

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
} 