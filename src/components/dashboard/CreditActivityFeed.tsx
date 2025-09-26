import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Clock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTransactions, Transaction } from "@/hooks/useTransactions";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";

// A simple utility to format time nicely (e.g., "1 hour ago")
function formatRelativeTime(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.round((now.getTime() - date.getTime()) / 1000);
  const minutes = Math.round(seconds / 60);
  const hours = Math.round(minutes / 60);
  const days = Math.round(hours / 24);

  if (seconds < 60) return `${seconds}s ago`;
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

// A completely redesigned component for rendering a single transaction row.
function TransactionRow({ tx, user }: { tx: Transaction, user: any }) {
  const isBuy = tx.buyer_id === user?.id;
  const typeText = isBuy ? 'Bought' : 'Sold';
  const counterparty = isBuy ? tx.seller_industry_name : tx.buyer_industry_name;
  const Icon = isBuy ? TrendingUp : TrendingDown;
  const color = isBuy ? 'text-amber-500' : 'text-green-500'; // Using more distinct colors

  return (
    <div className="flex flex-col space-y-2 rounded-lg bg-accent/50 p-4 border border-border/50">
      <div className="flex items-center justify-between">
        <div className={cn("flex items-center gap-2 font-semibold", color)}>
          <Icon className="h-4 w-4" />
          <span>{typeText} {tx.credits} Credits</span>
        </div>
        <Badge variant="outline" className="bg-success/10 text-success border-success/20 font-medium text-xs">
            Completed
        </Badge>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{isBuy ? "From" : "To"} {counterparty}</p>
          <p className="text-xs text-muted-foreground">{formatRelativeTime(tx.created_at)}</p>
        </div>
        <div className="text-right">
          <p className="font-bold text-lg text-foreground">₹{tx.amount.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground -mt-1">Total Amount</p>
        </div>
      </div>
    </div>
  );
}

interface CreditActivityFeedProps {
  className?: string;
}

export function CreditActivityFeed({ className }: CreditActivityFeedProps) {
  const { user } = useAuth();
  const { transactions, loading, error } = useTransactions();

  return (
    <Card className={cn("shadow-none", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Recent Activity
        </CardTitle>
        <CardDescription>
          Your latest transactions.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
          </div>
        ) : error ? (
           <div className="flex items-center justify-center h-[240px] text-center text-destructive">
              <div>
                <AlertCircle className="mx-auto h-8 w-8 mb-2" />
                <p>{error}</p>
              </div>
            </div>
        ) : transactions.length === 0 ? (
           <div className="flex items-center justify-center h-[240px] text-center text-muted-foreground">
             <div>
                <Clock className="mx-auto h-8 w-8 mb-2" />
                <p>No transaction history found.</p>
             </div>
            </div>
        ) : (
          <div className="space-y-4">
            {transactions.map((tx) => (
              <TransactionRow key={tx.id} tx={tx} user={user} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

