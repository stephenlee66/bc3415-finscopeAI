"""
Analytics Engine — Parses uploaded financial documents to generate
dynamic dashboard statistics: spending by category, vendor totals,
monthly trends, and anomaly detection.

Works on CSVs with financial columns (amount, debit, credit, vendor, category, date).
"""
import re
from pathlib import Path
from datetime import datetime
from collections import defaultdict
import pandas as pd


# Common column name patterns for auto-detection
AMOUNT_PATTERNS = ["amount", "total", "price", "cost", "value", "debit", "charge", "fee"]
VENDOR_PATTERNS = ["vendor", "supplier", "company", "merchant", "payee", "from", "description", "name"]
CATEGORY_PATTERNS = ["category", "type", "department", "class", "group", "expense_type"]
DATE_PATTERNS = ["date", "invoice_date", "transaction_date", "payment_date", "created"]
CREDIT_PATTERNS = ["credit", "income", "revenue", "deposit", "payment_received"]
DEBIT_PATTERNS = ["debit", "expense", "withdrawal", "payment", "charge"]


def _find_column(columns: list[str], patterns: list[str]) -> str | None:
    """Find a column matching any of the patterns (case-insensitive)."""
    cols_lower = {c.lower().strip(): c for c in columns}
    for pattern in patterns:
        for col_lower, col_original in cols_lower.items():
            if pattern in col_lower:
                return col_original
    return None


def _parse_amount(val) -> float | None:
    """Parse a value into a float, handling currency symbols and commas."""
    if pd.isna(val):
        return None
    if isinstance(val, (int, float)):
        return float(val)
    s = str(val).strip()
    s = re.sub(r'[,$\s]', '', s)
    s = s.strip('()')  # handle (1234.56) negative notation
    try:
        return abs(float(s))
    except (ValueError, TypeError):
        return None


def _parse_date(val) -> str | None:
    """Try to parse a date value into YYYY-MM format."""
    if pd.isna(val):
        return None
    s = str(val).strip()
    for fmt in ["%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%Y/%m/%d", "%d-%m-%Y", "%m-%d-%Y"]:
        try:
            dt = datetime.strptime(s[:10], fmt)
            return dt.strftime("%Y-%m")
        except ValueError:
            continue
    # Try pandas
    try:
        dt = pd.to_datetime(s)
        return dt.strftime("%Y-%m")
    except Exception:
        return None


def analyze_document(file_path: str) -> dict:
    """
    Analyze a single financial document and extract structured data.

    Returns:
        {
            "transactions": list of {amount, vendor, category, date_month},
            "totals": {total_spend, total_income, net},
            "has_financial_data": bool
        }
    """
    path = Path(file_path)
    ext = path.suffix.lower()

    if ext not in (".csv", ".xlsx", ".xls"):
        return {"transactions": [], "totals": {"total_spend": 0, "total_income": 0, "net": 0}, "has_financial_data": False}

    try:
        if ext == ".csv":
            df = pd.read_csv(path)
        else:
            df = pd.read_excel(path)
    except Exception:
        return {"transactions": [], "totals": {"total_spend": 0, "total_income": 0, "net": 0}, "has_financial_data": False}

    columns = list(df.columns)

    # Auto-detect columns
    amount_col = _find_column(columns, AMOUNT_PATTERNS)
    vendor_col = _find_column(columns, VENDOR_PATTERNS)
    category_col = _find_column(columns, CATEGORY_PATTERNS)
    date_col = _find_column(columns, DATE_PATTERNS)
    credit_col = _find_column(columns, CREDIT_PATTERNS)
    debit_col = _find_column(columns, DEBIT_PATTERNS)

    # Need at least an amount-like column
    has_financial = amount_col is not None or debit_col is not None or credit_col is not None

    transactions = []
    total_spend = 0.0
    total_income = 0.0

    for _, row in df.iterrows():
        # Determine amount
        amt = None
        is_income = False

        if debit_col and credit_col:
            debit = _parse_amount(row.get(debit_col))
            credit = _parse_amount(row.get(credit_col))
            if debit and debit > 0:
                amt = debit
            elif credit and credit > 0:
                amt = credit
                is_income = True
        elif amount_col:
            amt = _parse_amount(row.get(amount_col))

        if amt is None or amt == 0:
            continue

        # Vendor
        vendor = "Unknown"
        if vendor_col:
            v = row.get(vendor_col)
            if pd.notna(v) and str(v).strip():
                vendor = str(v).strip()

        # Category
        category = "Uncategorized"
        if category_col:
            c = row.get(category_col)
            if pd.notna(c) and str(c).strip():
                category = str(c).strip()

        # Date
        date_month = None
        if date_col:
            date_month = _parse_date(row.get(date_col))

        if is_income:
            total_income += amt
        else:
            total_spend += amt

        transactions.append({
            "amount": amt,
            "vendor": vendor,
            "category": category,
            "date_month": date_month,
            "is_income": is_income,
        })

    return {
        "transactions": transactions,
        "totals": {
            "total_spend": total_spend,
            "total_income": total_income,
            "net": total_income - total_spend,
        },
        "has_financial_data": has_financial,
    }


def generate_dashboard_data(document_registry: dict) -> dict:
    """
    Analyze ALL uploaded documents and generate dashboard statistics.

    Returns complete dashboard data:
        {
            "kpis": {total_spend, total_income, doc_count, anomaly_count, potential_savings},
            "spending_by_category": [{name, amount}],
            "spending_by_vendor": [{name, amount}],
            "monthly_trend": [{month, spend, income}],
            "anomalies": [{type, severity, title, description}],
        }
    """
    all_transactions = []
    doc_count = len(document_registry)

    # Analyze each document
    for doc_id, doc_info in document_registry.items():
        source = doc_info.get("metadata", {}).get("source", "")
        if source:
            result = analyze_document(source)
            all_transactions.extend(result["transactions"])

    # ─── Spending by Category ───
    category_totals = defaultdict(float)
    for t in all_transactions:
        if not t["is_income"]:
            category_totals[t["category"]] += t["amount"]

    spending_by_category = sorted(
        [{"name": k, "amount": round(v, 2)} for k, v in category_totals.items()],
        key=lambda x: x["amount"], reverse=True
    )

    # ─── Spending by Vendor ───
    vendor_totals = defaultdict(float)
    for t in all_transactions:
        if not t["is_income"]:
            vendor_totals[t["vendor"]] += t["amount"]

    spending_by_vendor = sorted(
        [{"name": k, "amount": round(v, 2)} for k, v in vendor_totals.items()],
        key=lambda x: x["amount"], reverse=True
    )[:10]  # Top 10

    # ─── Monthly Trend ───
    monthly_spend = defaultdict(float)
    monthly_income = defaultdict(float)
    for t in all_transactions:
        if t["date_month"]:
            if t["is_income"]:
                monthly_income[t["date_month"]] += t["amount"]
            else:
                monthly_spend[t["date_month"]] += t["amount"]

    all_months = sorted(set(list(monthly_spend.keys()) + list(monthly_income.keys())))
    monthly_trend = [
        {
            "month": m,
            "spend": round(monthly_spend.get(m, 0), 2),
            "income": round(monthly_income.get(m, 0), 2),
        }
        for m in all_months
    ]

    # ─── Anomaly Detection ───
    anomalies = []

    # Check for duplicate amounts from same vendor
    vendor_amounts = defaultdict(list)
    for t in all_transactions:
        if not t["is_income"]:
            key = (t["vendor"], t["amount"])
            vendor_amounts[key].append(t)

    for (vendor, amount), txns in vendor_amounts.items():
        if len(txns) > 1 and vendor != "Unknown":
            anomalies.append({
                "type": "duplicate",
                "severity": "high",
                "title": f"Possible duplicate: {vendor}",
                "description": f"{len(txns)} transactions of ${amount:,.2f} from {vendor}. Potential duplicate billing.",
                "agent": "Auditor",
            })

    # Check for unusually high amounts (> 4x median, excluding common recurring categories)
    recurring_categories = {"payroll", "rent", "salary", "wages", "insurance"}
    expense_amounts = [t["amount"] for t in all_transactions if not t["is_income"] and t["amount"] > 0]
    if len(expense_amounts) >= 3:
        sorted_amounts = sorted(expense_amounts)
        median_amount = sorted_amounts[len(sorted_amounts) // 2]
        if median_amount > 0:
            for t in all_transactions:
                cat_lower = t.get("category", "").lower()
                vendor_lower = t.get("vendor", "").lower()
                is_recurring = any(r in cat_lower or r in vendor_lower for r in recurring_categories)
                if (not t["is_income"]
                    and not is_recurring
                    and t["amount"] > median_amount * 4
                    and t["amount"] > 2000):
                    anomalies.append({
                        "type": "unusual_amount",
                        "severity": "medium",
                        "title": f"Unusually high: {t['vendor']}",
                        "description": f"${t['amount']:,.2f} from {t['vendor']} is {t['amount']/median_amount:.0f}x the median expense (${median_amount:,.2f}).",
                        "agent": "Auditor",
                    })

    # Deduplicate anomalies by title
    seen_titles = set()
    unique_anomalies = []
    for a in anomalies:
        if a["title"] not in seen_titles:
            seen_titles.add(a["title"])
            unique_anomalies.append(a)

    # ─── KPIs ───
    total_spend = sum(t["amount"] for t in all_transactions if not t["is_income"])
    total_income = sum(t["amount"] for t in all_transactions if t["is_income"])
    potential_savings = sum(
        vendor_amounts[(v, a)][0]["amount"]
        for (v, a) in vendor_amounts
        if len(vendor_amounts[(v, a)]) > 1 and v != "Unknown"
    )

    return {
        "kpis": {
            "total_spend": round(total_spend, 2),
            "total_income": round(total_income, 2),
            "net": round(total_income - total_spend, 2),
            "doc_count": doc_count,
            "transaction_count": len(all_transactions),
            "anomaly_count": len(unique_anomalies),
            "potential_savings": round(potential_savings, 2),
        },
        "spending_by_category": spending_by_category,
        "spending_by_vendor": spending_by_vendor,
        "monthly_trend": monthly_trend,
        "anomalies": unique_anomalies,
    }
