import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BroadcastRequest {
  message: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user is admin
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { message }: BroadcastRequest = await req.json();

    if (!message || message.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Message is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Save the broadcast message to system_messages table for in-app display
    const { error: insertError } = await supabase
      .from("system_messages")
      .insert({
        content: message,
        is_broadcast: true,
        recipient_id: null, // null means it's for everyone
        is_read: false,
      });

    if (insertError) {
      console.error("Error saving broadcast message:", insertError);
    } else {
      console.log("Broadcast message saved to system_messages");
    }

    // Get all users who have email notifications enabled
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError) throw usersError;

    // Get profiles with email_notifications enabled
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, name, email_notifications")
      .eq("email_notifications", true);

    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        sent: 0,
        saved: true,
        message: "Broadcast saved. No users with email notifications enabled." 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const profileIds = new Set(profiles.map(p => p.id));
    const emailPromises = [];

    for (const authUser of users.users) {
      if (profileIds.has(authUser.id) && authUser.email) {
        emailPromises.push(
          resend.emails.send({
            from: "DateWise <onboarding@resend.dev>",
            to: [authUser.email],
            subject: "Update from DateWise",
            html: `
              <h1>DateWise Update</h1>
              <p>${message.replace(/\n/g, '<br>')}</p>
              <br>
              <p>Best regards,<br>The DateWise Team</p>
              <hr>
              <p style="font-size: 12px; color: #666;">
                You received this email because you have email notifications enabled. 
                You can change this in your settings.
              </p>
            `,
          })
        );
      }
    }

    const results = await Promise.allSettled(emailPromises);
    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const failCount = results.filter(r => r.status === 'rejected').length;

    console.log(`Broadcast sent: ${successCount} successful, ${failCount} failed`);

    return new Response(JSON.stringify({ 
      success: true, 
      sent: successCount,
      failed: failCount 
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Error in send-broadcast-email:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
