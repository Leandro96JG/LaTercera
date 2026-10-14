import { Photo } from './photo.model';

export type AlbumCategory = 'futbol' | 'hockey' | 'basquet' | 'sociales';

export interface Album {
  readonly id: string;
  readonly category: AlbumCategory;
  readonly title: string;
  readonly subtitle: string;
  readonly date: string;
  readonly photosCount: number;
  readonly unitPrice: number;
  readonly fullAlbumPrice: number;
  readonly coverUrl: string;
  readonly badge: string;
  readonly photos?: readonly Photo[];
}

export interface AlbumsApiResponse {
  readonly albums: readonly Album[];
}
