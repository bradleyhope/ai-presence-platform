import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { AlertCircle, TrendingUp, TrendingDown, Minus, ExternalLink, Lightbulb, AlertTriangle, Info } from "lucide-react";
import { useParams, Link } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";

export default function AuditInsights() {
  const { isAuthenticated } = useAuth();
  const params = useParams();
  const auditId = Number(params.id);

  const { data: audit } = trpc.audits.get.useQuery({ id: auditId }, { enabled: isAuthenticated && !!auditId });
  const { data: entity } = trpc.entities.get.useQuery({ id: audit?.entityId || 0 }, { enabled: !!audit?.entityId });
  const { data: changes } = trpc.monitoring.detectChanges.useQuery(
    { entityId: audit?.entityId || 0, auditId },
    { enabled: !!audit?.entityId }
  );
  const { data: sources } = trpc.monitoring.analyzeSources.useQuery({ auditId }, { enabled: !!auditId });
  const { data: recommendations } = trpc.monitoring.getRecommendations.useQuery(
    { entityId: audit?.entityId || 0, auditId },
    { enabled: !!audit?.entityId }
  );

  if (!audit || !entity) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading insights...</p>
        </div>
      </DashboardLayout>
    );
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "destructive";
      case "medium":
        return "default";
      case "low":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getChangeIcon = (changeType: string) => {
    switch (changeType) {
      case "major":
        return <TrendingUp className="h-4 w-4 text-destructive" />;
      case "moderate":
        return <Minus className="h-4 w-4 text-yellow-500" />;
      case "minor":
        return <TrendingDown className="h-4 w-4 text-green-500" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Audit Insights</h1>
            <p className="text-muted-foreground mt-1">
              Intelligence and recommendations for {entity.name}
            </p>
          </div>
          <Link href={`/audits/${auditId}`}>
            <Button variant="outline">View Full Audit</Button>
          </Link>
        </div>

        <Tabs defaultValue="changes" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="changes">Change Detection</TabsTrigger>
            <TabsTrigger value="sources">Source Analysis</TabsTrigger>
            <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          </TabsList>

          {/* Change Detection Tab */}
          <TabsContent value="changes" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Changes from Previous Audit</CardTitle>
                <CardDescription>
                  {changes?.isFirstAudit
                    ? "This is the first audit for this entity"
                    : `Comparing with audit from ${new Date(changes?.previousAuditDate || "").toLocaleDateString()}`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {changes?.isFirstAudit ? (
                  <div className="text-center py-8">
                    <Info className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      Run another audit to see how AI responses change over time
                    </p>
                  </div>
                ) : changes?.changes && changes.changes.length > 0 ? (
                  <div className="space-y-4">
                    {changes.changes.map((change: any) => (
                      <div key={change.platform} className="flex items-start gap-4 p-4 border rounded-lg">
                        <div className="mt-1">{getChangeIcon(change.changeType)}</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold capitalize">{change.platform}</h3>
                            <Badge variant={change.changeType === "major" ? "destructive" : "secondary"}>
                              {change.changeType} change
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <p>Similarity: {(change.similarity * 100).toFixed(1)}%</p>
                            <p>
                              Length: {change.previousLength} → {change.currentLength} chars
                              {change.lengthChange > 0 ? (
                                <span className="text-green-600"> (+{change.lengthChange})</span>
                              ) : (
                                <span className="text-red-600"> ({change.lengthChange})</span>
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No significant changes detected</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Source Analysis Tab */}
          <TabsContent value="sources" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Source Intelligence</CardTitle>
                <CardDescription>
                  Websites and sources influencing AI responses ({sources?.totalSources || 0} unique sources found)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {sources && sources.sources.length > 0 ? (
                  <div className="space-y-3">
                    {sources.topSources.map((source: any, idx: number) => (
                      <div key={source.domain} className="flex items-start gap-4 p-4 border rounded-lg">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold">
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold truncate">{source.domain}</h3>
                            <a
                              href={source.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2 truncate">{source.title}</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-muted-foreground">
                              Cited {source.count} time{source.count > 1 ? "s" : ""}
                            </span>
                            <div className="flex gap-1">
                              {source.platforms.map((platform: string) => (
                                <Badge key={platform} variant="outline" className="text-xs">
                                  {platform}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No sources found in AI responses</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      This may indicate limited online presence or AI platforms not providing citations
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Recommendations Tab */}
          <TabsContent value="recommendations" className="space-y-4">
            {recommendations && recommendations.recommendations.length > 0 ? (
              recommendations.recommendations.map((rec: any, idx: number) => (
                <Card key={idx}>
                  <CardHeader>
                    <div className="flex items-start gap-4">
                      <div className="mt-1">
                        {rec.priority === "high" ? (
                          <AlertTriangle className="h-6 w-6 text-destructive" />
                        ) : (
                          <Lightbulb className="h-6 w-6 text-yellow-500" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <CardTitle>{rec.title}</CardTitle>
                          <Badge variant={getPriorityColor(rec.priority)}>{rec.priority} priority</Badge>
                        </div>
                        <CardDescription>{rec.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <h4 className="font-semibold mb-3">Recommended Actions:</h4>
                    <ul className="space-y-2">
                      {rec.actions.map((action: string, actionIdx: number) => (
                        <li key={actionIdx} className="flex items-start gap-2">
                          <span className="text-primary mt-1">•</span>
                          <span className="flex-1">{action}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <Lightbulb className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No recommendations at this time</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Your AI presence appears to be in good shape!
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
