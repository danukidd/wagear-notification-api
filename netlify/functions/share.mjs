import { getStore } from "@netlify/blobs";
import { v4 as uuidv4 } from "uuid";

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

        // Validate required fields
        if (!body.sourceNumber || !body.campaign || !body.parts || !Array.isArray(body.parts)) {
            return new Response(
                JSON.stringify({ error: "Missing required fields: 'sourceNumber', 'campaign', 'parts'" }),
                { status: 400, headers: corsHeaders() }
            );
        }

        if (body.parts.length === 0) {
            return new Response(
                JSON.stringify({ error: "Parts array must not be empty" }),
                { status: 400, headers: corsHeaders() }
            );
        }

        const shareId = uuidv4();
        const store = getStore("campaign-share");
        const createdItems = [];

        for (let i = 0; i < body.parts.length; i++) {
            const part = body.parts[i];

            if (!part.targetNumber || !part.recipients || !Array.isArray(part.recipients)) {
                return new Response(
                    JSON.stringify({ error: `Invalid part at index ${i}: missing 'targetNumber' or 'recipients'` }),
                    { status: 400, headers: corsHeaders() }
                );
            }

            const itemId = uuidv4();
            const shareItem = {
                id: itemId,
                shareId: shareId,
                sourceNumber: body.sourceNumber,
                targetNumber: part.targetNumber,
                partIndex: i + 1,
                totalParts: body.parts.length,
                status: "pending",
                progress: { sent: 0, total: part.recipients.length },
                campaign: {
                    name: `${body.campaign.name} - Part ${i + 1}/${body.parts.length}`,
                    settings: body.campaign.settings || {},
                    msgs: body.campaign.msgs || [],
                },
                recipients: part.recipients,
                createdAt: new Date().toISOString(),
            };

            await store.setJSON(itemId, shareItem);

            createdItems.push({
                id: itemId,
                partIndex: i + 1,
                targetNumber: part.targetNumber,
                recipientCount: part.recipients.length,
            });
        }

        return new Response(
            JSON.stringify({
                success: true,
                shareId: shareId,
                totalParts: body.parts.length,
                items: createdItems,
                message: "Campaign shared successfully",
            }),
            { status: 200, headers: corsHeaders() }
        );
    } catch (error) {
        return new Response(
            JSON.stringify({ error: "Failed to share campaign", details: error.message }),
            { status: 400, headers: corsHeaders() }
        );
    }
};
