/**
 * Approximate centres of Chennai neighbourhoods.
 *
 * Most OSM POIs carry no addr:suburb tag, which would leave the directory's
 * "area" field empty for the majority of listings — and area is what people
 * actually search by ("tailor in T. Nagar"). Assigning the nearest known
 * neighbourhood is approximate but far more useful than null.
 */
export const CHENNAI_AREAS = [
  ["Adambakkam", 12.989, 80.205],
  ["Adyar", 13.0067, 80.2571],
  ["Alandur", 13.003, 80.202],
  ["Alwarpet", 13.0339, 80.253],
  ["Ambattur", 13.1143, 80.1548],
  ["Aminjikarai", 13.0732, 80.2208],
  ["Anna Nagar", 13.085, 80.2101],
  ["Arumbakkam", 13.073, 80.21],
  ["Ashok Nagar", 13.0358, 80.2107],
  ["Avadi", 13.1147, 80.1098],
  ["Ayanavaram", 13.098, 80.232],
  ["Besant Nagar", 13.0002, 80.2668],
  ["Chetpet", 13.0732, 80.2422],
  ["Choolaimedu", 13.064, 80.223],
  ["Chromepet", 12.9516, 80.1462],
  ["Egmore", 13.0732, 80.2609],
  ["Ekkatuthangal", 13.017, 80.202],
  ["George Town", 13.093, 80.287],
  ["Guindy", 13.0067, 80.2206],
  ["Injambakkam", 12.925, 80.248],
  ["K.K. Nagar", 13.04, 80.199],
  ["Karapakkam", 12.94, 80.23],
  ["Keelkattalai", 12.953, 80.188],
  ["Kilpauk", 13.085, 80.2417],
  ["Kodambakkam", 13.0521, 80.2255],
  ["Kodungaiyur", 13.14, 80.25],
  ["Kolathur", 13.117, 80.213],
  ["Korattur", 13.105, 80.181],
  ["Kottivakkam", 12.9633, 80.257],
  ["Kovilambakkam", 12.942, 80.187],
  ["Koyambedu", 13.07, 80.195],
  ["Madhavaram", 13.148, 80.23],
  ["Madipakkam", 12.962, 80.199],
  ["Manali", 13.166, 80.26],
  ["Manapakkam", 13.013, 80.177],
  ["Medavakkam", 12.918, 80.192],
  ["Meenambakkam", 12.989, 80.17],
  ["Mogappair", 13.085, 80.175],
  ["Mount Road", 13.06, 80.26],
  ["Mylapore", 13.0337, 80.2699],
  ["Nandanam", 13.027, 80.24],
  ["Nanganallur", 12.983, 80.189],
  ["Navalur", 12.845, 80.227],
  ["Neelankarai", 12.949, 80.256],
  ["Nesapakkam", 13.033, 80.188],
  ["Nungambakkam", 13.0569, 80.2425],
  ["Otteri", 13.095, 80.25],
  ["Padi", 13.1, 80.182],
  ["Pallavaram", 12.9675, 80.15],
  ["Pallikaranai", 12.935, 80.21],
  ["Perambur", 13.11, 80.233],
  ["Perungudi", 12.965, 80.244],
  ["Poonamallee", 13.048, 80.095],
  ["Porur", 13.038, 80.156],
  ["Purasawalkam", 13.0878, 80.2482],
  ["Ramapuram", 13.032, 80.178],
  ["Red Hills", 13.19, 80.18],
  ["Royapettah", 13.054, 80.264],
  ["Royapuram", 13.112, 80.294],
  ["Saidapet", 13.021, 80.223],
  ["Saligramam", 13.049, 80.202],
  ["Selaiyur", 12.911, 80.137],
  ["Sembakkam", 12.916, 80.166],
  ["Sholinganallur", 12.901, 80.2279],
  ["Siruseri", 12.825, 80.22],
  ["T. Nagar", 13.0418, 80.2341],
  ["Tambaram", 12.9229, 80.1275],
  ["Teynampet", 13.04, 80.249],
  ["Thirumangalam", 13.085, 80.195],
  ["Thiruvanmiyur", 12.983, 80.259],
  ["Thoraipakkam", 12.94, 80.235],
  ["Tiruvottiyur", 13.16, 80.3],
  ["Tondiarpet", 13.129, 80.286],
  ["Triplicane", 13.058, 80.278],
  ["Vadapalani", 13.05, 80.212],
  ["Valasaravakkam", 13.044, 80.177],
  ["Velachery", 12.9758, 80.2205],
  ["Villivakkam", 13.105, 80.21],
  ["Virugambakkam", 13.053, 80.193],
  ["Vyasarpadi", 13.12, 80.256],
  ["Washermanpet", 13.116, 80.283],
  ["West Mambalam", 13.039, 80.223],
];

/** Rough km-per-degree at Chennai's latitude, good enough for nearest-match. */
const KM_PER_DEG_LAT = 110.57;
const KM_PER_DEG_LNG = 108.4;

/** Nearest neighbourhood within `maxKm`, else null. */
export function nearestArea(lat, lng, maxKm = 4) {
  let best = null;
  let bestDist = Infinity;
  for (const [name, aLat, aLng] of CHENNAI_AREAS) {
    const dLat = (lat - aLat) * KM_PER_DEG_LAT;
    const dLng = (lng - aLng) * KM_PER_DEG_LNG;
    const dist = Math.sqrt(dLat * dLat + dLng * dLng);
    if (dist < bestDist) {
      bestDist = dist;
      best = name;
    }
  }
  return bestDist <= maxKm ? best : null;
}
