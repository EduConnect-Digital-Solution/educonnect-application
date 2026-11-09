import React, { useState, useEffect } from 'react';
import ParentLayout from "./components/layout/ParentLayout.jsx";
import { getPendingFees } from "../../auth/authAPIs.js";
import {
    Wallet, Receipt, Calendar, Check, CircleCheck, Download,
    FileText, FileSpreadsheet, Printer, Lock, ChevronDown,
    ChevronRight, ArrowRight, Clock, User, Hash, Flag, Inbox
} from "lucide-react";

/* ---------- Design-system primitives (Badge, Avatar, Button, Card) -------- */

const BADGE_TONES = {
  neutral:     "bg-gray-100 text-gray-800 border-transparent",
  brand:       "bg-blue-100 text-blue-800 border-transparent",
  success:     "bg-green-100 text-green-800 border-transparent",
  warning:     "bg-amber-100 text-amber-800 border-transparent",
  destructive: "bg-red-100 text-red-800 border-transparent",
  info:        "bg-blue-100 text-blue-800 border-transparent",
  outline:     "bg-transparent text-gray-900 border-gray-200",
};

function Badge({ children, tone = "neutral", dot = false, className = "" }) {
  const t = BADGE_TONES[tone] || BADGE_TONES.neutral;
  return (
    <span className={`inline-flex items-center gap-1.5 h-[22px] px-2.5 font-medium text-xs border rounded-full whitespace-nowrap ${t} ${className}`}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

const AVATAR_SIZES = {
  xs: "w-6 h-6 text-[10px]",
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-12 h-12 text-base",
  xl: "w-[60px] h-[60px] text-xl"
};

function Avatar({ name = "", size = "md", className = "" }) {
  const dimClass = AVATAR_SIZES[size] || AVATAR_SIZES.md;
  const initials = name.split(" ").map(w => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
  return (
    <span className={`relative inline-flex flex-none ${className}`}>
      <span className={`inline-flex items-center justify-center rounded-full overflow-hidden bg-blue-100 text-blue-800 font-semibold leading-none ${dimClass}`}>
        {initials || "?"}
      </span>
    </span>
  );
}

const BTN_SIZES = {
  sm: "h-8 px-3 text-sm gap-1.5 rounded-md",
  md: "h-[38px] px-4 text-[15px] gap-2 rounded-md",
  lg: "h-11 px-[22px] text-base font-semibold gap-2 rounded-lg",
};

function btnVariant(variant) {
  switch (variant) {
    case "outline": return "bg-white hover:bg-gray-50 text-gray-900 border border-gray-200 shadow-sm";
    case "ghost":   return "bg-transparent hover:bg-gray-100 text-gray-900 border border-transparent";
    default:        return "bg-blue-600 hover:bg-blue-700 text-white border border-transparent shadow-sm";
  }
}

function Button({ children, variant = "primary", size = "md", iconLeft = null, iconRight = null, fullWidth = false, onClick, className = "" }) {
  const sizeClass = BTN_SIZES[size] || BTN_SIZES.md;
  const variantClass = btnVariant('outline');
  const widthClass = fullWidth ? "w-full" : "w-auto";
  
  return (
    <button type="button" onClick={onClick}
      className={`inline-flex items-center justify-center font-medium cursor-pointer whitespace-nowrap transition-all duration-150 ease-out ${sizeClass} ${variantClass} ${widthClass} ${className}`}>
      {iconLeft}{children}{iconRight}
    </button>
  );
}

function Card({ children, title, subtitle, action, padding = true, elevated = false, className = "" }) {
  const hasHeader = title || action;
  return (
    <div className={`bg-white text-gray-900 border border-gray-200 rounded-xl overflow-hidden ${elevated ? "shadow-md" : "shadow-sm"} ${className}`}>
      {hasHeader && (
        <div className={`flex items-start justify-between gap-3 px-5 pt-4 pb-3 border-b border-gray-200`}>
          <div className="flex flex-col gap-1">
            {title && <span className="font-semibold text-lg leading-snug text-gray-900">{title}</span>}
            {subtitle && <span className="text-sm text-gray-500">{subtitle}</span>}
          </div>
          {action}
        </div>
      )}
      <div className={padding ? "p-5" : ""}>{children}</div>
    </div>
  );
}

/* ---------- Finance helpers + data derivation (real payload only) --------- */
const NGN = "₦";
const money = (n) => NGN + Number(n || 0).toLocaleString("en-NG");

const GATEWAYS = [
  { id: "flutterwave", name: "Flutterwave", desc: "Card, bank transfer & USSD", mono: "F", color: "text-[#f5a623]", tint: "bg-[#fff5e6]", border: "border-[#f5a623]/20" },
  { id: "paystack", name: "Paystack", desc: "Cards, Apple Pay & bank", mono: "P", color: "text-[#0ba4db]", tint: "bg-[#e6f7fd]", border: "border-[#0ba4db]/20" },
  { id: "remita", name: "Remita", desc: "Bank transfer & RRR", mono: "R", color: "text-[#1f9d57]", tint: "bg-[#e8f7ee]", border: "border-[#1f9d57]/20" },
];

const NOTICES = [
  { icon: Flag, text: "Fees must be paid before examination registration opens." },
  { icon: Clock, text: "Late payment penalties may apply after the due date." },
  { icon: Receipt, text: "Receipts are generated automatically after successful payment." },
];

const DOWNLOADS = [
  { icon: FileText, label: "Download invoice", sub: "PDF · per child", tone: "brand" },
  { icon: FileSpreadsheet, label: "Fee schedule", sub: "Full term breakdown", tone: "neutral" },
  { icon: Receipt, label: "Payment receipt", sub: "After payment", tone: "neutral" },
  { icon: Printer, label: "Print statement", sub: "Family summary", tone: "neutral" },
];

const titleCase = (s) => (s ? String(s).charAt(0).toUpperCase() + String(s).slice(1) : "");

function feeFin(fee) {
  const total = Number(fee.amount || 0);
  const paid = Number(fee.amountPaid || 0);
  const outstanding = Number(fee.amountDue != null ? fee.amountDue : total - paid);
  const pct = total ? Math.round((paid / total) * 100) : 0;
  let status;
  if (outstanding <= 0) status = { label: "Paid", tone: "success" };
  else if (paid > 0) status = { label: "Partial", tone: "warning" };
  else status = { label: titleCase(fee.status) || "Pending", tone: fee.status === "overdue" ? "destructive" : "warning" };
  return { total, paid, outstanding, pct, status };
}

const firstName = (fee) => (fee.studentName || "").split(" ")[0] || (fee.studentName || "");
function deriveTerm(name = "") {
  const m = name.match(/(First|Second|Third)\s+Term/i);
  return m ? `${m[1][0].toUpperCase()}${m[1].slice(1).toLowerCase()} Term` : "—";
}
function deriveClass(fee) {
  if (fee.className) return fee.className;
  const m = (fee.feeStructureName || "").match(/^(.*?)\s+(First|Second|Third)\s+Term/i);
  return m ? m[1].trim() : "—";
}
function shortId(id = "") { return id ? `${id.slice(0, 8)}…${id.slice(-3)}` : "—"; }
function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d)) return "—";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

/* ---------- Small label/value stack --------------------------------------- */
function Meta({ label, children, mono }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-medium text-[11px] tracking-wider uppercase whitespace-nowrap text-gray-500">{label}</span>
      <span className={`${mono ? "font-medium " : "font-semibold"} text-sm text-gray-900 leading-snug`}>{children}</span>
    </div>
  );
}

/* ---------- Student summary banner ---------------------------------------- */
function StudentSummary({ fee }) {
  const term = deriveTerm(fee.feeStructureName);
  const klass = deriveClass(fee);
  return (
    <div className="flex items-center gap-6 flex-wrap p-5.5 bg-white border border-gray-200 rounded-xl shadow-sm mb-6 p-[22px]">
      <div className="flex items-center gap-4 min-w-[240px]">
        <Avatar name={fee.studentName} size="xl" />
        <div className="flex flex-col gap-1">
          <span className="font-bold text-2xl tracking-tight text-gray-900 leading-tight">{fee.studentName}</span>
          <div className="flex items-center gap-2">
            <Badge tone="brand">{klass}</Badge>
            <span className="text-xs  text-gray-500">ID {shortId(fee.studentId)}</span>
          </div>
        </div>
      </div>
      <div className="flex-1 min-w-[280px] grid grid-cols-2 sm:grid-cols-3 gap-5 pl-6 border-l border-gray-200">
        <Meta label="Invoice" mono>{fee.invoiceNumber}</Meta>
        <Meta label="Current term">{term}</Meta>
        <Meta label="Class">{klass}</Meta>
      </div>
    </div>
  );
}

/* ---------- Progress bar -------------------------------------------------- */
function ProgressBar({ pct, heightClass = "h-3", showLabels = true }) {
  return (
    <div className="flex flex-col gap-2 w-full">
      {showLabels && (
        <div className="flex justify-between items-baseline">
          <span className="font-semibold text-sm text-gray-900">
            <span className="font-bold text-base  text-blue-600">{pct}%</span> paid
          </span>
          <span className="font-medium text-sm text-gray-500">{100 - pct}% outstanding</span>
        </div>
      )}
      <div className={`relative ${heightClass} rounded-full bg-gray-100 overflow-hidden`}>
        <div 
          className="absolute inset-y-0 left-0 bg-blue-600 rounded-full transition-all duration-500 ease-out" 
          style={{ width: `${pct}%`, backgroundColor: pct === 0 ? "transparent" : "" }} 
        />
      </div>
    </div>
  );
}

/* ---------- Money stat tile ----------------------------------------------- */
function MoneyStat({ label, value, icon: IconCmp, emphasis = false, sub }) {
  return (
    <div className={`flex flex-col gap-3.5 p-5 border rounded-xl overflow-hidden relative bg-white border-gray-200 text-gray-900 shadow-sm }`}>
      <div className="flex items-center justify-between">
        <span className={`font-medium text-sm whitespace-nowrap text-gray-500`}>{label}</span>
        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-md `}>
          <IconCmp size={17} />
        </span>
      </div>
      <div className="flex flex-col gap-1">
        <span className="font-semibold text-[30px] leading-none ">{value}</span>
        {sub && <span className={`text-xs leading-snug text-gray-500`}>{sub}</span>}
      </div>
    </div>
  );
}

function StatTrio({ fee }) {
  const fs = feeFin(fee);
  const term = deriveTerm(fee.feeStructureName);
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      <MoneyStat label="Total fees" value={money(fs.total)} icon={Receipt} sub={`${term}, all charges`} />
      <MoneyStat label="Amount paid" value={money(fs.paid)} icon={CircleCheck} sub={`${fs.pct}% of total settled`} />
      <MoneyStat label="Outstanding balance" value={money(fs.outstanding)} icon={Wallet} emphasis sub={fs.outstanding > 0 ? `Due by ${fmtDate(fee.dueDate)}` : "Fully settled"} />
    </div>
  );
}

/* ---------- Fee detail card ----------------------------------------------- */
function FeeDetailCard({ fee }) {
  const fs = feeFin(fee);
  const term = deriveTerm(fee.feeStructureName);
  return (
    <Card 
      title={fs.outstanding > 0 ? "Outstanding fee" : "Term fee"} 
      subtitle={`${firstName(fee)} · current term invoice`}
      action={<Badge tone={fs.status.tone} dot>{fs.status.label}</Badge>}
      className="mb-6"
    >
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-start gap-4 flex-wrap">
          <div className="flex flex-col gap-1.5">
            <span className="font-semibold text-xl leading-tight text-gray-900">{fee.feeStructureName}</span>
            <span className="inline-flex items-center gap-1.5 text-sm  text-gray-500">
              <Hash size={13} />{fee.invoiceNumber}
            </span>
          </div>
          <div className="flex flex-col items-end gap-0.5">
            <span className="font-medium text-[11px] tracking-wider uppercase whitespace-nowrap text-gray-500">
              {fs.outstanding > 0 ? "Amount due" : "Amount paid"}
            </span>
            <span className={`font-bold text-3xl  tracking-tight ${fs.outstanding > 0 ? "text-gray-900" : "text-green-600"}`}>
              {money(fs.outstanding > 0 ? fs.outstanding : fs.total)}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
          <Meta label="Status">{fs.status.label}</Meta>
          <Meta label="Due date">
            <span className="inline-flex items-center gap-1.5 text-gray-900">
              <Calendar size={14} className="text-gray-400" />{fmtDate(fee.dueDate)}
            </span>
          </Meta>
          <Meta label="Term">{term}</Meta>
        </div>
      </div>
    </Card>
  );
}

/* ---------- Gateway card -------------------------------------------------- */
function GatewayCard({ g, selected, onSelect }) {
  const active = selected === g.id;
  return (
    <button 
      onClick={() => onSelect && onSelect(g.id)} 
      className={`flex items-center gap-3 w-full text-left cursor-pointer px-3.5 py-3 rounded-lg transition-all duration-150 ease-out group ${
        active 
          ? "bg-blue-50 border-[1.5px] border-blue-600 ring-2 ring-blue-500/35" 
          : "bg-white border-[1.5px] border-gray-200 hover:border-gray-300"
      }`}
    >
      <span className={`inline-flex items-center justify-center w-9 h-9 rounded-md font-bold text-lg flex-none border ${g.tint} ${g.color} ${g.border}`}>
        {g.mono}
      </span>
      <span className="flex flex-col gap-0.5 flex-1 min-w-0">
        <span className="font-semibold text-[15px] leading-snug text-gray-900">{g.name}</span>
        <span className="text-xs text-gray-500">{g.desc}</span>
      </span>
      <span className={`w-4.5 h-4.5 rounded-full flex-none border-2 inline-flex items-center justify-center ${
        active ? "border-blue-600 bg-blue-600" : "border-gray-300 bg-transparent"
      }`}>
        {active && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
      </span>
    </button>
  );
}

/* ---------- Checkout card (rail) ------------------------------------------ */
function CheckoutCard({ fee }) {
  const fs = feeFin(fee);
  const [sel, setSel] = useState("paystack");
  
  if (fs.outstanding <= 0) {
    return (
      <div className="flex flex-col items-center gap-3 p-7 text-center bg-green-50 border border-green-500/30 rounded-xl mb-6">
        <span className="inline-flex items-center justify-center w-[52px] h-[52px] rounded-full bg-green-500 text-white">
          <Check size={26} />
        </span>
        <span className="font-bold text-xl leading-tight text-green-800">Fees fully paid</span>
        <span className="text-sm leading-relaxed text-green-700 max-w-[260px]">
          {firstName(fee)}'s fees are settled in full. A receipt has been emailed to you.
        </span>
        <Button variant="outline" size="md" iconLeft={<Download size={15} />} className="mt-2 text-green-800 border-green-300 hover:bg-green-50 hover:border-green-400">
          Download receipt
        </Button>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col gap-4 p-5 bg-white border border-gray-200 rounded-xl shadow-md mb-6">
      <div className="flex flex-col gap-1 pb-4 border-b border-gray-200">
        <span className="font-medium text-[11px] tracking-wider uppercase text-gray-500">Total amount due</span>
        <div className="flex items-baseline gap-2.5">
          <span className="font-semibold text-[38px] ">{money(fs.outstanding)}</span>
          <Badge tone={fs.status.tone} dot>{fs.status.label}</Badge>
        </div>
        <span className="text-sm text-gray-500 mt-1">for {fee.feeStructureName}</span>
      </div>
      <div className="flex flex-col gap-2.5">
        <span className="font-medium text-[11px] tracking-wider uppercase text-gray-500 mb-0.5">Choose a payment method</span>
        {GATEWAYS.map(g => <GatewayCard key={g.id} g={g} selected={sel} onSelect={setSel} />)}
      </div>
      <Button variant="primary" size="lg" fullWidth iconRight={<ArrowRight size={18} className="ml-1" />} className="mt-1">
        Pay {money(fs.outstanding)} now
      </Button>
      <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
        <Lock size={13} className="text-green-500" />256-bit encrypted · PCI-DSS compliant
      </div>
    </div>
  );
}

/* ---------- Payment breakdown (expandable) -------------------------------- */
function BreakdownCard({ fee }) {
  const [open, setOpen] = useState(true);
  const fs = feeFin(fee);
  const items = [{ label: fee.feeStructureName, desc: `${deriveTerm(fee.feeStructureName)} invoice`, amount: fs.total }];
  
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden mb-6">
      <button 
        onClick={() => setOpen(o => !o)} 
        className={`flex items-center justify-between gap-3 w-full px-5 py-4 bg-transparent border-none cursor-pointer text-left ${
          open ? "border-b border-gray-200" : ""
        }`}
      >
        <div className="flex flex-col gap-1">
          <span className="font-semibold text-lg text-gray-900">Payment breakdown</span>
          <span className="text-sm text-gray-500">{items.length} line item{items.length === 1 ? "" : "s"} · {firstName(fee)}</span>
        </div>
        <span className="inline-flex items-center gap-2">
          <span className="font-semibold text-base  text-gray-900">{money(fs.total)}</span>
          <span className={`text-gray-400 transition-transform duration-200 ease-out ${open ? "rotate-180" : ""}`}>
            <ChevronDown size={18} />
          </span>
        </span>
      </button>
      
      {open && (
        <div className="px-5 pt-1.5 pb-3">
          {items.map((b, i) => (
            <div key={b.label} className="flex items-center justify-between gap-4 py-3 border-b border-gray-100 last:border-b-0">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center justify-center w-[30px] h-[30px] rounded-md bg-gray-100 text-gray-500 font-semibold text-xs ">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="flex flex-col">
                  <span className="font-medium text-[15px] leading-snug text-gray-900">{b.label}</span>
                  <span className="text-xs text-gray-500">{b.desc}</span>
                </div>
              </div>
              <span className="font-medium text-[15px]  text-gray-900">{money(b.amount)}</span>
            </div>
          ))}
          <div className="flex items-center justify-between pt-3.5 mt-0.5 border-t border-gray-200">
            <span className="font-semibold text-base text-gray-900">Total</span>
            <span className="font-bold text-xl  tracking-tight text-blue-600">{money(fs.total)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Payment timeline (horizontal) --------------------------------- */
function timelineForFee(fee) {
  const fs = feeFin(fee);
  const completedThrough = fs.outstanding <= 0 ? 4 : fs.paid > 0 ? 2 : 1;
  const completedDate = fs.outstanding <= 0 ? "Completed" : fs.paid > 0 ? "In progress" : "Pending";
  return [
    { key: "created", title: "Invoice created", date: "—", icon: FileText },
    { key: "assigned", title: "Fee assigned", date: "—", icon: User },
    { key: "due", title: "Due date", date: fmtDate(fee.dueDate), icon: Calendar },
    { key: "completed", title: "Payment completed", date: completedDate, icon: CircleCheck },
  ].map((s, i) => ({ ...s, status: i < completedThrough ? "done" : i === completedThrough ? "current" : "upcoming" }));
}

function TimelineCard({ fee }) {
  const stages = timelineForFee(fee);
  
  const Dot = ({ s }) => {
    const done = s.status === "done";
    const cur = s.status === "current";
    const IconCmp = done ? Check : s.icon;
    
    return (
      <span className={`inline-flex items-center justify-center w-[34px] h-[34px] flex-none rounded-full z-10 ${
        done 
          ? "bg-blue-600 text-white border-2 border-blue-600" 
          : cur 
            ? "bg-blue-50 text-blue-600 border-2 border-blue-600 shadow-[0_0_0_3px_rgba(37,99,235,0.35)]" 
            : "bg-gray-100 text-gray-400 border-2 border-transparent"
      }`}>
        <IconCmp size={16} />
      </span>
    );
  };
  
  return (
    <Card title="Payment timeline" subtitle="Where this invoice is in its lifecycle" className="mb-6">
      <div className="flex justify-between gap-2 relative mt-2">
        <div className="absolute top-[17px] left-6 right-6 h-[2px] bg-gray-200" />
        {stages.map((s) => (
          <div key={s.key} className="flex flex-col items-center gap-2.5 flex-1 text-center relative z-10">
            <Dot s={s} />
            <div className="flex flex-col gap-0.5">
              <span className={`font-semibold text-sm leading-snug ${s.status === "upcoming" ? "text-gray-500" : "text-gray-900"}`}>{s.title}</span>
              <span className="text-xs  text-gray-500">{s.date}</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ---------- Payment history ----------------------------------------------- */
function HistoryCard() {
  const rows = []; /* payload exposes no transaction records — designed empty state */
  
  const empty = (
    <div className="flex flex-col items-center gap-3.5 px-5 py-10 text-center">
      <span className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 text-gray-400">
        <Inbox size={28} />
      </span>
      <div className="flex flex-col gap-1 max-w-[340px]">
        <span className="font-semibold text-lg text-gray-900">No payments yet</span>
        <span className="text-sm text-gray-500 leading-relaxed">
          No payments have been made for this invoice. Once you pay, every transaction will appear here with its receipt.
        </span>
      </div>
    </div>
  );
  
  return (
    <Card title="Payment history" subtitle="Transactions for this invoice" padding={false} className="mb-6">
      <div className={rows.length ? "px-1 pt-2 pb-1" : ""}>{empty}</div>
    </Card>
  );
}

/* ---------- Notices ------------------------------------------------------- */
function NoticesCard() {
  return (
    <Card title="Important notices" className="mb-6">
      <div className="flex flex-col gap-2.5">
        {NOTICES.map((n, i) => {
          const IconCmp = n.icon;
          return (
            <div key={i} className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-200">
              <span className="inline-flex items-center justify-center w-7 h-7 flex-none rounded-md bg-blue-50 text-blue-600">
                <IconCmp size={15} />
              </span>
              <span className="text-sm text-gray-700 pt-1 leading-snug">{n.text}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/* ---------- Downloads ----------------------------------------------------- */
function DownloadTile({ d }) {
  const IconCmp = d.icon;
  return (
    <button className={`flex items-center gap-3 p-3 text-left cursor-pointer rounded-lg transition-all duration-150 ease-out border bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300 group`}>
      <span className={`inline-flex items-center justify-center w-9 h-9 flex-none rounded-md ${
        d.tone === "brand" ? "bg-blue-50 text-blue-600" : "bg-gray-100 text-gray-600"
      }`}>
        <IconCmp size={17} />
      </span>
      <span className="flex flex-col gap-0.5 flex-1 min-w-0">
        <span className="font-semibold text-sm leading-snug text-gray-900">{d.label}</span>
        <span className="text-xs text-gray-500">{d.sub}</span>
      </span>
      <span className="text-gray-400 group-hover:text-blue-600 transition-colors duration-150">
        <Download size={16} />
      </span>
    </button>
  );
}

function DownloadsCard() {
  return (
    <Card title="Documents" subtitle="Download or print your records" className="mb-6">
      <div className="grid grid-cols-1 gap-2.5">
        {DOWNLOADS.map((d) => <DownloadTile key={d.label} d={d} />)}
      </div>
    </Card>
  );
}

/* ---------- Student switcher (multiple children) -------------------------- */
const statusDotClass = (tone) => {
  if (tone === "success") return "bg-green-500";
  if (tone === "warning") return "bg-amber-500";
  if (tone === "destructive") return "bg-red-500";
  return "bg-blue-500";
};

function StudentSwitcher({ fees, selectedFee, onSelect }) {
  const owing = fees.filter(f => feeFin(f).outstanding > 0).length;
  
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2.5 gap-3 flex-wrap">
        <span className="font-medium text-[11px] tracking-wider uppercase text-gray-500">Select a child</span>
        <span className="text-xs text-gray-500">{fees.length} children · {owing} with a balance</span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full">
        {fees.map((f) => {
          const fin = feeFin(f);
          const active = selectedFee && selectedFee.invoiceNumber === f.invoiceNumber;
          
          return (
            <button 
              key={f.invoiceNumber} 
              onClick={() => onSelect(f)} 
              className={`flex flex-col gap-2.5 flex-none w-[216px] snap-start p-3.5 text-left cursor-pointer rounded-xl transition-all duration-150 ease-out border-[1.5px] bg-white ${
                active 
                  ? "border-blue-600 ring-2 ring-blue-500/35" 
                  : "border-gray-200 shadow-sm hover:border-gray-300"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Avatar name={f.studentName} size="md" />
                <span className="flex flex-col min-w-0">
                  <span className="font-semibold text-base leading-snug text-gray-900 whitespace-nowrap overflow-hidden text-ellipsis">
                    {f.studentName}
                  </span>
                  <span className="text-xs text-gray-500 truncate">
                    {deriveClass(f)} · {deriveTerm(f.feeStructureName)}
                  </span>
                </span>
              </div>
              <div className="flex items-end justify-between gap-2 pt-2 border-t border-gray-200">
                <span className="flex flex-col">
                  <span className="text-[11px] tracking-wider uppercase text-gray-500 mb-0.5">
                    {fin.outstanding > 0 ? "Outstanding" : "Paid in full"}
                  </span>
                  <span className={`font-bold text-[18px]  tracking-tight leading-none ${fin.outstanding > 0 ? "text-gray-900" : "text-green-600"}`}>
                    {money(fin.outstanding)}
                  </span>
                </span>
                <span className="inline-flex items-center gap-1.5 font-medium text-[11px] text-gray-500 whitespace-nowrap">
                  <span className={`w-1.5 h-1.5 rounded-full ${statusDotClass(fin.status.tone)}`} />
                  {fin.status.label}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Statement layout (two-column, sticky checkout rail) ----------- */
function LayoutStatement({ fee }) {
  const fs = feeFin(fee);
  return (
    <div className="flex flex-col w-full">
      <StudentSummary fee={fee} />
      
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_372px] gap-6 items-start">
        <div className="flex flex-col">
          <StatTrio fee={fee} />
          
          <div className="p-5 bg-white border border-gray-200 rounded-xl shadow-sm mb-6">
            <ProgressBar pct={fs.pct} heightClass="h-3" />
          </div>
          
          <FeeDetailCard fee={fee} />
          <BreakdownCard fee={fee} />
          <TimelineCard fee={fee} />
          <HistoryCard />
        </div>
        
        <div className="flex flex-col lg:sticky lg:top-4">
          <CheckoutCard fee={fee} />
          <DownloadsCard />
        </div>
      </div>
    </div>
  );
}

/* ---------- Page header --------------------------------------------------- */
function PageHeader() {
  return (
    <div className="flex flex-col gap-1.5 mb-6">
      <h1 className="font-bold text-3xl sm:text-[30px] leading-tight tracking-tight text-gray-900 m-0">Fees &amp; payments</h1>

    </div>
  );
}

export default function FeesAndPayments() {
    const [loading, setLoading] = useState(true);
    const [fees, setFees] = useState([]);
    const [selectedFee, setSelectedFee] = useState(null);

    useEffect(() => {
        const fetchFees = async () => {
            try {
                setLoading(true);
                // Simulate network request loading time for the demo
                await new Promise(resolve => setTimeout(resolve, 1200));

                const response = await getPendingFees();
                // We ensure it is an array just in case
                const feesList = Array.isArray(response) ? response : [response];
                setFees(feesList);
                if (feesList.length > 0) {
                    setSelectedFee(feesList[0]);
                }
            } catch (err) {
                console.error("Error fetching fees", err);
            } finally {
                setLoading(false);
            }
        };

        fetchFees();
    }, []);

    if (loading) {
        return (
            <ParentLayout>
                <div className="flex flex-col items-center justify-center h-[70vh]">
                    <div className="relative w-20 h-20">
                        <div className="absolute inset-0 border-4 border-blue-100 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
                    </div>
                    <p className="mt-4 text-gray-500 font-medium animate-pulse">Loading fees information...</p>
                </div>
            </ParentLayout>
        );
    }

    const activeFee = selectedFee || fees[0];

    return (
        <ParentLayout>
            <div className="mx-auto w-full pb-10">
                <PageHeader />

                {fees.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 p-12 text-center bg-green-50 border border-green-500/30 rounded-2xl max-w-2xl mx-auto">
                        <span className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500 text-white">
                            <Check size={32} />
                        </span>
                        <span className="font-bold text-2xl leading-tight text-green-800">You're all caught up!</span>
                        <span className="text-base text-green-700 max-w-[360px] leading-relaxed">
                            There are no pending fees or payments at this time.
                        </span>
                    </div>
                ) : (
                    <>
                        {fees.length > 1 && (
                            <StudentSwitcher fees={fees} selectedFee={activeFee} onSelect={setSelectedFee} />
                        )}
                        {activeFee && <LayoutStatement key={activeFee.invoiceNumber} fee={activeFee} />}
                    </>
                )}
            </div>
        </ParentLayout>
    );
}
