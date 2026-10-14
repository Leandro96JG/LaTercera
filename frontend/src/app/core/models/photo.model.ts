export interface Photo {
  readonly id: string;
  readonly albumId: string;
  readonly title: string;
  readonly previewUrl: string;
  readonly originalWidth: number;
  readonly originalHeight: number;
  readonly isSampleHD: boolean;
  readonly fileSizeMb?: number;
}
