import React from 'react';
import { Button } from './Button';

interface StudyFlipCardProps {
  flipped: boolean;
  front: React.ReactNode;
  back: React.ReactNode;
  onFlip: () => void;
  handleMark: (gotItRight: boolean) => void;
  handleAskLecsi: () => void;
  currentFeedback?: 'correct' | 'incorrect' | null;
}

export const StudyFlipCard: React.FC<StudyFlipCardProps> = ({ 
  flipped, 
  front, 
  back, 
  onFlip, 
  handleMark, 
  handleAskLecsi,
  currentFeedback 
}) => {
  // Define feedback styles
  const feedbackClasses = {
    correct: '!bg-green-200 !border-green-500 transition-colors duration-300',
    incorrect: '!bg-red-200 !border-red-500 transition-colors duration-300',
  };
  
  return (
    <div className="relative flex justify-center" style={{width: '100%', maxWidth: 600, margin: '0 auto 2rem auto'}}>
      <div 
        className={`study-flip-container cursor-pointer bg-white rounded-lg shadow-md ${currentFeedback === 'incorrect' ? 'shake-animation' : ''}`}
        onClick={onFlip}
        tabIndex={0}
        role="button"
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onFlip(); }}
        style={{height: '250px', width: '100%', maxWidth: 500, position: 'relative', zIndex: 1}}
      >
        {/* Inner container that rotates */}
        <div 
          className={`study-flipper ${flipped ? 'flipped' : ''}`}
          style={{height: '100%', width: '100%', transformStyle: 'preserve-3d', position: 'relative'}}
        >
          {/* Front face */}
          <div 
            className={`absolute w-full h-full rounded-lg flex flex-col bg-white shadow-md ${
              currentFeedback ? (currentFeedback === 'correct' ? feedbackClasses.correct : feedbackClasses.incorrect) : ''
            }`}
            style={{backfaceVisibility: 'hidden', zIndex: flipped ? 0 : 1}}
          >
            {/* Main content area - takes all available space minus footer */}
            <Button
              className="z-10 px-2 py-1 h-8 text-xs hover:bg-white absolute top-2 right-2 opacity-50 hover:opacity-100 transition-all"
              variant="white-outline"
              onClick={(e) => {
                e.stopPropagation();
                handleAskLecsi();
              }}
            >
              Ask Lecsi <span role="img" aria-label="lightbulb">💡</span>
            </Button>
            <div className="flex-1 grid place-items-center overflow-hidden p-6 pb-2">
              {/* Scrollable container that keeps content centered when small */}
              <div className="w-full max-h-full overflow-y-auto self-center">
                <div className="text-lg font-medium text-center markdown-content break-words">
                  {front}
                </div>
              </div>
            </div>

            {/* Feedback icons with fixed animation class */}
            {currentFeedback && (
              <div className="absolute bottom-5 right-5 text-4xl">
                {currentFeedback === 'correct' ? (
                  <span className="text-green-600 checkmark-zoom-animation">✓</span>
                ) : (
                  <span className="text-red-600">✗</span>
                )}
              </div>
            )}
            
            {/* Footer - fixed at bottom */}
            <div className="p-2 text-xs text-gray-400 text-center border-t border-gray-100">Click to flip</div>
          </div>
          
          {/* Back face */}
          <div 
            className={`absolute w-full h-full rounded-lg flex flex-col bg-white shadow-md ${
              currentFeedback ? (currentFeedback === 'correct' ? feedbackClasses.correct : feedbackClasses.incorrect) : ''
            }`}
            style={{backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', zIndex: flipped ? 1 : 0}}
          >
            {/* Main content area - takes all available space minus footer */}
            <Button
              className="z-10 px-2 py-1 h-8 text-xs hover:bg-white absolute top-2 right-2 opacity-50 hover:opacity-100 transition-all"
              variant="white-outline"
              onClick={(e) => {
                e.stopPropagation();
                handleAskLecsi();
              }}
            >
              Ask Lecsi <span role="img" aria-label="lightbulb">💡</span>
            </Button>
            <div className="flex-1 grid place-items-center overflow-hidden p-6 pb-2">
              {/* Scrollable container that keeps content centered when small */}
              <div className="w-full max-h-full overflow-y-auto self-center">
                <div className="text-lg font-medium text-center markdown-content break-words">
                  {back}
                </div>
              </div>
            </div>
            
            {/* Feedback icons with fixed animation class */}
            {currentFeedback && (
              <div className="absolute bottom-5 right-5 text-4xl">
                {currentFeedback === 'correct' ? (
                  <span className="text-green-600 checkmark-zoom-animation">✓</span>
                ) : (
                  <span className="text-red-600">✗</span>
                )}
              </div>
            )}
            
            {/* Footer - fixed at bottom */}
            <div className="p-2 text-xs text-gray-400 text-center border-t border-gray-100">Click to flip</div>
          </div>
        </div>
      </div>
      
      <style jsx>{`
        .study-flip-container {
          perspective: 1200px;
          background: transparent;
        }
        .study-flipper {
          transition: transform 0.7s cubic-bezier(0.23, 1, 0.32, 1);
          transform-style: preserve-3d;
        }
        .flipped {
          transform: rotateY(180deg);
        }
        
        /* Animation for incorrect feedback shake */
        @keyframes shake-animation {
          0% { transform: translateX(0); }
          15% { transform: translateX(10px); }
          30% { transform: translateX(-10px); }
          45% { transform: translateX(10px); }
          60% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
          90% { transform: translateX(-5px); }
          100% { transform: translateX(0); }
        }
        
        .shake-animation {
          animation: shake-animation 0.5s cubic-bezier(.36,.07,.19,.97) both;
          transform-origin: center;
          backface-visibility: hidden;
        }
        
        /* We need to duplicate these keyframes here since they're scoped within the component */
        @keyframes checkmark-zoom {
          0% { opacity: 0; transform: scale(0.5); }
          50% { opacity: 1; transform: scale(1.5); }
          100% { opacity: 1; transform: scale(1); }
        }
        
        /* Updated class name to match what's being used in the page.tsx */
        .checkmark-zoom-animation {
          animation: checkmark-zoom 0.6s forwards;
        }
        
        /* Additional CSS for the markdown content styling */
        :global(.markdown-content h1),
        :global(.markdown-content h2),
        :global(.markdown-content h3),
        :global(.markdown-content h4),
        :global(.markdown-content h5),
        :global(.markdown-content h6) {
          text-align: center;
          margin-bottom: 0.5rem;
        }
        
        :global(.markdown-content h1) {
          font-size: 1.5rem;
          font-weight: bold;
        }
        :global(.markdown-content h2) {
          font-size: 1.25rem;
          font-weight: bold;
        }
        :global(.markdown-content h3) {
          font-size: 1.1rem;
          font-weight: bold;
        }
        :global(.markdown-content p) {
          margin-bottom: 0.5rem;
          text-align: center;
        }
        :global(.markdown-content ul), :global(.markdown-content ol) {
          padding-left: 1.5rem;
          margin-bottom: 0.5rem;
          margin-left: auto;
          margin-right: auto;
        }
        :global(.markdown-content li) {
          margin-bottom: 0.25rem;
          text-align: left;
        }
        :global(.markdown-content pre) {
          background: #f5f5f5;
          padding: 0.5rem;
          border-radius: 0.25rem;
          overflow-x: auto;
          margin-bottom: 0.5rem;
          max-width: 100%;
        }
        :global(.markdown-content code) {
          font-family: monospace;
          background: #f5f5f5;
          padding: 0.1rem 0.25rem;
          border-radius: 0.25rem;
        }
        :global(.markdown-content img) {
          margin: 0 auto;
          display: block;
          max-width: 100%;
        }
      `}</style>
      
      {/* Correct/Incorrect buttons */}
      <div className="absolute flex flex-col gap-10 justify-center" style={{top: 0, bottom: 0, right: -60, height: '100%', zIndex: 2}}>
        <button className='text-3xl cursor-pointer flex flex-col items-center gap-1' onClick={() => handleMark(true)}>
          <span className='opacity-80 hover:scale-110 hover:opacity-100 transition-all' role="img" aria-label="check">✅</span>
          <span className="text-lg">Correct</span>
        </button>
        <button className='text-3xl cursor-pointer flex flex-col items-center gap-1' onClick={() => handleMark(false)}>
          <span className='opacity-80 hover:scale-110 hover:opacity-100 transition-all' role="img" aria-label="cross">❌</span>
          <span className="text-lg">Incorrect</span>
        </button>
      </div>
    </div>
  );
};

