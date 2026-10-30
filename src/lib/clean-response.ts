/**
 * Cleans any leaked internal reasoning, meta-analysis, tone breakdown,
 * monologue planning, or draft options from assistant outputs across Online and Offline models.
 */
export function cleanReasoning(text: string): string {
  if (!text) return '';
  let cleaned = text;

  // 1. Remove <think>...</think> tags and unclosed <think> blocks
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, '');
  if (cleaned.includes('<think>')) {
    cleaned = cleaned.replace(/<think>[\s\S]*$/gi, '');
  }

  // 2. Remove "Thinking Process: ..." blocks
  cleaned = cleaned.replace(
    /^Thinking Process:[\s\S]*?(?:Final Answer:|Answer:|Conclusion:|\n\n(?=[A-Z0-9]))/gi,
    ''
  );
  cleaned = cleaned.replace(/^(?:Final Answer:|Answer:|Conclusion:)\s*/i, '');

  // 3. Remove "The user said... According to the system instructions... Plan:..." monologue
  cleaned = cleaned.replace(
    /^(?:The user said|User says|According to the system instructions)[\s\S]*?(?:Plan:[\s\S]*?(?:greeting\.|\n\n|(?=[A-Z][a-z]+[!?.]))|(?:\n\n(?=[A-Z])))/i,
    ''
  );

  // 4. Remove Option 1 / Option 2 / Option 3 blocks and preceding analysis
  if (/(?:User says:|Tone:|Intent:|Role:|Option \d)/i.test(cleaned)) {
    // If there is an Option block, the real output is either the last quoted string or text after the last Option
    const afterOptions = cleaned.replace(/^[\s\S]*?(?:Option \d[^\n]*\n*)+/i, '').trim();
    if (afterOptions) {
      cleaned = afterOptions;
    } else {
      // Look for the last quoted block
      const matches = cleaned.match(/"([^"]{2,})"/g);
      if (matches && matches.length > 0) {
        const lastQuoted = matches[matches.length - 1];
        cleaned = lastQuoted.replace(/^"|"$/g, '').trim();
      }
    }
  }

  // 5. Clean any residual Plan: or "Respond with..." fragments
  cleaned = cleaned.replace(/^(?:Plan:|\s*Plan:)\s*/i, '');
  cleaned = cleaned.replace(/^Respond with[\s\S]*?(?:greeting\.|answer\.)\s*/i, '');

  // 6. If duplicate greeting occurred (e.g. "Hello! ... Hello! ...")
  const dupMatch = cleaned.match(/^"([^"]+)"\s*([\s\S]*)$/);
  if (dupMatch && dupMatch[1] === dupMatch[2].trim()) {
    cleaned = dupMatch[1];
  }

  // 7. Strip wrapping quotes if whole message is quoted
  cleaned = cleaned.trim();
  if (cleaned.startsWith('"') && cleaned.endsWith('"') && cleaned.length > 2) {
    cleaned = cleaned.substring(1, cleaned.length - 1).trim();
  }

  return cleaned.trim();
}

