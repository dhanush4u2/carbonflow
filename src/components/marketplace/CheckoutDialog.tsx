import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
  } from "@/components/ui/dialog";
  import { Button } from "@/components/ui/button";
  import { Separator } from "@/components/ui/separator";
  import { TradeListing } from "@/hooks/useTradeListings";
  
  // Define the structure for the checkout calculation
  interface CheckoutDetails {
    subtotal: number;
    commission: number;
    gst: number;
    total: number;
  }
  
  interface CheckoutDialogProps {
    listing: TradeListing | null;
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (listing: TradeListing) => void;
    loading: boolean;
  }
  
  export function CheckoutDialog({ listing, isOpen, onClose, onConfirm, loading }: CheckoutDialogProps) {
    if (!listing) return null;
  
    // Calculate all costs associated with the purchase
    const calculateCheckout = (): CheckoutDetails => {
      const subtotal = listing.total_amount;
      const commission = subtotal * 0.02; // CarbonFlow's 2% commission
      const gst = (subtotal + commission) * 0.12; // 12% GST on subtotal + commission
      const total = subtotal + commission + gst;
      return { subtotal, commission, gst, total };
    };
  
    const details = calculateCheckout();
  
    const handleConfirm = () => {
      onConfirm(listing);
    };
  
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Purchase</DialogTitle>
            <DialogDescription>
              Review the transaction details below before confirming your purchase.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Seller</span>
              <span className="font-medium">{listing.industry_name}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Credits to Purchase</span>
              <span className="font-medium">{listing.no_of_credits.toLocaleString()}</span>
            </div>
            <Separator />
            <div className="space-y-2 text-sm">
               <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>₹{details.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
               <div className="flex justify-between">
                <span className="text-muted-foreground">CarbonFlow Commission (2%)</span>
                <span>₹{details.commission.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
               <div className="flex justify-between">
                <span className="text-muted-foreground">GST (12%)</span>
                <span>₹{details.gst.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
            <Separator />
             <div className="flex justify-between text-lg font-bold">
              <span>Total Payable</span>
              <span>₹{details.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
            <Button onClick={handleConfirm} disabled={loading}>
              {loading ? "Processing..." : "Confirm & Pay"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
  