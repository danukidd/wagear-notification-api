import { getStore } from "@netlify/blobs";
import { v4 as uuidv4 } from "uuid";

function corsHeaders() {
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Content-Type": "application/json",
    };
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

    // Get source key from query param (set by netlify.toml redirect)
    const url = new URL(req.url);
    const sourceKey = url.searchParams.get("key");

    if (!sourceKey) {
        return new Response(JSON.stringify({ error: "Missing source key" }), {
            status: 400,
            headers: corsHeaders(),
        });
    }

    let payload = {};
    try {
        const text = await req.text();
        if (text) payload = JSON.parse(text);
    } catch (_) {
        // accept empty or non-JSON body
    }

    const eventId = uuidv4();
    const event = {
        id: eventId,
        sourceKey,
        payload,
        status: "pending",
        receivedAt: new Date().toISOString(),
    };

    try {
        const store = getStore("webhook-events");
        await store.setJSON(eventId, event);

        return new Response(
            JSON.stringify({ success: true, id: eventId, sourceKey }),
            { status: 200, headers: corsHeaders() }
        );
    } catch (error) {
        return new Response(
            JSON.stringify({ error: "Failed to store event", details: error.message }),
            { status: 500, headers: corsHeaders() }
        );
    }
};
