'use client'; // Client-side only component for PDFjs Express

import WebViewer from '@pdftron/pdfjs-express-viewer';
import { useEffect, useRef, useState, useCallback } from 'react';
import { apiClient } from '@/lib/api';

interface PdfViewerClientProps {
  pdfUrl: string | null;
  textSnippets?: string[];
  paperId?: string | null;
  shouldExtractText?: boolean;
  onTextExtractionComplete?: (success: boolean) => void;
  onTextExtractionProgress?: (progress: number) => void;
}

export const PdfViewerClient = ({ 
  pdfUrl, 
  textSnippets = [],
  paperId, 
  shouldExtractText = false,
  onTextExtractionComplete,
  onTextExtractionProgress,
}: PdfViewerClientProps) => {
    const viewer = useRef<HTMLDivElement>(null);
    const [error, setError] = useState<string | null>(null);
    const instanceRef = useRef<any>(null);
    const [isExtracting, setIsExtracting] = useState(false);
    const [extractionProgress, setExtractionProgress] = useState(0);

    useEffect(() => {
        if (!viewer.current) return;
        
        // Clean up previous instance if it exists
        if (instanceRef.current) {
            console.log('Cleaning up previous WebViewer instance');
            instanceRef.current.UI.dispose();
            instanceRef.current = null;
            
            // Clear the viewer div content
            if (viewer.current) {
                viewer.current.innerHTML = '';
            }
        }
        
        console.log('Initializing WebViewer with PDF URL:', pdfUrl);
        
        WebViewer(
          {
            path: '/webviewer/lib',
            initialDoc: pdfUrl || '/files/pdftron_about.pdf',
            extension: 'pdf',
            licenseKey: 'w8JCA73N5p1Calk1TAl1', // Use demo key for testing - get your own free key for production
          },
          viewer.current as HTMLElement,
        ).then((instance) => {
            // Store the instance for cleanup later
            instanceRef.current = instance;
            // now you can access APIs through the WebViewer instance
            const { Core, UI } = instance;
            
            console.log('WebViewer instance created successfully');
    
            // adding an event listener for when a document is loaded
            Core.documentViewer.addEventListener('documentLoaded', async () => {
                if (textSnippets && textSnippets.length > 0) {
                    // Build a regex to match all text snippets
                    const escapeRegExp = (s: string) =>
                        s.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&');
                    const escapedPatterns = textSnippets.map(escapeRegExp);
                    const regexPattern = escapedPatterns.join('|');
                    if (regexPattern) {
                      UI.searchTextFull(regexPattern, {
                        regex: true,
                      });
                    }
                }
                console.log('Document loaded successfully');
                setError(null);
                
                // If shouldExtractText is true and we have a paperId, extract text
                if (shouldExtractText && paperId) {
                    try {
                        await extractTextFromPdf(instance, paperId);
                    } catch (err) {
                        console.error('Error extracting text:', err);
                    }
                }
            });
    
            // adding an event listener for when the page number has changed
            Core.documentViewer.addEventListener('pageNumberUpdated', (pageNumber: number) => {
              console.log(`Page number is: ${pageNumber}`);
            });
            
            // Handle errors
            instance.Core.documentViewer.addEventListener('documentLoadingFailed', (err: any) => {
              console.error('Document loading failed:', err);
              setError('Failed to load PDF. Please check if the URL is correct.');
            });
          }).catch((err: any) => {
            console.error('Error initializing WebViewer:', err);
            setError('Failed to initialize PDF viewer');
          });
        
        // Cleanup function for when component unmounts or pdfUrl changes
        return () => {
            if (instanceRef.current) {
                console.log('Cleaning up WebViewer instance on unmount/change');
                instanceRef.current.UI.dispose();
                instanceRef.current.UI = null;
                instanceRef.current.Core.documentViewer.dispose();
                instanceRef.current.Core.documentViewer = null;
                instanceRef.current = null;
            }
        };
    }, [pdfUrl, shouldExtractText, paperId, textSnippets]); // Add dependencies
    
    // Function to extract text with batching
    const extractTextFromPdf = useCallback(async (instance: any, paperIdToExtract: string) => {
        if (isExtracting) return;
        
        try {
            setIsExtracting(true);
            setExtractionProgress(0);
            
            const documentViewer = instance.Core.documentViewer;
            const totalPages = await documentViewer.getPageCount();
            console.log(`Starting text extraction for ${totalPages} pages`);
            
            if (totalPages === 0) {
                console.error('No pages found in document');
                setIsExtracting(false);
                onTextExtractionComplete?.(false);
                return;
            }
            
            const doc = await documentViewer.getDocument();
            const batchSize = 10; // Process 10 pages at a time
            const batches = Math.ceil(totalPages / batchSize);
            const extractedText: Record<string, string> = {};
            
            for (let batch = 0; batch < batches; batch++) {
                // Calculate page range for this batch (1-indexed for PDF.js Express)
                const startPage = batch * batchSize + 1;
                const endPage = Math.min((batch + 1) * batchSize, totalPages);
                console.log(`Processing batch ${batch + 1}/${batches}: pages ${startPage}-${endPage}`);
                
                // Extract text for each page in batch
                for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
                    try {
                        const text = await doc.loadPageText(pageNum);
                        extractedText[pageNum.toString()] = `[START_PAGE]${text}[END_PAGE]`;
                    } catch (error) {
                        console.error(`Error extracting text from page ${pageNum}, retrying...`, error);
                        
                        // Retry once
                        try {
                            const text = await doc.loadPageText(pageNum);
                            extractedText[pageNum.toString()] = `[START_PAGE]${text}[END_PAGE]`;
                        } catch (retryError) {
                            console.error(`Failed to extract text from page ${pageNum} after retry`, retryError);
                            extractedText[pageNum.toString()] = `[START_PAGE][EXTRACTION_FAILED][END_PAGE]`;
                        }
                    }
                    
                    // Update progress
                    const progress = Math.round(((batch * batchSize) + (pageNum - startPage + 1)) / totalPages * 100);
                    setExtractionProgress(progress);
                    onTextExtractionProgress?.(progress);
                }
            }
            
            // Send all extracted text to backend
            console.log('Sending extracted text to backend');
            setIsExtracting(false);
            onTextExtractionComplete?.(false);
            
            const response = await apiClient.post(
                `/files/${paperIdToExtract}/save-text`,
                { textByPages: extractedText });
            
            console.log('Text extraction complete:', response);
            setIsExtracting(false);
            setExtractionProgress(100);
            onTextExtractionComplete?.(true);
            
        } catch (error) {
            console.error('Error in text extraction process:', error);
            setIsExtracting(false);
            onTextExtractionComplete?.(false);
        }
    }, [isExtracting, onTextExtractionComplete, onTextExtractionProgress]);

    return (
        <div className="PdfViewer" style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
            {error ? (
                <div className="flex items-center justify-center h-full w-full bg-gray-100 text-red-500 p-4">
                    <p>{error}</p>
                </div>
            ) : (
                <>
                    {isExtracting && (
                        <div className="absolute top-0 left-0 right-0 bg-blue-500 text-white p-2 z-10 text-center">
                            Extracting PDF text: {extractionProgress}%
                        </div>
                    )}
                    <div className="webviewer" ref={viewer} style={{ flex: 1 }}></div>
                </>
            )}
        </div>
    );
};
