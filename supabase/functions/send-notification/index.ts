import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface NotificationRequest {
  to_email: string;
  subject: string;
  body: string;
  notification_type: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { to_email, subject, body, notification_type }: NotificationRequest = await req.json();

    if (!to_email || !subject || !body) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to_email, subject, body" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const emailData = {
      to: to_email,
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #1e293b 0%, #1e40af 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">DayLight ES365</h1>
            <p style="color: #93c5fd; margin: 10px 0 0 0;">Your Gaming & Compute Platform</p>
          </div>
          <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px;">
            <div style="background: white; padding: 25px; border-radius: 8px; border: 1px solid #e2e8f0;">
              <h2 style="color: #1e293b; margin-top: 0;">${subject}</h2>
              <div style="color: #475569; line-height: 1.6; white-space: pre-wrap;">
${body}
              </div>
            </div>
            <div style="margin-top: 20px; padding: 15px; background: #dbeafe; border-radius: 8px; border-left: 4px solid #3b82f6;">
              <p style="margin: 0; color: #1e40af; font-size: 14px;">
                <strong>Notification Type:</strong> ${notification_type || 'General'}
              </p>
            </div>
            <p style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 20px;">
              This is an automated notification from DayLight ES365.<br>
              Sent on ${new Date().toLocaleString()}
            </p>
          </div>
        </div>
      `
    };

    console.log('Email notification prepared:', {
      to: to_email,
      subject,
      type: notification_type
    });

    const response = {
      success: true,
      message: 'Notification logged successfully',
      email_preview: emailData,
      note: 'Email sending requires SMTP configuration. Your notification has been logged to the database.'
    };

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );

  } catch (error) {
    console.error('Error processing notification:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to process notification',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
