declare module '@pdftron/pdfjs-express-viewer' {
  interface WebViewerOptions {
    path: string;
    initialDoc?: string;
    licenseKey?: string;
    extension?: string;
    // Add other configuration options as needed
    [key: string]: unknown;
  }

  export interface WebViewerInstance {
    UI: {
      dispose: () => void;
      searchTextFull: (pattern: string, options?: { regex?: boolean }) => void;
      [key: string]: unknown;
    };
    Core: {
      documentViewer: {
        addEventListener: (event: string, callback: (arg?: unknown) => void) => void;
        dispose: () => void;
        getPageCount: () => Promise<number>;
        getDocument: () => Promise<{
          loadPageText: (pageNumber: number) => Promise<string>;
          [key: string]: unknown;
        }>;
        [key: string]: unknown;
      };
      [key: string]: unknown;
    };
    // Add other properties as needed
  }

  export default function WebViewer(
    options: WebViewerOptions, 
    element: HTMLElement
  ): Promise<WebViewerInstance>;
}
