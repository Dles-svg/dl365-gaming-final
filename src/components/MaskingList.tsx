import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { MaskingInfo } from '../lib/supabase';

export default function MaskingList() {
  const [maskingItems, setMaskingItems] = useState<MaskingInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchMaskingItems = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('masking_info')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMaskingItems(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load masking items');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaskingItems();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this masking information?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('masking_info')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setMaskingItems(maskingItems.filter(item => item.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete item');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return <div className="loading">Loading masking information...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="masking-list">
      <h2>Your Masking Information</h2>

      {maskingItems.length === 0 ? (
        <div className="empty-state">
          <p>No masking information yet. Add your first entry above!</p>
        </div>
      ) : (
        <div className="masking-items">
          {maskingItems.map((item) => (
            <div key={item.id} className="masking-card">
              <div className="masking-card-header">
                <h3>{item.title}</h3>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="btn-delete"
                  aria-label="Delete"
                >
                  Delete
                </button>
              </div>

              <p className="masking-description">{item.description}</p>

              {item.keywords.length > 0 && (
                <div className="masking-keywords">
                  {item.keywords.map((keyword, index) => (
                    <span key={index} className="keyword-tag readonly">
                      {keyword}
                    </span>
                  ))}
                </div>
              )}

              <div className="masking-meta">
                <span className="date">Created: {formatDate(item.created_at)}</span>
                {item.updated_at !== item.created_at && (
                  <span className="date">Updated: {formatDate(item.updated_at)}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
