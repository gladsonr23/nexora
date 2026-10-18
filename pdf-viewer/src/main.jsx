import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  const pageScroller = useRef(null);
  useEffect(() => () => URL.revokeObjectURL(downloadUrl), [downloadUrl]);

  useEffect(() => {
    const scroller = pageScroller.current;
    if (!scroller || !pageCount) return undefined;
    const observer = new IntersectionObserver(entries => {
      const mostVisible = entries
        .filter(entry => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (mostVisible) setPageNumber(Number(mostVisible.target.dataset.pageNumber));
    }, { root: scroller, threshold: [0.35, 0.6, 0.85] });
    scroller.querySelectorAll('[data-page-number]').forEach(page => observer.observe(page));
    return () => observer.disconnect();
  }, [pageCount]);

  function onDocumentLoad({ numPages }) {
    setPageCount(numPages);
    setPageNumber(1);
    onPageCount?.(numPages);
  }

  return (
    <div className="nx-react-pdf">
      <nav className="nx-react-pdf-toolbar" aria-label="PDF controls">
        <div className="nx-react-pdf-group">
          <span className="nx-react-pdf-page-count" aria-live="polite">{pageCount ? `Page ${pageNumber} of ${pageCount}` : 'Loading…'}</span>
        </div>
        <div className="nx-react-pdf-group">
          <button type="button" onClick={() => setScale(value => Math.max(.55, +(value - .15).toFixed(2)))} disabled={scale <= .55} aria-label="Zoom out">−</button>
          <span className="nx-react-pdf-zoom">{Math.round(scale * 100)}%</span>
          <button type="button" onClick={() => setScale(value => Math.min(2.2, +(value + .15).toFixed(2)))} disabled={scale >= 2.2} aria-label="Zoom in">+</button>
          <button type="button" onClick={() => setScale(1)} aria-label="Reset zoom">Fit</button>
          <a href={downloadUrl} download={fileName}>Download</a>
        </div>
      </nav>
      <div className="nx-react-pdf-page" ref={pageScroller} aria-label="PDF pages; scroll to read">
        {error ? <p className="nx-react-pdf-error" role="alert">{error}</p> : (
          <Document file={file} onLoadSuccess={onDocumentLoad} onLoadError={cause => setError(cause.message || 'Could not load the PDF.')} loading={<p className="nx-react-pdf-message">Preparing preview…</p>}>
            {pageCount > 0 && Array.from({ length: pageCount }, (_, index) => {
              const number = index + 1;
              return <div className="nx-react-pdf-page-item" data-page-number={number} key={number}>
                <Page pageNumber={number} scale={scale} renderTextLayer renderAnnotationLayer />
              </div>;
            })}
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
