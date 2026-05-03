import React, { useState } from 'react'

const SAMPLE_INGREDIENTS = [
  { id: 'tomato', name: 'Tomato', emoji: '🍅' },
  { id: 'egg', name: 'Egg', emoji: '🥚' },
  { id: 'flour', name: 'Flour', emoji: '🌾' },
  { id: 'milk', name: 'Milk', emoji: '🥛' },
  { id: 'butter', name: 'Butter', emoji: '🧈' },
  { id: 'cheese', name: 'Cheese', emoji: '🧀' },
  { id: 'bread', name: 'Bread', emoji: '🍞' },
  { id: 'rice', name: 'Rice', emoji: '🍚' },
  { id: 'pasta', name: 'Pasta', emoji: '🍝' },
  { id: 'carrot', name: 'Carrot', emoji: '🥕' },
  { id: 'onion', name: 'Onion', emoji: '🧅' },
  { id: 'garlic', name: 'Garlic', emoji: '🧄' },
  { id: 'lettuce', name: 'Lettuce', emoji: '🥬' },
  { id: 'broccoli', name: 'Broccoli', emoji: '🥦' },
  { id: 'pepper', name: 'Pepper', emoji: '🫑' },
  { id: 'cucumber', name: 'Cucumber', emoji: '🥒' },
  { id: 'mushroom', name: 'Mushroom', emoji: '🍄' },
  { id: 'apple', name: 'Apple', emoji: '🍎' },
  { id: 'lemon', name: 'Lemon', emoji: '🍋' },
  { id: 'strawberry', name: 'Strawberry', emoji: '🍓' },
  { id: 'chicken', name: 'Chicken', emoji: '🍗' },
  { id: 'fish', name: 'Fish', emoji: '🐟' },
  { id: 'steak', name: 'Steak', emoji: '🥩' },
  { id: 'honey', name: 'Honey', emoji: '🍯' },
  { id: 'salt', name: 'Salt', emoji: '🧂' },
  { id: 'pepper_spice', name: 'Pepper', emoji: '🌶️' },
  { id: 'sugar', name: 'Sugar', emoji: '🍬' },
  { id: 'oil', name: 'Oil', emoji: '🫒' },
  { id: 'vinegar', name: 'Vinegar', emoji: '🍶' }
]

export default function IngredientBank({ onBatchAdd }){
  const [selected, setSelected] = useState({})
  const [amounts, setAmounts] = useState({})

  function toggleSelect(id){
    setSelected(prev => ({ ...prev, [id]: !prev[id] }))
  }

  function setAmount(id, amount){
    setAmounts(prev => ({ ...prev, [id]: amount }))
  }

  function submitSelection(){
    const toAdd = Object.keys(selected)
      .filter(id => selected[id])
      .map(id => {
        const ing = SAMPLE_INGREDIENTS.find(i => i.id === id)
        return { name: ing.name, amount: amounts[id] || '', image: ing.emoji }
      })
    onBatchAdd(toAdd)
    setSelected({})
    setAmounts({})
  }

  const selectedCount = Object.values(selected).filter(Boolean).length

  return (
    <div className="ingredient-bank">
      <h4>Ingredient Bank (Select Multiple)</h4>
      <div className="bank-grid">
        {SAMPLE_INGREDIENTS.map(i => (
          <div key={i.id} className={'ingredient-card ' + (selected[i.id] ? 'selected' : '')}>
            <div className="emoji-icon">{i.emoji}</div>
            <div className="ing-name">{i.name}</div>
            <input 
              type="text" 
              placeholder="Amount" 
              value={amounts[i.id] || ''} 
              onChange={e => setAmount(i.id, e.target.value)}
              onClick={e => e.stopPropagation()}
            />
            <button 
              type="button" 
              onClick={() => toggleSelect(i.id)}
              className={selected[i.id] ? 'selected' : ''}
            >
              {selected[i.id] ? '✓' : 'Add'}
            </button>
          </div>
        ))}
      </div>
      {selectedCount > 0 && (
        <div className="bank-actions">
          <button type="button" onClick={submitSelection} className="submit-btn">
            Add {selectedCount} ingredient{selectedCount !== 1 ? 's' : ''}
          </button>
          <button type="button" onClick={() => { setSelected({}); setAmounts({}) }} className="cancel-btn">
            Clear
          </button>
        </div>
      )}
    </div>
  )
}
