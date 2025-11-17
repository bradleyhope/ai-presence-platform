import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, Clock, Plus, Search, XCircle, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

export default function Audits() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedEntityId, setSelectedEntityId] = useState<string>("");
  const [queryText, setQueryText] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["chatgpt", "perplexity", "gemini", "claude", "grok"]);

  const utils = trpc.useUtils();
  const { data: audits, isLoading } = trpc.audits.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const { data: entities } = trpc.entities.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const createMutation = trpc.audits.create.useMutation({
    onSuccess: async (data) => {
      // Execute queries immediately
      try {
        await executeMutation.mutateAsync({ auditId: data.id });
        utils.audits.list.invalidate();
        setIsCreateDialogOpen(false);
        setSelectedEntityId("");
        setQueryText("");
        toast.success("Audit created and queries started");
        setLocation(`/audits/${data.id}`);
      } catch (error: any) {
        toast.error("Audit created but failed to start queries");
      }
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create audit");
    },
  });

  const executeMutation = trpc.audits.executeQueries.useMutation();

  const deleteMutation = trpc.audits.delete.useMutation({
    onSuccess: () => {
      utils.audits.list.invalidate();
      toast.success("Audit deleted successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete audit");
    },
  });

  const handleDelete = (e: React.MouseEvent, auditId: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this audit? This action cannot be undone.")) {
      deleteMutation.mutate({ id: auditId });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEntityId || !queryText || selectedPlatforms.length === 0) {
      toast.error("Please fill in all required fields");
      return;
    }

    const entity = entities?.find((e) => e.id === Number(selectedEntityId));
    if (!entity) {
      toast.error("Entity not found");
      return;
    }

    // Transform user's query intent into natural, entity-specific questions
    const userIntent = queryText.trim();
    let mainQuery: string;

    // If user already wrote a complete question, use it
    if (userIntent.includes(entity.name) || userIntent.includes("?")) {
      mainQuery = userIntent;
    } else {
      // Transform intent into natural question
      if (entity.entityType === "person") {
        mainQuery = `Who is ${entity.name}? ${userIntent}`;
      } else {
        mainQuery = `What is ${entity.name}? ${userIntent}`;
      }
    }

    const queries = [mainQuery];

    createMutation.mutate({
      entityId: Number(selectedEntityId),
      queries,
      platforms: selectedPlatforms as ("chatgpt" | "perplexity" | "gemini" | "claude" | "grok")[],
    });
  };

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform]
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "running":
        return <Clock className="h-4 w-4 text-blue-600 animate-spin" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Audits</h1>
            <p className="text-muted-foreground mt-2">AI presence audits across multiple platforms</p>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)} disabled={!entities || entities.length === 0}>
            <Plus className="mr-2 h-4 w-4" />
            New Audit
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading audits...</p>
            </div>
          </div>
        ) : audits && audits.length > 0 ? (
          <div className="space-y-4">
            {audits.map((audit) => {
              const entity = entities?.find((e) => e.id === audit.entityId);
              return (
                <Link key={audit.id} href={`/audits/${audit.id}`}>
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {getStatusIcon(audit.status)}
                          <div>
                            <CardTitle className="text-lg">Audit #{audit.id}</CardTitle>
                            <CardDescription>{entity?.name || "Unknown Entity"}</CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(audit.status)}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => handleDelete(e, audit.id)}
                            disabled={deleteMutation.isPending}
                            className="hover:bg-destructive hover:text-destructive-foreground"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-4">
                          <span className="text-muted-foreground">
                            {audit.completedQueries}/{audit.totalQueries} queries completed
                          </span>
                          <span className="text-muted-foreground capitalize">{audit.auditType}</span>
                        </div>
                        <span className="text-muted-foreground">{new Date(audit.createdAt).toLocaleString()}</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Search className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No audits yet</h3>
              <p className="text-sm text-muted-foreground text-center mb-4">
                Run your first AI presence audit to see how your clients appear across platforms
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)} disabled={!entities || entities.length === 0}>
                <Plus className="mr-2 h-4 w-4" />
                New Audit
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Create New Audit</DialogTitle>
              <DialogDescription>Run an AI presence audit across multiple platforms</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="entity">Entity *</Label>
                <Select value={selectedEntityId} onValueChange={setSelectedEntityId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an entity" />
                  </SelectTrigger>
                  <SelectContent>
                    {entities?.map((entity) => (
                      <SelectItem key={entity.id} value={entity.id.toString()}>
                        {entity.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="query">Primary Query *</Label>
                <Input
                  id="query"
                  placeholder="e.g., Who is John Smith?"
                  value={queryText}
                  onChange={(e) => setQueryText(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Additional queries will be generated automatically based on the entity name
                </p>
              </div>

              <div className="space-y-2">
                <Label>Platforms * (Select at least one)</Label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: "chatgpt", label: "ChatGPT" },
                    { id: "perplexity", label: "Perplexity" },
                    { id: "gemini", label: "Google Gemini" },
                    { id: "claude", label: "Anthropic Claude" },
                    { id: "grok", label: "Grok (xAI)" },
                  ].map((platform) => (
                    <div key={platform.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={platform.id}
                        checked={selectedPlatforms.includes(platform.id)}
                        onCheckedChange={() => togglePlatform(platform.id)}
                      />
                      <Label htmlFor={platform.id} className="cursor-pointer">
                        {platform.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending || executeMutation.isPending}>
                {createMutation.isPending || executeMutation.isPending ? "Creating..." : "Create & Run Audit"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
