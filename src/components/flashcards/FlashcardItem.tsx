import React, { useState } from 'react';
import { Flashcard, FlashcardType } from '../../lib/api/flashcards.service';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

interface FlashcardItemProps {
  flashcard: Flashcard;
  onShowSource?: (fileId: string, excerpt: string) => void;
}

export const FlashcardItem: React.FC<FlashcardItemProps> = ({ 
  flashcard,
  onShowSource 
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isClozeRevealed, setIsClozeRevealed] = useState(false);

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleRevealCloze = () => {
    setIsClozeRevealed(true);
  };

  const handleReset = () => {
    setIsFlipped(false);
    setIsClozeRevealed(false);
  };

  const handleShowSource = () => {
    if (flashcard.sourceMaterial && onShowSource) {
      onShowSource(
        flashcard.sourceMaterial.fileId,
        flashcard.sourceMaterial.excerpt
      );
    }
  };

  // For cloze type, we need to render the front content with blanks
  const renderClozeContent = () => {
    if (!isClozeRevealed) {
      // Replace content with blanks (assuming content has [BLANK] markers)
      return flashcard.front.replace(/\[BLANK\]/g, '________');
    }
    return flashcard.back;
  };

  const renderFlashcardContent = () => {
    if (flashcard.type === FlashcardType.CLOZE) {
      return (
        <div className="min-h-[150px] flex flex-col">
          <div className="mb-4 flex-grow">
            <p className="text-lg">{renderClozeContent()}</p>
          </div>
          
          <div className="mt-auto flex justify-between">
            {!isClozeRevealed ? (
              <Button onClick={handleRevealCloze}>Reveal Answer</Button>
            ) : (
              <Button onClick={handleReset} variant="secondary">Reset</Button>
            )}
            
            {flashcard.sourceMaterial && (
              <Button 
                variant="secondary" 
                onClick={handleShowSource}
              >
                Show Source
              </Button>
            )}
          </div>
        </div>
      );
    }

    // Q&A flashcard type
    return (
      <div className="min-h-[150px] flex flex-col">
        <div className="mb-4 flex-grow">
          {!isFlipped ? (
            <p className="text-lg">{flashcard.front}</p>
          ) : (
            <p className="text-lg">{flashcard.back}</p>
          )}
        </div>
        
        <div className="mt-auto flex justify-between">
          <Button onClick={handleFlip}>
            {isFlipped ? 'Show Question' : 'Show Answer'}
          </Button>
          
          {flashcard.sourceMaterial && (
            <Button 
              variant="secondary" 
              onClick={handleShowSource}
            >
              Show Source
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card className="mb-4">
      <div className="mb-2 flex items-center justify-between">
        <Badge 
          variant={flashcard.type === FlashcardType.CLOZE ? 'orange' : 'cyan'}
        >
          {flashcard.type === FlashcardType.CLOZE ? 'Cloze' : 'Q&A'}
        </Badge>
        
        <Badge variant={
          flashcard.difficulty === 'easy' 
            ? 'cyan' 
            : flashcard.difficulty === 'moderate' 
              ? 'orange' 
              : 'primary'
        }>
          {flashcard.difficulty.charAt(0).toUpperCase() + flashcard.difficulty.slice(1)}
        </Badge>
      </div>
      
      {renderFlashcardContent()}
    </Card>
  );
};
