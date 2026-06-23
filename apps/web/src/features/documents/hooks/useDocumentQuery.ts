import type { DocumentQueryResponse } from '@admin/contracts';
import { useState } from 'react';
import { createLocalDocumentAnswer } from '../../../shared/api/localDocumentAnswer';
import { queryDocuments } from '../../../shared/api/queryDocuments';

export type DocumentQueryStatus = 'idle' | 'loading' | 'ready' | 'fallback' | 'error';

const MIN_QUESTION_LENGTH = 3;
const MAX_QUESTION_LENGTH = 300;

interface DocumentQueryState {
  readonly error?: string;
  readonly result?: DocumentQueryResponse;
  readonly status: DocumentQueryStatus;
}

export function useDocumentQuery() {
  const [state, setState] = useState<DocumentQueryState>({ status: 'idle' });

  async function submit(question: string): Promise<void> {
    const trimmedQuestion = question.trim();
    if (
      trimmedQuestion.length < MIN_QUESTION_LENGTH ||
      trimmedQuestion.length > MAX_QUESTION_LENGTH
    ) {
      setState({
        error: 'La consulta debe tener entre 3 y 300 caracteres.',
        status: 'error',
      });
      return;
    }

    setState({ status: 'loading' });

    try {
      const result = await queryDocuments(trimmedQuestion);
      setState({ result, status: 'ready' });
    } catch (error) {
      console.error('[useDocumentQuery] Se usa RAG local determinista.', error);
      setState({ result: createLocalDocumentAnswer(trimmedQuestion), status: 'fallback' });
    }
  }

  return { ...state, submit };
}
