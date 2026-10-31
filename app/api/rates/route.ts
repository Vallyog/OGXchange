import { connection } from "next/server";
import {
  MARKET_RATE_DISCOUNT_PERCENT,
  marketAssets,
  type MarketRate,
} from "@/lib/market-assets";

const ratesUrl = new URL("https://api.coingecko.com/api/v3/simple/price");

ratesUrl.searchParams.set(
  "ids",
  marketAssets.map((asset) => asset.providerId).join(","),
);
ratesUrl.searchParams.set("vs_currencies", "ngn");
ratesUrl.searchParams.set("include_24hr_change", "true");

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function GET() {
  await connection();

  try {
    const response = await fetch(ratesUrl, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      throw new Error(`Market data provider returned ${response.status}`);
    }

    const payload: unknown = await response.json();

    if (!isRecord(payload)) {
      throw new Error("Market data provider returned an invalid response");
    }

    const rates = marketAssets.map((asset): MarketRate => {
      const quote = payload[asset.providerId];

      if (!isRecord(quote)) {
        throw new Error(`Market data is missing for ${asset.symbol}`);
      }

      const priceNgn = quote.ngn;
      const change24h = quote.ngn_24h_change;

      if (typeof priceNgn !== "number" || !Number.isFinite(priceNgn) || priceNgn <= 0) {
        throw new Error(`Market data is invalid for ${asset.symbol}`);
      }

      return {
        symbol: asset.symbol,
        name: asset.name,
        mark: asset.mark,
        tone: asset.tone,
        priceNgn: priceNgn * (1 - MARKET_RATE_DISCOUNT_PERCENT / 100),
        change24h:
          typeof change24h === "number" && Number.isFinite(change24h)
            ? change24h
            : null,
      };
    });

    return Response.json({
      rates,
      updatedAt: new Date().toISOString(),
      source: "CoinGecko",
    });
  } catch (error) {
    console.error("Unable to load NGN market rates:", error);

    return Response.json(
      { error: "Live rates are temporarily unavailable. Please try again." },
      { status: 502 },
    );
  }
}
