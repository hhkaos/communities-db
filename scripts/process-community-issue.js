const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const sharp = require('sharp');

const inputs = JSON.parse(process.argv[2]);
const communitiesPath = './communities.json';
const imagesFolder = './images';

// Utilidades
const toWebpFileName = (name) => name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '') + '.webp';

async function main() {
  // Cargar comunidades existentes
  const data = fs.readFileSync(communitiesPath, 'utf-8');
  const communities = JSON.parse(data);

  // Calcular ID
  const newId = communities.length + 1;

  // Fecha actual
  const now = new Date();
  const lastReviewed = now.toLocaleDateString('es-ES');

  // Obtener lat/lon con Nominatim
  const location = inputs.location;
  const nominatimRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}`, {
    headers: {
      'User-Agent': 'ComunidadBot/1.0 (contacto@tucorreo.com)'
    }
  });
  const geo = await nominatimRes.json();
  const latLon = geo.length > 0 ? {
    lat: parseFloat(geo[0].lat),
    lon: parseFloat(geo[0].lon)
  } : { lat: null, lon: null };

  // Descargar y convertir imagen
  const url = inputs.thumbnailUrl;
  const webpFilename = toWebpFileName(inputs.name);
  const webpPath = path.join(imagesFolder, webpFilename);
  const imgRes = await fetch(url);
  const imgBuffer = await imgRes.buffer();
  await sharp(imgBuffer).webp().toFile(webpPath);

  // Crear entrada nueva
  const newCommunity = {
    id: newId.toString(),
    name: inputs.name,
    status: inputs.status,
    lastReviewed,
    communityType: inputs.communityType,
    eventFormat: inputs.eventFormat,
    location: inputs.location,
    topics: inputs.topics || "",
    contactInfo: inputs.contactInfo || "",
    communityUrl: inputs.communityUrl,
    thumbnailUrl: `images/${webpFilename}`,
    latLon
  };

  // Añadir al array y guardar
  communities.push(newCommunity);
  fs.writeFileSync(communitiesPath, JSON.stringify(communities, null, 2));
  console.log(`✔ Añadida comunidad "${inputs.name}" con ID ${newId}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
