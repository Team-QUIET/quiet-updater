import { ajax } from 'rxjs/ajax';
import { map } from 'rxjs/operators';

import { compare } from 'semver';
import { version } from '../../package.json';
import { logEntry } from './logger';

const checkQCEUpdate$ = () =>
  ajax
    .get(
      `https://api.github.com/repos/Team-QUIET/QUIET-Community-Edition/releases/latest`
    )
    .pipe(
      map(
        ({
          response: { tag_name, assets },
        }: {
          response: {
            tag_name: string;
            assets: { name: string; browser_download_url: string }[];
          };
        }) => {
          let result = -1;
          try {
            result = compare(version, tag_name);
          } catch (e) {
            logEntry(e as any, 'error', ['file', 'log']);
          }
          if (result < 0) {
            const exeUrl = assets.find(
              (asset) => asset.name === 'QUIET-Community-Edition.zip'
            );
            return exeUrl?.browser_download_url ?? null;
          }
          return null;
        }
      )
    );

export default checkQCEUpdate$;
