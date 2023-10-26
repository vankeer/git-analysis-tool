import { readdir, stat } from 'fs/promises';
import path from 'path';

export async function getDirectorySize(dir: string): Promise<number> {
  const files = await readdir(dir, { withFileTypes: true });

  const paths = files.map(async (file) => {
    const filePath = path.join(dir, file.name);

    if (file.isDirectory()) {
      return await getDirectorySize(filePath);
    }

    if (file.isFile()) {
      const { size } = await stat(filePath);

      return size;
    }

    return 0;
  });

  return (await Promise.all(paths))
    .flat(Infinity)
    .reduce((i, size) => i + size, 0);
}
