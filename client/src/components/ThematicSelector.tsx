import { useState } from 'react';
import { Thematic, SubThematic } from '../lib/types';

interface ThematicSelectorProps {
  thematics: Thematic[];
  onChange: (next: Thematic[]) => void;
}

function makeId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

export function ThematicSelector({ thematics, onChange }: ThematicSelectorProps) {
  const [newThematic, setNewThematic] = useState('');
  const [newSubthemeByThematic, setNewSubthemeByThematic] = useState<Record<string, string>>({});

  const toggleThematic = (id: string) => {
    onChange(
      thematics.map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item
      )
    );
  };

  const toggleSubtheme = (thematicId: string, subId: string) => {
    onChange(
      thematics.map((thematic) => {
        if (thematic.id !== thematicId) return thematic;
        return {
          ...thematic,
          subthemes: thematic.subthemes.map((sub) =>
            sub.id === subId ? { ...sub, checked: !sub.checked } : sub
          )
        };
      })
    );
  };

  const handleAddThematic = () => {
    const trimmed = newThematic.trim();
    if (!trimmed) return;
    const thematic: Thematic = {
      id: makeId(),
      label: trimmed,
      checked: true,
      custom: true,
      subthemes: []
    };
    onChange([...thematics, thematic]);
    setNewThematic('');
  };

  const handleAddSubtheme = (thematic: Thematic) => {
    const trimmed = (newSubthemeByThematic[thematic.id] || '').trim();
    if (!trimmed) return;
    const newSub: SubThematic = {
      id: makeId(),
      label: trimmed,
      checked: true,
      custom: true
    };
    onChange(
      thematics.map((item) =>
        item.id === thematic.id
          ? { ...item, subthemes: [...item.subthemes, newSub] }
          : item
      )
    );
    setNewSubthemeByThematic((prev) => ({ ...prev, [thematic.id]: '' }));
  };

  return (
    <div className="thematics-list">
      {thematics.map((thematic) => (
        <div key={thematic.id} className="thematic">
          <div className="thematic-header">
            <input
              type="checkbox"
              checked={thematic.checked}
              onChange={() => toggleThematic(thematic.id)}
              id={`thematic-${thematic.id}`}
            />
            <label htmlFor={`thematic-${thematic.id}`}>{thematic.label}</label>
          </div>
          <div className="subtheme-list">
            {thematic.subthemes.map((sub) => (
              <label key={sub.id} className="subtheme-option">
                <input
                  type="checkbox"
                  checked={sub.checked}
                  onChange={() => toggleSubtheme(thematic.id, sub.id)}
                />
                {sub.label}
              </label>
            ))}
          </div>
          <div className="add-input-row">
            <input
              type="text"
              placeholder="Ajouter une sous-thématique"
              value={newSubthemeByThematic[thematic.id] || ''}
              onChange={(event) =>
                setNewSubthemeByThematic((prev) => ({
                  ...prev,
                  [thematic.id]: event.target.value
                }))
              }
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  handleAddSubtheme(thematic);
                }
              }}
            />
            <button
              type="button"
              className="secondary"
              onClick={() => handleAddSubtheme(thematic)}
            >
              Ajouter
            </button>
          </div>
        </div>
      ))}
      <div className="add-input-row">
        <input
          type="text"
          placeholder="Ajouter une thématique"
          value={newThematic}
          onChange={(event) => setNewThematic(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              handleAddThematic();
            }
          }}
        />
        <button type="button" className="secondary" onClick={handleAddThematic}>
          Ajouter
        </button>
      </div>
    </div>
  );
}
