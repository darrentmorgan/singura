/**
 * AI Provider Detection Patterns
 * Comprehensive detection patterns for 8 major AI providers
 * Used by AI provider detector service for multi-method confidence scoring
 */

/**
 * Supported AI providers
 */
export type AIProvider =
  | 'openai'
  | 'anthropic'
  | 'google_ai'
  | 'cohere'
  | 'huggingface'
  | 'replicate'
  | 'mistral'
  | 'together_ai'
  | 'unknown';

/**
 * Detection methods used to identify AI providers
 */
export type DetectionMethod =
  | 'api_endpoint'
  | 'user_agent'
  | 'oauth_scope'
  | 'ip_range'
  | 'webhook_pattern'
  | 'content_signature';

/**
 * AI provider detection pattern configuration
 */
export interface AIProviderPattern {
  /** Provider identifier */
  provider: AIProvider;

  /** Display name for UI */
  displayName: string;

  /** API endpoint patterns (regex) */
  endpoints: RegExp[];

  /** User agent patterns (regex) */
  userAgents: RegExp[];

  /** OAuth scope patterns */
  scopes: string[];

  /** Known IP address ranges (CIDR notation) */
  ipRanges?: string[];

  /** Webhook URL patterns (regex) */
  webhooks?: RegExp[];

  /** Content signature keywords */
  contentSignatures: string[];

  /** Confidence weights for each detection method */
  confidenceWeights: {
    endpoint: number;      // Weight for API endpoint detection (0-100)
    userAgent: number;     // Weight for user agent detection (0-100)
    scope: number;         // Weight for OAuth scope detection (0-100)
    ipRange: number;       // Weight for IP range detection (0-100)
    webhook: number;       // Weight for webhook pattern detection (0-100)
    content: number;       // Weight for content signature detection (0-100)
  };
}

/**
 * AI provider detection result
 */
export interface AIProviderDetectionResult {
  /** Detected AI provider */
  provider: AIProvider;

  /** Confidence score (0-100) */
  confidence: number;

  /** Detection methods that matched */
  detectionMethods: DetectionMethod[];

  /** Evidence collected during detection */
  evidence: {
    matchedEndpoints?: string[];
    matchedUserAgents?: string[];
    matchedScopes?: string[];
    matchedIpRanges?: string[];
    matchedWebhooks?: string[];
    matchedSignatures?: string[];
  };

  /** Model name if detected */
  model?: string;

  /** When this detection occurred */
  detectedAt?: Date;

  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Comprehensive AI provider detection patterns
 * Patterns for 8 major AI providers with multi-method detection
 */
export const AI_PROVIDER_PATTERNS: Record<Exclude<AIProvider, 'unknown'>, AIProviderPattern> = {
  openai: {
    provider: 'openai',
    displayName: 'OpenAI (ChatGPT, GPT-4)',
    endpoints: [
      /api\.openai\.com/i,
      /chat\.openai\.com/i,
      /platform\.openai\.com/i,
      /openai\.com\/v1/i
    ],
    userAgents: [
      /openai/i,
      /chatgpt/i,
      /gpt-3\.5/i,
      /gpt-4/i,
      /text-davinci/i
    ],
    scopes: [
      'openai.api',
      'openai.chat',
      'openai.completions'
    ],
    ipRanges: [
      '104.18.0.0/15',     // Cloudflare CDN used by OpenAI
      '172.64.0.0/13'      // Additional Cloudflare range
    ],
    webhooks: [
      /openai\.com\/webhooks?/i,
      /api\.openai\.com\/callback/i
    ],
    contentSignatures: [
      'openai_api_key',
      'OPENAI_API_KEY',
      'sk-proj-',           // OpenAI project API key prefix
      'sk-',                // OpenAI API key prefix
      'text-davinci',
      'gpt-3.5-turbo',
      'gpt-4',
      'gpt-4-turbo',
      'dall-e',
      'whisper-1',
      'tts-1'
    ],
    confidenceWeights: {
      endpoint: 40,
      userAgent: 30,
      scope: 25,
      ipRange: 10,
      webhook: 25,
      content: 30
    }
  },

  anthropic: {
    provider: 'anthropic',
    displayName: 'Anthropic (Claude)',
    endpoints: [
      /api\.anthropic\.com/i,
      /console\.anthropic\.com/i,
      /claude\.ai/i
    ],
    userAgents: [
      /anthropic/i,
      /claude/i,
      /claude-v1/i,
      /claude-v2/i,
      /claude-3/i
    ],
    scopes: [
      'anthropic.api',
      'anthropic.completions'
    ],
    ipRanges: [
      '160.79.104.0/23'    // Anthropic IP range
    ],
    webhooks: [
      /anthropic\.com\/webhooks?/i,
      /api\.anthropic\.com\/callback/i
    ],
    contentSignatures: [
      'anthropic_api_key',
      'ANTHROPIC_API_KEY',
      'sk-ant-',            // Anthropic API key prefix
      'claude-instant',
      'claude-v1',
      'claude-v2',
      'claude-3-opus',
      'claude-3-sonnet',
      'claude-3-haiku'
    ],
    confidenceWeights: {
      endpoint: 40,
      userAgent: 30,
      scope: 25,
      ipRange: 10,
      webhook: 25,
      content: 30
    }
  },

  google_ai: {
    provider: 'google_ai',
    displayName: 'Google AI (Gemini, PaLM)',
    endpoints: [
      /generativelanguage\.googleapis\.com/i,
      /ai\.google\.dev/i,
      /makersuite\.google\.com/i,
      /gemini\.google\.com/i
    ],
    userAgents: [
      /google-ai/i,
      /gemini/i,
      /palm-api/i,
      /bard/i
    ],
    scopes: [
      'https://www.googleapis.com/auth/generative-language',
      'https://www.googleapis.com/auth/cloud-platform'
    ],
    ipRanges: [
      '216.58.192.0/19',   // Google IP ranges
      '172.217.0.0/16'
    ],
    webhooks: [
      /googleapis\.com\/webhooks?/i,
      /cloud\.google\.com\/callback/i
    ],
    contentSignatures: [
      'GOOGLE_AI_KEY',
      'GOOGLE_API_KEY',
      'gemini-pro',
      'gemini-ultra',
      'palm-2',
      'text-bison',
      'chat-bison',
      'generativelanguage'
    ],
    confidenceWeights: {
      endpoint: 40,
      userAgent: 30,
      scope: 35,
      ipRange: 10,
      webhook: 25,
      content: 30
    }
  },

  cohere: {
    provider: 'cohere',
    displayName: 'Cohere',
    endpoints: [
      /api\.cohere\.ai/i,
      /cohere\.com\/api/i,
      /dashboard\.cohere\.com/i
    ],
    userAgents: [
      /cohere/i,
      /cohere-python/i,
      /cohere-node/i
    ],
    scopes: [
      'cohere.api',
      'cohere.generate',
      'cohere.embed'
    ],
    ipRanges: [
      '35.222.0.0/16'      // Google Cloud IP range used by Cohere
    ],
    webhooks: [
      /cohere\.ai\/webhooks?/i,
      /api\.cohere\.com\/callback/i
    ],
    contentSignatures: [
      'cohere_api_key',
      'COHERE_API_KEY',
      'cohere.generate',
      'cohere.embed',
      'cohere.classify',
      'command',
      'command-light',
      'command-nightly'
    ],
    confidenceWeights: {
      endpoint: 40,
      userAgent: 30,
      scope: 25,
      ipRange: 10,
      webhook: 25,
      content: 30
    }
  },

  huggingface: {
    provider: 'huggingface',
    displayName: 'HuggingFace',
    endpoints: [
      /api-inference\.huggingface\.co/i,
      /huggingface\.co\/api/i,
      /hf\.co/i
    ],
    userAgents: [
      /huggingface/i,
      /transformers/i,
      /hf-inference/i
    ],
    scopes: [
      'huggingface.api',
      'huggingface.inference'
    ],
    ipRanges: [
      '18.205.0.0/16'      // AWS IP range used by HuggingFace
    ],
    webhooks: [
      /huggingface\.co\/webhooks?/i,
      /api-inference\.huggingface\.co\/callback/i
    ],
    contentSignatures: [
      'hf_',                // HuggingFace token prefix
      'HF_TOKEN',
      'HUGGINGFACE_TOKEN',
      'huggingface_hub',
      'transformers',
      'pipeline(',
      'AutoModel',
      'AutoTokenizer'
    ],
    confidenceWeights: {
      endpoint: 40,
      userAgent: 30,
      scope: 25,
      ipRange: 10,
      webhook: 25,
      content: 30
    }
  },

  replicate: {
    provider: 'replicate',
    displayName: 'Replicate',
    endpoints: [
      /api\.replicate\.com/i,
      /replicate\.com\/api/i
    ],
    userAgents: [
      /replicate/i,
      /replicate-python/i,
      /replicate-node/i
    ],
    scopes: [
      'replicate.api',
      'replicate.predictions'
    ],
    webhooks: [
      /replicate\.com\/webhooks?/i,
      /api\.replicate\.com\/callback/i
    ],
    contentSignatures: [
      'replicate_api_token',
      'REPLICATE_API_TOKEN',
      'r8_',                // Replicate token prefix
      'replicate.run',
      'replicate.predictions'
    ],
    confidenceWeights: {
      endpoint: 40,
      userAgent: 30,
      scope: 25,
      ipRange: 10,
      webhook: 25,
      content: 30
    }
  },

  mistral: {
    provider: 'mistral',
    displayName: 'Mistral AI',
    endpoints: [
      /api\.mistral\.ai/i,
      /chat\.mistral\.ai/i
    ],
    userAgents: [
      /mistral/i,
      /mistral-client/i
    ],
    scopes: [
      'mistral.api',
      'mistral.chat'
    ],
    webhooks: [
      /mistral\.ai\/webhooks?/i,
      /api\.mistral\.ai\/callback/i
    ],
    contentSignatures: [
      'mistral_api_key',
      'MISTRAL_API_KEY',
      'mistral-tiny',
      'mistral-small',
      'mistral-medium',
      'mistral-large'
    ],
    confidenceWeights: {
      endpoint: 40,
      userAgent: 30,
      scope: 25,
      ipRange: 10,
      webhook: 25,
      content: 30
    }
  },

  together_ai: {
    provider: 'together_ai',
    displayName: 'Together AI',
    endpoints: [
      /api\.together\.xyz/i,
      /together\.ai/i
    ],
    userAgents: [
      /together/i,
      /together-ai/i
    ],
    scopes: [
      'together.api',
      'together.inference'
    ],
    webhooks: [
      /together\.xyz\/webhooks?/i,
      /api\.together\.xyz\/callback/i
    ],
    contentSignatures: [
      'together_api_key',
      'TOGETHER_API_KEY',
      'togethercomputer',
      'together.xyz'
    ],
    confidenceWeights: {
      endpoint: 40,
      userAgent: 30,
      scope: 25,
      ipRange: 10,
      webhook: 25,
      content: 30
    }
  }
};

/**
 * Detect AI provider from event data using multi-method analysis
 *
 * @param eventData - Event data containing API calls, user agents, etc.
 * @returns Detection result with confidence score and evidence
 */
export function detectAIProvider(eventData: {
  apiEndpoint?: string;
  userAgent?: string;
  scopes?: string[];
  ipAddress?: string;
  webhookUrl?: string;
  content?: string;
}): AIProviderDetectionResult | null {
  let bestMatch: AIProviderDetectionResult | null = null;
  let highestConfidence = 0;

  // Iterate through all AI provider patterns
  for (const pattern of Object.values(AI_PROVIDER_PATTERNS)) {
    const result = analyzeEventAgainstPattern(eventData, pattern);

    if (result && result.confidence > highestConfidence) {
      highestConfidence = result.confidence;
      bestMatch = result;
    }
  }

  // Only return matches with confidence >= 30%
  return bestMatch && bestMatch.confidence >= 30 ? bestMatch : null;
}

/**
 * Analyze event data against a specific AI provider pattern
 */
function analyzeEventAgainstPattern(
  eventData: {
    apiEndpoint?: string;
    userAgent?: string;
    scopes?: string[];
    ipAddress?: string;
    webhookUrl?: string;
    content?: string;
  },
  pattern: AIProviderPattern
): AIProviderDetectionResult | null {
  const detectionMethods: DetectionMethod[] = [];
  const evidence: AIProviderDetectionResult['evidence'] = {};
  let totalScore = 0;
  let totalWeight = 0;

  // Check API endpoint
  if (eventData.apiEndpoint) {
    const matched = pattern.endpoints.filter(regex => regex.test(eventData.apiEndpoint!));
    if (matched.length > 0) {
      detectionMethods.push('api_endpoint');
      evidence.matchedEndpoints = matched.map(r => r.source);
      totalScore += pattern.confidenceWeights.endpoint;
      totalWeight += pattern.confidenceWeights.endpoint;
    }
  }

  // Check user agent
  if (eventData.userAgent) {
    const matched = pattern.userAgents.filter(regex => regex.test(eventData.userAgent!));
    if (matched.length > 0) {
      detectionMethods.push('user_agent');
      evidence.matchedUserAgents = matched.map(r => r.source);
      totalScore += pattern.confidenceWeights.userAgent;
      totalWeight += pattern.confidenceWeights.userAgent;
    }
  }

  // Check OAuth scopes
  if (eventData.scopes && eventData.scopes.length > 0) {
    const matched = pattern.scopes.filter(scope =>
      eventData.scopes!.some(s => s.toLowerCase().includes(scope.toLowerCase()))
    );
    if (matched.length > 0) {
      detectionMethods.push('oauth_scope');
      evidence.matchedScopes = matched;
      totalScore += pattern.confidenceWeights.scope;
      totalWeight += pattern.confidenceWeights.scope;
    }
  }

  // Check IP range (simplified CIDR matching)
  if (eventData.ipAddress && pattern.ipRanges) {
    const matched = pattern.ipRanges.filter(range =>
      isIpInRange(eventData.ipAddress!, range)
    );
    if (matched.length > 0) {
      detectionMethods.push('ip_range');
      evidence.matchedIpRanges = matched;
      totalScore += pattern.confidenceWeights.ipRange;
      totalWeight += pattern.confidenceWeights.ipRange;
    }
  }

  // Check webhook URL
  if (eventData.webhookUrl && pattern.webhooks) {
    const matched = pattern.webhooks.filter(regex => regex.test(eventData.webhookUrl!));
    if (matched.length > 0) {
      detectionMethods.push('webhook_pattern');
      evidence.matchedWebhooks = matched.map(r => r.source);
      totalScore += pattern.confidenceWeights.webhook;
      totalWeight += pattern.confidenceWeights.webhook;
    }
  }

  // Check content signatures
  if (eventData.content) {
    const contentLower = eventData.content.toLowerCase();
    const matched = pattern.contentSignatures.filter(sig =>
      contentLower.includes(sig.toLowerCase())
    );
    if (matched.length > 0) {
      detectionMethods.push('content_signature');
      evidence.matchedSignatures = matched;
      totalScore += pattern.confidenceWeights.content;
      totalWeight += pattern.confidenceWeights.content;
    }
  }

  // No matches found
  if (detectionMethods.length === 0) {
    return null;
  }

  // Calculate confidence score as percentage (0-100 scale)
  const confidence = Math.round((totalScore / Math.max(totalWeight, 1)) * 100);

  return {
    provider: pattern.provider,
    confidence,
    detectionMethods,
    evidence
  };
}

/**
 * Simple CIDR IP range check
 * Note: This is a simplified implementation. For production, consider using a library like 'ip-cidr'
 */
function isIpInRange(ip: string, cidr: string): boolean {
  // Simplified implementation - always returns false for now
  // TODO: Implement proper CIDR matching or use library
  // For MVP, we rely on other detection methods
  return false;
}

/**
 * Extract model name from event content
 */
export function extractModelName(content: string): string | undefined {
  const modelPatterns = [
    // OpenAI models
    /gpt-4-turbo(?:-preview)?/i,
    /gpt-4(?:-\d{4})?/i,
    /gpt-3\.5-turbo(?:-\d{4})?/i,
    /text-davinci-\d{3}/i,
    /dall-e-[23]/i,

    // Anthropic models
    /claude-3-opus/i,
    /claude-3-sonnet/i,
    /claude-3-haiku/i,
    /claude-(?:v)?[12]/i,
    /claude-instant/i,

    // Google models
    /gemini-(?:ultra|pro)/i,
    /palm-2/i,
    /text-bison/i,
    /chat-bison/i,

    // Cohere models
    /command(?:-(?:light|nightly))?/i,

    // Mistral models
    /mistral-(?:tiny|small|medium|large)/i
  ];

  for (const pattern of modelPatterns) {
    const match = content.match(pattern);
    if (match) {
      return match[0];
    }
  }

  return undefined;
}
