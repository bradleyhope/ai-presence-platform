import PDFDocument from 'pdfkit';
import { Agency, Audit, Entity } from '../../drizzle/schema';
import { analyzeAudit } from './analytics';

interface ReportData {
  audit: Audit;
  entity: Entity;
  agency: Agency;
  queries: any[];
  analytics: Awaited<ReturnType<typeof analyzeAudit>>;
}

export async function generatePDFReport(data: ReportData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
    });

    const buffers: Buffer[] = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    const { audit, entity, agency, queries, analytics } = data;

    // Helper functions
    const addHeader = (text: string, size: number = 18) => {
      doc.fontSize(size).font('Helvetica-Bold').text(text, { align: 'left' });
      doc.moveDown(0.5);
    };

    const addSubheader = (text: string) => {
      doc.fontSize(14).font('Helvetica-Bold').text(text);
      doc.moveDown(0.3);
    };

    const addParagraph = (text: string) => {
      doc.fontSize(10).font('Helvetica').text(text, { align: 'justify' });
      doc.moveDown(0.5);
    };

    const addDivider = () => {
      doc.moveDown(0.3);
      doc.strokeColor('#e5e7eb')
        .lineWidth(1)
        .moveTo(50, doc.y)
        .lineTo(545, doc.y)
        .stroke();
      doc.moveDown(0.5);
    };

    // Page 1: Cover Page
    if (agency.logoUrl) {
      // TODO: Download and embed logo
      // For now, just add agency name
      doc.fontSize(24).font('Helvetica-Bold').text(agency.name, { align: 'center' });
    } else {
      doc.fontSize(24).font('Helvetica-Bold').text(agency.name, { align: 'center' });
    }
    
    doc.moveDown(2);
    doc.fontSize(32).font('Helvetica-Bold').text('AI Presence Audit Report', { align: 'center' });
    doc.moveDown(1);
    doc.fontSize(20).font('Helvetica').text(entity.name, { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica').fillColor('#6b7280')
      .text(`Audit Date: ${new Date(audit.createdAt).toLocaleDateString()}`, { align: 'center' });
    
    doc.addPage();

    // Page 2: Executive Summary
    addHeader('Executive Summary');
    addDivider();

    const overallScore = analytics.overallScore;
    const sentiment = analytics.scores.sentiment;
    
    addParagraph(
      `This comprehensive AI presence audit evaluates how ${entity.name} appears across major AI platforms including ChatGPT, Perplexity, Google Gemini, Anthropic Claude, and Grok. The analysis examines both what these AI systems know from their training data and what they discover through real-time web search.`
    );

    doc.moveDown(0.5);
    addSubheader('Overall AI Presence Score');
    doc.fontSize(36).font('Helvetica-Bold').fillColor(overallScore >= 70 ? '#10b981' : overallScore >= 50 ? '#f59e0b' : '#ef4444')
      .text(`${overallScore}/100`, { align: 'center' });
    doc.fillColor('#000000');
    doc.moveDown(1);

    addSubheader('Key Findings');
    const findings = [];
    
    if (analytics.scores.visibility < 50) {
      findings.push(`Limited visibility across AI platforms (${analytics.scores.visibility}/100). ${entity.name} may not be prominently featured in AI-generated responses.`);
    }
    
    if (analytics.scores.authority >= 70) {
      findings.push(`Strong source authority (${analytics.scores.authority}/100). ${entity.name} is cited by high-quality, credible sources.`);
    } else if (analytics.scores.authority < 50) {
      findings.push(`Weak source authority (${analytics.scores.authority}/100). Few authoritative sources reference ${entity.name}.`);
    }
    
    if (sentiment >= 20) {
      findings.push(`Positive sentiment detected (${sentiment}/100). AI platforms generally present ${entity.name} favorably.`);
    } else if (sentiment <= -20) {
      findings.push(`Negative sentiment detected (${sentiment}/100). Some AI responses contain critical or unfavorable framing.`);
    }
    
    if (analytics.scores.completeness < 60) {
      findings.push(`Information gaps identified (${analytics.scores.completeness}/100 completeness). Key details about ${entity.name} are missing from AI responses.`);
    }

    findings.forEach((finding, index) => {
      addParagraph(`${index + 1}. ${finding}`);
    });

    doc.addPage();

    // Page 3: Detailed Scoring
    addHeader('Detailed Analytics');
    addDivider();

    const scores = [
      { name: 'Visibility', score: analytics.scores.visibility, description: 'How prominently the entity appears in AI responses' },
      { name: 'Authority', score: analytics.scores.authority, description: 'Quality and credibility of citing sources' },
      { name: 'Sentiment', score: sentiment, description: 'Overall tone and framing in AI responses' },
      { name: 'Completeness', score: analytics.scores.completeness, description: 'Comprehensiveness of information provided' },
      { name: 'Source Quality', score: analytics.scores.sourceQuality, description: 'Reliability of information sources' },
      { name: 'Optimization', score: analytics.scores.optimization, description: 'Adherence to AI search best practices' },
    ];

    scores.forEach(({ name, score, description }) => {
      addSubheader(name);
      doc.fontSize(24).font('Helvetica-Bold')
        .fillColor(score >= 70 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444')
        .text(`${score}/100`);
      doc.fillColor('#000000');
      doc.fontSize(10).font('Helvetica').fillColor('#6b7280').text(description);
      doc.fillColor('#000000');
      doc.moveDown(1);
    });

    doc.addPage();

    // Page 4: Platform Breakdown
    addHeader('Platform-by-Platform Analysis');
    addDivider();

    const platforms = ['chatgpt', 'perplexity', 'gemini', 'claude', 'grok'];
    const platformNames: Record<string, string> = {
      chatgpt: 'ChatGPT (OpenAI)',
      perplexity: 'Perplexity AI',
      gemini: 'Google Gemini',
      claude: 'Anthropic Claude',
      grok: 'Grok (xAI)',
    };

    platforms.forEach(platform => {
      const platformQueries = queries.filter(q => q.platform === platform);
      if (platformQueries.length === 0) return;

      addSubheader(platformNames[platform]);
      
      const llmQuery = platformQueries.find(q => q.queryType === 'llm');
      const webQuery = platformQueries.find(q => q.queryType === 'web_search');

      if (llmQuery) {
        doc.fontSize(10).font('Helvetica-Bold').text('Training Data Response:');
        const responsePreview = llmQuery.responseText?.substring(0, 300) + (llmQuery.responseText && llmQuery.responseText.length > 300 ? '...' : '');
        addParagraph(responsePreview || 'No response available');
      }

      if (webQuery) {
        doc.fontSize(10).font('Helvetica-Bold').text('Web Search Response:');
        const responsePreview = webQuery.responseText?.substring(0, 300) + (webQuery.responseText && webQuery.responseText.length > 300 ? '...' : '');
        addParagraph(responsePreview || 'No response available');
        
        if (webQuery.citations && Array.isArray(webQuery.citations) && webQuery.citations.length > 0) {
          doc.fontSize(10).font('Helvetica-Bold').text('Sources:');
          webQuery.citations.slice(0, 5).forEach((citation: string) => {
            doc.fontSize(9).font('Helvetica').fillColor('#3b82f6').text(`• ${citation}`);
          });
          doc.fillColor('#000000');
        }
      }

      doc.moveDown(1);
    });

    doc.addPage();

    // Page 5: SWOT Analysis
    addHeader('SWOT Analysis');
    addDivider();

    const swot = analytics.insights;

    addSubheader('Strengths');
    swot.strengths.forEach((strength: string) => {
      addParagraph(`• ${strength}`);
    });

    doc.moveDown(0.5);
    addSubheader('Weaknesses');
    swot.weaknesses.forEach((weakness: string) => {
      addParagraph(`• ${weakness}`);
    });

    doc.moveDown(0.5);
    addSubheader('Opportunities');
    swot.opportunities.forEach((opportunity: string) => {
      addParagraph(`• ${opportunity}`);
    });

    doc.moveDown(0.5);
    addSubheader('Threats');
    swot.threats.forEach((threat: string) => {
      addParagraph(`• ${threat}`);
    });

    doc.addPage();

    // Page 6: Recommendations
    addHeader('Actionable Recommendations');
    addDivider();

    const recommendations = analytics.recommendations;
    const highPriority = recommendations.filter((r: any) => r.priority === 'high');
    const mediumPriority = recommendations.filter((r: any) => r.priority === 'medium');
    const lowPriority = recommendations.filter((r: any) => r.priority === 'low');

    if (highPriority.length > 0) {
      addSubheader('High Priority');
      highPriority.forEach((rec: any, index: number) => {
        doc.fontSize(10).font('Helvetica-Bold').text(`${index + 1}. ${rec.title}`);
        addParagraph(rec.description);
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#6b7280').text('Action:');
        doc.fontSize(9).font('Helvetica').text(rec.action);
        doc.fillColor('#000000');
        doc.moveDown(0.5);
      });
    }

    if (mediumPriority.length > 0) {
      addSubheader('Medium Priority');
      mediumPriority.forEach((rec: any, index: number) => {
        doc.fontSize(10).font('Helvetica-Bold').text(`${index + 1}. ${rec.title}`);
        addParagraph(rec.description);
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#6b7280').text('Action:');
        doc.fontSize(9).font('Helvetica').text(rec.action);
        doc.fillColor('#000000');
        doc.moveDown(0.5);
      });
    }

    if (lowPriority.length > 0) {
      addSubheader('Low Priority');
      lowPriority.forEach((rec: any, index: number) => {
        doc.fontSize(10).font('Helvetica-Bold').text(`${index + 1}. ${rec.title}`);
        addParagraph(rec.description);
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#6b7280').text('Action:');
        doc.fontSize(9).font('Helvetica').text(rec.action);
        doc.fillColor('#000000');
        doc.moveDown(0.5);
      });
    }

    // Footer on last page
    doc.moveDown(2);
    doc.fontSize(8).font('Helvetica').fillColor('#9ca3af')
      .text(`Report generated by ${agency.name} on ${new Date().toLocaleDateString()}`, { align: 'center' });

    doc.end();
  });
}
