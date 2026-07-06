import chokidar from 'chokidar';
import path from 'node:path';
import { INGEST_DIR } from '@/lib/config';
import { ingestFile, isSupportedImage } from '@/lib/ingest';

const log = (message: string) => console.log(`[watcher] ${message}`);

async function handleFile(filePath: string, skipIfDone: boolean) {
  const filename = path.basename(filePath);
  if (!isSupportedImage(filename)) return;
  try {
    const result = await ingestFile(filePath, skipIfDone);
    if (result === 'ingested') log(`ingested ${filename}`);
  } catch (err) {
    log(`failed ${filename}: ${err instanceof Error ? err.message : String(err)}`);
  }
}

function start() {
  log(`watching ${INGEST_DIR}`);

  const watcher = chokidar.watch(INGEST_DIR, {
    // Process files already present on startup (reconciliation/backfill), but
    // skip ones that are already fully done so restarts are cheap.
    ignoreInitial: false,
    // Wait for copies to finish before touching the file.
    awaitWriteFinish: { stabilityThreshold: 2000, pollInterval: 200 },
    depth: 0,
  });

  // `add` fires for both pre-existing files (on startup) and newly dropped ones.
  // We only skip-if-done for the initial scan; live drops are always (re)ingested.
  let initialScanDone = false;
  watcher.on('add', (filePath) => handleFile(filePath, !initialScanDone));
  watcher.on('ready', () => {
    initialScanDone = true;
    log('initial scan complete; watching for new files');
  });
  watcher.on('error', (err) => log(`watch error: ${err}`));
}

start();
