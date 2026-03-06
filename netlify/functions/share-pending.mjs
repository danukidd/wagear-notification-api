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
        const store = getStore("campaign-share");
        const url = new URL(req.url);
        const targetNumber = url.searchParams.get("target");

        const { blobs } = await store.list();
        const items = [];

        for (const blob of blobs) {
            try {
                const item = await store.get(blob.key, { type: "json" });
                if (item && item.status === "pending") {
                    // If target filter is provided, only return items for that target
                    if (targetNumber) {
                        if (item.targetNumber === targetNumber) {
                            items.push(item);
                        }
                    } else {
                        items.push(item);
                    }
                }
            } catch (e) {
                // Item was deleted or corrupted, skip
            }
        }

        // Sort by creation date (oldest first)
        items.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

        return new Response(
            JSON.stringify({ success: true, items }),
            { status: 200, headers: corsHeaders() }
        );
    } catch (error) {
        return new Response(
            JSON.stringify({ error: "Failed to fetch pending shares", details: error.message }),
            { status: 500, headers: corsHeaders() }
        );
    }
};
