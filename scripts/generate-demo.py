"""Deterministic synthetic fixtures. No real customers or business performance."""
import csv
from pathlib import Path
from decimal import Decimal
from datetime import date, timedelta
out=Path(__file__).resolve().parents[1]/'data'/'synthetic-demo.csv'
products=[('SYN-A','Ceramic studio mug','12.95'),('SYN-B','Linen notebook','8.50'),('SYN-C','Desk organizer','24.99'),('SYN-D','Gift wrapping set','4.25'),('SYN-E','Cotton market tote','16.75')]
with out.open('w',newline='',encoding='utf-8') as f:
 w=csv.writer(f);w.writerow(['InvoiceNo','StockCode','Description','Quantity','InvoiceDate','UnitPrice'])
 for i in range(100):
  code,name,price=products[i%5];qty=(i*7)%12+1;invoice=f'SYN{10000+i//2}'
  if i%17==0:invoice='C'+invoice;qty=-qty
  if i in [29,58]:price='0'
  w.writerow([invoice,code,name,qty,(date(2026,9,1)+timedelta(days=(i//2)%30)).isoformat(),price])
print(out)
