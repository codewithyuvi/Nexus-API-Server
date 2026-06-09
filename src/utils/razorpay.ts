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
export const reportUsageToRazorpay = async (subscriptionId: string, usageCount: number) => {
  try {
    // If they made 0 API calls this hour, don't bother Razorpay
    if (usageCount <= 0) return;

    // We will charge 1 Paisa (0.01 INR) per API request as an example.
    const amountInPaise = usageCount * 1; 

    // Razorpay allows you to push an "Add-on" to a subscription
    await razorpay.subscriptions.createAddon(subscriptionId, {
      item: {
        name: "Hourly API Usage",
        amount: amountInPaise,
        currency: "INR"
      },
      quantity: 1 
    });
    
    console.log(`Billed ${usageCount} API requests to Razorpay sub: ${subscriptionId}`);
  } catch (error) {
    console.error("Razorpay Usage Report Error:", error);
    throw new Error("Failed to report usage to Razorpay");
  }
};