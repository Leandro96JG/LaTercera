import { describe, it, expect } from 'vitest';
import {
  extractGoogleDriveFolderId,
  isValidDriveFolderId,
  GoogleDriveParserError
} from '../src/services/drive-parser.service';

describe('Google Drive URL Parser Service', () => {
  const sampleFolderId = '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms';

  it('debe extraer el ID de una URL estándar de carpeta', () => {
    const url = `https://drive.google.com/drive/folders/${sampleFolderId}`;
    expect(extractGoogleDriveFolderId(url)).toBe(sampleFolderId);
  });

  it('debe extraer el ID de una URL multi-cuenta (/u/0/folders/)', () => {
    const url = `https://drive.google.com/drive/u/0/folders/${sampleFolderId}`;
    expect(extractGoogleDriveFolderId(url)).toBe(sampleFolderId);
  });

  it('debe extraer el ID de una URL multi-cuenta con índice distinto (/u/2/folders/)', () => {
    const url = `https://drive.google.com/drive/u/2/folders/${sampleFolderId}`;
    expect(extractGoogleDriveFolderId(url)).toBe(sampleFolderId);
  });

  it('debe extraer el ID ignorando query parameters (?usp=sharing, ?usp=drive_link)', () => {
    const url1 = `https://drive.google.com/drive/folders/${sampleFolderId}?usp=sharing`;
    const url2 = `https://drive.google.com/drive/u/0/folders/${sampleFolderId}?usp=drive_link`;
    expect(extractGoogleDriveFolderId(url1)).toBe(sampleFolderId);
    expect(extractGoogleDriveFolderId(url2)).toBe(sampleFolderId);
  });

  it('debe extraer el ID de formato legacy /open?id=', () => {
    const url = `https://drive.google.com/open?id=${sampleFolderId}`;
    expect(extractGoogleDriveFolderId(url)).toBe(sampleFolderId);
  });

  it('debe aceptar directamente un Folder ID crudo válido', () => {
    expect(extractGoogleDriveFolderId(sampleFolderId)).toBe(sampleFolderId);
  });

  it('debe rechazar URLs de archivos individuales (/file/d/) con mensaje explicativo', () => {
    const fileUrl = 'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/view?usp=sharing';
    expect(() => extractGoogleDriveFolderId(fileUrl)).toThrow(
      'El enlace corresponde a un archivo individual, no a una carpeta compartida de Google Drive'
    );
  });

  it('debe rechazar dominios que no pertenezcan a Google Drive', () => {
    const dropboxUrl = 'https://www.dropbox.com/scl/fo/abcde12345/h?rlkey=xyz';
    expect(() => extractGoogleDriveFolderId(dropboxUrl)).toThrow(
      "El dominio 'www.dropbox.com' no pertenece a Google Drive"
    );
  });

  it('debe rechazar strings vacíos o no válidos', () => {
    expect(() => extractGoogleDriveFolderId('')).toThrow(GoogleDriveParserError);
    expect(() => extractGoogleDriveFolderId('   ')).toThrow(GoogleDriveParserError);
    expect(() => extractGoogleDriveFolderId('https://google.com')).toThrow(GoogleDriveParserError);
  });

  it('debe validar la longitud y caracteres del folder ID con isValidDriveFolderId', () => {
    expect(isValidDriveFolderId(sampleFolderId)).toBe(true);
    expect(isValidDriveFolderId('short-id')).toBe(false); // muy corto (< 19)
    expect(isValidDriveFolderId('invalid*character!inside_id_123456789')).toBe(false);
  });
});
