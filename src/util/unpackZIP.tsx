import { from } from 'rxjs';
//@ts-ignore
import ZIP from 'adm-zip';

const unpackZIP$ = (target: string, destination: string) =>
  from(
    new Promise<void>((res, rej) => {
      try {
        let archive = new ZIP(target);
        archive.extractAllTo(destination, true);
        res();
      } catch (e) {
        rej(e);
      }
    })
  );

export default unpackZIP$;
