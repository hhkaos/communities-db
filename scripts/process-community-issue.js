const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const body = process.argv[2];
const communitiesPath = './communities.json';
const imagesFolder = './images';

function extractField(field, multiline = false) {
  const regex = new RegExp(`### ${field}\\s+([\\s\\S]*?)(?:\\n###|$)`, 'i');
  const match = body.match(regex);
  return match ? match[1].trim().replace(/["']/g, '') : '';
}

function toWebpFileName(name) {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '') + '.webp';
}

async function main() {
  // Leer comunidades existentes
  const data = fs.readFileSync(communitiesPath, 'utf-8');
  const communities = JSON.parse(data);
  const newId = communities.length + 1;

  // Extraer campos desde el body del issue
  const name = extractField('Nombre de la comunidad');
  const status = extractField('Estado de la comunidad');
  const communityType = extractField('Tipo de comunidad');
  const eventFormat = extractField('Formato del evento');
  const location = extractField('Ciudad o región principal');
  const topics = extractField('Temas que trata', true);
  const contactInfo = extractField('Información de contacto', true);
  const communityUrl = extractField('URL principal de la comunidad');
  const thumbnailUrlOriginal = extractField('Imagen o logotipo de la comunidad');

  // Fecha actual
  const now = new Date();
  const lastReviewed = now.toLocaleDateString('es-ES');

  // Coordenadas desde Nominatim (con fetch nativo)
  const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}`, {
    headers: {
      'User-Agent': 'ComunidadBot/1.0 (communitybuilders.es@gmail.com)'
    }
  });
  const geoData = await geoRes.json();
  const latLon = geoData.length ? {
    lat: parseFloat(geoData[0].lat),
    lon: parseFloat(geoData[0].lon)
  } : { lat: null, lon: null };

  // Descargar y convertir imagen a .webp
  const webpFilename = toWebpFileName(name);
  if (!fs.existsSync(imagesFolder)) {
    fs.mkdirSync(imagesFolder, { recursive: true });
  }
  const webpPath = path.join(imagesFolder, webpFilename);
  try {
    const imgRes = await fetch(thumbnailUrlOriginal);
    const imgBuffer = await imgRes.arrayBuffer();
    await sharp(Buffer.from(imgBuffer)).webp().toFile(webpPath);
  } catch (e) {
    console.error('❌ Error al procesar la imagen:', e.message);
  }

  // Montar objeto final
  const newCommunity = {
    id: newId.toString(),
    name,
    status,
    lastReviewed,
    communityType,
    eventFormat,
    location,
    topics,
    contactInfo,
    communityUrl,
    thumbnailUrl: `images/${webpFilename}`,
    latLon
  };

  // Añadir al JSON y guardar
  communities.push(newCommunity);
  fs.writeFileSync(communitiesPath, JSON.stringify(communities, null, 2));
  console.log(`✔ Comunidad añadida: ${name} (ID ${newId})`);
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
