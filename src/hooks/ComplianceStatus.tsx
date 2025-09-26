import { Shield, ShieldAlert, ShieldX } from 'lucide-react';
import { useComplianceStatus } from '@/hooks/useComplianceStatus';

/**
 * A helper function to determine which icon and styles to use
 * based on the compliance status level.
 */
const getStatusPresentation = (level: string) => {
  switch (level) {
    case 'compliant':
      return {
        Icon: Shield,
        containerClasses: 'bg-success/10 border-success/20',
        textClasses: 'text-success',
        detailsClasses: 'text-success/80',
      };
    case 'warning':
      return {
        Icon: ShieldAlert,
        containerClasses: 'bg-warning/10 border-warning/20',
        textClasses: 'text-warning',
        detailsClasses: 'text-warning/80',
      };
    case 'danger':
      return {
        Icon: ShieldX,
        containerClasses: 'bg-destructive/10 border-destructive/20',
        textClasses: 'text-destructive',
        detailsClasses: 'text-destructive/80',
      };
    default: // This will be the loading state
      return {
        Icon: Shield,
        containerClasses: 'bg-muted/30 border-border animate-pulse',
        textClasses: 'text-muted-foreground',
        detailsClasses: 'text-muted-foreground/80',
      };
  }
};

/**
 * A dedicated component to display the compliance status.
 * It uses the `useComplianceStatus` hook to get the data and renders the UI.
 */
export function ComplianceStatus() {
  const status = useComplianceStatus();
  const { Icon, containerClasses, textClasses, detailsClasses } = getStatusPresentation(status.level);

  // A simple loading skeleton UI
  if (status.level === 'loading') {
    return (
      <div className={`rounded-lg p-3 ${containerClasses}`}>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 bg-muted rounded-full"></div>
          <div className="h-4 w-20 bg-muted rounded"></div>
        </div>
        <div className="h-3 w-40 bg-muted rounded mt-2"></div>
      </div>
    );
  }

  return (
    <div className={`rounded-lg p-3 ${containerClasses}`}>
      <div className={`flex items-center gap-2 ${textClasses}`}>
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium">{status.message}</span>
      </div>
      <p className={`text-xs mt-1 ${detailsClasses}`}>
        {status.details}
      </p>
    </div>
  );
}