/**
 * AI Query Service
 * Handles querying multiple AI platforms and extracting citations
 */

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
 * Query ChatGPT using OpenAI API
 */
export async function queryChatGPT(queryText: string): Promise<AIQueryResult> {
  try {
    console.log(`[AI Query] Querying ChatGPT: "${queryText}"`);

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY not configured");
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
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
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const responseText = data.choices?.[0]?.message?.content || "";

    // Extract potential citations from the response
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
 * Query Grok by xAI
 */
export async function queryGrok(queryText: string): Promise<AIQueryResult> {
  try {
    console.log(`[AI Query] Querying Grok: "${queryText}"`);

    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      throw new Error("XAI_API_KEY not configured");
    }

    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "grok-2-1212",
        messages: [
          {
            role: "system",
            content: "You are Grok, a helpful assistant. Provide accurate, factual information.",
          },
          {
            role: "user",
            content: queryText,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Grok API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const responseText = data.choices?.[0]?.message?.content || "";

    // Grok doesn't provide structured citations, so we extract them from text
    const citations = extractCitationsFromText(responseText);

    console.log(`[AI Query] Grok responded with ${responseText.length} characters, ${citations.length} citations`);

    return {
      platform: "grok",
      responseText,
      citations,
    };
  } catch (error: any) {
    console.error(`[AI Query] Grok error:`, error);
    return {
      platform: "grok",
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
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2048,
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
    case "grok":
      return await queryGrok(queryText);
    default:
      throw new Error(`Unknown platform: ${platform}`);
  }
}

/**
 * WEB SEARCH FUNCTIONS
 * These functions enable web search with citations for each platform
 */

/**
 * Query Claude with web search enabled
 */
export async function queryClaudeWebSearch(queryText: string): Promise<AIQueryResult> {
  try {
    console.log(`[AI Query] Querying Claude Web Search: "${queryText}"`);

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY not configured");
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 4096,
        messages: [{ role: "user", content: queryText }],
        tools: [{
          type: "web_search_20250305",
          name: "web_search",
          max_uses: 5,
        }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Claude web search API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const textContent = data.content?.find((c: any) => c.type === "text");
    const responseText = textContent?.text || "";
    const citations: Citation[] = [];

    // Extract citations from response
    data.content?.forEach((block: any) => {
      if (block.citations) {
        block.citations.forEach((citation: any) => {
          if (citation.url) {
            citations.push({
              url: citation.url,
              title: citation.title,
              snippet: citation.cited_text,
            });
          }
        });
      }
    });

    console.log(`[AI Query] Claude Web Search responded with ${responseText.length} characters, ${citations.length} citations`);

    return {
      platform: "claude_web",
      responseText,
      citations,
    };
  } catch (error: any) {
    console.error(`[AI Query] Claude web search error:`, error);
    return {
      platform: "claude_web",
      responseText: "",
      citations: [],
      error: error.message || "Unknown error",
    };
  }
}

/**
 * Query Gemini with Google Search grounding enabled
 */
export async function queryGeminiWebSearch(queryText: string): Promise<AIQueryResult> {
  try {
    console.log(`[AI Query] Querying Gemini Web Search: "${queryText}"`);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: queryText }] }],
          tools: [{ googleSearch: {} }],
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini web search API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const citations: Citation[] = [];

    // Extract citations from grounding metadata
    const groundingMetadata = data.candidates?.[0]?.groundingMetadata;
    if (groundingMetadata?.groundingChunks) {
      groundingMetadata.groundingChunks.forEach((chunk: any) => {
        if (chunk.web?.uri) {
          citations.push({
            url: chunk.web.uri,
            title: chunk.web.title,
          });
        }
      });
    }

    console.log(`[AI Query] Gemini Web Search responded with ${responseText.length} characters, ${citations.length} citations`);

    return {
      platform: "gemini_web",
      responseText,
      citations,
    };
  } catch (error: any) {
    console.error(`[AI Query] Gemini web search error:`, error);
    return {
      platform: "gemini_web",
      responseText: "",
      citations: [],
      error: error.message || "Unknown error",
    };
  }
}

/**
 * Query Grok with Live Search (Web + X + News)
 */
export async function queryGrokWebSearch(queryText: string): Promise<AIQueryResult> {
  try {
    console.log(`[AI Query] Querying Grok Web Search: "${queryText}"`);

    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      throw new Error("XAI_API_KEY not configured");
    }

    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "grok-4",
        messages: [{ role: "user", content: queryText }],
        search_parameters: {
          mode: "on",
          return_citations: true,
          sources: [
            { type: "web" },
            { type: "x" },
            { type: "news" },
          ],
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Grok web search API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const responseText = data.choices?.[0]?.message?.content || "";
    const citationUrls = data.choices?.[0]?.message?.citations || [];

    const citations: Citation[] = citationUrls.map((url: string) => ({
      url,
      source: url,
    }));

    console.log(`[AI Query] Grok Web Search responded with ${responseText.length} characters, ${citations.length} citations`);

    return {
      platform: "grok_web",
      responseText,
      citations,
    };
  } catch (error: any) {
    console.error(`[AI Query] Grok web search error:`, error);
    return {
      platform: "grok_web",
      responseText: "",
      citations: [],
      error: error.message || "Unknown error",
    };
  }
}



/**
 * Query ChatGPT with web search enabled using Responses API
 */
export async function queryChatGPTWebSearch(queryText: string): Promise<AIQueryResult> {
  try {
    console.log(`[AI Query] Querying ChatGPT Web Search (Responses API): "${queryText}"`);

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY not configured");
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-5",
        reasoning: { effort: "low" },
        tools: [
          {
            type: "web_search",
          },
        ],
        tool_choice: "auto",
        include: ["web_search_call.action.sources"],
        input: queryText,
      }),
    });

    if (!response.ok) {
      throw new Error(`ChatGPT web search API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const responseText = data.output_text || "";
    const citations: Citation[] = [];

    // Extract citations from web_search_call sources
    if (data.web_search_call?.action?.sources) {
      data.web_search_call.action.sources.forEach((source: any) => {
        if (source.url) {
          citations.push({
            url: source.url,
            title: source.title,
            snippet: source.snippet,
          });
        }
      });
    }

    console.log(`[AI Query] ChatGPT Web Search responded with ${responseText.length} characters, ${citations.length} citations`);

    return {
      platform: "chatgpt_web",
      responseText,
      citations,
    };
  } catch (error: any) {
    console.error(`[AI Query] ChatGPT web search error:`, error);
    return {
      platform: "chatgpt_web",
      responseText: "",
      citations: [],
      error: error.message || "Unknown error",
    };
  }
}

/**
 * Query a specific AI platform with web search enabled
 */
export async function queryAIPlatformWebSearch(platform: string, queryText: string): Promise<AIQueryResult> {
  switch (platform) {
    case "chatgpt":
      return await queryChatGPTWebSearch(queryText);
    case "claude":
      return await queryClaudeWebSearch(queryText);
    case "gemini":
      return await queryGeminiWebSearch(queryText);
    case "grok":
      return await queryGrokWebSearch(queryText);
    case "perplexity":
      // Perplexity already has web search built-in
      return await queryPerplexity(queryText);
    default:
      throw new Error(`Unknown platform: ${platform}`);
  }
}
