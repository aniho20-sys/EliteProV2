// Single source of truth for displaying money — see CLAUDE.md convention #31.
// Previously 3 different call sites formatted amounts 3 different ways
// (toFixed-only, toLocaleString-only, and a hardcoded "£" ignoring the
// trainer's actual currency entirely), which was a real display bug for
// any non-GBP trainer, not just visual inconsistency.
export const CURRENCIES = ['HKD', 'USD', 'GBP', 'EUR', 'SGD', 'AUD'];

export function formatCurrency(amount, currencyCode) {
  const n = Number(amount) || 0;
  const formatted = new Intl.NumberFormat('en-GB', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
  return `${currencyCode || 'GBP'} ${formatted}`;
}
