import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT ? Number(process.env.PORT) : 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || '',
  redisUrl: process.env.REDIS_URL || '',
  jwtSecret: process.env.JWT_SECRET || 'replace-me',
  openmrsBaseUrl: process.env.OPENMRS_BASE_URL || '',
  openmrsUsername: process.env.OPENMRS_USERNAME || '',
  openmrsPassword: process.env.OPENMRS_PASSWORD || '',
  openmrsGlucoseConcept: process.env.OPENMRS_GLUCOSE_CONCEPT || '',
  openmrsEncounterTypeUuid: process.env.OPENMRS_ENCOUNTER_TYPE_UUID || '',
  openmrsLocationUuid: process.env.OPENMRS_LOCATION_UUID || '',
  gatewayBaseUrl: process.env.GATEWAY_BASE_URL || '',
  gatewayApiKey: process.env.GATEWAY_API_KEY || '',
};
