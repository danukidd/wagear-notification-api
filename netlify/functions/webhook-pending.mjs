import { getStore } from "@netlify/blobs";

const API_KEY = process.env.DSCE_API_KEY || "dsce-default-key-change-me";

function corsHeaders() {
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, x-api-key",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
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

    if (req.method !== "GET") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
            status: 405,
            headers: corsHeaders(),
        });
    }

    const apiKey = req.headers.get("x-api-key");
    if (apiKey !== API_KEY) {
        return unauthorized();
    }

    try {
        const store = getStore("webhook-events");
        const url = new URL(req.url);
        const filterKey = url.searchParams.get("key"); // optional filter by sourceKey

        const list = await store.list();
        const pendingEvents = [];

        for (const entry of list.blobs) {
            const event = await store.get(entry.key, { type: "json" });
            if (!event) continue;
            if (event.status !== "pending") continue;
            if (filterKey && event.sourceKey !== filterKey) continue;
            pendingEvents.push(event);
        }

        return new Response(
            JSON.stringify({ success: true, events: pendingEvents }),
            { status: 200, headers: corsHeaders() }
        );
    } catch (error) {
        return new Response(
            JSON.stringify({ error: "Failed to retrieve events", details: error.message }),
            { status: 500, headers: corsHeaders() }
        );
    }
};
