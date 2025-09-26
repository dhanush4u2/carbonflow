import { useUserWallet } from '@/hooks/useUserWallet'; // Using the correct, consolidated hook
import { Skeleton } from '@/components/ui/skeleton';

/**
 * A redesigned component to display a more polished and personalized greeting.
 */
export function DashboardHeroGreeting() {
  const { profile, loading } = useUserWallet();

  // A cleaner, more concise subtext for a tidier look.
  const getSubtext = () => {
    return `Here's your real-time carbon overview for today. Let's make a difference.`;
  };

  // The loading state with updated skeleton sizes to match the new text.
  if (loading) {
    return (
      <div className="text-white">
        <Skeleton className="h-8 w-60 mb-2 bg-white/20" />
        <Skeleton className="h-4 w-80 bg-white/20" />
      </div>
    );
  }

  // A fallback for the industry name to ensure a greeting is always shown.
  const industryName = profile?.industry_name || 'Welcome';

  return (
    <div className="text-white">
      {/* Smaller font size for a more refined and professional look. */}
      <h1 
        className="text-2xl lg:text-3xl font-bold mb-2"
        style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
      >
        Hey, {industryName}!
      </h1>
      {/* Adjusted font size and opacity for better visual hierarchy. */}
      <p 
        className="text-base opacity-90"
        style={{ textShadow: '0 1px 4px rgba(0,0,0,0.2)' }}
      >
        {getSubtext()}
      </p>
    </div>
  );
}

