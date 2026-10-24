import {it,expect,describe} from 'vitest';
import {calculate} from '../worker/facts';
import {mockReport,validateReport,ReportSchema} from '../worker/guard';
import {sample,controlledCases} from './fixtures';
const set=calculate(sample);
describe('independently labeled controlled cases',()=>{
 for(const c of controlledCases())it(c.name,()=>expect(validateReport(c.report,c.set).status).toBe(c.invalid?'REJECTED':'ACCEPTED'));
});
it('returns VALUE_MISMATCH, not a silent correction',()=>{const r=mockReport(set);r.claims[0].value='15200';const v=validateReport(r,set);expect(v.issues[0].code).toBe('VALUE_MISMATCH');expect(v.report).toBeNull();expect(r.claims[0].value).toBe('15200')});
it('rejects duplicate authoritative facts',()=>{const altered=structuredClone(set);altered.facts.push(altered.facts[0]);expect(validateReport(mockReport(set),altered).issues.map(i=>i.code)).toContain('CONFLICTING_FACTS')});
it('rejects missing evidence identifiers structurally',()=>{const r=mockReport(set) as any;delete r.claims[0].fact_id;expect(ReportSchema.safeParse(r).success).toBe(false)});
it('rejects unregistered insight prose including spelled-out numbers',()=>{const r=mockReport(set) as any;r.insights=['Revenue tripled'];expect(validateReport(r,set).status).toBe('REJECTED')});
it('rejects nonnumeric claims and unsupported financial explanations',()=>{const r=mockReport(set) as any;r.insights=['Demand increased'];expect(validateReport(r,set).status).toBe('REJECTED')});
it('rejects zero denominators',()=>{const s=structuredClone(set);s.facts.find(f=>f.id==='sales_total')!.value='0.00';const r=mockReport(set);r.claims.find(c=>c.fact_id==='sales_total')!.value='0.00';expect(validateReport(r,s).issues.map(i=>i.code)).toContain('ZERO_DENOMINATOR')});
it('validates reporting-period fact value separately',()=>{const r=mockReport(set);r.claims.find(c=>c.fact_id==='reporting_period')!.value='bogus';expect(validateReport(r,set).status).toBe('REJECTED')});
