import { Photo } from './photo.model';

export type AlbumCategory = 'futbol' | 'hockey' | 'basquet' | 'sociales' | 'otros';

export interface Album {
  readonly id: string;
  readonly category: AlbumCategory;
  readonly title: string;
  readonly subtitle: string;
  readonly date: string;
  readonly eventDate?: string;
  readonly eventTime?: string;
  readonly eventDateTime?: string;
  readonly photosCount: number;
  readonly unitPrice: number;
  readonly fullAlbumPrice: number;
  readonly coverUrl: string;
  readonly badge: string;
  readonly location?: string;
  readonly isPublished?: boolean;
  readonly deletedAt?: string | null;
  readonly isFreeDownload?: boolean;
  readonly freeDownloadUnlockedAt?: string | null;
  readonly isPrivate?: boolean;
  readonly accessCode?: string | null;
  readonly photos?: readonly Photo[];
}

export interface AlbumsApiResponse {
  readonly albums: readonly Album[];
}
