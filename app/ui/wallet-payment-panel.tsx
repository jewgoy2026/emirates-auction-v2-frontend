'use client';

import { useEffect, useMemo, useState } from 'react';
import { api, normalizeIntent, type PaymentIntent } from '../../lib/v2';
import { discoverWalletChoices, executeWalletPayment, friendlyWalletError, type WalletChoice } from '../../lib/wallet-payment';

type Stage = 'ready' | 'connecting' | 'approving' | 'registering' | 'submitted';

function shortHash(value: string) {
  return value.length > 22 ? `${value.slice(0, 12)}…${value.slice(-8)}` : value;
}

export default function WalletPaymentPanel({ intent, walletConnectProjectId, rtl, onIntent }: {
  intent: PaymentIntent;
  walletConnectProjectId: string;
  rtl: boolean;
  onIntent: (intent: PaymentIntent) => void;
}) {
  const [choices, setChoices] = useState<WalletChoice[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [stage, setStage] = useState<Stage>('ready');
  const [error, setError] = useState('');
  const request = intent.walletRequest;
  const submitted = Boolean(intent.txHash) || ['confirming', 'confirmed'].includes(intent.status);
  const mismatched = intent.status === 'amount_mismatch';
  const unsuccessful = mismatched || ['failed', 'expired'].includes(intent.status);
  const selected = useMemo(() => choices.find((choice) => choice.id === selectedId) ?? choices[0] ?? null, [choices, selectedId]);

  useEffect(() => {
    let current = true;
    setChoices([]); setSelectedId(''); setStage(intent.txHash ? 'submitted' : 'ready'); setError('');
    if (!request) return () => { current = false; };
    discoverWalletChoices(request, walletConnectProjectId).then((items) => {
      if (!current) return;
      setChoices(items);
      setSelectedId(items[0]?.id ?? '');
    }).catch(() => { if (current) setChoices([]); });
    return () => { current = false; };
  }, [intent.id, intent.txHash, request, walletConnectProjectId]);

  async function pay() {
    if (!request || !selected || submitted) return;
    setError(''); setStage('connecting');
    try {
      // The adapter receives only the immutable request returned by the API. It
      // never recalculates the AED conversion or accepts an amount from the UI.
      setStage('approving');
      const result = await executeWalletPayment(request, selected, walletConnectProjectId);
      setStage('registering');
      const response = await api<{ intent: unknown }>(`/v1/payment/intents/${intent.id}/submissions`, {
        body: { txHash: result.txHash, sourceAddress: result.senderAddress, connector: result.walletName },
      });
      const updated = normalizeIntent(response.intent);
      onIntent(updated);
      setStage('submitted');
    } catch (reason) {
      setStage('ready');
      setError(friendlyWalletError(reason));
    }
  }

  if (!request) return <div className="ea-wallet-connect ea-wallet-connect-fallback">
    <strong>{rtl ? 'طلب الدفع بالمبلغ الثابت جاهز' : 'Your fixed-amount request is ready'}</strong>
    <p>{rtl ? 'استخدم رمز QR أو بيانات التحويل اليدوي. لن يتم اعتماد العملية إلا بعد مطابقة الشبكة للمبلغ الكامل.' : 'Use the QR or the manual transfer details. Settlement occurs only after the network matches the complete amount.'}</p>
    {/^https?:\/\//i.test(intent.paymentUri) && <a className="red-button" href={intent.paymentUri} target="_blank" rel="noreferrer">{rtl ? 'فتح طلب الدفع الآمن' : 'Open secure payment request'}</a>}
  </div>;

  if (submitted || unsuccessful) return <div className={`ea-wallet-connect ea-wallet-submitted ${intent.status === 'confirmed' ? 'confirmed' : ''} ${unsuccessful ? 'mismatch' : ''}`} aria-live="polite">
    <span className="ea-wallet-state-icon">{intent.status === 'confirmed' ? '✓' : unsuccessful ? '!' : '•••'}</span>
    <div><strong>{intent.status === 'confirmed' ? (rtl ? 'تم تأكيد الدفع' : 'Payment confirmed') : mismatched ? (rtl ? 'القيمة المستلمة لا تطابق الطلب' : 'Received amount does not match') : unsuccessful ? (rtl ? 'تعذر إكمال هذه الدفعة' : 'This payment could not be completed') : (rtl ? 'تم إرسال المعاملة' : 'Transaction submitted')}</strong>
      <p>{intent.status === 'confirmed' ? (rtl ? 'تمت مطابقة القيمة الكاملة وإتمام العملية على الشبكة.' : 'The exact amount was matched and finalized on-chain.') : mismatched ? (rtl ? 'لم تتم إضافة رصيد أو تسوية الطلب. تواصل مع الدعم ولا ترسل دفعة ثانية قبل المراجعة.' : 'No balance or order was credited. Contact support and do not send a second payment before review.') : unsuccessful ? (rtl ? 'لم يتم اعتماد هذه الدفعة. أنشئ طلباً جديداً أو تواصل مع الدعم.' : 'This payment was not credited. Create a new request or contact support.') : (rtl ? 'يراقب النظام هذه المعاملة الآن. لا ترسل دفعة أخرى.' : 'The listener is tracking this transaction now. Do not send another payment.')}</p>
      {intent.txHash && <code title={intent.txHash}>{shortHash(intent.txHash)}</code>}
    </div>
  </div>;

  if (!choices.length) return <div className="ea-wallet-connect ea-wallet-connect-fallback">
    <strong>{rtl ? 'لم يتم اكتشاف محفظة متوافقة' : 'No compatible wallet was detected'}</strong>
    <p>{request.family === 'tron'
      ? (rtl ? 'افتح هذه الصفحة داخل متصفح TronLink أو OKX. بعد الاتصال، ستنشئ المنصة التحويل بالقيمة الدقيقة ولا تسمح بتعديلها.' : 'Open this page inside the TronLink or OKX in-app browser. Once connected, the platform builds the transfer with the exact immutable amount.')
      : (rtl ? 'امسح رمز QR من داخل محفظة تدعم هذه الشبكة، أو ارجع واختر الدفع من صرافة. لن نفتح رابط تطبيق غير متوافق تلقائياً.' : 'Scan the QR from a wallet that supports this network, or go back and choose an exchange. We will not launch an incompatible app link automatically.')}</p>
    {/^https?:\/\//i.test(intent.paymentUri) && <a className="red-button" href={intent.paymentUri} target="_blank" rel="noreferrer">{rtl ? 'فتح المحفظة المتوافقة' : 'Open compatible wallet'}</a>}
  </div>;

  const progress = stage === 'ready' ? 0 : stage === 'connecting' ? 1 : stage === 'approving' ? 2 : 3;
  return <div className="ea-wallet-connect" aria-live="polite">
    <div className="ea-wallet-connect-head"><div><strong>{rtl ? 'الدفع من محفظة متصلة' : 'Pay with a connected wallet'}</strong><p>{rtl ? 'الخيار الأسرع: نجهز المستلم والعملة والمبلغ؛ أنت فقط تراجع وتوافق.' : 'Fastest option: we prepare the recipient, asset and amount; you only review and approve.'}</p></div><span>{rtl ? 'موصى به' : 'Recommended'}</span></div>
    <div className="ea-wallet-progress" aria-label={rtl ? 'مراحل الدفع' : 'Payment progress'}>
      {[rtl ? 'الاتصال' : 'Connect', rtl ? 'المراجعة' : 'Review', rtl ? 'الإرسال' : 'Submit'].map((label, index) => <span className={progress > index ? 'active' : ''} key={label}><i>{progress > index ? '✓' : index + 1}</i>{label}</span>)}
    </div>
    <div className="ea-wallet-choices" role="radiogroup" aria-label={rtl ? 'اختر المحفظة' : 'Choose wallet'}>{choices.map((choice) => <button type="button" role="radio" aria-checked={selected?.id === choice.id} className={selected?.id === choice.id ? 'selected' : ''} onClick={() => setSelectedId(choice.id)} key={choice.id}>{choice.icon ? <img src={choice.icon} alt=""/> : <b>{choice.name.slice(0, 1)}</b>}<span><strong>{choice.name}</strong><small>{choice.detail}</small></span><i>{selected?.id === choice.id ? '✓' : ''}</i></button>)}</div>
    <div className="ea-wallet-exact"><span>{rtl ? 'ستطلب المحفظة بالضبط' : 'Wallet will request exactly'}</span><strong>{intent.cryptoAmount} {intent.asset}</strong><small>{intent.network} · {intent.standard}</small></div>
    {error && <div className="alert alert-error">{error}</div>}
    <button type="button" className="red-button ea-wallet-pay" onClick={pay} disabled={stage !== 'ready'}>{stage === 'connecting' ? (rtl ? 'جارٍ الاتصال…' : 'Connecting wallet…') : stage === 'approving' ? (rtl ? 'راجع ووافق في المحفظة…' : 'Review and approve in wallet…') : stage === 'registering' ? (rtl ? 'جارٍ ربط المعاملة…' : 'Linking transaction…') : (rtl ? `الاتصال بـ ${selected?.name} والدفع` : `Connect ${selected?.name} & pay`)}</button>
    <p className="ea-wallet-safety">{rtl ? 'لن نطلب أبداً العبارة السرية أو المفتاح الخاص. المحفظة توقع المعاملة محلياً.' : 'We never request your recovery phrase or private key. Your wallet signs locally.'}</p>
  </div>;
}
