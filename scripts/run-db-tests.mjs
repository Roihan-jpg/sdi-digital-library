import { spawn } from 'node:child_process';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const projectRoot = path.resolve(import.meta.dirname, '..');
const testsDirectory = path.join(projectRoot, 'supabase', 'tests');
const container = process.env.SUPABASE_DB_CONTAINER ?? 'supabase_db_sdi-digital-library';

const testFiles = (await readdir(testsDirectory))
  .filter((file) => file.endsWith('.sql'))
  .sort((left, right) => left.localeCompare(right));

if (testFiles.length === 0) {
  throw new Error('Tidak ada integration test SQL di supabase/tests.');
}

for (const file of testFiles) {
  process.stdout.write(`\n[database] ${file}\n`);
  const sql = await readFile(path.join(testsDirectory, file));
  await new Promise((resolve, reject) => {
    const child = spawn(
      'docker',
      ['exec', '-i', container, 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1'],
      { stdio: ['pipe', 'inherit', 'inherit'] },
    );
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${file} gagal dengan exit code ${code ?? 'unknown'}.`));
    });
    child.stdin.end(sql);
  });
}

process.stdout.write(`\n${testFiles.length} integration test database lulus.\n`);
