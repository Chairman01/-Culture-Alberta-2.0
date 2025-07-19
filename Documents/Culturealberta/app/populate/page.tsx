"use client"

import { useState } from 'react';
import { populateArticles } from '@/scripts/populate-articles';

export default function PopulatePage() {
  const [status, setStatus] = useState<string>('');
  const [isError, setIsError] = useState(false);

  const handlePopulate = async () => {
    try {
      setStatus('Populating articles...');
      setIsError(false);
      
      const success = populateArticles();
      
      if (success) {
        setStatus('Articles successfully populated! You can now return to the homepage.');
      } else {
        throw new Error('Failed to populate articles');
      }
    } catch (error: any) {
      setStatus(`Error: ${error?.message || 'Unknown error occurred'}`);
      setIsError(true);
    }
  };

  return (
    <div className="min-h-screen bg-white p-8">
      <h1 className="text-3xl font-bold mb-4">Article Population Tool</h1>
      <p className="mb-6 text-gray-600">
        Click the button below to populate the website with sample articles. This will clear any existing articles and add new ones.
      </p>
      
      <button
        onClick={handlePopulate}
        className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded"
      >
        Populate Articles
      </button>

      {status && (
        <div className={`mt-4 p-4 rounded ${isError ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          {status}
        </div>
      )}
    </div>
  )
} 