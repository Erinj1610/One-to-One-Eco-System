import React, { useState, useEffect } from 'react';
import { Sparkles, AlertCircle, Smile } from 'lucide-react';
import { API_BASE } from '../../api_config';

export default function PulseSurveyModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [stressScore, setStressScore] = useState(0);
  const [commentText, setCommentText] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Check if today is Friday
  const checkIfFriday = () => {
    const today = new Date();
    // 5 is Friday
    return today.getDay() === 5;
  };

  useEffect(() => {
    const today = new Date();
    // Use format: YYYY-MM-DD or week number to track weekly completion
    const year = today.getFullYear();
    const start = new Date(year, 0, 1);
    const diff = today - start;
    const oneDay = 1000 * 60 * 60 * 24;
    const weekNum = Math.ceil(Math.floor(diff / oneDay) / 7);
    const completionKey = `pulse_survey_completed_w${year}_${weekNum}`;

    const alreadyDone = localStorage.getItem(completionKey);
    const isFriday = checkIfFriday();

    // Show if it's Friday and not yet done, or if dev override is requested
    if (isFriday && !alreadyDone) {
      setIsOpen(true);
    }

    // Listen to manual dev trigger events for easy validation
    const handleDevTrigger = () => {
      setIsOpen(true);
      setSubmitted(false);
      setStressScore(0);
      setCommentText('');
    };
    window.addEventListener('trigger-pulse-survey', handleDevTrigger);
    return () => window.removeEventListener('trigger-pulse-survey', handleDevTrigger);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (stressScore < 1 || stressScore > 5) {
      setError("Please select a stress level from 1 to 5.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/hr/pulse-surveys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stress_score: stressScore,
          comment_text: commentText || null,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to submit feedback. Please try again.");
      }

      setSubmitted(true);
      // Mark as completed for this week in localStorage
      const today = new Date();
      const year = today.getFullYear();
      const diff = today - new Date(year, 0, 1);
      const weekNum = Math.ceil(Math.floor(diff / (1000 * 60 * 60 * 24)) / 7);
      localStorage.setItem(`pulse_survey_completed_w${year}_${weekNum}`, 'true');

      // Dispatch event to refresh graphs on HrPage if open
      window.dispatchEvent(new Event('pulse-survey-submitted'));

      setTimeout(() => {
        setIsOpen(false);
      }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-bg active" style={{ zIndex: 9999 }}>
      <div className="modal" style={{ maxWidth: '440px', padding: '24px', border: '1.5px solid var(--border-info)' }} onClick={e => e.stopPropagation()}>
        <div className="modal-head" style={{ marginBottom: 16 }}>
          <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-info)' }}>
            <Smile size={20} />
            Friday Team Pulse
          </div>
          <button className="modal-close" onClick={() => setIsOpen(false)}>✕</button>
        </div>
        
        <div className="modal-body" style={{ padding: 0 }}>
          {submitted ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ display: 'inline-flex', padding: '12px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', marginBottom: '12px' }}>
                <Sparkles size={32} color="#10b981" />
              </div>
              <h3 style={{ margin: '0 0 8px 0', color: 'var(--text-success)' }}>Thank You!</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Your feedback was submitted anonymously. Have a great weekend!</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '18px', lineHeight: 1.5 }}>
                Help us prevent burnout. Please rate your overall work stress level this week. This feedback is <strong>100% anonymous</strong> and cannot be linked back to you.
              </p>

              {error && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#f87171', padding: '10px', borderRadius: '8px', fontSize: '12px', marginBottom: '14px' }}>
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                  <span>{error}</span>
                </div>
              )}

              <div style={{ marginBottom: '20px' }}>
                <label className="form-label" style={{ fontWeight: 600, marginBottom: '10px', display: 'block', textAlign: 'center' }}>
                  Rate your stress level (1 = Very Low, 5 = Very High)
                </label>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                  {[1, 2, 3, 4, 5].map((score) => {
                    const colors = {
                      1: { bg: '#eaf3de', text: '#528216', border: '#b2d680' },
                      2: { bg: '#e8f6ff', text: '#1d6092', border: '#8cc6ed' },
                      3: { bg: '#fff7e6', text: '#b26e0e', border: '#ffd280' },
                      4: { bg: '#fff0ee', text: '#be3929', border: '#ffbcae' },
                      5: { bg: '#fcebeb', text: '#c81e1e', border: '#f8b4b4' }
                    };
                    const isSelected = stressScore === score;
                    const c = colors[score];
                    return (
                      <button
                        key={score}
                        type="button"
                        onClick={() => setStressScore(score)}
                        style={{
                          width: '46px',
                          height: '46px',
                          borderRadius: '50%',
                          border: isSelected ? `2.5px solid ${c.text}` : `1px solid var(--border-color)`,
                          background: isSelected ? c.bg : 'var(--bg-secondary)',
                          color: isSelected ? c.text : 'var(--text-secondary)',
                          fontSize: '16px',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: isSelected ? `0 0 10px ${c.border}` : 'none'
                        }}
                      >
                        {score}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="form-row" style={{ marginBottom: '20px' }}>
                <label className="form-label">Any optional details or suggestions?</label>
                <textarea
                  className="form-control"
                  rows={3}
                  placeholder="Optional comments... (e.g., resources needed, bottleneck issues)"
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  style={{ resize: 'none', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn" onClick={() => setIsOpen(false)}>Skip</button>
                <button type="submit" className="btn btn-primary" disabled={loading || stressScore === 0}>
                  {loading ? 'Submitting...' : 'Submit Anonymously'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
