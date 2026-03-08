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

        if (!body.shareId) {
            return new Response(
                JSON.stringify({ error: "Missing required field: 'shareId'" }),
                { status: 400, headers: corsHeaders() }
            );
        }

        const store = getStore("campaign-share");
        const { blobs } = await store.list();

        let reclaimedRecipients = [];
        let deletedParts = 0;

        for (const blob of blobs) {
            try {
                const item = await store.get(blob.key, { type: "json" });
                if (item && item.shareId === body.shareId) {
                    // Collect recipients to return back to the sharer
                    if (item.recipients && Array.isArray(item.recipients)) {
                        reclaimedRecipients = reclaimedRecipients.concat(item.recipients);
                    }

                    // Delete the blob
                    await store.delete(blob.key);
                    deletedParts++;
                }
            } catch (e) {
                console.error("Error processing blob for revocation", blob.key, e);
            }
        }

        return new Response(
            JSON.stringify({
                success: true,
                message: "Share revoked successfully",
                deletedParts: deletedParts,
                recipients: reclaimedRecipients
            }),
            { status: 200, headers: corsHeaders() }
        );
    } catch (error) {
        return new Response(
            JSON.stringify({ error: "Failed to revoke share", details: error.message }),
            { status: 500, headers: corsHeaders() }
        );
    }
};
