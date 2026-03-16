import React, { useState } from 'react';
import { SIDEBAR_CATALOGUE } from '../utils/mathConstants';

function CatalogueGroup({ group, onInsert, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-bottom border-secondary-subtle">
      <button className="btn btn-light w-100 d-flex justify-content-between align-items-center rounded-0 py-2 px-3 fw-bold text-dark border-0 shadow-none" onClick={() => setOpen(!open)}>
        <span className="d-flex align-items-center gap-2" style={{fontSize: '0.8rem'}}>
          <span className="text-primary font-monospace fst-italic">{group.icon}</span>
          {group.group}
        </span>
        <i className={`bi bi-chevron-${open ? 'down' : 'right'} text-muted`}></i>
      </button>
      {open && (
        <div className="list-group list-group-flush pb-2 bg-white bg-opacity-50">
          {group.items.map(item => (
            <button key={item.label} className="list-group-item list-group-item-action d-flex justify-content-between py-1 px-3 border-0 bg-transparent" onClick={() => onInsert(item.insert)}>
              <span className="font-monospace small fw-medium">{item.label}</span>
              <span className="text-muted small">{item.value}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Sidebar({ onInsert, collapsed, onToggle, userVars = {} }) {
  const varEntries = Object.entries(userVars);

  return (
    <aside className={`sidebar-panel bg-light border-end d-flex flex-column position-relative ${collapsed ? 'collapsed' : ''}`}>
      <button className="btn btn-light border border-start-0 sidebar-toggle-btn p-0 d-flex align-items-center justify-content-center" onClick={onToggle}>
        <i className={`bi bi-chevron-${collapsed ? 'right' : 'left'} text-secondary`} style={{fontSize: '10px'}}></i>
      </button>

      {!collapsed && (
        <div className="flex-grow-1 overflow-auto custom-scrollbar">
          {varEntries.length > 0 && (
            <div className="border-bottom border-secondary-subtle">
              <div className="bg-secondary bg-opacity-10 py-1 px-3 text-uppercase fw-bold text-muted" style={{fontSize: '0.65rem'}}>Workspace Variables</div>
              <div className="list-group list-group-flush py-1">
                {varEntries.map(([name, val]) => (
                  <button key={name} className="list-group-item list-group-item-action d-flex justify-content-between py-1 px-3 border-0 bg-transparent" onClick={() => onInsert(name)}>
                    <span className="text-primary font-monospace small fw-bold">{name}</span>
                    <span className="text-muted font-monospace small">{val}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {SIDEBAR_CATALOGUE.map((g, i) => <CatalogueGroup key={g.group} group={g} onInsert={onInsert} defaultOpen={i === 0} />)}
        </div>
      )}
    </aside>
  );
}
