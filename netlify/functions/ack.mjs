import { getStore } from "@netlify/blobs";

const API_KEY = process.env.DSCE_API_KEY || "dsce-default-key-change-me";

function corsHeaders() {
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, x-api-key",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Content-Type": "application/json",
    };
}

function unauthorized() {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders(),
    });
}

export default async (req, context) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("", { status: 204, headers: corsHeaders() });
    }

    if (req.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
            status: 405,
            headers: corsHeaders(),
        });
    }

    // Validate API key
    const apiKey = req.headers.get("x-api-key");
    if (apiKey !== API_KEY) {
        return unauthorized();
    }

    try {
        const body = await req.json();

        if (!body.id || !body.status) {
            return new Response(
                JSON.stringify({ error: "Missing required fields: 'id' and 'status'" }),
                { status: 400, headers: corsHeaders() }
            );
        }

        const store = getStore("notification-queue");

        // Update message status
        const msg = await store.get(body.id, { type: "json" });
        if (!msg) {
            return new Response(
                JSON.stringify({ error: "Message not found" }),
                { status: 404, headers: corsHeaders() }
            );
        }

        msg.status = body.status; // "sent" or "failed"
        msg.updatedAt = new Date().toISOString();
        if (body.error) msg.error = body.error;
        await store.setJSON(body.id, msg);

        // Remove from pending index
        try {
            let index = await store.get("_pending_index", { type: "json" });
            if (index) {
                index = index.filter((id) => id !== body.id);
                await store.setJSON("_pending_index", index);
            }
        } catch (e) {
            // Index issue, not critical
        }

        return new Response(
            JSON.stringify({ success: true, message: "Message acknowledged" }),
            { status: 200, headers: corsHeaders() }
        );
    } catch (error) {
        return new Response(
            JSON.stringify({ error: "Failed to acknowledge message", details: error.message }),
            { status: 400, headers: corsHeaders() }
        );
    }
};
