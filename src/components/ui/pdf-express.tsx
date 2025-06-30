import dynamic from 'next/dynamic';
import { useState } from 'react';

// Import the client-side component with dynamic loading
const PdfViewerClient = dynamic(
  () => import('./pdf-viewer-client').then(mod => ({ default: mod.PdfViewerClient })),
  { 
    ssr: false, 
    loading: () => (
      <div className="flex justify-center items-center h-full w-full bg-gray-100">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
      </div>
    )
  }
);

interface PdfViewerProps {
  pdfUrl: string | null;
  textSnippets?: string[];
  paperId?: string | null;
  shouldExtractText?: boolean;
  onTextExtractionComplete?: (success: boolean) => void;
  onTextExtractionProgress?: (progress: number) => void;
}

export const PdfViewer = (props: PdfViewerProps) => {
  const [isClient, setIsClient] = useState(false);
  
  // Use useEffect to detect client-side rendering
  // This is not needed with dynamic import, but adding as extra safety
  if (typeof window !== 'undefined' && !isClient) {
    setIsClient(true);
  }

  // Return the dynamically loaded client component
  return <PdfViewerClient {...props} />;
};