import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Activity, FileText, Search, Users } from "lucide-react";
import { Link } from "wouter";

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const { data: entities } = trpc.entities.list.useQuery(undefined, { enabled: isAuthenticated });
  const { data: audits } = trpc.audits.list.useQuery(undefined, { enabled: isAuthenticated });
  const { data: reports } = trpc.reports.list.useQuery(undefined, { enabled: isAuthenticated });

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">AI Presence Platform</CardTitle>
            <CardDescription>Monitor and optimize your AI search presence</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Track how your clients appear across ChatGPT, Perplexity, Gemini, and Claude
            </p>
            <Button asChild className="w-full" size="lg">
              <a href={getLoginUrl()}>Sign In to Continue</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stats = [
    {
      title: "Total Entities",
      value: entities?.length || 0,
      icon: Users,
      description: "Clients being monitored",
      link: "/entities",
    },
    {
      title: "Audits Run",
      value: audits?.length || 0,
      icon: Search,
      description: "AI presence audits completed",
      link: "/audits",
    },
    {
      title: "Reports Generated",
      value: reports?.length || 0,
      icon: FileText,
      description: "PDF reports available",
      link: "/reports",
    },
    {
      title: "Active Monitoring",
      value: entities?.filter((e) => e.monitoringEnabled).length || 0,
      icon: Activity,
      description: "Entities with monitoring enabled",
      link: "/entities",
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Welcome back! Here's an overview of your AI presence monitoring.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Link key={stat.title} href={stat.link}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  <stat.icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Get started with common tasks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href="/entities">
                  <Users className="mr-2 h-4 w-4" />
                  Manage Entities
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href="/audits">
                  <Search className="mr-2 h-4 w-4" />
                  View Audits
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href="/reports">
                  <FileText className="mr-2 h-4 w-4" />
                  Download Reports
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest audits and updates</CardDescription>
            </CardHeader>
            <CardContent>
              {audits && audits.length > 0 ? (
                <div className="space-y-2">
                  {audits.slice(0, 5).map((audit) => (
                    <Link key={audit.id} href={`/audits/${audit.id}`}>
                      <div className="flex items-center justify-between p-2 hover:bg-accent rounded-md cursor-pointer">
                        <div className="flex items-center space-x-2">
                          <Search className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">Audit #{audit.id}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(audit.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No recent activity</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
