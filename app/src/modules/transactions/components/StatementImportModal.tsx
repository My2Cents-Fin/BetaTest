/**
 * Statement Import Modal
 *
 * Multi-step modal for importing bank statement transactions.
 * Step 1: File upload (PDF/CSV) with password prompt for PDFs
 * Step 2: Preview & categorize transactions
 * Step 3: Confirm & import
 */

import { useState, useRef, useMemo } from 'react';
import { parseStatementFile, prepareImportCandidates, commitImport } from '../services/statementImport';
import type {
  ImportCandidate,
  HouseholdSubCategory,
  ParsedStatementTransaction,
  TransactionType,
} from '../../budget/types';

interface SubCategoryOption {
  id: string;
  name: string;
  icon: string;
  categoryName: string;
  categoryType: 'income' | 'expense';
}

interface StatementImportModalProps {
  householdId: string;
  subCategories: SubCategoryOption[];
  householdSubCategories: HouseholdSubCategory[];
  categoryMap: Map<string, { name: string; type: string }>;
  currentUserId: string;
  onClose: () => void;
  onSuccess: (importedDateRange?: { from: string; to: string }) => void;
}

type Step = 'upload' | 'preview' | 'importing' | 'done';

export function StatementImportModal({
  householdId,
  subCategories,
  householdSubCategories,
  categoryMap,
  currentUserId,
  onClose,
  onSuccess,
}: StatementImportModalProps) {
  const [step, setStep] = useState<Step>('upload');
  const [error, setError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<ImportCandidate[]>([]);
  const [bankName, setBankName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [needsPassword, setNeedsPassword] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importedCount, setImportedCount] = useState(0);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── File Upload & Parse ──

  const handleFileSelect = async (file: File) => {
    setSelectedFile(file);
    setError(null);
    await parseFile(file);
  };

  const parseFile = async (file: File, pwd?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await parseStatementFile(file, pwd);

      if (!result.success) {
        if (result.passwordRequired) {
          setNeedsPassword(true);
          setIsLoading(false);
          return;
        }
        setError(result.error || 'Failed to parse file');
        setIsLoading(false);
        return;
      }

      setBankName(result.bankName || 'Unknown Bank');

      // Apply merchant matching + duplicate detection
      const importCandidates = await prepareImportCandidates(
        result.transactions as ParsedStatementTransaction[],
        householdId,
        householdSubCategories,
        categoryMap
      );

      setCandidates(importCandidates);
      setStep('preview');
    } catch (err: any) {
      setError(err.message || 'Failed to parse file');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = () => {
    if (selectedFile && password) {
      setNeedsPassword(false);
      parseFile(selectedFile, password);
    }
  };

  // ── Candidate Management ──

  const toggleCandidate = (index: number) => {
    setCandidates(prev => prev.map((c, i) =>
      i === index ? { ...c, selected: !c.selected } : c
    ));
  };

  const selectAll = () => {
    setCandidates(prev => prev.map(c => ({ ...c, selected: true })));
  };

  const deselectDuplicates = () => {
    setCandidates(prev => prev.map(c => c.isDuplicate ? { ...c, selected: false } : c));
  };

  const updateCandidateCategory = (index: number, subCatId: string | null, transactionType: TransactionType) => {
    setCandidates(prev => prev.map((c, i) =>
      i === index ? { ...c, userOverrideSubCategoryId: subCatId, userOverrideTransactionType: transactionType } : c
    ));
    setEditingIndex(null);
  };

  // ── Stats ──

  const stats = useMemo(() => {
    const selected = candidates.filter(c => c.selected);
    const categorized = selected.filter(c => c.suggestedSubCategoryId || c.userOverrideSubCategoryId);
    const uncategorized = selected.filter(c => !c.suggestedSubCategoryId && !c.userOverrideSubCategoryId);
    const duplicates = candidates.filter(c => c.isDuplicate);
    return {
      total: candidates.length,
      selected: selected.length,
      categorized: categorized.length,
      uncategorized: uncategorized.length,
      duplicates: duplicates.length,
    };
  }, [candidates]);

  // ── Import ──

  const handleImport = async () => {
    setStep('importing');
    setError(null);

    try {
      const result = await commitImport(candidates, householdId, currentUserId);
      if (result.success) {
        setImportedCount(result.importedCount);
        setStep('done');
      } else {
        setError(result.error || 'Import failed');
        setStep('preview');
      }
    } catch (err: any) {
      setError(err.message || 'Import failed');
      setStep('preview');
    }
  };

  const handleDone = () => {
    // Compute the date range of imported transactions so the parent can set filters
    const selectedDates = candidates
      .filter(c => c.selected)
      .map(c => c.date)
      .filter(Boolean)
      .sort();
    const dateRange = selectedDates.length > 0
      ? { from: selectedDates[0], to: selectedDates[selectedDates.length - 1] }
      : undefined;
    onSuccess(dateRange);
    onClose();
  };

  // ── Render ──

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full md:w-[520px] md:max-w-[95vw] bg-white/95 backdrop-blur-xl rounded-t-3xl md:rounded-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-[0_8px_40px_rgba(0,0,0,0.12)]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(124,58,237,0.06)]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[var(--color-primary-bg)] flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-gray-900">
              {step === 'upload' ? 'Import Statement' :
               step === 'preview' ? `${bankName} — ${stats.total} transactions` :
               step === 'importing' ? 'Importing...' :
               'Import Complete'}
            </h2>
          </div>
          {step !== 'importing' && (
            <button onClick={step === 'done' ? handleDone : onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-xl hover:bg-white/60">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {step === 'upload' && (
            <UploadStep
              isLoading={isLoading}
              error={error}
              needsPassword={needsPassword}
              password={password}
              setPassword={setPassword}
              onPasswordSubmit={handlePasswordSubmit}
              onFileSelect={handleFileSelect}
              fileInputRef={fileInputRef}
            />
          )}

          {step === 'preview' && (
            <PreviewStep
              candidates={candidates}
              stats={stats}
              subCategories={subCategories}
              editingIndex={editingIndex}
              setEditingIndex={setEditingIndex}
              toggleCandidate={toggleCandidate}
              selectAll={selectAll}
              deselectDuplicates={deselectDuplicates}
              updateCandidateCategory={updateCandidateCategory}
              error={error}
            />
          )}

          {step === 'importing' && (
            <div className="p-8 flex flex-col items-center justify-center">
              <div className="w-10 h-10 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-sm text-gray-600">Importing {stats.selected} transactions...</p>
            </div>
          )}

          {step === 'done' && (
            <div className="p-8 flex flex-col items-center justify-center">
              <div className="w-14 h-14 rounded-2xl bg-[var(--color-success-bg)] flex items-center justify-center mb-4">
                <svg className="w-7 h-7 text-[var(--color-success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-lg font-semibold text-gray-900 mb-1">Imported {importedCount} transactions</p>
              <p className="text-sm text-gray-500 text-center">
                {stats.uncategorized > 0
                  ? `${stats.uncategorized} uncategorised — tap them anytime to assign a category.`
                  : 'All transactions have been categorised.'}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'preview' && (
          <div className="px-4 py-3 border-t border-[rgba(124,58,237,0.06)]">
            {stats.uncategorized > 0 && (
              <p className="text-[11px] text-amber-600 mb-2 text-center">
                {stats.uncategorized} uncategorised transaction{stats.uncategorized > 1 ? 's' : ''} will count as expenses until reviewed.
              </p>
            )}
            <button
              onClick={handleImport}
              disabled={stats.selected === 0}
              className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all ${
                stats.selected === 0
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-primary-gradient text-white shadow-[0_4px_16px_rgba(124,58,237,0.3)] hover:shadow-[0_6px_20px_rgba(124,58,237,0.4)] hover:-translate-y-0.5 active:translate-y-0'
              }`}
            >
              Import {stats.selected} Transaction{stats.selected !== 1 ? 's' : ''}
            </button>
          </div>
        )}

        {step === 'done' && (
          <div className="px-4 py-3">
            <button
              onClick={handleDone}
              className="w-full py-2.5 rounded-xl text-sm font-semibold bg-primary-gradient text-white shadow-[0_4px_16px_rgba(124,58,237,0.3)]"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// Upload Step
// ============================================

function UploadStep({
  isLoading,
  error,
  needsPassword,
  password,
  setPassword,
  onPasswordSubmit,
  onFileSelect,
  fileInputRef,
}: {
  isLoading: boolean;
  error: string | null;
  needsPassword: boolean;
  password: string;
  setPassword: (p: string) => void;
  onPasswordSubmit: () => void;
  onFileSelect: (file: File) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) onFileSelect(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelect(file);
  };

  if (isLoading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm text-gray-600">Parsing statement...</p>
      </div>
    );
  }

  if (needsPassword) {
    return (
      <div className="p-6 space-y-4">
        <div className="text-center mb-2">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-900">Password Protected PDF</p>
          <p className="text-xs text-gray-500 mt-1">
            This statement is password-protected. Enter the password to continue.
          </p>
          <p className="text-[10px] text-gray-400 mt-1">
            Usually your Date of Birth (DDMMYYYY) or a combination with your name.
          </p>
        </div>

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onPasswordSubmit()}
          placeholder="Enter PDF password"
          autoFocus
          className="w-full px-3 py-2.5 border border-[rgba(124,58,237,0.15)] rounded-xl text-sm text-gray-900 bg-white/75 focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[rgba(124,58,237,0.15)]"
        />

        <button
          onClick={onPasswordSubmit}
          disabled={!password}
          className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all ${
            !password
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-primary-gradient text-white shadow-[0_4px_16px_rgba(124,58,237,0.3)]'
          }`}
        >
          Unlock & Parse
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-[rgba(124,58,237,0.2)] rounded-2xl p-8 text-center cursor-pointer hover:bg-[var(--color-primary-bg)]/50 transition-colors"
      >
        <div className="w-14 h-14 rounded-2xl bg-[var(--color-primary-bg)] flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12l-3-3m0 0l-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-gray-900 mb-1">Upload Bank Statement</p>
        <p className="text-xs text-gray-500">PDF or CSV — works with most Indian banks</p>
        <p className="text-[10px] text-gray-400 mt-2">Tap to browse or drag & drop</p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.csv"
        onChange={handleInputChange}
        className="hidden"
      />

      {error && (
        <div className="mt-4 p-3 bg-red-50 rounded-xl border border-red-100">
          <p className="text-xs text-red-600">{error}</p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-xs text-red-700 font-medium mt-1 underline"
          >
            Try another file
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================
// Preview Step
// ============================================

function PreviewStep({
  candidates,
  stats,
  subCategories,
  editingIndex,
  setEditingIndex,
  toggleCandidate,
  selectAll,
  deselectDuplicates,
  updateCandidateCategory,
  error,
}: {
  candidates: ImportCandidate[];
  stats: { total: number; selected: number; categorized: number; uncategorized: number; duplicates: number };
  subCategories: SubCategoryOption[];
  editingIndex: number | null;
  setEditingIndex: (i: number | null) => void;
  toggleCandidate: (i: number) => void;
  selectAll: () => void;
  deselectDuplicates: () => void;
  updateCandidateCategory: (i: number, subCatId: string | null, txnType: TransactionType) => void;
  error: string | null;
}) {
  return (
    <div className="px-4 py-3">
      {/* Summary */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className="px-2 py-0.5 rounded-lg bg-[var(--color-primary-bg)] text-[var(--color-primary)] text-[10px] font-medium">
          {stats.selected} selected
        </span>
        <span className="px-2 py-0.5 rounded-lg bg-[var(--color-success-bg)] text-[var(--color-success)] text-[10px] font-medium">
          {stats.categorized} categorised
        </span>
        {stats.uncategorized > 0 && (
          <span className="px-2 py-0.5 rounded-lg bg-amber-50 text-amber-600 text-[10px] font-medium">
            {stats.uncategorized} uncategorised
          </span>
        )}
        {stats.duplicates > 0 && (
          <span className="px-2 py-0.5 rounded-lg bg-gray-100 text-gray-500 text-[10px] font-medium">
            {stats.duplicates} duplicate{stats.duplicates > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2 mb-3">
        <button onClick={selectAll} className="text-[10px] text-[var(--color-primary)] font-medium px-2 py-1 rounded-lg hover:bg-[var(--color-primary-bg)]">
          Select All
        </button>
        {stats.duplicates > 0 && (
          <button onClick={deselectDuplicates} className="text-[10px] text-gray-500 font-medium px-2 py-1 rounded-lg hover:bg-gray-50">
            Deselect Duplicates
          </button>
        )}
      </div>

      {error && (
        <div className="mb-3 p-2 bg-red-50 rounded-xl border border-red-100">
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}

      {/* Transaction List */}
      <div className="space-y-1.5 max-h-[50vh] overflow-y-auto">
        {candidates.map((candidate, idx) => (
          <CandidateRow
            key={idx}
            candidate={candidate}
            index={idx}
            isEditing={editingIndex === idx}
            subCategories={subCategories}
            onToggle={() => toggleCandidate(idx)}
            onEditCategory={() => setEditingIndex(editingIndex === idx ? null : idx)}
            onCategorySelect={(subCatId, txnType) => updateCandidateCategory(idx, subCatId, txnType)}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================
// Candidate Row
// ============================================

function CandidateRow({
  candidate,
  index,
  isEditing,
  subCategories,
  onToggle,
  onEditCategory,
  onCategorySelect,
}: {
  candidate: ImportCandidate;
  index: number;
  isEditing: boolean;
  subCategories: SubCategoryOption[];
  onToggle: () => void;
  onEditCategory: () => void;
  onCategorySelect: (subCatId: string | null, txnType: TransactionType) => void;
}) {
  const [search, setSearch] = useState('');

  const effectiveSubCatId = candidate.userOverrideSubCategoryId || candidate.suggestedSubCategoryId;
  const effectiveSubCat = effectiveSubCatId ? subCategories.find(sc => sc.id === effectiveSubCatId) : null;
  const isCategorized = !!effectiveSubCat;

  const dateLabel = new Date(candidate.date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

  const filteredCategories = useMemo(() => {
    if (!search) return subCategories;
    const s = search.toLowerCase();
    return subCategories.filter(sc => sc.name.toLowerCase().includes(s) || sc.categoryName.toLowerCase().includes(s));
  }, [subCategories, search]);

  return (
    <div className={`rounded-xl border transition-colors ${
      !candidate.selected ? 'bg-gray-50 border-gray-100 opacity-60' :
      candidate.isDuplicate ? 'bg-amber-50/50 border-amber-100' :
      'bg-white border-[rgba(124,58,237,0.06)]'
    }`}>
      <div className="flex items-center gap-2 p-2.5">
        {/* Checkbox */}
        <button onClick={onToggle} className="flex-shrink-0">
          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
            candidate.selected
              ? 'bg-[var(--color-primary)] border-[var(--color-primary)]'
              : 'border-gray-300 bg-white'
          }`}>
            {candidate.selected && (
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        </button>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-[10px] text-gray-400">{dateLabel}</span>
            {candidate.isDuplicate && (
              <span className="text-[9px] bg-amber-100 text-amber-700 px-1 py-0.5 rounded font-medium">Duplicate</span>
            )}
          </div>
          <p className="text-xs text-gray-800 truncate leading-tight" title={candidate.narration}>
            {candidate.narration}
          </p>
        </div>

        {/* Amount */}
        <div className="text-right flex-shrink-0 mr-1">
          <p className={`text-xs font-semibold ${
            candidate.transactionType === 'income' ? 'text-green-600' : 'text-red-600'
          }`}>
            {candidate.transactionType === 'income' ? '+' : '-'}₹{candidate.amount.toLocaleString('en-IN')}
          </p>
        </div>
      </div>

      {/* Category Pill */}
      <div className="px-2.5 pb-2.5 -mt-0.5">
        <button
          onClick={onEditCategory}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-medium transition-colors ${
            isCategorized
              ? 'bg-[var(--color-primary-bg)] text-[var(--color-primary)]'
              : 'bg-amber-50 text-amber-600'
          }`}
        >
          <span>{isCategorized ? (effectiveSubCat?.icon || '📦') : '❓'}</span>
          <span>{isCategorized ? effectiveSubCat?.name : 'Uncategorised'}</span>
          {candidate.matchConfidence === 'high' && isCategorized && (
            <span className="text-[8px] bg-[var(--color-success-bg)] text-[var(--color-success)] px-1 rounded">AI</span>
          )}
          <svg className="w-2.5 h-2.5 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Inline Category Selector */}
      {isEditing && (
        <div className="px-2.5 pb-2.5 border-t border-[rgba(124,58,237,0.06)]">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search categories..."
            autoFocus
            className="w-full px-2 py-1.5 text-xs border border-[rgba(124,58,237,0.15)] rounded-lg bg-white/75 focus:outline-none focus:border-[var(--color-primary)] mt-2 mb-1"
          />
          <div className="max-h-32 overflow-y-auto space-y-px">
            {/* Uncategorised option */}
            <button
              onClick={() => onCategorySelect(null, 'expense')}
              className="w-full px-2 py-1.5 text-left text-[11px] flex items-center gap-1.5 hover:bg-amber-50 rounded-lg"
            >
              <span>❓</span>
              <span className="text-amber-600 font-medium">Leave Uncategorised</span>
            </button>
            {filteredCategories.map(sc => (
              <button
                key={sc.id}
                onClick={() => onCategorySelect(sc.id, sc.categoryType === 'income' ? 'income' : 'expense')}
                className={`w-full px-2 py-1.5 text-left text-[11px] flex items-center gap-1.5 rounded-lg transition-colors ${
                  effectiveSubCatId === sc.id
                    ? 'bg-[var(--color-primary-bg)] text-[var(--color-primary)]'
                    : 'hover:bg-white/60 text-gray-700'
                }`}
              >
                <span>{sc.icon}</span>
                <span>{sc.name}</span>
                <span className="text-[9px] text-gray-400 ml-auto">{sc.categoryName}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
