import { useRef, useState } from 'react';
import type { Rail } from '../../lib/v2';

const assets: Record<string, string> = {
  USDT:'usdt', USDC:'usdc', DAI:'dai', USDD:'usdd', BTC:'btc', ETH:'eth', BNB:'bnb', XRP:'xrp', SOL:'sol',
};
const networks: Record<string, string> = {
  TRON:'tron', Ethereum:'eth', 'BNB Smart Chain':'bnb', 'Polygon PoS':'polygon', Solana:'sol', Bitcoin:'btc', 'XRP Ledger':'xrp',
};

export function CryptoRailIcon({ asset, network }: { asset: string; network: string }) {
  const coin = assets[asset] ?? (!asset ? networks[network] : undefined), chain = asset ? networks[network] : undefined;
  return <span className="ea-crypto-rail-icon" aria-hidden="true">
    {coin ? <img className="ea-crypto-asset" src={`/payment-icons/${coin}.png`} alt="" width={38} height={38} decoding="async"/> : <b>{asset.slice(0,2)}</b>}
    {chain && <img className="ea-crypto-network" src={`/payment-icons/${chain}.png`} alt="" width={19} height={19} decoding="async"/>}
  </span>;
}

export function CryptoIconStack({ icons }: { icons: string[] }) {
  return <span className="ea-crypto-icon-stack" aria-hidden="true">{icons.map(icon=><img key={icon} src={`/payment-icons/${icon}.png`} alt="" width={28} height={28} decoding="async"/>)}</span>;
}

export default function PaymentRailPicker({ rails, selectedIndex, rtl, onSelect }: {
  rails: Rail[]; selectedIndex: number; rtl: boolean; onSelect: (rail: Rail) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [choice, setChoice] = useState<'asset' | 'network'>('asset');
  const enabled = rails.map((rail, index) => ({ rail, index })).filter(({ rail }) => rail.enabled !== false);
  const selected = enabled.find(({ index }) => index === selectedIndex);
  const currencies = [...new Set(enabled.map(({ rail }) => rail.asset))];
  const compatible = enabled.filter(({ rail }) => rail.asset === selected?.rail.asset);
  const names: Record<string, string> = { USDT: 'Tether', USDC: 'USD Coin', DAI: 'Dai', USDD: 'USDD', BTC: 'Bitcoin', ETH: 'Ethereum', BNB: 'BNB', XRP: 'XRP', SOL: 'Solana' };
  const open = (next: 'asset' | 'network') => { setChoice(next); dialog.current?.showModal(); };
  const choose = (rail: Rail) => { onSelect(rail); dialog.current?.close(); };
  return <fieldset className="ea-compact-rails">
    <legend>{rtl ? 'اختر طريقة الدفع' : 'Pay with crypto'}</legend>
    {selected ? <>
      <input type="hidden" name="rail" value={selected.index}/>
      <button type="button" className="ea-payment-select" onClick={() => open('asset')} aria-haspopup="dialog" aria-label={`${rtl ? 'تغيير العملة' : 'Change currency'}: ${selected.rail.asset}`}>
        <CryptoRailIcon asset={selected.rail.asset} network=""/>
        <span><small>{rtl ? 'العملة' : 'Currency'}</small><strong>{selected.rail.asset} <em>{names[selected.rail.asset] ?? selected.rail.asset}</em></strong></span><b aria-hidden="true">⌄</b>
      </button>
      <button type="button" className="ea-payment-select" onClick={() => open('network')} aria-haspopup="dialog" aria-label={`${rtl ? 'تغيير الشبكة' : 'Change network'}: ${selected.rail.network}`}>
        <span className="ea-chain-mark" aria-hidden="true">{networks[selected.rail.network] ? <img src={`/payment-icons/${networks[selected.rail.network]}.png`} alt="" width={32} height={32}/> : '◇'}</span>
        <span><small>{rtl ? 'الشبكة' : 'Network'}</small><strong>{selected.rail.network} <em>{selected.rail.standard}</em></strong></span><b aria-hidden="true">⌄</b>
      </button>
      <p className="ea-selected-rail-note" aria-live="polite">{rtl ? `أرسل ${selected.rail.asset} عبر شبكة ${selected.rail.network} فقط.` : `Use ${selected.rail.asset} on ${selected.rail.network} only.`}{selected.rail.memoRequired && <span> {rtl ? 'وسم الوجهة مطلوب.' : 'Destination tag required.'}</span>}</p>
    </> : <p role="status">{rtl ? 'لا توجد طريقة دفع متاحة حالياً.' : 'No payment methods are available right now.'}</p>}
    <dialog ref={dialog} className="ea-payment-options" dir={rtl ? 'rtl' : 'ltr'} aria-labelledby="ea-payment-options-title" onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
      <header><div><h2 id="ea-payment-options-title">{choice === 'asset' ? (rtl ? 'اختر العملة' : 'Choose currency') : (rtl ? 'اختر الشبكة' : 'Choose network')}</h2><p>{choice === 'asset' ? (rtl ? 'اختر العملة الموجودة في محفظتك.' : 'Choose the currency you hold.') : (rtl ? `الشبكات المتاحة لعملة ${selected?.rail.asset ?? ''}.` : `Available networks for ${selected?.rail.asset ?? ''}.`)}</p></div><button type="button" onClick={() => dialog.current?.close()} aria-label={rtl ? 'إغلاق' : 'Close'}>×</button></header>
      <div className={choice === 'asset' ? 'ea-currency-options' : 'ea-network-options'}>
        {choice === 'asset' ? currencies.map(asset => <button type="button" key={asset} aria-pressed={asset === selected?.rail.asset} onClick={() => {
          const options = enabled.filter(({ rail }) => rail.asset === asset);
          const next = options.find(({ rail }) => rail.network === selected?.rail.network) ?? options.find(({ rail }) => rail.network === 'TRON') ?? options[0];
          if (next) choose(next.rail);
        }}><CryptoRailIcon asset={asset} network=""/><strong>{asset}</strong><small>{names[asset] ?? asset}</small>{asset === selected?.rail.asset && <i aria-hidden="true">✓</i>}</button>) : compatible.map(({ rail, index }) => <button type="button" key={index} aria-pressed={index === selectedIndex} onClick={() => choose(rail)}><CryptoRailIcon asset="" network={rail.network}/><span><strong>{rail.network}</strong><small>{rail.standard}{rail.memoRequired ? (rtl ? ' · وسم مطلوب' : ' · Tag required') : ''}</small></span>{index === selectedIndex && <i aria-hidden="true">✓</i>}</button>)}
      </div>
      {choice === 'network' && <p className="ea-network-caution">{rtl ? 'يجب أن تطابق الشبكة شبكة التحويل في محفظتك أو منصتك. التحويل عبر شبكة أخرى قد يؤدي إلى فقدان الأموال.' : 'Match this network in your wallet or exchange. Using another network may result in lost funds.'}</p>}
    </dialog>
  </fieldset>;
}
