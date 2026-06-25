interface PaymentResult {
  success: boolean;
  gatewayId?: string;
  pixCode?: string;
  pixQrBase64?: string;
  error?: string;
}

interface PaymentConfig {
  gateway: string;
  credentials: Record<string, any>;
}

export async function createPixPayment(
  config: PaymentConfig,
  amount: number,
  description: string,
  externalRef: string,
): Promise<PaymentResult> {
  switch (config.gateway) {
    case "mercadopago":
      return createMercadoPagoPix(config.credentials, amount, description, externalRef);
    case "asaas":
      return createAsaasPix(config.credentials, amount, description, externalRef);
    case "manual":
      return { success: true, gatewayId: `manual_${externalRef}` };
    default:
      return { success: false, error: `Gateway ${config.gateway} not supported` };
  }
}

async function createMercadoPagoPix(
  creds: Record<string, any>, amount: number, description: string, ref: string,
): Promise<PaymentResult> {
  try {
    const res = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${creds.access_token}`,
      },
      body: JSON.stringify({
        transaction_amount: amount,
        description,
        payment_method_id: "pix",
        external_reference: ref,
        payer: { email: creds.payer_email || "cliente@email.com" },
      }),
    });

    const data = await res.json();
    if (!res.ok) return { success: false, error: data.message };

    return {
      success: true,
      gatewayId: String(data.id),
      pixCode: data.point_of_interaction?.transaction_data?.qr_code,
      pixQrBase64: data.point_of_interaction?.transaction_data?.qr_code_base64,
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

async function createAsaasPix(
  creds: Record<string, any>, amount: number, description: string, ref: string,
): Promise<PaymentResult> {
  const baseUrl = creds.sandbox
    ? "https://sandbox.asaas.com/api/v3"
    : "https://api.asaas.com/v3";

  try {
    // Create or get customer
    const paymentRes = await fetch(`${baseUrl}/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        access_token: creds.api_key,
      },
      body: JSON.stringify({
        billingType: "PIX",
        value: amount,
        description,
        externalReference: ref,
        customer: creds.default_customer_id,
        dueDate: new Date(Date.now() + 30 * 60 * 1000).toISOString().split("T")[0],
      }),
    });

    const payment = await paymentRes.json();
    if (!paymentRes.ok) return { success: false, error: payment.errors?.[0]?.description };

    // Get PIX QR code
    const pixRes = await fetch(`${baseUrl}/payments/${payment.id}/pixQrCode`, {
      headers: { access_token: creds.api_key },
    });
    const pix = await pixRes.json();

    return {
      success: true,
      gatewayId: payment.id,
      pixCode: pix.payload,
      pixQrBase64: pix.encodedImage,
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
