"""Convert UCI Online Retail Excel to a small, deterministic, identifier-free CSV.
Amounts are decimal strings; TypeScript performs authoritative calculations.
"""
import argparse, csv, hashlib, json, sys
from pathlib import Path
from decimal import Decimal, InvalidOperation
import pandas as pd
COLS=['InvoiceNo','StockCode','Description','Quantity','InvoiceDate','UnitPrice','CustomerID','Country']
def convert(source,output,limit=200):
 df=pd.read_excel(source,dtype={'InvoiceNo':str,'StockCode':str,'UnitPrice':str,'Quantity':str})
 missing=set(COLS)-set(df.columns)
 if missing:raise ValueError(f'Missing expected UCI columns: {sorted(missing)}')
 if not 1<=limit<=10000:raise ValueError('Limit must be 1–10,000 rows.')
 rows=[];skipped={};seen_products={}
 def skip(reason):skipped[reason]=skipped.get(reason,0)+1
 # First eligible source rows, preserving source order. Never random or selected for favorable results.
 for _,r in df.iterrows():
  if len(rows)>=limit:break
  invoice=str(r.InvoiceNo).strip();code=str(r.StockCode).strip()
  if pd.isna(r.Description) or not invoice or not code:skip('MISSING_IDENTIFIERS_OR_DESCRIPTION');continue
  name=str(r.Description).strip()
  try:
   q=Decimal(str(r.Quantity));p=Decimal(str(r.UnitPrice));dt=pd.to_datetime(r.InvoiceDate,errors='raise')
   if not q.is_finite() or q!=q.to_integral_value() or abs(q)>999999999:skip('INVALID_QUANTITY');continue
   if not p.is_finite() or p.as_tuple().exponent < -4 or abs(p)>=Decimal('1000000000000'):skip('INVALID_PRICE_PRECISION_OR_RANGE');continue
   if pd.isna(dt):skip('INVALID_DATE');continue
  except (InvalidOperation,ValueError,TypeError):skip('INVALID_NUMERIC_OR_DATE');continue
  if not name or len(name)>200 or len(invoice)>80 or len(code)>80:skip('INVALID_LENGTH');continue
  if code in seen_products and seen_products[code]!=name:skip('CONFLICTING_DESCRIPTION');continue
  seen_products[code]=name
  rows.append([invoice,code,name,str(int(q)),dt.strftime('%Y-%m-%dT%H:%M:%S'),format(p,'f')])
 output=Path(output);output.parent.mkdir(parents=True,exist_ok=True)
 with output.open('w',newline='',encoding='utf-8') as f:
  w=csv.writer(f);w.writerow(COLS[:6]);w.writerows(rows)
 summary={'source':'UCI Online Retail','citation':'Chen, D. (2015). Online Retail [Dataset]. UCI Machine Learning Repository. https://doi.org/10.24432/C5BW33','license':'CC BY 4.0','sourceFileSha256':hashlib.sha256(Path(source).read_bytes()).hexdigest(),'outputSha256':hashlib.sha256(output.read_bytes()).hexdigest(),'sourceRows':len(df),'exportedRows':len(rows),'selection':'first eligible rows in original source order','skippedBeforeLimit':skipped,'customerIdentifiersExported':False,'policy':'Preserve C invoices, negative/zero quantities and nonpositive prices for explicit runtime classification. Export decimal text, no binary arithmetic. Description conflicts are skipped and counted.'}
 output.with_suffix('.provenance.json').write_text(json.dumps(summary,indent=2)+'\n',encoding='utf-8')
 print(json.dumps(summary,indent=2))
 return summary
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('source');p.add_argument('--output',default='data/uci-demo.csv');p.add_argument('--limit',type=int,default=200);a=p.parse_args();convert(a.source,a.output,a.limit)
