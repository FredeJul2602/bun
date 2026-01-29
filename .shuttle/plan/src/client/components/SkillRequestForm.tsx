// ============================================
// SkillRequestForm Component - Request new skills
// Follows Form Strategy pattern
// ============================================

import React, { useState, useCallback } from 'react';
import { apiClient } from '../api/apiClient';
import type { SkillRequestFormData } from '../../types';

interface SkillRequestFormProps {
  onClose: () => void;
  onSuccess?: () => void;
}

const initialFormData: SkillRequestFormData = {
  skillName: '',
  description: '',
  exampleInputs: '',
  exampleOutputs: '',
  useCase: '',
  priority: 'medium',
  requesterName: '',
  requesterEmail: '',
};

export function SkillRequestForm({ onClose, onSuccess }: SkillRequestFormProps): React.ReactElement {
  const [formData, setFormData] = useState<SkillRequestFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.skillName.trim()) {
      setError('Skill name is required');
      return;
    }
    if (!formData.description.trim()) {
      setError('Description is required');
      return;
    }
    if (!formData.requesterName.trim()) {
      setError('Your name is required');
      return;
    }
    if (!formData.requesterEmail.trim() || !formData.requesterEmail.includes('@')) {
      setError('Valid email is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await apiClient.submitSkillRequest(formData);
      
      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 2000);
      } else {
        setError(result.error || 'Failed to submit request');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit request');
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, onClose, onSuccess]);

  if (success) {
    return (
      <div className="skill-request-modal">
        <div className="modal-content success-message">
          <span className="success-icon">✅</span>
          <h3>Request Submitted!</h3>
          <p>Your skill request has been sent. We'll review it soon.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="skill-request-modal" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Request a New Skill</h2>
          <button className="close-button" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="skill-request-form">
          {error && (
            <div className="form-error">
              <span>⚠️</span> {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="skillName">Skill Name *</label>
            <input
              type="text"
              id="skillName"
              name="skillName"
              value={formData.skillName}
              onChange={handleChange}
              placeholder="e.g., Generate Sales Report"
              disabled={isSubmitting}
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description *</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe what the skill should do..."
              rows={3}
              disabled={isSubmitting}
            />
          </div>

          <div className="form-group">
            <label htmlFor="useCase">Use Case</label>
            <textarea
              id="useCase"
              name="useCase"
              value={formData.useCase}
              onChange={handleChange}
              placeholder="When and how would you use this skill?"
              rows={2}
              disabled={isSubmitting}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="exampleInputs">Example Inputs</label>
              <textarea
                id="exampleInputs"
                name="exampleInputs"
                value={formData.exampleInputs}
                onChange={handleChange}
                placeholder="What data would you provide?"
                rows={3}
                disabled={isSubmitting}
              />
            </div>

            <div className="form-group">
              <label htmlFor="exampleOutputs">Expected Outputs</label>
              <textarea
                id="exampleOutputs"
                name="exampleOutputs"
                value={formData.exampleOutputs}
                onChange={handleChange}
                placeholder="What results do you expect?"
                rows={3}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="priority">Priority</label>
            <select
              id="priority"
              name="priority"
              value={formData.priority}
              onChange={handleChange}
              disabled={isSubmitting}
            >
              <option value="low">Low - Nice to have</option>
              <option value="medium">Medium - Would improve workflow</option>
              <option value="high">High - Significant time savings</option>
              <option value="critical">Critical - Blocking work</option>
            </select>
          </div>

          <hr className="form-divider" />

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="requesterName">Your Name *</label>
              <input
                type="text"
                id="requesterName"
                name="requesterName"
                value={formData.requesterName}
                onChange={handleChange}
                placeholder="John Doe"
                disabled={isSubmitting}
              />
            </div>

            <div className="form-group">
              <label htmlFor="requesterEmail">Your Email *</label>
              <input
                type="email"
                id="requesterEmail"
                name="requesterEmail"
                value={formData.requesterEmail}
                onChange={handleChange}
                placeholder="john@company.com"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="form-actions">
            <button 
              type="button" 
              onClick={onClose} 
              className="button secondary"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="button primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
