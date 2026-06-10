import Razorpay from 'razorpay';
import 'dotenv/config';

export const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID as string,
  key_secret: process.env.RAZORPAY_KEY_SECRET as string,
});


export const createRazorpayCustomer = async (tenantName: string, tenantId: string) => {
  try {
    const customer = await razorpay.customers.create({
      name: tenantName,
      notes: {
        tenantId: tenantId // Store our DB's Tenant ID inside Razorpay for easy tracking
      }
    });
    return customer.id;
  } catch (error) {
    console.error("Razorpay Customer Creation Error:", error);
    throw new Error("Failed to create Razorpay customer");
  }
};

// 3. Helper to report API usage (Metered Billing via Add-ons)
