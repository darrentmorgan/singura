/**
 * Vendor Extraction Utilities
 * Extract vendor names from OAuth application display text for grouping
 */

/**
 * Extract vendor name from OAuth application display text
 *
 * Removes common suffixes and domain extensions to extract the vendor name.
 * Returns null if no valid vendor name can be extracted (e.g., generic OAuth apps).
 *
 * Examples:
 * - "Attio" → "Attio"
 * - "Attio CRM" → "Attio"
 * - "attio.com" → "attio"
 * - "OAuth App: 12345" → null
 * - "Slack for Google Workspace" → "Slack"
 * - "" → null
 * - null → null
 *
 * @param displayText - OAuth app display text from platform
 * @returns Extracted vendor name or null if not extractable
 */
export function extractVendorName(displayText: string | null | undefined): string | null {
  if (!displayText || typeof displayText !== 'string') {
    return null;
  }

  // Trim and normalize whitespace
  let cleaned = displayText.trim();

  if (!cleaned) {
    return null;
  }

  // Remove common suffixes (case-insensitive)
  const suffixes = [
    ' OAuth',
    ' API',
    ' App',
    ' for Google Workspace',
    ' for Gmail',
    ' for Slack',
    ' CRM',
    ' Integration',
    ' Connector',
    ' Plugin',
    ' Add-on',
    ' Extension'
  ];

  for (const suffix of suffixes) {
    const regex = new RegExp(suffix + '$', 'i');
    cleaned = cleaned.replace(regex, '');
  }

  // Remove domain extensions
  const domainExtensions = ['.com', '.io', '.ai', '.net', '.org', '.co', '.app'];
  for (const ext of domainExtensions) {
    if (cleaned.toLowerCase().endsWith(ext)) {
      cleaned = cleaned.slice(0, -ext.length);
    }
  }

  // Extract first word (vendor name is usually first)
  const words = cleaned.split(/\s+/);
  const firstWord = words[0];

  // Validate: Must be at least 3 characters
  if (!firstWord || firstWord.length < 3) {
    return null;
  }

  // Check if it's a generic pattern (OAuth App: ID, etc.)
  if (/^(oauth|app|application|token|api|client)$/i.test(firstWord)) {
    return null;
  }

  // Return cleaned vendor name (preserve case from original)
  return firstWord;
}

/**
 * Generate vendor group identifier for database grouping
 *
 * Combines vendor name with platform type to create a unique group key.
 * Format: "{vendor}-{platform}" (lowercase)
 *
 * Examples:
 * - ("Attio", "google") → "attio-google"
 * - ("Slack", "microsoft") → "slack-microsoft"
 * - (null, "google") → null
 * - ("Attio", null) → null
 *
 * @param vendorName - Extracted vendor name
 * @param platformType - Platform type (google, slack, microsoft, etc.)
 * @returns Vendor group identifier or null if inputs invalid
 */
export function generateVendorGroup(
  vendorName: string | null | undefined,
  platformType: string | null | undefined
): string | null {
  if (!vendorName || !platformType) {
    return null;
  }

  if (typeof vendorName !== 'string' || typeof platformType !== 'string') {
    return null;
  }

  // Normalize to lowercase for consistent grouping
  const normalizedVendor = vendorName.trim().toLowerCase();
  const normalizedPlatform = platformType.trim().toLowerCase();

  if (!normalizedVendor || !normalizedPlatform) {
    return null;
  }

  return `${normalizedVendor}-${normalizedPlatform}`;
}
