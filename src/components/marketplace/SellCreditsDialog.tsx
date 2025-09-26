import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

interface SellCreditsDialogProps {
  creditBalance: number
  onSell: (quantity: number) => Promise<void>
  loading: boolean
}

export function SellCreditsDialog({ creditBalance, onSell, loading }: SellCreditsDialogProps) {
  const [open, setOpen] = useState(false)
  const [quantity, setQuantity] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setQuantity('')
    setError(null)
  }

  const validate = (value: number) => {
    if (Number.isNaN(value) || value <= 0) return 'Enter a positive number.'
    if (value > creditBalance) return 'Quantity exceeds available balance.'
    return null
  }

  const handleSubmit = async () => {
    const value = Number(quantity)
    const validationError = validate(value)
    if (validationError) {
      setError(validationError)
      return
    }
    setError(null)
    await onSell(value)
    if (!loading) {
      setOpen(false)
      reset()
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset() }}>
      <DialogTrigger asChild>
        <Button>
          Sell Credits
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sell Carbon Credits</DialogTitle>
          <DialogDescription>
            You currently have {creditBalance} credits available.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="quantity">Quantity</Label>
          <Input
            id="quantity"
            type="number"
            min={1}
            max={creditBalance}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="Enter number of credits"
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Listing…' : 'Create Sell Listing'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}


