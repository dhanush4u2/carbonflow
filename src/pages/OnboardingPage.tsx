// Path: src/pages/OnboardingPage.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Leaf, Zap, Droplets, Trash2, Fuel, Truck, Package, Plane, Factory, Loader2, ArrowRight, ArrowLeft } from 'lucide-react';

const FormInput = ({ id, label, icon: Icon, unit, value, onChange, placeholder = "e.g., 5000", type = "number" }) => (
    <div className="space-y-2">
        <Label htmlFor={id} className="flex items-center gap-2 text-muted-foreground"><Icon className="h-4 w-4" />{label}</Label>
        <div className="flex items-center gap-2">
            <Input id={id} type={type} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} required />
            <span className="text-sm text-muted-foreground whitespace-nowrap">{unit}</span>
        </div>
    </div>
);

const initialFormData = {
    electricityKwh: '', fuelLiters: '', waterLiters: '', wasteKg: '',
    rawMaterialTons: '', transportKm: '', flightsPerYear: '', productionUnits: ''
};

export function OnboardingPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState(initialFormData);

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) {
            toast({ title: "Auth Error", variant: "destructive" });
            return;
        }

        setLoading(true);
        try {
            const numericData = Object.entries(formData).reduce((acc, [key, value]) => {
                acc[key] = Number(value) || 0;
                return acc;
            }, {});

            // **THE FIX:** Send a clean, flat object with only the raw data.
            // All calculations now happen on the backend.
            const { data, error } = await supabase.functions.invoke('calculate-initial-credits', {
                body: { userId: user.id, ...numericData },
            });

            if (error) throw error;

            toast({
                title: "Onboarding Complete!",
                description: `You've been credited with ${data.initialCredits} carbon credits.`,
                duration: 5000,
            });
            navigate('/');
        } catch (err: any) {
            toast({ title: "Submission Failed", description: err.message || "Could not process your data.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const renderStep = () => { /* ... step rendering logic remains the same ... */ 
        switch (step) {
            case 1:
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormInput id="electricity" label="Monthly Electricity Usage" icon={Zap} unit="kWh" value={formData.electricityKwh} onChange={val => handleInputChange('electricityKwh', val)} />
                        <FormInput id="fuel" label="Monthly Fuel Consumption" icon={Fuel} unit="Liters" value={formData.fuelLiters} onChange={val => handleInputChange('fuelLiters', val)} />
                    </div>
                );
            case 2:
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormInput id="water" label="Monthly Water Usage" icon={Droplets} unit="Liters" value={formData.waterLiters} onChange={val => handleInputChange('waterLiters', val)} />
                        <FormInput id="waste" label="Monthly Solid Waste" icon={Trash2} unit="kg" value={formData.wasteKg} onChange={val => handleInputChange('wasteKg', val)} />
                        <FormInput id="rawMaterial" label="Monthly Raw Material" icon={Factory} unit="Tons" value={formData.rawMaterialTons} onChange={val => handleInputChange('rawMaterialTons', val)} />
                    </div>
                );
            case 3:
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormInput id="transport" label="Monthly Logistics Travel" icon={Truck} unit="km" value={formData.transportKm} onChange={val => handleInputChange('transportKm', val)} />
                        <FormInput id="flights" label="Annual Business Flights" icon={Plane} unit="flights" value={formData.flightsPerYear} onChange={val => handleInputChange('flightsPerYear', val)} />
                        <FormInput id="production" label="Monthly Production Output" icon={Package} unit="units" value={formData.productionUnits} onChange={val => handleInputChange('productionUnits', val)} />
                    </div>
                );
            default: return null;
        }
    };

    const titles = ["Energy & Fuel", "Resources & Waste", "Logistics & Production"];

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
            <Card className="w-full max-w-3xl border-border/50 shadow-lg animate-in fade-in-50">
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="text-2xl">Welcome to CarbonFlow</CardTitle>
                            <CardDescription>Step {step} of 3: {titles[step - 1]}</CardDescription>
                        </div>
                        <Leaf className="h-8 w-8 text-primary" />
                    </div>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-8">
                        {renderStep()}
                        <div className="flex justify-between items-center pt-4">
                            <Button type="button" variant="outline" onClick={() => setStep(s => s - 1)} disabled={step === 1 || loading}>
                                <ArrowLeft className="h-4 w-4 mr-2" /> Previous
                            </Button>
                            {step < 3 ? (
                                <Button type="button" onClick={() => setStep(s => s + 1)} disabled={loading}>
                                    Next <ArrowRight className="h-4 w-4 ml-2" />
                                </Button>
                            ) : (
                                <Button type="submit" disabled={loading}>
                                    {loading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analyzing...</>) : "Complete Onboarding"}
                                </Button>
                            )}
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}