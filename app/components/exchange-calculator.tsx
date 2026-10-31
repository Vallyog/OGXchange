"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

const assets = [
  { symbol: "BTC", name: "Bitcoin", mark: "₿", rate: 104_850_000, color: "orange" },
  { symbol: "ETH", name: "Ethereum", mark: "◆", rate: 5_620_000, color: "blue" },
  { symbol: "USDT", name: "Tether", mark: "₮", rate: 1_578, color: "green" },
];

const demoFeeRate = 0.01;

function formatNaira(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatCrypto(value: number, symbol: string) {
  const maximumFractionDigits = symbol === "BTC" ? 8 : symbol === "ETH" ? 6 : 2;
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits }).format(value)} ${symbol}`;
}

export default function ExchangeCalculator() {
  const [direction, setDirection] = useState<"buy" | "sell">("buy");
  const [symbol, setSymbol] = useState("BTC");
  const [amount, setAmount] = useState("50000");
  const asset = assets.find((item) => item.symbol === symbol) ?? assets[0];
  const parsedAmount = Number(amount);

  const quote = useMemo(() => {
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return { receive: "—", fee: "—" };
    }

    if (direction === "buy") {
      const feeNaira = parsedAmount * demoFeeRate;
      return {
        receive: formatCrypto(((parsedAmount - feeNaira) / asset.rate), asset.symbol),
        fee: formatNaira(feeNaira),
      };
    }

    const grossNaira = parsedAmount * asset.rate;
    return {
      receive: formatNaira(grossNaira * (1 - demoFeeRate)),
      fee: formatNaira(grossNaira * demoFeeRate),
    };
  }, [asset, direction, parsedAmount]);

  const amountLabel = direction === "buy" ? "You pay" : "You send";
  const amountPlaceholder = direction === "buy" ? "50,000" : "0.01";

  function updateDirection(nextDirection: "buy" | "sell") {
    setDirection(nextDirection);
    setAmount(nextDirection === "buy" ? "50000" : "0.01");
  }

  return (
    <div className="calculator-card">
      <div className="calculator-top">
        <div className="calculator-title">
          <span className="calculator-mark">↗</span>
          <div><h3>Exchange preview</h3><span>See an indicative conversion</span></div>
        </div>
        <span className="preview-chip"><i /> DEMO</span>
      </div>

      <div className="direction-switch" aria-label="Exchange direction">
        <Button type="button" variant="ghost" size="sm" aria-pressed={direction === "buy"} className={`p-0 ${direction === "buy" ? "active" : ""}`} onClick={() => updateDirection("buy")}>Buy crypto</Button>
        <Button type="button" variant="ghost" size="sm" aria-pressed={direction === "sell"} className={`p-0 ${direction === "sell" ? "active" : ""}`} onClick={() => updateDirection("sell")}>Sell crypto</Button>
      </div>

      <div className="amount-label"><label htmlFor="exchange-amount">{amountLabel}</label><span>{direction === "buy" ? "NGN balance" : "Crypto balance"}</span></div>
      <div className="amount-field">
        <input
          id="exchange-amount"
          inputMode="decimal"
          type="number"
          min="0"
          step="any"
          value={amount}
          placeholder={amountPlaceholder}
          onChange={(event) => setAmount(event.target.value)}
          aria-describedby="sample-rate"
        />
        <span className="amount-currency">{direction === "buy" ? <><b>₦</b> NGN</> : <>{asset.symbol}</>}</span>
      </div>

      <div className="swap-indicator"><span className="swap-line" /><span className="swap-button" aria-hidden="true">↓↑</span><span className="swap-line" /></div>

      <div className="amount-label"><span>{direction === "buy" ? "You receive" : "You receive"}</span><span>Estimated amount</span></div>
      <div className="receive-field">
        <strong>{quote.receive}</strong>
        {direction === "buy" ? (
          <label className="asset-select-label" htmlFor="exchange-asset">
            <span className={`asset-mini asset-${asset.color}`}>{asset.mark}</span>
            <select id="exchange-asset" value={symbol} onChange={(event) => setSymbol(event.target.value)} aria-label="Choose a crypto asset">
              {assets.map((item) => <option value={item.symbol} key={item.symbol}>{item.symbol}</option>)}
            </select>
            <span className="select-chevron">⌄</span>
          </label>
        ) : <span className="ngn-chip"><b>₦</b> NGN</span>}
      </div>

      <div className="quote-details">
        <div><span>Indicative rate</span><strong id="sample-rate">{formatNaira(asset.rate)} <small>/ {asset.symbol}</small></strong></div>
        <div><span>Sample fee (1%)</span><strong>{quote.fee}</strong></div>
        <div><span>Quote status</span><strong className="sample-status"><i /> Sample only</strong></div>
      </div>

      <Button className="button button-dark calculator-submit" type="button" disabled title="Live trading is not configured">Trading is not live yet <span>↗</span></Button>
      <p className="calculator-terms">No order is created by this preview. Rates are illustrative and may not reflect the market.</p>
    </div>
  );
}
