// Path: src/components/layout/AppLayout.tsx
import { useEffect, useState } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Bell, User } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AppLayout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('onboarding_completed')
          .eq('id', user.id)
          .single();

        if (error) throw error;
        
        if (!data?.onboarding_completed) {
          navigate('/onboarding', { replace: true });
        } else {
          setIsReady(true);
        }
      } catch (error) {
        console.error("Error checking onboarding status:", error);
        // Fallback: if we can't check, let them proceed but log the error
        setIsReady(true);
      }
    };

    checkOnboardingStatus();
  }, [user, navigate]);

  // While checking, show a loading spinner to prevent flicker
  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  // Once ready, render the full application layout
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm">
            <div className="flex h-full items-center justify-between px-4">
              <div className="flex items-center gap-4">
                <SidebarTrigger className="hover:bg-accent hover:text-accent-foreground transition-smooth" />
                <div className="hidden sm:block">
                  <h1 className="text-lg font-semibold text-foreground">CarbonFlow</h1>
                  <p className="text-sm text-muted-foreground">Smart Carbon Credit Management</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" className="h-9 w-9 p-0"><Bell className="h-4 w-4" /></Button>
                <Button variant="ghost" size="sm" className="h-9 w-9 p-0"><User className="h-4 w-4" /></Button>
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}