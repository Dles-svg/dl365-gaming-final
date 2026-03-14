import { useState } from 'react';
import { supabase } from '../lib/supabase';

interface MaskingFormProps {
  onSubmitSuccess: () => void;
}

export default function MaskingForm({ onSubmitSuccess }: MaskingFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [keywordInput, setKeywordInput] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const addKeyword = () => {
    const trimmed = keywordInput.trim();
    if (trimmed && !keywords.includes(trimmed)) {
      setKeywords([...keywords, trimmed]);
      setKeywordInput('');
    }
  };

  const removeKeyword = (keyword: string) => {
    setKeywords(keywords.filter(k => k !== keyword));
  };

  const handleKeywordKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addKeyword();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('Not authenticated');
      }

      const { error: insertError } = await supabase
        .from('masking_info')
        .insert({
          title,
          description,
          keywords,
          user_id: user.id,
        });

      if (insertError) throw insertError;

      setTitle('');
      setDescription('');
      setKeywords([]);
      setKeywordInput('');
      onSubmitSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="masking-form">
      <h2>Add Masking Information</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="title">Title</label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="Enter title"
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            placeholder="Enter detailed description"
            rows={4}
          />
        </div>

        <div className="form-group">
          <label htmlFor="keywords">Keywords</label>
          <div className="keyword-input-group">
            <input
              id="keywords"
              type="text"
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onKeyPress={handleKeywordKeyPress}
              placeholder="Enter keyword and press Enter"
            />
            <button type="button" onClick={addKeyword} className="btn-secondary">
              Add
            </button>
          </div>

          {keywords.length > 0 && (
            <div className="keywords-list">
              {keywords.map((keyword) => (
                <span key={keyword} className="keyword-tag">
                  {keyword}
                  <button
                    type="button"
                    onClick={() => removeKeyword(keyword)}
                    className="keyword-remove"
                    aria-label={`Remove ${keyword}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {error && <div className="error-message">{error}</div>}

        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Saving...' : 'Save Masking Info'}
        </button>
      </form>
    </div>
  );
}
