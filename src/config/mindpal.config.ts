/**
 * MindPal Configuration
 * Central location for all MindPal workflow IDs and field IDs
 */

export const MINDPAL_CONFIG = {
  // Workflow identification (v18 — updated 2026-02-22)
  WORKFLOW_ID: '699a33ac6787d2e1b0e9ed93',
  API_BASE_URL: 'https://api-v3.mindpal.io/api/v1',

  // Field IDs (CRITICAL - used in API request body)
  FIELD_IDS: {
    documents: '699a33ad6787d2e1b0e9ed96',
    user_priorities: '699a33ad6787d2e1b0e9ed98',
    request_id: '699a33ad6787d2e1b0e9ed97',
    callback_url: '699a33ad6787d2e1b0e9ed9b',
    user_notes: '699a33ad6787d2e1b0e9ed9a',
    project_id: '699a33ad6787d2e1b0e9ed99'
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
