/**
 * Servicio para validación y extracción de Folder ID de Google Drive
 * Soporta formatos estándar, multi-cuenta (/u/0/), enlaces legacy y Folder IDs directos.
 */

export class GoogleDriveParserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GoogleDriveParserError';
  }
}

/**
 * Valida si un string cumple el formato de Folder ID de Google Drive (alfanumérico con guiones y guiones bajos).
 */
export function isValidDriveFolderId(folderId: string): boolean {
  if (!folderId || typeof folderId !== 'string') return false;
  // Los Folder IDs de Google Drive suelen tener entre 19 y 64 caracteres alfanuméricos, guiones y guiones bajos
  return /^[a-zA-Z0-9_-]{19,64}$/.test(folderId);
}

/**
 * Extrae y valida el Folder ID de una URL de Google Drive compartida o ID directo.
 *
 * Formatos soportados:
 * - https://drive.google.com/drive/folders/{folderId}
 * - https://drive.google.com/drive/u/0/folders/{folderId}
 * - https://drive.google.com/drive/u/3/folders/{folderId}?usp=sharing
 * - https://drive.google.com/drive/folders/{folderId}?usp=drive_link
 * - https://drive.google.com/open?id={folderId}
 * - https://drive.google.com/embeddedfolderview?id={folderId}
 * - {folderId} (ID crudo alfanumérico)
 *
 * Rechaza:
 * - URLs de archivos individuales (/file/d/{id})
 * - Dominios ajenos a Google Drive
 * - Strings vacíos o mal formados
 */
export function extractGoogleDriveFolderId(input: string): string {
  if (!input || typeof input !== 'string') {
    throw new GoogleDriveParserError('La URL o ID de Google Drive no puede estar vacía');
  }

  const trimmed = input.trim();

  // Si el usuario ingresó directamente el Folder ID
  if (isValidDriveFolderId(trimmed) && !trimmed.includes('http') && !trimmed.includes('/')) {
    return trimmed;
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(trimmed);
  } catch {
    throw new GoogleDriveParserError('URL de Google Drive inválida o mal formada');
  }

  // Validar dominio permitido
  const validHostnames = ['drive.google.com', 'docs.google.com'];
  if (!validHostnames.includes(parsedUrl.hostname.toLowerCase())) {
    throw new GoogleDriveParserError(`El dominio '${parsedUrl.hostname}' no pertenece a Google Drive`);
  }

  // Detectar intento de pasar un archivo en lugar de carpeta
  if (parsedUrl.pathname.includes('/file/d/')) {
    throw new GoogleDriveParserError(
      'El enlace corresponde a un archivo individual, no a una carpeta compartida de Google Drive'
    );
  }

  // Formato 1: /drive/folders/{id} o /drive/u/{index}/folders/{id}
  const folderPathRegex = /\/folders\/([a-zA-Z0-9_-]+)/;
  const folderMatch = parsedUrl.pathname.match(folderPathRegex);
  if (folderMatch && isValidDriveFolderId(folderMatch[1])) {
    return folderMatch[1];
  }

  // Formato 2: /open?id={id} o /embeddedfolderview?id={id}
  const idParam = parsedUrl.searchParams.get('id');
  if (idParam && isValidDriveFolderId(idParam)) {
    return idParam;
  }

  throw new GoogleDriveParserError(
    'No se pudo encontrar un ID de carpeta válido en la URL de Google Drive proporcionada'
  );
}
