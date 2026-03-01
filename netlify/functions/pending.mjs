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

    if (req.method !== "GET") {
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
        const store = getStore("notification-queue");

        // Get the pending index
        let index = [];
        try {
            const existingIndex = await store.get("_pending_index", { type: "json" });
            if (existingIndex) index = existingIndex;
        } catch (e) {
            // No pending index
        }

        if (index.length === 0) {
            return new Response(
                JSON.stringify({ success: true, messages: [] }),
                { status: 200, headers: corsHeaders() }
            );
        }

        // Fetch all pending messages
        const messages = [];
        const validIndex = [];

        for (const msgId of index) {
            try {
                const msg = await store.get(msgId, { type: "json" });
                if (msg && msg.status === "pending") {
                    messages.push(msg);
                    validIndex.push(msgId);
                }
            } catch (e) {
                // Message was deleted or doesn't exist, skip
            }
        }

        // Clean up index if needed
        if (validIndex.length !== index.length) {
            await store.setJSON("_pending_index", validIndex);
        }

        return new Response(
            JSON.stringify({ success: true, messages }),
            { status: 200, headers: corsHeaders() }
        );
    } catch (error) {
        return new Response(
            JSON.stringify({ error: "Failed to fetch pending messages", details: error.message }),
            { status: 500, headers: corsHeaders() }
        );
    }
};
