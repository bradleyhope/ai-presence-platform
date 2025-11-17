import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, TrendingUp, TrendingDown, AlertCircle, CheckCircle2, Target } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import DashboardLayout from "@/components/DashboardLayout";

export default function AuditInsights() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const auditId = parseInt(params.id || "0");

  const { data: analytics, isLoading } = trpc.analytics.getAuditAnalytics.useQuery({ auditId });

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="container py-8">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" onClick={() => setLocation(`/audits/${auditId}`)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Audit
            </Button>
          </div>
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Analyzing audit data...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!analytics) {
    return (
      <DashboardLayout>
        <div className="container py-8">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" onClick={() => setLocation(`/audits/${auditId}`)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Audit
            </Button>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>No Analytics Available</CardTitle>
              <CardDescription>Unable to generate analytics for this audit.</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBadge = (score: number) => {
    if (score >= 80) return <Badge className="bg-green-600">Excellent</Badge>;
    if (score >= 60) return <Badge className="bg-yellow-600">Good</Badge>;
    if (score >= 40) return <Badge className="bg-orange-600">Fair</Badge>;
    return <Badge className="bg-red-600">Poor</Badge>;
  };

  const getPriorityIcon = (priority: string) => {
    if (priority === "critical") return <AlertCircle className="h-4 w-4 text-red-600" />;
    if (priority === "high") return <AlertCircle className="h-4 w-4 text-orange-600" />;
    if (priority === "medium") return <Target className="h-4 w-4 text-yellow-600" />;
    return <CheckCircle2 className="h-4 w-4 text-blue-600" />;
  };

  return (
    <DashboardLayout>
      <div className="container py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => setLocation(`/audits/${auditId}`)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Audit
            </Button>
            <div>
              <h1 className="text-3xl font-bold">AI Presence Analytics</h1>
              <p className="text-muted-foreground">Comprehensive quantitative analysis and actionable insights</p>
            </div>
          </div>
        </div>

        {/* Overall Score Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Overall AI Presence Score</CardTitle>
                <CardDescription>
                  Industry: {analytics.benchmark.industry} | Percentile: {analytics.benchmark.percentile}th
                </CardDescription>
              </div>
              {getScoreBadge(analytics.overallScore)}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className={`text-6xl font-bold ${getScoreColor(analytics.overallScore)}`}>
                  {Math.round(analytics.overallScore)}
                </div>
                <div className="text-sm text-muted-foreground mt-2">Out of 100</div>
              </div>
              <div className="flex-1">
                <Progress value={analytics.overallScore} className="h-4" />
                <div className="flex justify-between text-sm text-muted-foreground mt-2">
                  <span>Industry Average: {analytics.benchmark.averageScore}</span>
                  <span>
                    {analytics.overallScore > analytics.benchmark.averageScore ? (
                      <span className="text-green-600 flex items-center gap-1">
                        <TrendingUp className="h-4 w-4" />
                        Above Average
                      </span>
                    ) : (
                      <span className="text-red-600 flex items-center gap-1">
                        <TrendingDown className="h-4 w-4" />
                        Below Average
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Score Breakdown */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Score Breakdown</CardTitle>
            <CardDescription>Multi-dimensional analysis across 6 key metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Visibility Score */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Visibility</span>
                  <span className={`font-bold ${getScoreColor(analytics.scores.visibility)}`}>
                    {Math.round(analytics.scores.visibility)}
                  </span>
                </div>
                <Progress value={analytics.scores.visibility} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  How prominently the entity appears in AI responses
                </p>
              </div>

              {/* Authority Score */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Authority</span>
                  <span className={`font-bold ${getScoreColor(analytics.scores.authority)}`}>
                    {Math.round(analytics.scores.authority)}
                  </span>
                </div>
                <Progress value={analytics.scores.authority} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  Quality and credibility of citing sources
                </p>
              </div>

              {/* Sentiment Score */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Sentiment</span>
                  <span className={`font-bold ${getScoreColor((analytics.scores.sentiment + 100) / 2)}`}>
                    {Math.round(analytics.scores.sentiment)}
                  </span>
                </div>
                <Progress value={(analytics.scores.sentiment + 100) / 2} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  Tone and framing (-100 to +100)
                </p>
              </div>

              {/* Completeness Score */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Completeness</span>
                  <span className={`font-bold ${getScoreColor(analytics.scores.completeness)}`}>
                    {Math.round(analytics.scores.completeness)}
                  </span>
                </div>
                <Progress value={analytics.scores.completeness} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  Information coverage and gap analysis
                </p>
              </div>

              {/* Source Quality Score */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Source Quality</span>
                  <span className={`font-bold ${getScoreColor(analytics.scores.sourceQuality)}`}>
                    {Math.round(analytics.scores.sourceQuality)}
                  </span>
                </div>
                <Progress value={analytics.scores.sourceQuality} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  Credibility and diversity of sources
                </p>
              </div>

              {/* Optimization Score */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Optimization</span>
                  <span className={`font-bold ${getScoreColor(analytics.scores.optimization)}`}>
                    {Math.round(analytics.scores.optimization)}
                  </span>
                </div>
                <Progress value={analytics.scores.optimization} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  AI search best practices implementation
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Detailed Analysis Tabs */}
        <Tabs defaultValue="insights" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="insights">Insights</TabsTrigger>
            <TabsTrigger value="sources">Source Analysis</TabsTrigger>
            <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
            <TabsTrigger value="platforms">Platform Comparison</TabsTrigger>
          </TabsList>

          {/* Insights Tab */}
          <TabsContent value="insights">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Strengths */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="h-5 w-5" />
                    Strengths
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {analytics.insights.strengths.length > 0 ? (
                    <ul className="space-y-2">
                      {analytics.insights.strengths.map((strength, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-green-600 mt-1">•</span>
                          <span>{strength}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-muted-foreground">No significant strengths identified</p>
                  )}
                </CardContent>
              </Card>

              {/* Weaknesses */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-600">
                    <AlertCircle className="h-5 w-5" />
                    Weaknesses
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {analytics.insights.weaknesses.length > 0 ? (
                    <ul className="space-y-2">
                      {analytics.insights.weaknesses.map((weakness, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-red-600 mt-1">•</span>
                          <span>{weakness}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-muted-foreground">No significant weaknesses identified</p>
                  )}
                </CardContent>
              </Card>

              {/* Opportunities */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-blue-600">
                    <Target className="h-5 w-5" />
                    Opportunities
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {analytics.insights.opportunities.length > 0 ? (
                    <ul className="space-y-2">
                      {analytics.insights.opportunities.map((opportunity, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-blue-600 mt-1">•</span>
                          <span>{opportunity}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-muted-foreground">No significant opportunities identified</p>
                  )}
                </CardContent>
              </Card>

              {/* Threats */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-orange-600">
                    <AlertCircle className="h-5 w-5" />
                    Threats
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {analytics.insights.threats.length > 0 ? (
                    <ul className="space-y-2">
                      {analytics.insights.threats.map((threat, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-orange-600 mt-1">•</span>
                          <span>{threat}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-muted-foreground">No significant threats identified</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Source Analysis Tab */}
          <TabsContent value="sources">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Source Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Source Distribution</CardTitle>
                  <CardDescription>Breakdown by tier and quality</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Tier 1 (Authoritative)</span>
                        <span className="text-sm font-bold text-green-600">
                          {analytics.sourceAnalysis.tier1Sources} sources
                        </span>
                      </div>
                      <Progress 
                        value={(analytics.sourceAnalysis.tier1Sources / analytics.sourceAnalysis.totalSources) * 100} 
                        className="h-2" 
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Wikipedia, major news, academic
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Tier 2 (Reputable)</span>
                        <span className="text-sm font-bold text-yellow-600">
                          {analytics.sourceAnalysis.tier2Sources} sources
                        </span>
                      </div>
                      <Progress 
                        value={(analytics.sourceAnalysis.tier2Sources / analytics.sourceAnalysis.totalSources) * 100} 
                        className="h-2" 
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Industry publications, reputable blogs
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Tier 3 (Basic)</span>
                        <span className="text-sm font-bold text-red-600">
                          {analytics.sourceAnalysis.tier3Sources} sources
                        </span>
                      </div>
                      <Progress 
                        value={(analytics.sourceAnalysis.tier3Sources / analytics.sourceAnalysis.totalSources) * 100} 
                        className="h-2" 
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Press releases, minor sites
                      </p>
                    </div>

                    <div className="pt-4 border-t">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Source Diversity Score</span>
                        <span className="font-bold">{Math.round(analytics.sourceAnalysis.diversityScore)}/100</span>
                      </div>
                      <Progress value={analytics.sourceAnalysis.diversityScore} className="h-2 mt-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Top Domains */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Citing Domains</CardTitle>
                  <CardDescription>Most influential sources</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analytics.sourceAnalysis.topDomains.slice(0, 10).map((domain, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono">{domain.domain}</span>
                          <Badge variant="outline" className="text-xs">
                            Tier {domain.tier}
                          </Badge>
                        </div>
                        <span className="text-sm text-muted-foreground">{domain.count} citations</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Recommendations Tab */}
          <TabsContent value="recommendations">
            <div className="space-y-4">
              {analytics.recommendations.map((rec, i) => (
                <Card key={i}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        {getPriorityIcon(rec.priority)}
                        <div>
                          <CardTitle className="text-lg">{rec.title}</CardTitle>
                          <CardDescription className="mt-1">{rec.description}</CardDescription>
                        </div>
                      </div>
                      <Badge variant="outline" className="capitalize">{rec.priority}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">Category</span>
                        <p className="font-medium">{rec.category}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">Effort</span>
                        <p className="font-medium capitalize">{rec.effort}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">Timeline</span>
                        <p className="font-medium">{rec.timeline}</p>
                      </div>
                    </div>

                    <div className="bg-muted p-4 rounded-lg mb-4">
                      <p className="font-medium mb-2">Expected Impact:</p>
                      <p className="text-sm">{rec.impact}</p>
                    </div>

                    <div>
                      <p className="font-medium mb-2">Specific Actions:</p>
                      <ul className="space-y-2">
                        {rec.specificActions.map((action, j) => (
                          <li key={j} className="flex items-start gap-2 text-sm">
                            <span className="text-primary mt-1">→</span>
                            <span>{action}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Platform Comparison Tab */}
          <TabsContent value="platforms">
            <Card>
              <CardHeader>
                <CardTitle>Platform-by-Platform Comparison</CardTitle>
                <CardDescription>Performance across different AI platforms</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {analytics.platformComparison.map((platform) => (
                    <div key={platform.platform} className="border-b pb-4 last:border-0">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-medium capitalize">{platform.platform}</h3>
                        <Badge>{Math.round(platform.responseQuality)}/100</Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <span className="text-xs text-muted-foreground">Visibility</span>
                          <div className="flex items-center gap-2 mt-1">
                            <Progress value={platform.visibility} className="h-2 flex-1" />
                            <span className="text-sm font-medium">{Math.round(platform.visibility)}</span>
                          </div>
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground">Sentiment</span>
                          <div className="flex items-center gap-2 mt-1">
                            <Progress value={(platform.sentiment + 100) / 2} className="h-2 flex-1" />
                            <span className="text-sm font-medium">{Math.round(platform.sentiment)}</span>
                          </div>
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground">Completeness</span>
                          <div className="flex items-center gap-2 mt-1">
                            <Progress value={platform.completeness} className="h-2 flex-1" />
                            <span className="text-sm font-medium">{Math.round(platform.completeness)}</span>
                          </div>
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground">Sources</span>
                          <p className="text-sm font-medium mt-1">{platform.sourceCount} citations</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
