import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Wallet, CreditCard, IndianRupee, Plus, ArrowUpRight } from 'lucide-react';
import { useDirectRazorpay } from '@/hooks/useDirectRazorpay';
import { useToast } from '@/hooks/use-toast';

interface WalletTopUpProps {
  currentBalance: number;
  onTopUpSuccess?: () => void;
}

export function WalletTopUp({ currentBalance, onTopUpSuccess }: WalletTopUpProps) {
  const [amount, setAmount] = useState('');
  const { initiatePayment, isLoading } = useDirectRazorpay();
  const { toast } = useToast();

  // Preset amounts for quick selection
  const presetAmounts = [1000, 2500, 5000, 10000, 25000, 50000];

  const handleTopUp = async (topUpAmount: number) => {
    try {
      if (topUpAmount < 100) {
        toast({
          title: "Invalid Amount",
          description: "Minimum top-up amount is ₹100",
          variant: "destructive",
        });
        return;
      }

      console.log('🚀 Starting wallet top-up for amount:', topUpAmount);

      toast({
        title: "Processing Payment",
        description: "Redirecting to Razorpay payment gateway...",
      });

      await initiatePayment({
        amount: topUpAmount,
        description: `Wallet Top-up - Add ₹${topUpAmount.toLocaleString()} to CarbonFlow Wallet`,
        notes: {
          type: 'wallet_topup',
          amount: topUpAmount,
          current_balance: currentBalance,
        }
      });

      // Payment initiation successful - Razorpay modal should open
      console.log('💳 Payment gateway should be opening...');
      
      toast({
        title: "Payment Gateway Opened",
        description: "Complete the payment in the Razorpay window to add funds.",
      });
      setAmount('');
    } catch (err: any) {
      console.error('❌ Top-up error:', err);
      toast({
        title: "Top-up Failed",
        description: err.message || "There was an issue processing your payment.",
        variant: "destructive",
      });
    }
  };

  const handleCustomTopUp = () => {
    const customAmount = parseFloat(amount);
    if (isNaN(customAmount) || customAmount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }
    handleTopUp(customAmount);
  };

  return (
    <Dialog>
      {/* Compact Trigger Card */}
      <DialogTrigger asChild>
        <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/50 dark:to-pink-950/50 cursor-pointer hover:shadow-xl transition-all duration-300 group select-none">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-pink-500/5" />
          <CardContent className="relative p-6 select-none">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-purple-100 dark:bg-purple-900/50 group-hover:bg-purple-200 dark:group-hover:bg-purple-800/70 transition-colors">
                  <CreditCard className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    Wallet Top-Up
                    <ArrowUpRight className="h-4 w-4 text-purple-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Add funds securely
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-slate-600 dark:text-slate-400">Quick access</div>
                <p className="text-xs font-medium text-purple-600 dark:text-purple-400 mt-1">
                  Click to add funds
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </DialogTrigger>

      {/* Professional Top-Up Modal */}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="p-2 rounded-lg bg-primary/10">
              <CreditCard className="h-6 w-6 text-primary" />
            </div>
            Wallet Top-Up
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Current Balance Display */}
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 p-4 rounded-xl border border-emerald-200/50 dark:border-emerald-800/50">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Current Balance</span>
              <div className="flex items-center gap-2">
                <IndianRupee className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                  {currentBalance.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Top-up Buttons */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-slate-900 dark:text-slate-100">
              Quick Top-up
            </Label>
            <div className="grid grid-cols-2 gap-3">
              {presetAmounts.map((presetAmount) => (
                <Button
                  key={presetAmount}
                  variant="outline"
                  onClick={() => handleTopUp(presetAmount)}
                  disabled={isLoading}
                  className="h-12 text-sm font-medium hover:bg-primary/5 hover:border-primary/30 transition-all duration-200"
                >
                  ₹{presetAmount >= 1000 ? `${presetAmount/1000}k` : presetAmount}
                </Button>
              ))}
            </div>
          </div>

          {/* Custom Amount Section */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-slate-900 dark:text-slate-100">
              Custom Amount
            </Label>
            <div className="flex gap-3">
              <div className="flex-1">
                <Input
                  id="custom-amount"
                  type="number"
                  placeholder="Enter amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min="100"
                  step="100"
                  className="h-12 text-base"
                />
              </div>
              <Button 
                onClick={handleCustomTopUp} 
                disabled={isLoading || !amount}
                className="h-12 px-6 bg-primary hover:bg-primary/90"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Funds
              </Button>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Minimum: ₹100
            </p>
          </div>

          {/* Payment Security Info */}
          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded bg-green-100 dark:bg-green-900/30">
                <CreditCard className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <span className="text-sm text-slate-700 dark:text-slate-300">
                Secure payment via Razorpay
              </span>
            </div>
            <Badge variant="outline" className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400">
              SSL Secured
            </Badge>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
              <div className="text-blue-700 dark:text-blue-300 font-medium">
                Processing payment...
              </div>
              <div className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                Please complete the payment in the Razorpay window
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}