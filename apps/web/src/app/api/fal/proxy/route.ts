import { type NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
	const falKey = process.env.FAL_KEY || process.env.NEXT_PUBLIC_FAL_KEY;

	if (!falKey) {
		return NextResponse.json(
			{
				error: "FAL_KEY is not configured",
				message:
					"Please set FAL_KEY in your .env.local file to use cloud AI generation features.",
			},
			{ status: 401 },
		);
	}

	try {
		const targetUrl =
			req.headers.get("x-fal-target-url") ||
			req.nextUrl.searchParams.get("targetUrl") ||
			"https://queue.fal.run";

		const body = await req.json();

		const response = await fetch(targetUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Key ${falKey}`,
			},
			body: JSON.stringify(body),
		});

		const data = await response.json();
		return NextResponse.json(data, { status: response.status });
	} catch (error) {
		console.error("Fal proxy error:", error);
		return NextResponse.json(
			{
				error: "Failed to connect to fal.ai",
				message: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 502 },
		);
	}
}

export async function GET(req: NextRequest) {
	const falKey = process.env.FAL_KEY || process.env.NEXT_PUBLIC_FAL_KEY;

	if (!falKey) {
		return NextResponse.json(
			{ error: "FAL_KEY is not configured" },
			{ status: 401 },
		);
	}

	const targetUrl = req.nextUrl.searchParams.get("url");
	if (!targetUrl) {
		return NextResponse.json(
			{ error: "Missing target url query parameter" },
			{ status: 400 },
		);
	}

	try {
		const response = await fetch(targetUrl, {
			headers: {
				Authorization: `Key ${falKey}`,
			},
		});

		const data = await response.json();
		return NextResponse.json(data, { status: response.status });
	} catch (error) {
		console.error("Fal proxy GET error:", error);
		return NextResponse.json(
			{ error: "Failed to fetch from fal.ai" },
			{ status: 502 },
		);
	}
}
