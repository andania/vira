/**
 * Geolocation Utilities
 * For IP geolocation and distance calculations
 */

import axios from 'axios';
import { redis } from '../core/cache/redis.client';
import { logger } from '../core/logger';

export interface GeoLocation {
  ip: string;
  country: string;
  countryCode: string;
  region: string;
  regionName: string;
  city: string;
  zip: string;
  lat: number;
  lon: number;
  timezone: string;
  isp: string;
  org: string;
  as: string;
}

/**
 * Get geolocation from IP address
 */
export const getGeoLocation = async (ip: string): Promise<GeoLocation | null> => {
  try {
    // Skip private IPs
    if (isPrivateIP(ip)) {
      return null;
    }

    // Check cache first
    const cached = await redis.get(`geo:${ip}`);
    if (cached) {
      return JSON.parse(cached);
    }

    // Use ip-api.com (free tier: 45 requests per minute)
    const response = await axios.get(`http://ip-api.com/json/${ip}`, {
      params: {
        fields: 'status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,query',
      },
    });

    if (response.data.status === 'success') {
      const location: GeoLocation = {
        ip: response.data.query,
        country: response.data.country,
        countryCode: response.data.countryCode,
        region: response.data.region,
        regionName: response.data.regionName,
        city: response.data.city,
        zip: response.data.zip,
        lat: response.data.lat,
        lon: response.data.lon,
        timezone: response.data.timezone,
        isp: response.data.isp,
        org: response.data.org,
        as: response.data.as,
      };

      // Cache for 24 hours
      await redis.setex(`geo:${ip}`, 86400, JSON.stringify(location));
      
      return location;
    }

    return null;
  } catch (error) {
    logger.error('Error getting geolocation:', error);
    return null;
  }
};

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  unit: 'km' | 'mi' = 'km'
): number => {
  const R = unit === 'km' ? 6371 : 3959; // Earth's radius in km or miles
  
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance * 100) / 100; // Round to 2 decimal places
};

/**
 * Convert degrees to radians
 */
const toRad = (degrees: number): number => {
  return degrees * (Math.PI / 180);
};

/**
 * Get timezone from coordinates
 */
export const getTimeZone = async (lat: number, lon: number): Promise<string | null> => {
  try {
    const response = await axios.get(
      `https://api.timezonedb.com/v2.1/get-time-zone`,
      {
        params: {
          key: process.env.TIMEZONE_API_KEY,
          format: 'json',
          by: 'position',
          lat,
          lng: lon,
        },
      }
    );

    if (response.data.status === 'OK') {
      return response.data.zoneName;
    }

    return null;
  } catch (error) {
    logger.error('Error getting timezone:', error);
    return null;
  }
};

/**
 * Check if IP is private/internal
 */
export const isPrivateIP = (ip: string): boolean => {
  const parts = ip.split('.');
  
  // Localhost
  if (ip === '127.0.0.1' || ip === '::1') return true;
  
  // Private ranges
  if (parts.length === 4) {
    const first = parseInt(parts[0]);
    const second = parseInt(parts[1]);
    
    // 10.0.0.0 - 10.255.255.255
    if (first === 10) return true;
    
    // 172.16.0.0 - 172.31.255.255
    if (first === 172 && second >= 16 && second <= 31) return true;
    
    // 192.168.0.0 - 192.168.255.255
    if (first === 192 && second === 168) return true;
  }
  
  return false;
};

/**
 * Get location string from coordinates
 */
export const getLocationString = (lat: number, lon: number): string => {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lonDir = lon >= 0 ? 'E' : 'W';
  
  return `${Math.abs(lat).toFixed(4)}°${latDir}, ${Math.abs(lon).toFixed(4)}°${lonDir}`;
};

/**
 * Get approximate location from IP (cached)
 */
export const getApproximateLocation = async (ip: string): Promise<string> => {
  const location = await getGeoLocation(ip);
  
  if (location) {
    return `${location.city}, ${location.country}`;
  }
  
  return 'Unknown location';
};

/**
 * Calculate bounding box for radius
 */
export const getBoundingBox = (
  lat: number,
  lon: number,
  radiusKm: number
): { minLat: number; maxLat: number; minLon: number; maxLon: number } => {
  const latChange = radiusKm / 111.32; // 1 degree = 111.32 km
  const lonChange = radiusKm / (111.32 * Math.cos(toRad(lat)));
  
  return {
    minLat: lat - latChange,
    maxLat: lat + latChange,
    minLon: lon - lonChange,
    maxLon: lon + lonChange,
  };
};

/**
 * Check if coordinates are within radius
 */
export const isWithinRadius = (
  centerLat: number,
  centerLon: number,
  targetLat: number,
  targetLon: number,
  radiusKm: number
): boolean => {
  const distance = calculateDistance(centerLat, centerLon, targetLat, targetLon);
  return distance <= radiusKm;
};

/**
 * Get country from IP
 */
export const getCountryFromIP = async (ip: string): Promise<string | null> => {
  const location = await getGeoLocation(ip);
  return location?.countryCode || null;
};

/**
 * Get continent from country code
 */
export const getContinent = (countryCode: string): string | null => {
  const continentMap: Record<string, string> = {
    // Africa
    DZ: 'AF', AO: 'AF', BJ: 'AF', BW: 'AF', BF: 'AF', BI: 'AF', CV: 'AF', CM: 'AF',
    CF: 'AF', TD: 'AF', KM: 'AF', CG: 'AF', CD: 'AF', DJ: 'AF', EG: 'AF', GQ: 'AF',
    ER: 'AF', SZ: 'AF', ET: 'AF', GA: 'AF', GM: 'AF', GH: 'AF', GN: 'AF', GW: 'AF',
    CI: 'AF', KE: 'AF', LS: 'AF', LR: 'AF', LY: 'AF', MG: 'AF', MW: 'AF', ML: 'AF',
    MR: 'AF', MU: 'AF', YT: 'AF', MA: 'AF', MZ: 'AF', NA: 'AF', NE: 'AF', NG: 'AF',
    RE: 'AF', RW: 'AF', SH: 'AF', ST: 'AF', SN: 'AF', SC: 'AF', SL: 'AF', SO: 'AF',
    ZA: 'AF', SS: 'AF', SD: 'AF', TZ: 'AF', TG: 'AF', TN: 'AF', UG: 'AF', EH: 'AF',
    ZM: 'AF', ZW: 'AF',
    
    // Antarctica
    AQ: 'AN',
    
    // Asia
    AF: 'AS', AM: 'AS', AZ: 'AS', BH: 'AS', BD: 'AS', BT: 'AS', IO: 'AS', BN: 'AS',
    KH: 'AS', CN: 'AS', CX: 'AS', CC: 'AS', GE: 'AS', HK: 'AS', IN: 'AS', ID: 'AS',
    IR: 'AS', IQ: 'AS', IL: 'AS', JP: 'AS', JO: 'AS', KZ: 'AS', KW: 'AS', KG: 'AS',
    LA: 'AS', LB: 'AS', MO: 'AS', MY: 'AS', MV: 'AS', MN: 'AS', MM: 'AS', NP: 'AS',
    KP: 'AS', OM: 'AS', PK: 'AS', PS: 'AS', PH: 'AS', QA: 'AS', SA: 'AS', SG: 'AS',
    KR: 'AS', LK: 'AS', SY: 'AS', TW: 'AS', TJ: 'AS', TH: 'AS', TL: 'AS', TR: 'AS',
    TM: 'AS', AE: 'AS', UZ: 'AS', VN: 'AS', YE: 'AS',
    
    // Europe
    AL: 'EU', AD: 'EU', AT: 'EU', BY: 'EU', BE: 'EU', BA: 'EU', BG: 'EU', HR: 'EU',
    CY: 'EU', CZ: 'EU', DK: 'EU', EE: 'EU', FO: 'EU', FI: 'EU', FR: 'EU', DE: 'EU',
    GI: 'EU', GR: 'EU', GG: 'EU', HU: 'EU', IS: 'EU', IE: 'EU', IM: 'EU', IT: 'EU',
    JE: 'EU', LV: 'EU', LI: 'EU', LT: 'EU', LU: 'EU', MT: 'EU', MD: 'EU', MC: 'EU',
    ME: 'EU', NL: 'EU', MK: 'EU', NO: 'EU', PL: 'EU', PT: 'EU', RO: 'EU', RU: 'EU',
    SM: 'EU', RS: 'EU', SK: 'EU', SI: 'EU', ES: 'EU', SJ: 'EU', SE: 'EU', CH: 'EU',
    UA: 'EU', GB: 'EU', VA: 'EU',
    
    // North America
    AI: 'NA', AG: 'NA', AW: 'NA', BS: 'NA', BB: 'NA', BZ: 'NA', BM: 'NA', BQ: 'NA',
    VG: 'NA', CA: 'NA', KY: 'NA', CR: 'NA', CU: 'NA', CW: 'NA', DM: 'NA', DO: 'NA',
    SV: 'NA', GL: 'NA', GD: 'NA', GP: 'NA', GT: 'NA', HT: 'NA', HN: 'NA', JM: 'NA',
    MQ: 'NA', MX: 'NA', MS: 'NA', NI: 'NA', PA: 'NA', PR: 'NA', BL: 'NA', KN: 'NA',
    LC: 'NA', MF: 'NA', PM: 'NA', VC: 'NA', SX: 'NA', TT: 'NA', TC: 'NA', VI: 'NA',
    US: 'NA',
    
    // Oceania
    AS: 'OC', AU: 'OC', CK: 'OC', FJ: 'OC', PF: 'OC', GU: 'OC', KI: 'OC', MH: 'OC',
    FM: 'OC', NR: 'OC', NC: 'OC', NZ: 'OC', NU: 'OC', NF: 'OC', MP: 'OC', PW: 'OC',
    PG: 'OC', PN: 'OC', WS: 'OC', SB: 'OC', TK: 'OC', TO: 'OC', TV: 'OC', VU: 'OC',
    WF: 'OC',
    
    // South America
    AR: 'SA', BO: 'SA', BR: 'SA', CL: 'SA', CO: 'SA', EC: 'SA', FK: 'SA', GF: 'SA',
    GY: 'SA', PY: 'SA', PE: 'SA', SR: 'SA', UY: 'SA', VE: 'SA',
  };
  
  return continentMap[countryCode] || null;
};