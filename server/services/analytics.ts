/**
 * Advanced Analytics Engine
 * 
 * Provides comprehensive, quantitative analysis of AI presence audits
 * with multi-dimensional scoring, benchmarking, and actionable insights.
 */

import type { Query } from "../../drizzle/schema";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface AnalyticsResult {
  overallScore: number;
  scores: {
    visibility: number;
    authority: number;
    sentiment: number;
    completeness: number;
    sourceQuality: number;
    optimization: number;
  };
  benchmark: {
    industry: string;
    averageScore: number;
    percentile: number;
  };
  insights: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  };
  recommendations: Recommendation[];
  sourceAnalysis: SourceAnalysis;
  platformComparison: PlatformComparison[];
}

export interface Recommendation {
  priority: "critical" | "high" | "medium" | "low";
  category: string;
  title: string;
  description: string;
  impact: string;
  effort: "low" | "medium" | "high";
  timeline: string;
  specificActions: string[];
}

export interface SourceAnalysis {
  totalSources: number;
  tier1Sources: number; // Wikipedia, major news, academic
  tier2Sources: number; // Industry pubs, reputable blogs
  tier3Sources: number; // Press releases, minor sites
  structuredDataSources: number; // Wikidata, Crunchbase, schema
  topDomains: Array<{
    domain: string;
    count: number;
    tier: 1 | 2 | 3;
    authority: number;
  }>;
  diversityScore: number;
}

export interface PlatformComparison {
  platform: string;
  visibility: number;
  sentiment: number;
  completeness: number;
  sourceCount: number;
  responseQuality: number;
}

// ============================================================================
// SCORING ALGORITHMS
// ============================================================================

/**
 * Calculate Visibility Score (0-100)
 * Measures how prominently the entity appears in AI responses
 */
export function calculateVisibilityScore(queries: Query[]): number {
  if (queries.length === 0) return 0;

  let totalScore = 0;
  let count = 0;

  for (const query of queries) {
    if (!query.responseText) continue;

    const response = query.responseText.toLowerCase();
    const entityMentioned = response.length > 50; // Has substantial content
    
    // Position score: earlier mention = higher score
    const firstMentionPosition = response.indexOf(query.queryText.toLowerCase());
    const positionScore = firstMentionPosition === -1 ? 0 : 
      Math.max(0, 100 - (firstMentionPosition / response.length) * 100);

    // Length score: more detailed = higher score
    const lengthScore = Math.min(100, (response.length / 500) * 100);

    // Completeness: contains key information
    const hasKeyInfo = /founded|ceo|company|product|service/i.test(response);
    const completenessBonus = hasKeyInfo ? 20 : 0;

    const queryScore = entityMentioned ? 
      (positionScore * 0.4 + lengthScore * 0.4 + completenessBonus) : 0;

    totalScore += queryScore;
    count++;
  }

  return count > 0 ? Math.min(100, totalScore / count) : 0;
}

/**
 * Calculate Authority Score (0-100)
 * Measures quality and credibility of sources
 */
export function calculateAuthorityScore(queries: Query[]): number {
  const sources = extractAllSources(queries);
  
  if (sources.length === 0) return 0;

  let authoritySum = 0;

  for (const source of sources) {
    const domain = extractDomain(source);
    const tier = classifySourceTier(domain);
    
    // Tier 1: 100 points, Tier 2: 60 points, Tier 3: 30 points
    const tierScore = tier === 1 ? 100 : tier === 2 ? 60 : 30;
    authoritySum += tierScore;
  }

  // Average authority, capped at 100
  return Math.min(100, authoritySum / sources.length);
}

/**
 * Calculate Sentiment Score (-100 to +100)
 * Analyzes tone and framing of AI responses
 */
export function calculateSentimentScore(queries: Query[]): number {
  if (queries.length === 0) return 0;

  const positiveKeywords = [
    'leading', 'innovative', 'successful', 'renowned', 'expert',
    'pioneer', 'award', 'recognized', 'trusted', 'prominent',
    'influential', 'respected', 'acclaimed', 'distinguished'
  ];

  const negativeKeywords = [
    'controversial', 'criticized', 'scandal', 'lawsuit', 'failed',
    'problematic', 'disputed', 'accused', 'alleged', 'questionable',
    'concerns', 'issues', 'challenges', 'struggling'
  ];

  let sentimentSum = 0;
  let count = 0;

  for (const query of queries) {
    if (!query.responseText) continue;

    const response = query.responseText.toLowerCase();
    
    let positiveCount = 0;
    let negativeCount = 0;

    for (const keyword of positiveKeywords) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = response.match(regex);
      if (matches) positiveCount += matches.length;
    }

    for (const keyword of negativeKeywords) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = response.match(regex);
      if (matches) negativeCount += matches.length;
    }

    // Calculate sentiment: +1 for each positive, -1 for each negative
    const netSentiment = positiveCount - negativeCount;
    const normalizedSentiment = Math.max(-100, Math.min(100, netSentiment * 20));
    
    sentimentSum += normalizedSentiment;
    count++;
  }

  return count > 0 ? sentimentSum / count : 0;
}

/**
 * Calculate Completeness Score (0-100)
 * Measures information gaps and missing critical facts
 */
export function calculateCompletenessScore(queries: Query[], entityType: 'person' | 'company'): number {
  if (queries.length === 0) return 0;

  const requiredFields = entityType === 'person' 
    ? ['name', 'title', 'company', 'background', 'expertise']
    : ['name', 'founded', 'founder', 'product', 'industry', 'headquarters'];

  const optionalFields = entityType === 'person'
    ? ['education', 'achievements', 'publications', 'social']
    : ['employees', 'revenue', 'funding', 'customers', 'competitors'];

  let totalScore = 0;
  let count = 0;

  for (const query of queries) {
    if (!query.responseText) continue;

    const response = query.responseText.toLowerCase();
    
    let requiredFound = 0;
    let optionalFound = 0;

    // Check required fields
    for (const field of requiredFields) {
      if (response.includes(field)) requiredFound++;
    }

    // Check optional fields
    for (const field of optionalFields) {
      if (response.includes(field)) optionalFound++;
    }

    // Required fields: 70% weight, Optional fields: 30% weight
    const queryScore = 
      (requiredFound / requiredFields.length) * 70 +
      (optionalFound / optionalFields.length) * 30;

    totalScore += queryScore;
    count++;
  }

  return count > 0 ? totalScore / count : 0;
}

/**
 * Calculate Source Quality Score (0-100)
 * Evaluates credibility and diversity of sources
 */
export function calculateSourceQualityScore(queries: Query[]): number {
  const sources = extractAllSources(queries);
  
  if (sources.length === 0) return 0;

  const analysis = analyzeSourceDistribution(sources);
  
  // Quality = 40% tier distribution + 30% diversity + 30% structured data
  const tierScore = (
    analysis.tier1Sources / sources.length * 100 * 1.0 +
    analysis.tier2Sources / sources.length * 100 * 0.6 +
    analysis.tier3Sources / sources.length * 100 * 0.3
  );

  const diversityScore = analysis.diversityScore;
  const structuredDataScore = analysis.structuredDataSources > 0 ? 100 : 0;

  return tierScore * 0.4 + diversityScore * 0.3 + structuredDataScore * 0.3;
}

/**
 * Calculate Optimization Score (0-100)
 * Measures how well entity has optimized for AI visibility
 */
export function calculateOptimizationScore(queries: Query[]): number {
  const sources = extractAllSources(queries);
  
  let score = 0;

  // Check for Wikipedia presence (25 points)
  const hasWikipedia = sources.some(s => s.includes('wikipedia.org'));
  if (hasWikipedia) score += 25;

  // Check for Wikidata presence (20 points)
  const hasWikidata = sources.some(s => s.includes('wikidata.org'));
  if (hasWikidata) score += 20;

  // Check for structured data sources (20 points)
  const hasStructuredData = sources.some(s => 
    s.includes('crunchbase.com') || 
    s.includes('linkedin.com') ||
    s.includes('schema.org')
  );
  if (hasStructuredData) score += 20;

  // Check for major media coverage (20 points)
  const hasMajorMedia = sources.some(s => 
    s.includes('forbes.com') ||
    s.includes('techcrunch.com') ||
    s.includes('bloomberg.com') ||
    s.includes('wsj.com') ||
    s.includes('nytimes.com')
  );
  if (hasMajorMedia) score += 20;

  // Check for content freshness (15 points)
  // If responses mention recent dates or "recently", assume fresh content
  const hasFreshContent = queries.some(q => 
    q.responseText && /202[3-5]|recently|latest|current/i.test(q.responseText)
  );
  if (hasFreshContent) score += 15;

  return score;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function extractAllSources(queries: Query[]): string[] {
  const sources: string[] = [];

  for (const query of queries) {
    if (!query.citations) continue;

    try {
      const citations = typeof query.citations === 'string' 
        ? JSON.parse(query.citations) 
        : query.citations;

      if (Array.isArray(citations)) {
        sources.push(...citations.map(c => typeof c === 'string' ? c : c.url || c.source || ''));
      }
    } catch (e) {
      // Skip invalid citations
    }
  }

  return sources.filter(s => s.length > 0);
}

function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return url;
  }
}

function classifySourceTier(domain: string): 1 | 2 | 3 {
  const tier1Domains = [
    'wikipedia.org', 'wikidata.org', 'forbes.com', 'bloomberg.com',
    'wsj.com', 'nytimes.com', 'ft.com', 'economist.com', 'reuters.com',
    'apnews.com', 'bbc.com', 'cnn.com', 'nature.com', 'science.org',
    'ieee.org', 'acm.org', 'harvard.edu', 'stanford.edu', 'mit.edu'
  ];

  const tier2Domains = [
    'techcrunch.com', 'venturebeat.com', 'theverge.com', 'wired.com',
    'arstechnica.com', 'zdnet.com', 'cnet.com', 'mashable.com',
    'businessinsider.com', 'fastcompany.com', 'inc.com', 'entrepreneur.com',
    'crunchbase.com', 'linkedin.com', 'medium.com', 'substack.com'
  ];

  if (tier1Domains.some(d => domain.includes(d))) return 1;
  if (tier2Domains.some(d => domain.includes(d))) return 2;
  return 3;
}

function analyzeSourceDistribution(sources: string[]): SourceAnalysis {
  const domainCounts: Map<string, number> = new Map();
  let tier1 = 0, tier2 = 0, tier3 = 0, structured = 0;

  for (const source of sources) {
    const domain = extractDomain(source);
    domainCounts.set(domain, (domainCounts.get(domain) || 0) + 1);

    const tier = classifySourceTier(domain);
    if (tier === 1) tier1++;
    else if (tier === 2) tier2++;
    else tier3++;

    if (domain.includes('wikidata.org') || 
        domain.includes('crunchbase.com') ||
        domain.includes('schema.org')) {
      structured++;
    }
  }

  // Calculate diversity score (Shannon entropy)
  const total = sources.length;
  let entropy = 0;
  for (const count of Array.from(domainCounts.values())) {
    const p = count / total;
    entropy -= p * Math.log2(p);
  }
  const maxEntropy = Math.log2(domainCounts.size);
  const diversityScore = maxEntropy > 0 ? (entropy / maxEntropy) * 100 : 0;

  const topDomains = Array.from(domainCounts.entries())
    .map(([domain, count]) => ({
      domain,
      count,
      tier: classifySourceTier(domain),
      authority: classifySourceTier(domain) === 1 ? 100 : classifySourceTier(domain) === 2 ? 60 : 30
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    totalSources: sources.length,
    tier1Sources: tier1,
    tier2Sources: tier2,
    tier3Sources: tier3,
    structuredDataSources: structured,
    topDomains,
    diversityScore
  };
}

// ============================================================================
// MAIN ANALYTICS FUNCTION
// ============================================================================

export function analyzeAudit(
  queries: Query[],
  entityType: 'person' | 'company',
  industry: string
): AnalyticsResult {
  // Calculate all dimension scores
  const visibility = calculateVisibilityScore(queries);
  const authority = calculateAuthorityScore(queries);
  const sentiment = calculateSentimentScore(queries);
  const completeness = calculateCompletenessScore(queries, entityType);
  const sourceQuality = calculateSourceQualityScore(queries);
  const optimization = calculateOptimizationScore(queries);

  // Calculate overall score (weighted average)
  const overallScore = 
    visibility * 0.25 +
    authority * 0.20 +
    ((sentiment + 100) / 2) * 0.15 + // Normalize sentiment to 0-100
    completeness * 0.15 +
    sourceQuality * 0.15 +
    optimization * 0.10;

  // Benchmark against industry
  const benchmark = getBenchmark(entityType, industry, overallScore);

  // Generate insights
  const insights = generateInsights({
    visibility,
    authority,
    sentiment,
    completeness,
    sourceQuality,
    optimization
  });

  // Generate recommendations
  const recommendations = generateRecommendations({
    visibility,
    authority,
    sentiment,
    completeness,
    sourceQuality,
    optimization
  }, entityType);

  // Analyze sources
  const sourceAnalysis = analyzeSourceDistribution(extractAllSources(queries));

  // Platform comparison
  const platformComparison = generatePlatformComparison(queries);

  return {
    overallScore,
    scores: {
      visibility,
      authority,
      sentiment,
      completeness,
      sourceQuality,
      optimization
    },
    benchmark,
    insights,
    recommendations,
    sourceAnalysis,
    platformComparison
  };
}

function getBenchmark(entityType: 'person' | 'company', industry: string, score: number) {
  // Industry-specific benchmarks
  const benchmarks: Record<string, number> = {
    'technology': 75,
    'finance': 70,
    'healthcare': 65,
    'retail': 60,
    'manufacturing': 55,
    'default': 60
  };

  const averageScore = benchmarks[industry.toLowerCase()] || benchmarks.default;
  const percentile = Math.min(99, Math.max(1, Math.round((score / averageScore) * 50)));

  return {
    industry,
    averageScore,
    percentile
  };
}

function generateInsights(scores: any) {
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const opportunities: string[] = [];
  const threats: string[] = [];

  if (scores.visibility > 70) strengths.push("Strong visibility across AI platforms");
  else if (scores.visibility < 40) weaknesses.push("Low visibility in AI search results");

  if (scores.authority > 70) strengths.push("High-authority sources citing entity");
  else if (scores.authority < 40) weaknesses.push("Weak source authority profile");

  if (scores.sentiment > 30) strengths.push("Positive sentiment in AI responses");
  else if (scores.sentiment < -30) threats.push("Negative sentiment detected");

  if (scores.completeness > 70) strengths.push("Comprehensive information coverage");
  else if (scores.completeness < 40) weaknesses.push("Significant information gaps");

  if (scores.sourceQuality > 70) strengths.push("High-quality, diverse source portfolio");
  else if (scores.sourceQuality < 40) weaknesses.push("Poor source quality and diversity");

  if (scores.optimization > 70) strengths.push("Well-optimized for AI search");
  else if (scores.optimization < 40) opportunities.push("Major optimization opportunities available");

  return { strengths, weaknesses, opportunities, threats };
}

function generateRecommendations(scores: any, entityType: 'person' | 'company'): Recommendation[] {
  const recommendations: Recommendation[] = [];

  // Visibility recommendations
  if (scores.visibility < 60) {
    recommendations.push({
      priority: scores.visibility < 30 ? "critical" : "high",
      category: "Visibility",
      title: "Improve AI Search Visibility",
      description: "Entity has low visibility in AI search results. Implement structured content and digital PR strategies.",
      impact: "Increase mentions in AI responses by 40-60%",
      effort: "medium",
      timeline: "2-3 months",
      specificActions: [
        "Create Wikipedia page (if notable)",
        "Add Wikidata entry with structured facts",
        "Implement schema.org markup on website",
        "Launch digital PR campaign targeting major publications",
        "Optimize content with FAQ sections and clear headings"
      ]
    });
  }

  // Authority recommendations
  if (scores.authority < 60) {
    recommendations.push({
      priority: scores.authority < 30 ? "critical" : "high",
      category: "Authority",
      title: "Build Source Authority",
      description: "Current sources lack credibility. Focus on earning mentions from Tier 1 authoritative sources.",
      impact: "Improve trust signals and AI citation quality",
      effort: "high",
      timeline: "3-6 months",
      specificActions: [
        "Secure coverage in Forbes, TechCrunch, or Bloomberg",
        "Publish thought leadership in industry journals",
        "Get featured in academic or research publications",
        "Build complete Crunchbase and LinkedIn profiles",
        "Earn organic mentions from authoritative industry sources"
      ]
    });
  }

  // Sentiment recommendations
  if (scores.sentiment < 0) {
    recommendations.push({
      priority: scores.sentiment < -50 ? "critical" : "high",
      category: "Reputation",
      title: "Address Negative Sentiment",
      description: "AI responses contain negative framing or controversial content. Proactive reputation management needed.",
      impact: "Shift narrative from negative to neutral/positive",
      effort: "high",
      timeline: "6-12 months",
      specificActions: [
        "Identify and address sources of negative coverage",
        "Publish positive case studies and success stories",
        "Engage in community contributions and thought leadership",
        "Correct misinformation in Wikipedia and other sources",
        "Launch PR campaign to build positive narrative"
      ]
    });
  }

  // Completeness recommendations
  if (scores.completeness < 60) {
    recommendations.push({
      priority: "medium",
      category: "Information",
      title: "Fill Information Gaps",
      description: "AI responses lack key facts and details. Ensure comprehensive information is available online.",
      impact: "Provide complete, accurate information to AI systems",
      effort: "low",
      timeline: "1-2 months",
      specificActions: [
        "Update all online profiles with consistent information",
        "Add missing facts to Wikipedia/Wikidata",
        "Publish comprehensive About page on website",
        "Ensure recent achievements are documented",
        "Correct outdated information across all platforms"
      ]
    });
  }

  // Source Quality recommendations
  if (scores.sourceQuality < 60) {
    recommendations.push({
      priority: "medium",
      category: "Sources",
      title: "Upgrade Source Portfolio",
      description: "Too many low-quality sources. Focus on diversifying and upgrading to Tier 1/2 sources.",
      impact: "Improve credibility and reduce reliance on weak sources",
      effort: "medium",
      timeline: "3-4 months",
      specificActions: [
        "Reduce dependence on press releases",
        "Earn mentions from reputable news outlets",
        "Add structured data sources (Wikidata, Crunchbase)",
        "Diversify source portfolio across multiple domains",
        "Target industry-specific authoritative publications"
      ]
    });
  }

  // Optimization recommendations
  if (scores.optimization < 60) {
    recommendations.push({
      priority: scores.optimization < 30 ? "high" : "medium",
      category: "Optimization",
      title: "Implement AI Search Best Practices",
      description: "Entity lacks basic AI search optimization. Quick wins available through technical implementation.",
      impact: "Immediate improvement in AI discoverability",
      effort: "low",
      timeline: "2-4 weeks",
      specificActions: [
        "Add schema.org markup to website (Organization/Person schema)",
        "Create Wikidata entry with key facts",
        "Restructure website content with clear headings and FAQ",
        "Update Wikipedia page (if exists) with recent information",
        "Implement answer engine optimization (AEO) best practices"
      ]
    });
  }

  // Sort by priority
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return recommendations;
}

function generatePlatformComparison(queries: Query[]): PlatformComparison[] {
  const platforms = ['chatgpt', 'perplexity', 'gemini', 'claude', 'grok'];
  const comparison: PlatformComparison[] = [];

  for (const platform of platforms) {
    const platformQueries = queries.filter(q => q.platform === platform);
    
    if (platformQueries.length === 0) continue;

    const visibility = calculateVisibilityScore(platformQueries);
    const sentiment = calculateSentimentScore(platformQueries);
    const completeness = calculateCompletenessScore(platformQueries, 'company'); // Default to company
    const sourceCount = extractAllSources(platformQueries).length;
    
    // Response quality = average of visibility, sentiment (normalized), completeness
    const responseQuality = (visibility + ((sentiment + 100) / 2) + completeness) / 3;

    comparison.push({
      platform,
      visibility,
      sentiment,
      completeness,
      sourceCount,
      responseQuality
    });
  }

  return comparison;
}
