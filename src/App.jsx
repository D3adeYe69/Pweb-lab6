import React, { useEffect, useState } from 'react'
import { marked } from 'marked'
import IngredientBank from './IngredientBank'

const STORAGE_KEY = 'recipe-box.recipes'
const THEME_KEY = 'recipe-box.theme'

function normalizeInitialIngredients(arr){
  if (!arr) return []
  return arr.map(i => typeof i === 'string' ? { name: i, amount: '', image: '' } : i)
}

function RecipeForm({ onCancel, onSave, initial }){
  const isEdit = !!initial
  const [title, setTitle] = useState(initial?.title||'')
  const [ingredients, setIngredients] = useState(()=> normalizeInitialIngredients(initial?.ingredients) || [{ name: '', amount: '', image: '' }])
  const [steps, setSteps] = useState(initial?.steps||'')
  const [tags, setTags] = useState((initial?.tags||[]).join(', '))
  const [prepTime, setPrepTime] = useState(initial?.prepTime||'')
  const [cookTime, setCookTime] = useState(initial?.cookTime||'')
  const [servings, setServings] = useState(initial?.servings||'')
  const [notes, setNotes] = useState(initial?.notes||'')

  function addIngredientsFromBank(items){
    setIngredients(prev => [...items, ...prev])
  }

  function save(e){
    e.preventDefault()
    const rec = {
      id: initial?.id || Date.now(),
      title: title.trim() || 'Untitled',
      ingredients: ingredients.map(i=>({ name: i.name.trim(), amount: (i.amount||'').trim(), image: i.image||'' })).filter(i=>i.name),
      steps, tags: tags.split(',').map(t=>t.trim()).filter(Boolean), prepTime, cookTime, servings, notes, liked: initial?.liked||false
    }
    onSave(rec)
  }

  return (
    <form className="recipe-form" onSubmit={save}>
      <div className="row"><label>Title<input value={title} onChange={e=>setTitle(e.target.value)} required/></label></div>

      <div className="row">
        <label>Ingredients</label>
        <IngredientBank onBatchAdd={addIngredientsFromBank} />
        {ingredients.map((ing,i)=> (
          <div key={i} className="ing-row">
            {ing.image && <span className="ing-emoji">{ing.image}</span>}
            <input value={ing.name} onChange={e=>{ const copy=[...ingredients]; copy[i]={...copy[i], name:e.target.value}; setIngredients(copy)}} placeholder="Ingredient name" />
            <input value={ing.amount} onChange={e=>{ const copy=[...ingredients]; copy[i]={...copy[i], amount:e.target.value}; setIngredients(copy)}} placeholder="Amount (e.g. 1 cup)" />
            <button type="button" onClick={()=>setIngredients(prev=>prev.filter((_,idx)=>idx!==i))}>Remove</button>
          </div>
        ))}
        <button type="button" onClick={()=>setIngredients(prev=>[...prev,{ name:'', amount:'', image:'' }])}>Add custom ingredient</button>
      </div>

      <div className="row"><label>Steps (markdown)<textarea value={steps} onChange={e=>setSteps(e.target.value)} /></label></div>
      <div className="row"><label>Tags<input value={tags} onChange={e=>setTags(e.target.value)} placeholder="comma separated"/></label></div>
      <div className="row small">
        <label>Prep<input value={prepTime} onChange={e=>setPrepTime(e.target.value)} /></label>
        <label>Cook<input value={cookTime} onChange={e=>setCookTime(e.target.value)} /></label>
        <label>Serves<input value={servings} onChange={e=>setServings(e.target.value)} /></label>
      </div>
      <div className="row"><label>Notes<textarea value={notes} onChange={e=>setNotes(e.target.value)} /></label></div>
      <div className="form-actions">
        <button type="submit">{isEdit?'Save':'Create'}</button>
        <button type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}

export default function App(){
  const [recipes, setRecipes] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) return JSON.parse(stored)
    } catch (err) {
      console.error('Failed to read recipes from localStorage:', err)
    }
    return []
  })
  const [view, setView] = useState('list')
  const [editing, setEditing] = useState(null)
  const [dark, setDark] = useState(() => localStorage.getItem(THEME_KEY) === 'dark')
  const [filter, setFilter] = useState('')

  useEffect(()=>{
    document.body.classList.toggle('dark', dark)
    localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light')
  }, [dark])

  useEffect(()=>{
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes))
  }, [recipes])

  function nextRecipeId(list){
    return list.length ? Math.max(...list.map(recipe => recipe.id || 0)) + 1 : 1
  }

  function addRecipe(r){
    const newRecipe = { ...r, id: nextRecipeId(recipes) }
    setRecipes(prev => [newRecipe, ...prev])
    setView('list')
  }

  function updateRecipe(r){
    setRecipes(prev => prev.map(p => p.id === r.id ? r : p))
    setEditing(null)
    setView('list')
  }

  function removeRecipe(id){
    setRecipes(prev => prev.filter(p => p.id !== id))
  }

  function toggleLike(id){
    const recipe = recipes.find(r=>r.id===id)
    if(!recipe) return
    const updated = {...recipe, liked: !recipe.liked}
    setRecipes(prev => prev.map(p => p.id === id ? updated : p))
  }

  const allTags = [...new Set(recipes.flatMap(r=>r.tags||[]))].filter(Boolean).sort()
  const filtered = filter ? recipes.filter(r=>(r.tags||[]).includes(filter)) : recipes
  const liked = filtered.filter(r=>r.liked)
  const notLiked = filtered.filter(r=>!r.liked)

  return (
    <div className="app">
      <header>
        <div className="header-left">
          <h1>🍳 Recipe Box</h1>
        </div>
        <div className="header-right">
          <button className="theme-btn" onClick={()=>setDark(d=>!d)}>{dark?'☀️':'🌙'}</button>
          <button onClick={()=>{setEditing(null); setView('create')}} className="new-btn">+ New Recipe</button>
        </div>
      </header>

      <main>
        {view==='list' && (
          <section className="list">
            <div className="filter-section">
              <label>Cuisine:</label>
              <button className={'filter-btn '+(filter===''?'active':'')} onClick={()=>setFilter('')}>All</button>
              {allTags.map(tag=> (
                <button key={tag} className={'filter-btn '+(filter===tag?'active':'')} onClick={()=>setFilter(tag)}>{tag}</button>
              ))}
            </div>
            
            {liked.length > 0 && (
              <div className="favs-section">
                <h2>⭐ Favorites</h2>
                <div className="grid">
                  {liked.map(r=> (
                    <article key={r.id} className="card liked">
                      <h3>{r.title}</h3>
                      <div className="meta">{r.tags && r.tags.map(t=> <small key={t} className="tag">{t}</small>)}</div>
                      <p className="times">Prep: {r.prepTime} • Cook: {r.cookTime} • Serves: {r.servings}</p>
                      <div className="card-actions">
                        <button onClick={()=>{ setEditing(r); setView('edit') }}>Edit</button>
                        <button onClick={()=>removeRecipe(r.id)}>Delete</button>
                        <button onClick={()=>toggleLike(r.id)}>★</button>
                        <button onClick={()=>{ setView('detail'); setEditing(r) }}>View</button>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}

            {filtered.length===0 && <p>No recipes yet.</p>}
            {notLiked.length > 0 && (
              <>
                {liked.length > 0 && <h2 style={{marginTop:'32px',marginBottom:'16px',fontSize:'18px',fontWeight:'700'}}>Other Recipes</h2>}
                <div className="grid">
                  {notLiked.map(r=> (
                    <article key={r.id} className='card'>
                      <h3>{r.title}</h3>
                      <div className="meta">{r.tags && r.tags.map(t=> <small key={t} className="tag">{t}</small>)}</div>
                      <p className="times">Prep: {r.prepTime} • Cook: {r.cookTime} • Serves: {r.servings}</p>
                      <div className="card-actions">
                        <button onClick={()=>{ setEditing(r); setView('edit') }}>Edit</button>
                        <button onClick={()=>removeRecipe(r.id)}>Delete</button>
                        <button onClick={()=>toggleLike(r.id)}>☆</button>
                        <button onClick={()=>{ setView('detail'); setEditing(r) }}>View</button>
                      </div>
                    </article>
                  ))}
                </div>
              </>
            )}
          </section>
        )}

        {(view==='create' || view==='edit') && (
          <section className="form-area">
            <RecipeForm onCancel={()=>setView('list')} onSave={view==='create'?addRecipe:updateRecipe} initial={editing} />
          </section>
        )}

        {view==='detail' && editing && (
          <section className="detail">
            <button onClick={()=>{ setView('list'); setEditing(null) }}>Back</button>
            <h2>{editing.title}</h2>
            <div className="meta">{editing.tags && editing.tags.map(t=> <small key={t} className="tag">{t}</small>)}</div>
            <h4>Ingredients</h4>
            <ul>{(editing.ingredients||[]).map((ing,i)=>(
              <li key={i} className="detail-ing">
                {ing.image && <span className="emoji-icon">{ing.image}</span>}
                <strong>{ing.name}</strong>
                {ing.amount && <span className="amt"> — {ing.amount}</span>}
              </li>
            ))}</ul>
            <h4>Steps</h4>
            <div className="steps" dangerouslySetInnerHTML={{__html: marked.parse(editing.steps||'')}} />
            {editing.notes && <div className="notes"><h4>Notes</h4><p>{editing.notes}</p></div>}
          </section>
        )}
      </main>
    </div>
  )
}
