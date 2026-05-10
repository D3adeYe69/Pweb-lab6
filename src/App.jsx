import React, { useEffect, useState } from 'react'
import { marked } from 'marked'
import IngredientBank from './IngredientBank'

const THEME_KEY = 'recipe-box.theme'
const TOKEN_KEY = 'recipe-box.jwt'
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''
const PAGE_LIMIT = 6

const ALL_PERMISSIONS = ['READ', 'WRITE', 'DELETE']
const ROLE_PERMISSION_PRESETS = {
  ADMIN: ['READ', 'WRITE', 'DELETE'],
  WRITER: ['READ', 'WRITE'],
  VISITOR: ['READ']
}

function getApiUrl(path) {
  return `${API_BASE_URL}${path}`
}

function decodeJwtPayload(token) {
  try {
    const payload = token.split('.')[1]
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const decoded = atob(normalized)
    return JSON.parse(decoded)
  } catch {
    return null
  }
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

  function addIngredientsFromBank(items){
    setIngredients(prev => [...items, ...prev])
  }

  function save(e){
    e.preventDefault()
    const rec = {
      id: initial?.id,
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
  const [view, setView] = useState('list')
  const [editing, setEditing] = useState(null)
  const [dark, setDark] = useState(() => localStorage.getItem(THEME_KEY) === 'dark')
  const [filter, setFilter] = useState('')
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || '')
  const [tokenRole, setTokenRole] = useState('VISITOR')
  const [permissionState, setPermissionState] = useState({
    READ: true,
    WRITE: false,
    DELETE: false
  })
  const [tokenMode, setTokenMode] = useState('role')
  const [tokenInfo, setTokenInfo] = useState(null)
  const [apiError, setApiError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [offset, setOffset] = useState(0)
  const [total, setTotal] = useState(0)

  useEffect(()=>{
    document.body.classList.toggle('dark', dark)
    localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light')
  }, [dark])

  useEffect(()=>{
    if (token) {
      localStorage.setItem(TOKEN_KEY, token)
      setTokenInfo(decodeJwtPayload(token))
    } else {
      localStorage.removeItem(TOKEN_KEY)
      setTokenInfo(null)
    }
  }, [token])

  useEffect(() => {
    if (!token) {
      setRecipes([])
      setTotal(0)
      setOffset(0)
      return
    }
    if (tokenInfo && !(tokenInfo.permissions || []).includes('READ')) {
      setRecipes([])
      setTotal(0)
      setOffset(0)
      setApiError('Current token does not include READ permission.')
      return
    }
    fetchRecipes(0)
  }, [token, tokenInfo])

  useEffect(() => {
    const activePermissions = tokenInfo?.permissions || []
    if ((view === 'create' || view === 'edit') && !activePermissions.includes('WRITE')) {
      setView('list')
      setEditing(null)
    }
  }, [tokenInfo, view])

  async function apiRequest(path, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }

    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    const response = await fetch(getApiUrl(path), {
      ...options,
      headers
    })

    if (response.status === 204) {
      return null
    }

    const contentType = response.headers.get('content-type') || ''
    const payload = contentType.includes('application/json') ? await response.json() : null

    if (!response.ok) {
      throw new Error(payload?.error || `Request failed with status ${response.status}`)
    }

    return payload
  }

  async function fetchRecipes(nextOffset = 0) {
    setIsLoading(true)
    setApiError('')
    try {
      const data = await apiRequest(`/api/recipes?limit=${PAGE_LIMIT}&offset=${nextOffset}`, { method: 'GET' })
      setRecipes(data.data || [])
      setTotal(data.pagination?.total || 0)
      setOffset(data.pagination?.offset || 0)
      if (view === 'detail' && editing) {
        const updatedRecipe = (data.data || []).find((recipe) => recipe.id === editing.id)
        setEditing(updatedRecipe || null)
      }
    } catch (error) {
      setApiError(error.message)
      if (String(error.message).toLowerCase().includes('expired')) {
        setToken('')
      }
      setRecipes([])
      setTotal(0)
    } finally {
      setIsLoading(false)
    }
  }

  async function createToken() {
    setApiError('')
    const selectedPermissions = ALL_PERMISSIONS.filter((permission) => permissionState[permission])
    if (tokenMode === 'permissions' && selectedPermissions.length === 0) {
      setApiError('Select at least one permission for custom mode.')
      return
    }
    const body = tokenMode === 'role'
      ? { role: tokenRole }
      : { permissions: selectedPermissions }

    try {
      const data = await fetch(getApiUrl('/token'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }).then(async (response) => {
        const json = await response.json()
        if (!response.ok) {
          throw new Error(json?.error || 'Failed to get token')
        }
        return json
      })

      setToken(data.token)
      setOffset(0)
      setView('list')
    } catch (error) {
      setApiError(error.message)
    }
  }

  async function addRecipe(recipe) {
    setApiError('')
    try {
      await apiRequest('/api/recipes', {
        method: 'POST',
        body: JSON.stringify(recipe)
      })
      await fetchRecipes(0)
      setView('list')
    } catch (error) {
      setApiError(error.message)
    }
  }

  async function updateRecipe(recipe) {
    setApiError('')
    try {
      await apiRequest(`/api/recipes/${recipe.id}`, {
        method: 'PUT',
        body: JSON.stringify(recipe)
      })
      await fetchRecipes(offset)
      setEditing(null)
      setView('list')
    } catch (error) {
      setApiError(error.message)
    }
  }

  async function removeRecipe(id) {
    setApiError('')
    try {
      await apiRequest(`/api/recipes/${id}`, { method: 'DELETE' })
      const nextOffset = total - 1 <= offset && offset > 0 ? Math.max(0, offset - PAGE_LIMIT) : offset
      await fetchRecipes(nextOffset)
    } catch (error) {
      setApiError(error.message)
    }
  }

  async function toggleLike(id){
    const recipe = recipes.find(r=>r.id===id)
    if(!recipe) return
    await updateRecipe({ ...recipe, liked: !recipe.liked })
  }

  function onRoleChange(nextRole) {
    setTokenRole(nextRole)
    const nextPermissions = ROLE_PERMISSION_PRESETS[nextRole] || []
    setPermissionState({
      READ: nextPermissions.includes('READ'),
      WRITE: nextPermissions.includes('WRITE'),
      DELETE: nextPermissions.includes('DELETE')
    })
  }

  const allTags = [...new Set(recipes.flatMap(r=>r.tags||[]))].filter(Boolean).sort()
  const filtered = filter ? recipes.filter(r=>(r.tags||[]).includes(filter)) : recipes
  const liked = filtered.filter(r=>r.liked)
  const notLiked = filtered.filter(r=>!r.liked)
  const currentPage = Math.floor(offset / PAGE_LIMIT) + 1
  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT))
  const tokenExpiry = tokenInfo?.exp ? new Date(tokenInfo.exp * 1000).toLocaleTimeString() : 'n/a'
  const currentPermissions = tokenInfo?.permissions || []
  const canRead = currentPermissions.includes('READ')
  const canWrite = currentPermissions.includes('WRITE')
  const canDelete = currentPermissions.includes('DELETE')

  return (
    <div className="app">
      <header>
        <div className="header-left">
          <h1>🍳 Recipe Box</h1>
        </div>
        <div className="header-right">
          <button className="theme-btn" onClick={()=>setDark(d=>!d)}>{dark?'☀️':'🌙'}</button>
          <button
            onClick={() => {
              if (!canWrite) return
              setEditing(null)
              setView('create')
            }}
            className="new-btn"
            disabled={!canWrite}
            title={canWrite ? 'Create new recipe' : 'WRITE permission required'}
          >
            + New Recipe
          </button>
        </div>
      </header>

      <main>
        {view==='list' && (
          <section className="list">
            <div className="auth-panel">
              <h2>Access</h2>
              <p>Get a 1-minute JWT, then browse or manage recipes based on your permissions.</p>
              <div className="auth-controls">
                <div className="token-mode">
                  <button className={tokenMode === 'role' ? 'active' : ''} onClick={() => setTokenMode('role')}>By Role</button>
                  <button className={tokenMode === 'permissions' ? 'active' : ''} onClick={() => setTokenMode('permissions')}>Custom Permissions</button>
                </div>
                {tokenMode === 'role' ? (
                  <label>
                    Role
                    <select value={tokenRole} onChange={(e) => onRoleChange(e.target.value)}>
                      <option value="ADMIN">ADMIN (READ, WRITE, DELETE)</option>
                      <option value="WRITER">WRITER (READ, WRITE)</option>
                      <option value="VISITOR">VISITOR (READ only)</option>
                    </select>
                  </label>
                ) : (
                  <div className="perm-grid">
                    {ALL_PERMISSIONS.map((permission) => (
                      <label key={permission}>
                        <input
                          type="checkbox"
                          checked={permissionState[permission]}
                          onChange={(e) => setPermissionState((prev) => ({ ...prev, [permission]: e.target.checked }))}
                        />
                        {permission}
                      </label>
                    ))}
                  </div>
                )}
                <div className="permission-badges">
                  {(token ? currentPermissions : ROLE_PERMISSION_PRESETS[tokenRole]).map((permission) => (
                    <span key={permission}>{permission}</span>
                  ))}
                </div>
                <div className="auth-actions">
                  <button onClick={createToken}>Get Token</button>
                  <button
                    type="button"
                    onClick={() => {
                      setToken('')
                      setRecipes([])
                      setTotal(0)
                      setApiError('')
                    }}
                  >
                    Clear Token
                  </button>
                  <a href={getApiUrl('/docs')} target="_blank" rel="noreferrer">Open Swagger</a>
                </div>
              </div>
              <p className="token-meta">
                Token status: {token ? `active (${tokenInfo?.role || 'CUSTOM'}) - expires at ${tokenExpiry}` : 'not set'}
              </p>
              <p className="token-meta">
                Restrictions: VISITOR = READ only, WRITER = READ + WRITE, ADMIN = READ + WRITE + DELETE.
              </p>
              {apiError && <p className="api-error">API error: {apiError}</p>}
            </div>

            {canRead && (
              <div className="filter-section">
                <label>Cuisine:</label>
                <button className={'filter-btn '+(filter===''?'active':'')} onClick={()=>setFilter('')}>All</button>
                {allTags.map(tag=> (
                  <button key={tag} className={'filter-btn '+(filter===tag?'active':'')} onClick={()=>setFilter(tag)}>{tag}</button>
                ))}
              </div>
            )}

            {token && !canRead && !apiError && <p>Current token cannot read recipes. Generate another token.</p>}
            {isLoading && <p>Loading recipes...</p>}
            {canRead && liked.length > 0 && (
              <div className="favs-section">
                <h2>⭐ Favorites</h2>
                <div className="grid">
                  {liked.map(r=> (
                    <article key={r.id} className="card liked">
                      <h3>{r.title}</h3>
                      <div className="meta">{r.tags && r.tags.map(t=> <small key={t} className="tag">{t}</small>)}</div>
                      <p className="times">Prep: {r.prepTime} • Cook: {r.cookTime} • Serves: {r.servings}</p>
                      <div className="card-actions">
                        {canWrite && <button onClick={()=>{ setEditing(r); setView('edit') }}>Edit</button>}
                        {canDelete && <button onClick={()=>removeRecipe(r.id)}>Delete</button>}
                        {canWrite && <button onClick={()=>toggleLike(r.id)}>★</button>}
                        <button onClick={()=>{ setView('detail'); setEditing(r) }}>View</button>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}

            {canRead && filtered.length===0 && <p>No recipes yet.</p>}
            {canRead && notLiked.length > 0 && (
              <>
                {liked.length > 0 && <h2 style={{marginTop:'32px',marginBottom:'16px',fontSize:'18px',fontWeight:'700'}}>Other Recipes</h2>}
                <div className="grid">
                  {notLiked.map(r=> (
                    <article key={r.id} className='card'>
                      <h3>{r.title}</h3>
                      <div className="meta">{r.tags && r.tags.map(t=> <small key={t} className="tag">{t}</small>)}</div>
                      <p className="times">Prep: {r.prepTime} • Cook: {r.cookTime} • Serves: {r.servings}</p>
                      <div className="card-actions">
                        {canWrite && <button onClick={()=>{ setEditing(r); setView('edit') }}>Edit</button>}
                        {canDelete && <button onClick={()=>removeRecipe(r.id)}>Delete</button>}
                        {canWrite && <button onClick={()=>toggleLike(r.id)}>☆</button>}
                        <button onClick={()=>{ setView('detail'); setEditing(r) }}>View</button>
                      </div>
                    </article>
                  ))}
                </div>
              </>
            )}

            {canRead && (
              <div className="pagination">
                <button disabled={offset <= 0 || !token} onClick={() => fetchRecipes(Math.max(0, offset - PAGE_LIMIT))}>Previous</button>
                <span>Page {currentPage} / {totalPages} (Total: {total})</span>
                <button disabled={offset + PAGE_LIMIT >= total || !token} onClick={() => fetchRecipes(offset + PAGE_LIMIT)}>Next</button>
              </div>
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
