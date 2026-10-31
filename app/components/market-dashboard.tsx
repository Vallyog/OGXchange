"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  marketAssets,
  type MarketRatesResponse,
} from "@/lib/market-assets";

const nairaFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 2,
});

const numberFormatter = new Intl.NumberFormat("en-NG", {
  maximumFractionDigits: 2,
});

function formatNaira(value: number) {
  return nairaFormatter.format(value);
}

function formatCrypto(value: number, symbol: string) {
  const maximumFractionDigits =
    symbol === "BTC" ? 8 : symbol === "ETH" ? 6 : 2;
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits }).format(value)} ${symbol}`;
}

function isMarketRatesResponse(value: unknown): value is MarketRatesResponse {
  if (
    typeof value !== "object" ||
    value === null ||
    !("rates" in value) ||
    !("updatedAt" in value) ||
    !("source" in value) ||
    !Array.isArray(value.rates) ||
    typeof value.updatedAt !== "string" ||
    typeof value.source !== "string"
  ) {
    return false;
  }

  return value.rates.every(
    (rate) =>
      typeof rate === "object" &&
      rate !== null &&
      "symbol" in rate &&
      "name" in rate &&
      "mark" in rate &&
      "tone" in rate &&
      "priceNgn" in rate &&
      "change24h" in rate &&
      typeof rate.symbol === "string" &&
      typeof rate.name === "string" &&
      typeof rate.mark === "string" &&
      typeof rate.tone === "string" &&
      typeof rate.priceNgn === "number" &&
      Number.isFinite(rate.priceNgn) &&
      (rate.change24h === null ||
        (typeof rate.change24h === "number" &&
          Number.isFinite(rate.change24h))),
  );
}

function isMarketAssetSymbol(
  value: string,
): value is (typeof marketAssets)[number]["symbol"] {
  return marketAssets.some((asset) => asset.symbol === value);
}

export default function MarketDashboard() {
  const [market, setMarket] = useState<MarketRatesResponse | null>(null);
  const [amount, setAmount] = useState("1");
  const [conversionDirection, setConversionDirection] = useState<
    "crypto-to-naira" | "naira-to-crypto"
  >("crypto-to-naira");
  const [selectedSymbol, setSelectedSymbol] =
    useState<(typeof marketAssets)[number]["symbol"]>("BTC");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");

  const refreshRates = useCallback(async () => {
    setIsRefreshing(true);

    try {
      const response = await fetch("/api/rates", { cache: "no-store" });
      const result: unknown = await response.json();

      if (!response.ok) {
        const message =
          typeof result === "object" &&
          result !== null &&
          "error" in result &&
          typeof result.error === "string"
            ? result.error
            : "Unable to load live rates. Please try again.";
        throw new Error(message);
      }

      if (!isMarketRatesResponse(result)) {
        throw new Error("The market data response was invalid. Please try again.");
      }

      setMarket(result);
      setError("");
    } catch (refreshError) {
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : "Unable to load live rates. Please try again.",
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const initialRefreshId = window.setTimeout(() => void refreshRates(), 0);
    const intervalId = window.setInterval(() => void refreshRates(), 60_000);

    return () => {
      window.clearTimeout(initialRefreshId);
      window.clearInterval(intervalId);
    };
  }, [refreshRates]);

  const filteredRates = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (market?.rates ?? []).filter(
      (rate) =>
        rate.name.toLowerCase().includes(query) ||
        rate.symbol.toLowerCase().includes(query),
    );
  }, [market, search]);

  const selectedRate = market?.rates.find(
    (rate) => rate.symbol === selectedSymbol,
  );
  const parsedAmount = Number(amount);
  const convertedAmount =
    selectedRate && Number.isFinite(parsedAmount) && parsedAmount > 0
      ? conversionDirection === "crypto-to-naira"
        ? formatNaira(parsedAmount * selectedRate.priceNgn)
        : formatCrypto(parsedAmount / selectedRate.priceNgn, selectedSymbol)
      : "—";
  const rateDescription = selectedRate
    ? conversionDirection === "crypto-to-naira"
      ? `Rate: ${formatNaira(selectedRate.priceNgn)} / ${selectedSymbol}`
      : `Rate: 1 ${selectedSymbol} = ${formatNaira(selectedRate.priceNgn)}`
    : "Waiting for live rate";

  return (
    <main className="rates-page" id="top">
      <header className="rates-header">
        <Link className="rates-brand" href="/" aria-label="Ogxchange home">
          <Image
            src="/ogxchange-logo.png"
            alt="Ogxchange"
            width={635}
            height={187}
            priority
          />
        </Link>
        <nav className="rates-nav" aria-label="Main navigation">
          <a className="rates-nav-active" href="#rates">Rates</a>
          <a href="#converter">Convert</a>
          
        </nav>
        <a className="rates-live-label" href="#contact">
          Contact Us
        </a>
      </header>

      <section className="rates-hero">
        <div className="rates-hero-copy">
          <div className="rates-eyebrow"> CRYPTO PRICES IN NGN</div>
          <h1>Crypto rates.<br /><span>Clear in naira.</span></h1>
          <p>Check the latest market price for every supported asset and convert it to Nigerian naira.</p>
        </div>
        <div className="rates-hero-side">
          <div className="rates-clock-mark" aria-hidden="true">₦</div>
          <span>One market.<br />Priced in naira.</span>
        </div>
      </section>

      <section className="converter-panel" id="converter" aria-labelledby="converter-title">
        <div className="converter-intro">
          <span className="panel-kicker">QUICK CONVERT</span>
          <h2 id="converter-title">What’s it worth?</h2>
          <p>Estimate the NGN value using the displayed rate.</p>
        </div>
        <div className="converter-controls">
          <label className="converter-input">
            <span>{conversionDirection === "crypto-to-naira" ? "Crypto amount" : "Naira amount"}</span>
            <div className="converter-field">
              <input
                type="number"
                min="0"
                step="any"
                inputMode="decimal"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                aria-label={conversionDirection === "crypto-to-naira" ? "Crypto amount to convert" : "Naira amount to convert"}
              />
              {conversionDirection === "naira-to-crypto" && (
                <span className="converter-currency">₦ NGN</span>
              )}
              <select
                value={selectedSymbol}
                onChange={(event) => {
                  if (isMarketAssetSymbol(event.target.value)) {
                    setSelectedSymbol(event.target.value);
                  }
                }}
                aria-label="Crypto asset"
              >
                {marketAssets.map((asset) => (
                  <option value={asset.symbol} key={asset.symbol}>
                    {asset.symbol}
                  </option>
                ))}
              </select>
            </div>
          </label>
          <button
            className="converter-swap"
            type="button"
            onClick={() =>
              setConversionDirection((direction) =>
                direction === "crypto-to-naira"
                  ? "naira-to-crypto"
                  : "crypto-to-naira",
              )
            }
            aria-label={
              conversionDirection === "crypto-to-naira"
                ? "Switch to naira-to-crypto conversion"
                : "Switch to crypto-to-naira conversion"
            }
            title="Switch conversion direction"
          >
            ⇄
          </button>
          <div className="converter-result" aria-live="polite">
            <span>{conversionDirection === "crypto-to-naira" ? "Naira value" : "Crypto value"}</span>
            <strong>{convertedAmount}</strong>
            <small>{rateDescription}</small>
          </div>
        </div>
      </section>

      <section className="market-panel" id="rates" aria-labelledby="market-title">
        <div className="market-panel-header">
          <div>
            <span className="panel-kicker">SUPPORTED ASSETS</span>
            <h2 id="market-title">Live market rates</h2>
          </div>
          <div className="market-actions">
            <label className="market-search">
              <span className="search-icon" aria-hidden="true">⌕</span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search assets"
                aria-label="Search supported assets"
              />
            </label>
            <button
              className="refresh-button"
              type="button"
              onClick={() => void refreshRates()}
              disabled={isRefreshing}
            >
              <span aria-hidden="true" className={isRefreshing ? "refresh-icon spinning" : "refresh-icon"}>↻</span>
              {isRefreshing ? "Updating" : "Refresh"}
            </button>
          </div>
        </div>

        <div className="market-status" aria-live="polite">
          <span className={`status-dot ${market && !error ? "status-live" : ""}`} />
          {error ? (
            <span>{market ? "Showing last available rates. " : ""}{error}</span>
          ) : isLoading ? (
            <span>Getting the latest rates…</span>
          ) : market ? (
            <span>
              Rates in NGN
              {market.updatedAt && (
                <> · Updated {new Date(market.updatedAt).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })}</>
              )}
            </span>
          ) : (
            <span>Rates are unavailable.</span>
          )}
        </div>

        <div className="market-table" role="table" aria-label="Cryptocurrency prices in naira">
          <div className="market-table-head" role="row">
            <span role="columnheader">Asset</span>
            <span role="columnheader">Price in NGN</span>
            <span role="columnheader">24h change</span>
            <span role="columnheader">Convert</span>
          </div>
          {filteredRates.map((rate) => (
            <div className="market-table-row" role="row" key={rate.symbol}>
              <div className="market-asset" role="cell">
                <span className={`market-coin coin-${rate.tone}`}>{rate.mark}</span>
                <span><strong>{rate.name}</strong><small>{rate.symbol}</small></span>
              </div>
              <strong className="market-price" role="cell">
                {formatNaira(rate.priceNgn)}
                <small>per {rate.symbol}</small>
              </strong>
              <span
                className={`market-change ${rate.change24h === null ? "change-unavailable" : rate.change24h < 0 ? "change-down" : "change-up"}`}
                role="cell"
              >
                {rate.change24h === null
                  ? "—"
                  : `${rate.change24h > 0 ? "+" : ""}${numberFormatter.format(rate.change24h)}%`}
              </span>
              <button
                className="table-convert-button"
                type="button"
                onClick={() => {
                  setSelectedSymbol(rate.symbol);
                  document.getElementById("converter")?.scrollIntoView({ behavior: "smooth" });
                }}
                aria-label={`Convert ${rate.symbol} to naira`}
              >
                Convert
              </button>
            </div>
          ))}
          {!isLoading && filteredRates.length === 0 && (
            <div className="market-empty">
              {market ? "No supported assets match your search." : "Live rates could not be loaded."}
            </div>
          )}
          {isLoading && !market && (
            <div className="market-empty">Loading supported asset rates…</div>
          )}
        </div>

        <p className="market-disclaimer">
          Market prices are indicative and can change quickly. Conversion is an estimate, not an offer to trade. No trades, deposits, or payouts are available on this page.
        </p>
      </section>

      <section className="contact-panel" id="contact" aria-labelledby="contact-title">
        <div className="contact-intro">
          <span className="panel-kicker">TRADE WITH US</span>
          <h2 id="contact-title">We Are Active 24/7.</h2>
          <p>Contact us with your cryptocurencies both bulk & unit. we got enough cash to pay you instantly. Tap tf in!!!</p>
        </div>
        <div className="contact-details">
          <div className="contact-detail">
            <span className="contact-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M20 11.6a8 8 0 0 1-11.8 7L4 20l1.4-4.1A8 8 0 1 1 20 11.6Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M8.2 8.1c.2-.5.5-.5.8-.5h.5c.2 0 .4.1.5.4l.7 1.6c.1.2.1.4-.1.6l-.5.6c-.2.2-.2.4 0 .6.5.8 1.1 1.4 1.9 1.9.2.1.4.1.6-.1l.6-.6c.2-.2.4-.2.6-.1l1.5.7c.3.1.4.3.4.5v.5c0 .3-.1.6-.5.8-.5.3-1.1.4-1.7.3-1-.2-2.2-.9-3.3-2-1.1-1.1-1.8-2.3-2-3.3-.1-.6 0-1.2.3-1.8Z" fill="currentColor" />
              </svg>
            </span>
            <a href="https://wa.me/2347036212091" target="_blank" rel="noopener noreferrer">
              <div><small>Whatsapp</small><strong>Chat With Us</strong></div>
            </a>
          </div>
          <div className="contact-detail">
            <span className="contact-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M7.2 3.8h3l1.5 4.1-2 1.7a15.4 15.4 0 0 0 4.7 4.7l1.7-2 4.1 1.5v3c0 1-.8 1.8-1.8 1.8A14.6 14.6 0 0 1 5.4 5.6c0-1 .8-1.8 1.8-1.8Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <a href="tel:+2347036212091" target="_blank" rel="noopener noreferrer">
              <div><small>Call Us</small><strong>+2347036212091</strong></div>
            </a>
          </div>
          <div className="contact-detail">
            <span className="contact-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <rect x="3.5" y="3.5" width="17" height="17" rx="5" stroke="currentColor" strokeWidth="1.7" />
                <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.7" />
                <circle cx="17.5" cy="6.8" r="1" fill="currentColor" />
              </svg>
            </span>
            <a href="https://www.instagram.com/ogx_change?obrf=OWZybnN0cnBsZG9v&utm_source=qr" target="_blank" rel="noopener noreferrer">
              <div><small>Instagram</small><strong>Visit Our Page</strong></div>
            </a>
          </div>
        </div>
      </section>

      <footer className="rates-footer">
        <span>© 2026 Ogxchange</span>
        <span>Market data· For information only</span>
      </footer>
      <a className="back-to-top" href="#top" aria-label="Back to top" title="Back to top">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 19V5m-6 6 6-6 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </a>
    </main>
  );
}
