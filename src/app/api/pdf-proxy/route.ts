import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const fileUrl = url.searchParams.get('url');
    
    if (!fileUrl) {
      console.error('PDF proxy error: No URL provided');
      return new NextResponse('No URL provided', { status: 400 });
    }

    // Validate URL format
    try {
      new URL(fileUrl);
    } catch (error) {
      console.error('PDF proxy error: Invalid URL format', fileUrl);
      return new NextResponse('Invalid URL format', { status: 400 });
    }

    console.log('PDF proxy fetching:', fileUrl);
    
    const response = await fetch(fileUrl, {
      headers: {
        'Accept': 'application/pdf',
      },
    });
    
    if (!response.ok) {
      console.error(`PDF proxy error: Failed to fetch PDF: ${response.statusText} (${response.status})`);
      return new NextResponse(`Failed to fetch PDF: ${response.statusText}`, { 
        status: response.status 
      });
    }

    // Check Content-Type to ensure it's a PDF
    const contentType = response.headers.get('Content-Type');
    if (contentType && !contentType.includes('application/pdf') && !contentType.includes('octet-stream')) {
      console.warn(`PDF proxy warning: Unexpected content type: ${contentType}`);
      // Continue anyway, as sometimes content type is incorrectly set
    }

    // Get the response body as an array buffer
    const pdfBuffer = await response.arrayBuffer();
    
    // Check if we actually received data
    if (pdfBuffer.byteLength === 0) {
      console.error('PDF proxy error: Empty response received');
      return new NextResponse('Empty PDF file received', { status: 400 });
    }

    console.log(`PDF proxy success: Fetched ${pdfBuffer.byteLength} bytes`);

    // Return the PDF with appropriate headers
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error) {
    console.error('PDF proxy error:', error);
    return new NextResponse(`Error fetching PDF: ${error instanceof Error ? error.message : 'Unknown error'}`, { 
      status: 500 
    });
  }
}
