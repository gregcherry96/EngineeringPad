import React, { useState, useCallback } from 'react';
import { SIDEBAR_CATALOGUE } from './constants';

function CatalogueItem({ item, onInsert }) {
  return (
    <button className="sidebar-item" onClick={() => onInsert(item.insert)} title={item.value}>
      <span className="sidebar-item-label">{item.label}</span>
      <span className="sidebar-item-value">{item.value}</span>
    </button>
  );
}

function CatalogueGroup({ group, onInsert, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="sidebar-group">
      <button className="sidebar-group-header" onClick={() => setOpen(o => !o)}>
        <span className="sidebar-group-icon">{group.icon}</span>
        <span className="sidebar-group-title">{group.group}</span>
        <span className={`sidebar-group-chevron${open ? ' open' : ''}`}>›</span>
      </button>
      {open && (
        <div className="sidebar-group-body">
          {group.items.map(item => <CatalogueItem key={item.label} item={item} onInsert={onInsert} />)}
        </div>
      )}
    </div>
  );
}

function SearchResults({ query, onInsert }) {
  const q = query.toLowerCase();
  const matches = SIDEBAR_CATALOGUE.flatMap(g =>
    g.items.filter(i =>
      i.label.toLowerCase().includes(q) ||
      i.insert.toLowerCase().includes(q) ||
      i.value.toLowerCase().includes(q)
    ).map(i => ({ ...i, groupName: g.group }))
  );
  if (!matches.length) return <p className="sidebar-empty">No results for "{query}"</p>;
  return <div className="sidebar-search-results">{matches.map(i => <CatalogueItem key={i.groupName+i.label} item={i} onInsert={onInsert} />)}</div>;
}

// ── Live variables panel ──────────────────────────────────────────────────────
function UserVarsPanel({ userVars, onInsert }) {
  const entries = Object.entries(userVars);
  if (!entries.length) return null;
  return (
    <div className="sidebar-vars-panel">
      <div className="sidebar-vars-header">
        <span className="sidebar-vars-title">Workspace variables</span>
        <span className="sidebar-vars-count">{entries.length}</span>
      </div>
      <div className="sidebar-vars-body">
        {entries.map(([name, val]) => (
          <button key={name} className="sidebar-item sidebar-var-item" onClick={() => onInsert(name)} title={`Insert "${name}"`}>
            <span className="sidebar-item-label sidebar-var-name">{name}</span>
            <span className="sidebar-item-value sidebar-var-val">{val}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Quick-insert chips ────────────────────────────────────────────────────────
const QUICK_CHIPS = [
  { label: 'π',    insert: 'pi'      },
  { label: 'e',    insert: 'e'       },
  { label: 'g',    insert: 'g'       },
  { label: '√',    insert: 'sqrt('   },
  { label: 'sin',  insert: 'sin('    },
  { label: 'cos',  insert: 'cos('    },
  { label: 'log',  insert: 'log('    },
  { label: 'abs',  insert: 'abs('    },
];

function QuickInsert({ onInsert }) {
  return (
    <div className="sidebar-quick">
      <div className="sidebar-quick-title">Quick insert</div>
      <div className="sidebar-quick-chips">
        {QUICK_CHIPS.map(c => (
          <button key={c.label} className="quick-chip" onClick={() => onInsert(c.insert)} title={c.insert}>
            {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Main sidebar ──────────────────────────────────────────────────────────────
export default function Sidebar({ onInsert, collapsed, onToggle, userVars = {} }) {
  const [search, setSearch] = useState('');
  const insert = useCallback(s => onInsert(s), [onInsert]);

  return (
    <aside className={`sidebar${collapsed ? ' collapsed' : ''}`}>
      <button className="sidebar-toggle" onClick={onToggle} title={collapsed ? 'Open panel' : 'Close panel'}>
        <span className={`sidebar-toggle-arrow${collapsed ? ' flipped' : ''}`}>‹</span>
      </button>

      {!collapsed && (<>
        <div className="sidebar-header">
          <span className="sidebar-header-title">Functions &amp; Constants</span>
        </div>

        <UserVarsPanel userVars={userVars} onInsert={insert} />
        <QuickInsert onInsert={insert} />

        <div className="sidebar-search-wrap">
          <input
            className="sidebar-search"
            type="text"
            placeholder="Search functions, constants…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            spellCheck={false}
          />
          {search && <button className="sidebar-search-clear" onClick={() => setSearch('')}>×</button>}
        </div>

        <div className="sidebar-scroll">
          {search.trim()
            ? <SearchResults query={search.trim()} onInsert={insert} />
            : SIDEBAR_CATALOGUE.map((g, i) => (
                <CatalogueGroup key={g.group} group={g} onInsert={insert} defaultOpen={i < 2} />
              ))
          }
        </div>

        <div className="sidebar-footer">Click any item to insert at cursor</div>
      </>)}
    </aside>
  );
}
