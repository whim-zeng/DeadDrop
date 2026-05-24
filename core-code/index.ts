// Supabase Edge Function: replies
// Create and list replies for notes with nesting support

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

interface CreateReplyRequest {
  content?: string;
  voiceKey?: string;
  parentId?: string | null;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const pathParts = url.pathname.split("/");
  const noteId = pathParts[pathParts.length - 1];

  if (!noteId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(noteId)) {
    return new Response(JSON.stringify({ error: "Invalid note ID" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // GET: List replies
  if (req.method === "GET") {
    try {
      const { data: replies, error } = await supabase
        .from("replies")
        .select(`
          id,
          content,
          voice_url,
          voice_duration,
          parent_id,
          created_at,
          is_read,
          author:author_id (
            anonymous_code,
            nickname,
            avatar_gradient
          )
        `)
        .eq("note_id", noteId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Organize into threaded structure
      const threaded = organizeReplies(replies || []);

      return new Response(JSON.stringify({ replies: threaded }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error listing replies:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  }

  // POST: Create reply
  if (req.method === "POST") {
    try {
      const body: CreateReplyRequest = await req.json();
      const { content, voiceKey, parentId } = body;

      // Auth validation
      const authHeader = req.headers.get("authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Authentication required" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
      if (authError || !user) {
        return new Response(JSON.stringify({ error: "Invalid authentication" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Validate note exists and is readable
      const { data: note, error: noteError } = await supabase
        .from("notes")
        .select("id, author_id, archived_at, expires_at, moderation_status")
        .eq("id", noteId)
        .single();

      if (noteError || !note) {
        return new Response(JSON.stringify({ error: "Note not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (note.archived_at || (note.expires_at && new Date(note.expires_at) < new Date()) || note.moderation_status === "rejected") {
        return new Response(JSON.stringify({ error: "Note is no longer available" }), {
          status: 410,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Validate content
      if ((!content || content.length === 0) && !voiceKey) {
        return new Response(JSON.stringify({ error: "Content or voice required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (content && content.length > 300) {
        return new Response(JSON.stringify({ error: "Content must be 300 characters or less" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Validate parent_id nesting depth (max 2 levels)
      if (parentId) {
        const { data: parentReply } = await supabase
          .from("replies")
          .select("parent_id")
          .eq("id", parentId)
          .single();

        if (!parentReply) {
          return new Response(JSON.stringify({ error: "Parent reply not found" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (parentReply.parent_id !== null) {
          return new Response(JSON.stringify({ error: "Maximum nesting depth is 2 levels" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      // Build voice URL if provided
      let voiceUrl: string | null = null;
      let voiceDuration: number | null = null;
      if (voiceKey) {
        voiceUrl = `${supabaseUrl}/storage/v1/object/public/voice-replies/${voiceKey}`;
      }

      // Insert reply
      const { data: reply, error: insertError } = await supabase
        .from("replies")
        .insert({
          note_id: noteId,
          parent_id: parentId || null,
          author_id: user.id,
          content: content || "",
          voice_url: voiceUrl,
          voice_duration: voiceDuration,
        })
        .select(`
          id,
          content,
          voice_url,
          voice_duration,
          parent_id,
          created_at,
          author:author_id (
            anonymous_code,
            nickname,
            avatar_gradient
          )
        `)
        .single();

      if (insertError) {
        console.error("Insert reply error:", insertError);
        return new Response(JSON.stringify({ error: "Failed to create reply" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Broadcast via Realtime
      await supabase.channel(`note:${noteId}`).send({
        type: 'broadcast',
        event: 'new_reply',
        payload: {
          reply_id: reply.id,
          note_id: noteId,
          parent_id: parentId,
          author: reply.author,
        },
      });

      return new Response(JSON.stringify(reply), {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error creating reply:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error", details: (error as Error).message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  }

  return new Response(JSON.stringify({ error: "Method not allowed" }), {
    status: 405,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

// Organize flat replies into threaded structure
function organizeReplies(replies: any[]): any[] {
  const map = new Map<string, any>();
  const roots: any[] = [];

  // First pass: create map entries
  for (const reply of replies) {
    map.set(reply.id, { ...reply, children: [] });
  }

  // Second pass: build tree
  for (const reply of replies) {
    const node = map.get(reply.id)!;
    if (reply.parent_id && map.has(reply.parent_id)) {
      const parent = map.get(reply.parent_id)!;
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}
