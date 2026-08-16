/**
 * OpenJarvis Integration Service
 * 
 * ARCHITECTURAL JUSTIFICATION:
 * - Decouples React UI components from IPC / Electron execution details.
 * - Provides defensive input validation and standardized error normalization.
 * - Guarantees non-blocking asynchronous interaction with the underlying OS process.
 */

/**
 * Sends a query prompt to local OpenJarvis via the secure Electron IPC bridge.
 * 
 * @param prompt - The user prompt text to send to OpenJarvis
 * @returns The resolved AI response string from the CLI
 * @throws Standardized Error with descriptive message on failure
 */
export async function queryOpenJarvis(prompt: string): Promise<string> {
  const trimmed = prompt?.trim();
  if (!trimmed) {
    throw new Error('Please enter a valid prompt before submitting.');
  }

  // Verify Electron IPC availability
  if (typeof window === 'undefined' || !window.electronAPI?.askJarvis) {
    console.warn('[OpenJarvis Service] Electron IPC bridge is not available in browser mode.');
    throw new Error(
      'OpenJarvis requires the Electron desktop environment. Please ensure the app is running in Electron with OpenJarvis installed.'
    );
  }

  try {
    const rawResult = await window.electronAPI.askJarvis(trimmed);
    if (!rawResult || !rawResult.trim()) {
      return 'Command executed successfully, but no text output was returned by OpenJarvis.';
    }
    return rawResult.trim();
  } catch (error: any) {
    console.error('[OpenJarvis Service] Execution failure:', error);
    const friendlyMessage = error?.message || 'An unexpected error occurred while executing OpenJarvis.';
    throw new Error(friendlyMessage);
  }
}
