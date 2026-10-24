# Accounting contract

This is a historical dataset summarizer, not a ledger or accounting product. Currency is explicitly GBP; CSVs in other currencies must not be relabeled as GBP.

| Metric | Exact definition |
|---|---|
| Gross valid sales | Sum of `Quantity × UnitPrice` for positive integer quantities, positive supported prices and invoice numbers not starting with C/c. Returns are not deducted. |
| Valid transaction/order count | Number of distinct InvoiceNo values with at least one valid positive-sale line. It is not the CSV row count. |
| Sales line count | Number of included positive-sale rows. |
| Return/cancellation count | Number of nonzero integer-quantity rows with a C/c invoice or negative quantity. Counts lines, once per row. Price does not affect this classification. No matching against sales is attempted. |
| Average valid order value | Exact unrounded gross valid sales divided by distinct valid order count; zero when no valid orders. |
| Top three products | StockCode aggregation by exact positive sales value; descending exact value, code tie break. Conflicting descriptions for a code fail validation. |
| Reporting period | Earliest to latest ISO calendar date across accepted sales and return/cancellation rows. Excluded rows do not extend the period. No timezone conversion or period comparison is attempted. |
| Product share | Approved rounded top product GBP fact ÷ approved rounded sales_total GBP fact × 100, rounded half up to 2 decimal places. Denominator must be positive. |

Decimal.js uses 50 significant digits. UnitPrice accepts plain positive decimal text with at most 12 integer and four fractional digits. Quantity is a signed integer with at most nine digits, nonzero. The 10,000-row limit keeps all possible aggregates below 30 significant digits, so the configured precision covers the supported domain. All monetary facts round half up to two decimal places only after aggregation. Average order value uses the unrounded gross. Rounded product facts can differ slightly from rounded gross when re-summed; shares are explicitly based on published rounded facts. A very small positive dataset may round to zero sales; percentage claims are then omitted/rejected.

Missing identity/description, invalid dates, conflicting product descriptions and inconsistent invoice dates reject the entire file. Numeric anomalies exclude a line and increment a displayed reason count. Zero/fractional/oversized quantities are excluded before cancellation classification. Positive-sale lines with zero/negative/non-finite/exponent-form or too-precise prices are excluded. Structural CSV errors reject the file. Duplicate headers and unknown columns are rejected; optional CustomerID and Country are accepted then discarded. Missing CustomerID has no effect.

Rows are not deduplicated automatically. The source lacks a reliable line-level identity, and identical invoice/product lines can be legitimate. InvoiceNo is the order grouping key; uploaded multi-store data must first have globally unique invoice IDs. Uploaded data should be complete for the desired reporting interval; RevenueGuard does not infer absent transactions or validate business completeness.

No growth, causality, profit, net revenue, tax, customer-level analysis or forecasting is inferred. A passing report confirms consistency with the uploaded source under this contract, not that the input is true or complete.
