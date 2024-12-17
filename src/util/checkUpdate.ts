import { ajax } from 'rxjs/ajax';
import { tap } from 'rxjs/operators';

const checkUpdate$ = () =>
  ajax
    .getJSON(
        'https://github.com/Team-QUIET/quiet-updater/releases/latest'
    )
    .pipe(
      tap((response) => {
        console.warn(response);
      })
    );

export default checkUpdate$;
