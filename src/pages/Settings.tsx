import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Settings as SettingsIcon, Building, User, Bell, Shield, Loader2 } from "lucide-react";
import { useUserWallet } from "@/hooks/useUserWallet";
import { useSettings } from "@/hooks/useSettings";
import { useAuth } from "@/contexts/AuthContext"; // 1. Import the useAuth hook

export function Settings() {
  const { user } = useAuth(); // 2. Get the user object from the Auth context
  const { profile, loading: profileLoading, refetch } = useUserWallet();
  const { industryName, setIndustryName, updateProfile, loading: updateLoading } = useSettings(profile?.industry_name);

  useEffect(() => {
    if (profile) {
      setIndustryName(profile.industry_name || '');
    }
  }, [profile, setIndustryName]);

  const handleUpdate = async () => {
    await updateProfile();
    refetch();
  };

  return (
    <div className="flex-1 space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">
          Manage your industry profile and platform preferences
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Industry Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5 text-primary" />
              Industry Profile
            </CardTitle>
            <CardDescription>
              Update your industry information and registration details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {profileLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-32" />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="industry-name">Industry Name</Label>
                  <Input 
                    id="industry-name" 
                    value={industryName}
                    onChange={(e) => setIndustryName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="registration-id">Registration ID</Label>
                  <Input id="registration-id" value="KSPCB/2020/12345" disabled />
                </div>
                <Button onClick={handleUpdate} disabled={updateLoading}>
                  {updateLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Update Profile
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* User Management (Static for now) */}
        <Card>
           <CardHeader>
             <CardTitle className="flex items-center gap-2">
               <User className="h-5 w-5 text-primary" />
               User Account
             </CardTitle>
             <CardDescription>
               Manage your personal account settings
             </CardDescription>
           </CardHeader>
           <CardContent className="space-y-4">
              {profileLoading ? (
                 <div className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                 </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    {/* 3. The user.email property will now be correctly recognized */}
                    <Input id="email" type="email" value={user?.email || ''} disabled />
                  </div>
                   <div className="space-y-2">
                     <Label>Role</Label>
                     <Input value="Environment Manager" disabled />
                   </div>
                </>
              )}
           </CardContent>
        </Card>
      </div>
    </div>
  )
}

