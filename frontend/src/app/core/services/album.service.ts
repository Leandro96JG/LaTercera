import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Album, AlbumsApiResponse } from '../models/album.model';

@Injectable({
  providedIn: 'root'
})
export class AlbumService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:4000/api/albums';

  public getAlbums(): Observable<readonly Album[]> {
    return this.http.get<AlbumsApiResponse>(this.apiUrl).pipe(
      map(response => response.albums)
    );
  }

  public getAlbumById(id: string): Observable<Album | undefined> {
    return this.getAlbums().pipe(
      map(albums => albums.find(a => a.id === id))
    );
  }
}
