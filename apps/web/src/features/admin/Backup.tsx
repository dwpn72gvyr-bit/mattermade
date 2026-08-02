// Data backup and restore (client direction, round F). The super admin gets
// the day's CSV automatically once per day, can download one on demand, and
// can load an edited CSV back in to restore or correct the working data.

import React, { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAccount } from '../../stores/session';
import {
  backupFilename, downloadBackup, lastBackupDate, previewRestore, restoreFromCsv,
} from '../../api/backup';
import { todayStr } from '../../api/settings';
import { Banner, Button, Card, PageHeader } from '../../components/ui';
import { fmtDateShort } from '../../lib/format';

export default function Backup() {
  const account = useAccount();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [csvText, setCsvText] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [downloaded, setDownloaded] = useState(false);

  const isSuper = account.roles.includes('super_admin');
  const preview = csvText ? previewRestore(csvText) : [];
  const knownRows = preview.filter((p) => p.known).reduce((s, p) => s + p.rows, 0);

  const restore = useMutation({
    mutationFn: () => restoreFromCsv(account, csvText ?? ''),
    onSuccess: () => {
      void qc.invalidateQueries();
    },
  });

  if (!isSuper) {
    return <Banner tone="info">Backups sit with the super admin.</Banner>;
  }

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    restore.reset();
    setFileName(f.name);
    setCsvText(await f.text());
  };

  const last = lastBackupDate();

  return (
    <div className="max-w-3xl space-y-5">
      <PageHeader
        title="Data backup"
        lede="One CSV holds the working data: projects, hours, leads, notes and OE Verse profiles. It downloads itself once a day when you sign in, reads cleanly in any spreadsheet, and loads back in here."
      />

      <Card as="section">
        <h2 className="display text-lg mb-2">Today's backup</h2>
        <p className="text-sm text-ink-muted mb-3">
          {last === todayStr()
            ? 'Today’s file has already been saved to your downloads.'
            : last
              ? `The last automatic backup was on ${fmtDateShort(last)}.`
              : 'No automatic backup has run in this browser yet.'}
          {' '}The file is named <span className="tabular">{backupFilename()}</span>.
        </p>
        <Button variant="primary" onClick={() => { downloadBackup(); setDownloaded(true); }}>
          Download a backup now
        </Button>
        {downloaded && (
          <p className="text-sm text-positive mt-2">Saved. Keep it somewhere the studio will find it.</p>
        )}
      </Card>

      <Card as="section">
        <h2 className="display text-lg mb-2">Restore from a CSV</h2>
        <p className="text-sm text-ink-muted mb-3">
          Load a backup file, or one you have edited. Each section replaces the matching data
          wholesale, so the file is the truth: rows you removed disappear, rows you added arrive,
          and values you corrected take effect. Projects merge by id so history stays attached.
        </p>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="text-sm"
          aria-label="Choose a backup CSV"
          onChange={(e) => void onFile(e.target.files?.[0])}
        />

        {csvText && (
          <div className="mt-4">
            <h3 className="text-sm font-medium text-ink mb-1">What {fileName || 'this file'} contains</h3>
            <ul className="text-sm text-ink-muted space-y-0.5 mb-3">
              {preview.map((p) => (
                <li key={p.section}>
                  <span className="tabular">{p.rows}</span> rows in {p.section.replace(/_/g, ' ')}
                  {!p.known && <span className="text-caution"> (unknown section, will be skipped)</span>}
                </li>
              ))}
              {preview.length === 0 && <li>No sections found. Check the ## section titles are intact.</li>}
            </ul>
            {restore.isError && (
              <Banner tone="critical">
                That file did not restore. Check it still has its ## section titles and header rows, then try again.
              </Banner>
            )}
            {restore.isSuccess && (
              <Banner tone="positive">
                Restored. Every screen now reads from the file you loaded. A page reload returns the console to its seed, so keep the CSV safe.
              </Banner>
            )}
            {!restore.isSuccess && (
              <div className="flex gap-2 mt-2">
                <Button
                  variant="danger"
                  disabled={knownRows === 0 || restore.isPending}
                  onClick={() => restore.mutate()}
                >
                  Restore from this file
                </Button>
                <Button variant="quiet" onClick={() => { setCsvText(null); setFileName(''); if (fileRef.current) fileRef.current.value = ''; }}>
                  Clear
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>

      <Card as="section">
        <h2 className="display text-lg mb-2">The format</h2>
        <p className="text-sm text-ink-muted">
          The file opens in Excel, Numbers or Google Sheets. Each block starts with a
          <span className="tabular"> ## section</span> line and a header row; keep both. Lists such as
          team members or capabilities join with a semicolon. Money is whole SGD. Dates are
          <span className="tabular"> YYYY-MM-DD</span>. Anything else is yours to edit.
        </p>
      </Card>
    </div>
  );
}
