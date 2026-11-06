import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const API = 'https://apiv8.emiratesauction.net/api';
const headers = { 'Content-Type': 'application/json', Lang: 'en', Source: 'web' };
const observedAt = new Date().toISOString();

async function getJson(path) {
  const response = await fetch(`${API}/${path}`, { headers });
  if (!response.ok) throw new Error(`${path} returned ${response.status}`);
  return response.json();
}

async function postJson(path, body) {
  const response = await fetch(`${API}/${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
  if (response.status === 204) return null;
  if (!response.ok) throw new Error(`${path} returned ${response.status}`);
  return response.json();
}

const sources = [
  { category: 'Sharjah Plates', auctionTypeId: 23, endpoint: 'PlatesBuyNow' },
  { category: 'Ajman Plates', auctionTypeId: 27, endpoint: 'PlatesBuyNow' },
  { category: 'RAK Plates', auctionTypeId: 16, endpoint: 'PlatesBuyNow' },
  { category: 'UAQ Plates', auctionTypeId: 18, endpoint: 'PlatesBuyNow' },
  { category: 'Fujairah Plates', auctionTypeId: 12, endpoint: 'Plates' },
];

const [vehicleData, sourceResults] = await Promise.all([
  getJson('Vehicles/Images?plateType=0'),
  Promise.all(sources.map(async (source) => {
    const result = await postJson(source.endpoint, { PlateFilterRequest: { AuctionTypeId: source.auctionTypeId } });
    const sample = result?.Data?.[0] ?? null;
    return {
      category: source.category,
      auctionTypeId: source.auctionTypeId,
      suffix: String(sample?.cdnSuffixLongPlate ?? ''),
      plateType: Number(sample?.PlateType ?? 0),
    };
  })),
]);

const makes = (Array.isArray(vehicleData.Images) ? vehicleData.Images : []).map((make) => ({
  id: Number(make.MakerId ?? 0),
  title: String(make.Name ?? ''),
  logoUrl: String(make.MakeLogo ?? ''),
  models: (Array.isArray(make.CarImages) ? make.CarImages : []).map((model, index) => ({
    id: `${make.MakerId ?? 0}:${index}`,
    title: String(model.Name ?? ''),
    imageTemplate: String(model.Url ?? ''),
  })).filter((model) => model.title && model.imageTemplate),
})).filter((make) => make.id && make.title && make.models.length);

const output = {
  generatedAt: observedAt,
  source: API,
  formats: sourceResults.filter((source) => source.suffix),
  makes,
};

await mkdir(resolve('public/snapshot'), { recursive: true });
await writeFile(resolve('public/snapshot/plate-preview.json'), `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({ generatedAt: observedAt, formats: output.formats.length, makes: makes.length, models: makes.reduce((sum, make) => sum + make.models.length, 0) }, null, 2));
