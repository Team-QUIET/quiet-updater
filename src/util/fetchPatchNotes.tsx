import moment from 'moment';
import { map } from 'rxjs/operators';
import { PatchNote } from './types';
import { Observable } from 'rxjs';
import { AjaxObservable } from 'rxjs/internal/observable/dom/AjaxObservable';

export enum PatchNotesURL {
    Client = 'https://github.com/Team-QUIET/quiet-updater/releases',
    QUIET = 'https://raw.githubusercontent.com/Team-QUIET/QUIET-Community-Edition/refs/heads/main/changelog/V1.69.md',
}

const fetchPatchNotes$ = (url: PatchNotesURL): Observable<PatchNote[] | null> =>
  new AjaxObservable({
    method: 'GET',
    url,
    responseType: url === PatchNotesURL.QUIET ? 'text' : 'json',
  }).pipe(
    map(({ response }: any) => {
      console.warn(response);
      if (url === PatchNotesURL.QUIET) {
        return [
          {
            body: response,
          } as PatchNote,
        ];
      }
      if (Array.isArray(response)) {
        if (response.length === 0) {
          return null;
        }
        return response
          .map((entry) => {
            const { body, name, published_at } = entry;
            if (!body?.length) {
              return null;
            }
            return {
              body,
              name,
              published_at: moment(published_at),
            } as PatchNote;
          })
          .filter((entry) => entry) as PatchNote[];
      }
      return null;
    })
  );

export default fetchPatchNotes$;
