import React, { useState } from 'react';
import {
  DollarSign,
  TrendingUp,
  Landmark,
  Calculator,
  Briefcase,
  CheckCircle,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
  PieChart,
} from 'lucide-react';
import { MOCK_FINANCIAL_SCHEMES } from '../data/mockData';
import { FinancialScheme } from '../types';

export function FinancialLiteracyPage() {
  const [activeTab, setActiveTab] = useState<'schemes' | 'calculator' | 'budgeting' | 'entrepreneurship'>('schemes');
  const [selectedProvider, setSelectedProvider] = useState<string>('All');

  // Interactive Loan EMI Calculator state
  const [loanAmount, setLoanAmount] = useState<number>(200000); // 2 Lakhs default
  const [interestRate, setInterestRate] = useState<number>(7.5); // 7.5% per annum
  const [loanTenureMonths, setLoanTenureMonths] = useState<number>(24); // 24 months

  // Calculate EMI
  const monthlyRate = interestRate / 12 / 100;
  const emi =
    monthlyRate > 0
      ? Math.round(
          (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, loanTenureMonths)) /
            (Math.pow(1 + monthlyRate, loanTenureMonths) - 1)
        )
      : Math.round(loanAmount / loanTenureMonths);

  const totalPayment = emi * loanTenureMonths;
  const totalInterest = totalPayment - loanAmount;

  const filteredSchemes = MOCK_FINANCIAL_SCHEMES.filter(
    (s) => selectedProvider === 'All' || s.provider === selectedProvider
  );

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
            <DollarSign className="size-3.5" />
            <span>Financial Independence &amp; Wealth Building</span>
          </div>
          <h1 className="mt-2 text-2xl font-black text-slate-900 dark:text-white sm:text-3xl">
            Financial Literacy &amp; Women Schemes
          </h1>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm">
            Government grants, low-interest microfinance loans, budgeting frameworks, and startup capital.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto border-b border-slate-200 scrollbar-none dark:border-slate-800">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('schemes')}
            className={`border-b-2 pb-3 text-sm font-bold transition whitespace-nowrap ${
              activeTab === 'schemes'
                ? 'border-amber-600 text-amber-600 dark:border-amber-400 dark:text-amber-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            Govt &amp; NGO Schemes ({MOCK_FINANCIAL_SCHEMES.length})
          </button>
          <button
            onClick={() => setActiveTab('calculator')}
            className={`border-b-2 pb-3 text-sm font-bold transition whitespace-nowrap ${
              activeTab === 'calculator'
                ? 'border-amber-600 text-amber-600 dark:border-amber-400 dark:text-amber-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            Interactive Loan &amp; EMI Calculator
          </button>
          <button
            onClick={() => setActiveTab('budgeting')}
            className={`border-b-2 pb-3 text-sm font-bold transition whitespace-nowrap ${
              activeTab === 'budgeting'
                ? 'border-amber-600 text-amber-600 dark:border-amber-400 dark:text-amber-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            50/30/20 Budgeting Rule
          </button>
          <button
            onClick={() => setActiveTab('entrepreneurship')}
            className={`border-b-2 pb-3 text-sm font-bold transition whitespace-nowrap ${
              activeTab === 'entrepreneurship'
                ? 'border-amber-600 text-amber-600 dark:border-amber-400 dark:text-amber-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            Women Entrepreneurship Toolkit
          </button>
        </div>
      </div>

      {/* 1. Schemes & Grants Tab */}
      {activeTab === 'schemes' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {filteredSchemes.map((scheme) => (
              <div
                key={scheme.id}
                className="flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                      {scheme.type} · {scheme.provider}
                    </span>
                    <span className="text-xs font-bold text-emerald-600">{scheme.maxAmount}</span>
                  </div>

                  <h3 className="mt-3 text-base font-bold text-slate-900 dark:text-white">{scheme.name}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">{scheme.benefits}</p>

                  <div className="mt-4 rounded-2xl bg-slate-50 p-3.5 dark:bg-slate-800/40">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Eligibility Criteria</h4>
                    <ul className="mt-2 space-y-1 text-xs text-slate-600 dark:text-slate-400">
                      {scheme.eligibility.map((el, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <CheckCircle className="size-3.5 shrink-0 text-emerald-600 mt-0.5" />
                          <span>{el}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <a
                  href={scheme.officialLink}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-6 flex items-center justify-center gap-1.5 rounded-xl bg-amber-600 py-2.5 text-xs font-bold text-white shadow hover:bg-amber-700"
                >
                  Apply on Official Portal <ExternalLink className="size-3.5" />
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Interactive Loan & EMI Calculator Tab */}
      {activeTab === 'calculator' && (
        <div className="grid grid-cols-1 gap-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:grid-cols-2">
          {/* Sliders */}
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Microfinance &amp; Business Loan Calculator
            </h3>
            <p className="text-xs text-slate-500">
              Calculate your monthly repayment amounts for Mudra, Stand-Up India, or SHG credit lines.
            </p>

            <div>
              <div className="flex justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                <span>Loan Principal Amount</span>
                <span className="font-mono text-amber-600">₹{loanAmount.toLocaleString('en-IN')}</span>
              </div>
              <input
                type="range"
                min="10000"
                max="1000000"
                step="5000"
                value={loanAmount}
                onChange={(e) => setLoanAmount(Number(e.target.value))}
                className="mt-2 w-full accent-amber-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>₹10,000</span>
                <span>₹10 Lakhs</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                <span>Annual Interest Rate (%)</span>
                <span className="font-mono text-amber-600">{interestRate}%</span>
              </div>
              <input
                type="range"
                min="4"
                max="18"
                step="0.25"
                value={interestRate}
                onChange={(e) => setInterestRate(Number(e.target.value))}
                className="mt-2 w-full accent-amber-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>4% (Subsidized)</span>
                <span>18% (Commercial)</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                <span>Tenure Duration (Months)</span>
                <span className="font-mono text-amber-600">{loanTenureMonths} Months ({loanTenureMonths / 12} yrs)</span>
              </div>
              <input
                type="range"
                min="6"
                max="60"
                step="6"
                value={loanTenureMonths}
                onChange={(e) => setLoanTenureMonths(Number(e.target.value))}
                className="mt-2 w-full accent-amber-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>6 Months</span>
                <span>5 Years</span>
              </div>
            </div>
          </div>

          {/* Results Summary Card */}
          <div className="flex flex-col justify-between rounded-3xl bg-gradient-to-br from-amber-50 via-rose-50/30 to-purple-50/20 p-8 dark:from-slate-800 dark:via-slate-800 dark:to-slate-900">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                Monthly Repayment Projection
              </span>

              <div className="mt-3">
                <span className="text-3xl font-black text-slate-900 dark:text-white">
                  ₹{emi.toLocaleString('en-IN')}
                </span>
                <span className="text-xs text-slate-500"> / month</span>
              </div>

              <div className="mt-6 space-y-3 divide-y divide-slate-200/80 dark:divide-slate-700 text-xs">
                <div className="flex justify-between pt-2">
                  <span className="text-slate-600 dark:text-slate-400">Principal Borrowed:</span>
                  <strong className="text-slate-900 dark:text-white">₹{loanAmount.toLocaleString('en-IN')}</strong>
                </div>
                <div className="flex justify-between pt-2">
                  <span className="text-slate-600 dark:text-slate-400">Total Interest Accrued:</span>
                  <strong className="text-amber-700 dark:text-amber-400">₹{totalInterest.toLocaleString('en-IN')}</strong>
                </div>
                <div className="flex justify-between pt-2">
                  <span className="text-slate-600 dark:text-slate-400">Total Repayable Amount:</span>
                  <strong className="text-slate-900 dark:text-white">₹{totalPayment.toLocaleString('en-IN')}</strong>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-2xl bg-white/80 p-4 text-xs text-slate-600 backdrop-blur dark:bg-slate-800/80 dark:text-slate-300">
              <ShieldCheck className="size-4 text-emerald-600 inline mr-1" />
              Tip: Under Mudra and Stand-Up India schemes, female entrepreneurs receive interest concessions up to 0.50% at public sector banks.
            </div>
          </div>
        </div>
      )}

      {/* 3. 50/30/20 Budgeting Rule */}
      {activeTab === 'budgeting' && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="rounded-3xl border border-rose-200 bg-rose-50/50 p-6 dark:border-rose-950 dark:bg-rose-950/20">
            <span className="text-3xl font-black text-rose-600">50%</span>
            <h3 className="mt-2 text-base font-bold text-slate-900 dark:text-white">Needs &amp; Essentials</h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              Rent, groceries, utilities, children's school fees, healthcare, and essential commuting.
            </p>
          </div>

          <div className="rounded-3xl border border-purple-200 bg-purple-50/50 p-6 dark:border-purple-950 dark:bg-purple-950/20">
            <span className="text-3xl font-black text-purple-600">30%</span>
            <h3 className="mt-2 text-base font-bold text-slate-900 dark:text-white">Wants &amp; Growth</h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              Skill bootcamps, personal development, hobbies, family dining, and quality of life investments.
            </p>
          </div>

          <div className="rounded-3xl border border-emerald-200 bg-emerald-50/50 p-6 dark:border-emerald-950 dark:bg-emerald-950/20">
            <span className="text-3xl font-black text-emerald-600">20%</span>
            <h3 className="mt-2 text-base font-bold text-slate-900 dark:text-white">Savings &amp; Emergency Fund</h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              6-month emergency reserve, Sukanya Samriddhi Yojana, Index Mutual Fund SIPs, and Mahila Samman Certificates.
            </p>
          </div>
        </div>
      )}

      {/* 4. Women Entrepreneurship Toolkit */}
      {activeTab === 'entrepreneurship' && (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            Women Business Planning &amp; Pitch Blueprint
          </h3>
          <p className="text-xs text-slate-500">
            Step-by-step checklist to take your venture from home kitchen or freelance portfolio to an incorporated company.
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              { step: '01', title: 'Business Entity Registration (MSME Udyam)', desc: 'Register free at udyamregistration.gov.in to get priority lending, subsidy benefits, and trademark discounts.' },
              { step: '02', title: 'Opening a Current Bank Account & GST', desc: 'Maintain clean separation of household and enterprise funds. GST registration required for interstate trade.' },
              { step: '03', title: 'Collateral-Free Credit via CGTMSE', desc: 'Government guarantees credit lines up to ₹5 Crore for micro-enterprises without demanding residential property.' },
              { step: '04', title: 'Investor Pitch Deck & Unit Economics', desc: 'Draft an 8-slide deck: Problem, Solution, Market Size, Traction, Unit Margins, Team, and Funding Ask.' },
            ].map((st, i) => (
              <div key={i} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/40">
                <span className="font-mono text-xs font-black text-amber-600">{st.step}</span>
                <h4 className="mt-1 text-xs font-bold text-slate-900 dark:text-white">{st.title}</h4>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{st.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
