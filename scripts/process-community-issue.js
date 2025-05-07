const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Usa fetch nativo en Node.js >=18
const body = process.argv[2];
const communitiesPath = './communities.json';
const imagesFolder = './images';

function extractField(field, multiline = false) {
  const regex = new RegExp(`### ${field}\\s+([\\s\\S]*?)(?:\\n###|$)`, 'i');
  const match = body.match(regex);
  let value = match ? match[1].trim().replace(/["']/g, '') : '';
  return value === '_No response_' ? '' : value;
}

function toWebpFileName(name) {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '') + '.webp';
}

async function main() {
  if (!fs.existsSync(communitiesPath)) {
    console.error('❌ No se encontró el archivo communities.json');
    process.exit(1);
  }

  const data = fs.readFileSync(communitiesPath, 'utf-8');
  const communities = JSON.parse(data);
  const newId = communities.length + 1;

  // Extraer campos desde el issue
  const name = extractField('Nombre de la comunidad');
  const status = extractField('Estado de la comunidad');
  const communityType = extractField('Tipo de comunidad');
  const eventFormat = extractField('Formato del evento');
  const location = extractField('Ciudad o región principal');
  const topics = extractField('Temas que trata', true);
  const contactInfo = extractField('Información de contacto', true);
  const communityUrl = extractField('URL principal de la comunidad');
  const thumbnailUrlOriginal = extractField('Imagen o logotipo de la comunidad');

  // Validar campos requeridos
  if (!name || !status || !communityType || !eventFormat || !location || !communityUrl) {
    console.error('❌ Faltan campos requeridos en el formulario. Revisa los datos del issue.');
    process.exit(1);
  }

  // Validar duplicados por nombre o URL del logo
  const nameExists = communities.some(c => c.name.trim().toLowerCase() === name.trim().toLowerCase());
  const thumbnailExists = communities.some(c => c.thumbnailUrl && thumbnailUrlOriginal && c.thumbnailUrl.includes(path.basename(thumbnailUrlOriginal)));

  if (nameExists || thumbnailExists) {
    console.error(`❌ Esta comunidad podría ser un duplicado:`);
    if (nameExists) console.error(`- Ya existe una comunidad con el nombre "${name}"`);
    if (thumbnailExists) console.error(`- Ya se ha usado esa imagen o una similar como thumbnail`);
    process.exit(1);
  }

  // Fecha actual
  const now = new Date();
  const lastReviewed = now.toLocaleDateString('es-ES');

  // Coordenadas desde Nominatim
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

  // Preparar imagen
  if (!fs.existsSync(imagesFolder)) {
    fs.mkdirSync(imagesFolder, { recursive: true });
  }

  let thumbnailUrl = '';
  try {
    const imgRes = await fetch(thumbnailUrlOriginal);
    const imgBuffer = await imgRes.arrayBuffer();
    const webpFilename = toWebpFileName(name);
    const webpPath = path.join(imagesFolder, webpFilename);
    await sharp(Buffer.from(imgBuffer)).webp().toFile(webpPath);
    thumbnailUrl = `images/${webpFilename}`;
  } catch (e) {
    console.warn('⚠️ No se pudo procesar la imagen. Continuando sin imagen:', e.message);
  }

  // Crear nuevo objeto
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
    thumbnailUrl,
    latLon
  };

  // Añadir y guardar
  communities.push(newCommunity);
  fs.writeFileSync(communitiesPath, JSON.stringify(communities, null, 2));
  console.log(`✔ Comunidad añadida: ${name} (ID ${newId})`);
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
