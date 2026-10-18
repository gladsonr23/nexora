import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Document, Page, pdfjs } from 'react-pdf';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import './viewer.css';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

function PdfViewer({ data, fileName, onPageCount }) {
  const file = useMemo(() => ({ data }), [data]);
  const downloadUrl = useMemo(() => URL.createObjectURL(new Blob([data], { type: 'application/pdf' })), [data]);
  const [pageCount, setPageCount] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1);
  const [error, setError] = useState('');
  useEffect(() => () => URL.revokeObjectURL(downloadUrl), [downloadUrl]);

  function onDocumentLoad({ numPages }) {
    setPageCount(numPages);
    setPageNumber(1);
    onPageCount?.(numPages);
  }

  return (
    <div className="nx-react-pdf">
      <nav className="nx-react-pdf-toolbar" aria-label="PDF controls">
        <div className="nx-react-pdf-group">
          <button type="button" onClick={() => setPageNumber(1)} disabled={pageNumber <= 1} aria-label="First page">|‹</button>
          <button type="button" onClick={() => setPageNumber(value => Math.max(1, value - 1))} disabled={pageNumber <= 1} aria-label="Previous page">‹</button>
          <span className="nx-react-pdf-page-count">{pageCount ? `${pageNumber} / ${pageCount}` : 'Loading…'}</span>
          <button type="button" onClick={() => setPageNumber(value => Math.min(pageCount, value + 1))} disabled={!pageCount || pageNumber >= pageCount} aria-label="Next page">›</button>
          <button type="button" onClick={() => setPageNumber(pageCount)} disabled={!pageCount || pageNumber >= pageCount} aria-label="Last page">›|</button>
        </div>
        <div className="nx-react-pdf-group">
          <button type="button" onClick={() => setScale(value => Math.max(.55, +(value - .15).toFixed(2)))} disabled={scale <= .55} aria-label="Zoom out">−</button>
          <span className="nx-react-pdf-zoom">{Math.round(scale * 100)}%</span>
          <button type="button" onClick={() => setScale(value => Math.min(2.2, +(value + .15).toFixed(2)))} disabled={scale >= 2.2} aria-label="Zoom in">+</button>
          <button type="button" onClick={() => setScale(1)} aria-label="Reset zoom">Fit</button>
          <a href={downloadUrl} download={fileName}>Download</a>
        </div>
      </nav>
      <div className="nx-react-pdf-page" aria-live="polite">
        {error ? <p className="nx-react-pdf-error" role="alert">{error}</p> : (
          <Document file={file} onLoadSuccess={onDocumentLoad} onLoadError={cause => setError(cause.message || 'Could not load the PDF.')} loading={<p className="nx-react-pdf-message">Preparing preview…</p>}>
            {pageCount > 0 && <Page pageNumber={pageNumber} scale={scale} renderTextLayer renderAnnotationLayer />}
          </Document>
        )}
      </div>
    </div>
  );
}

export function mountPdfViewer(container, { data, fileName, onPageCount } = {}) {
  const root = createRoot(container);
  root.render(<PdfViewer data={data} fileName={fileName} onPageCount={onPageCount} />);
  return () => root.unmount();
}
