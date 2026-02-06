/**
 * MindPal Configuration
 * Central location for all MindPal workflow IDs and field IDs
 */

export const MINDPAL_CONFIG = {
  // Workflow identification
  WORKFLOW_ID: '69860fd696be27d5d9cb4252',
  API_BASE_URL: 'https://api.mindpal.io/v1',
  
  // Field IDs (CRITICAL - used in API request body)
  FIELD_IDS: {
    documents: '69860fd696be27d5d9cb4258',
    user_priorities: '69860fd696be27d5d9cb4255',
    request_id: '69860fd696be27d5d9cb4257',
    callback_url: '69860fd696be27d5d9cb4256'
  },
  
  // Node IDs (for debugging)
  NODE_IDS: {
    API_INPUT: '69860fd696be27d5d9cb4253',
    DOCUMENT_NORMALIZER: '69860fdb96be27d5d9cb426d',
    EXTRACT_ALL_BIDS: '69860fd796be27d5d9cb4259',
    EQUIPMENT_RESEARCHER: '69860fd796be27d5d9cb425b',
    CONTRACTOR_RESEARCHER: '69860fd796be27d5d9cb425d',
    INCENTIVE_FINDER: '69860fd896be27d5d9cb425f',
    SCORING_ENGINE: '69860fd996be27d5d9cb4265',
    QUESTION_GENERATOR: '69860fd996be27d5d9cb4267',
    PER_BID_FAQ_GENERATOR: '69860fda96be27d5d9cb4269',
    OVERALL_FAQ_GENERATOR: '69860fda96be27d5d9cb426b',
    JSON_ASSEMBLER: '69860fd896be27d5d9cb4261',
    SEND_RESULTS: '69860fd996be27d5d9cb4263'
  },
  
  // Workflow constraints
  MAX_DOCUMENTS: 5,
  MAX_FILE_SIZE_MB: 20,
  POLLING_INTERVAL_MS: 2000,
  POLLING_TIMEOUT_SECONDS: 600,
  
  // Supported file types
  SUPPORTED_MIME_TYPES: [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'image/jpeg',
    'image/png',
    'image/gif'
  ],
  
  SUPPORTED_EXTENSIONS: ['.pdf', '.docx', '.doc', '.jpg', '.jpeg', '.png', '.gif']
};

export function getWorkflowEndpoint(): string {
  return `${MINDPAL_CONFIG.API_BASE_URL}/workflows/${MINDPAL_CONFIG.WORKFLOW_ID}/run`;
}

export function getMindPalApiUrl(apiKey: string): {
  baseUrl: string;
  headers: Record<string, string>;
} {
  return {
    baseUrl: MINDPAL_CONFIG.API_BASE_URL,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }
  };
}
