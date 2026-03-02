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
        if (!body.to || !body.message) {
            return new Response(
                JSON.stringify({ error: "Missing required fields: 'to' and 'message'" }),
                { status: 400, headers: corsHeaders() }
            );
        }

        // Normalize phone number (remove +, spaces, dashes)
        let phone = body.to.toString().replace(/[\s\-\+]/g, "");
        if (!phone.includes("@c.us") && !phone.includes("@g.us")) {
            phone = `${phone}@c.us`;
        }

        const msgId = uuidv4();
        const message = {
            id: msgId,
            to: phone,
            message: body.message,
            type: body.type || "text",
            status: "pending",
            createdAt: new Date().toISOString(),
        };

        // Store in Netlify Blobs
        const store = getStore("notification-queue");
        await store.setJSON(msgId, message);

        return new Response(
            JSON.stringify({
                success: true,
                id: msgId,
                message: "Notification queued successfully",
            }),
            { status: 200, headers: corsHeaders() }
        );
    } catch (error) {
        return new Response(
            JSON.stringify({ error: "Invalid request body", details: error.message }),
            { status: 400, headers: corsHeaders() }
        );
    }
};
