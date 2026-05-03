import React, { useEffect, useState } from 'react'
import { marked } from 'marked'
import IngredientBank from './IngredientBank'

function sample() {
  return [
    { id: 1, title: 'Pancakes', ingredients: [ { name: 'Flour', amount: '1 cup', image: 'https://via.placeholder.com/80?text=Flour' }, { name: 'Egg', amount: '1', image: 'https://via.placeholder.com/80?text=Egg' }, { name: 'Milk', amount: '1 cup', image: 'https://via.placeholder.com/80?text=Milk' } ], steps: 'Mix ingredients. Cook on skillet.', tags: ['breakfast'], prepTime: '10m', cookTime: '10m', servings: '2', notes: '', liked: false }
  ]
}

export default function App(){
  const [recipes, setRecipes] = useState(()=>{
    try{ const raw = localStorage.getItem('recipes'); return raw?JSON.parse(raw):sample() }catch{return sample()}
  })
  const [view, setView] = useState('list')
  const [editing, setEditing] = useState(null)

  useEffect(()=>{ try{ localStorage.setItem('recipes', JSON.stringify(recipes)) }catch{} },[recipes])

  function addRecipe(r){ setRecipes(prev=>[r,...prev]); setView('list') }
  function updateRecipe(r){ setRecipes(prev=>prev.map(p=>p.id===r.id?r:p)); setEditing(null); setView('list') }
  function removeRecipe(id){ setRecipes(prev=>prev.filter(p=>p.id!==id)) }
  function toggleLike(id){ setRecipes(prev=>prev.map(p=>p.id===id?{...p,liked:!p.liked}:p)) }

  return (
    <div className="app">
      <header>
        <h1>Recipe Box</h1>
        <div className="actions">
          <button onClick={()=>{setEditing(null); setView('create')}}>New Recipe</button>
        </div>
      </header>

      <main>
        {view==='list' && (
          <section className="list">
            {recipes.length===0 && <p>No recipes yet.</p>}
            <div className="grid">
              {recipes.map(r=> (
                <article key={r.id} className={'card '+(r.liked?'liked':'')}>
                  <h3>{r.title}</h3>
                  <div className="meta">{r.tags && r.tags.map(t=> <small key={t} className="tag">{t}</small>)}</div>
                  <p className="times">Prep: {r.prepTime} • Cook: {r.cookTime} • Serves: {r.servings}</p>
                  <div className="card-actions">
                    <button onClick={()=>{ setEditing(r); setView('edit') }}>Edit</button>
                    <button onClick={()=>removeRecipe(r.id)}>Delete</button>
                    <button onClick={()=>toggleLike(r.id)}>{r.liked?'★':'☆'}</button>
                    <button onClick={()=>{ setView('detail'); setEditing(r) }}>View</button>
                  </div>
                </article>
              ))}
            </div>
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
                {ing.image && <img src={ing.image} alt={ing.name} />}
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

  function addIngredientFromBank(item){
    setIngredients(prev => [{ name: item.name, amount: '', image: item.image }, ...prev])
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
        <IngredientBank onAdd={addIngredientFromBank} />
        {ingredients.map((ing,i)=> (
          <div key={i} className="ing-row">
            {ing.image && <img src={ing.image} alt={ing.name} className="ing-thumb" />}
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
