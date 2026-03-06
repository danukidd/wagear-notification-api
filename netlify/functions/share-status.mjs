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

    // Validate API key
    const apiKey = req.headers.get("x-api-key");
    if (apiKey !== API_KEY) {
        return unauthorized();
    }

    const store = getStore("campaign-share");

    // POST: Helper reports status update
    if (req.method === "POST") {
        try {
            const body = await req.json();

            if (!body.id || !body.status) {
                return new Response(
                    JSON.stringify({ error: "Missing required fields: 'id' and 'status'" }),
                    { status: 400, headers: corsHeaders() }
                );
            }

            const item = await store.get(body.id, { type: "json" });
            if (!item) {
                return new Response(
                    JSON.stringify({ error: "Share item not found" }),
                    { status: 404, headers: corsHeaders() }
                );
            }

            item.campaignStatus = body.status; // "Draft", "Running", "Completed", "Failed", etc.
            if (body.progress) {
                item.progress = body.progress; // { sent: 5, total: 10 }
            }
            item.statusUpdatedAt = new Date().toISOString();
            await store.setJSON(body.id, item);

            return new Response(
                JSON.stringify({ success: true, message: "Status updated" }),
                { status: 200, headers: corsHeaders() }
            );
        } catch (error) {
            return new Response(
                JSON.stringify({ error: "Failed to update status", details: error.message }),
                { status: 400, headers: corsHeaders() }
            );
        }
    }

    // GET: Sharer polls status of all parts for a given shareId
    if (req.method === "GET") {
        try {
            const url = new URL(req.url);
            const shareId = url.searchParams.get("shareId");

            if (!shareId) {
                return new Response(
                    JSON.stringify({ error: "Missing query parameter: 'shareId'" }),
                    { status: 400, headers: corsHeaders() }
                );
            }

            const { blobs } = await store.list();
            const parts = [];

            for (const blob of blobs) {
                try {
                    const item = await store.get(blob.key, { type: "json" });
                    if (item && item.shareId === shareId) {
                        parts.push({
                            id: item.id,
                            partIndex: item.partIndex,
                            targetNumber: item.targetNumber,
                            status: item.status,
                            campaignStatus: item.campaignStatus || null,
                            progress: item.progress || { sent: 0, total: 0 },
                            statusUpdatedAt: item.statusUpdatedAt || null,
                        });
                    }
                } catch (e) {
                    // Skip corrupted items
                }
            }

            parts.sort((a, b) => a.partIndex - b.partIndex);

            return new Response(
                JSON.stringify({ success: true, shareId, parts }),
                { status: 200, headers: corsHeaders() }
            );
        } catch (error) {
            return new Response(
                JSON.stringify({ error: "Failed to fetch share status", details: error.message }),
                { status: 500, headers: corsHeaders() }
            );
        }
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: corsHeaders(),
    });
};
