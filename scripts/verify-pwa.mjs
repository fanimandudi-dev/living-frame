// Vérification offline du build PWA — `npm run verify:pwa`
// Asserte que tout ce que le mode avion exige est présent ET précaché.
import { existsSync, readFileSync, readdirSync } from 'node:fs';

const DIST = 'dist/living-frame/browser';
let failures = 0;

function check(label, ok) {
  console.log(`${ok ? '✓' : '✗'} ${label}`);
  if (!ok) failures++;
}

// 1. Fichiers critiques présents dans le build.
for (const file of [
  'index.html',
  'manifest.webmanifest',
  'ngsw-worker.js',
  'ngsw.json',
  'artworks/demo/idle.jpg',
  'artworks/demo/engaged.jpg',
  'mediapipe/wasm/vision_wasm_internal.js',
  'mediapipe/wasm/vision_wasm_internal.wasm',
  'mediapipe/models/blaze_face_short_range.tflite',
  'icons/icon-512x512.png',
]) {
  check(`présent : ${file}`, existsSync(`${DIST}/${file}`));
}

// 2. Les assets critiques sont bien dans la table de précache du SW.
const ngsw = JSON.parse(readFileSync(`${DIST}/ngsw.json`, 'utf8'));
const hashTable = ngsw.hashTable ?? {};
for (const asset of [
  '/artworks/demo/idle.jpg',
  '/artworks/demo/engaged.jpg',
  '/mediapipe/wasm/vision_wasm_internal.js',
  '/mediapipe/wasm/vision_wasm_internal.wasm',
  '/mediapipe/models/blaze_face_short_range.tflite',
]) {
  check(`précaché : ${asset}`, asset in hashTable);
}

// 3. Aucune référence à un CDN dans le JS livré (garantie offline — risque R1).
//    Allowlist explicite : les constantes de chemins par défaut des transcodeurs
//    KTX2/Basis de PixiJS (chunk paresseux). Inertes dans Living Frame — nous
//    ne chargeons AUCUNE texture compressée (Graphics procéduraux uniquement),
//    ces URL ne sont jamais contactées. Tout autre URL CDN reste bloquant.
const INERT_CDN_PREFIX = 'https://cdn.jsdelivr.net/npm/pixi.js/transcoders/';
const jsFiles = readdirSync(DIST).filter((f) => f.endsWith('.js'));
const bundled = jsFiles.map((f) => readFileSync(`${DIST}/${f}`, 'utf8')).join('\n');
const liveCdnRefs = bundled.split(INERT_CDN_PREFIX).join('');
check(
  'aucune URL CDN (jsdelivr) active dans le JS livré',
  !liveCdnRefs.includes('cdn.jsdelivr'),
);
check('aucune URL CDN (storage.googleapis) dans le JS livré', !bundled.includes('storage.googleapis'));

// 4. Le manifeste est complet.
const manifest = JSON.parse(readFileSync(`${DIST}/manifest.webmanifest`, 'utf8'));
check('manifeste : nom + 2 icônes minimum', manifest.name === 'Living Frame' && manifest.icons.length >= 2);

if (failures > 0) {
  console.error(`\n${failures} vérification(s) en échec — PWA NON offline-ready.`);
  process.exit(1);
}
console.log('\nPWA offline-ready ✓');
