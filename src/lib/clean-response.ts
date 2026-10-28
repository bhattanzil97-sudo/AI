/**
 * Cleans any leaked internal reasoning, meta-analysis, tone breakdown,
 * or draft options from assistant outputs across Online and Offline models.
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
    /^Thinking Process:[\s\S]*?(?:Final Answer:|Answer:|Conclusion:)\s*/i,
    ''
  );
  cleaned = cleaned.replace(/^Thinking Process:[\s\S]*?\n\n(?=[^\n])/i, '');
  cleaned = cleaned.replace(/^(?:Final Answer:|Answer:|Conclusion:)\s*/i, '');

  // 3. Remove "User says: ... Tone: ... Intent: ... Option 1/2/3" scratchpads
  if (/^(?:User says:|Tone:|Intent:|Role:)/im.test(cleaned)) {
    // If there is an Option block, grab the final selected answer after the options
    const optionMatch = cleaned.match(/(?:Option \d[^\n]*\n*)+([\s\S]*)$/i);
    if (optionMatch && optionMatch[1].trim()) {
      cleaned = optionMatch[1].trim();
    } else {
      // Look for the last quoted block at the end
      const quoted = cleaned.match(/"([^"]{2,})"\s*$/);
      if (quoted) {
        cleaned = quoted[1].trim();
      } else {
        cleaned = cleaned
          .split('\n')
          .filter(
            (line) =>
              !/^(?:User says:|Tone:|Intent:|Role:|Option \d|Acknowledge|Offer assistance|Maintain)/i.test(
                line.trim()
              )
          )
          .join('\n')
          .trim();
      }
    }
  }

  // 4. Strip wrapping quotes if the whole message was returned inside quotes
  cleaned = cleaned.trim();
  if (cleaned.startsWith('"') && cleaned.endsWith('"') && cleaned.length > 2) {
    cleaned = cleaned.substring(1, cleaned.length - 1).trim();
  }

  return cleaned;
}

