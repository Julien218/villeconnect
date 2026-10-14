// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  presignUrl, createProductImageUpload, isAllowedProductImage, isR2Configured,
} = require('../dist/lib/r2');
const { findConfigProblems } = require('../dist/lib/config');

const ENV = {
  R2_ACCOUNT_ID: 'acc123',
  R2_ACCESS_KEY_ID: 'AKIDEXAMPLE',
  R2_SECRET_ACCESS_KEY: 'secretexample',
  R2_BUCKET: 'villeconnect-photos',
  R2_PUBLIC_URL: 'https://photos.example.be/',
};

test('signature AWS V4 conforme à l’exemple officiel (URL pré-signée S3)', () => {
  // Exemple de la documentation AWS « Authenticating Requests: Using Query Parameters ».
  // Le contenu y est signé « UNSIGNED-PAYLOAD », comme ici.
  const url = presignUrl({
    method: 'GET',
    host: 'examplebucket.s3.amazonaws.com',
    path: '/test.txt',
    region: 'us-east-1',
    accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
    secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
    amzDate: '20130524T000000Z',
    expiresSeconds: 86400,
  });
  assert.match(url, /X-Amz-Signature=aeeed9bbccd4d02ee5c0109b86d86835f995330da4c265957d157751f604d404$/);
  assert.ok(url.startsWith('https://examplebucket.s3.amazonaws.com/test.txt?X-Amz-Algorithm=AWS4-HMAC-SHA256'));
});

test('l’envoi d’une photo vise le bon compartiment, le bon commerce et signe type + taille', () => {
  const up = createProductImageUpload(7, 'image/jpeg', 123456, ENV, new Date('2026-10-14T10:00:00Z'));
  const url = new URL(up.uploadUrl);
  assert.equal(url.host, 'acc123.r2.cloudflarestorage.com');
  assert.match(url.pathname, /^\/villeconnect-photos\/products\/7\/[0-9a-f-]{36}\.jpg$/);
  assert.equal(url.searchParams.get('X-Amz-SignedHeaders'), 'content-length;content-type;host');
  assert.equal(url.searchParams.get('X-Amz-Expires'), '300');
  assert.match(url.searchParams.get('X-Amz-Credential'), /^AKIDEXAMPLE\/20261014\/auto\/s3\/aws4_request$/);
  assert.ok(!up.uploadUrl.includes('secretexample'));
  assert.deepEqual(up.headers, { 'Content-Type': 'image/jpeg' });
  assert.equal(up.publicUrl, 'https://photos.example.be' + url.pathname.replace('/villeconnect-photos', ''));
});

test('une photo du compartiment ne peut être reprise que par son commerce', () => {
  const own = 'https://photos.example.be/products/7/0f8fad5b-d9cb-469f-a165-70867728950e.jpg';
  assert.equal(isAllowedProductImage(own, 7, ENV), true);
  assert.equal(isAllowedProductImage(own, 8, ENV), false);
  assert.equal(isAllowedProductImage('https://photos.example.be/products/7/../8/x.jpg', 7, ENV), false);
  assert.equal(isAllowedProductImage('https://ailleurs.example/photo.jpg', 7, ENV), true);
});

test('configuration R2 : tout ou rien', () => {
  assert.equal(isR2Configured(ENV), true);
  assert.equal(isR2Configured({ ...ENV, R2_BUCKET: '' }), false);
  const base = { JWT_SECRET: 'x'.repeat(40), MYSQL_URL: 'mysql://x' };
  assert.deepEqual(findConfigProblems(base), []);
  assert.deepEqual(findConfigProblems({ ...base, ...ENV }), []);
  assert.match(findConfigProblems({ ...base, R2_BUCKET: 'b' }).join(' '), /Photos R2 incomplètes/);
  assert.match(findConfigProblems({ ...base, ...ENV, R2_PUBLIC_URL: 'http://x' }).join(' '), /https/);
});
