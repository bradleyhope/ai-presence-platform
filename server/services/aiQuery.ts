/**
 * AI Query Service
 * Handles querying multiple AI platforms and extracting citations
 */

import { invokeLLM } from "../_core/llm";

export interface Citation {
  title?: string;
  url?: string;
  source?: string;
  snippet?: string;
}

export interface AIQueryResult {
  platform: string;
  responseText: string;
  citations: Citation[];
  error?: string;
}

/**
 * Query ChatGPT using the built-in LLM helper
 */
export async function queryChatGPT(queryText: string): Promise<AIQueryResult> {
  try {
    console.log(`[AI Query] Querying ChatGPT: "${queryText}"`);

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant. Provide accurate, factual information. When possible, mention specific sources or references for your information.",
        },
        {
          role: "user",
          content: queryText,
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    const responseText = typeof content === 'string' ? content : JSON.stringify(content);

    // Extract potential citations from the response
    // This is a simple implementation - in production, you'd use more sophisticated parsing
    const citations = extractCitationsFromText(responseText);

    console.log(`[AI Query] ChatGPT responded with ${responseText.length} characters, ${citations.length} citations`);

    return {
      platform: "chatgpt",
      responseText,
      citations,
    };
  } catch (error: any) {
    console.error(`[AI Query] ChatGPT error:`, error);
    return {
      platform: "chatgpt",
      responseText: "",
      citations: [],
      error: error.message || "Unknown error",
    };
  }
}

/**
 * Query Perplexity using the SONAR API
 */
export async function queryPerplexity(queryText: string): Promise<AIQueryResult> {
  try {
    console.log(`[AI Query] Querying Perplexity: "${queryText}"`);

    const apiKey = process.env.SONAR_API_KEY;
    if (!apiKey) {
      throw new Error("SONAR_API_KEY not configured");
    }

    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "sonar-pro",
        messages: [
          {
            role: "system",
            content: "Be precise and concise. Provide sources for your information.",
          },
          {
            role: "user",
            content: queryText,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Perplexity API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const responseText = data.choices[0]?.message?.content || "";
    const citations = data.citations || [];

    console.log(`[AI Query] Perplexity responded with ${responseText.length} characters, ${citations.length} citations`);

    return {
      platform: "perplexity",
      responseText,
      citations: citations.map((c: any) => ({
        url: c,
        source: c,
      })),
    };
  } catch (error: any) {
    console.error(`[AI Query] Perplexity error:`, error);
    return {
      platform: "perplexity",
      responseText: "",
      citations: [],
      error: error.message || "Unknown error",
    };
  }
}

/**
 * Query Google Gemini
 */
export async function queryGemini(queryText: string): Promise<AIQueryResult> {
  try {
    console.log(`[AI Query] Querying Gemini: "${queryText}"`);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: queryText,
                },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Gemini doesn't provide structured citations, so we extract them from text
    const citations = extractCitationsFromText(responseText);

    console.log(`[AI Query] Gemini responded with ${responseText.length} characters, ${citations.length} citations`);

    return {
      platform: "gemini",
      responseText,
      citations,
    };
  } catch (error: any) {
    console.error(`[AI Query] Gemini error:`, error);
    return {
      platform: "gemini",
      responseText: "",
      citations: [],
      error: error.message || "Unknown error",
    };
  }
}

/**
 * Query Anthropic Claude
 */
export async function queryClaude(queryText: string): Promise<AIQueryResult> {
  try {
    console.log(`[AI Query] Querying Claude: "${queryText}"`);

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY not configured");
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-version": "2023-06-01",
        "anthropic-version": "2023-06-01",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: queryText,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const responseText = data.content?.[0]?.text || "";

    // Claude doesn't provide structured citations, so we extract them from text
    const citations = extractCitationsFromText(responseText);

    console.log(`[AI Query] Claude responded with ${responseText.length} characters, ${citations.length} citations`);

    return {
      platform: "claude",
      responseText,
      citations,
    };
  } catch (error: any) {
    console.error(`[AI Query] Claude error:`, error);
    return {
      platform: "claude",
      responseText: "",
      citations: [],
      error: error.message || "Unknown error",
    };
  }
}

/**
 * Extract citations from text (URLs, references, etc.)
 */
function extractCitationsFromText(text: string): Citation[] {
  const citations: Citation[] = [];

  // Extract URLs using regex
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const urls = text.match(urlRegex) || [];

  for (const url of urls) {
    citations.push({
      url: url.replace(/[.,;:)]$/, ""), // Remove trailing punctuation
      source: url,
    });
  }

  // Extract markdown-style links [text](url)
  const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;
  while ((match = markdownLinkRegex.exec(text)) !== null) {
    citations.push({
      title: match[1],
      url: match[2],
      source: match[2],
    });
  }

  // Deduplicate by URL
  const seen = new Set();
  return citations.filter((c) => {
    if (seen.has(c.url)) return false;
    seen.add(c.url);
    return true;
  });
}

/**
 * Query a specific AI platform
 */
export async function queryAIPlatform(platform: string, queryText: string): Promise<AIQueryResult> {
  switch (platform) {
    case "chatgpt":
      return await queryChatGPT(queryText);
    case "perplexity":
      return await queryPerplexity(queryText);
    case "gemini":
      return await queryGemini(queryText);
    case "claude":
      return await queryClaude(queryText);
    default:
      throw new Error(`Unknown platform: ${platform}`);
  }
}
