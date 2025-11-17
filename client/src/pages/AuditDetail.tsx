import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, CheckCircle2, Clock, ExternalLink, XCircle } from "lucide-react";
import { Link, useParams } from "wouter";

export default function AuditDetail() {
  const { id } = useParams();
  const { isAuthenticated } = useAuth();

  const { data: audit, isLoading } = trpc.audits.getById.useQuery(
    { id: Number(id) },
    { 
      enabled: isAuthenticated && !!id, 
      refetchInterval: (query) => {
        const data = query.state.data;
        return data?.status === "running" ? 2000 : false;
      }
    }
  );

  const { data: analysis } = trpc.audits.getAnalysis.useQuery(
    { auditId: Number(id) },
    { enabled: isAuthenticated && !!id && audit?.status === "completed" }
  );

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading audit...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!audit) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-full">
          <h2 className="text-2xl font-bold mb-4">Audit not found</h2>
          <Button asChild>
            <Link href="/audits">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Audits
            </Link>
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case "running":
        return <Clock className="h-5 w-5 text-blue-600 animate-spin" />;
      case "failed":
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      completed: "default",
      running: "secondary",
      failed: "destructive",
      pending: "outline",
    };
    return (
      <Badge variant={variants[status] || "outline"} className="capitalize">
        {status}
      </Badge>
    );
  };

  const queriesByPlatform = audit.queries?.reduce((acc, query) => {
    if (!acc[query.platform]) {
      acc[query.platform] = [];
    }
    acc[query.platform].push(query);
    return acc;
  }, {} as Record<string, typeof audit.queries>);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/audits">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex-1">
            <div className="flex items-center space-x-3">
              {getStatusIcon(audit.status)}
              <h1 className="text-3xl font-bold tracking-tight">Audit #{audit.id}</h1>
              {getStatusBadge(audit.status)}
            </div>
            <p className="text-muted-foreground mt-1">
              Created {new Date(audit.createdAt).toLocaleString()}
            </p>
          </div>
          {audit.status === "completed" && (
            <Button asChild>
              <Link href={`/audits/${id}/insights`}>View Insights</Link>
            </Button>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {audit.completedQueries}/{audit.totalQueries}
              </div>
              <p className="text-sm text-muted-foreground">Queries completed</p>
              <div className="mt-2 w-full bg-secondary rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${(audit.completedQueries / audit.totalQueries) * 100}%` }}
                />
              </div>
            </CardContent>
          </Card>

          {analysis && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Success Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analysis.successRate.toFixed(1)}%</div>
                  <p className="text-sm text-muted-foreground">
                    {analysis.completedQueries} successful, {analysis.failedQueries} failed
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Unique Sources</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analysis.uniqueSources}</div>
                  <p className="text-sm text-muted-foreground">Sources cited across all platforms</p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Query Results</CardTitle>
            <CardDescription>Responses from each AI platform</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={Object.keys(queriesByPlatform || {})[0]} className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="chatgpt">ChatGPT</TabsTrigger>
                <TabsTrigger value="perplexity">Perplexity</TabsTrigger>
                <TabsTrigger value="gemini">Gemini</TabsTrigger>
                <TabsTrigger value="claude">Claude</TabsTrigger>
                <TabsTrigger value="grok">Grok</TabsTrigger>
              </TabsList>

              {Object.entries(queriesByPlatform || {}).map(([platform, queries]) => (
                <TabsContent key={platform} value={platform} className="space-y-4">
                  {queries.map((query) => (
                    <Card key={query.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">{query.queryText}</CardTitle>
                          {getStatusBadge(query.status)}
                        </div>
                      </CardHeader>
                      <CardContent>
                        {query.status === "completed" && query.responseText && (
                          <div className="space-y-4">
                            <div>
                              <p className="text-sm font-medium mb-2">Response:</p>
                              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                {query.responseText}
                              </p>
                            </div>

                            {query.citations && JSON.parse(query.citations).length > 0 && (
                              <div>
                                <p className="text-sm font-medium mb-2">Citations:</p>
                                <div className="space-y-1">
                                  {JSON.parse(query.citations).map((citation: any, idx: number) => (
                                    <a
                                      key={idx}
                                      href={citation.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center text-sm text-primary hover:underline"
                                    >
                                      <ExternalLink className="h-3 w-3 mr-1" />
                                      {citation.title || citation.url}
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {query.status === "failed" && (
                          <p className="text-sm text-destructive">{query.errorMessage || "Query failed"}</p>
                        )}

                        {query.status === "running" && (
                          <p className="text-sm text-muted-foreground">Query is running...</p>
                        )}

                        {query.status === "pending" && (
                          <p className="text-sm text-muted-foreground">Query is pending...</p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
