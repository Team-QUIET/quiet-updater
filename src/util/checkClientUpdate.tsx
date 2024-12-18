import { ajax } from 'rxjs/ajax';
import { map } from 'rxjs/operators';

import { compare } from 'semver';
import { version } from '../../package.json';

//must make repo public to enable this....
const checkClientUpdate$ = () =>
  ajax.get('https://github.com/Team-QUIET/quiet-updater/releases/latest')
      .pipe(map( ({response: { tag_name, assets },
                  }: {response: {tag_name: string;
                                 assets: { name: string; browser_download_url: string }[];
                                };
                     }) => {const result = compare(version, tag_name.replace("V",""));
                            if (result < 0) {
                                const exeUrl = assets.find((asset) => asset.name.endsWith('.exe'));
                                return exeUrl?.browser_download_url ?? null;}
                            return null;}
               )
           );

export default checkClientUpdate$;
