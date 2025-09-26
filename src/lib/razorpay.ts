// Razorpay Configuration for CarbonFlow
import Razorpay from 'razorpay';

// Environment configuration
export const RAZORPAY_CONFIG = {
  // Using your configured Razorpay test keys
  KEY_ID: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_RM6DorrRQ16RYj',
  KEY_SECRET: import.meta.env.VITE_RAZORPAY_KEY_SECRET || '7WqchUaeJjipFtJkYe8Br8di',
  
  // Razorpay script URL
  SCRIPT_URL: 'https://checkout.razorpay.com/v1/checkout.js',
  
  // Default currency
  CURRENCY: 'INR',
  
  // Company details
  COMPANY_NAME: 'CarbonFlow',
  COMPANY_LOGO: '/logo.png', // Adjust path as needed
  
  // Theme configuration
  THEME_COLOR: 'hsl(158, 64%, 20%)', // Your primary green color
};

// Server-side Razorpay instance (for order creation and verification)
let razorpayInstance: Razorpay | null = null;

export const getRazorpayInstance = (): Razorpay => {
  if (!razorpayInstance) {
    razorpayInstance = new Razorpay({
      key_id: RAZORPAY_CONFIG.KEY_ID,
      key_secret: RAZORPAY_CONFIG.KEY_SECRET,
    });
  }
  return razorpayInstance;
};

// Load Razorpay script dynamically
export const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    // Check if Razorpay is already loaded
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.src = RAZORPAY_CONFIG.SCRIPT_URL;
    script.onload = () => {
      resolve(true);
    };
    script.onerror = () => {
      resolve(false);
    };
    document.body.appendChild(script);
  });
};

// Generate receipt ID for orders
export const generateReceiptId = (prefix: string = 'CF'): string => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `${prefix}_${timestamp}_${random}`;
};

// Convert amount to paise (Razorpay requires amount in smallest currency unit)
export const convertToPaise = (amount: number): number => {
  return Math.round(amount * 100);
};

// Convert paise back to rupees
export const convertToRupees = (paise: number): number => {
  return paise / 100;
};