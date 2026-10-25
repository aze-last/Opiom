import { type NextRequest, NextResponse } from "next/server";

interface LlmProxyRequestBody {
	baseUrl: string;
	apiKey?: string;
	endpoint: string; // e.g. "/models" or "/chat/completions"
	method?: "GET" | "POST";
	body?: unknown;
}

export async function POST(req: NextRequest) {
	try {
		const json = (await req.json()) as LlmProxyRequestBody;
		const { baseUrl, apiKey, endpoint, method, body } = json;

		if (!baseUrl) {
			return NextResponse.json(
				{ error: "baseUrl is required" },
				{ status: 400 },
			);
		}

		const sanitizedBase = baseUrl.trim().replace(/\/+$/, "");
		const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
		const targetUrl = `${sanitizedBase}${cleanEndpoint}`;

		const headers: Record<string, string> = {
			"Content-Type": "application/json",
			Accept: "application/json",
		};

		if (apiKey) {
			headers.Authorization = `Bearer ${apiKey.trim()}`;
		}

		const httpMethod = method || (body ? "POST" : "GET");

		const upstreamResponse = await fetch(targetUrl, {
			method: httpMethod,
			headers,
			body: body ? JSON.stringify(body) : undefined,
		});

		const contentType = upstreamResponse.headers.get("content-type") || "";
		if (contentType.includes("application/json")) {
			const data = await upstreamResponse.json();
			return NextResponse.json(data, { status: upstreamResponse.status });
		}

		const text = await upstreamResponse.text();
		return new NextResponse(text, {
			status: upstreamResponse.status,
			headers: { "Content-Type": contentType || "text/plain" },
		});
	} catch (error) {
		console.error("LLM proxy error:", error);
		return NextResponse.json(
			{
				error: "Failed to connect to upstream LLM service",
				message: error instanceof Error ? error.message : "Network error",
			},
			{ status: 502 },
		);
	}
}
