import React, { useEffect, useState } from 'react'
import { marked } from 'marked'
import IngredientBank from './IngredientBank'

const API_URL = 'http://localhost:3001'

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
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('list')
  const [editing, setEditing] = useState(null)
  const [dark, setDark] = useState(()=>localStorage.getItem('theme')==='dark')
  const [filter, setFilter] = useState('')

  // Fetch recipes on mount
  useEffect(()=>{
    async function fetchRecipes(){
      try{
        const res = await fetch(`${API_URL}/recipes`)
        const data = await res.json()
        setRecipes(data)
      }catch(err){
        console.error('Failed to fetch recipes:', err)
      }finally{
        setLoading(false)
      }
    }
    fetchRecipes()
  }, [])

  // Handle dark mode
  useEffect(()=>{
    document.body.classList.toggle('dark', dark)
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  async function addRecipe(r){
    try{
      const res = await fetch(`${API_URL}/recipes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(r)
      })
      const newRecipe = await res.json()
      setRecipes(prev=>[newRecipe,...prev])
      setView('list')
    }catch(err){
      console.error('Failed to add recipe:', err)
    }
  }

  async function updateRecipe(r){
    try{
      const res = await fetch(`${API_URL}/recipes/${r.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(r)
      })
      const updated = await res.json()
      setRecipes(prev=>prev.map(p=>p.id===r.id?updated:p))
      setEditing(null)
      setView('list')
    }catch(err){
      console.error('Failed to update recipe:', err)
    }
  }

  async function removeRecipe(id){
    try{
      await fetch(`${API_URL}/recipes/${id}`, { method: 'DELETE' })
      setRecipes(prev=>prev.filter(p=>p.id!==id))
    }catch(err){
      console.error('Failed to delete recipe:', err)
    }
  }

  async function toggleLike(id){
    const recipe = recipes.find(r=>r.id===id)
    if(!recipe) return
    const updated = {...recipe, liked: !recipe.liked}
    try{
      await fetch(`${API_URL}/recipes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      })
      setRecipes(prev=>prev.map(p=>p.id===id?updated:p))
    }catch(err){
      console.error('Failed to toggle like:', err)
    }
  }

  const allTags = [...new Set(recipes.flatMap(r=>r.tags||[]))].filter(Boolean).sort()
  const filtered = filter ? recipes.filter(r=>(r.tags||[]).includes(filter)) : recipes
  const liked = filtered.filter(r=>r.liked)
  const notLiked = filtered.filter(r=>!r.liked)

  if(loading) return <div className="app"><main style={{padding:'32px',marginTop:'80px'}}>Loading recipes...</main></div>

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
