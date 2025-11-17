import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Building2, Globe, User } from "lucide-react";
import { Link, useParams } from "wouter";

export default function EntityDetail() {
  const { id } = useParams();
  const { isAuthenticated } = useAuth();

  const { data: entity, isLoading } = trpc.entities.getById.useQuery(
    { id: Number(id) },
    { enabled: isAuthenticated && !!id }
  );

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading entity...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!entity) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-full">
          <h2 className="text-2xl font-bold mb-4">Entity not found</h2>
          <Button asChild>
            <Link href="/entities">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Entities
            </Link>
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/entities">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{entity.name}</h1>
            <p className="text-muted-foreground mt-1 capitalize">{entity.entityType}</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Entity Information</CardTitle>
              <CardDescription>Basic details about this entity</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                {entity.entityType === "person" ? (
                  <User className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                )}
                <div>
                  <p className="text-sm font-medium">Type</p>
                  <p className="text-sm text-muted-foreground capitalize">{entity.entityType}</p>
                </div>
              </div>

              {entity.industry && (
                <div>
                  <p className="text-sm font-medium">Industry</p>
                  <p className="text-sm text-muted-foreground">{entity.industry}</p>
                </div>
              )}

              {entity.website && (
                <div className="flex items-center space-x-2">
                  <Globe className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Website</p>
                    <a
                      href={entity.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      {entity.website}
                    </a>
                  </div>
                </div>
              )}

              {entity.description && (
                <div>
                  <p className="text-sm font-medium mb-1">Description</p>
                  <p className="text-sm text-muted-foreground">{entity.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Monitoring Status</CardTitle>
              <CardDescription>Current monitoring configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium">Status</p>
                {entity.monitoringEnabled ? (
                  <p className="text-sm text-green-600 dark:text-green-400">Active</p>
                ) : (
                  <p className="text-sm text-muted-foreground">Inactive</p>
                )}
              </div>

              {entity.monitoringEnabled && (
                <>
                  <div>
                    <p className="text-sm font-medium">Frequency</p>
                    <p className="text-sm text-muted-foreground capitalize">{entity.monitoringFrequency}</p>
                  </div>

                  {entity.lastAuditAt && (
                    <div>
                      <p className="text-sm font-medium">Last Audit</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(entity.lastAuditAt).toLocaleString()}
                      </p>
                    </div>
                  )}

                  {entity.nextAuditAt && (
                    <div>
                      <p className="text-sm font-medium">Next Audit</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(entity.nextAuditAt).toLocaleString()}
                      </p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks for this entity</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button asChild>
              <Link href="/audits">Run New Audit</Link>
            </Button>
            <Button variant="outline">Edit Entity</Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
