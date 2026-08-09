import { useState } from 'react'
import { useStore } from '../store'

export default function CategoriesScreen() {
  const categories = useStore((s) => s.categories)
  const createCategory = useStore((s) => s.createCategory)
  const deleteCategory = useStore((s) => s.deleteCategory)
  const habits = useStore((s) => s.habits)
  const [name, setName] = useState('')
  const [color, setColor] = useState('#3b82f6')

  const add = async () => {
    if (!name.trim()) return
    await createCategory({ name: name.trim(), color, icon: '🏷️' })
    setName('')
  }

  return (
    <div className="page">
      <div className="topbar">
        <h1>Categories</h1>
      </div>

      <div className="card">
        <h2>New category</h2>
        <div className="sheet-form">
          <div className="field">
            <label>Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Hobbies" />
          </div>
          <div className="row wrap">
            {['#ef4444', '#f97316', '#3b82f6', '#22c55e', '#a855f7', '#06b6d4', '#ec4899', '#eab308'].map((c) => (
              <button
                key={c}
                className="icon-btn"
                style={{ background: c, borderColor: color === c ? '#fff' : 'transparent' }}
                onClick={() => setColor(c)}
                aria-label={`Color ${c}`}
              />
            ))}
          </div>
          <button className="btn" onClick={add}>
            Add category
          </button>
        </div>
      </div>

      <div className="card">
        <h2>All categories</h2>
        <div className="list-plain">
          {categories.map((c) => {
            const count = habits.filter((h) => h.categoryId === c.id && !h.archivedAt).length
            return (
              <div key={c.id} className="list-row">
                <div className="row">
                  <span className="cat-dot" style={{ background: c.color }} />
                  <span className="title">
                    {c.icon} {c.name}
                  </span>
                  <span className="text-s text-faint">{count} habit{count === 1 ? '' : 's'}</span>
                </div>
                {!c.isPreset && (
                  <button className="icon-btn" onClick={() => deleteCategory(c.id)} aria-label="Delete category">
                    ✕
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}