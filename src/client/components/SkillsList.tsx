// ============================================
// SkillsList Component - Display available skills
// Shows MCP skills from the server
// ============================================

import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/apiClient';
import type { MCPSkill } from '../../types';
import { TTCIcon } from './TTCIcon';

interface SkillsListProps {
  onRequestSkill: () => void;
}

export function SkillsList({ onRequestSkill }: SkillsListProps): React.ReactElement {
  const [skills, setSkills] = useState<MCPSkill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSkills() {
      try {
        const result = await apiClient.getSkills();
        if (result.success) {
          setSkills(result.skills);
        } else {
          setError(result.error || 'Failed to load skills');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load skills');
      } finally {
        setIsLoading(false);
      }
    }

    loadSkills();
  }, []);

  return (
    <div className="skills-panel">
      <div className="skills-header">
        <h3><TTCIcon size={18} /> Available Skills</h3>
        <button 
          className="button small primary" 
          onClick={onRequestSkill}
        >
          + Request Skill
        </button>
      </div>

      <div className="skills-list">
        {isLoading && (
          <div className="skills-loading">
            <span className="spinner"></span>
            Loading skills...
          </div>
        )}

        {error && (
          <div className="skills-error">
            <span>⚠️</span> {error}
          </div>
        )}

        {!isLoading && !error && skills.length === 0 && (
          <div className="skills-empty">
            <p>No skills available yet.</p>
            <p className="hint">Request a new skill to get started!</p>
          </div>
        )}

        {skills.map((skill) => (
          <SkillCard key={skill.name} skill={skill} />
        ))}
      </div>
    </div>
  );
}

interface SkillCardProps {
  skill: MCPSkill;
}

function SkillCard({ skill }: SkillCardProps): React.ReactElement {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="skill-card">
      <div 
        className="skill-card-header" 
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="skill-icon"><TTCIcon size={16} /></span>
        <div className="skill-info">
          <span className="skill-name">{skill.name}</span>
          <span className="skill-description">{skill.description}</span>
        </div>
        <span className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>
          ▶
        </span>
      </div>

      {isExpanded && (
        <div className="skill-card-details">
          <div className="schema-label">Input Schema:</div>
          <pre className="schema-code">
            {JSON.stringify(skill.inputSchema, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
