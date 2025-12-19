const ENABLE_CORS = true;

const ALLOWLIST = [
    "http://192.168.0.20:3000",
    "https://classchartspro.qzz.io"
];

export default {
    async fetch(request) {
        const url = new URL(request.url);
        const origin = request.headers.get("origin") || "None-Provided";

        // ---- CORS GATE ----
        if (ENABLE_CORS) {
            if (!ALLOWLIST.includes(origin)) {
                return new Response(
                    JSON.stringify({
                        error: "Oops! Origin not allowed",
                        details: "This worker has not whitelisted your origin!",
                        moreInfo: "https://classchartspro.qzz.io/api-help",
                        yourOrigin: origin,
                    }),
                    {
                        status: 403,
                        headers: { "Content-Type": "application/json" }
                    }
                );
            }
        }

        // Shared CORS headers (browser MUST receive these)
        const corsHeaders = {
            "Access-Control-Allow-Origin": origin || "*",
            "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
            "Access-Control-Allow-Headers": "*"
        };

        // Preflight
        if (request.method === "OPTIONS") {
            return new Response(null, {
                status: 200,
                headers: corsHeaders
            });
        }

        if (url.pathname === "/login") {
            return handleLogin(request, corsHeaders);
        }

        if (url.pathname === "/ping") {
            return pong(origin);
        }

        return handleProxy(request, corsHeaders);
    }
};

async function pong(origin) {
    return new Response(
        JSON.stringify({
            pong: true,
            you: origin
        }),
        {
            status: 200,
            headers: {
                "Content-Type": "application/json"
            }
        }
    );
}

/* ---------------- LOGIN ---------------- */

async function handleLogin(req, corsHeaders) {
    if (req.method !== "POST") {
        return new Response(
            JSON.stringify({ error: "Method not allowed" }),
            {
                status: 405,
                headers: {
                    ...corsHeaders,
                    "Content-Type": "application/json"
                }
            }
        );
    }

    try {
        const body = await req.text();

        const res = await fetch(
            "https://www.classcharts.com/apiv2student/login",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                body
            }
        );

        return new Response(await res.text(), {
            status: res.status,
            headers: {
                ...corsHeaders,
                "Content-Type": "application/json"
            }
        });

    } catch (err) {
        return new Response(
            JSON.stringify({ error: String(err) }),
            {
                status: 500,
                headers: {
                    ...corsHeaders,
                    "Content-Type": "application/json"
                }
            }
        );
    }
}

/* ---------------- PROXY ---------------- */

async function handleProxy(request, corsHeaders) {
    const url = new URL(request.url);
    const target = url.searchParams.get("url");

    if (!target) {
        return new Response(
            JSON.stringify({ error: "Missing ?url=" }),
            {
                status: 400,
                headers: {
                    ...corsHeaders,
                    "Content-Type": "application/json"
                }
            }
        );
    }

    const headers = new Headers();
    for (const [k, v] of request.headers.entries()) {
        if (k !== "host" && k !== "origin") {
            headers.set(k, v);
        }
    }

    const body =
        request.method !== "GET" && request.method !== "HEAD"
            ? await request.text()
            : undefined;

    const res = await fetch(target, {
        method: request.method,
        headers,
        body
    });

    return new Response(await res.text(), {
        status: res.status,
        headers: {
            ...corsHeaders,
            "Content-Type": res.headers.get("Content-Type") || "text/plain"
        }
    });
}
