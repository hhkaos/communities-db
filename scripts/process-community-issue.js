const fs = require('fs');
const axios = require('axios');

// Helper to parse field from issue body
function extractField(body, label) {
  const regex = new RegExp(`### ${label}\\n([^#]*)`, 'm');
  const match = body.match(regex);
  return match ? match[1].trim() : '';
}

// Extract and process data
(async () => {
  const issueBody = process.env.ISSUE_BODY;

  const name = extractField(issueBody, 'Nombre de la comunidad');
  const status = extractField(issueBody, 'Estado de la comunidad');
  const communityType = extractField(issueBody, 'Tipo de comunidad');
  const eventFormat = extractField(issueBody, 'Formato del evento');
  const location = extractField(issueBody, 'Ciudad o región principal');
  const topics = extractField(issueBody, 'Temas que trata');
  const contactInfo = extractField(issueBody, 'Información de contacto');
  const communityUrl = extractField(issueBody, 'URL principal de la comunidad');
  const thumbnailUrl = extractField(issueBody, 'Imagen o logotipo de la comunidad');

  // Load existing communities
  const path = 'communities.json';
  const communities = JSON.parse(fs.readFileSync(path, 'utf8'));

  // Determine next ID
  const nextId = Math.max(...communities.map(c => parseInt(c.id))) + 1;

  // Get current date in dd/mm/yyyy
  const today = new Date();
  const lastReviewed = today.toLocaleDateString('es-ES');

  // Geocode with Nominatim
  const geoRes = await axios.get('https://nominatim.openstreetmap.org/search', {
    params: {
      q: location,
      format: 'json',
      limit: 1
    },
    headers: {
      'User-Agent': 'CommunityDirectoryBot (communitybuilders.es@gmail.com)' 
    }
  });

  const latLon = geoRes.data[0]
    ? { lat: parseFloat(geoRes.data[0].lat), lon: parseFloat(geoRes.data[0].lon) }
    : { lat: null, lon: null };

  // Assemble new community object
  const newCommunity = {
    id: nextId.toString(),
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

  communities.push(newCommunity);
  fs.writeFileSync(path, JSON.stringify(communities, null, 2));
  console.log(`✅ Comunidad añadida con ID ${nextId}`);
})();
