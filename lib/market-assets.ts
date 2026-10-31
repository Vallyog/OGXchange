export const MARKET_RATE_DISCOUNT_PERCENT = 3.33;

export const marketAssets = [
  {
    symbol: "BTC",
    name: "Bitcoin",
    mark: "₿",
    tone: "orange",
    providerId: "bitcoin",
  },
  {
    symbol: "ETH",
    name: "Ethereum",
    mark: "◆",
    tone: "blue",
    providerId: "ethereum",
  },
  {
    symbol: "USDT",
    name: "Tether",
    mark: "₮",
    tone: "green",
    providerId: "tether",
  },
] as const;

export type MarketAsset = (typeof marketAssets)[number];

export type MarketRate = {
  symbol: MarketAsset["symbol"];
  name: MarketAsset["name"];
  mark: MarketAsset["mark"];
  tone: MarketAsset["tone"];
  priceNgn: number;
  change24h: number | null;
};

export type MarketRatesResponse = {
  rates: MarketRate[];
  updatedAt: string;
  source: string;
};
