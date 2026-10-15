import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchAuthSession,
  fetchUserAttributes,
  getCurrentUser,
  signOut,
} from "aws-amplify/auth";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  ChartNoAxesColumnIncreasing,
  CircleDollarSign,
  Coffee,
  House,
  LogOut,
  Menu,
  Plus,
  Receipt,
  Search,
  ShoppingBag,
  Trash2,
  Utensils,
  Wallet,
  X,
} from "lucide-react";

type TransactionType = "income" | "expense";

type Transaction = {
  id: string;
  title: string;
  category: string;
  date: string;
  amount: number;
  type: TransactionType;
};

const API_URL = import.meta.env.VITE_SPENDWISE_API_URL;

const EXPENSE_CATEGORIES = [
  "Housing",
  "Groceries",
  "Utilities",
  "Transport",
  "Dining",
  "Subscriptions",
  "Shopping",
  "Other",
];

const INCOME_CATEGORIES = ["Salary", "Freelance", "Other"];

const CATEGORY_COLORS = [
  "#10b981",
  "#6478f8",
  "#f59e0b",
  "#ec4899",
  "#8b5cf6",
  "#06b6d4",
  "#94a3b8",
];

async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  if (!API_URL) {
    throw new Error(
      "API URL is missing. Set VITE_SPENDWISE_API_URL in .env.local and restart Vite."
    );
  }

  const session = await fetchAuthSession();
  const accessToken = session.tokens?.accessToken.toString();

  if (!accessToken) {
    throw new Error("Your session expired. Please sign in again.");
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...options.headers,
    },
  });

  const responseText = await response.text();
  let responseBody: unknown = null;

  if (responseText) {
    try {
      responseBody = JSON.parse(responseText);
    } catch {
      responseBody = responseText;
    }
  }

  if (!response.ok) {
    const message =
      typeof responseBody === "object" &&
      responseBody !== null &&
      "message" in responseBody &&
      typeof responseBody.message === "string"
        ? responseBody.message
        : `API request failed (${response.status}).`;

    throw new Error(message);
  }

  return responseBody as T;
}

function getToday(): string {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 10);
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatMonth(month: string): string {
  if (!month) return "";

  return new Date(`${month}-01T00:00:00`).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

function CategoryIcon({ category }: { category: string }) {
  switch (category) {
    case "Housing":
      return <House size={18} />;
    case "Groceries":
    case "Shopping":
      return <ShoppingBag size={18} />;
    case "Dining":
      return <Utensils size={18} />;
    case "Subscriptions":
      return <Coffee size={18} />;
    case "Utilities":
      return <Receipt size={18} />;
    default:
      return <CircleDollarSign size={18} />;
  }
}

export default function Dashboard() {
  const navigate = useNavigate();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(() =>
    getToday().slice(0, 7)
  );
  const [search, setSearch] = useState("");

  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profilePicture, setProfilePicture] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [dataError, setDataError] = useState("");
  const [formError, setFormError] = useState("");

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Other");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(getToday());
  const [type, setType] = useState<TransactionType>("expense");

  useEffect(() => {
    let isActive = true;

    async function loadDashboard() {
      try {
        const user = await getCurrentUser();
        const attributes = await fetchUserAttributes();

        if (!isActive) return;

        const email = attributes.email ?? user.username;
        const name = attributes.name || email.split("@")[0] || "Account";

        setProfileEmail(email);
        setProfileName(name);
        setProfilePicture(attributes.picture ?? "");

        try {
          const loaded = await apiRequest<Transaction[]>("/transactions");

          if (isActive) {
            setTransactions(Array.isArray(loaded) ? loaded : []);
            setDataError("");
          }
        } catch (error) {
          if (isActive) {
            setDataError(
              error instanceof Error
                ? error.message
                : "Could not load your transactions."
            );
          }
        }
      } catch {
        if (isActive) {
          navigate("/");
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      isActive = false;
    };
  }, [navigate]);

  const monthTransactions = useMemo(
    () =>
      transactions.filter((transaction) =>
        transaction.date.startsWith(selectedMonth)
      ),
    [transactions, selectedMonth]
  );

  const visibleTransactions = useMemo(() => {
    const query = search.trim().toLowerCase();

    return [...monthTransactions]
      .filter((transaction) => {
        return (
          transaction.title.toLowerCase().includes(query) ||
          transaction.category.toLowerCase().includes(query) ||
          transaction.type.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [monthTransactions, search]);

  const income = useMemo(
    () =>
      monthTransactions
        .filter((transaction) => transaction.type === "income")
        .reduce((sum, transaction) => sum + transaction.amount, 0),
    [monthTransactions]
  );

  const expenses = useMemo(
    () =>
      monthTransactions
        .filter((transaction) => transaction.type === "expense")
        .reduce((sum, transaction) => sum + transaction.amount, 0),
    [monthTransactions]
  );

  const balance = income - expenses;
  const savingsRate = income > 0 ? Math.round((balance / income) * 100) : 0;

  const spendingByCategory = useMemo(() => {
    const totals = new Map<string, number>();

    monthTransactions
      .filter((transaction) => transaction.type === "expense")
      .forEach((transaction) => {
        totals.set(
          transaction.category,
          (totals.get(transaction.category) ?? 0) + transaction.amount
        );
      });

    return [...totals.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [monthTransactions]);

  function handleTypeChange(nextType: TransactionType) {
    setType(nextType);
    setCategory(nextType === "income" ? "Salary" : "Other");
    setFormError("");
  }

  async function handleAddTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    setDataError("");

    const parsedAmount = Number(amount);

    if (!title.trim()) {
      setFormError("Enter a description.");
      return;
    }

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setFormError("Enter an amount greater than zero.");
      return;
    }

    if (!date || date > getToday()) {
      setFormError("Choose a valid date that is not in the future.");
      return;
    }

    setIsSaving(true);

    try {
      const savedTransaction = await apiRequest<Transaction>(
        "/transactions",
        {
          method: "POST",
          body: JSON.stringify({
            title: title.trim(),
            category,
            date,
            amount: parsedAmount,
            type,
          }),
        }
      );

      setTransactions((current) => [savedTransaction, ...current]);
      setTitle("");
      setAmount("");
      setDate(getToday());
      setType("expense");
      setCategory("Other");
      setShowAddForm(false);
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Could not save transaction."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteTransaction(id: string) {
    setDataError("");

    try {
      await apiRequest<{ deleted: boolean }>(
        `/transactions/${encodeURIComponent(id)}`,
        { method: "DELETE" }
      );

      setTransactions((current) =>
        current.filter((transaction) => transaction.id !== id)
      );
    } catch (error) {
      setDataError(
        error instanceof Error ? error.message : "Could not delete transaction."
      );
    }
  }

  async function handleSignOut() {
    try {
      await signOut();
    } finally {
      navigate("/");
    }
  }

  const profileInitial = (
    profileName.trim()[0] ||
    profileEmail.trim()[0] ||
    "U"
  ).toUpperCase();

  if (isLoading) {
    return (
      <main className="sw-loading" aria-live="polite">
        Loading your account…
      </main>
    );
  }

  return (
    <div className="spendwise">
      <style>{`
        .spendwise {
          --ink: #172033;
          --muted: #718096;
          --line: #e7ebf2;
          --surface: #fff;
          --canvas: #f5f7fb;
          --brand: #5b6ff5;
          --green: #10a979;
          --red: #e15b64;
          min-height: 100vh;
          display: flex;
          background: var(--canvas);
          color: var(--ink);
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }
        .spendwise * { box-sizing: border-box; }
        .spendwise button, .spendwise input, .spendwise select { font: inherit; }
        .spendwise button { cursor: pointer; }
        .sw-loading { min-height: 100vh; display: grid; place-items: center; color: #718096; font: 500 16px system-ui, sans-serif; }
        .sw-sidebar { width: 250px; flex: 0 0 250px; min-height: 100vh; padding: 26px 18px; display: flex; flex-direction: column; background: var(--surface); border-right: 1px solid var(--line); }
        .sw-brand { display: flex; align-items: center; gap: 10px; margin: 0 0 42px 7px; color: var(--ink); text-decoration: none; font-size: 21px; font-weight: 800; }
        .sw-brand-icon { width: 38px; height: 38px; display: grid; place-items: center; color: white; background: var(--brand); border-radius: 12px; }
        .sw-brand-name span { color: var(--brand); }
        .sw-section-label { margin: 0 0 12px 10px; color: #9aa4b4; font-size: 11px; font-weight: 800; letter-spacing: .12em; }
        .sw-nav { display: grid; gap: 7px; }
        .sw-nav a, .sw-signout { min-height: 44px; display: flex; align-items: center; gap: 12px; padding: 0 12px; color: #657087; background: transparent; border: 0; border-radius: 11px; text-align: left; text-decoration: none; }
        .sw-nav a:hover, .sw-signout:hover { color: var(--brand); background: #f0f2ff; }
        .sw-nav a[aria-current="page"] { color: var(--brand); background: #eef0ff; font-weight: 700; }
        .sw-sidebar-bottom { margin-top: auto; }
        .sw-tip { margin: 28px 0 18px; padding: 16px; color: #5f6a7f; background: #f5f7ff; border: 1px solid #e9ecff; border-radius: 14px; font-size: 13px; line-height: 1.55; }
        .sw-tip strong { display: block; margin: 7px 0 4px; color: var(--ink); }
        .sw-tip p { margin: 0; }
        .sw-main { flex: 1; min-width: 0; }
        .sw-topbar { min-height: 76px; display: flex; align-items: center; justify-content: space-between; gap: 18px; padding: 14px 30px; background: var(--surface); border-bottom: 1px solid var(--line); }
        .sw-month { display: flex; align-items: center; gap: 9px; color: #46536a; font-weight: 700; }
        .sw-month input { max-width: 160px; padding: 8px 9px; color: var(--ink); background: white; border: 1px solid var(--line); border-radius: 9px; }
        .sw-topbar-right { display: flex; align-items: center; gap: 16px; min-width: 0; }
        .sw-search { width: min(300px, 34vw); display: flex; align-items: center; gap: 9px; padding: 10px 12px; color: #8792a6; background: #f7f8fb; border: 1px solid var(--line); border-radius: 10px; }
        .sw-search input { width: 100%; min-width: 0; color: var(--ink); background: transparent; border: 0; outline: 0; }
        .sw-profile { display: flex; align-items: center; gap: 10px; min-width: 0; }
        .sw-avatar { width: 40px; height: 40px; flex: 0 0 40px; display: grid; place-items: center; overflow: hidden; color: #fff; background: linear-gradient(145deg, #6879f8, #8a5cf6); border-radius: 50%; font-weight: 800; object-fit: cover; }
        .sw-profile-text { min-width: 0; }
        .sw-profile-text strong, .sw-profile-text span { display: block; max-width: 190px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .sw-profile-text strong { font-size: 13px; }
        .sw-profile-text span { margin-top: 3px; color: var(--muted); font-size: 11px; }
        .sw-content { width: min(1400px, 100%); margin: 0 auto; padding: 32px; }
        .sw-welcome { display: flex; align-items: center; justify-content: space-between; gap: 20px; margin-bottom: 25px; }
        .sw-eyebrow { margin: 0 0 8px; color: var(--brand); font-size: 11px; font-weight: 800; letter-spacing: .12em; }
        .sw-welcome h1 { margin: 0; font-size: clamp(24px, 3vw, 32px); letter-spacing: -.04em; }
        .sw-welcome p:last-child { margin: 8px 0 0; color: var(--muted); }
        .sw-primary, .sw-secondary, .sw-danger { min-height: 42px; display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 0 15px; border: 0; border-radius: 10px; font-weight: 700; }
        .sw-primary { color: white; background: var(--brand); box-shadow: 0 7px 18px #5b6ff52e; }
        .sw-primary:hover { background: #4c60e6; }
        .sw-primary:disabled { opacity: .65; cursor: wait; }
        .sw-secondary { color: #526078; background: white; border: 1px solid var(--line); }
        .sw-danger { min-height: 34px; padding: 0 9px; color: #b04b55; background: #fff4f4; }
        .sw-summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 15px; margin-bottom: 18px; }
        .sw-card { min-width: 0; padding: 19px; background: var(--surface); border: 1px solid var(--line); border-radius: 16px; box-shadow: 0 5px 18px #1c2b4a08; }
        .sw-card-label { display: flex; align-items: center; justify-content: space-between; gap: 10px; color: #66738a; font-size: 13px; }
        .sw-card-icon { width: 36px; height: 36px; display: grid; place-items: center; color: var(--brand); background: #eff1ff; border-radius: 11px; }
        .sw-card h2 { margin: 17px 0 5px; font-size: clamp(21px, 2.4vw, 28px); letter-spacing: -.04em; }
        .sw-card-caption { margin: 0; color: var(--muted); font-size: 12px; }
        .sw-panels { display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(280px, .75fr); gap: 16px; }
        .sw-panel-title { margin: 0; font-size: 17px; }
        .sw-panel-subtitle { margin: 5px 0 18px; color: var(--muted); font-size: 13px; }
        .sw-bars { display: grid; gap: 15px; }
        .sw-bar-row { display: grid; grid-template-columns: minmax(90px, 120px) 1fr auto; align-items: center; gap: 12px; font-size: 12px; }
        .sw-bar-track { height: 10px; overflow: hidden; background: #f0f2f6; border-radius: 20px; }
        .sw-bar-fill { height: 100%; min-width: 3px; border-radius: inherit; }
        .sw-bar-value { color: #59667d; font-variant-numeric: tabular-nums; }
        .sw-transaction-panel { margin-top: 16px; }
        .sw-table-wrap { overflow-x: auto; }
        .sw-table { width: 100%; border-collapse: collapse; text-align: left; }
        .sw-table th { padding: 11px 10px; color: #8792a6; border-bottom: 1px solid var(--line); font-size: 11px; font-weight: 700; }
        .sw-table td { padding: 12px 10px; border-bottom: 1px solid #f0f2f6; font-size: 13px; }
        .sw-transaction-name { display: flex; align-items: center; gap: 10px; font-weight: 700; }
        .sw-category-icon { width: 34px; height: 34px; flex: 0 0 34px; display: grid; place-items: center; color: #5b6ff5; background: #eff1ff; border-radius: 10px; }
        .sw-amount-income { color: var(--green); font-weight: 700; white-space: nowrap; }
        .sw-amount-expense { color: var(--red); font-weight: 700; white-space: nowrap; }
        .sw-empty { padding: 34px 15px; color: var(--muted); text-align: center; line-height: 1.5; }
        .sw-table-footer { padding-top: 13px; color: var(--muted); font-size: 12px; }
        .sw-footer { display: flex; justify-content: space-between; gap: 12px; margin: 18px 2px 0; color: #8a94a5; font-size: 11px; }
        .sw-menu, .sw-backdrop { display: none; }
        .sw-error { margin: 0 0 16px; padding: 12px 14px; color: #9d3038; background: #fff1f1; border: 1px solid #ffd8d8; border-radius: 10px; font-size: 13px; }
        .sw-modal-backdrop { position: fixed; z-index: 20; inset: 0; display: grid; place-items: center; padding: 16px; background: #10182880; }
        .sw-modal { width: min(480px, 100%); max-height: min(90vh, 760px); overflow-y: auto; padding: 22px; background: white; border-radius: 18px; box-shadow: 0 24px 70px #10182840; }
        .sw-modal-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 18px; }
        .sw-modal-heading h2 { margin: 0; font-size: 21px; }
        .sw-modal-heading p { margin: 5px 0 0; color: var(--muted); font-size: 13px; }
        .sw-close { width: 36px; height: 36px; display: grid; place-items: center; color: #657087; background: #f5f6f9; border: 0; border-radius: 10px; }
        .sw-form { display: grid; gap: 11px; }
        .sw-form label { color: #526078; font-size: 12px; font-weight: 700; }
        .sw-form input, .sw-form select { width: 100%; min-height: 42px; margin-top: 5px; padding: 9px 11px; color: var(--ink); background: white; border: 1px solid #dce2eb; border-radius: 9px; }
        .sw-type-switch { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 4px; }
        .sw-type-switch button { min-height: 40px; display: flex; align-items: center; justify-content: center; gap: 7px; color: #657087; background: #f5f6f9; border: 1px solid transparent; border-radius: 9px; }
        .sw-type-switch button[aria-pressed="true"] { color: var(--brand); background: #eff1ff; border-color: #cfd4ff; font-weight: 700; }
        .sw-form-error { margin: 0; color: #b4232c; font-size: 12px; }
        .sw-modal-actions { display: flex; justify-content: flex-end; gap: 9px; margin-top: 8px; }
        .sw-sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
        @media (max-width: 1000px) {
          .sw-sidebar { width: 220px; flex-basis: 220px; }
          .sw-content { padding: 25px 20px; }
          .sw-summary { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .sw-profile-text { display: none; }
        }
        @media (max-width: 720px) {
          .sw-sidebar { position: fixed; z-index: 31; inset: 0 auto 0 0; width: min(280px, 84vw); min-height: 100dvh; transform: translateX(-105%); transition: transform .2s ease; box-shadow: 12px 0 40px #10182820; }
          .sw-sidebar.is-open { transform: translateX(0); }
          .sw-backdrop.is-visible { position: fixed; z-index: 30; inset: 0; display: block; background: #10182870; border: 0; }
          .sw-menu { width: 38px; height: 38px; display: grid; place-items: center; color: #536078; background: white; border: 1px solid var(--line); border-radius: 10px; }
          .sw-topbar { min-height: 64px; padding: 11px 14px; }
          .sw-topbar-right { gap: 9px; }
          .sw-search { width: min(40vw, 220px); }
          .sw-content { padding: 22px 14px; }
          .sw-welcome { align-items: flex-start; flex-direction: column; }
          .sw-panels { grid-template-columns: 1fr; }
          .sw-footer { flex-direction: column; }
        }
        @media (max-width: 480px) {
          .sw-topbar { flex-wrap: wrap; }
          .sw-topbar-right { flex: 1; justify-content: flex-end; }
          .sw-month { flex: 1; }
          .sw-month input { width: 125px; }
          .sw-search { flex: 1; width: auto; }
          .sw-profile { gap: 0; }
          .sw-avatar { width: 36px; height: 36px; flex-basis: 36px; }
          .sw-summary { gap: 9px; }
          .sw-card { padding: 14px; }
          .sw-card-label { font-size: 11px; }
          .sw-card h2 { margin-top: 13px; font-size: 20px; }
          .sw-bar-row { grid-template-columns: 84px 1fr; gap: 8px; }
          .sw-bar-value { grid-column: 2; }
          .sw-table { min-width: 620px; }
          .sw-modal { padding: 18px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .sw-sidebar { transition: none; }
        }
      `}</style>

      <button
        className={`sw-backdrop${isSidebarOpen ? " is-visible" : ""}`}
        aria-label="Close navigation"
        onClick={() => setIsSidebarOpen(false)}
      />

      <aside className={`sw-sidebar${isSidebarOpen ? " is-open" : ""}`}>
        <a className="sw-brand" href="/Dashboard">
          <span className="sw-brand-icon">
            <ChartNoAxesColumnIncreasing size={22} />
          </span>
          <span className="sw-brand-name">
            Spend<span>Wise</span>
          </span>
        </a>

        <p className="sw-section-label">WORKSPACE</p>

        <nav className="sw-nav" aria-label="Main navigation">
          <a href="/Dashboard" aria-current="page">
            <Wallet size={18} />
            Dashboard
          </a>
          <a href="#transactions" onClick={() => setIsSidebarOpen(false)}>
            <ArrowDownLeft size={18} />
            Transactions
          </a>
          <a href="#reports" onClick={() => setIsSidebarOpen(false)}>
            <ChartNoAxesColumnIncreasing size={18} />
            Spending report
          </a>
        </nav>

        <div className="sw-sidebar-bottom">
          <div className="sw-tip">
            <Wallet size={20} />
            <strong>Your data, your account</strong>
            <p>Your transactions are saved online for your signed-in account.</p>
          </div>

          <button
            className="sw-signout"
            type="button"
            onClick={() => void handleSignOut()}
          >
            <LogOut size={18} />
            Sign out
          </button>
        </div>
      </aside>

      <div className="sw-main">
        <header className="sw-topbar">
          <button
            className="sw-menu"
            type="button"
            aria-label="Open navigation"
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu size={20} />
          </button>

          <label className="sw-month">
            <CalendarDays size={18} />
            <span className="sw-sr-only">Dashboard month</span>
            <input
              type="month"
              aria-label="Select dashboard month"
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
            />
          </label>

          <div className="sw-topbar-right">
            <label className="sw-search">
              <Search size={17} />
              <input
                type="search"
                placeholder="Search this month"
                aria-label="Search transactions"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>

            <div className="sw-profile">
              {profilePicture ? (
                <img
                  className="sw-avatar"
                  src={profilePicture}
                  alt={`${profileName} profile`}
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="sw-avatar" aria-label={`User ${profileInitial}`}>
                  {profileInitial}
                </div>
              )}

              <div className="sw-profile-text">
                <strong>{profileName}</strong>
                <span>{profileEmail}</span>
              </div>
            </div>
          </div>
        </header>

        <main className="sw-content">
          <section className="sw-welcome">
            <div>
              <p className="sw-eyebrow">YOUR FINANCIAL OVERVIEW</p>
              <h1>Hello, {profileName.split(" ")[0]} 👋</h1>
              <p>
                {formatMonth(selectedMonth)} · Your income and spending at a
                glance.
              </p>
            </div>

            <button
              className="sw-primary"
              type="button"
              onClick={() => {
                setFormError("");
                setShowAddForm(true);
              }}
            >
              <Plus size={18} />
              Add transaction
            </button>
          </section>

          {dataError && (
            <p className="sw-error" role="alert">
              {dataError}
            </p>
          )}

          <section className="sw-summary" aria-label="Monthly financial summary">
            <article className="sw-card">
              <div className="sw-card-label">
                <span>Balance this month</span>
                <span className="sw-card-icon"><Wallet size={18} /></span>
              </div>
              <h2>{formatCurrency(balance)}</h2>
              <p className="sw-card-caption">Income minus expenses</p>
            </article>

            <article className="sw-card">
              <div className="sw-card-label">
                <span>Income</span>
                <span className="sw-card-icon"><ArrowDownLeft size={18} /></span>
              </div>
              <h2>{formatCurrency(income)}</h2>
              <p className="sw-card-caption">
                Recorded in {formatMonth(selectedMonth)}
              </p>
            </article>

            <article className="sw-card">
              <div className="sw-card-label">
                <span>Expenses</span>
                <span className="sw-card-icon"><ArrowUpRight size={18} /></span>
              </div>
              <h2>{formatCurrency(expenses)}</h2>
              <p className="sw-card-caption">
                Recorded in {formatMonth(selectedMonth)}
              </p>
            </article>

            <article className="sw-card">
              <div className="sw-card-label">
                <span>Savings rate</span>
                <span className="sw-card-icon">
                  <ChartNoAxesColumnIncreasing size={18} />
                </span>
              </div>
              <h2>{savingsRate}%</h2>
              <p className="sw-card-caption">
                {income === 0
                  ? "Add income to calculate"
                  : "Of recorded income retained"}
              </p>
            </article>
          </section>

          <section className="sw-panels" id="reports">
            <article className="sw-card">
              <h2 className="sw-panel-title">Spending by category</h2>
              <p className="sw-panel-subtitle">
                Expenses recorded in {formatMonth(selectedMonth)}
              </p>

              {spendingByCategory.length > 0 ? (
                <div className="sw-bars">
                  {spendingByCategory.map((item, index) => {
                    const share =
                      expenses > 0 ? (item.value / expenses) * 100 : 0;

                    return (
                      <div className="sw-bar-row" key={item.name}>
                        <span>{item.name}</span>
                        <div
                          className="sw-bar-track"
                          role="progressbar"
                          aria-label={`${item.name} share of expenses`}
                          aria-valuenow={Math.round(share)}
                          aria-valuemin={0}
                          aria-valuemax={100}
                        >
                          <div
                            className="sw-bar-fill"
                            style={{
                              width: `${share}%`,
                              background:
                                CATEGORY_COLORS[index % CATEGORY_COLORS.length],
                            }}
                          />
                        </div>
                        <strong className="sw-bar-value">
                          {formatCurrency(item.value)}
                        </strong>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="sw-empty">
                  No expenses this month yet. Add one to see the breakdown.
                </div>
              )}
            </article>

            <article className="sw-card">
              <h2 className="sw-panel-title">Month at a glance</h2>
              <p className="sw-panel-subtitle">{formatMonth(selectedMonth)}</p>

              <div className="sw-bars">
                <div className="sw-bar-row">
                  <span>Income</span>
                  <div className="sw-bar-track">
                    <div
                      className="sw-bar-fill"
                      style={{
                        width: `${
                          income + expenses === 0
                            ? 0
                            : (income / (income + expenses)) * 100
                        }%`,
                        background: "#10b981",
                      }}
                    />
                  </div>
                  <strong className="sw-bar-value">
                    {formatCurrency(income)}
                  </strong>
                </div>

                <div className="sw-bar-row">
                  <span>Expenses</span>
                  <div className="sw-bar-track">
                    <div
                      className="sw-bar-fill"
                      style={{
                        width: `${
                          income + expenses === 0
                            ? 0
                            : (expenses / (income + expenses)) * 100
                        }%`,
                        background: "#f59e0b",
                      }}
                    />
                  </div>
                  <strong className="sw-bar-value">
                    {formatCurrency(expenses)}
                  </strong>
                </div>
              </div>

              {monthTransactions.length === 0 && (
                <div className="sw-empty">
                  No transactions for this month.
                </div>
              )}
            </article>
          </section>

          <section className="sw-card sw-transaction-panel" id="transactions">
            <h2 className="sw-panel-title">Transactions</h2>
            <p className="sw-panel-subtitle">
              {visibleTransactions.length} shown · {formatMonth(selectedMonth)}
            </p>

            {visibleTransactions.length > 0 ? (
              <div className="sw-table-wrap">
                <table className="sw-table">
                  <thead>
                    <tr>
                      <th scope="col">Transaction</th>
                      <th scope="col">Category</th>
                      <th scope="col">Date</th>
                      <th scope="col">Amount</th>
                      <th scope="col">Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {visibleTransactions.map((transaction) => (
                      <tr key={transaction.id}>
                        <td>
                          <span className="sw-transaction-name">
                            <span className="sw-category-icon">
                              <CategoryIcon category={transaction.category} />
                            </span>
                            {transaction.title}
                          </span>
                        </td>
                        <td>{transaction.category}</td>
                        <td>{formatDate(transaction.date)}</td>
                        <td
                          className={
                            transaction.type === "income"
                              ? "sw-amount-income"
                              : "sw-amount-expense"
                          }
                        >
                          {transaction.type === "income" ? "+" : "−"}
                          {formatCurrency(transaction.amount)}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="sw-danger"
                            aria-label={`Delete ${transaction.title}`}
                            title="Delete transaction"
                            onClick={() =>
                              void handleDeleteTransaction(transaction.id)
                            }
                          >
                            <Trash2 size={16} />
                            <span className="sw-sr-only">Delete</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="sw-empty">
                {search
                  ? "No transactions match your search."
                  : "No transactions for this month yet. Add your first one to get started."}
              </div>
            )}
          </section>

          <footer className="sw-footer">
            <span>SpendWise · Your money, in perspective.</span>
            <span>Transactions are stored in your account.</span>
          </footer>
        </main>
      </div>

      {showAddForm && (
        <div
          className="sw-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowAddForm(false);
            }
          }}
        >
          <section
            className="sw-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-transaction-title"
          >
            <div className="sw-modal-heading">
              <div>
                <h2 id="add-transaction-title">Add transaction</h2>
                <p>Record income or an expense.</p>
              </div>
              <button
                className="sw-close"
                type="button"
                aria-label="Close"
                onClick={() => setShowAddForm(false)}
              >
                <X size={19} />
              </button>
            </div>

            <form className="sw-form" onSubmit={handleAddTransaction}>
              <div className="sw-type-switch">
                <button
                  type="button"
                  aria-pressed={type === "expense"}
                  onClick={() => handleTypeChange("expense")}
                >
                  <ArrowUpRight size={17} />
                  Expense
                </button>
                <button
                  type="button"
                  aria-pressed={type === "income"}
                  onClick={() => handleTypeChange("income")}
                >
                  <ArrowDownLeft size={17} />
                  Income
                </button>
              </div>

              <label>
                Description
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="What was it for?"
                  maxLength={100}
                  required
                />
              </label>

              <label>
                Amount (₹)
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="0.00"
                  required
                />
              </label>

              <label>
                Category
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                >
                  {(type === "income"
                    ? INCOME_CATEGORIES
                    : EXPENSE_CATEGORIES
                  ).map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Date
                <input
                  type="date"
                  value={date}
                  max={getToday()}
                  onChange={(event) => setDate(event.target.value)}
                  required
                />
              </label>

              {formError && (
                <p className="sw-form-error" role="alert">
                  {formError}
                </p>
              )}

              <div className="sw-modal-actions">
                <button
                  type="button"
                  className="sw-secondary"
                  onClick={() => setShowAddForm(false)}
                >
                  Cancel
                </button>
                <button className="sw-primary" type="submit" disabled={isSaving}>
                  {isSaving ? "Saving…" : "Save transaction"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}