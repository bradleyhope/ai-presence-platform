/**
 * Monitoring Service
 * Handles scheduled audits and change detection
 */

import { eq, and, lte, isNotNull } from "drizzle-orm";
import { getDb } from "../db";
import { entities, audits, queries } from "../../drizzle/schema";

/**
 * Get entities that need monitoring
 */
export async function getEntitiesDueForMonitoring() {
  const db = await getDb();
  if (!db) return [];

  const now = new Date();
  
  const result = await db
    .select()
    .from(entities)
    .where(
      and(
        eq(entities.monitoringEnabled, 1),
        lte(entities.nextAuditAt, now)
      )
    );

  return result;
}

/**
 * Schedule next audit for an entity
 */
export async function scheduleNextAudit(entityId: number, frequency: string) {
  const db = await getDb();
  if (!db) return;

  const now = new Date();
  let nextAudit = new Date(now);

  switch (frequency) {
    case "daily":
      nextAudit.setDate(nextAudit.getDate() + 1);
      break;
    case "weekly":
      nextAudit.setDate(nextAudit.getDate() + 7);
      break;
    case "biweekly":
      nextAudit.setDate(nextAudit.getDate() + 14);
      break;
    case "monthly":
      nextAudit.setMonth(nextAudit.getMonth() + 1);
      break;
  }

  await db
    .update(entities)
    .set({
      lastAuditAt: now,
      nextAuditAt: nextAudit,
    })
    .where(eq(entities.id, entityId));
}

/**
 * Compare two audits and detect changes
 */
export async function detectChanges(entityId: number, currentAuditId: number) {
  const db = await getDb();
  if (!db) return null;

  // Get current audit
  const currentAudit = await db
    .select()
    .from(audits)
    .where(eq(audits.id, currentAuditId))
    .limit(1);

  if (currentAudit.length === 0) return null;

  // Get previous audit
  const previousAudits = await db
    .select()
    .from(audits)
    .where(
      and(
        eq(audits.entityId, entityId),
        eq(audits.status, "completed")
      )
    )
    .orderBy(audits.createdAt)
    .limit(2);

  if (previousAudits.length < 2) {
    return {
      isFirstAudit: true,
      changes: [],
    };
  }

  const previousAudit = previousAudits[0];

  // Get queries for both audits
  const [currentQueries, previousQueries] = await Promise.all([
    db.select().from(queries).where(eq(queries.auditId, currentAuditId)),
    db.select().from(queries).where(eq(queries.auditId, previousAudit.id)),
  ]);

  // Detect changes by platform
  const changes: any[] = [];

  for (const platform of ["chatgpt", "perplexity", "gemini", "claude", "grok"]) {
    const currentQuery = currentQueries.find((q) => q.platform === platform);
    const previousQuery = previousQueries.find((q) => q.platform === platform);

    if (!currentQuery || !previousQuery) continue;

    const currentText = currentQuery.responseText || "";
    const previousText = previousQuery.responseText || "";

    // Simple change detection - in production, use more sophisticated diff
    if (currentText !== previousText) {
      const similarity = calculateSimilarity(currentText, previousText);
      
      changes.push({
        platform,
        changeType: similarity < 0.5 ? "major" : similarity < 0.8 ? "moderate" : "minor",
        similarity,
        previousLength: previousText.length,
        currentLength: currentText.length,
        lengthChange: currentText.length - previousText.length,
      });
    }
  }

  return {
    isFirstAudit: false,
    previousAuditId: previousAudit.id,
    previousAuditDate: previousAudit.createdAt,
    changes,
    totalChanges: changes.length,
  };
}

/**
 * Calculate text similarity (simple implementation)
 */
function calculateSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().split(/\s+/));
  const words2 = new Set(text2.toLowerCase().split(/\s+/));
  
  const words1Array = Array.from(words1);
  const words2Array = Array.from(words2);
  
  const intersection = new Set(words1Array.filter(x => words2.has(x)));
  const union = new Set([...words1Array, ...words2Array]);
  
  return intersection.size / union.size;
}

/**
 * Analyze sources from citations
 */
export async function analyzeSourcesForAudit(auditId: number) {
  const db = await getDb();
  if (!db) return null;

  const auditQueries = await db
    .select()
    .from(queries)
    .where(eq(queries.auditId, auditId));

  const sources: Map<string, any> = new Map();

  for (const query of auditQueries) {
    if (!query.citations) continue;

    try {
      const citations = JSON.parse(query.citations);
      
      for (const citation of citations) {
        if (!citation.url) continue;

        const domain = extractDomain(citation.url);
        
        if (!sources.has(domain)) {
          sources.set(domain, {
            domain,
            url: citation.url,
            title: citation.title,
            platforms: [],
            count: 0,
          });
        }

        const source = sources.get(domain)!;
        if (!source.platforms.includes(query.platform)) {
          source.platforms.push(query.platform);
        }
        source.count++;
      }
    } catch (e) {
      console.error("Failed to parse citations:", e);
    }
  }

  // Sort by count (most influential first)
  const sortedSources = Array.from(sources.values()).sort((a, b) => b.count - a.count);

  return {
    totalSources: sortedSources.length,
    sources: sortedSources,
    topSources: sortedSources.slice(0, 10),
  };
}

/**
 * Extract domain from URL
 */
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace("www.", "");
  } catch {
    return url;
  }
}

/**
 * Generate recommendations based on audit results
 */
export async function generateRecommendations(entityId: number, auditId: number) {
  const db = await getDb();
  if (!db) return null;

  const [entity] = await db
    .select()
    .from(entities)
    .where(eq(entities.id, entityId))
    .limit(1);

  if (!entity) return null;

  const auditQueries = await db
    .select()
    .from(queries)
    .where(eq(queries.auditId, auditId));

  const recommendations: any[] = [];

  // Check for missing information
  const hasDescription = auditQueries.some(q => 
    q.responseText && q.responseText.length > 100
  );

  if (!hasDescription) {
    recommendations.push({
      type: "missing_information",
      priority: "high",
      title: "Limited AI Knowledge",
      description: `AI platforms have limited information about ${entity.name}. This suggests a lack of authoritative online presence.`,
      actions: [
        "Create or update Wikipedia page",
        "Publish press releases on major news sites",
        "Update LinkedIn profile with comprehensive information",
        "Publish thought leadership content",
      ],
    });
  }

  // Check for inconsistencies
  const responses = auditQueries.map(q => q.responseText || "");
  const hasInconsistencies = responses.some((r, i) => 
    responses.slice(i + 1).some(r2 => calculateSimilarity(r, r2) < 0.6)
  );

  if (hasInconsistencies) {
    recommendations.push({
      type: "inconsistency",
      priority: "medium",
      title: "Inconsistent Information Across Platforms",
      description: "Different AI platforms are providing different information, suggesting conflicting sources.",
      actions: [
        "Identify and update outdated sources",
        "Ensure consistent messaging across all platforms",
        "Claim and update official profiles (LinkedIn, company website)",
      ],
    });
  }

  // Check for source diversity
  const sourceAnalysis = await analyzeSourcesForAudit(auditId);
  if (sourceAnalysis && sourceAnalysis.totalSources < 3) {
    recommendations.push({
      type: "limited_sources",
      priority: "medium",
      title: "Limited Source Diversity",
      description: "AI platforms are drawing from very few sources, making your presence fragile.",
      actions: [
        "Diversify online presence across multiple authoritative platforms",
        "Get featured in industry publications",
        "Participate in podcasts and interviews",
        "Contribute to reputable blogs and forums",
      ],
    });
  }

  return {
    totalRecommendations: recommendations.length,
    recommendations,
    entity: {
      id: entity.id,
      name: entity.name,
      type: entity.entityType,
    },
  };
}
