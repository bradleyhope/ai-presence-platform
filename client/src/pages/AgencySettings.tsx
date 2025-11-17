import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

export default function AgencySettings() {
  const { isAuthenticated } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const utils = trpc.useUtils();
  const { data: agency, isLoading } = trpc.agency.get.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const updateMutation = trpc.agency.update.useMutation({
    onSuccess: () => {
      utils.agency.get.invalidate();
      toast.success("Settings updated successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update settings");
    },
  });

  const uploadLogoMutation = trpc.agency.uploadLogo.useMutation({
    onSuccess: () => {
      utils.agency.get.invalidate();
      toast.success("Logo uploaded successfully");
      setUploading(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to upload logo");
      setUploading(false);
    },
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }

    setUploading(true);

    // Convert to base64
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Data = event.target?.result as string;
      uploadLogoMutation.mutate({
        fileData: base64Data,
        fileName: file.name,
        mimeType: file.type,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    updateMutation.mutate({
      name: formData.get('name') as string,
      email: formData.get('email') as string,
    });
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Agency Settings</h1>
          <p className="text-muted-foreground mt-2">Manage your agency profile and branding</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading settings...</p>
            </div>
          </div>
        ) : (
          <div className="grid gap-6">
            {/* Logo Section */}
            <Card>
              <CardHeader>
                <CardTitle>Agency Logo</CardTitle>
                <CardDescription>Upload your agency logo for white-label PDF reports</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {agency?.logoUrl && (
                  <div className="flex items-center justify-center p-6 border rounded-lg bg-muted/50">
                    <img
                      src={agency.logoUrl}
                      alt="Agency logo"
                      className="max-h-32 max-w-full object-contain"
                    />
                  </div>
                )}
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {uploading ? "Uploading..." : agency?.logoUrl ? "Change Logo" : "Upload Logo"}
                  </Button>
                  <p className="text-sm text-muted-foreground mt-2">
                    Recommended: PNG or SVG, max 5MB
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Agency Details */}
            <Card>
              <CardHeader>
                <CardTitle>Agency Details</CardTitle>
                <CardDescription>Update your agency information</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Agency Name</Label>
                    <Input
                      id="name"
                      name="name"
                      defaultValue={agency?.name}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Contact Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      defaultValue={agency?.email || ""}
                    />
                  </div>
                  <Button type="submit" disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Plan Information */}
            <Card>
              <CardHeader>
                <CardTitle>Plan Information</CardTitle>
                <CardDescription>Your current subscription details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Plan Tier:</span>
                  <span className="font-medium capitalize">{agency?.planTier}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Max Entities:</span>
                  <span className="font-medium">{agency?.maxEntities}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <span className="font-medium capitalize">{agency?.status}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
