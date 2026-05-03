import { getStore } from "@netlify/blobs";

const API_KEY = process.env.DSCE_API_KEY || "dsce-default-key-change-me";

function corsHeaders() {
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, x-api-key",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
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
    if (req.method === "OPTIONS") {
        return new Response("", { status: 204, headers: corsHeaders() });
    }

    if (req.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
            status: 405,
            headers: corsHeaders(),
        });
    }

    const apiKey = req.headers.get("x-api-key");
    if (apiKey !== API_KEY) {
        return unauthorized();
    }

    let body = {};
    try {
        body = await req.json();
    } catch (_) {
        return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
            status: 400,
            headers: corsHeaders(),
        });
    }

    const { id, status } = body;
    if (!id || !status) {
        return new Response(
            JSON.stringify({ error: "Missing required fields: id, status" }),
            { status: 400, headers: corsHeaders() }
        );
    }

    const validStatuses = ["processed", "failed", "inprogress"];
    if (!validStatuses.includes(status)) {
        return new Response(
            JSON.stringify({ error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` }),
            { status: 400, headers: corsHeaders() }
        );
    }

    try {
        const store = getStore("webhook-events");
        const event = await store.get(id, { type: "json" });

        if (!event) {
            return new Response(JSON.stringify({ error: "Event not found" }), {
                status: 404,
                headers: corsHeaders(),
            });
        }

        event.status = status;
        event.processedAt = new Date().toISOString();
        await store.setJSON(id, event);

        return new Response(
            JSON.stringify({ success: true, id, status }),
            { status: 200, headers: corsHeaders() }
        );
    } catch (error) {
        return new Response(
            JSON.stringify({ error: "Failed to update event", details: error.message }),
            { status: 500, headers: corsHeaders() }
        );
    }
};
