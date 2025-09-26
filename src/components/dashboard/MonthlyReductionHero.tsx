import { useMonthlyReduction } from '@/hooks/useMonthlyReduction';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';

/**
 * A component to display the current month's emissions reduction
 * in the dashboard hero section.
 */
export function MonthlyReductionHero() {
  const { reductionData, loading } = useMonthlyReduction();

  if (loading) {
    return (
      <div className="text-right text-white">
        <Skeleton className="h-5 w-36 mb-2 bg-white/20" />
        <Skeleton className="h-7 w-20 mb-2 bg-white/20" />
        <Skeleton className="h-5 w-28 bg-white/20" />
      </div>
    );
  }

  const getStatusInfo = () => {
    if (reductionData?.status === 'decrease') {
      return {
        text: 'Current Month Reduction',
        icon: <TrendingDown className="inline-block h-5 w-5 mr-1" />,
        color: 'text-success',
      };
    }
    if (reductionData?.status === 'increase') {
      return {
        text: 'Current Month Increase',
        icon: <TrendingUp className="inline-block h-5 w-5 mr-1" />,
        color: 'text-warning',
      };
    }
    return {
      text: 'Monthly Change',
      icon: <Minus className="inline-block h-5 w-5 mr-1" />,
      color: 'text-white',
    };
  };

  const { text, icon, color } = getStatusInfo();

  return (
    <div className="text-right text-white">
      <div className="text-sm opacity-75">{text}</div>
      <div className={`text-2xl font-bold ${color}`}>
        {icon}
        {reductionData?.percentageChange.toFixed(1) || '0.0'}%
      </div>
      <div className="text-sm opacity-75">vs. last month</div>
    </div>
  );
}

